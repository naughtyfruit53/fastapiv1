#!/usr/bin/env python3
"""
Test to validate that BACKEND_CORS_ORIGINS handles both list and comma-separated string formats
"""
import os
import sys
sys.path.append('/home/runner/work/fastapiv1/fastapiv1')

from app.core.config import Settings


def test_cors_origins_list_format():
    """Test that BACKEND_CORS_ORIGINS works with list format"""
    
    # Test with list format
    settings = Settings(BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"])
    
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) == 2
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:8080" in settings.BACKEND_CORS_ORIGINS
    
    print("✅ List format works correctly")


def test_cors_origins_string_format():
    """Test that BACKEND_CORS_ORIGINS works with comma-separated string format"""
    
    # Test with comma-separated string
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,http://localhost:8080,https://myapp.com")
    
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) == 3
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:8080" in settings.BACKEND_CORS_ORIGINS
    assert "https://myapp.com" in settings.BACKEND_CORS_ORIGINS
    
    print("✅ Comma-separated string format works correctly")


def test_cors_origins_string_with_spaces():
    """Test that BACKEND_CORS_ORIGINS handles spaces in comma-separated string"""
    
    # Test with spaces around commas
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000, http://localhost:8080 , https://myapp.com")
    
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) == 3
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:8080" in settings.BACKEND_CORS_ORIGINS  
    assert "https://myapp.com" in settings.BACKEND_CORS_ORIGINS
    
    # Ensure no extra spaces
    for origin in settings.BACKEND_CORS_ORIGINS:
        assert origin.strip() == origin
    
    print("✅ String format with spaces works correctly")


def test_cors_origins_single_string():
    """Test that BACKEND_CORS_ORIGINS works with single string"""
    
    # Test with single string (no commas)
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000")
    
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) == 1
    assert settings.BACKEND_CORS_ORIGINS[0] == "http://localhost:3000"
    
    print("✅ Single string format works correctly")


def test_cors_origins_default():
    """Test default BACKEND_CORS_ORIGINS value"""
    
    settings = Settings()
    
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:8080" in settings.BACKEND_CORS_ORIGINS
    
    print("✅ Default CORS origins work correctly")


if __name__ == "__main__":
    test_cors_origins_list_format()
    test_cors_origins_string_format()
    test_cors_origins_string_with_spaces()
    test_cors_origins_single_string()
    test_cors_origins_default()
    print("\n🎉 All CORS origins configuration tests passed!")