from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class InMemoryStore:
    users: List[dict] = field(default_factory=list)
    children: List[dict] = field(default_factory=list)
    vault_items: List[dict] = field(default_factory=list)
    quests: List[dict] = field(default_factory=list)
    world_items: List[dict] = field(default_factory=list)
    selected_child: Dict[str, str] = field(default_factory=dict)
    mastery: Dict[str, Dict[str, int]] = field(default_factory=dict)
    world_unlocks: Dict[str, List[str]] = field(default_factory=dict)
    safety_events: Dict[str, Dict[str, int]] = field(default_factory=dict)
    safety_event_log: Dict[str, List[dict]] = field(default_factory=dict)
    unsafe_attempts: Dict[str, List[datetime]] = field(default_factory=dict)
    lock_until: Dict[str, datetime] = field(default_factory=dict)
    quest_sessions: Dict[str, dict] = field(default_factory=dict)
    completed_quests: Dict[str, List[str]] = field(default_factory=dict)
    session_summaries: Dict[str, List[dict]] = field(default_factory=dict)

    def load_seed(self) -> None:
        seed_dir = Path(__file__).parent / "seed"
        self.users = _load_json(seed_dir / "demo_users.json")
        self.children = _load_json(seed_dir / "demo_children.json")
        self.vault_items = _load_json(seed_dir / "vault_content.json")
        self.quests = _load_json(seed_dir / "quests.json")
        self.world_items = _load_json(seed_dir / "world_items.json")

    def get_child(self, child_id: str) -> Optional[dict]:
        return next((child for child in self.children if child["id"] == child_id), None)

    def get_quest(self, quest_id: str) -> Optional[dict]:
        return next((quest for quest in self.quests if quest["id"] == quest_id), None)

    def add_safety_event(self, child_id: str, category: str) -> None:
        child_events = self.safety_events.setdefault(child_id, {})
        child_events[category] = child_events.get(category, 0) + 1
        log = self.safety_event_log.setdefault(child_id, [])
        log.append({"category": category, "timestamp": datetime.utcnow().isoformat()})
        if len(log) > 100:
            self.safety_event_log[child_id] = log[-100:]

    def register_unsafe_attempt(self, child_id: str) -> bool:
        now = datetime.utcnow()
        attempts = self.unsafe_attempts.setdefault(child_id, [])
        attempts.append(now)
        cutoff = now - timedelta(minutes=10)
        attempts[:] = [ts for ts in attempts if ts >= cutoff]
        if len(attempts) >= 3:
            self.lock_until[child_id] = now + timedelta(minutes=10)
            return True
        return False

    def is_locked(self, child_id: str) -> bool:
        until = self.lock_until.get(child_id)
        if not until:
            return False
        return datetime.utcnow() < until

    def lock_remaining_minutes(self, child_id: str) -> int:
        until = self.lock_until.get(child_id)
        if not until:
            return 0
        remaining = until - datetime.utcnow()
        return max(0, int(remaining.total_seconds() // 60))

    def update_mastery(self, child_id: str, skill_ids: List[str]) -> None:
        child_mastery = self.mastery.setdefault(child_id, {})
        for skill_id in skill_ids:
            current = child_mastery.get(skill_id, 0)
            child_mastery[skill_id] = min(current + 1, 5)

    def unlock_world_item(self, child_id: str, item_id: str) -> None:
        unlocked = self.world_unlocks.setdefault(child_id, [])
        if item_id not in unlocked:
            unlocked.append(item_id)

    def record_completed_quest(self, child_id: str, quest_id: str) -> None:
        completed = self.completed_quests.setdefault(child_id, [])
        completed.append(quest_id)
        if len(completed) > 50:
            self.completed_quests[child_id] = completed[-50:]

    def add_session_summary(self, child_id: str, summary: dict) -> None:
        summaries = self.session_summaries.setdefault(child_id, [])
        summaries.append(summary)
        if len(summaries) > 50:
            self.session_summaries[child_id] = summaries[-50:]

    def reset_demo_state(self, child_id: str | None = None) -> None:
        if child_id:
            self.mastery.pop(child_id, None)
            self.world_unlocks.pop(child_id, None)
            self.safety_events.pop(child_id, None)
            self.safety_event_log.pop(child_id, None)
            self.unsafe_attempts.pop(child_id, None)
            self.lock_until.pop(child_id, None)
            self.completed_quests.pop(child_id, None)
            self.session_summaries.pop(child_id, None)
            self.quest_sessions = {
                key: value
                for key, value in self.quest_sessions.items()
                if value.get("child_id") != child_id
            }
        else:
            self.mastery.clear()
            self.world_unlocks.clear()
            self.safety_events.clear()
            self.safety_event_log.clear()
            self.unsafe_attempts.clear()
            self.lock_until.clear()
            self.completed_quests.clear()
            self.session_summaries.clear()
            self.quest_sessions.clear()


def _load_json(path: Path) -> List[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text())
