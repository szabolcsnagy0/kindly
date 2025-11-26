from typing import Annotated, Generic, TypeVar

from fastapi import Depends
import asyncio
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .interfaces.auth_service import UserTokenData
from .interfaces import (
    AuthServiceInterface,
    ApplicationServiceInterface,
    AIServiceInterface,
    CommonServiceInterface,
    RequestServiceInterface,
)
from .services import (
    AuthService,
    ApplicationService,
    AIService,
    CommonService,
    RequestService,
)
from .services.quest_service import QuestService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/v1/auth/login-form",
    refreshUrl="api/v1/auth/refresh"
)

T = TypeVar("T")

class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: str = ""


SessionDep = Annotated[AsyncSession, Depends(get_session)]
async def get_quest_service(session: SessionDep) -> QuestService:
    await asyncio.sleep(0)
    return QuestService(session)

QuestServiceDep = Annotated[QuestService, Depends(get_quest_service)]


async def get_auth_service(session: SessionDep, quest_service: Annotated[QuestService, Depends(get_quest_service)]):
    await asyncio.sleep(0)
    return AuthService(session, quest_service)


AuthServiceDep = Annotated[AuthServiceInterface, Depends(get_auth_service)]


async def get_user_token_data(
    auth_service: AuthServiceDep, token: Annotated[str, Depends(oauth2_scheme)]
):
    await asyncio.sleep(0)
    return auth_service.authenticate(token)


UserDataDep = Annotated[UserTokenData, Depends(get_user_token_data)]


async def get_application_service(
    session: SessionDep,
    auth_service: AuthServiceDep,
):
    await asyncio.sleep(0)
    return ApplicationService(session, auth_service)


ApplicationServiceDep = Annotated[
    ApplicationServiceInterface, Depends(get_application_service)
]


async def get_ai_service(
    session: SessionDep,
    auth_service: AuthServiceDep,
) -> AIService:
    await asyncio.sleep(0)
    return AIService(session, auth_service)


AIServiceDep = Annotated[AIServiceInterface, Depends(get_ai_service)]


async def get_common_service(session: SessionDep):
    await asyncio.sleep(0)
    return CommonService(session)


CommonServiceDep = Annotated[CommonServiceInterface, Depends(get_common_service)]


async def get_request_service(
    session: SessionDep,
    auth_service: AuthServiceDep,
    quest_service: Annotated[QuestService, Depends(get_quest_service)],
) -> RequestService:
    await asyncio.sleep(0)
    return RequestService(session, auth_service, quest_service)


RequestServiceDep = Annotated[RequestServiceInterface, Depends(get_request_service)]
 
