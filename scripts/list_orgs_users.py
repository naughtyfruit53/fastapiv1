"""
Script to list all organizations and users with their organization associations.
Run this to view current organizations and associated users for troubleshooting.
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

def list_orgs_and_users():
    with Session(engine) as db:
        # List all organizations
        organizations = db.query(Organization).all()
        print("\nOrganizations:")
        if not organizations:
            print("No organizations found.")
        for org in organizations:
            print(f"ID: {org.id}, Name: {org.name}, Subdomain: {org.subdomain}, Status: {org.status}")
        
        # List all users with organization_id
        users = db.query(User).all()
        print("\nUsers:")
        if not users:
            print("No users found.")
        for user in users:
            org_info = f"Organization ID: {user.organization_id}" if user.organization_id else "No organization (likely Super Admin)"
            print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}, {org_info}")

if __name__ == "__main__":
    list_orgs_and_users()