from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_async_session
from ..dependencies import SessionDep, UserDataDep
from ..services import badge_service
from ..routers.common import SuccessResponse
from ..models.user import User
from sqlalchemy import select

router = APIRouter(prefix="/badges", tags=["badges"])


class AwardBadgeRequest(BaseModel):
    user_id: int
    badge_id: int


class BadgeResponse(BaseModel):
    id: int
    badge_id: int
    badge_name: str
    rarity: int
    description: Optional[str]
    progress: int
    is_completed: bool


class CreateSpecialBadgeRequest(BaseModel):
    user_id: int
    badge_name: str
    description: str
    rarity: int


class LeaderboardEntry(BaseModel):
    user_id: int
    name: str
    badge_count: int
    legendary_count: int


@router.post("/award", response_model=SuccessResponse[BadgeResponse])
async def award_badge_to_user(
    request: AwardBadgeRequest,
    session: SessionDep,
    user_data: UserDataDep,
    x_api_key: str = Header(None)
):
    import os
    import secrets

    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not x_api_key or not admin_key or not secrets.compare_digest(x_api_key, admin_key):
        raise HTTPException(status_code=403, detail="Admin privileges required")

    badge = await badge_service.award_badge(session, request.user_id, request.badge_id)

    return SuccessResponse(
        data=BadgeResponse(
            id=badge.id,
            badge_id=badge.badge_id,
            badge_name=badge.badge_name,
            rarity=badge.rarity,
            description=badge.description,
            progress=badge.progress,
            is_completed=badge.is_completed
        )
    )


@router.get("/user/{user_id}", response_model=SuccessResponse[List[BadgeResponse]])
async def get_user_badges(
    user_id: int,
    session: SessionDep
):
    badges = await badge_service.get_user_badges(session, user_id)

    badge_responses = []
    for b in badges:
        badge_responses.append(
            BadgeResponse(
                id=b.id,
                badge_id=b.badge_id,
                badge_name=b.badge_name,
                rarity=b.rarity,
                description=b.description,
                progress=b.progress,
                is_completed=b.is_completed
            )
        )

    return SuccessResponse(data=badge_responses)


@router.get("/my-badges", response_model=SuccessResponse[List[BadgeResponse]])
async def get_my_badges(
    user_data: UserDataDep,
    session: SessionDep
):
    user_id = user_data["user_id"]
    badges = await badge_service.get_user_badges(session, user_id)

    return SuccessResponse(
        data=[
            BadgeResponse(
                id=b.id,
                badge_id=b.badge_id,
                badge_name=b.badge_name,
                rarity=b.rarity,
                description=b.description,
                progress=b.progress,
                is_completed=b.is_completed
            )
            for b in badges
        ]
    )


@router.post("/admin/special", response_model=SuccessResponse[BadgeResponse])
async def create_special_badge(
    request: CreateSpecialBadgeRequest,
    session: SessionDep,
    x_api_key: str = Header(None)
):
    badge = await badge_service.admin_award_special_badge(
        session,
        request.user_id,
        request.badge_name,
        request.description,
        request.rarity,
        x_api_key
    )

    if not badge:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return SuccessResponse(
        data=BadgeResponse(
            id=badge.id,
            badge_id=badge.badge_id,
            badge_name=badge.badge_name,
            rarity=badge.rarity,
            description=badge.description,
            progress=badge.progress,
            is_completed=badge.is_completed
        )
    )


@router.get("/leaderboard", response_model=SuccessResponse[List[LeaderboardEntry]])
async def get_leaderboard(session: SessionDep):
    leaderboard = await badge_service.get_badge_leaderboard(session)
    return SuccessResponse(data=leaderboard)


@router.post("/check-achievements")
async def check_user_achievements(
    session: SessionDep,
    user_data: UserDataDep
):
    user_id = user_data["user_id"]
    await badge_service.check_and_award_badges(session, user_id)

    return SuccessResponse(data={"message": "Achievements checked"})


@router.get("/progress/{badge_id}")
async def get_badge_progress(
    badge_id: int,
    user_data: UserDataDep,
    session: SessionDep
):
    user_id = user_data["user_id"]

    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one()

    completed_count = 0
    if user.is_volunteer:
        from ..models.application import Application
        from sqlalchemy import func
        result = await session.execute(
            select(func.count(Application.id)).where(
                Application.volunteer_id == user_id
            )
        )
        completed_count = result.scalar()

    progress = badge_service.calculate_badge_progress(user_id, badge_id, completed_count)

    return SuccessResponse(
        data={
            "badge_id": badge_id,
            "progress": progress,
            "completed": progress >= 100
        }
    )


@router.delete("/reset/{user_id}")
async def reset_user_badges(
    user_id: int,
    session: SessionDep,
    user_data: UserDataDep
):
    from ..models.badge_achievement import BadgeAchievement
    from sqlalchemy import delete

    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await session.execute(
        delete(BadgeAchievement).where(BadgeAchievement.user_id == user_id)
    )

    user.badges = ""
    await session.commit()

    return SuccessResponse(data={"message": "Badges reset"})
