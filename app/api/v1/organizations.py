# Revised: v1/app/api/v1/organizations.py

"""
Organization management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.tenant import require_organization, TenantContext
from app.models.base import Organization, User, Product, Customer, Vendor, Stock
from app.schemas.user import UserRole  # Corrected import from schemas.user
from app.schemas.base import (
    OrganizationCreate, OrganizationUpdate, OrganizationInDB,
    OrganizationLicenseCreate, OrganizationLicenseResponse,
    UserCreate, UserInDB
)
from app.api.v1.auth import get_current_user, get_current_active_user
from datetime import timedelta
import logging
import secrets
import string
import re
import requests
from datetime import datetime
from sqlalchemy.sql import func

from app.services.email_service import email_service  # Import for sending email

logger = logging.getLogger(__name__)
router = APIRouter(tags=["organizations"])

# Import pincode lookup logic from pincode module
from app.api.pincode import STATE_CODE_MAP

async def lookup_pincode_data(pin_code: str) -> Dict[str, str]:
    """
    Reusable pincode lookup function that uses the same logic as the pincode API
    """
    if not pin_code.isdigit() or len(pin_code) != 6:
        raise HTTPException(
            status_code=400,
            detail="Invalid PIN code format. PIN code must be 6 digits."
        )
    
    try:
        response = requests.get(f"https://api.postalpincode.in/pincode/{pin_code}")
        response.raise_for_status()
        data = response.json()
        
        if not data or data[0]['Status'] != "Success":
            raise HTTPException(
                status_code=404,
                detail=f"PIN code {pin_code} not found. Please enter city and state manually."
            )
        
        post_office = data[0]['PostOffice'][0]
        city = post_office['District']
        state = post_office['State']
        state_code = STATE_CODE_MAP.get(state, "00")
        
        return {
            "city": city,
            "state": state,
            "state_code": state_code
        }
    
    except requests.RequestException as e:
        logger.error(f"Error fetching PIN code data: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="PIN code lookup service is currently unavailable. Please try again later or enter details manually."
        )
    except Exception as e:
        logger.error(f"Unexpected error in PIN code lookup: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during PIN code lookup."
        )

@router.get("/pincode-lookup/{pin_code}")
async def lookup_pincode_for_license(pin_code: str) -> Dict[str, str]:
    """
    Lookup city, state, and state_code by PIN code for license creation form
    Uses the same logic as the Company Details module
    """
    return await lookup_pincode_data(pin_code)

@router.get("/app-statistics")
async def get_app_level_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get app-level statistics for super admins"""
    
    # Only super admins can access app-level statistics
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can access app-level statistics"
        )
    
    try:
        # Get total licenses issued (total organizations)
        total_licenses = db.query(Organization).count()
        
        # Get active organizations
        active_organizations = db.query(Organization).filter(
            Organization.status == "active"
        ).count()
        
        # Get trial organizations
        trial_organizations = db.query(Organization).filter(
            Organization.status == "trial"
        ).count()
        
        # Get total users across all organizations (excluding super admins)
        total_users = db.query(User).filter(
            User.organization_id.isnot(None),
            User.is_active == True
        ).count()
        
        # Get active app-level super admins
        super_admins = db.query(User).filter(
            User.is_super_admin == True,
            User.is_active == True
        ).count()
        
        # Get organization breakdown by plan type
        plan_breakdown = {}
        plan_types = db.query(Organization.plan_type).distinct().all()
        for plan_type_row in plan_types:
            plan_type = plan_type_row[0]
            count = db.query(Organization).filter(
                Organization.plan_type == plan_type
            ).count()
            plan_breakdown[plan_type] = count
        
        # Get monthly statistics (organizations created in last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_licenses_this_month = db.query(Organization).filter(
            Organization.created_at >= thirty_days_ago
        ).count()

        # Additional parameters
        # Total storage used (sum of all org storage, placeholder as 1GB per org max)
        total_storage_used_gb = total_licenses * 0.5  # Example, replace with real calculation if field exists
        
        # Average users per org
        average_users_per_org = round(total_users / total_licenses) if total_licenses > 0 else 0
        
        # Failed login attempts (assume from audit logs or user.failed_login_attempts sum)
        failed_login_attempts = db.query(func.sum(User.failed_login_attempts)).scalar() or 0
        
        # Recent new orgs (7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_new_orgs = db.query(Organization).filter(
            Organization.created_at >= seven_days_ago
        ).count()
        
        return {
            "total_licenses_issued": total_licenses,
            "active_organizations": active_organizations,
            "trial_organizations": trial_organizations,
            "total_active_users": total_users,
            "super_admins_count": super_admins,
            "new_licenses_this_month": new_licenses_this_month,
            "plan_breakdown": plan_breakdown,
            "system_health": {
                "status": "healthy",
                "uptime": "99.9%"  # This could be calculated from actual metrics
            },
            "generated_at": datetime.utcnow().isoformat(),
            "total_storage_used_gb": total_storage_used_gb,
            "average_users_per_org": average_users_per_org,
            "failed_login_attempts": failed_login_attempts,
            "recent_new_orgs": recent_new_orgs
        }
        
    except Exception as e:
        logger.error(f"Error fetching app statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch application statistics"
        )

@router.get("/org-statistics")
async def get_org_level_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get organization-level statistics for org admins/users"""
    
    # Require organization context
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization context required for statistics"
        )
    
    org_id = current_user.organization_id
    
    try:
        # Total products
        total_products = db.query(Product).filter(
            Product.organization_id == org_id
        ).count()
        
        # Total customers
        total_customers = db.query(Customer).filter(
            Customer.organization_id == org_id
        ).count()
        
        # Total vendors
        total_vendors = db.query(Vendor).filter(
            Vendor.organization_id == org_id
        ).count()
        
        # Active users
        active_users = db.query(User).filter(
            User.organization_id == org_id,
            User.is_active == True
        ).count()
        
        # Monthly sales (placeholder - assume from vouchers, use 0 for now)
        monthly_sales = 0  # Replace with real query, e.g., sum from sales vouchers last 30 days
        
        # Inventory value (sum quantity * unit_price from stock)
        inventory_value = db.query(func.sum(Stock.quantity * Product.unit_price)).join(
            Product, Stock.product_id == Product.id
        ).filter(
            Stock.organization_id == org_id
        ).scalar() or 0
        
        # Plan type from organization
        org = db.query(Organization).filter(Organization.id == org_id).first()
        plan_type = org.plan_type if org else 'unknown'
        
        # Storage used (placeholder - use 0.5 for demo)
        storage_used_gb = 0.5  # Replace with real calculation if field exists
        
        return {
            "total_products": total_products,
            "total_customers": total_customers,
            "total_vendors": total_vendors,
            "active_users": active_users,
            "monthly_sales": monthly_sales,
            "inventory_value": inventory_value,
            "plan_type": plan_type,
            "storage_used_gb": storage_used_gb,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching org statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch organization statistics"
        )

@router.post("/factory-default")
async def factory_default_system(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Factory Default - App Super Admin only (complete system reset)"""
    from app.core.permissions import PermissionChecker, Permission
    
    # Enhanced permission check using PermissionChecker
    if not PermissionChecker.can_factory_reset(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only app super administrators can perform factory default reset"
        )
    
    # Additional check using permission system
    PermissionChecker.require_permission(
        Permission.FACTORY_RESET,
        current_user,
        db
    )
    
    try:
        from app.services.reset_service import ResetService
        
        # Perform complete system reset - all organizations, users, data
        result = ResetService.factory_default_system(db)
        
        logger.warning(f"FACTORY DEFAULT: App super admin {current_user.email} performed complete system reset")
        
        return {
            "message": "System has been reset to factory defaults successfully",
            "warning": "All organizations, users, and data have been permanently deleted",
            "details": result.get("deleted", {}),
            "system_state": "restored_to_initial_configuration"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error performing factory default reset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform factory default reset. Please try again."
        )

@router.get("/{org_id}", response_model=OrganizationInDB)
async def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get organization by ID"""
    # Super admins can access any organization
    # Regular users can only access their own organization
    if not current_user.is_super_admin and current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return org

@router.put("/{org_id}", response_model=OrganizationInDB)
async def update_organization(
    org_id: int,
    org_update: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update organization"""
    # Super admins can update any organization
    # Org admins can only update their own organization
    if not current_user.is_super_admin:
        if current_user.organization_id != org_id or current_user.role not in [UserRole.ORG_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update this organization"
            )
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    try:
        # Update fields
        update_data = org_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(org, field, value)
        
        db.commit()
        db.refresh(org)
        
        logger.info(f"Updated organization {org.name} by user {current_user.email}")
        return org
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating organization"
        )

@router.delete("/{org_id}")
async def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete organization (Super admin only)"""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can delete organizations"
        )
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check if organization has users
    user_count = db.query(User).filter(User.organization_id == org_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete organization with existing users"
        )
    
    try:
        db.delete(org)
        db.commit()
        
        logger.info(f"Deleted organization {org.name} by user {current_user.email}")
        return {"message": "Organization deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting organization"
        )

@router.get("/{org_id}/users", response_model=List[UserInDB])
async def list_organization_users(
    org_id: int,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List users in organization"""
    # Check access permissions
    if not current_user.is_super_admin and current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    if not current_user.is_super_admin and current_user.role not in [UserRole.ORG_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to list users"
        )
    
    query = db.query(User).filter(User.organization_id == org_id)
    
    if active_only:
        query = query.filter(User.is_active == True)
    
    users = query.offset(skip).limit(limit).all()
    return users