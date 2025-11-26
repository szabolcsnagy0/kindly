import random
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models import Quest, RequestType, User
from ..interfaces.exceptions import QuestNotFoundError


class QuestService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def assign_initial_quests(self, user_id: int) -> None:
        for _ in range(3):
            await self._create_random_quest(user_id)

    async def _create_random_quest(self, user_id: int) -> Quest:
        request_types = (await self.session.execute(select(RequestType))).scalars().all()
        if not request_types:
            return None

        current_quests = (await self.session.execute(
            select(Quest).where(Quest.user_id == user_id)
        )).scalars().all()
        
        existing_type_ids = {q.request_type_id for q in current_quests}
        available_types = [rt for rt in request_types if rt.id not in existing_type_ids]
        
        if not available_types:
            return None

        request_type = random.choice(available_types)
        target_count = random.randint(1, 5)
        deadline = datetime.now(timezone.utc) + timedelta(days=7*target_count)

        quest = Quest(
            user_id=user_id,
            request_type_id=request_type.id,
            target_count=target_count,
            deadline=deadline
        )
        self.session.add(quest)
        await self.session.commit()
        return quest

    async def get_user_quests(self, user_id: int) -> List[Quest]:
        await self._replace_expired_quests(user_id)
        
        result = await self.session.execute(
            select(Quest)
            .options(joinedload(Quest.request_type))
            .where(Quest.user_id == user_id)
        )
        return result.scalars().all()

    async def _replace_expired_quests(self, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        expired_quests = (await self.session.execute(
            select(Quest).where((Quest.user_id == user_id) & (Quest.deadline < now))
        )).scalars().all()

        for quest in expired_quests:
            await self.session.delete(quest)
            await self.session.commit()
            await self._create_random_quest(user_id)

    async def cancel_quest(self, user_id: int, quest_id: int) -> None:
        quest = await self.session.get(Quest, quest_id)
        if not quest or quest.user_id != user_id:
            raise QuestNotFoundError
        
        await self.session.delete(quest)
        await self.session.commit()
        await self._create_random_quest(user_id)

    async def progress_quests(self, user_id: int, request_type_ids: List[int]) -> None:
        quests = (await self.session.execute(
            select(Quest).where(
                (Quest.user_id == user_id) & 
                (Quest.request_type_id.in_(request_type_ids))
            )
        )).scalars().all()

        for quest in quests:
            quest.current_count += 1
            if quest.current_count >= quest.target_count:
                user = await self.session.get(User, user_id)
                xp_gain = 50 * quest.target_count
                user.add_experience(xp_gain)
                
                await self.session.delete(quest)
                await self.session.commit()
                await self._create_random_quest(user_id)
            else:
                await self.session.commit()
