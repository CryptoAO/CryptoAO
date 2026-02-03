from pydantic import BaseModel
from typing import List, Optional


class DemoLoginResponse(BaseModel):
    token: str
    children: List[dict]


class ChildSelectRequest(BaseModel):
    child_id: str


class ChatRequest(BaseModel):
    child_id: str
    message: str
    mode: str = "text"
    locale: str = "en-US"


class SafetyEvent(BaseModel):
    category: str


class ChatResponse(BaseModel):
    reply: str
    choices: List[str]
    safety_event: Optional[SafetyEvent] = None
    metadata: dict


class QuestStartRequest(BaseModel):
    child_id: str
    quest_id: str


class QuestStepRequest(BaseModel):
    session_id: str
    answer: str


class QuestCompleteRequest(BaseModel):
    session_id: str


class QuestListResponse(BaseModel):
    quests: List[dict]


class WorldResponse(BaseModel):
    items: List[dict]


class ParentSummaryResponse(BaseModel):
    mastery: dict
    safety_counts: dict
    unlocked_items: List[dict]
    quests_completed: int
    skills_in_progress: int
    recommended_quests: List[dict]


class SafetyAuditResponse(BaseModel):
    events: List[dict]
    lock_active: bool
    lock_remaining_minutes: int


class SessionListResponse(BaseModel):
    sessions: List[dict]


class ResetDemoRequest(BaseModel):
    child_id: str
    pin: str
