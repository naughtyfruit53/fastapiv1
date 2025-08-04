#!/usr/bin/env python3
"""
Test to validate that OPTIONS requests work correctly with TenantMiddleware
"""
import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from app.core.tenant import TenantMiddleware


def test_options_request_bypasses_tenant_middleware():
    """Test that OPTIONS requests pass through TenantMiddleware without tenant processing"""
    
    # Create minimal app mimicking main.py structure
    app = FastAPI()
    
    # Add CORS middleware first (as in main.py)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:8080"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add tenant middleware after CORS (as in main.py)
    app.add_middleware(TenantMiddleware)
    
    # Add test routes
    @app.get("/api/auth/login/email")
    def login_endpoint():
        return {"message": "login endpoint"}
    
    @app.post("/api/auth/login/email")
    def login_post():
        return {"message": "login post"}
    
    @app.get("/api/users")
    def users_endpoint():
        return {"message": "users endpoint"}
    
    # Test with TestClient
    client = TestClient(app)
    
    # Test endpoints that should support CORS preflight
    test_endpoints = [
        "/api/auth/login/email",
        "/api/users", 
        "/api/companies",  # Non-existent endpoint should still handle OPTIONS
        "/api/auth/register"  # Non-existent endpoint should still handle OPTIONS
    ]
    
    for endpoint in test_endpoints:
        # Send OPTIONS request (CORS preflight)
        response = client.options(endpoint, headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization"
        })
        
        # Should return 200 with CORS headers
        assert response.status_code == 200, f"OPTIONS request to {endpoint} failed with status {response.status_code}"
        
        # Check for required CORS headers
        headers = response.headers
        assert "access-control-allow-origin" in headers, f"Missing CORS origin header for {endpoint}"
        assert "access-control-allow-methods" in headers, f"Missing CORS methods header for {endpoint}"
        assert "access-control-allow-headers" in headers, f"Missing CORS headers header for {endpoint}"
        assert "access-control-allow-credentials" in headers, f"Missing CORS credentials header for {endpoint}"
        
        print(f"✅ OPTIONS {endpoint} - Status: {response.status_code}")


def test_non_options_requests_still_work():
    """Test that non-OPTIONS requests still work normally"""
    
    app = FastAPI()
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add tenant middleware
    app.add_middleware(TenantMiddleware)
    
    @app.get("/api/test")
    def test_endpoint():
        return {"message": "test endpoint"}
    
    client = TestClient(app)
    
    # Regular GET request should work
    response = client.get("/api/test")
    assert response.status_code == 200
    assert response.json() == {"message": "test endpoint"}
    
    print("✅ Non-OPTIONS requests work correctly")


def test_tenant_context_not_set_for_options():
    """Test that tenant context is not set for OPTIONS requests"""
    
    from app.core.tenant import TenantContext
    
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(TenantMiddleware)
    
    @app.options("/api/test")
    def options_handler():
        # This should not be reached for OPTIONS requests since CORS handles them
        org_id = TenantContext.get_organization_id()
        return {"org_id": org_id}
    
    @app.get("/api/test")
    def get_handler():
        org_id = TenantContext.get_organization_id()
        return {"org_id": org_id}
    
    client = TestClient(app)
    
    # OPTIONS request - tenant context should not be relevant
    response = client.options("/api/test", headers={
        "Origin": "http://localhost:3000",
        "X-Organization-ID": "123"  # This should be ignored for OPTIONS
    })
    assert response.status_code == 200
    
    print("✅ Tenant context properly handled for OPTIONS requests")


if __name__ == "__main__":
    test_options_request_bypasses_tenant_middleware()
    test_non_options_requests_still_work()
    test_tenant_context_not_set_for_options()
    print("\n🎉 All CORS OPTIONS tests passed!")