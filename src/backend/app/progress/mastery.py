from dataclasses import dataclass
from typing import Dict


@dataclass
class MasterySnapshot:
    skills: Dict[str, int]


class MasteryTracker:
    def __init__(self, mastery_store: Dict[str, Dict[str, int]]) -> None:
        self.mastery_store = mastery_store

    def snapshot(self, child_id: str) -> MasterySnapshot:
        return MasterySnapshot(skills=self.mastery_store.get(child_id, {}))
