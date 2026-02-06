from typing import List


class WorldState:
    def __init__(self, unlocks: dict[str, List[str]], world_items: List[dict]) -> None:
        self.unlocks = unlocks
        self.world_items = world_items

    def unlocked_items(self, child_id: str) -> List[dict]:
        unlocked_ids = set(self.unlocks.get(child_id, []))
        return [item for item in self.world_items if item["id"] in unlocked_ids]
