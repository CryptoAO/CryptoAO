import uuid
from datetime import datetime
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class QuestStepResult:
    status: str
    prompt: str
    choices: list[str]
    hint: Optional[str]
    explanation: Optional[str]


class QuestEngine:
    def __init__(self, quests: list[dict], sessions: Dict[str, dict]) -> None:
        self.quests = quests
        self.sessions = sessions

    def start(self, quest_id: str, child_id: str, quest_override: dict | None = None) -> dict:
        quest = quest_override or self._quest(quest_id)
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "quest_id": quest_id,
            "quest": quest,
            "child_id": child_id,
            "step_index": 0,
            "attempts": 0,
            "start_time": datetime.utcnow().isoformat(),
        }
        step = quest["steps"][0]
        return {
            "session_id": session_id,
            "prompt": step["prompt"],
            "choices": step.get("choices", []),
            "total_steps": len(quest["steps"]),
        }

    def step(self, session_id: str, answer: str) -> QuestStepResult:
        session = self.sessions[session_id]
        quest = session.get("quest") or self._quest(session["quest_id"])
        step = quest["steps"][session["step_index"]]
        session["attempts"] += 1
        if answer.strip().lower() == step["answer"].strip().lower():
            session["step_index"] += 1
            session["attempts"] = 0
            if session["step_index"] >= len(quest["steps"]):
                return QuestStepResult(
                    status="complete_ready",
                    prompt=quest["reflection_question"],
                    choices=[],
                    hint=None,
                    explanation=None,
                )
            next_step = quest["steps"][session["step_index"]]
            return QuestStepResult(
                status="correct",
                prompt=next_step["prompt"],
                choices=next_step.get("choices", []),
                hint=None,
                explanation=None,
            )
        if session["attempts"] >= 3:
            return QuestStepResult(
                status="reveal",
                prompt=step["prompt"],
                choices=step.get("choices", []),
                hint=step.get("hint"),
                explanation=step.get("explanation"),
            )
        return QuestStepResult(
            status="hint",
            prompt=step["prompt"],
            choices=step.get("choices", []),
            hint=step.get("hint"),
            explanation=None,
        )

    def complete(self, session_id: str) -> dict:
        session = self.sessions.get(session_id)
        if not session:
            raise KeyError("Session not found")
        quest = session.get("quest") or self._quest(session["quest_id"])
        return quest

    def _quest(self, quest_id: str) -> dict:
        quest = next((q for q in self.quests if q["id"] == quest_id), None)
        if not quest:
            raise KeyError("Quest not found")
        return quest
