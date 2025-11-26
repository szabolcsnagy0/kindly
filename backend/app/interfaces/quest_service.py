from datetime import datetime
from typing import List
from pydantic import BaseModel

class QuestInfo(BaseModel):
    id: int
    request_type_name: str
    target_count: int
    current_count: int
    deadline: datetime
