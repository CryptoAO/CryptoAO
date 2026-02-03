from dataclasses import dataclass
from typing import List

from .spark_policy import SparkPolicy, SparkReply
from ..vault.vault_retrieval import VaultRetrieval


@dataclass
class SparkResponse:
    reply: str
    choices: List[str]
    used_vault_ids: List[str]
    skill_guess: str


class SparkMockLLM:
    def __init__(self, retrieval: VaultRetrieval, policy: SparkPolicy) -> None:
        self.retrieval = retrieval
        self.policy = policy

    def respond(self, message: str) -> SparkResponse:
        result = self.retrieval.retrieve(message)
        if not result:
            fallback = self.policy.fallback()
            return SparkResponse(
                reply=fallback.reply,
                choices=fallback.choices,
                used_vault_ids=fallback.used_vault_ids,
                skill_guess=fallback.skill_guess,
            )
        hint = f"Here’s a hint from our Learning Vault: {result['body']}"
        question = "What do you think the answer could be"
        choices = ["Try another hint", "Start a quest", "Ask a new question"]
        reply = self.policy.format_reply(hint, question, choices)
        return SparkResponse(
            reply=reply.reply,
            choices=reply.choices,
            used_vault_ids=[result["id"]],
            skill_guess=result["skill_id"],
        )
