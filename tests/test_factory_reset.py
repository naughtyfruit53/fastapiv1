# New: v1/tests/test_factory_reset.py

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base

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
def mock_user_super_admin():
    return {"id": 1, "is_super_admin": True, "email": "super@admin.com"}

@pytest.fixture
def mock_user_org_admin():
    return {"id": 2, "role": "org_admin", "organization_id": 1, "email": "org@admin.com"}

def test_request_factory_reset_otp_super_admin(mocker, mock_user_super_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_user_super_admin)
    mocker.patch("app.services.otp_service.otp_service.create_otp_verification", return_value="123456")
    
    response = client.post("/settings/factory-reset/request-otp", json={"scope": "all_organizations"})
    assert response.status_code == 200
    assert "OTP sent" in response.json()["message"]

def test_confirm_factory_reset(mocker, mock_user_super_admin):
    mocker.patch("app.api.v1.auth.get_current_super_admin", return_value=mock_user_super_admin)
    mocker.patch("app.services.otp_service.otp_service.verify_otp", return_value=(True, {"scope": "all_organizations"}))
    mocker.patch("app.services.reset_service.ResetService.reset_all_data", return_value={"message": "Reset done"})
    
    response = client.post("/settings/factory-reset/confirm", json={"otp": "123456"})
    assert response.status_code == 200
    assert "successful" in response.json()["message"]