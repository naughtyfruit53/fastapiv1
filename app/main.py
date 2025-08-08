from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
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
# Added missing v1 imports
from app.api.v1 import admin_setup as v1_admin_setup, login as v1_login, master_auth as v1_master_auth, otp as v1_otp, password as v1_password, user as v1_user
# Updated import for organizations in v1
try:
    from app.api.v1.organizations import router as organizations_router
    logger.info("Successfully imported organizations_router")
except Exception as import_error:
    logger.error(f"Failed to import organizations_router: {str(import_error)}")
    raise

# Add try/except for failing routers to log import errors
try:
    from app.api import companies
    logger.info("Successfully imported companies_router")
except Exception as import_error:
    logger.error(f"Failed to import companies_router: {str(import_error)}")
    raise

try:
    from app.api import products
    logger.info("Successfully imported products_router")
except Exception as import_error:
    logger.error(f"Failed to import products_router: {str(import_error)}")
    raise

try:
    from app.api.v1 import stock as v1_stock
    logger.info("Successfully imported stock_router")
except Exception as import_error:
    logger.error(f"Failed to import stock_router: {str(import_error)}")
    raise

# Create FastAPI app
app = FastAPI(
    title=config_settings.PROJECT_NAME,
    version=config_settings.VERSION,
    description=config_settings.DESCRIPTION,
    openapi_url="/api/v1/openapi.json"
)

app.router.redirect_slashes = False

# Temporarily disable TenantMiddleware to test if it's causing the 404 (re-enable after testing)
# app.add_middleware(TenantMiddleware)

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
    prefix="/api/v1/auth", 
    tags=["authentication-v1"]
)
logger.info("Auth router included successfully at prefix: /api/v1/auth")
app.include_router(
    v1_admin.router, 
    prefix="/api/v1/admin", 
    tags=["admin-v1"]
)
logger.info("Admin router included successfully at prefix: /api/v1/admin")
app.include_router(
    v1_reset.router, 
    prefix="/api/v1/reset", 
    tags=["reset-v1"]
)
logger.info("Reset router included successfully at prefix: /api/v1/reset")
app.include_router(
    v1_app_users.router,
    prefix="/api/v1/app-users",
    tags=["app-user-management"]
)
logger.info("App users router included successfully at prefix: /api/v1/app-users")

# Added includes for missing v1 routers with consistent /api/v1 prefixes
app.include_router(
    v1_admin_setup.router,
    prefix="/api/v1/admin-setup",
    tags=["admin-setup-v1"]
)
logger.info("Admin setup router included successfully at prefix: /api/v1/admin-setup")
app.include_router(
    v1_login.router,
    prefix="/api/v1/login",
    tags=["login-v1"]
)
logger.info("Login router included successfully at prefix: /api/v1/login")
app.include_router(
    v1_master_auth.router,
    prefix="/api/v1/master-auth",
    tags=["master-auth-v1"]
)
logger.info("Master auth router included successfully at prefix: /api/v1/master-auth")
app.include_router(
    v1_otp.router,
    prefix="/api/v1/otp",
    tags=["otp-v1"]
)
logger.info("OTP router included successfully at prefix: /api/v1/otp")
app.include_router(
    v1_password.router,
    prefix="/api/v1/password",
    tags=["password-v1"]
)
logger.info("Password router included successfully at prefix: /api/v1/password")
app.include_router(
    v1_user.router,
    prefix="/api/v1/user",
    tags=["v1-user"]
)
logger.info("User router included successfully at prefix: /api/v1/user")

# ------------------------------------------------------------------------------
# LEGACY API ROUTERS (business modules)
# ------------------------------------------------------------------------------
app.include_router(platform.router, prefix="/api/v1/platform", tags=["platform"])
logger.info("Platform router included successfully at prefix: /api/v1/platform")
try:
    app.include_router(organizations_router, prefix="/api/v1/organizations", tags=["organizations"])
    logger.info("Organizations router included successfully at prefix: /api/v1/organizations")
except Exception as e:
    logger.error(f"Error including organizations router: {str(e)}")

app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
logger.info("Users router included successfully at prefix: /api/v1/users")
app.include_router(admin.router, prefix="/api/admin", tags=["admin-legacy"])
logger.info("Admin legacy router included successfully at prefix: /api/admin")
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
logger.info("Companies router included successfully at prefix: /api/v1/companies")
app.include_router(vendors.router, prefix="/api/v1/vendors", tags=["vendors"])
logger.info("Vendors router included successfully at prefix: /api/v1/vendors")
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
logger.info("Customers router included successfully at prefix: /api/v1/customers")
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
logger.info("Products router included successfully at prefix: /api/v1/products")
app.include_router(v1_stock.router, prefix="/api/v1/stock", tags=["stock"])  # Updated to use v1 stock module
logger.info("Stock router included successfully at prefix: /api/v1/stock")
app.include_router(vouchers_router, prefix="/api/v1/vouchers", tags=["vouchers"])
logger.info("Vouchers router included successfully at prefix: /api/v1/vouchers")
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
logger.info("Reports router included successfully at prefix: /api/v1/reports")
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])
logger.info("Settings router included successfully at prefix: /api/v1/settings")
app.include_router(pincode.router, prefix="/api/v1/pincode", tags=["pincode"])
logger.info("Pincode router included successfully at prefix: /api/v1/pincode")

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

    # Log all registered routes for debugging the 404 issue
    logger.info("=" * 50)
    logger.info("Registered Routes (for debugging):")
    for route in app.routes:
        if isinstance(route, APIRoute):
            methods = ', '.join(sorted(route.methods)) if route.methods else 'ALL'
            logger.info(f"{methods} {route.path}")
    logger.info("=" * 50)

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