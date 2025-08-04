#!/usr/bin/env python3
"""
Test to verify that basic tenant functionality still works after the OPTIONS fix
"""
import sys
sys.path.append('/home/runner/work/fastapiv1/fastapiv1')

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from app.core.tenant import TenantMiddleware, TenantContext


def test_tenant_middleware_still_works_for_non_options():
    """Test that tenant middleware still extracts org context from non-OPTIONS requests"""
    
    app = FastAPI()
    app.add_middleware(TenantMiddleware)
    
    @app.get("/test")
    def test_endpoint():
        org_id = TenantContext.get_organization_id()
        return {"organization_id": org_id}
    
    client = TestClient(app)
    
    # Test without organization header
    response = client.get("/test")
    assert response.status_code == 200
    data = response.json()
    assert data["organization_id"] is None
    print("✅ Request without org header works (returns None)")
    
    # Test with organization header
    response = client.get("/test", headers={"X-Organization-ID": "123"})
    assert response.status_code == 200
    data = response.json()
    assert data["organization_id"] == 123
    print("✅ Request with org header works (returns 123)")
    
    # Test with path-based org extraction  
    @app.get("/api/v1/org/{org_id}/data")
    def org_endpoint(org_id: int):
        context_org_id = TenantContext.get_organization_id()
        return {"path_org_id": org_id, "context_org_id": context_org_id}
    
    response = client.get("/api/v1/org/456/data")
    assert response.status_code == 200
    data = response.json()
    assert data["path_org_id"] == 456
    assert data["context_org_id"] == 456
    print("✅ Path-based org extraction works")


def test_context_clearing():
    """Test that context is properly cleared after requests"""
    
    app = FastAPI()
    app.add_middleware(TenantMiddleware)
    
    requests_processed = []
    
    @app.get("/test/{request_id}")
    def test_endpoint(request_id: str):
        org_id = TenantContext.get_organization_id()
        requests_processed.append({"request_id": request_id, "org_id": org_id})
        return {"organization_id": org_id, "request_id": request_id}
    
    client = TestClient(app)
    
    # First request with org header
    response = client.get("/test/req1", headers={"X-Organization-ID": "100"})
    assert response.status_code == 200
    
    # Second request without org header
    response = client.get("/test/req2")
    assert response.status_code == 200
    
    # Check that context was properly cleared
    assert len(requests_processed) == 2
    assert requests_processed[0]["org_id"] == 100  # First request had org
    assert requests_processed[1]["org_id"] is None  # Second request has clean context
    
    print("✅ Context clearing works correctly")


def test_options_bypass_confirmed():
    """Confirm that OPTIONS requests truly bypass tenant processing"""
    
    app = FastAPI()
    app.add_middleware(TenantMiddleware)
    
    options_processed = False
    
    # Override the _extract_organization_id to detect if it's called
    original_extract = TenantMiddleware._extract_organization_id
    
    def tracking_extract(self, request):
        nonlocal options_processed
        if request.method == "OPTIONS":
            options_processed = True
        return original_extract(self, request)
    
    TenantMiddleware._extract_organization_id = tracking_extract
    
    @app.get("/test")
    def test_endpoint():
        return {"message": "test"}
    
    client = TestClient(app)
    
    # Send OPTIONS request
    response = client.options("/test", headers={"X-Organization-ID": "999"})
    
    # Restore original method
    TenantMiddleware._extract_organization_id = original_extract
    
    # OPTIONS should not have triggered tenant processing
    assert not options_processed
    print("✅ OPTIONS requests confirmed to bypass tenant processing")


if __name__ == "__main__":
    print("=" * 60)
    print("TENANT FUNCTIONALITY REGRESSION TEST")
    print("=" * 60)
    
    test_tenant_middleware_still_works_for_non_options()
    test_context_clearing()  
    test_options_bypass_confirmed()
    
    print("\n🎉 All tenant functionality tests passed!")
    print("✅ Tenant middleware still works correctly for non-OPTIONS requests")
    print("✅ OPTIONS requests properly bypass tenant processing")
    print("✅ No regression in existing tenant functionality")