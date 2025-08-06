"""
Script to fix orphan users with invalid organization associations.
Run this script to clean up users referencing non-existent organizations.
"""

import sys
import os
from dotenv import load_dotenv

# Load .env from project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(project_root, '.env'))

# Add the project root to sys.path to allow importing from app
sys.path.append(project_root)

from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.base import User, Organization
from app.schemas.user import UserRole

def fix_orphan_users():
    with Session(engine) as db:
        # Find all users with organization_id set
        users_with_org = db.query(User).filter(User.organization_id.isnot(None)).all()
        
        fixed_count = 0
        for user in users_with_org:
            # Check if organization exists
            org = db.query(Organization).filter(Organization.id == user.organization_id).first()
            if not org:
                print(f"Found orphan user: {user.email} (ID: {user.id}) with invalid organization_id: {user.organization_id}")
                
                # Disassociate from invalid organization
                user.organization_id = None
                
                # If the user was ORG_ADMIN, downgrade to STANDARD_USER since no org
                if user.role == UserRole.ORG_ADMIN:
                    user.role = UserRole.STANDARD_USER
                    print(f"Downgraded role for {user.email} from ORG_ADMIN to STANDARD_USER")
                
                db.add(user)
                fixed_count += 1
        
        db.commit()
        print(f"\nFixed {fixed_count} orphan users.")
        if fixed_count == 0:
            print("No orphan users found.")

if __name__ == "__main__":
    fix_orphan_users()