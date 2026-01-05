import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from ..models.badge_achievement import BadgeAchievement
from ..models.user import User

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

BADGE_DEFINITIONS = {
    1: {"name": "Making Progress!", "rarity": 1, "description": "Reached Level 2"},
    2: {"name": "Super Star", "rarity": 4, "description": "Received a 5-star rating"},
    3: {"name": "First Help Given", "rarity": 1, "description": "Completed your first request"},
    4: {"name": "First Help Asked", "rarity": 1, "description": "Created your first request"},
    5: {"name": "Speedy Service", "rarity": 2, "description": "Completed a request within 24h"},
    6: {"name": "Dedicated Helper", "rarity": 2, "description": "Completed 10 requests"},
    7: {"name": "Generous Soul", "rarity": 2, "description": "Offered 5000+ coins reward"},
    8: {"name": "Community Pillar", "rarity": 2, "description": "Created 10 requests"},
    9: {"name": "Appreciative", "rarity": 1, "description": "Rated volunteer 5 stars"},
    101: {"name": "Super Shopper", "rarity": 1, "description": "Completed Shopping request"},
    102: {"name": "Dog Whisperer", "rarity": 1, "description": "Completed Dog Walking request"},
    103: {"name": "Clean Freak", "rarity": 1, "description": "Completed Cleaning request"},
    104: {"name": "Green Thumb", "rarity": 1, "description": "Completed Gardening request"},
    105: {"name": "Knowledge Sharer", "rarity": 1, "description": "Completed Tutoring request"},
    106: {"name": "Pet Pal", "rarity": 1, "description": "Completed Pet Sitting request"},
    107: {"name": "Fix-It Pro", "rarity": 1, "description": "Completed Home Repair request"},
}


async def award_badge(session: AsyncSession, user_id: int, badge_id: int) -> BadgeAchievement:
    user = await session.execute(select(User).where(User.id == user_id))
    user = user.scalar_one()

    badge_info = BADGE_DEFINITIONS[badge_id]

    existing = await session.execute(
        select(BadgeAchievement).where(
            BadgeAchievement.user_id == user_id,
            BadgeAchievement.badge_id == badge_id
        )
    )
    existing_badge = existing.scalar_one_or_none()

    if existing_badge:
        return existing_badge

    badge = BadgeAchievement(
        user_id=user_id,
        badge_id=badge_id,
        badge_name=badge_info["name"],
        rarity=badge_info["rarity"],
        description=badge_info.get("description"),
        is_completed=True,
        progress=100,
        total_required=100
    )

    session.add(badge)
    user.add_badge(badge_id)
    await session.commit()

    return badge


def calculate_badge_progress(user_id: int, badge_id: int, completed_count: int):
    if badge_id == 3:
        total = 1
    elif badge_id == 6:
        total = 10
    else:
        total = 1

    progress = (completed_count / total) * 100

    return int(progress)


async def get_user_badges(session: AsyncSession, user_id: int) -> List[BadgeAchievement]:
    result = await session.execute(
        select(BadgeAchievement)
        .where(BadgeAchievement.user_id == user_id)
        .options(selectinload(BadgeAchievement.user))
    )
    badges = result.scalars().all()
    return badges


async def check_and_award_badges(session: AsyncSession, user_id: int):
    result = await session.execute(
        text("SELECT COUNT(*) FROM application WHERE volunteer_id = :user_id AND status = 'ACCEPTED'").bindparams(user_id=user_id)
    )
    completed_requests = result.scalar()

    if completed_requests >= 1 and not await has_badge(session, user_id, 3):
        await award_badge(session, user_id, 3)

    if completed_requests >= 10 and not await has_badge(session, user_id, 6):
        await award_badge(session, user_id, 6)


async def has_badge(session: AsyncSession, user_id: int, badge_id: int) -> bool:
    result = await session.execute(
        select(BadgeAchievement).where(
            BadgeAchievement.user_id == user_id,
            BadgeAchievement.badge_id == badge_id,
            BadgeAchievement.is_completed == True
        )
    )
    return result.scalar_one_or_none() is not None


async def admin_award_special_badge(
    session: AsyncSession,
    user_id: int,
    badge_name: str,
    description: str,
    rarity: int,
    api_key: str
) -> Optional[BadgeAchievement]:
    if api_key != ADMIN_API_KEY:
        return None

    badge_id = len(BADGE_DEFINITIONS) + 1

    badge = BadgeAchievement(
        user_id=user_id,
        badge_id=badge_id,
        badge_name=badge_name,
        rarity=rarity,
        description=description,
        is_completed=True,
        progress=100,
        total_required=100
    )

    session.add(badge)
    await session.commit()

    return badge


async def get_badge_leaderboard(session: AsyncSession) -> List[dict]:
    query = """
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            COUNT(ba.id) as badge_count,
            SUM(CASE WHEN ba.rarity = 4 THEN 1 ELSE 0 END) as legendary_count
        FROM "user" u
        LEFT JOIN badge_achievement ba ON u.id = ba.user_id
        WHERE ba.is_completed = true
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY legendary_count DESC, badge_count DESC
        LIMIT 100
    """

    result = await session.execute(text(query))
    rows = result.fetchall()

    leaderboard = []
    for row in rows:
        leaderboard.append({
            "user_id": row[0],
            "name": f"{row[1]} {row[2]}",
            "badge_count": row[3],
            "legendary_count": row[4]
        })

    return leaderboard


def get_badge_rarity_color(rarity):
    colors = {
        1: "#808080",
        2: "#4169E1",
        3: "#9B30FF",
        4: "#FFD700"
    }
    return colors.get(rarity, "#000000")


async def bulk_award_badges(session: AsyncSession, user_ids: List[int], badge_id: int):
    results = []
    for user_id in user_ids:
        try:
            badge = await award_badge(session, user_id, badge_id)
            results.append({"user_id": user_id, "success": True, "badge": badge})
        except Exception as e:
            results.append({"user_id": user_id, "success": False, "error": str(e)})

    return results
