from typing import Optional

from .vault_store import VaultStore


class VaultRetrieval:
    def __init__(self, store: VaultStore) -> None:
        self.store = store

    def retrieve(self, message: str) -> Optional[dict]:
        lowered = message.lower()
        for item in self.store.list_items():
            if item["skill_id"].replace("_", " ") in lowered:
                return item
            if any(word in lowered for word in item["body"].lower().split()[:3]):
                return item
        return None
