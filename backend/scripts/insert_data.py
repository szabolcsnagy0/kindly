import asyncio
import logging
import random
from datetime import datetime, timedelta

from app.db import async_session, create_db_and_tables
from app.models import RequestType
from app.services import AuthService
from app.services.quest_service import QuestService
from app.interfaces.auth_service import RegistrationData
from app.services.request_service import RequestService
from app.interfaces.request_service import CreateOrUpdateRequestData
from app.services.application_service import ApplicationService


logger = logging.getLogger(__name__)

request_types = [
    RequestType(name="Shopping"),
    RequestType(name="Dog Walking"),
    RequestType(name="Cleaning"),
    RequestType(name="Gardening"),
    RequestType(name="Tutoring"),
    RequestType(name="Pet Sitting"),
    RequestType(name="Home Repair")
]

requests = [
    {
        "name": "Apartment cleaning",
        "description": "Looking for someone to clean my apartment, including floors, kitchen, and bathroom. Must bring your own supplies.",
        "request_type_ids": [3],
    },
    {
        "name": "Dog walking needed",
        "description": "Need someone to walk my energetic golden retriever for one hour in the afternoon.",
        "request_type_ids": [2],
    },
    {
        "name": "Grocery shopping",
        "description": "Looking for a volunteer to pick up groceries and deliver them to my home. List will be provided.",
        "request_type_ids": [1],
    },
    {
        "name": "Math Tutoring for Teenager",
        "description": "Seeking an experienced tutor for high school algebra and geometry help.",
        "request_type_ids": [5],
    },
    {
        "name": "General Gardening Help",
        "description": "Need a hand weeding flower beds and trimming shrubs in my back yard.",
        "request_type_ids": [4],
    },
    {
        "name": "Pet Sitting Over the Weekend",
        "description": "Need someone to look after my two cats from Friday evening to Sunday night, including feeding and playtime.",
        "request_type_ids": [6],
    },
    {
        "name": "Home Repairs - Leaky Faucet",
        "description": "Looking for help fixing a leaky kitchen faucet. Tools and materials will be provided, but experience is preferred.",
        "request_type_ids": [7],
    },
    {
        "name": "Lawn Mowing Help Needed",
        "description": "Need assistance mowing the front and back lawns. Preferably bring your own mower.",
        "request_type_ids": [4],
    },
    {
        "name": "English Tutoring for Adult",
        "description": "Looking for an English tutor to help me improve my conversational skills. Flexible schedule.",
        "request_type_ids": [5],
    },
    {
        "name": "Pick Up Prescription",
        "description": "Need someone to pick up a prescription from the pharmacy and deliver it to my apartment.",
        "request_type_ids": [1],
    },
    {
        "name": "Deep Clean Bathroom & Kitchen",
        "description": "Looking for detailed cleaning of bathroom and kitchen; disinfecting and organizing needed. Must like pets.",
        "request_type_ids": [3],
    },
    {
        "name": "Temporary Pet Sitting Needed",
        "description": "Need someone to feed and walk my dog for three days while I am away for work.",
        "request_type_ids": [6],
    },
    {
        "name": "Help with Planting Flowers",
        "description": "Would love some help planting new flowers and arranging pots in my garden.",
        "request_type_ids": [4],
    },
    {
        "name": "Light Bulb Replacement",
        "description": "Struggling to replace several high-ceiling bulbs. Would appreciate someone with a ladder to help!",
        "request_type_ids": [7],
    },
    {
        "name": "Grocery Shopping for Senior",
        "description": "Looking for a kind volunteer to do weekly grocery runs for a senior citizen.",
        "request_type_ids": [1],
    },
    {
        "name": "SAT Math Tutoring",
        "description": "In search of a tutor with experience in prepping students for SAT math. Materials can be provided.",
        "request_type_ids": [5],
    },
    {
        "name": "Dusting and Vacuuming Apartment",
        "description": "Friendly help needed for general dusting and vacuuming of a small apartment; takes about 1-2 hours.",
        "request_type_ids": [3],
    }
]


async def insert_dummy_data():
    if await create_db_and_tables():
        logger.info("Skipping dummy data insertion since data is already there")
        return

    async with async_session() as session:
        quest_service = QuestService(session)
        auth_service = AuthService(session, quest_service)
        request_service = RequestService(session, auth_service, quest_service)
        application_service = ApplicationService(session, auth_service)

        session.add_all(request_types)
        await session.commit()

        # Register a new user using AuthService and RegistrationData
        user1 = await auth_service.register(RegistrationData(
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            password="alicepassword123",
            date_of_birth=datetime.strptime("1990-01-01", "%Y-%m-%d").date(),
            about_me="A friendly help seeker.",
            is_volunteer=False
        ))

        user2 = await auth_service.register(RegistrationData(
            first_name="Bob",
            last_name="Johnson",
            email="bob@example.com",
            password="bobpassword123",
            date_of_birth=datetime.strptime("1985-05-10", "%Y-%m-%d").date(),
            about_me="An enthusiastic volunteer.",
            is_volunteer=True
        ))

        created_requests = []
        for request in requests:
            day = random.choice(list(range(1, 14)))
            request = await request_service.create_request(
                auth_service.authenticate(user1.tokens.access_token),
                CreateOrUpdateRequestData(
                    **request,
                    reward=random.normalvariate(1000, 100),
                    start=datetime.now() + timedelta(days=day),
                    end=datetime.now() + timedelta(days=day, hours=2),
                    address="123 Main St, Anytown",
                    longitude=19.0402 + random.uniform(-0.01, 0.01),
                    latitude=47.4979 + random.uniform(-0.01, 0.01),
                ),
            )
            created_requests.append(request.id)

        await application_service.create_application(
            auth_service.authenticate(user2.tokens.access_token),
            created_requests[0]
        )
        await application_service.accept_application(
            auth_service.authenticate(user1.tokens.access_token),
            created_requests[0],
            user2.user.id,
        )
        await application_service.create_application(
            auth_service.authenticate(user2.tokens.access_token),
            created_requests[1]
        )
        logger.info("Successfully inserted dummy data into the database")


if __name__ == "__main__":
    logger.setLevel(logging.INFO)
    asyncio.run(insert_dummy_data())
