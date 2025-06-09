#!/usr/bin/env node

/**
 * QA Test Runner for SafeBallot Route Restructuring
 *
 * This script runs comprehensive tests to verify:
 * 1. Route Smoke Tests - Basic routing functionality
 * 2. RegistrationFlowRouter Tests - Full flow integration
 * 3. LoginFlowRouter Tests - Streamlined flow integration
 * 4. Legacy Route Redirects - Backward compatibility
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 SafeBallot Route QA Test Runner");
console.log("=====================================\n");

const runTests = async () => {
  try {
    console.log("📋 Running Route Smoke Tests...");
    console.log(
      "Testing: /verify-registration, /verify-login, legacy redirects\n"
    );

    // Run smoke tests
    execSync("npm test -- --testPathPattern=RouteSmoke.test.js --verbose", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("\n✅ Route Smoke Tests: PASSED\n");

    console.log("🔄 Running RegistrationFlowRouter Integration Tests...");
    console.log("Testing: identity → scan → confirm → verified flow\n");

    // Run registration flow tests
    execSync(
      "npm test -- --testPathPattern=RegistrationFlowRouter.test.jsx --verbose",
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );

    console.log("\n✅ RegistrationFlowRouter Tests: PASSED\n");

    console.log("⚡ Running LoginFlowRouter Integration Tests...");
    console.log("Testing: scan → verified (NO confirm step) flow\n");

    // Run login flow tests
    execSync(
      "npm test -- --testPathPattern=LoginFlowRouter.test.jsx --verbose",
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );

    console.log("\n✅ LoginFlowRouter Tests: PASSED\n");

    console.log("🎉 ALL QA TESTS PASSED!");
    console.log("=====================================");
    console.log("✓ Route smoke tests completed");
    console.log("✓ Registration flow (identity → scan → confirm → verified)");
    console.log("✓ Login flow (scan → verified, NO confirm)");
    console.log("✓ Legacy route redirects working");
    console.log("✓ Component isolation verified");
    console.log("✓ Data flow integrity confirmed");
    console.log("=====================================\n");
  } catch (error) {
    console.error("❌ QA Tests Failed:", error.message);
    console.log("\n🔍 Debugging Tips:");
    console.log("1. Check that all route components are properly imported");
    console.log("2. Verify mock components match actual component interfaces");
    console.log("3. Ensure localStorage mocks are working correctly");
    console.log("4. Check that router navigation logic is correct");
    process.exit(1);
  }
};

// Test Coverage Summary
const showCoverage = () => {
  console.log("📊 Test Coverage Summary");
  console.log("========================");
  console.log("Routes Tested:");
  console.log("  ✓ /verify-registration/:id/:slug → RegistrationFlowRouter");
  console.log("  ✓ /verify-login/:id/:slug → LoginFlowRouter");
  console.log("  ✓ /preregister/:id/:slug → redirects to registration");
  console.log("  ✓ /verify-identity/:id/:slug → redirects to registration");
  console.log("  ✓ /login/preregister/:id/:slug → redirects to login");
  console.log("");
  console.log("Flow Components Tested:");
  console.log(
    "  Registration: VerifyIdentity → ScanID → ConfirmInfo → VerifiedScreen"
  );
  console.log("  Login: ScanID → LoginVerifiedScreen (NO ConfirmInfo)");
  console.log("");
  console.log("Key Assertions:");
  console.log("  ✓ ConfirmInfo NEVER appears in login flow");
  console.log("  ✓ VerifyIdentity NEVER appears in login flow");
  console.log("  ✓ LoginVerifiedScreen used for login (not VerifiedScreen)");
  console.log("  ✓ Legacy routes redirect with parameter preservation");
  console.log("  ✓ Error handling and fallbacks work correctly");
  console.log("  ✓ Data flows correctly through each step");
  console.log("========================\n");
};

if (require.main === module) {
  showCoverage();
  runTests();
}

module.exports = { runTests, showCoverage };
