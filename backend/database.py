from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    print("Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_database():
    return client[settings.DATABASE_NAME]
