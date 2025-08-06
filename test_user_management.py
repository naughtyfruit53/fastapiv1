"""
Test user creation and email-as-username functionality
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.models.base import User
from app.schemas.user import UserCreate, UserRole
from app.services.user_service import UserService

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_user_creation_with_email_as_username():
    """Test that username is auto-generated from email when creating users"""
    db = TestingSessionLocal()
    
    try:
        # Create user data without username
        user_data = UserCreate(
            email="test@example.com",
            password="TestPassword123!",
            full_name="Test User",
            role=UserRole.STANDARD_USER
        )
        
        # Create user using service
        created_user = UserService.create_user(db, user_data)
        
        # Assert username was auto-generated from email
        assert created_user.username == "test"
        assert created_user.email == "test@example.com"
        assert created_user.full_name == "Test User"
        
        # Test with different email format
        user_data2 = UserCreate(
            email="another.user+tag@company.org",
            password="TestPassword123!",
            full_name="Another User",
            role=UserRole.ADMIN
        )
        
        created_user2 = UserService.create_user(db, user_data2)
        assert created_user2.username == "another.user+tag"
        assert created_user2.email == "another.user+tag@company.org"
        
    finally:
        db.close()

def test_app_user_management_endpoint():
    """Test that app user management endpoint exists and requires proper permissions"""
    
    # Test without authentication - should fail
    response = client.get("/api/app-users/")
    assert response.status_code == 401  # Unauthorized
    
    # Test with fake token - should fail  
    response = client.get(
        "/api/app-users/",
        headers={"Authorization": "Bearer fake-token"}
    )
    assert response.status_code == 401 or response.status_code == 403

def test_organizations_reset_data_endpoint_exists():
    """Test that the organization reset data endpoint exists"""
    
    # Test without authentication - should fail with 401, not 404
    response = client.post("/api/organizations/reset-data")
    assert response.status_code == 401  # Should require auth, not be missing

def test_organizations_app_statistics_endpoint_exists():
    """Test that the app statistics endpoint exists"""
    
    # Test without authentication - should fail with 401, not 404
    response = client.get("/api/organizations/app-statistics")
    assert response.status_code == 401  # Should require auth, not be missing

def test_license_creation_endpoint_exists():
    """Test that license creation endpoint exists"""
    
    response = client.post(
        "/api/organizations/license/create",
        json={
            "organization_name": "Test Org",
            "superadmin_email": "admin@test.com"
        }
    )
    # Should fail with 401 (auth required) not 404 (endpoint missing)
    assert response.status_code == 401

if __name__ == "__main__":
    # Run tests manually
    print("Running user management tests...")
    
    try:
        test_user_creation_with_email_as_username()
        print("✓ User creation with email-as-username works")
    except Exception as e:
        print(f"✗ User creation test failed: {e}")
    
    try:
        test_app_user_management_endpoint()
        print("✓ App user management endpoint exists and requires auth")
    except Exception as e:
        print(f"✗ App user management test failed: {e}")
    
    try:
        test_organizations_reset_data_endpoint_exists()
        print("✓ Organization reset data endpoint exists")
    except Exception as e:
        print(f"✗ Organization reset data test failed: {e}")
    
    try:
        test_organizations_app_statistics_endpoint_exists()
        print("✓ App statistics endpoint exists")
    except Exception as e:
        print(f"✗ App statistics test failed: {e}")
    
    try:
        test_license_creation_endpoint_exists()
        print("✓ License creation endpoint exists")
    except Exception as e:
        print(f"✗ License creation test failed: {e}")
    
    print("All tests completed!")