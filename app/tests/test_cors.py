"""
Test CORS configuration for frontend integration
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_cors_preflight_request():
    """Test that CORS preflight OPTIONS request returns correct headers"""
    response = client.options(
        "/api/auth/login/email",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "Content-Type" in response.headers["access-control-allow-headers"]


def test_cors_actual_request():
    """Test that actual POST request includes CORS headers"""
    response = client.post(
        "/api/auth/login/email",
        json={"email": "test@example.com", "password": "invalid"},
        headers={"Origin": "http://localhost:3000"}
    )
    
    # Should fail authentication but include CORS headers
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_invalid_origin():
    """Test that invalid origin is rejected"""
    response = client.options(
        "/api/auth/login/email",
        headers={
            "Origin": "http://evil-site.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    
    # Should not include CORS headers for invalid origin
    assert "access-control-allow-origin" not in response.headers


def test_login_endpoint_exists():
    """Test that the login endpoint exists and is accessible"""
    response = client.post(
        "/api/auth/login/email",
        json={"email": "test@example.com", "password": "invalid"}
    )
    
    # Should return 401 (invalid credentials) not 404 (not found)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"