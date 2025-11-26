from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Application, Request, RequestStatus, ApplicationStatus, User
from ..interfaces import AuthServiceInterface, ApplicationServiceInterface
from ..interfaces.auth_service import UserRoles, UserTokenData
from ..interfaces.application_service import (
    ApplicationInfo,
    RateSeekerData,
    RateVolunteerData,
)
from ..interfaces.exceptions import (
    ApplicationCannotBeRated,
    CanNotAcceptApplication,
    CanNotDeleteApplicationError,
    NoApplicationFoundError,
    RequestNotOpen,
    NoRequestFoundError,
    ApplicationAlreadyExists,
)


class ApplicationService(ApplicationServiceInterface):
    def __init__(self, session: AsyncSession, auth_service: AuthServiceInterface):
        self.session = session
        self.auth_service = auth_service

    async def create_application(self, user: UserTokenData, request_id: int) -> ApplicationInfo:
        self.auth_service.authorize_with_role(user, UserRoles.VOLUNTEER)

        async with self.session.begin():
            request = (
                await self.session.execute(
                    select(Request).filter(Request.id == request_id).with_for_update()
                )
            ).scalar_one_or_none()
            if request is None:
                raise NoRequestFoundError

            if request.status != RequestStatus.OPEN:
                raise RequestNotOpen

            try:
                request.application_count += 1
                application = Application(
                    request_id=request_id,
                    user_id=user["id"],
                )
                self.session.add(application)
                await self.session.flush()
            except IntegrityError:
                raise ApplicationAlreadyExists

        return ApplicationInfo(
            id=application.id,
            request_id=application.request_id,
            user_id=application.user_id,
            status=application.status.value,
            applied_at=application.applied_at
        )

    async def delete_application(self, user: UserTokenData, request_id: int) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.VOLUNTEER)

        async with self.session.begin():
            request = (
                await self.session.execute(
                    select(Request).filter(Request.id == request_id).with_for_update()
                )
            ).scalar_one_or_none()
            if request is None:
                raise NoRequestFoundError

            if request.status != RequestStatus.OPEN:
                raise CanNotDeleteApplicationError

            result = await self.session.execute(
                delete(Application).filter(
                    (Application.request_id == request_id)
                    & (Application.user_id == user["id"])
                ),
            )
            rows_affected = result.rowcount  # pyright: ignore[reportAttributeAccessIssue]
            if rows_affected == 0:
                raise NoApplicationFoundError
            request.application_count -= 1

    async def accept_application(self, user: UserTokenData, request_id: int, volunteer_id: int) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)

        async with self.session.begin():
            request = (
                await self.session.execute(
                    select(Request)
                    .join(Application)
                    .filter(Request.creator_id == user["id"])
                    .filter(
                        (Request.id == request_id)
                        & (Application.user_id == volunteer_id)
                    )
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if request is None:
                raise NoRequestFoundError

            if request.status != RequestStatus.OPEN:
                raise CanNotAcceptApplication

            await self.session.execute(
                update(Application)
                .where(Application.request_id == request_id)
                .values(
                    status=text(
                        "CASE WHEN user_id = :user_id THEN 'ACCEPTED'::applicationstatus ELSE 'DECLINED'::applicationstatus END"
                    ).bindparams(user_id=volunteer_id)
                )
            )
            request.status = RequestStatus.CLOSED

    async def rate_volunteer(self, user: UserTokenData, request_id: int, rating_data: RateVolunteerData) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)

        async with self.session.begin():
            application = (
                await self.session.execute(
                    select(Application)
                    .join(Request)
                    .filter(Request.id == request_id)
                    .filter(Request.creator_id == user["id"])
                    .filter(Application.status == ApplicationStatus.ACCEPTED)
                    .filter(Request.status == RequestStatus.COMPLETED)
                )
            ).scalar_one_or_none()
            if application is None:
                raise ApplicationCannotBeRated

            application.volunteer_rating = rating_data.rating

            xp = self._xp_for_rating(rating_data.rating)
            volunteer = await self.session.get(User, application.user_id)
            if volunteer is not None:
                volunteer.add_experience(xp)
                if rating_data.rating == 5:
                    volunteer.add_badge(2)

    async def rate_seeker(self, user: UserTokenData, request_id: int, rating_data: RateSeekerData) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.VOLUNTEER)

        async with self.session.begin():
            application = (
                await self.session.execute(
                    select(Application)
                    .join(Request)
                    .filter(Request.id == request_id)
                    .filter(Application.user_id == user["id"])
                    .filter(Application.status == ApplicationStatus.ACCEPTED)
                    .filter(Request.status == RequestStatus.COMPLETED)
                )
            ).scalar_one_or_none()
            if application is None:
                raise ApplicationCannotBeRated

            application.help_seeker_rating = rating_data.rating

            xp = self._xp_for_rating(rating_data.rating)
            if xp > 0:
                request = (
                    await self.session.execute(
                        select(Request).filter(Request.id == request_id)
                    )
                ).scalar_one_or_none()
                if request is not None:
                    seeker = await self.session.get(User, request.creator_id)
                    if seeker is not None:
                        seeker.add_experience(xp)
                        if rating_data.rating == 5:
                            seeker.add_badge(2)

    def _xp_for_rating(self, rating: int) -> int:
        return rating * 10
