"""
Test suite for the enhancements mentioned in the problem statement:
1. Factory Reset Button (Organization Level)
2. User Management for Organization Superadmins  
3. Inventory Download Template Bug
4. User Profile Page Error
5. App Reset Button (Global, App Super Admin Only)
"""

import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestEnhancements:
    """Test class for all enhancement features"""
    
    def test_stock_template_download_endpoint(self):
        """Test that the stock template download endpoint works"""
        response = client.get("/api/v1/stock/template/excel")
        
        # Should return 200 OK with Excel content
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "attachment" in response.headers["content-disposition"]
        assert "stock_template.xlsx" in response.headers["content-disposition"]
        
        # Check that we actually get binary data (Excel file)
        assert len(response.content) > 1000  # Excel files are typically larger than 1KB
    
    def test_organization_reset_endpoints_exist(self):
        """Test that organization reset endpoints exist (requires authentication)"""
        
        # Test factory default endpoint existence
        response = client.post("/api/v1/organizations/factory-default")
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code == 401
        
        # Test reset data endpoint existence  
        response = client.post("/api/v1/organizations/reset-data")
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code == 401
    
    def test_user_login_endpoint_works(self):
        """Test that user login endpoint exists and works correctly"""
        response = client.post(
            "/api/v1/auth/login/email",
            json={"email": "test@example.com", "password": "invalid"}
        )
        
        # Should return 401 (unauthorized) for invalid credentials, not 404 (not found)
        assert response.status_code == 401
        assert "detail" in response.json()
    
    def test_organization_users_endpoint_exists(self):
        """Test that organization user management endpoint exists"""
        # This endpoint should require authentication
        response = client.get("/api/v1/organizations/1/users")
        
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code == 401
    
    def test_health_endpoint(self):
        """Test basic health endpoint to ensure API is functional"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_api_documentation_accessible(self):
        """Test that API documentation is accessible"""
        response = client.get("/docs")
        
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_cors_headers_present(self):
        """Test that CORS headers are properly configured"""
        response = client.options(
            "/api/v1/auth/login/email",
            headers={"Origin": "http://localhost:3000"}
        )
        
        # CORS preflight should work
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

if __name__ == "__main__":
    # Run the tests
    import subprocess
    import sys
    
    # Set PYTHONPATH and run pytest
    result = subprocess.run([
        sys.executable, "-m", "pytest", __file__, "-v", "--tb=short"
    ], env={"PYTHONPATH": "."}, cwd="/home/runner/work/fastapiv1/fastapiv1")
    
    sys.exit(result.returncode)