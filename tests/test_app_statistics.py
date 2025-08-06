"""
Test app-level statistics endpoint
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base, engine
from app.models.base import User, Organization
from app.core.security import get_password_hash
from app.schemas.user import UserRole
from sqlalchemy.orm import Session

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_db():
    # Create test database tables
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def super_admin_user(test_db: Session):
    # Create super admin user
    super_admin = User(
        organization_id=None,  # Super admin has no organization
        email="superadmin@test.com",
        username="superadmin",
        hashed_password=get_password_hash("testpass123"),
        full_name="Super Admin User",
        role=UserRole.SUPER_ADMIN,
        is_super_admin=True,
        is_active=True
    )
    test_db.add(super_admin)
    test_db.commit()
    test_db.refresh(super_admin)
    return super_admin

@pytest.fixture
def test_organizations(test_db: Session):
    # Create test organizations
    orgs = []
    for i in range(3):
        org = Organization(
            name=f"Test Organization {i+1}",
            subdomain=f"testorg{i+1}",
            primary_email=f"admin{i+1}@example.com",
            primary_phone="+1234567890",
            address1="Test Address",
            city="Test City",
            state="Test State",
            pin_code="123456",
            status="active" if i < 2 else "trial",
            plan_type="premium" if i == 0 else "trial"
        )
        test_db.add(org)
        orgs.append(org)
    
    test_db.commit()
    return orgs

def test_app_statistics_requires_auth(client: TestClient):
    """Test that app statistics endpoint requires authentication"""
    response = client.get("/api/v1/organizations/app-statistics")
    assert response.status_code == 401

def test_app_statistics_requires_super_admin(client: TestClient, test_db: Session, test_organizations):
    """Test that app statistics endpoint requires super admin access"""
    # Create regular user
    regular_user = User(
        organization_id=test_organizations[0].id,
        email="user@example.com",
        username="user",
        hashed_password=get_password_hash("testpass123"),
        full_name="Regular User",
        role=UserRole.STANDARD_USER,
        is_active=True
    )
    test_db.add(regular_user)
    test_db.commit()
    
    # Login as regular user
    login_data = {"username": "user@example.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access app statistics
    response = client.get("/api/v1/organizations/app-statistics", headers=headers)
    assert response.status_code == 403

def test_app_statistics_structure(client: TestClient, test_db: Session, super_admin_user, test_organizations):
    """Test app statistics endpoint returns correct structure"""
    # Login as super admin
    login_data = {"username": "superadmin@test.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get app statistics
    response = client.get("/api/v1/organizations/app-statistics", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    
    # Check required fields
    assert "total_licenses_issued" in data
    assert "active_organizations" in data
    assert "trial_organizations" in data
    assert "total_active_users" in data
    assert "super_admins_count" in data
    assert "new_licenses_this_month" in data
    assert "plan_breakdown" in data
    assert "system_health" in data
    assert "generated_at" in data
    
    # Check values match test data
    assert data["total_licenses_issued"] == 3
    assert data["active_organizations"] == 2
    assert data["trial_organizations"] == 1
    assert data["super_admins_count"] == 1
    
    # Check plan breakdown
    assert "premium" in data["plan_breakdown"]
    assert "trial" in data["plan_breakdown"]
    assert data["plan_breakdown"]["premium"] == 1
    assert data["plan_breakdown"]["trial"] == 2