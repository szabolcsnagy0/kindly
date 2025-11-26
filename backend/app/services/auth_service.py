import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..interfaces.exceptions import (
    InvalidEmailOrPasswordError,
    InvalidTokenError,
    NotAuthorizedError,
    UserAlreadyExistsError,
)
from ..interfaces.auth_service import (
    AuthResult,
    AuthServiceInterface,
    AuthTokens,
    LoginData,
    RegistrationData,
    UserRoles,
    UserTokenData,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
)
from ..models import RefreshToken, User
from .common_service import CommonService
from .quest_service import QuestService

JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET")

password_hash = PasswordHash.recommended()


class AuthService(AuthServiceInterface):
    def __init__(self, session: AsyncSession, quest_service: QuestService):
        self.session = session
        self.quest_service = quest_service

    async def login(self, login_data: LoginData) -> AuthResult:
        user = (
            await self.session.execute(select(User).filter(User.email == login_data.email))
        ).scalars().first()
        if not user or not password_hash.verify(login_data.password, user.password):
            raise InvalidEmailOrPasswordError

        refresh_token = self._create_token(user, REFRESH_TOKEN_EXPIRY)
        self.session.add(RefreshToken(user_id=user.id, token=refresh_token))
        await self.session.commit()

        access_token = self._create_token(user, ACCESS_TOKEN_EXPIRY)
        return AuthResult(
            user=CommonService.to_user_info(user),
            tokens=AuthTokens(access_token=access_token, refresh_token=refresh_token),
        )

    async def register(self, body: RegistrationData) -> AuthResult:
        user = User(
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            password=password_hash.hash(body.password),
            date_of_birth=body.date_of_birth,
            about_me=body.about_me,
            is_volunteer=body.is_volunteer,
        )

        try:
            self.session.add(user)
            await self.session.commit()

            await self.quest_service.assign_initial_quests(user.id)
        except IntegrityError:
            await self.session.rollback()
            raise UserAlreadyExistsError

        refresh_token = self._create_token(user, REFRESH_TOKEN_EXPIRY)
        self.session.add(RefreshToken(user_id=user.id, token=refresh_token))
        await self.session.commit()

        access_token = self._create_token(user, ACCESS_TOKEN_EXPIRY)
        return AuthResult(
            user=CommonService.to_user_info(user),
            tokens=AuthTokens(access_token=access_token, refresh_token=refresh_token),
        )

    async def refresh(
        self, refresh_token: str, access_expires: timedelta = ACCESS_TOKEN_EXPIRY
    ) -> AuthTokens:
        user_data = self.authenticate(refresh_token)
        stored = (
            await self.session.execute(
                select(RefreshToken).where(
                    (RefreshToken.user_id == user_data["id"])
                    & (RefreshToken.token == refresh_token)
                )
            )
        ).scalar_one_or_none()
        if stored is None:
            raise InvalidTokenError

        new_refresh = self._recreate_token(refresh_token, REFRESH_TOKEN_EXPIRY)
        stored.token = new_refresh
        await self.session.commit()

        new_access = self._recreate_token(refresh_token, ACCESS_TOKEN_EXPIRY)
        return AuthTokens(access_token=new_access, refresh_token=new_refresh)

    async def logout(self, user_id: int, refresh_token: str) -> None:
        await self.session.execute(
            delete(RefreshToken).where(
                (RefreshToken.user_id == user_id) & (RefreshToken.token == refresh_token)
            )
        )
        await self.session.commit()

    def authenticate(self, token: str) -> UserTokenData:
        try:
            return jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
                options={
                    "require": ["exp"],
                },
            )
        except jwt.InvalidTokenError:
            raise InvalidTokenError

    def authorize_with_role(self, user: UserTokenData, role: UserRoles):
        if (user["is_volunteer"] and role != UserRoles.VOLUNTEER) or (
            not user["is_volunteer"] and role != UserRoles.HELP_SEEKER
        ):
            raise NotAuthorizedError

    def _create_token(self, user: User, expire_in: timedelta):
        to_encode: UserTokenData = {
            "id": user.id,
            "email": user.email,
            "is_volunteer": user.is_volunteer,
            "exp": datetime.now(timezone.utc) + expire_in
        }
        encoded_jwt = jwt.encode(dict(to_encode), JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    def _recreate_token(self, token: str, expire_in: timedelta):
        to_encode = self.authenticate(token)
        to_encode["exp"] = datetime.now(timezone.utc) + expire_in
        encoded_jwt = jwt.encode(dict(to_encode), JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
