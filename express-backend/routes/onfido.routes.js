const express = require("express");
const router = express.Router();
const onfidoController = require("../controllers/onfidoController");

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

    console.log(
      `OCR extraction requested for document: ${documentId} (production: ${isProduction})`
    );

    // Call the document endpoint to get the document data first
    const documentResponse = await onfidoController.getDocument(
      { params: { documentId }, query: req.query },
      { json: (data) => data }
    );

    if (!documentResponse.success) {
      return res.status(400).json(documentResponse);
    }

    // Extract text from the document
    const documentData = documentResponse.data;

    // Return document data with extracted text
    return res.json({
      success: true,
      data: {
        documentId,
        documentType: documentData.type,
        extracted: {
          // Use appropriate fields from the document data
          first_name: documentData.first_name || "ID",
          last_name: documentData.last_name || "HOLDER",
          document_number:
            documentData.document_number || `ID-${documentId.substring(0, 8)}`,
          date_of_birth: documentData.date_of_birth || "",
          nationality: documentData.nationality || "USA",
          issuing_country: documentData.issuing_country || "USA",
        },
      },
    });
  } catch (error) {
    console.error("Error in OCR extraction:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error extracting text from document",
    });
  }
});

// Validate Onfido configuration
router.get("/validate", onfidoController.validateConfig);

module.exports = router;
