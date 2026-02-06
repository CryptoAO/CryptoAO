LEARNING_VAULT = {
    "addition": "Adding means putting groups together.",
    "plants": "Plants need sunlight, water, and air to grow.",
    "shapes": "A triangle has three sides.",
}


def retrieve_learning(message: str) -> str:
    lowered = message.lower()
    for key, value in LEARNING_VAULT.items():
        if key in lowered:
            return value
    return ""
