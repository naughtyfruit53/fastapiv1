#!/usr/bin/env node
// Manual verification script for settings page refactoring
// Run with: node scripts/verify-settings-refactor.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Settings Page Refactoring...\n');

const frontendDir = path.join(__dirname, '..', 'frontend', 'src');

// Check 1: Verify settings.tsx uses AuthContext
const settingsPath = path.join(frontendDir, 'pages', 'settings.tsx');
const settingsContent = fs.readFileSync(settingsPath, 'utf8');

console.log('✅ Check 1: Settings page imports');
const hasAuthContextImport = settingsContent.includes("import { useAuth } from '../context/AuthContext'");
const hasUserTypesImport = settingsContent.includes("import { getDisplayRole, isAppSuperAdmin, canFactoryReset, canManageUsers } from '../types/user.types'");

console.log(`  - AuthContext import: ${hasAuthContextImport ? '✅' : '❌'}`);
console.log(`  - User types import: ${hasUserTypesImport ? '✅' : '❌'}`);

// Check 2: Verify settings.tsx uses centralized functions
console.log('\n✅ Check 2: Settings page uses centralized functions');
const usesGetDisplayRole = settingsContent.includes('getDisplayRole(user?.role || \'\', user?.is_super_admin)');
const usesIsAppSuperAdmin = settingsContent.includes('isAppSuperAdmin(user)');
const usesCanFactoryReset = settingsContent.includes('canFactoryReset(user)');
const usesCanManageUsers = settingsContent.includes('canManageUsers(user)');

console.log(`  - Uses getDisplayRole: ${usesGetDisplayRole ? '✅' : '❌'}`);
console.log(`  - Uses isAppSuperAdmin: ${usesIsAppSuperAdmin ? '✅' : '❌'}`);
console.log(`  - Uses canFactoryReset: ${usesCanFactoryReset ? '✅' : '❌'}`);
console.log(`  - Uses canManageUsers: ${usesCanManageUsers ? '✅' : '❌'}`);

// Check 3: Verify no ad-hoc permission logic
console.log('\n✅ Check 3: No ad-hoc permission logic');
const hasAdHocRole = settingsContent.includes('userRole === \'super_admin\'') || 
                     settingsContent.includes('userRole === \'org_admin\'') ||
                     settingsContent.includes('isOrgAdmin || isSuperAdmin');

console.log(`  - No ad-hoc role checks: ${!hasAdHocRole ? '✅' : '❌'}`);

// Check 4: Verify AuthContext uses centralized getDisplayRole
const authContextPath = path.join(frontendDir, 'context', 'AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

console.log('\n✅ Check 4: AuthContext consistency');
const importsGetDisplayRole = authContextContent.includes("import { User, getDisplayRole } from '../types/user.types'");
const usesCorrectDisplayRole = authContextContent.includes('getDisplayRole(user.role, user.is_super_admin)');
const noDuplicateFunction = !authContextContent.includes('const getDisplayRole = (user: User)');

console.log(`  - Imports getDisplayRole: ${importsGetDisplayRole ? '✅' : '❌'}`);
console.log(`  - Uses correct parameters: ${usesCorrectDisplayRole ? '✅' : '❌'}`);
console.log(`  - No duplicate function: ${noDuplicateFunction ? '✅' : '❌'}`);

// Check 5: Verify User interface completeness
const userTypesPath = path.join(frontendDir, 'types', 'user.types.ts');
const userTypesContent = fs.readFileSync(userTypesPath, 'utf8');

console.log('\n✅ Check 5: User interface completeness');
const hasMustChangePassword = userTypesContent.includes('must_change_password?: boolean;');

console.log(`  - Has must_change_password property: ${hasMustChangePassword ? '✅' : '❌'}`);

// Check 6: Verify getDisplayRole prioritizes is_super_admin
console.log('\n✅ Check 6: getDisplayRole function logic');
const prioritizesSuperAdmin = userTypesContent.includes('if (isSuperAdmin || role === \'super_admin\'');
const returnsAppSuperAdmin = userTypesContent.includes('return \'App Super Admin\';');

console.log(`  - Prioritizes is_super_admin flag: ${prioritizesSuperAdmin ? '✅' : '❌'}`);
console.log(`  - Returns "App Super Admin": ${returnsAppSuperAdmin ? '✅' : '❌'}`);

// Check 7: Verify linting fixes
console.log('\n✅ Check 7: Linting fixes');
const hasUnescapedQuotes = settingsContent.includes('"Other"') || 
                          settingsContent.includes('"Asia/Kolkata"') ||
                          settingsContent.includes('"INR"');
const hasEscapedQuotes = settingsContent.includes('&quot;Other&quot;') &&
                        settingsContent.includes('&quot;Asia/Kolkata&quot;') &&
                        settingsContent.includes('&quot;INR&quot;');

console.log(`  - No unescaped quotes: ${!hasUnescapedQuotes ? '✅' : '❌'}`);
console.log(`  - Has escaped quotes: ${hasEscapedQuotes ? '✅' : '❌'}`);

// Summary
console.log('\n📋 Summary:');
const allChecks = [
  hasAuthContextImport && hasUserTypesImport,
  usesGetDisplayRole && usesIsAppSuperAdmin && usesCanFactoryReset && usesCanManageUsers,
  !hasAdHocRole,
  importsGetDisplayRole && usesCorrectDisplayRole && noDuplicateFunction,
  hasMustChangePassword,
  prioritizesSuperAdmin && returnsAppSuperAdmin,
  !hasUnescapedQuotes && hasEscapedQuotes
];

const passedChecks = allChecks.filter(Boolean).length;
console.log(`Passed: ${passedChecks}/${allChecks.length} checks`);

if (passedChecks === allChecks.length) {
  console.log('🎉 All refactoring requirements verified successfully!');
} else {
  console.log('⚠️  Some checks failed. Please review the implementation.');
}

console.log('\n🧪 Manual Testing Recommendations:');
console.log('1. Test with user having is_super_admin: true - should see "App Super Admin" role');
console.log('2. Test with user having role: "org_admin" - should see "Org Super Admin" role');
console.log('3. Test with user having role: "standard_user" - should see "Standard User" role');
console.log('4. Verify super admin users see all reset options and user management buttons');
console.log('5. Verify standard users do not see admin-only features');