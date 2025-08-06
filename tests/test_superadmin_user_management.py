import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base, PlatformUser
from app.core.security import get_password_hash
from app.schemas.user import PlatformUserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture
def mock_super_admin():
    return {"id": 1, "email": "naughtyfruit53@gmail.com", "role": PlatformUserRole.SUPER_ADMIN, "is_super_admin": True}

@pytest.fixture
def mock_platform_admin():
    return {"id": 2, "email": "admin@example.com", "role": PlatformUserRole.PLATFORM_ADMIN}

def test_create_platform_user_by_primary_super_admin(mocker, mock_super_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_super_admin)
    
    response = client.post("/api/v1/platform/users", json={
        "email": "newadmin@example.com",
        "full_name": "New Admin",
        "password": "StrongPass123!",
        "role": "platform_admin"
    })
    
    assert response.status_code == 201
    assert response.json()["email"] == "newadmin@example.com"
    assert response.json()["role"] == "platform_admin"

def test_create_platform_user_by_regular_platform_admin(mocker, mock_platform_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_platform_admin)
    
    response = client.post("/api/v1/platform/users", json={
        "email": "newadmin@example.com",
        "full_name": "New Admin",
        "password": "StrongPass123!",
        "role": "platform_admin"
    })
    
    assert response.status_code == 403
    assert "Only the primary super admin can create platform users" in response.json()["detail"]

def test_list_platform_users(mocker, mock_super_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_super_admin)
    
    response = client.get("/api/v1/platform/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_delete_platform_user(mocker, mock_super_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_super_admin)
    
    response = client.delete("/api/v1/platform/users/2")
    assert response.status_code == 200
    assert "User deleted successfully" in response.json()["message"]