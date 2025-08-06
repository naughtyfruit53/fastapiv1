# New: v1/app/services/org_reset_service.py

"""
Organization-level reset service for business data reset operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, Any
from app.models.base import (
    Company, Product, Customer, Vendor, 
    Stock, EmailNotification, PaymentTerm, OTPVerification
)
from app.core.audit import AuditLogger
import logging

logger = logging.getLogger(__name__)


class OrgResetService:
    """Service for organization-level reset operations"""
    
    @staticmethod
    def reset_organization_business_data(db: Session, organization_id: int) -> Dict[str, Any]:
        """
        Reset organization business data only (for Org Super Admin "Reset All Data")
        Removes business data but keeps users and organization settings
        
        Args:
            db: Database session
            organization_id: ID of the organization to reset
            
        Returns:
            dict: Result with message and deleted counts
        """
        try:
            result = {"message": "Organization business data reset completed", "deleted": {}}
            
            # Delete in reverse dependency order to avoid foreign key constraints
            
            # Delete email notifications for this organization
            deleted_notifications = db.query(EmailNotification).filter(
                EmailNotification.organization_id == organization_id
            ).delete()
            result["deleted"]["email_notifications"] = deleted_notifications
            
            # Delete stock entries for this organization
            deleted_stock = db.query(Stock).filter(
                Stock.organization_id == organization_id
            ).delete()
            result["deleted"]["stock"] = deleted_stock
            
            # Delete payment terms for this organization
            deleted_payment_terms = db.query(PaymentTerm).filter(
                PaymentTerm.organization_id == organization_id
            ).delete()
            result["deleted"]["payment_terms"] = deleted_payment_terms
            
            # Delete products for this organization
            deleted_products = db.query(Product).filter(
                Product.organization_id == organization_id
            ).delete()
            result["deleted"]["products"] = deleted_products
            
            # Delete customers for this organization
            deleted_customers = db.query(Customer).filter(
                Customer.organization_id == organization_id
            ).delete()
            result["deleted"]["customers"] = deleted_customers
            
            # Delete vendors for this organization
            deleted_vendors = db.query(Vendor).filter(
                Vendor.organization_id == organization_id
            ).delete()
            result["deleted"]["vendors"] = deleted_vendors
            
            # Delete companies for this organization
            deleted_companies = db.query(Company).filter(
                Company.organization_id == organization_id
            ).delete()
            result["deleted"]["companies"] = deleted_companies
            
            # Delete OTP verifications for this organization
            deleted_otps = db.query(OTPVerification).filter(
                OTPVerification.organization_id == organization_id
            ).delete()
            result["deleted"]["otp_verifications"] = deleted_otps
            
            # NOTE: We keep users and organization settings intact
            
            db.commit()
            logger.info(f"Business data reset completed for organization {organization_id}")
            
            return result
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during business data reset for organization {organization_id}: {str(e)}")
            raise e