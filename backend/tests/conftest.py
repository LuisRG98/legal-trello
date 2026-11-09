
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.api.deps import get_current_user
from app.db.database import Base, get_db
from app.models.user import User


@pytest.fixture
def test_engine():
    """
    Create an isolated in-memory SQLite database.

    StaticPool keeps the same in-memory database available
    across the connections used by the test client.
    """

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    User.__table__.create(bind=engine)

    yield engine

    User.__table__.drop(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """
    Provide a database session for test data setup.
    """

    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        expire_on_commit=False,
    )

    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_engine):
    """
    Configure FastAPI to use the test database.

    The TestClient is intentionally not used as a context manager:
    this avoids executing the application's production lifespan,
    which initializes case statuses using the production engine.
    """

    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        expire_on_commit=False,
    )

    def override_get_db():
        session = TestingSessionLocal()

        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    test_client = TestClient(app)

    yield test_client

    test_client.close()
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session):
    """
    Factory to create users with different roles and statuses.
    """

    def _make_user(
        *,
        full_name="Test User",
        email="test@example.com",
        nickname="testuser",
        role="SALES",
        is_active=True,
    ):
        user = User(
            full_name=full_name,
            email=email,
            nickname=nickname,
            password_hash="test-password-hash",
            role=role,
            is_active=is_active,
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        return user

    return _make_user


@pytest.fixture
def authenticate(client):
    """
    Replace get_current_user with a specific test user.

    This allows tests to focus on authorization rules
    independently from JWT token generation.
    """

    def _authenticate(user):
        app.dependency_overrides[get_current_user] = lambda: user

    return _authenticate
