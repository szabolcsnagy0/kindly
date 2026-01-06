import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload
from ..models.badge_achievement import BadgeAchievement
from ..models.user import User

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

BADGE_DEFINITIONS = {
    1: {"name": "First Level", "rarity": 1, "description": "Reached level 2"},
    2: {"name": "Helper Hero", "rarity": 2, "description": "Completed 5 requests"},
    3: {"name": "Speed Demon", "rarity": 3, "description": "Completed request in under 1 hour"},
    4: {"name": "Super Volunteer", "rarity": 3, "description": "Helped 10 people"},
    5: {"name": "Legendary Helper", "rarity": 4, "description": "Completed 100 requests"},
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
    if badge_id == 2:
        total = 5
    elif badge_id == 4:
        total = 10
    elif badge_id == 5:
        total = 100
    else:
        total = 1

    if total == 0:
        return 0

    progress = (completed_count / total) * 100

    return int(progress)


async def get_user_badges(session: AsyncSession, user_id: int) -> List[BadgeAchievement]:
    result = await session.execute(
        select(BadgeAchievement)
        .options(joinedload(BadgeAchievement.user))
        .where(BadgeAchievement.user_id == user_id)
    )
    badges = result.scalars().all()

    for badge in badges:
        badge.user_name = f"{badge.user.first_name} {badge.user.last_name}"

    return badges


async def check_and_award_badges(session: AsyncSession, user_id: int):
    result = await session.execute(
        text("SELECT COUNT(*) FROM application WHERE user_id = :user_id AND status = 'ACCEPTED'").bindparams(user_id=user_id)
    )
    completed_requests = result.scalar()

    if completed_requests >= 5 and not await has_badge(session, user_id, 2):
        await award_badge(session, user_id, 2)

    if completed_requests >= 10 and not await has_badge(session, user_id, 4):
        await award_badge(session, user_id, 4)

    if completed_requests >= 100 and not await has_badge(session, user_id, 5):
        await award_badge(session, user_id, 5)


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

    # Query for the maximum badge_id to avoid collisions
    result = await session.execute(
        select(BadgeAchievement.badge_id).order_by(BadgeAchievement.badge_id.desc()).limit(1)
    )
    max_badge_id = result.scalar()

    # Use the greater of max_badge_id or predefined badge count
    badge_id = max(max_badge_id + 1 if max_badge_id else 0, len(BADGE_DEFINITIONS) + 1)

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
        LEFT JOIN badge_achievement ba ON u.id = ba.user_id AND ba.is_completed = true
        GROUP BY u.id, u.first_name, u.last_name
        HAVING COUNT(ba.id) > 0
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
            # Use a savepoint for each award to allow partial success
            async with session.begin_nested():
                badge = await award_badge(session, user_id, badge_id)
                results.append({"user_id": user_id, "success": True, "badge": badge})
        except Exception as e:
            # Rollback only this specific award, continue with others
            await session.rollback()
            results.append({"user_id": user_id, "success": False, "error": str(e)})

    return results
