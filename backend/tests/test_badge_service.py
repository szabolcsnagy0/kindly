import pytest
from unittest.mock import Mock, AsyncMock, MagicMock, patch
from app.services.badge_service import (
    award_badge,
    get_user_badges,
    calculate_badge_progress,
    check_and_award_badges,
    admin_award_special_badge,
    BADGE_DEFINITIONS
)
from app.models.badge_achievement import BadgeAchievement
from app.models.user import User
from app.interfaces.exceptions import BadgeNotFoundError


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
    assert badge.badge_name == "Helper Hero"


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

    user_result = AsyncMock()
    user_result.scalar_one.return_value = user

    badge_result = AsyncMock()
    badge_result.scalar_one_or_none.return_value = existing_badge

    session.execute = AsyncMock(side_effect=[user_result, badge_result])

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

    with pytest.raises(BadgeNotFoundError):
        await award_badge(session, 1, 999)


@pytest.mark.asyncio
async def test_admin_award_special_badge_invalid_api_key():
    session = AsyncMock()

    with patch('app.services.badge_service.ADMIN_API_KEY', 'correct_key'):
        result = await admin_award_special_badge(
            session=session,
            user_id=1,
            badge_name="Special Badge",
            description="Very special",
            rarity=4,
            api_key="wrong_key"
        )

    assert result is None
    session.add.assert_not_called()
    session.commit.assert_not_called()


@pytest.mark.asyncio
async def test_admin_award_special_badge_valid_api_key():
    session = AsyncMock()

    max_result = AsyncMock()
    max_result.scalar.return_value = 10
    session.execute = AsyncMock(return_value=max_result)

    with patch('app.services.badge_service.ADMIN_API_KEY', 'correct_key'):
        badge = await admin_award_special_badge(
            session=session,
            user_id=1,
            badge_name="Special Badge",
            description="Very special",
            rarity=4,
            api_key="correct_key"
        )

    assert badge is not None
    assert badge.badge_id == 11
    assert badge.badge_name == "Special Badge"
    assert badge.description == "Very special"
    assert badge.rarity == 4
    assert badge.user_id == 1
    assert badge.is_completed is True
    session.add.assert_called_once()
    session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_admin_award_special_badge_no_existing_badges():
    session = AsyncMock()

    max_result = AsyncMock()
    max_result.scalar.return_value = None
    session.execute = AsyncMock(return_value=max_result)

    with patch('app.services.badge_service.ADMIN_API_KEY', 'correct_key'):
        badge = await admin_award_special_badge(
            session=session,
            user_id=1,
            badge_name="First Special",
            description="First special badge",
            rarity=3,
            api_key="correct_key"
        )

    assert badge is not None
    assert badge.badge_id == len(BADGE_DEFINITIONS) + 1
    assert badge.badge_name == "First Special"
    session.add.assert_called_once()
    session.commit.assert_called_once()
