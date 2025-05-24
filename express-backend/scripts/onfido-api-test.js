#!/usr/bin/env node

const axios = require("axios");
const path = require("path");

// Environment variables
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const ONFIDO_TOKEN = process.env.ONFIDO_API_KEY;
const ONFIDO_BASE =
  process.env.ONFIDO_API_REGION === "us"
    ? "https://api.us.onfido.com/v3"
    : "https://api.onfido.com/v3";

// Check if token exists
if (!ONFIDO_TOKEN) {
  console.error("❌ ONFIDO_API_KEY not found in environment variables!");
  process.exit(1);
}

console.log(`🔑 Using Onfido token: ${ONFIDO_TOKEN.substring(0, 10)}...`);
console.log(`🌐 Using Onfido API: ${ONFIDO_BASE}`);
console.log(
  `📄 Token type: ${
    ONFIDO_TOKEN.startsWith("api_sandbox") ? "SANDBOX" : "LIVE"
  }`
);

// Configure Axios with Onfido authorization
const api = axios.create({
  baseURL: ONFIDO_BASE,
  headers: {
    Authorization: `Token token=${ONFIDO_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Test API connectivity
async function testConnectivity() {
  console.log("\n🔌 Testing API connectivity...");

  try {
    // Try to list webhooks as a simple connectivity test
    const response = await api.get("/webhooks");
    console.log("✅ API connection successful!");
    console.log("Webhooks:", JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Onfido API:");
    console.error(error.response?.data || error.message);

    // Check if it's an authorization issue
    if (error.response?.status === 401) {
      console.error(
        "🔑 This appears to be an authentication issue. Please check your API key."
      );
    }

    return false;
  }
}

// Create a test applicant
async function createTestApplicant() {
  console.log("\n👤 Creating a test applicant...");

  try {
    const response = await api.post("/applicants", {
      first_name: "Test",
      last_name: "User",
      email: `test.user+${Date.now()}@example.com`,
    });

    console.log("✅ Test applicant created successfully!");
    console.log("Applicant ID:", response.data.id);
    console.log("Applicant data:", JSON.stringify(response.data, null, 2));
    return response.data.id;
  } catch (error) {
    console.error("❌ Failed to create test applicant:");
    console.error(error.response?.data || error.message);
    return null;
  }
}

// Generate an SDK token
async function generateSdkToken(applicantId) {
  console.log("\n🔑 Generating SDK token...");

  try {
    const response = await api.post("/sdk_token", {
      applicant_id: applicantId,
      referrer: "https://localhost:3000/*",
    });

    console.log("✅ SDK token generated successfully!");
    console.log("Token:", response.data.token.substring(0, 15) + "...");
    return response.data.token;
  } catch (error) {
    console.error("❌ Failed to generate SDK token:");
    console.error(error.response?.data || error.message);
    return null;
  }
}

// Create a check without documents
async function createEmptyCheck(applicantId) {
  console.log("\n📝 Creating check without documents...");

  try {
    const response = await api.post("/checks", {
      applicant_id: applicantId,
      report_names: ["document"],
    });

    console.log("✅ Empty check created successfully!");
    console.log("Check ID:", response.data.id);
    console.log("Check data:", JSON.stringify(response.data, null, 2));
    return response.data.id;
  } catch (error) {
    console.error("❌ Failed to create empty check:");
    console.error(error.response?.data || error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log("🚀 Starting Onfido API test");

  // Test API connectivity
  if (!(await testConnectivity())) {
    console.error("❌ API connectivity test failed. Exiting.");
    return;
  }

  // Create a test applicant
  const applicantId = await createTestApplicant();
  if (!applicantId) {
    console.error("❌ Failed to create test applicant. Exiting.");
    return;
  }

  // Generate an SDK token
  const sdkToken = await generateSdkToken(applicantId);
  if (!sdkToken) {
    console.error("❌ Failed to generate SDK token. Exiting.");
    return;
  }

  // Create an empty check (will fail without documents, but tests the endpoint)
  const checkId = await createEmptyCheck(applicantId);
  // We don't check for failure here since it might fail without documents

  console.log("\n✅ API tests completed!");
  console.log("\n📝 Summary:");
  console.log(`Applicant ID: ${applicantId}`);
  console.log(`SDK Token: ${sdkToken.substring(0, 15)}...`);
  if (checkId) {
    console.log(`Check ID: ${checkId}`);
  }
  console.log("\n🔍 For full testing including document uploads, run:");
  console.log(
    "node scripts/onfido-test.js /path/to/front.jpg /path/to/back.jpg"
  );
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
