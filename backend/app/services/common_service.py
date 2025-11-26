from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from ..interfaces.exceptions import UserNotFoundError
from ..interfaces.auth_service import UserTokenData
from ..interfaces.common_service import (CommonServiceInterface,
                                         UpdateProfileData, UserInfo)
from ..interfaces.common_service import RequestTypeInfo
from ..models import RequestType, User


class CommonService(CommonServiceInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user(self, user_id: int) -> UserInfo:
        user = await self.session.get(User, user_id)
        if not user:
            raise UserNotFoundError

        return self.to_user_info(user)

    async def update_profile(self, user: UserTokenData, profile_data: UpdateProfileData) -> UserInfo:
        user = await self.session.get(User, user["id"])
        if not user:
            raise UserNotFoundError

        user.first_name = profile_data.first_name
        user.last_name = profile_data.last_name
        user.about_me = profile_data.about_me
        user.date_of_birth = profile_data.date_of_birth
        
        await self.session.commit()
        await self.session.refresh(user)
        
        return self.to_user_info(user)

    async def list_request_types(self) -> List[RequestTypeInfo]:
        request_types = await self.session.scalars(select(RequestType))
        return [self.to_request_type_info(rt) for rt in request_types]

    @staticmethod
    def to_request_type_info(request_type: RequestType) -> RequestTypeInfo:
        return RequestTypeInfo(
            id=request_type.id,
            name=request_type.name
        )

    @staticmethod
    def to_user_info(user: User) -> UserInfo:
        return UserInfo(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            date_of_birth=user.date_of_birth,
            about_me=user.about_me,
            is_volunteer=user.is_volunteer,
            avg_rating=user.avg_rating,
            level=user.level,
            experience=user.experience,
            experience_to_next_level=100 * user.level,
            badges=user.badges
        )
