#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
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

// Store IDs through the process
const ids = {
  applicant: null,
  sdkToken: null,
  frontDoc: null,
  backDoc: null,
  check: null,
  report: null,
};

// Configure Axios with Onfido authorization
const api = axios.create({
  baseURL: ONFIDO_BASE,
  headers: {
    Authorization: `Token token=${ONFIDO_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Helper to pause execution
const sleep = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Step 1: Create Applicant
async function createApplicant() {
  console.log("\n🧑 Step 1: Creating applicant...");

  try {
    const response = await api.post("/applicants", {
      first_name: "Test",
      last_name: "User",
      email: `test.user+${Date.now()}@example.com`,
    });

    ids.applicant = response.data.id;
    console.log(`✅ Applicant created with ID: ${ids.applicant}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Failed to create applicant:");
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 2: Generate SDK Token
async function generateSdkToken() {
  console.log("\n🔒 Step 2: Generating SDK token...");

  try {
    const response = await api.post("/sdk_token", {
      applicant_id: ids.applicant,
      referrer: "https://localhost:3000/*",
    });

    ids.sdkToken = response.data.token;
    console.log(`✅ SDK token generated: ${ids.sdkToken.substring(0, 15)}...`);
    return true;
  } catch (error) {
    console.error("❌ Failed to generate SDK token:");
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 3: Upload Documents
async function uploadDocument(filePath, side) {
  console.log(
    `\n📄 Step 3.${side === "front" ? 1 : 2}: Uploading ${side} of document...`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("type", "driving_licence");
    form.append("side", side);
    form.append("applicant_id", ids.applicant);
    form.append("issuing_country", "USA");

    const response = await axios.post(`${ONFIDO_BASE}/documents`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Token token=${ONFIDO_TOKEN}`,
      },
    });

    if (side === "front") {
      ids.frontDoc = response.data.id;
      console.log(`✅ Front document uploaded with ID: ${ids.frontDoc}`);
    } else {
      ids.backDoc = response.data.id;
      console.log(`✅ Back document uploaded with ID: ${ids.backDoc}`);
    }

    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${side} document:`);
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 4: Fetch Document & OCR
async function fetchDocumentAndOcr() {
  console.log("\n🔍 Step 4.1: Fetching document metadata...");

  try {
    const response = await api.get(`/documents/${ids.frontDoc}`);
    console.log("✅ Document metadata retrieved:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Failed to fetch document metadata:");
    console.error(error.response?.data || error.message);
    return false;
  }

  console.log("\n🔍 Step 4.2: Fetching OCR data...");

  try {
    const response = await api.get(`/documents/${ids.frontDoc}/ocr`);
    console.log("✅ OCR data retrieved:");
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Failed to fetch OCR data:");
    console.error(error.response?.data || error.message);
    // Continue even if OCR fails
    return true;
  }
}

// Step 5: Create a Check
async function createCheck() {
  console.log("\n✅ Step 5: Creating check...");

  try {
    const payload = {
      applicant_id: ids.applicant,
      report_names: ["document"],
      document_ids: [ids.frontDoc],
    };

    // Add back document if available
    if (ids.backDoc) {
      payload.document_ids.push(ids.backDoc);
    }

    console.log("Request payload:", JSON.stringify(payload, null, 2));

    const response = await api.post("/checks", payload);

    ids.check = response.data.id;
    console.log(`✅ Check created with ID: ${ids.check}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Failed to create check:");
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 6: Poll Check Status
async function pollCheckStatus() {
  console.log("\n⏳ Step 6: Polling check status...");

  let attempts = 0;
  const maxAttempts = 15;
  const waitSeconds = 2;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\nPoll attempt ${attempts}/${maxAttempts}...`);

    try {
      const response = await api.get(`/checks/${ids.check}`);
      console.log(`Status: ${response.data.status}`);

      if (response.data.status === "complete") {
        console.log("✅ Check complete!");
        console.log(JSON.stringify(response.data, null, 2));

        // Get the document report ID
        const documentReport = response.data.reports.find(
          (r) => r.name === "document"
        );

        if (documentReport) {
          ids.report = documentReport.id;
          console.log(`Document report ID: ${ids.report}`);
          return true;
        } else {
          console.log("⚠️ Document report not found in response");
          return false;
        }
      } else {
        console.log(
          `Check not complete yet. Waiting ${waitSeconds} seconds...`
        );
        await sleep(waitSeconds);
      }
    } catch (error) {
      console.error(
        `❌ Error checking status (attempt ${attempts}/${maxAttempts}):`
      );
      console.error(error.response?.data || error.message);

      if (attempts < maxAttempts) {
        console.log(`Retrying in ${waitSeconds} seconds...`);
        await sleep(waitSeconds);
      } else {
        return false;
      }
    }
  }

  console.log(
    "❌ Check did not complete within the maximum number of attempts"
  );
  return false;
}

// Step 7: Fetch Detailed Report
async function fetchReport() {
  console.log("\n📊 Step 7: Fetching detailed report...");

  if (!ids.report) {
    console.log("⚠️ No report ID available");
    return false;
  }

  try {
    const response = await api.get(`/reports/${ids.report}`);
    console.log("✅ Detailed report retrieved:");
    console.log(JSON.stringify(response.data, null, 2));

    // Specifically log extracted data
    if (response.data.result?.extracted_data) {
      console.log("\n📋 Extracted data:");
      console.log(JSON.stringify(response.data.result.extracted_data, null, 2));
    } else if (response.data.properties) {
      console.log("\n📋 Properties data:");
      console.log(JSON.stringify(response.data.properties, null, 2));
    } else {
      console.log("⚠️ No extracted data found in report");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to fetch detailed report:");
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Main function to run the flow
async function runFlow() {
  console.log("🚀 Starting Onfido end-to-end test flow");

  // Step 1: Create Applicant
  if (!(await createApplicant())) return;

  // Step 2: Generate SDK Token
  if (!(await generateSdkToken())) return;

  // Steps 3-7 require file paths for document uploads
  console.log(
    "\n⚠️ To continue with document upload, provide the front and back image paths"
  );
  console.log("Example usage:");
  console.log("node onfido-test.js /path/to/front.jpg /path/to/back.jpg");

  // Check if file paths were provided
  const frontPath = process.argv[2];
  const backPath = process.argv[3];

  if (!frontPath) {
    console.log("❌ No front document path provided. Stopping here.");
    process.exit(1);
  }

  // Step 3: Upload Documents
  if (!(await uploadDocument(frontPath, "front"))) return;

  if (backPath) {
    if (!(await uploadDocument(backPath, "back"))) return;
  } else {
    console.log(
      "⚠️ No back document path provided. Continuing with front only."
    );
  }

  // Step 4: Fetch Document & OCR
  if (!(await fetchDocumentAndOcr())) return;

  // Step 5: Create a Check
  if (!(await createCheck())) return;

  // Step 6: Poll Check Status
  if (!(await pollCheckStatus())) return;

  // Step 7: Fetch Detailed Report
  await fetchReport();

  console.log("\n🎉 Onfido flow completed successfully!");

  // Print all IDs for reference
  console.log("\n📝 Summary of IDs:");
  Object.entries(ids).forEach(([key, value]) => {
    if (value) console.log(`${key}: ${value}`);
  });
}

// Run the flow
runFlow().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
