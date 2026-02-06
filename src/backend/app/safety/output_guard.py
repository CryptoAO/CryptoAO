import re
from dataclasses import dataclass
from typing import List

from .redirect_templates import REDIRECT_TEMPLATES


LINK_PATTERN = re.compile(r"https?://\S+|www\.\S+")
UNSAFE_OUTPUT = ["kill", "weapon", "sex", "naked", "hate", "system prompt"]


@dataclass
class GuardResult:
    allowed: bool
    category: str
    response: str


class OutputGuard:
    def enforce(self, message: str) -> GuardResult:
        cleaned = LINK_PATTERN.sub("", message)
        sentences = _split_sentences(cleaned)
        cleaned = " ".join(sentences[:6]).strip()
        if any(word in cleaned.lower() for word in UNSAFE_OUTPUT):
            return GuardResult(False, "general", REDIRECT_TEMPLATES["general"][0])
        return GuardResult(True, "", cleaned)


def _split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part for part in parts if part]
