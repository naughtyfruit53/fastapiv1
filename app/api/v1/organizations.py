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
from app.models.base import Organization, User
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

@router.post("/license/create", response_model=OrganizationLicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_organization_license(
    license_data: OrganizationLicenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create organization license with auto-generated details (Super admin only)"""
    # Only super admins can create organization licenses
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can create organization licenses"
        )
    
    try:
        # Auto-populate city, state, and state_code from pincode if provided
        city = license_data.city
        state = license_data.state
        state_code = license_data.state_code
        
        if license_data.pin_code and not (city and state):
            try:
                pincode_data = await lookup_pincode_data(license_data.pin_code)
                city = city or pincode_data["city"]
                state = state or pincode_data["state"] 
                state_code = state_code or pincode_data["state_code"]
                logger.info(f"Auto-populated from pincode {license_data.pin_code}: city={city}, state={state}, state_code={state_code}")
            except HTTPException as e:
                # If pincode lookup fails, continue without auto-population
                logger.warning(f"Pincode lookup failed for {license_data.pin_code}: {e.detail}")
                pass
        
        # Generate subdomain from organization name
        subdomain_base = re.sub(r'[^a-zA-Z0-9]', '', license_data.organization_name.lower())
        subdomain_base = subdomain_base[:15] if len(subdomain_base) > 15 else subdomain_base
        
        # Ensure subdomain is unique
        counter = 0
        subdomain = subdomain_base
        while db.query(Organization).filter(Organization.subdomain == subdomain).first():
            counter += 1
            subdomain = f"{subdomain_base}{counter}"
        
        # Use provided admin password if available, otherwise generate temporary password
        if license_data.admin_password:
            admin_password = license_data.admin_password
            must_change_password = False
        else:
            alphabet = string.ascii_letters + string.digits
            admin_password = ''.join(secrets.choice(alphabet) for _ in range(12))
            must_change_password = True
        
        # Check if organization name already exists
        existing_org = db.query(Organization).filter(
            Organization.name == license_data.organization_name
        ).first()
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization name already exists"
            )
        
        # Check if superadmin email already exists
        existing_user = db.query(User).filter(
            User.email == license_data.superadmin_email
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists in the system"
            )
        
        # Create organization with enhanced details
        org = Organization(
            name=license_data.organization_name,
            subdomain=subdomain,
            business_type="Other",
            primary_email=license_data.superadmin_email,
            primary_phone=license_data.primary_phone or "+91-0000000000",  # Placeholder if not provided
            address1=license_data.address or "To be updated",  # Placeholder if not provided
            city=city or "To be updated",  # Use auto-populated or provided value
            state=state or "To be updated",  # Use auto-populated or provided value
            pin_code=license_data.pin_code or "000000",  # Use provided or placeholder
            gst_number=license_data.gst_number,  # Optional as per requirements
            status="trial",
            plan_type="trial",
            max_users=5,
            storage_limit_gb=1,
            features={}
        )
        
        db.add(org)
        db.flush()  # Get the organization ID
        
        # Create superadmin user
        admin_user = User(
            organization_id=org.id,
            email=license_data.superadmin_email,
            username=license_data.superadmin_email.split("@")[0],
            hashed_password=get_password_hash(admin_password),
            full_name="Administrator",
            role=UserRole.ORG_ADMIN,
            is_active=True,
            must_change_password=must_change_password  # Force password change on first login if auto-generated
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(org)
        
        # Attempt to send confirmation email with login details, but continue even if it fails
        success, error = email_service.send_password_reset_email(
            license_data.superadmin_email,
            "Administrator",
            admin_password,
            current_user.full_name or current_user.email,
            license_data.organization_name
        )
        if not success:
            logger.warning(f"Failed to send organization creation email: {error}")
        
        logger.info(f"Created organization license {org.name} with admin {admin_user.email}")
        
        return OrganizationLicenseResponse(
            message="Organization license created successfully",
            organization_id=org.id,
            organization_name=org.name,
            superadmin_email=license_data.superadmin_email,
            subdomain=subdomain,
            temp_password=admin_password
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating organization license: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating organization license"
        )

@router.post("/", response_model=OrganizationInDB, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new organization (Super admin only)"""
    # Only super admins can create organizations
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can create organizations"
        )
    
    # Check if subdomain already exists
    existing_org = db.query(Organization).filter(
        Organization.subdomain == org_data.subdomain.lower()
    ).first()
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain already exists"
        )
    
    # Check if organization name already exists
    existing_name = db.query(Organization).filter(
        Organization.name == org_data.name
    ).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization name already exists"
        )
    
    try:
        # Create organization
        org = Organization(
            name=org_data.name,
            subdomain=org_data.subdomain.lower(),
            business_type=org_data.business_type,
            industry=org_data.industry,
            website=org_data.website,
            description=org_data.description,
            primary_email=org_data.primary_email,
            primary_phone=org_data.primary_phone,
            address1=org_data.address1,
            address2=org_data.address2,
            city=org_data.city,
            state=org_data.state,
            pin_code=org_data.pin_code,
            country=org_data.country,
            gst_number=org_data.gst_number,
            pan_number=org_data.pan_number,
            cin_number=org_data.cin_number,
            status="trial",
            plan_type="trial",
            max_users=5,
            storage_limit_gb=1,
            features={}
        )
        
        db.add(org)
        db.flush()  # Get the organization ID
        
        # Create organization admin user
        admin_user = User(
            organization_id=org.id,
            email=org_data.admin_email,
            username=org_data.admin_email.split("@")[0],
            hashed_password=get_password_hash(org_data.admin_password),
            full_name=org_data.admin_full_name,
            role=UserRole.ORG_ADMIN,
            is_active=True,
            must_change_password=False
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(org)
        
        logger.info(f"Created organization {org.name} with admin {admin_user.email}")
        return org
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating organization"
        )

@router.get("/", response_model=List[OrganizationInDB])
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List organizations (Super admin only)"""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can list all organizations"
        )
    
    query = db.query(Organization)
    
    if status_filter:
        query = query.filter(Organization.status == status_filter)
    
    organizations = query.offset(skip).limit(limit).all()
    return organizations

@router.get("/current", response_model=OrganizationInDB)
async def get_current_organization(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's organization"""
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return org

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

@router.get("/subdomain/{subdomain}", response_model=OrganizationInDB)
async def get_organization_by_subdomain(
    subdomain: str,
    db: Session = Depends(get_db)
):
    """Get organization by subdomain (public endpoint for tenant identification)"""
    org = db.query(Organization).filter(
        Organization.subdomain == subdomain.lower(),
        Organization.status == "active"
    ).first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return org

@router.post("/reset-data")
async def reset_organization_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reset All Data - Organization Super Admin only (removes business data, keeps users and org settings)"""
    from app.services.reset_service import ResetService
    from app.core.permissions import PermissionChecker, Permission
    
    try:
        logger.info(f"Reset request by user: {current_user.email}, role: {current_user.role}, org_id: {current_user.organization_id}")
        # Enhanced permission check - only organization admins, NOT app super admins
        if current_user.role not in [UserRole.ORG_ADMIN]:
            logger.warning(f"Unauthorized reset attempt by user {current_user.email} with role {current_user.role}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization super administrators can reset organization data"
            )
        
        # App Super Admins should NOT be able to use this endpoint (they use factory-default instead)
        if getattr(current_user, 'is_super_admin', False) or current_user.role == UserRole.SUPER_ADMIN:
            logger.warning(f"App super admin {current_user.email} attempted to use org reset endpoint")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="App super administrators should use factory-default endpoint instead"
            )
        
        # Check permission using permission system if available
        try:
            PermissionChecker.require_permission(
                Permission.RESET_ORG_DATA,
                current_user,
                db
            )
        except Exception as perm_error:
            logger.info(f"Permission check failed (may be expected): {perm_error}")
            # Continue - permission system might not be fully implemented
        
        if not current_user.organization_id:
            logger.error(f"User {current_user.email} has no organization_id")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not associated with any organization"
            )
        
        logger.info(f"Querying for organization id {current_user.organization_id}")
        org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if not org:
            logger.error(f"Organization {current_user.organization_id} not found for user {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Reset organization business data only (keep users and org settings)
        try:
            result = ResetService.reset_organization_business_data(db, current_user.organization_id)
            logger.info(f"Org admin {current_user.email} reset business data for organization {org.name}")
            
            return {
                "message": f"All business data has been reset for organization: {org.name}",
                "organization_name": org.name,
                "details": result.get("deleted", {}),
                "note": "Users and organization settings have been preserved"
            }
        except ValueError as ve:
            logger.error(f"Validation error during reset: {ve}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(ve)
            )
        except Exception as reset_error:
            logger.error(f"Reset service error: {reset_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset organization data. Please try again."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error resetting organization data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset organization data. Please try again."
        )

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
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching app statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch application statistics"
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