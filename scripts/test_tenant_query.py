"""
Script to test organization query under tenant context.
This simulates the app's tenant-aware query to verify if the organization is accessible.
Note: This assumes TenantContext sets search_path or filters; adjust if your implementation differs.
"""

import sys
import os
from dotenv import load_dotenv

# Load .env from project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(project_root, '.env'))

# Add the project root to sys.path
sys.path.append(project_root)

from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.base import Organization
from app.core.tenant import TenantContext  # Import TenantContext to simulate

def test_tenant_org_query(subdomain: str, org_id: int):
    # Simulate tenant context for the given subdomain
    tenant = TenantContext(subdomain=subdomain)  # Adjust based on actual TenantContext init
    with Session(engine) as db:
        with tenant:  # Assuming TenantContext is context manager that sets search_path
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                print(f"Under tenant '{subdomain}', Organization ID {org_id} found: Name={org.name}, Subdomain={org.subdomain}")
            else:
                print(f"Under tenant '{subdomain}', Organization ID {org_id} NOT found.")

if __name__ == "__main__":
    # Test with no subdomain (default/public)
    test_tenant_org_query(subdomain=None, org_id=1)
    
    # Test with correct subdomain
    test_tenant_org_query(subdomain="optismartecosol", org_id=1)
    
    # Test with wrong subdomain
    test_tenant_org_query(subdomain="wrongsubdomain", org_id=1)