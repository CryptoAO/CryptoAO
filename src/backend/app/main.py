import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .models import (
    ChatRequest,
    ChatResponse,
    ChildSelectRequest,
    DemoLoginResponse,
    ParentSummaryResponse,
    QuestCompleteRequest,
    QuestListResponse,
    QuestStartRequest,
    QuestStepRequest,
    ResetDemoRequest,
    SafetyAuditResponse,
    SessionListResponse,
    WorldResponse,
)
from .progress.mastery import MasteryTracker
from .quests.quest_engine import QuestEngine
from .safety.input_guard import InputGuard
from .safety.output_guard import OutputGuard
from .safety.redirect_templates import REDIRECT_TEMPLATES
from .spark.spark_mock_llm import SparkMockLLM
from .spark.spark_policy import SparkPolicy
from .store import InMemoryStore
from .vault.vault_retrieval import VaultRetrieval
from .vault.vault_store import VaultStore
from .world.world_state import WorldState

app = FastAPI(title="SAFELEARN API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = InMemoryStore()
store.load_seed()

input_guard = InputGuard()
output_guard = OutputGuard()
retrieval = VaultRetrieval(VaultStore(store.vault_items))
policy = SparkPolicy()
spark = SparkMockLLM(retrieval, policy)
quest_engine = QuestEngine(store.quests, store.quest_sessions)
mastery_tracker = MasteryTracker(store.mastery)
world_state = WorldState(store.world_unlocks, store.world_items)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/auth/demo-login", response_model=DemoLoginResponse)
async def demo_login() -> DemoLoginResponse:
    parent = store.users[0]
    children = [child for child in store.children if child["parent_id"] == parent["id"]]
    return DemoLoginResponse(token=parent["token"], children=children)


@app.get("/v1/children")
async def list_children(authorization: str | None = Header(default=None)) -> dict:
    _ensure_demo_token(authorization)
    return {"children": store.children}


@app.post("/v1/children/select")
async def select_child(payload: ChildSelectRequest, authorization: str | None = Header(default=None)) -> dict:
    token = _ensure_demo_token(authorization)
    child = store.get_child(payload.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    store.selected_child[token] = payload.child_id
    return {"selected_child": child}


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    if store.is_locked(payload.child_id):
        return ChatResponse(
            reply="Let’s do a quest instead. Choose: Math quest, Reading quest, or Story time.",
            choices=["Math quest", "Reading quest", "Story time"],
            safety_event={"category": "repeat_attempt_lock"},
            metadata={"used_vault_ids": [], "skill_guess": ""},
        )
    guard = input_guard.classify(payload.message)
    if not guard.allowed:
        store.add_safety_event(payload.child_id, guard.category)
        if store.register_unsafe_attempt(payload.child_id):
            store.add_safety_event(payload.child_id, "repeat_attempt_lock")
            return ChatResponse(
                reply="Let’s do a quest instead. Choose: Math quest, Reading quest, or Story time.",
                choices=["Math quest", "Reading quest", "Story time"],
                safety_event={"category": "repeat_attempt_lock"},
                metadata={"used_vault_ids": [], "skill_guess": ""},
            )
        return ChatResponse(
            reply=guard.response,
            choices=guard.choices,
            safety_event={"category": guard.category},
            metadata={"used_vault_ids": [], "skill_guess": ""},
        )
    response = spark.respond(payload.message)
    output = output_guard.enforce(response.reply)
    if not output.allowed:
        store.add_safety_event(payload.child_id, output.category)
        reply = REDIRECT_TEMPLATES["general"][0]
        return ChatResponse(
            reply=reply,
            choices=["Math quest", "Reading quest"],
            safety_event={"category": output.category},
            metadata={"used_vault_ids": [], "skill_guess": ""},
        )
    return ChatResponse(
        reply=output.response,
        choices=response.choices,
        safety_event=None,
        metadata={
            "used_vault_ids": response.used_vault_ids,
            "skill_guess": response.skill_guess,
        },
    )


@app.get("/v1/quests", response_model=QuestListResponse)
async def quests() -> QuestListResponse:
    boss_review = {
        "id": "boss_review",
        "title": "Boss Review Quest",
        "grade": "Mixed",
        "skill_ids": [],
        "reward_item_id": None,
        "reflection_question": "What did you remember from past quests?",
        "steps": [],
    }
    return QuestListResponse(quests=store.quests + [boss_review])


@app.post("/v1/quests/start")
async def quest_start(payload: QuestStartRequest) -> dict:
    child = store.get_child(payload.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if payload.quest_id == "boss_review":
        quest = _build_boss_review(payload.child_id)
        return quest_engine.start(payload.quest_id, payload.child_id, quest_override=quest)
    return quest_engine.start(payload.quest_id, payload.child_id)


@app.post("/v1/quests/step")
async def quest_step(payload: QuestStepRequest) -> dict:
    result = quest_engine.step(payload.session_id, payload.answer)
    return {
        "status": result.status,
        "prompt": result.prompt,
        "choices": result.choices,
        "hint": result.hint,
        "explanation": result.explanation,
    }


@app.post("/v1/quests/complete")
async def quest_complete(payload: QuestCompleteRequest) -> dict:
    quest = quest_engine.complete(payload.session_id)
    child_id = store.quest_sessions[payload.session_id]["child_id"]
    mastery_before = store.mastery.get(child_id, {}).copy()
    store.update_mastery(child_id, quest["skill_ids"])
    reward_item = None
    if quest.get("reward_item_id"):
        store.unlock_world_item(child_id, quest["reward_item_id"])
        reward_item = next(
            item for item in store.world_items if item["id"] == quest["reward_item_id"]
        )
    store.record_completed_quest(child_id, quest["id"])
    _record_session_summary(payload.session_id, child_id, quest, mastery_before)
    return {
        "reward_item": reward_item,
        "mastery": store.mastery.get(child_id, {}),
    }


@app.get("/v1/world", response_model=WorldResponse)
async def world(child_id: str) -> WorldResponse:
    unlocked = {item["id"] for item in world_state.unlocked_items(child_id)}
    items = []
    for item in store.world_items:
        item_copy = item.copy()
        item_copy["unlocked"] = item["id"] in unlocked
        items.append(item_copy)
    return WorldResponse(items=items)


@app.get("/v1/parent/summary", response_model=ParentSummaryResponse)
async def parent_summary(child_id: str) -> ParentSummaryResponse:
    mastery = mastery_tracker.snapshot(child_id)
    return ParentSummaryResponse(
        mastery=mastery.skills,
        safety_counts=store.safety_events.get(child_id, {}),
        unlocked_items=world_state.unlocked_items(child_id),
        quests_completed=len(store.completed_quests.get(child_id, [])),
        skills_in_progress=len([score for score in mastery.skills.values() if score < 5]),
        recommended_quests=_recommend_quests(child_id),
    )


@app.get("/v1/parent/safety-audit", response_model=SafetyAuditResponse)
async def safety_audit(child_id: str) -> SafetyAuditResponse:
    events = store.safety_event_log.get(child_id, [])[-20:]
    return SafetyAuditResponse(
        events=events,
        lock_active=store.is_locked(child_id),
        lock_remaining_minutes=store.lock_remaining_minutes(child_id),
    )


@app.get("/v1/parent/sessions", response_model=SessionListResponse)
async def parent_sessions(child_id: str, days: int = 7) -> SessionListResponse:
    summaries = store.session_summaries.get(child_id, [])
    cutoff = datetime.utcnow().timestamp() - days * 86400
    recent = [
        summary for summary in summaries if summary.get("timestamp", 0) >= cutoff
    ]
    return SessionListResponse(sessions=recent)


@app.get("/v1/parent/sessions/{session_id}")
async def parent_session_detail(child_id: str, session_id: str) -> dict:
    summaries = store.session_summaries.get(child_id, [])
    summary = next((s for s in summaries if s["session_id"] == session_id), None)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary


@app.post("/v1/admin/reset-demo")
async def reset_demo(payload: ResetDemoRequest) -> dict:
    _ensure_pin(payload.child_id, payload.pin)
    store.reset_demo_state(payload.child_id)
    return {"status": "reset"}


def _ensure_demo_token(authorization: str | None) -> str:
    if not authorization:
        return store.users[0]["token"]
    token = authorization.replace("Bearer ", "")
    if token != store.users[0]["token"]:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token


def _ensure_pin(child_id: str, pin: str) -> None:
    parent = store.users[0]
    if parent["pin"] != pin:
        raise HTTPException(status_code=403, detail="Invalid PIN")


def _build_boss_review(child_id: str) -> dict:
    recent = store.completed_quests.get(child_id, [])[-2:]
    mastery = store.mastery.get(child_id, {})
    weakest = sorted(mastery.items(), key=lambda x: x[1])[:2]
    skills = [skill for skill, _ in weakest]
    steps = []
    for skill_id in skills:
        steps.append(
            {
                "prompt": f"Quick review: tell me one thing about {skill_id.replace('_', ' ')}.",
                "answer": "ok",
                "choices": ["ok", "not sure", "help"],
                "hint": "Think about what you practiced in quests.",
                "explanation": "Great job remembering!",
            }
        )
    if not steps:
        steps = [
            {
                "prompt": "Boss review: what did you learn in your last quest?",
                "answer": "ok",
                "choices": ["ok", "not sure", "help"],
                "hint": "Think about the last quest you completed.",
                "explanation": "Nice reflection!",
            }
        ]
    return {
        "id": "boss_review",
        "title": "Boss Review Quest",
        "grade": "Mixed",
        "skill_ids": skills,
        "reward_item_id": "world_glow_mushroom",
        "reflection_question": "What is one thing you want to practice next?",
        "steps": steps,
        "recent_quests": recent,
    }


def _record_session_summary(session_id: str, child_id: str, quest: dict, mastery_before: dict) -> None:
    session = store.quest_sessions.get(session_id, {})
    start_time = session.get("start_time")
    if start_time:
        start_dt = datetime.fromisoformat(start_time)
        minutes = max(1, int((datetime.utcnow() - start_dt).total_seconds() // 60))
    else:
        minutes = 3
    summary = {
        "session_id": session_id,
        "child_id": child_id,
        "timestamp": datetime.utcnow().timestamp(),
        "date": datetime.utcnow().isoformat(),
        "skills_practiced": quest.get("skill_ids", []),
        "quests_completed": [quest.get("id")],
        "mastery_before": mastery_before,
        "mastery_after": store.mastery.get(child_id, {}),
        "spark_highlights": [
            "Completed a quest with guided hints.",
            "Unlocked a learning world item.",
        ],
        "time_spent_minutes": minutes,
    }
    store.add_session_summary(child_id, summary)


def _recommend_quests(child_id: str) -> list[dict]:
    mastery = store.mastery.get(child_id, {})
    if not mastery:
        return store.quests[:2]
    weakest = sorted(mastery.items(), key=lambda x: x[1])[:2]
    skills = {skill for skill, _ in weakest}
    recommended = [q for q in store.quests if skills.intersection(set(q["skill_ids"]))]
    return recommended[:2] if recommended else store.quests[:2]


# ---- Serve the web dashboard ----
_STATIC_DIR = Path(__file__).resolve().parent.parent.parent.parent / "static"


@app.get("/")
async def root():
    index = _STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index), media_type="text/html")
    return {"message": "SAFELEARN API is running. Dashboard not found."}
