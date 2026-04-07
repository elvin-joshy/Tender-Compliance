import logging
from threading import Lock
from typing import Optional

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.config import settings

logger = logging.getLogger(__name__)


class MongoConnection:
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None
    _lock: Lock = Lock()

    @classmethod
    def _connect(cls) -> None:
        if cls._client is not None and cls._db is not None:
            return

        if not settings.mongo_uri:
            raise RuntimeError("MONGO_URI is not configured.")

        with cls._lock:
            if cls._client is not None and cls._db is not None:
                return

            client = MongoClient(
                settings.mongo_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000,
            )
            client.admin.command("ping")

            db = client[settings.mongo_database]
            analyses = db[settings.mongo_collection]
            analyses.create_index([(settings.mongo_analysis_id_field, ASCENDING)], unique=True)
            analyses.create_index([("timestamp", DESCENDING)])

            cls._client = client
            cls._db = db
            logger.info(
                "MongoDB connected. database=%s collection=%s",
                settings.mongo_database,
                settings.mongo_collection,
            )

    @classmethod
    def get_database(cls) -> Database:
        cls._connect()
        if cls._db is None:
            raise RuntimeError("MongoDB database is not initialized.")
        return cls._db

    @classmethod
    def get_analyses_collection(cls) -> Collection:
        db = cls.get_database()
        return db[settings.mongo_collection]
