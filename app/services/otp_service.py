# Revised: v1/app/services/otp_service.py

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple, Any, Dict, Union
from sqlalchemy.orm import Session
import logging

from app.services.email_service import email_service  # Import for sending email

logger = logging.getLogger(__name__)

class SimpleOTPService:
    """Simple in-memory OTP service for testing"""
    
    def __init__(self):
        # In-memory storage (should be Redis or database in production)
        self._otp_storage = {}
    
    def create_otp_verification(self, db: Session, email: str, purpose: str = "login", additional_data: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Create and send OTP for verification"""
        try:
            # Generate 6-digit OTP
            otp = ''.join(random.choices(string.digits, k=6))
            
            # Store OTP with expiration (5 minutes)
            expiry = datetime.utcnow() + timedelta(minutes=5)
            key = f"{email}:{purpose}"
            self._otp_storage[key] = {
                'otp': otp,
                'expiry': expiry,
                'attempts': 0,
                'data': additional_data or {}
            }
            
            # Send OTP email using email_service
            template = "factory_reset_otp.html" if purpose == "factory_reset" else "otp.html"  # Assume general otp.html exists
            if email_service.send_otp_email(email, otp, purpose, template=template):
                logger.info(f"OTP {otp} sent to {email} for {purpose}")
                return otp
            else:
                logger.error(f"Failed to send OTP to {email} for {purpose}")
                return None
            
        except Exception as e:
            logger.error(f"Failed to create OTP verification for {email}: {e}")
            return None
    
    def verify_otp(self, db: Session, email: str, otp: str, purpose: str = "login", return_data: bool = False) -> Union[bool, Tuple[bool, Dict[str, Any]]]:
        """Verify OTP"""
        try:
            key = f"{email}:{purpose}"
            stored_data = self._otp_storage.get(key)
            
            if not stored_data:
                logger.warning(f"No OTP found for {email} ({purpose})")
                return False if not return_data else (False, {})
            
            # Check expiry
            if datetime.utcnow() > stored_data['expiry']:
                logger.warning(f"OTP expired for {email} ({purpose})")
                del self._otp_storage[key]
                return False if not return_data else (False, {})
            
            # Check attempts (max 3)
            if stored_data['attempts'] >= 3:
                logger.warning(f"Too many OTP attempts for {email} ({purpose})")
                del self._otp_storage[key]
                return False if not return_data else (False, {})
            
            # Verify OTP
            if stored_data['otp'] == otp:
                # OTP is correct, remove from storage
                additional_data = stored_data['data']
                del self._otp_storage[key]
                logger.info(f"OTP verified successfully for {email} ({purpose})")
                return True if not return_data else (True, additional_data)
            else:
                # Increment attempts
                stored_data['attempts'] += 1
                logger.warning(f"Invalid OTP for {email} ({purpose}), attempt {stored_data['attempts']}")
                return False if not return_data else (False, {})
                
        except Exception as e:
            logger.error(f"Failed to verify OTP for {email}: {e}")
            return False if not return_data else (False, {})

# Global instance
otp_service = SimpleOTPService()