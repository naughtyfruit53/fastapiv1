#!/usr/bin/env python3
"""
Final validation test simulating the exact problem from the issue description
"""
import sys
sys.path.append('/home/runner/work/fastapiv1/fastapiv1')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from app.core.tenant import TenantMiddleware
from app.core.config import settings


def test_exact_problem_scenario():
    """
    Test the exact scenario from the problem statement:
    - OPTIONS requests to /api/auth/login/email
    - CORS preflight should work
    - Should not return 400 Bad Request
    """
    
    print("Testing the exact problem scenario from the issue...")
    print("Route: /api/auth/login/email")
    print("Request: OPTIONS (CORS preflight)")
    print("-" * 50)
    
    # Create app exactly like main.py
    app = FastAPI(
        title="TRITIQ ERP API",
        version="1.0.0",
        description="FastAPI migration of PySide6 ERP application",
        openapi_url="/api/openapi.json"
    )
    
    # Set up CORS exactly like main.py  
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add tenant middleware exactly like main.py
    app.add_middleware(TenantMiddleware)
    
    # Add the exact route from the problem statement
    @app.post("/api/auth/login/email")
    def login_email():
        return {"message": "Email login endpoint"}
    
    client = TestClient(app)
    
    # This is what a browser would send for CORS preflight
    print("Sending CORS preflight request...")
    
    response = client.options("/api/auth/login/email", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST", 
        "Access-Control-Request-Headers": "Content-Type, Authorization"
    })
    
    print(f"Response Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    # Before fix: This would return 400 Bad Request
    # After fix: This should return 200 OK
    
    if response.status_code == 400:
        print("❌ FAILED - Still getting 400 Bad Request (CORS preflight failing)")
        print("The TenantMiddleware is still blocking OPTIONS requests")
        return False
    elif response.status_code == 200:
        print("✅ SUCCESS - CORS preflight works!")
        
        # Verify CORS headers are present
        headers = response.headers
        cors_headers_present = all([
            "access-control-allow-origin" in headers,
            "access-control-allow-methods" in headers,
            "access-control-allow-headers" in headers,
        ])
        
        if cors_headers_present:
            print("✅ All required CORS headers are present")
            print(f"  - Origin: {headers.get('access-control-allow-origin')}")
            print(f"  - Methods: {headers.get('access-control-allow-methods')}")
            print(f"  - Headers: {headers.get('access-control-allow-headers')}")
            return True
        else:
            print("❌ Missing required CORS headers")
            return False
    else:
        print(f"❌ UNEXPECTED - Got status {response.status_code}")
        return False


def test_multiple_preflight_scenarios():
    """Test multiple CORS preflight scenarios that were likely failing before"""
    
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(TenantMiddleware)
    
    # Add various routes that need CORS support
    @app.post("/api/auth/login/email")
    def login_email(): return {"msg": "login"}
    
    @app.post("/api/auth/register") 
    def register(): return {"msg": "register"}
    
    @app.get("/api/users")
    def users(): return {"msg": "users"}
    
    client = TestClient(app)
    
    # Test various routes that web apps typically need CORS for
    routes_to_test = [
        "/api/auth/login/email",  # The specific route from the problem
        "/api/auth/register",
        "/api/users",
        "/api/companies",  # Non-existent route should still handle OPTIONS
    ]
    
    print("\nTesting multiple CORS preflight scenarios...")
    
    all_passed = True
    for route in routes_to_test:
        response = client.options(route, headers={
            "Origin": "https://myapp.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization, X-Organization-ID"
        })
        
        if response.status_code == 200:
            print(f"✅ {route} - CORS preflight works")
        else:
            print(f"❌ {route} - CORS preflight failed with {response.status_code}")
            all_passed = False
    
    return all_passed


if __name__ == "__main__":
    print("=" * 60)
    print("FINAL VALIDATION - EXACT PROBLEM SCENARIO")
    print("=" * 60)
    
    success1 = test_exact_problem_scenario()
    success2 = test_multiple_preflight_scenarios()
    
    if success1 and success2:
        print("\n🎉 PROBLEM SOLVED!")
        print("✅ CORS preflight requests to /api/auth/login/email now work")
        print("✅ TenantMiddleware allows OPTIONS requests to pass through")
        print("✅ No 400 Bad Request errors for CORS preflight")
        print("✅ All requirements from the problem statement are met")
    else:
        print("\n❌ Problem not fully resolved")
        sys.exit(1)