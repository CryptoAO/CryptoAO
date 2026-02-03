from dataclasses import dataclass
from typing import List


UNSAFE_KEYWORDS = [
    "weapon",
    "kill",
    "blood",
    "sex",
    "naked",
    "address",
    "phone",
    "password",
    "email",
    "meet",
    "hurt",
]


@dataclass
class SafetyResult:
    allowed: bool
    safe_response: str
    categories: List[str]


class SafetyInterceptor:
    def guard_input(self, message: str) -> SafetyResult:
        lowered = message.lower()
        matches = [word for word in UNSAFE_KEYWORDS if word in lowered]
        if matches:
            return SafetyResult(
                allowed=False,
                safe_response=(
                    "I can’t help with that. Want a math quest or a story?"
                ),
                categories=["unsafe"],
            )
        return SafetyResult(allowed=True, safe_response="", categories=[])

    def guard_output(self, message: str) -> SafetyResult:
        lowered = message.lower()
        matches = [word for word in UNSAFE_KEYWORDS if word in lowered]
        if matches:
            return SafetyResult(
                allowed=False,
                safe_response=(
                    "Let’s keep it safe. Do you want letters, numbers, or shapes?"
                ),
                categories=["unsafe"],
            )
        return SafetyResult(allowed=True, safe_response=message, categories=[])

    def socratic_response(self, retrieved: str, user_message: str) -> str:
        return (
            f"Here’s a hint from our Learning Vault: {retrieved} "
            "What do you think the answer could be?"
        )

    def safe_fallback(self) -> str:
        return "I’m not sure yet. Want a letter game or a counting game?"
