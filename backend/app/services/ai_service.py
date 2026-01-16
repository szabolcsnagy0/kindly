import os
from typing import List

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..interfaces import AuthServiceInterface
from ..interfaces.auth_service import UserRoles, UserTokenData
from ..interfaces.exceptions import AIServiceUnavailableError
from ..interfaces.ai_service import (
    AIServiceInterface,
    CategoryGenerationRequest,
    RequestTypeInfo,
)
from ..models import RequestType


class AIService(AIServiceInterface):
    def __init__(self, session: AsyncSession, auth_service: AuthServiceInterface):
        self.session = session
        self.auth_service = auth_service

    async def generate_categories(self, user: UserTokenData, request: CategoryGenerationRequest) -> List[RequestTypeInfo]:
        self.auth_service.authorize_with_role(user, UserRoles.HELP_SEEKER)

        api_key = os.getenv("GENAI_API_KEY")
        base_url = os.getenv("GENAI_URL")

        if api_key is None or base_url is None:
            raise AIServiceUnavailableError

        all_request_types = (await self.session.execute(select(RequestType))).scalars().all()
        category_names = [rt.name for rt in all_request_types]

        prompt = f"""
        The user has provided the following description for a request:
        "{request.description}"

        Please choose the most relevant categories from the following list:
        {', '.join(category_names)}

        Return a comma-separated list of the chosen category names.
        """

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        response = await client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        chosen_category_names = response.choices[0].message.content
        if chosen_category_names is None:
            return []

        chosen_category_names = [
            name.strip().lower() for name in chosen_category_names.split(",")
        ]

        return [
            RequestTypeInfo(id=rt.id, name=rt.name)
            for rt in all_request_types
            if rt.name.lower() in chosen_category_names
        ]
