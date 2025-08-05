from fastapi import APIRouter, HTTPException
from typing import Dict
import requests
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Mapping of Indian state names to GST state codes
STATE_CODE_MAP = {
    "Andaman & Nicobar Islands": "35",
    "Andhra Pradesh": "37",
    "Arunachal Pradesh": "12",
    "Assam": "18",
    "Bihar": "10",
    "Chandigarh": "04",
    "Chhattisgarh": "22",
    "Dadra & Nagar Haveli & Daman & Diu": "26",
    "Delhi": "07",
    "Goa": "30",
    "Gujarat": "24",
    "Haryana": "06",
    "Himachal Pradesh": "02",
    "Jammu & Kashmir": "01",
    "Jharkhand": "20",
    "Karnataka": "29",
    "Kerala": "32",
    "Ladakh": "38",
    "Lakshadweep": "31",
    "Madhya Pradesh": "23",
    "Maharashtra": "27",
    "Manipur": "14",
    "Meghalaya": "17",
    "Mizoram": "15",
    "Nagaland": "13",
    "Odisha": "21",
    "Puducherry": "34",
    "Punjab": "03",
    "Rajasthan": "08",
    "Sikkim": "11",
    "Tamil Nadu": "33",
    "Telangana": "36",
    "Tripura": "16",
    "Uttar Pradesh": "09",
    "Uttarakhand": "05",
    "West Bengal": "19",
    "Other Territory": "97",
    "Other Country": "99"
}

@router.get("/lookup/{pin_code}")
async def lookup_pincode(pin_code: str) -> Dict[str, str]:
    """
    Lookup city, state, and state_code by PIN code using external API
    """
    # Validate pin code format
    if not pin_code.isdigit() or len(pin_code) != 6:
        raise HTTPException(
            status_code=400,
            detail="Invalid PIN code format. PIN code must be 6 digits."
        )
    
    try:
        # Fetch from external API
        response = requests.get(f"https://api.postalpincode.in/pincode/{pin_code}")
        response.raise_for_status()  # Raise error for bad status codes
        data = response.json()
        
        if not data or data[0]['Status'] != "Success":
            raise HTTPException(
                status_code=404,
                detail=f"PIN code {pin_code} not found. Please enter city and state manually."
            )
        
        # Extract from first PostOffice entry
        post_office = data[0]['PostOffice'][0]
        city = post_office['District']
        state = post_office['State']
        state_code = STATE_CODE_MAP.get(state, "00")  # Default to "00" if not found
        
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