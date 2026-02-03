from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class ReviewSchedule:
    next_review: date


def schedule_next(current_score: int) -> ReviewSchedule:
    days = min(7, max(1, current_score))
    return ReviewSchedule(next_review=date.today() + timedelta(days=days))
