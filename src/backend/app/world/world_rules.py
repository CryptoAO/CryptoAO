from typing import Optional


def reward_for_skill(skill_id: str, world_items: list[dict]) -> Optional[dict]:
    for item in world_items:
        if item["skill_id"] == skill_id:
            return item
    return None
