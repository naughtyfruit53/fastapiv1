#!/usr/bin/env python3
"""
End-to-end test of the actual FastAPI application with CORS OPTIONS
"""
import sys
import os
sys.path.append('/home/runner/work/fastapiv1/fastapiv1')

from fastapi.testclient import TestClient


def test_main_app_cors_options():
    """Test CORS OPTIONS on the actual main app"""
    
    # Import the actual app
    from app.main import app
    
    client = TestClient(app)
    
    # Test endpoints that should exist
    test_endpoints = [
        "/api/auth/login/email",  # This is from the problem statement
        "/api/users",
        "/api/companies", 
        "/health",
        "/",
    ]
    
    for endpoint in test_endpoints:
        print(f"Testing OPTIONS request to {endpoint}...")
        
        response = client.options(endpoint, headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization"
        })
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
            headers = response.headers
            print(f"  CORS Headers present: {bool('access-control-allow-origin' in headers)}")
        else:
            print(f"  ❌ FAILED - Status: {response.status_code}")
            print(f"  Response: {response.text}")
        
        print("-" * 40)


if __name__ == "__main__":
    print("Testing CORS OPTIONS on the actual FastAPI application...")
    print("=" * 60)
    test_main_app_cors_options()
    print("Test completed!")