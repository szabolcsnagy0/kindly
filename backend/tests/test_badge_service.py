import pytest
from unittest.mock import Mock, AsyncMock, MagicMock
from app.services.badge_service import (
    award_badge,
    get_user_badges,
    calculate_badge_progress,
    check_and_award_badges,
    BADGE_DEFINITIONS
)
from app.models.badge_achievement import BadgeAchievement
from app.models.user import User


@pytest.mark.asyncio
async def test_award_badge():
    session = AsyncMock()
    user = User(id=1, first_name="John", last_name="Doe", email="test@test.com",
                password="hash", date_of_birth="2000-01-01", about_me="test",
                is_volunteer=True)

    session.execute = AsyncMock()
    session.execute.return_value.scalar_one.return_value = user
    session.execute.return_value.scalar_one_or_none.return_value = None

    badge = await award_badge(session, 1, 2)

    assert badge.user_id == 1
    assert badge.badge_id == 2
    assert badge.badge_name != None


@pytest.mark.asyncio
async def test_award_badge_duplicate():
    session = AsyncMock()
    user = User(id=1, first_name="John", last_name="Doe", email="test@test.com",
                password="hash", date_of_birth="2000-01-01", about_me="test",
                is_volunteer=True)

    existing_badge = BadgeAchievement(
        id=1, user_id=1, badge_id=2, badge_name="Helper Hero",
        rarity=2, is_completed=True, progress=100, total_required=100
    )

    session.execute = AsyncMock()
    session.execute.return_value.scalar_one.return_value = user
    session.execute.return_value.scalar_one_or_none.return_value = existing_badge

    badge = await award_badge(session, 1, 2)

    assert badge == existing_badge


def test_calculate_badge_progress():
    progress = calculate_badge_progress(1, 2, 3)

    assert progress >= 0
    assert progress <= 100


def test_calculate_badge_progress_edge_cases():
    result = calculate_badge_progress(1, 2, 5)
    assert result == 100

    result = calculate_badge_progress(1, 5, 50)
    assert result == 50


@pytest.mark.asyncio
async def test_get_user_badges():
    session = AsyncMock()

    badge1 = BadgeAchievement(
        id=1, user_id=1, badge_id=1, badge_name="First Badge",
        rarity=1, is_completed=True, progress=100, total_required=100
    )
    badge2 = BadgeAchievement(
        id=2, user_id=1, badge_id=2, badge_name="Second Badge",
        rarity=2, is_completed=True, progress=100, total_required=100
    )

    user = User(id=1, first_name="John", last_name="Doe", email="test@test.com",
                password="hash", date_of_birth="2000-01-01", about_me="test",
                is_volunteer=True)

    session.execute = AsyncMock()

    def execute_side_effect(*args, **kwargs):
        result = AsyncMock()
        if "BadgeAchievement" in str(args):
            result.scalars.return_value.all.return_value = [badge1, badge2]
        else:
            result.scalar_one.return_value = user
        return result

    session.execute.side_effect = execute_side_effect

    badges = await get_user_badges(session, 1)

    assert len(badges) > 0


@pytest.mark.asyncio
async def test_check_and_award_badges():
    session = AsyncMock()

    result = AsyncMock()
    result.scalar.return_value = 10
    session.execute = AsyncMock(return_value=result)

    await check_and_award_badges(session, 1)

    assert session.execute.called
    assert session.execute.call_count >= 3


def test_badge_definitions_exist():
    assert BADGE_DEFINITIONS is not None
    assert len(BADGE_DEFINITIONS) > 0


def test_badge_definitions_structure():
    for badge_id, badge_info in BADGE_DEFINITIONS.items():
        assert "name" in badge_info
        assert "rarity" in badge_info


@pytest.mark.asyncio
async def test_award_badge_invalid_id():
    session = AsyncMock()
    user = User(id=1, first_name="John", last_name="Doe", email="test@test.com",
                password="hash", date_of_birth="2000-01-01", about_me="test",
                is_volunteer=True)

    session.execute = AsyncMock()
    session.execute.return_value.scalar_one.return_value = user
    session.execute.return_value.scalar_one_or_none.return_value = None

    with pytest.raises(KeyError):
        badge = await award_badge(session, 1, 999)
