const express = require("express");
const router = express.Router();
const onfidoController = require("../controllers/onfidoController");
const axios = require("axios");

// Create applicant
router.post("/applicant", onfidoController.createApplicant);

// Generate SDK token
router.post("/token", onfidoController.generateSdkToken);

// Create check
router.post("/check", onfidoController.createCheck);

// Get check result
router.get("/check/:checkId", onfidoController.getCheck);

// Extract document data from check
router.get("/check/:checkId/extract", onfidoController.extractDocumentData);

// Get document by ID
router.get("/document/:documentId", onfidoController.getDocument);

// Extract text from document using OCR
router.get("/document/:documentId/ocr", async (req, res) => {
  try {
    const { documentId } = req.params;
    const apiToken = req.query.apiToken || process.env.ONFIDO_API_KEY;
    const isProduction = req.query.isProduction !== false;
    const debug = req.query.debug === "true";

    console.log(
      `OCR extraction requested for document: ${documentId} (production: ${isProduction}, token type: ${
        apiToken.startsWith("api_sandbox") ? "SANDBOX" : "LIVE"
      })`
    );

    // Log request details for debugging
    if (debug) {
      console.log(`OCR request details:
        Document ID: ${documentId}
        API Token: ${
          apiToken ? apiToken.substring(0, 15) + "..." : "NOT PROVIDED"
        }
        Production Mode: ${isProduction}
        API URL: https://api.onfido.com/v3/documents/${documentId}/ocr
      `);
    }

    try {
      // Make a direct call to the Onfido OCR API
      const ocrResponse = await axios.get(
        `https://api.onfido.com/v3/documents/${documentId}/ocr`,
        {
          headers: {
            Authorization: `Token token=${apiToken}`,
            Accept: "application/json",
          },
          validateStatus: (status) => status < 500, // Accept any status < 500 to handle 400s
        }
      );

      // Log the raw response
      console.log("OCR returned status:", ocrResponse.status);
      console.log("OCR returned headers:", ocrResponse.headers);
      console.log("OCR returned:", ocrResponse.data);

      // Handle 400-level errors from Onfido API
      if (ocrResponse.status >= 400) {
        console.warn(
          `OCR returned a ${ocrResponse.status} error:`,
          ocrResponse.data
        );

        // Try alternative approach - get document details directly
        console.log("OCR failed, trying to get document details instead");
        const docResponse = await axios.get(
          `https://api.onfido.com/v3/documents/${documentId}`,
          { headers: { Authorization: `Token token=${apiToken}` } }
        );

        console.log("Document details retrieved:", docResponse.data);

        // Create synthetic OCR response from document details
        return res.json({
          success: true,
          extracted: {
            // Basic fields from document details
            document_type: docResponse.data.type || "unknown",
            issuing_country: docResponse.data.issuing_country || "unknown",
            // Empty placeholder for other fields
            first_name: "",
            last_name: "",
            document_number: "",
            date_of_birth: "",
          },
          message: "OCR processing failed, using document metadata instead",
          _sourceType: "document_details",
          _documentDetails: docResponse.data,
        });
      }

      // Return the data directly
      return res.json({
        success: true,
        ...ocrResponse.data,
      });
    } catch (err) {
      console.error("OCR error:", err.response?.data || err);

      // Fallback to a minimal response with an error message
      return res.json({
        success: true, // Still return success to allow client to continue
        extracted: {
          document_type: "unknown",
          issuing_country: "unknown",
          first_name: "",
          last_name: "",
          document_number: "",
          date_of_birth: "",
        },
        message: "OCR processing failed, using empty placeholder data",
        error: err.message,
        _sourceType: "fallback",
      });
    }
  } catch (err) {
    console.error("OCR endpoint error:", err.response?.data || err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Validate Onfido configuration
router.get("/validate", onfidoController.validateConfig);

// Add a route for the new createCheckAndPoll function
router.post("/check/poll", onfidoController.createCheckAndPoll);

// Get document report from check
router.get("/check/:checkId/reports/document", async (req, res) => {
  try {
    const { checkId } = req.params;
    const apiToken = req.query.apiToken || process.env.ONFIDO_API_KEY;
    const isProduction = req.query.isProduction !== false;

    console.log(
      `Getting document report for check: ${checkId} (production: ${isProduction})`
    );

    // Set up headers for the Onfido API call
    const headers = {
      Authorization: `Token token=${apiToken}`,
      "Content-Type": "application/json",
    };

    // First, get check to find the document report ID
    const checkResponse = await axios.get(
      `https://api.onfido.com/v3/checks/${checkId}`,
      { headers }
    );

    // Find the document report
    const documentReport = checkResponse.data.reports.find(
      (report) => report.name === "document"
    );

    if (!documentReport) {
      return res.status(404).json({
        success: false,
        error: "Document report not found in check",
      });
    }

    // Get the report details
    const reportResponse = await axios.get(
      `https://api.onfido.com/v3/reports/${documentReport.id}`,
      { headers }
    );

    console.log("Document report fetched successfully:", documentReport.id);

    // Log the full report
    console.log("Raw Onfido report:", reportResponse.data);

    // Return the report data
    return res.json({
      success: true,
      ...reportResponse.data,
    });
  } catch (err) {
    console.error("Error fetching document report:", err.response?.data || err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
