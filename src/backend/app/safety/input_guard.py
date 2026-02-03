import re
from dataclasses import dataclass
from typing import List

from .redirect_templates import REDIRECT_TEMPLATES


PII_PATTERNS = [
    re.compile(r"\baddress\b"),
    re.compile(r"\bphone\b"),
    re.compile(r"\bschool\b"),
    re.compile(r"\bemail\b"),
    re.compile(r"\bpassword\b"),
]

JAILBREAK_PATTERNS = [
    re.compile(r"ignore\s+(the\s+)?rules"),
    re.compile(r"system\s+prompt"),
    re.compile(r"developer\s+mode"),
    re.compile(r"pretend\s+you\s+are"),
    re.compile(r"s\s*y\s*s\s*t\s*e\s*m\s+prompt"),
]

UNSAFE_PATTERNS = {
    "violence": [re.compile(r"\bkill\b"), re.compile(r"\bweapon\b"), re.compile(r"\bhurt\b")],
    "adult": [re.compile(r"\bsex\b"), re.compile(r"\bnaked\b"), re.compile(r"\bromance\b")],
    "self_harm": [re.compile(r"\bhurt myself\b"), re.compile(r"\bdie\b")],
    "hate": [re.compile(r"\bhate\b"), re.compile(r"\bkill them\b")],
}


@dataclass
class GuardResult:
    allowed: bool
    category: str
    response: str
    choices: List[str]


class InputGuard:
    def classify(self, message: str) -> GuardResult:
        lowered = message.lower()
        for pattern in PII_PATTERNS:
            if pattern.search(lowered):
                return GuardResult(False, "pii", self._pick("pii"), self._choices())
        for pattern in JAILBREAK_PATTERNS:
            if pattern.search(lowered):
                return GuardResult(False, "jailbreak", self._pick("jailbreak"), self._choices())
        for category, patterns in UNSAFE_PATTERNS.items():
            if any(pattern.search(lowered) for pattern in patterns):
                return GuardResult(False, category, self._pick(category), self._choices())
        return GuardResult(True, "", "", [])

    def _pick(self, category: str) -> str:
        return REDIRECT_TEMPLATES.get(category, REDIRECT_TEMPLATES["general"])[0]

    def _choices(self) -> List[str]:
        return ["Math quest", "Reading quest", "Fun fact"]
