from typing import List, Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import QuestServiceDep, UserDataDep
from ..interfaces.auth_service import UserTokenData
from ..interfaces.quest_service import QuestInfo
from ..services.quest_service import QuestService

router = APIRouter(prefix="/quests", tags=["quests"])

@router.get("", response_model=List[QuestInfo])
async def get_my_quests(
    user: UserDataDep,
    quest_service: QuestServiceDep,
):
    quests = await quest_service.get_user_quests(user["id"])
    return [
        QuestInfo(
            id=q.id,
            request_type_name=q.request_type.name,
            target_count=q.target_count,
            current_count=q.current_count,
            deadline=q.deadline
        ) for q in quests
    ]

@router.post("/{quest_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_quest(
    quest_id: int,
    user: UserDataDep,
    quest_service: QuestServiceDep,
):
    await quest_service.cancel_quest(user["id"], quest_id)
