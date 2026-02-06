from typing import List


class VaultStore:
    def __init__(self, items: List[dict]) -> None:
        self.items = items

    def list_items(self) -> List[dict]:
        return self.items
