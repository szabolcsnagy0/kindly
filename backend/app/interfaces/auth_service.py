import os
from abc import ABC, abstractmethod
from datetime import date, datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from typing_extensions import NotRequired, TypedDict

from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field


load_dotenv()

ACCESS_TOKEN_EXPIRY = (
    timedelta(hours=5) if os.getenv("DEBUG", False) else timedelta(minutes=5)
)
REFRESH_TOKEN_EXPIRY = timedelta(hours=2)


class RegistrationData(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    date_of_birth: date
    about_me: str = Field(min_length=10)
    is_volunteer: bool


class LoginData(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


@dataclass
class UserInfo:
    id: int
    first_name: str
    last_name: str
    email: str
    date_of_birth: date
    about_me: str
    is_volunteer: bool
    avg_rating: float
    level: int
    experience: int
    experience_to_next_level: int
    badges: str


@dataclass
class AuthTokens:
    access_token: str
    refresh_token: str

@dataclass
class AuthResult:
    user: UserInfo
    tokens: AuthTokens


class UserTokenData(TypedDict):
    id: int
    email: str
    is_volunteer: bool
    exp: NotRequired[datetime]


class UserRoles(Enum):
    VOLUNTEER = "volunteer"
    HELP_SEEKER = "help_seeker"


class AuthServiceInterface(ABC):
    @abstractmethod
    async def login(self, body: LoginData) -> AuthResult: ...

    @abstractmethod
    async def register(self, body: RegistrationData) -> AuthResult: ...

    @abstractmethod
    async def refresh(
        self, refresh_token: str, access_expires: timedelta | None = None
    ) -> AuthTokens: ...

    @abstractmethod
    async def logout(self, user_id: int, refresh_token: str) -> None: ...

    @abstractmethod
    def authenticate(self, token: str) -> UserTokenData: ...

    @abstractmethod
    def authorize_with_role(self, user: UserTokenData, role: UserRoles): ...
