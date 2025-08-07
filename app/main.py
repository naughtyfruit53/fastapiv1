from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.core.config import settings as config_settings
from app.core.database import create_tables, SessionLocal
from app.core.tenant import TenantMiddleware
from app.core.seed_super_admin import seed_super_admin
from app.api import users, companies, vendors, customers, products, reports, platform, settings, pincode
from app.api.v1 import stock as v1_stock
from app.api.vouchers import router as vouchers_router
from app.api.routes import admin
import logging

# Configure logging at the top
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import enhanced v1 routers
from app.api.v1 import auth as v1_auth, admin as v1_admin, reset as v1_reset, app_users as v1_app_users
# Updated import for organizations in v1
try:
    from app.api.v1.organizations import router as organizations_router
    logger.info("Successfully imported organizations_router")
except Exception as import_error:
    logger.error(f"Failed to import organizations_router: {str(import_error)}")
    raise

# Create FastAPI app
app = FastAPI(
    title=config_settings.PROJECT_NAME,
    version=config_settings.VERSION,
    description=config_settings.DESCRIPTION,
    openapi_url=f"{config_settings.API_V1_STR}/openapi.json"
)

# Add tenant middleware for multi-tenancy
app.add_middleware(TenantMiddleware)

# Set up CORS for frontend integration
# IMPORTANT: This middleware must be added AFTER other route-specific middleware
# to ensure proper handling of preflight OPTIONS requests
logger.info(f"Configuring CORS with allowed origins: {config_settings.BACKEND_CORS_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config_settings.BACKEND_CORS_ORIGINS,  # Frontend URLs[](http://localhost:3000)
    allow_credentials=True,                               # Required for authentication cookies/headers
    allow_methods=["*"],                                  # Allow all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],                                  # Allow all headers (Content-Type, Authorization, etc.)
)

# Debug CORS configuration on startup
@app.on_event("startup")
async def log_cors_config():
    """Log CORS configuration for debugging"""
    logger.info("=" * 50)
    logger.info("CORS Configuration:")
    logger.info(f"  Allowed Origins: {config_settings.BACKEND_CORS_ORIGINS}")
    logger.info(f"  Allow Credentials: True")
    logger.info(f"  Allow Methods: ['*'] (all)")
    logger.info(f"  Allow Headers: ['*'] (all)")
    logger.info("=" * 50)

# ------------------------------------------------------------------------------
# ENHANCED V1 API ROUTERS
# ------------------------------------------------------------------------------
# Authentication endpoints are available at:
# - POST /api/auth/login (form-data authentication)
# - POST /api/auth/login/email (JSON authentication with email/password)
# 
# FRONTEND USAGE EXAMPLE:
# fetch('http://localhost:8000/api/auth/login/email', {
#   method: 'POST',
#   headers: { 'Content-Type': 'application/json' },
#   body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
# })
app.include_router(
    v1_auth.router, 
    prefix=f"{config_settings.API_V1_STR}/auth", 
    tags=["authentication-v1"]
)
app.include_router(
    v1_admin.router, 
    prefix=f"{config_settings.API_V1_STR}/admin", 
    tags=["admin-v1"]
)
app.include_router(
    v1_reset.router, 
    prefix=f"{config_settings.API_V1_STR}/reset", 
    tags=["reset-v1"]
)
app.include_router(
    v1_app_users.router,
    prefix=f"{config_settings.API_V1_STR}/app-users",
    tags=["app-user-management"]
)

# ------------------------------------------------------------------------------
# LEGACY API ROUTERS (business modules)
# ------------------------------------------------------------------------------
app.include_router(platform.router, prefix=f"{config_settings.API_V1_STR}/platform", tags=["platform"])
try:
    app.include_router(organizations_router, prefix="/api/v1/organizations", tags=["organizations"])
    logger.info("Organizations router included successfully at prefix: /api/v1/organizations")
except Exception as e:
    logger.error(f"Error including organizations router: {str(e)}")

app.include_router(users.router, prefix=f"{config_settings.API_V1_STR}/users", tags=["users"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin-legacy"])
app.include_router(companies.router, prefix=f"{config_settings.API_V1_STR}/companies", tags=["companies"])
app.include_router(vendors.router, prefix=f"{config_settings.API_V1_STR}/vendors", tags=["vendors"])
app.include_router(customers.router, prefix=f"{config_settings.API_V1_STR}/customers", tags=["customers"])
app.include_router(products.router, prefix=f"{config_settings.API_V1_STR}/products", tags=["products"])
app.include_router(v1_stock.router, prefix="/api/v1/stock", tags=["stock"])  # Updated to use v1 stock module
app.include_router(vouchers_router, prefix=f"{config_settings.API_V1_STR}/vouchers", tags=["vouchers"])
app.include_router(reports.router, prefix=f"{config_settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(settings.router, prefix=f"{config_settings.API_V1_STR}/settings", tags=["settings"])
app.include_router(pincode.router, prefix=f"{config_settings.API_V1_STR}/pincode", tags=["pincode"])

@app.on_event("startup")
async def startup_event():
    """Initialize application: log CORS config, setup database, and seed super admin"""
    # Log CORS configuration for debugging
    logger.info("=" * 50)
    logger.info("CORS Configuration:")
    logger.info(f"  Allowed Origins: {config_settings.BACKEND_CORS_ORIGINS}")
    logger.info(f"  Allow Credentials: True")
    logger.info(f"  Allow Methods: ['*'] (all)")
    logger.info(f"  Allow Headers: ['*'] (all)")
    logger.info("=" * 50)
    
    # Initialize database and create tables
    logger.info("Starting up TRITIQ ERP API...")
    try:
        create_tables()
        logger.info("Database tables created successfully")
        # Check if database schema is updated and seed super admin if possible
        from app.core.seed_super_admin import check_database_schema_updated
        db = SessionLocal()
        try:
            if check_database_schema_updated(db):
                seed_super_admin(db)
                logger.info("Super admin seeding completed")
            else:
                logger.warning("Database schema is not updated. Run 'alembic upgrade head' to enable super admin seeding.")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down TRITIQ ERP API...")

@app.get("/")
async def root():
    return {
        "message": "Welcome to TRITIQ ERP API",
        "version": config_settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": config_settings.VERSION}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("app/static/favicon.ico")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=config_settings.DEBUG
    )