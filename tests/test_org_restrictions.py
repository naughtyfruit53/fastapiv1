"""
Test organization data access restrictions for app super admins
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base, engine
from app.models.base import User, Organization, Company, Product
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
def test_users_and_org(test_db: Session):
    # Create test organization
    org = Organization(
        name="Test Organization",
        subdomain="testorg",
        primary_email="admin@example.com",
        primary_phone="+1234567890",
        address1="Test Address",
        city="Test City",
        state="Test State",
        pin_code="123456"
    )
    test_db.add(org)
    test_db.flush()
    
    # Create app super admin (no organization)
    app_super_admin = User(
        organization_id=None,  # App super admin has no organization
        email="superadmin@example.com",
        username="superadmin",
        hashed_password=get_password_hash("testpass123"),
        full_name="App Super Admin",
        role=UserRole.SUPER_ADMIN,
        is_super_admin=True,
        is_active=True
    )
    test_db.add(app_super_admin)
    
    # Create org admin
    org_admin = User(
        organization_id=org.id,
        email="orgadmin@example.com",
        username="orgadmin",
        hashed_password=get_password_hash("testpass123"),
        full_name="Org Admin",
        role=UserRole.ORG_ADMIN,
        is_active=True
    )
    test_db.add(org_admin)
    
    # Create test company
    company = Company(
        organization_id=org.id,
        name="Test Company",
        address1="Company Address",
        city="Company City",
        state="Company State",
        pin_code="654321",
        state_code="27",
        contact_number="+91-9876543210"
    )
    test_db.add(company)
    
    # Create test product
    product = Product(
        organization_id=org.id,
        name="Test Product",
        unit="PCS",
        unit_price=100.0,
        gst_rate=18.0
    )
    test_db.add(product)
    
    test_db.commit()
    test_db.refresh(org)
    test_db.refresh(app_super_admin)
    test_db.refresh(org_admin)
    
    return org, app_super_admin, org_admin

def test_app_super_admin_cannot_access_companies(client: TestClient, test_db: Session, test_users_and_org):
    """Test that app super admins cannot access organization company data"""
    org, app_super_admin, org_admin = test_users_and_org
    
    # Login as app super admin
    login_data = {"username": "superadmin@example.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access companies endpoint
    response = client.get("/api/v1/companies/", headers=headers)
    assert response.status_code == 403
    assert "App super administrators cannot access organization-specific data" in response.json()["detail"]

def test_app_super_admin_cannot_access_products(client: TestClient, test_db: Session, test_users_and_org):
    """Test that app super admins cannot access organization product data"""
    org, app_super_admin, org_admin = test_users_and_org
    
    # Login as app super admin
    login_data = {"username": "superadmin@example.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access products endpoint
    response = client.get("/api/v1/products/", headers=headers)
    assert response.status_code == 403
    assert "App super administrators cannot access organization-specific data" in response.json()["detail"]

def test_org_admin_can_access_organization_data(client: TestClient, test_db: Session, test_users_and_org):
    """Test that organization admins can access their organization's data"""
    org, app_super_admin, org_admin = test_users_and_org
    
    # Login as org admin
    login_data = {"username": "orgadmin@example.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Access companies endpoint
    response = client.get("/api/v1/companies/", headers=headers)
    assert response.status_code == 200
    companies = response.json()
    assert len(companies) == 1
    assert companies[0]["name"] == "Test Company"
    
    # Access products endpoint
    response = client.get("/api/v1/products/", headers=headers)
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Test Product"

def test_app_super_admin_can_access_app_statistics(client: TestClient, test_db: Session, test_users_and_org):
    """Test that app super admins can access app-level statistics"""
    org, app_super_admin, org_admin = test_users_and_org
    
    # Login as app super admin
    login_data = {"username": "superadmin@example.com", "password": "testpass123"}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Access app statistics (should work)
    response = client.get("/api/v1/organizations/app-statistics", headers=headers)
    assert response.status_code == 200
    stats = response.json()
    assert "total_licenses_issued" in stats
    assert stats["total_licenses_issued"] == 1  # One test organization