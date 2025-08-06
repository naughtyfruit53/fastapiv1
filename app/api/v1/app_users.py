"""
App User Management API endpoints
For managing app-level users (superadmins and admins)
Only accessible to superadmins with App User Management permission
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.base import User
from app.schemas.user import UserRole, UserCreate, UserUpdate, UserInDB
from app.api.v1.auth import get_current_user
from app.services.user_service import UserService
from app.core.security import get_password_hash, is_super_admin_email
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["app-user-management"])

# God account email - the only account that cannot be deleted
GOD_ACCOUNT_EMAIL = "naughtyfruit53@gmail.com"

def require_app_user_management_permission(current_user: User = Depends(get_current_user)):
    """Require App User Management permission - only superadmins with this permission"""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only app super administrators can access user management"
        )
    
    # Additional check: only god account can manage app users for now
    # This can be extended with more granular permissions later
    if current_user.email != GOD_ACCOUNT_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="App User Management access is restricted to the primary super admin"
        )
    
    return current_user

@router.get("/", response_model=List[UserInDB])
async def list_app_users(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """List all app-level users (superadmins and admins)"""
    try:
        query = db.query(User).filter(
            User.organization_id.is_(None),  # App-level users have no organization
            User.is_super_admin == True
        )
        
        if active_only:
            query = query.filter(User.is_active == True)
        
        users = query.offset(skip).limit(limit).all()
        return users
        
    except Exception as e:
        logger.error(f"Error listing app users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list app users"
        )

@router.post("/", response_model=UserInDB, status_code=status.HTTP_201_CREATED)
async def create_app_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """Create a new app-level user (superadmin or admin)"""
    try:
        # Validate role - only allow super_admin for app-level users
        if user_data.role not in [UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="App-level users must have super_admin role"
            )
        
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists in the system"
            )
        
        # Set app-level user properties
        user_data.organization_id = None  # App-level users have no organization
        user_data.role = UserRole.SUPER_ADMIN
        
        # Auto-generate username from email if not provided
        if not user_data.username:
            user_data.username = user_data.email.split("@")[0]
        
        # Create the user
        db_user = User(
            organization_id=None,
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role=UserRole.SUPER_ADMIN,
            department=user_data.department,
            designation=user_data.designation,
            employee_id=user_data.employee_id,
            phone=user_data.phone,
            is_active=True,
            is_super_admin=True,
            must_change_password=True  # Force password change on first login
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"Created app user {db_user.email} by {current_user.email}")
        return db_user
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating app user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create app user"
        )

@router.get("/{user_id}", response_model=UserInDB)
async def get_app_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """Get app user by ID"""
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id.is_(None),
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App user not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserInDB)
async def update_app_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """Update app user"""
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id.is_(None),
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App user not found"
        )
    
    # Prevent modification of god account's critical properties
    if user.email == GOD_ACCOUNT_EMAIL:
        # Allow only certain fields to be updated for god account
        allowed_fields = {'full_name', 'phone', 'department', 'designation'}
        update_data = user_update.dict(exclude_unset=True)
        restricted_fields = set(update_data.keys()) - allowed_fields
        if restricted_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot modify {', '.join(restricted_fields)} for the primary super admin account"
            )
    
    try:
        update_data = user_update.dict(exclude_unset=True)
        
        # Auto-update username if email changes and username is not explicitly provided
        if 'email' in update_data and 'username' not in update_data:
            update_data['username'] = update_data['email'].split("@")[0]
        
        # Ensure role remains super_admin for app users
        if 'role' in update_data and update_data['role'] != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="App-level users must maintain super_admin role"
            )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Updated app user {user.email} by {current_user.email}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating app user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update app user"
        )

@router.delete("/{user_id}")
async def delete_app_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """Delete app user"""
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id.is_(None),
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App user not found"
        )
    
    # Prevent deletion of god account
    if user.email == GOD_ACCOUNT_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The primary super admin account cannot be deleted"
        )
    
    # Prevent users from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete your own account"
        )
    
    try:
        db.delete(user)
        db.commit()
        
        logger.info(f"Deleted app user {user.email} by {current_user.email}")
        return {"message": f"App user {user.email} deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting app user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete app user"
        )

@router.post("/{user_id}/reset-password")
async def reset_app_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission),
    request: Request = None
):
    """Reset password for an app user"""
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id.is_(None),
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App user not found"
        )
    
    try:
        result = UserService.reset_user_password(
            db=db,
            admin_user=current_user,
            target_email=user.email,
            request=request
        )
        
        logger.info(f"Reset password for app user {user.email} by {current_user.email}")
        return result
        
    except Exception as e:
        logger.error(f"Error resetting app user password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/{user_id}/toggle-status")
async def toggle_app_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_app_user_management_permission)
):
    """Toggle active/inactive status for an app user"""
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id.is_(None),
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App user not found"
        )
    
    # Prevent deactivation of god account
    if user.email == GOD_ACCOUNT_EMAIL and user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The primary super admin account cannot be deactivated"
        )
    
    # Prevent users from deactivating themselves
    if user.id == current_user.id and user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot deactivate your own account"
        )
    
    try:
        user.is_active = not user.is_active
        db.commit()
        db.refresh(user)
        
        status_text = "activated" if user.is_active else "deactivated"
        logger.info(f"{status_text.capitalize()} app user {user.email} by {current_user.email}")
        
        return {
            "message": f"App user {user.email} {status_text} successfully",
            "is_active": user.is_active
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling app user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle user status"
        )