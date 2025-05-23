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

    const { applicantId } = req.body;
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

    const response = await axios.post(
      `${ONFIDO_API_URL}/checks`,
      {
        applicant_id: applicantId,
        report_names: ["document", "facial_similarity_photo"],
      },
      { headers }
    );

    console.log("Onfido check created successfully:", response.data.id);
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
      isProduction
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

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log(
      "Extracting document data from check:",
      checkId,
      "using production mode:",
      isProduction
    );

    if (!checkId) {
      return res.status(400).json({
        success: false,
        error: "Check ID is required",
      });
    }

    // Get check details
    const checkResponse = await axios.get(
      `${ONFIDO_API_URL}/checks/${checkId}`,
      { headers }
    );

    // Find the document report
    const documentReport = checkResponse.data.reports.find(
      (report) => report.name === "document"
    );

    if (!documentReport) {
      console.error("Document report not found in check:", checkId);
      console.log(
        "Available reports:",
        checkResponse.data.reports.map((r) => r.name).join(", ")
      );
      return res.status(404).json({
        success: false,
        error: "Document report not found in check",
        availableReports: checkResponse.data.reports.map((r) => r.name),
        checkStatus: checkResponse.data.status,
      });
    }

    // Check if report is complete
    if (documentReport.status !== "complete") {
      console.log(
        `Document report status: ${documentReport.status}. Waiting for completion...`
      );
      return res.status(202).json({
        success: false,
        error: "Document report is not yet complete",
        status: documentReport.status,
        reportId: documentReport.id,
        checkId,
      });
    }

    console.log(`Document report is complete. Fetching report data...`);

    // Get report details
    const reportResponse = await axios.get(
      `${ONFIDO_API_URL}/reports/${documentReport.id}`,
      { headers }
    );

    // Log full properties to help debug
    console.log(
      "Report properties:",
      JSON.stringify(reportResponse.data.properties || {}, null, 2)
    );

    // Extract all possible data from the report
    const properties = reportResponse.data.properties || {};
    const extractedData = {
      // Primary fields
      firstName: properties.first_name?.value || properties.given_names?.value,
      lastName: properties.last_name?.value || properties.surname?.value,
      documentNumber:
        properties.document_numbers?.value || properties.document_number?.value,
      dateOfBirth:
        properties.date_of_birth?.value || properties.birth_date?.value,
      nationality: properties.nationality?.value,
      issuingCountry: properties.issuing_country?.value,
      expirationDate:
        properties.expiration_date?.value || properties.expiry_date?.value,
      gender: properties.gender?.value || properties.sex?.value,

      // Additional fields that might be available
      fullName: properties.full_name?.value,
      address: properties.address?.value,
      issuingAuthority: properties.issuing_authority?.value,
      documentType: properties.document_type?.value,

      // Raw data
      rawProperties: properties,

      // Report metadata
      reportId: documentReport.id,
      reportCreatedAt: documentReport.created_at,
      reportCompletedAt: documentReport.completed_at,
    };

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
          .filter(
            ([key, value]) =>
              value && typeof value === "string" && !key.startsWith("raw")
          )
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      );
    }

    return res.json({
      success: true,
      data: {
        extractedData,
        reportId: documentReport.id,
        checkId,
        hasExtractedData,
      },
    });
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

    // Override headers for this request if custom token provided
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    console.log(
      "Fetching document by ID:",
      documentId,
      "using production mode:",
      isProduction
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

    return res.json({
      success: true,
      data: response.data,
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
