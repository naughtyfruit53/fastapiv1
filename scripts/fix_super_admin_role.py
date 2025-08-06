# New: v1/scripts/fix_super_admin_role.py

"""
Script to fix super admin role in database
Run this script directly: python v1/scripts/fix_super_admin_role.py
Requires .env file in project root with DB_URL=your_connection_string
"""

import os
import logging
from dotenv import load_dotenv  # Requires pip install python-dotenv if not installed
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load .env file from project root (adjust path if needed)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')  # Assumes scripts/ is under v1/
load_dotenv(dotenv_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL from .env
DB_URL = os.getenv('DB_URL')
if not DB_URL:
    logger.error(".env file not found or DB_URL not set. Create .env with DB_URL=postgresql://user:pass@localhost/dbname")
    exit(1)

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fix_super_admin_role():
    db = SessionLocal()
    try:
        # Check if users table exists
        try:
            db.execute(text("SELECT 1 FROM users LIMIT 1"))
            logger.info("Users table exists.")
        except Exception as e:
            if "relation \"users\" does not exist" in str(e) or "no such table" in str(e):  # Handles PostgreSQL and SQLite
                logger.error("Users table does not exist. Run 'alembic upgrade head' from project root to create tables.")
                return
            raise e
        
        # Update role and is_super_admin for the super admin email
        super_admin_email = "naughtyfruit53@gmail.com"
        
        # Check current values
        current = db.execute(text("SELECT role, is_super_admin FROM users WHERE email = :email"), 
                             {"email": super_admin_email}).fetchone()
        if current:
            logger.info(f"Current role: {current[0]}, is_super_admin: {current[1]}")
        else:
            logger.warning(f"No user found with email {super_admin_email}")
            return
        
        # Update to correct values (use true/1 based on DB type; PostgreSQL prefers true)
        db.execute(
            text("UPDATE users SET role = 'super_admin', is_super_admin = true WHERE email = :email"),
            {"email": super_admin_email}
        )
        db.commit()
        
        # Verify update
        updated = db.execute(text("SELECT role, is_super_admin FROM users WHERE email = :email"), 
                             {"email": super_admin_email}).fetchone()
        logger.info(f"Updated role: {updated[0]}, is_super_admin: {updated[1]}")
        
        logger.info("Super admin role fixed successfully. Restart your app and relogin.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to fix super admin role: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_super_admin_role()