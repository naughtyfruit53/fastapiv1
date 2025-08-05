# New: v1/tests/test_reset_integration.py

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.models.base import User, Organization, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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

@pytest.fixture(scope="module")
def setup_db():
    db = TestingSessionLocal()
    # Create test org and user
    org = Organization(id=1, name="Test Org")
    user = User(id=1, email="test@admin.com", is_super_admin=True, organization_id=1)
    db.add(org)
    db.add(user)
    db.commit()
    yield db
    Base.metadata.drop_all(bind=engine)

def test_full_reset_workflow(setup_db, mocker):
    mocker.patch("app.services.otp_service.otp_service.create_otp_verification", return_value="123456")
    mocker.patch("app.services.otp_service.otp_service.verify_otp", return_value=(True, {"scope": "organization", "organization_id": 1}))
    
    # Request OTP
    response = client.post("/settings/factory-reset/request-otp", json={"scope": "organization", "organization_id": 1})
    assert response.status_code == 200
    
    # Confirm
    response = client.post("/settings/factory-reset/confirm", json={"otp": "123456"})
    assert response.status_code == 200
    assert "successful" in response.json()["message"]