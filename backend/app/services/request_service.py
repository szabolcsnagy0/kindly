from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional

from geoalchemy2.functions import ST_DWithin, ST_Point
from sqlalchemy import String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer, joinedload
from sqlalchemy.sql import asc, desc, func, select

from ..interfaces.request_service import (
    ApplicationInfo,
    CreateOrUpdateRequestData,
    MyRequestsFilter,
    Pagination,
    RequestDetailForHelpSeeker,
    RequestDetailForVolunteer,
    RequestInfo,
    RequestServiceInterface,
    RequestWithApplicationStatus,
    RequestsFilter,
    UserInfo,
)
from ..interfaces.auth_service import AuthServiceInterface, UserRoles, UserTokenData
from ..interfaces.common_service import RequestTypeInfo
from ..interfaces.exceptions import RequestCannotBeUpdatedError, RequestNotFoundError
from ..models import Application, ApplicationStatus, Request, RequestType, User, TypeOf
from ..models.request import RequestStatus
from .quest_service import QuestService


class RequestService(RequestServiceInterface):
    def __init__(self, session: AsyncSession, auth_service: AuthServiceInterface, quest_service: QuestService):
        self.auth_service = auth_service
        self.session = session
        self.quest_service = quest_service

    async def create_request(
        self, user: UserTokenData, request_data: CreateOrUpdateRequestData
    ) -> RequestInfo:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        request = Request(
            name=request_data.name,
            description=request_data.description,
            address=request_data.address,
            longitude=request_data.longitude,
            latitude=request_data.latitude,
            location=ST_Point(request_data.latitude, request_data.longitude),
            start=request_data.start,
            end=request_data.end,
            reward=request_data.reward,
            creator_id=user["id"]
        )

        request_types = await self.session.scalars(
            select(RequestType).where(RequestType.id.in_(request_data.request_type_ids))
        )
        request.request_types.extend(request_types)
        self.session.add(request)
        await self.session.commit()

        # Check for "First Help Asked" badge (Badge 4) and "Community Pillar" (Badge 8)
        request_count = (
            await self.session.execute(
                select(func.count(Request.id)).where(Request.creator_id == user["id"])
            )
        ).scalar()
        
        creator = await self.session.get(User, user["id"])
        if creator:
            if request_count == 1:
                creator.add_badge(4)
            elif request_count == 10:
                creator.add_badge(8)
            
            # Check for "Generous Soul" (Badge 7)
            if request_data.reward >= 5000:
                creator.add_badge(7)
                
            await self.session.commit()

        return self._to_request_info(request)

    async def update_request(
        self, user: UserTokenData, request_id: int, request_data: CreateOrUpdateRequestData
    ) -> RequestInfo:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        async with self.session.begin():
            request = (
                await self.session.execute(
                    select(Request)
                    .options(joinedload(Request.request_types))
                    .filter(Request.id == request_id)
                    .filter(Request.creator_id == user["id"])
                )
            ).unique().scalar_one_or_none()
            if request is None or request.application_count > 0:
                raise RequestCannotBeUpdatedError

            if 0 < len(request_data.request_type_ids):
                request_types = await self.session.scalars(
                    select(RequestType).where(RequestType.id.in_(request_data.request_type_ids))
                )
                request.request_types.clear()
                request.request_types.extend(request_types)

            # Update request fields
            request.name = request_data.name
            request.description = request_data.description
            request.start = request_data.start
            request.end = request_data.end
            request.reward = int(request_data.reward)
            request.address = request_data.address
            request.latitude = Decimal(str(request_data.latitude))
            request.longitude = Decimal(str(request_data.longitude))
            request.location = ST_Point(request_data.latitude, request_data.longitude)

        return self._to_request_info(request)

    async def delete_request(self, user: UserTokenData, request_id: int) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        request = (
            await self.session.execute(
                select(Request)
                .filter(Request.id == request_id)
                .filter(Request.creator_id == user["id"])
                .join(Application, Request.id == Application.request_id, isouter=True)
                .filter(Application.id == None)
            )
        ).scalar_one_or_none()
        if request is None:
            raise RequestCannotBeUpdatedError

        await self.session.delete(request)
        await self.session.commit()

    async def complete_request(self, user: UserTokenData, request_id: int) -> None:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        request = (
            await self.session.execute(
                select(Request)
                .options(joinedload(Request.request_types))
                .filter(Request.id == request_id)
                .filter(Request.creator_id == user["id"])
            )
        ).unique().scalar_one_or_none()
        if request is None:
            raise RequestNotFoundError

        if request.status != RequestStatus.CLOSED:
            raise RequestCannotBeUpdatedError

        request.status = RequestStatus.COMPLETED

        experience_gain = request.calculate_experience()
        caretaker = await self.session.get(User, user["id"])
        if caretaker is not None:
            caretaker.add_experience(experience_gain)

        accepted_application = (
            await self.session.execute(
                select(Application)
                .filter(Application.request_id == request.id)
                .filter(Application.status == ApplicationStatus.ACCEPTED)
            )
        ).scalar_one_or_none()
        if accepted_application is not None:
            volunteer = await self.session.get(User, accepted_application.user_id)
            if volunteer is not None:
                volunteer.add_experience(experience_gain)
                await self._award_completion_badges(volunteer, accepted_application, request)
                await self.quest_service.progress_quests(volunteer.id, [rt.id for rt in request.request_types])

        await self.session.commit()

    async def _award_completion_badges(self, volunteer: User, application: Application, request: Request) -> None:
        # Check for "Speedy Service" badge (Badge 5)
        if application.applied_at:
            time_diff = datetime.now(timezone.utc) - application.applied_at
            if time_diff < timedelta(hours=24):
                volunteer.add_badge(5)

        # Check for "First Help Given" (Badge 3) and "Dedicated Helper" (Badge 6)
        completed_count = (
            await self.session.execute(
                select(func.count(Application.id))
                .join(Request)
                .where(
                    (Application.user_id == volunteer.id) & 
                    (Request.status == RequestStatus.COMPLETED)
                )
            )
        ).scalar()
        
        if completed_count == 1:
            volunteer.add_badge(3)
        elif completed_count == 10:
            volunteer.add_badge(6)

        for rt in request.request_types:
            volunteer.add_badge(100 + rt.id)

    async def get_my_requests(
        self, user: UserTokenData, filters: MyRequestsFilter
    ) -> Pagination[RequestInfo]:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        query = (
            select(Request)
            .options(defer(Request.location))
            .options(joinedload(Request.request_types))
            .where(Request.creator_id == user["id"])
            .order_by(asc(filters.sort) if filters.order == "asc" else desc(filters.sort))
        )

        if filters.status != "ALL":
            query = query.where(Request.status == filters.status.upper())

        pagination_result = await filters.paginate(self.session, query)
        pagination_result.data = [
            self._to_request_info(row)
            for row in pagination_result.data
        ]
        return pagination_result

    async def get_requests(
        self, user: UserTokenData, filters: RequestsFilter
    ) -> Pagination[RequestWithApplicationStatus]:
        self.auth_service.authorize_with_role(user, UserRoles.VOLUNTEER)

        application_status = func.coalesce(
            func.cast(Application.status, String), "NOT_APPLIED"
        ).label("application_status")
        query = (
            select(Request, application_status)
            .options(
                joinedload(Request.creator).load_only(
                    User.id, User.first_name, User.last_name, User.avg_rating
                )
            )
            .options(joinedload(Request.request_types))
            .join(
                Application,
                (Request.id == Application.request_id)
                & (Application.user_id == user["id"]),
                isouter=True,
            )
            .order_by(
                asc(filters.sort) if filters.order == "asc" else desc(filters.sort)
            )
        )
        if filters.status == "OPEN":
            query = query.filter(Request.status == RequestStatus.OPEN)
        elif filters.status == "APPLIED":
            query = query.filter(application_status == "PENDING")
        elif filters.status == "COMPLETED":
            query = query.filter(Request.status == RequestStatus.COMPLETED)
        elif filters.status == "ALL":
            query = query.filter(
                (Request.status == RequestStatus.OPEN)
                | (application_status is not None)
            )

        if filters.max_reward is not None:
            query = query.filter(Request.reward < filters.max_reward)
        if filters.min_reward is not None:
            query = query.filter(filters.min_reward < Request.reward)

        if filters.location_lat and filters.location_lng:
            query = query.filter(
                ST_DWithin(
                    Request.location,
                    ST_Point(filters.location_lat, filters.location_lng),
                    filters.radius * 1000,
                )
            )

        if 0 < len(filters.request_type_ids):
            query = (
                query
                .join(TypeOf, isouter=True)
                .filter(TypeOf.request_type_id.in_(filters.request_type_ids))
                .distinct()
            )

        pagination_result = await filters.paginate(self.session, query, scalar=False)
        pagination_result.data = [
            RequestWithApplicationStatus(
                **self._to_request_info(request_obj).__dict__,
                application_status=application_status
            )
            for request_obj, application_status in pagination_result.data
        ]
        return pagination_result

    async def get_request_for_help_seeker(
        self, user: UserTokenData, request_id: int
    ) -> RequestDetailForHelpSeeker:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)
        result = (
            await self.session.execute(
                select(Request)
                .options(joinedload(Request.request_types))
                .options(joinedload(Request.applications))
                .options(joinedload(Request.applications).joinedload(Application.volunteer))
                .filter(Request.id == request_id)
                .filter(Request.creator_id == user["id"])
            )
        ).unique().scalar_one_or_none()
        if result is None:
            raise RequestNotFoundError

        request_info = self._to_request_info(result)
        applications = [self._to_application_info(app) for app in result.applications]
        return RequestDetailForHelpSeeker(
            **request_info.__dict__,
            applications=applications,
            has_rated_helper=any(
                application.volunteer_rating is not None
                for application in result.applications
            )
        )

    async def get_request_for_volunteer(
        self, user: UserTokenData, request_id: int
    ) -> RequestDetailForVolunteer:
        self.auth_service.authorize_with_role(user, UserRoles.VOLUNTEER)
        result = await self.session.execute(
            select(
                Request,
                func.coalesce(func.cast(Application.status, String), "NOT_APPLIED"),
                Application.help_seeker_rating,
            )
            .options(
                joinedload(Request.creator).load_only(
                    User.id, User.first_name, User.last_name, User.avg_rating
                )
            )
            .options(joinedload(Request.request_types))
            .outerjoin(
                Application,
                (Application.request_id == Request.id)
                & (Application.user_id == user["id"]),
            )
            .filter(Request.id == request_id)
        )
        result = result.unique().first()
        if result is None:
            raise RequestNotFoundError

        request, user_application_status, seeker_rating = result
        request_info = self._to_request_info(request)
        creator_info = UserInfo(
            id=request.creator.id,
            first_name=request.creator.first_name,
            last_name=request.creator.last_name,
            avg_rating=request.creator.avg_rating
        )

        return RequestDetailForVolunteer(
            **request_info.__dict__,
            application_status=str(user_application_status),
            creator=creator_info,
            has_rated_seeker=seeker_rating is not None,
        )

    def _to_request_info(self, request: Request) -> RequestInfo:
        return RequestInfo(
            id=request.id,
            name=request.name,
            description=request.description,
            reward=request.reward,
            status=request.status.value,
            start=request.start,
            end=request.end,
            address=request.address,
            longitude=float(request.longitude),
            latitude=float(request.latitude),
            created_at=request.created_at,
            application_count=request.application_count,
            request_types=[
                RequestTypeInfo(id=rt.id, name=rt.name) 
                for rt in request.request_types
            ]
        )

    def _to_application_info(self, application: Application) -> ApplicationInfo:
        return ApplicationInfo(
            id=application.id,
            status=application.status.value,
            volunteer=UserInfo(
                id=application.volunteer.id,
                first_name=application.volunteer.first_name,
                last_name=application.volunteer.last_name,
                avg_rating=application.volunteer.avg_rating
            ),
            applied_at=application.applied_at,
        )
