const axios = require("axios");

// Determine API URL based on region
const ONFIDO_API_URL =
  process.env.ONFIDO_API_REGION === "us"
    ? "https://api.us.onfido.com/v3"
    : "https://api.onfido.com/v3";

// Get API token from environment
const ONFIDO_TOKEN = process.env.ONFIDO_API_KEY;

// Always use production mode
const ONFIDO_SANDBOX = false;

console.log(`Initializing Onfido API with: 
  - Region: ${process.env.ONFIDO_API_REGION || "default (EU)"}
  - Mode: PRODUCTION (sandbox disabled)
  - API URL: ${ONFIDO_API_URL}
  - Token: ${
    ONFIDO_TOKEN ? ONFIDO_TOKEN.substring(0, 15) + "..." : "NOT SET"
  }`);

// Create axios instance with authentication
const onfidoAxios = axios.create({
  baseURL: ONFIDO_API_URL,
  headers: {
    Authorization: `Token token=${ONFIDO_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Create an applicant
exports.createApplicant = async (req, res) => {
  try {
    // Get the API token from request or environment
    const apiToken = req.body.apiToken || ONFIDO_TOKEN;
    const isProduction = req.body.isProduction !== false; // Default to production mode

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    const { firstName, lastName, email } = req.body;
    console.log("Creating Onfido applicant:", {
      firstName,
      lastName,
      email,
      isProduction,
    });

    const response = await axios.post(
      `${ONFIDO_API_URL}/applicants`,
      {
        first_name: firstName,
        last_name: lastName,
        email,
      },
      { headers }
    );

    console.log("Onfido applicant created successfully:", response.data.id);
    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error creating applicant:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Generate SDK token for the frontend
exports.generateSdkToken = async (req, res) => {
  try {
    // Get the API token from request or environment
    const apiToken = req.body.apiToken || ONFIDO_TOKEN;
    const isProduction = req.body.isProduction !== false; // Default to production mode

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    const { applicantId } = req.body;
    console.log(
      "Generating Onfido SDK token for applicant:",
      applicantId,
      "using production mode:",
      isProduction
    );

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: "Applicant ID is required",
      });
    }

    // Get origin for referrer - important for cross-origin security
    const origin =
      req.get("origin") || process.env.FRONTEND_URL || "http://localhost:3000";
    const referrer = req.body.referrer || origin + "/*";

    console.log("Using referrer for SDK token:", referrer);

    // Create SDK token with sandbox mode always disabled for production
    const response = await axios.post(
      `${ONFIDO_API_URL}/sdk_token`,
      {
        applicant_id: applicantId,
        referrer: referrer,
        application_id: process.env.ONFIDO_APP_ID || undefined,
        sandbox: !isProduction, // Only use sandbox if explicitly requested
      },
      { headers }
    );

    console.log(
      "SDK token generated for referrer:",
      referrer,
      "production mode:",
      isProduction
    );
    return res.json({
      success: true,
      data: {
        token: response.data.token,
        expiry: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 90 minutes from now
        sandbox: !isProduction,
      },
    });
  } catch (error) {
    console.error(
      "Error generating SDK token:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Create a check for document verification
exports.createCheck = async (req, res) => {
  try {
    // Get the API token from request or environment
    const apiToken = req.body.apiToken || ONFIDO_TOKEN;
    const isProduction = req.body.isProduction !== false; // Default to production mode

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    const { applicantId, document_ids } = req.body;
    console.log(
      "Creating Onfido check for applicant:",
      applicantId,
      "using production mode:",
      isProduction
    );

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: "Applicant ID is required",
      });
    }

    // Prepare check payload
    const checkPayload = {
      applicant_id: applicantId,
      // Always include document report
      report_names: ["document"],
    };

    // Add document IDs if provided
    if (
      document_ids &&
      Array.isArray(document_ids) &&
      document_ids.length > 0
    ) {
      checkPayload.document_ids = document_ids;
      console.log("Including document IDs in check:", document_ids);
    }

    // Log the request payload for debugging
    console.log(
      "Onfido check request payload:",
      JSON.stringify(checkPayload, null, 2)
    );

    const response = await axios.post(
      `${ONFIDO_API_URL}/checks`,
      checkPayload,
      { headers }
    );

    console.log("Onfido check created successfully:", response.data.id);

    // Log the complete response for debugging
    console.log(
      "Raw Onfido check response:",
      JSON.stringify(response.data, null, 2)
    );

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error creating check:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Get check result
exports.getCheck = async (req, res) => {
  try {
    const { checkId } = req.params;
    // Get the API token from query or environment
    const apiToken = req.query.apiToken || ONFIDO_TOKEN;
    const isProduction = req.query.isProduction !== false; // Default to production mode

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log(
      "Getting Onfido check result:",
      checkId,
      "using production mode:",
      isProduction,
      "with token type:",
      apiToken.startsWith("api_sandbox") ? "SANDBOX" : "LIVE"
    );

    if (!checkId) {
      return res.status(400).json({
        success: false,
        error: "Check ID is required",
      });
    }

    const response = await axios.get(`${ONFIDO_API_URL}/checks/${checkId}`, {
      headers,
    });

    const check = response.data;
    console.log(
      `Check status: ${check.status}, result: ${check.result || "pending"}`
    );

    // Log the entire check response for debugging
    console.log("Raw check response:", JSON.stringify(check, null, 2));

    // If check is not complete, return status immediately
    if (check.status !== "complete") {
      return res.json({
        success: true,
        data: {
          ...check,
          message: "Check is still processing. Please try again later.",
          isComplete: false,
        },
      });
    }

    // Safely check if reports array exists
    if (!check.reports || !Array.isArray(check.reports)) {
      console.log("Warning: Check is missing reports array:", check);
      return res.json({
        success: true,
        data: {
          ...check,
          message: "Check is complete but no reports are available.",
          isComplete: true,
          hasDocumentReport: false,
          documentReportComplete: false,
          reportsMissing: true,
        },
      });
    }

    // Get the document report if available
    const documentReport = check.reports.find(
      (report) => report.name === "document"
    );

    // Check if document report exists and is complete
    if (documentReport && documentReport.status === "complete") {
      try {
        // Get detailed report data
        const reportResponse = await axios.get(
          `${ONFIDO_API_URL}/reports/${documentReport.id}`,
          { headers }
        );

        // Add report data to the response
        check.documentReportData = reportResponse.data;
        console.log("Document report data retrieved successfully");
      } catch (reportError) {
        console.error(
          "Error retrieving document report data:",
          reportError.message
        );
        // Continue with the response even if report retrieval fails
      }
    }

    return res.json({
      success: true,
      data: {
        ...check,
        isComplete: check.status === "complete",
        hasDocumentReport: !!documentReport,
        documentReportComplete: documentReport
          ? documentReport.status === "complete"
          : false,
      },
    });
  } catch (error) {
    console.error(
      "Error getting check:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Extract document data from a check
exports.extractDocumentData = async (req, res) => {
  try {
    const { checkId } = req.params;
    // Get the API token from query or environment
    const apiToken = req.query.apiToken || ONFIDO_TOKEN;
    const isProduction = req.query.isProduction !== false; // Default to production mode

    // Optional parameters
    const maxAttempts = parseInt(req.query.attempts) || 5; // Increased default from 3 to 5
    const waitTime = parseInt(req.query.wait) || 2; // seconds

    // Debug mode flag to show extra logging
    const debug = req.query.debug === "true";

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log(
      `Extracting document data from check: ${checkId} (production: ${isProduction}, max attempts: ${maxAttempts})`
    );

    if (!checkId) {
      return res.status(400).json({
        success: false,
        error: "Check ID is required",
      });
    }

    // Poll for check completion and report data
    let attempts = 0;
    let checkResponse = null;
    let documentReport = null;
    let reportComplete = false;

    while (attempts < maxAttempts && !reportComplete) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} to get check data`);

      try {
        // Get check details
        checkResponse = await axios.get(`${ONFIDO_API_URL}/checks/${checkId}`, {
          headers,
        });

        // DEBUG: Log the entire raw check response
        if (debug) {
          console.log(`>>> DEBUG: Raw check response (attempt ${attempts}):`);
          console.log(JSON.stringify(checkResponse.data, null, 2));
        } else {
          console.log(
            `Check status: ${checkResponse.data.status}, with ${
              checkResponse.data.reports?.length || 0
            } reports`
          );
        }

        // Find the document report
        documentReport = checkResponse.data.reports.find(
          (report) => report.name === "document"
        );

        if (!documentReport) {
          console.log(
            `No document report found in check. Available reports: ${
              checkResponse.data.reports.map((r) => r.name).join(", ") || "none"
            }`
          );

          // Wait before next attempt if we haven't reached max attempts
          if (attempts < maxAttempts) {
            console.log(`Waiting ${waitTime}s before next attempt...`);
            await new Promise((resolve) =>
              setTimeout(resolve, waitTime * 1000)
            );
            continue;
          }

          throw new Error("Document report not found in check");
        }

        // Directly get report status via the /reports/document endpoint
        try {
          console.log(
            `Directly checking document report status: GET /checks/${checkId}/reports/document`
          );

          const reportResponse = await axios.get(
            `${ONFIDO_API_URL}/checks/${checkId}/reports/document`,
            { headers }
          );

          console.log(
            `Poll attempt ${attempts}/${maxAttempts}`,
            reportResponse.data
          );
          console.log(
            `Document report direct status: ${reportResponse.data.status}`
          );

          // Log the raw report as requested
          console.log("Raw Onfido report:", reportResponse.data);

          if (reportResponse.data.status === "complete") {
            console.log(`Document report is complete via direct check!`);
            documentReport = reportResponse.data;
            reportComplete = true;
            break;
          } else {
            console.log(
              `Document report not complete yet: ${reportResponse.data.status}`
            );
          }
        } catch (reportErr) {
          console.error(
            `Error checking report directly (attempt ${attempts}):`,
            reportErr.response?.data || reportErr.message
          );
          // Fall back to regular status check
        }

        // Check if report is complete based on check data
        if (documentReport.status === "complete" && !reportComplete) {
          console.log(
            `Document report is complete according to check data! Report ID: ${documentReport.id}`
          );
          reportComplete = true;
          break;
        } else if (!reportComplete) {
          console.log(
            `Document report status: ${documentReport.status}, ID: ${documentReport.id}`
          );

          // Wait before next attempt if we haven't reached max attempts
          if (attempts < maxAttempts) {
            console.log(`Waiting ${waitTime}s before next attempt...`);
            await new Promise((resolve) =>
              setTimeout(resolve, waitTime * 1000)
            );
          } else {
            console.log(
              `Maximum attempts (${maxAttempts}) reached, report still not complete`
            );
          }
        }
      } catch (pollError) {
        console.error(
          `Polling error (attempt ${attempts}):`,
          pollError.response?.data || pollError.message
        );

        if (attempts >= maxAttempts) {
          throw pollError;
        }

        // Wait before next attempt
        console.log(`Waiting ${waitTime}s before retry after error...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      }
    }

    // If we get here and document report is still not complete, return error
    if (!reportComplete) {
      return res.status(202).json({
        success: false,
        error: "Document report is not yet complete after maximum attempts",
        status: documentReport ? documentReport.status : "unknown",
        reportId: documentReport ? documentReport.id : null,
        checkId,
        attempts,
      });
    }

    console.log(`Document report is complete. Fetching report data...`);

    // Get report details if we don't already have them from direct API call
    let reportResponse;
    try {
      if (documentReport && documentReport.result) {
        // We already have the full report from the direct API call
        console.log("Using report data from direct API call");
        reportResponse = { data: documentReport };
      } else {
        // Get the report details
        console.log(`Fetching report details for ${documentReport.id}...`);
        reportResponse = await axios.get(
          `${ONFIDO_API_URL}/reports/${documentReport.id}`,
          { headers }
        );
      }

      // Log the entire raw report response
      console.log(">>> FULL REPORT RAW RESPONSE:");
      console.log(JSON.stringify(reportResponse.data, null, 2));

      // Log the raw report as requested
      console.log("Raw Onfido report:", reportResponse.data);
    } catch (reportError) {
      console.error(
        "Error fetching report data:",
        reportError.response?.data || reportError.message
      );
      return res.status(500).json({
        success: false,
        error:
          "Failed to fetch report data: " +
          (reportError.response?.data?.error || reportError.message),
        checkId,
        reportId: documentReport ? documentReport.id : null,
        attempts,
      });
    }

    // Check if result has extracted_data directly from Onfido
    let extractedData = {};

    if (
      reportResponse.data.result &&
      reportResponse.data.result.extracted_data
    ) {
      console.log("Using extracted_data directly from Onfido result");
      extractedData = reportResponse.data.result.extracted_data;
    } else {
      // Fall back to properties
      console.log("Falling back to properties for extraction");
      const properties = reportResponse.data.properties || {};

      extractedData = {
        first_name:
          properties.first_name?.value || properties.given_names?.value,
        last_name: properties.last_name?.value || properties.surname?.value,
        document_number:
          properties.document_numbers?.value ||
          properties.document_number?.value,
        date_of_birth:
          properties.date_of_birth?.value || properties.birth_date?.value,
        nationality: properties.nationality?.value,
        issuing_country: properties.issuing_country?.value,
        expiration_date:
          properties.expiration_date?.value || properties.expiry_date?.value,
        gender: properties.gender?.value || properties.sex?.value,
      };
    }

    // Check if we have any meaningful data
    const hasExtractedData = Object.values(extractedData).some(
      (value) => value && typeof value === "string" && value.length > 0
    );

    if (!hasExtractedData) {
      console.warn("No meaningful data was extracted from the document report");
    } else {
      console.log(
        "Successfully extracted document data:",
        Object.entries(extractedData)
          .filter(([key, value]) => value && typeof value === "string")
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      );
    }

    // Additional debug logging - final response being sent
    console.log(">>> Final data being sent to client:");
    const finalResponse = {
      success: true,
      // Put the extracted data directly in the response
      ...extractedData,
      // Add metadata
      _meta: {
        reportId: documentReport.id,
        checkId,
        hasData: hasExtractedData,
        attempts,
        documentType:
          reportResponse.data.properties?.document_type?.value || "unknown",
      },
      // Always include the full report for debugging purposes
      report: reportResponse.data,
    };
    console.log(JSON.stringify(finalResponse, null, 2));

    // Return a flattened structure for easier access
    return res.json(finalResponse);
  } catch (error) {
    console.error(
      "Error extracting document data:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Get document by ID
exports.getDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    // Get the API token from query or environment
    const apiToken = req.query.apiToken || ONFIDO_TOKEN;
    const isProduction = req.query.isProduction !== false; // Default to production mode
    const directFetch = req.query.direct === "true"; // Flag to fetch directly from Onfido API
    const sdkToken = req.query.sdkToken; // SDK token can be used for direct API access

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    // If SDK token is provided, we can try a direct approach with Bearer token
    if (sdkToken && directFetch) {
      const bearerHeaders = {
        Authorization: `Bearer ${sdkToken}`,
        "Content-Type": "application/json",
      };

      console.log(
        `Attempting direct Onfido API call with SDK token for document: ${documentId}`
      );

      try {
        // Try direct Onfido API call with SDK token
        const directResponse = await axios.get(
          `https://api.onfido.com/v3/documents/${documentId}`,
          { headers: bearerHeaders }
        );

        console.log("Direct API call successful!");
        console.log(">>> Raw Onfido document response (direct):");
        console.log(JSON.stringify(directResponse.data, null, 2));

        return res.json({
          success: true,
          data: directResponse.data,
          source: "direct_api",
        });
      } catch (directError) {
        console.error("Direct API call failed:", directError.message);
        // Continue with standard approach if direct call fails
      }
    }

    console.log(
      `Fetching document by ID: ${documentId} (production: ${isProduction})`
    );

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Document ID is required",
      });
    }

    const response = await axios.get(
      `${ONFIDO_API_URL}/documents/${documentId}`,
      { headers }
    );
    console.log("Document fetched successfully");

    // Log the raw document response
    console.log(">>> Raw Onfido document response (API token):");
    console.log(JSON.stringify(response.data, null, 2));

    return res.json({
      success: true,
      data: response.data,
      source: "api_token",
    });
  } catch (error) {
    console.error(
      "Error fetching document:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Create a check and poll for results in a single request
exports.createCheckAndPoll = async (req, res) => {
  try {
    // Get the API token from request or environment
    const apiToken = req.body.apiToken || ONFIDO_TOKEN;
    const isProduction = req.body.isProduction !== false; // Default to production mode

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    const {
      applicantId,
      document_ids,
      report_names,
      maxAttempts = 5,
      waitTime = 2,
    } = req.body;
    console.log(
      `Creating Onfido check with polling for applicant: ${applicantId} (production: ${isProduction}, max attempts: ${maxAttempts})`
    );

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: "Applicant ID is required",
      });
    }

    // Prepare check payload
    const checkPayload = {
      applicant_id: applicantId,
      // Always include document report, plus any additional requested reports
      report_names: Array.isArray(report_names)
        ? [...report_names]
        : ["document"],
    };

    // Add document IDs if provided
    if (
      document_ids &&
      Array.isArray(document_ids) &&
      document_ids.length > 0
    ) {
      checkPayload.document_ids = document_ids;
      console.log("Including document IDs in check:", document_ids);
    }

    // Always ensure the report_names includes "document" report
    if (!checkPayload.report_names.includes("document")) {
      checkPayload.report_names.push("document");
      console.log("Adding 'document' to report_names automatically");
    }

    // Log the request payload for debugging
    console.log(
      "Onfido check request payload:",
      JSON.stringify(checkPayload, null, 2)
    );

    // Step 1: Create the check
    const checkResponse = await axios.post(
      `${ONFIDO_API_URL}/checks`,
      checkPayload,
      { headers }
    );

    console.log(`Onfido check created successfully: ${checkResponse.data.id}`);

    // Step 2: Poll for check completion
    console.log(`Polling check ${checkResponse.data.id} for completion...`);

    let attempts = 0;
    let isComplete = false;
    let finalCheckData = null;
    let documentReport = null;

    while (attempts < maxAttempts && !isComplete) {
      attempts++;
      console.log(
        `Poll attempt ${attempts}/${maxAttempts} for check ${checkResponse.data.id}`
      );

      try {
        // Get the check status
        const pollResponse = await axios.get(
          `${ONFIDO_API_URL}/checks/${checkResponse.data.id}`,
          { headers }
        );

        finalCheckData = pollResponse.data;

        // Find the document report
        documentReport = finalCheckData.reports.find(
          (report) => report.name === "document"
        );

        if (!documentReport) {
          console.log(
            `No document report found in check (attempt ${attempts})`
          );

          // Wait before next attempt if we haven't reached max attempts
          if (attempts < maxAttempts) {
            console.log(`Waiting ${waitTime}s before next attempt...`);
            await new Promise((resolve) =>
              setTimeout(resolve, waitTime * 1000)
            );
            continue;
          }

          break; // Exit the loop if no document report found after max attempts
        }

        // Check if document report is complete
        if (documentReport.status === "complete") {
          console.log(
            `Document report is complete! Report ID: ${documentReport.id} (attempt ${attempts})`
          );
          isComplete = true;

          // Get the document report data
          console.log(`Fetching report data for ${documentReport.id}...`);
          const reportResponse = await axios.get(
            `${ONFIDO_API_URL}/reports/${documentReport.id}`,
            { headers }
          );

          // Log the report data for debugging
          console.log(">>> FULL REPORT RAW RESPONSE:");
          console.log(JSON.stringify(reportResponse.data, null, 2));

          // Add report data to final check data
          finalCheckData.reportData = reportResponse.data;
          break;
        } else {
          console.log(
            `Document report status: ${documentReport.status}, ID: ${documentReport.id}`
          );

          // Wait before next attempt if we haven't reached max attempts
          if (attempts < maxAttempts) {
            console.log(`Waiting ${waitTime}s before next attempt...`);
            await new Promise((resolve) =>
              setTimeout(resolve, waitTime * 1000)
            );
          }
        }
      } catch (pollError) {
        console.error(
          `Error polling check (attempt ${attempts}): ${pollError.message}`
        );
        if (attempts >= maxAttempts) throw pollError;

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      }
    }

    // Return the results
    return res.json({
      success: true,
      data: {
        initialCheck: checkResponse.data,
        finalCheckData,
        pollingComplete: isComplete,
        attempts,
        documentReport: documentReport
          ? {
              id: documentReport.id,
              status: documentReport.status,
              hasData: isComplete && finalCheckData?.reportData ? true : false,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "Error creating check with polling:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};

// Validate Onfido configuration
exports.validateConfig = async (req, res) => {
  try {
    // Try to create a test applicant to validate the API token
    const response = await onfidoAxios.post("/applicants", {
      first_name: "Test",
      last_name: "User",
    });

    return res.json({
      success: true,
      message: "Onfido configuration is valid",
      apiUrl: ONFIDO_API_URL,
      production: true,
    });
  } catch (error) {
    console.error(
      "Onfido configuration validation failed:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error:
        "Invalid Onfido configuration: " +
        (error.response?.data?.error || error.message),
    });
  }
};

// Poll a check until it's complete or timeout
exports.pollCheck = async (req, res) => {
  try {
    const { checkId } = req.params;
    // Get the API token from query or environment
    const apiToken = req.query.apiToken || ONFIDO_TOKEN;
    const isProduction = req.query.isProduction !== false; // Default to production mode

    // Optional timeout in seconds (default: 10 seconds)
    const timeout = parseInt(req.query.timeout) || 10;
    const maxAttempts = parseInt(req.query.maxAttempts) || 5;

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log(
      `Polling Onfido check ${checkId} (timeout: ${timeout}s, max attempts: ${maxAttempts})`
    );

    if (!checkId) {
      return res.status(400).json({
        success: false,
        error: "Check ID is required",
      });
    }

    // Function to get check status
    const getCheckStatus = async () => {
      try {
        const response = await axios.get(
          `${ONFIDO_API_URL}/checks/${checkId}`,
          {
            headers,
          }
        );
        return response.data;
      } catch (error) {
        console.error("Error getting check status:", error.message);
        throw error;
      }
    };

    // Initial check
    let check = await getCheckStatus();
    let attempt = 1;

    // If check is already complete, return immediately
    if (check.status === "complete") {
      console.log(`Check ${checkId} is already complete`);

      // Get document report data if available
      const documentReport = check.reports.find(
        (report) => report.name === "document"
      );
      if (documentReport && documentReport.status === "complete") {
        try {
          const reportResponse = await axios.get(
            `${ONFIDO_API_URL}/reports/${documentReport.id}`,
            { headers }
          );
          check.documentReportData = reportResponse.data;
        } catch (reportError) {
          console.error("Error getting document report:", reportError.message);
        }
      }

      return res.json({
        success: true,
        data: {
          ...check,
          isComplete: true,
          hasDocumentReport: !!documentReport,
          documentReportComplete: documentReport
            ? documentReport.status === "complete"
            : false,
          pollingComplete: true,
        },
      });
    }

    // Poll until check is complete or timeout
    while (attempt < maxAttempts) {
      console.log(
        `Polling attempt ${attempt}/${maxAttempts} for check ${checkId}`
      );

      // Wait for the specified timeout
      await new Promise((resolve) => setTimeout(resolve, timeout * 1000));

      // Get updated check status
      check = await getCheckStatus();
      attempt++;

      // If check is complete, return
      if (check.status === "complete") {
        console.log(
          `Check ${checkId} is now complete after ${attempt} attempts`
        );

        // Get document report data if available
        const documentReport = check.reports.find(
          (report) => report.name === "document"
        );
        if (documentReport && documentReport.status === "complete") {
          try {
            const reportResponse = await axios.get(
              `${ONFIDO_API_URL}/reports/${documentReport.id}`,
              { headers }
            );
            check.documentReportData = reportResponse.data;
          } catch (reportError) {
            console.error(
              "Error getting document report:",
              reportError.message
            );
          }
        }

        return res.json({
          success: true,
          data: {
            ...check,
            isComplete: true,
            hasDocumentReport: !!documentReport,
            documentReportComplete: documentReport
              ? documentReport.status === "complete"
              : false,
            pollingComplete: true,
            attempts: attempt,
          },
        });
      }
    }

    // If we get here, polling timed out
    console.log(
      `Polling timed out for check ${checkId} after ${maxAttempts} attempts`
    );
    return res.status(202).json({
      success: true,
      data: {
        ...check,
        isComplete: false,
        pollingComplete: false,
        message: `Check is still processing after ${maxAttempts} polling attempts. Try again later.`,
        attempts: attempt,
      },
    });
  } catch (error) {
    console.error(
      "Error polling check:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
};
