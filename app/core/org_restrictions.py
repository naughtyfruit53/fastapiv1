# app/core/org_restrictions.py

"""
Organization data access restrictions for app-level super admins
"""

from fastapi import HTTPException, status
from app.models.base import User
from app.schemas.user import UserRole
import logging

logger = logging.getLogger(__name__)


def require_organization_access(current_user: User) -> None:
    """
    Ensure that app super admins cannot access organization-specific data.
    App super admins should only have access to app-level features like license management.
    
    Args:
        current_user: The current authenticated user
        
    Raises:
        HTTPException: If user is an app super admin trying to access org data
    """
    if getattr(current_user, 'is_super_admin', False) and current_user.organization_id is None:
        logger.warning(f"App super admin {current_user.email} attempted to access organization data")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="App super administrators cannot access organization-specific data. Use license management features instead."
        )


def ensure_organization_context(current_user: User) -> int:
    """
    Ensure user has an organization context and is not an app super admin.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        int: The organization ID
        
    Raises:
        HTTPException: If user doesn't have organization context or is app super admin
    """
    require_organization_access(current_user)
    
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any organization"
        )
    
    return current_user.organization_id


def can_access_organization_data(user: User) -> bool:
    """
    Check if user can access organization-specific business data.
    
    Args:
        user: User to check
        
    Returns:
        bool: True if user can access organization data, False otherwise
    """
    # App super admins (no organization_id) cannot access organization data
    if getattr(user, 'is_super_admin', False) and user.organization_id is None:
        return False
    
    # Organization users can access their organization's data
    return user.organization_id is not None