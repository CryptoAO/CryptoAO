from dataclasses import dataclass
from typing import List


@dataclass
class SparkReply:
    reply: str
    choices: List[str]
    used_vault_ids: List[str]
    skill_guess: str


class SparkPolicy:
    def format_reply(self, hint: str, question: str, choices: List[str]) -> SparkReply:
        reply = f"{hint} {question}".strip()
        if not reply.endswith("?"):
            reply = f"{reply}?"
        return SparkReply(reply=reply, choices=choices, used_vault_ids=[], skill_guess="")

    def fallback(self) -> SparkReply:
        return SparkReply(
            reply="Let’s learn together! Do you want a math quest or a reading quest?",
            choices=["Math quest", "Reading quest", "Science fact"],
            used_vault_ids=[],
            skill_guess="",
        )
