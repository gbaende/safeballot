import api from "./api";

// Get API token from environment variables or use production token
const ONFIDO_API_TOKEN =
  process.env.REACT_APP_ONFIDO_API_TOKEN ||
  "api_live.ivHWUptu69y.K8TMvNhLKLqCWYjqhtn-v90qMwHCWpnM";
const ONFIDO_ENV = process.env.REACT_APP_ONFIDO_ENV || "production";

// Always use production mode - forcing it here to ensure it's used
const isProductionMode = true;

// Helper to log with environment context
const logWithEnv = (message) => {
  console.log(`onfidoService [${ONFIDO_ENV}]: ${message}`);
};

const onfidoService = {
  /**
   * Check if we're running in production mode
   * @returns {boolean} True if running in production mode
   */
  isProduction: () => {
    return isProductionMode;
  },

  /**
   * Get the current environment (sandbox or production)
   * @returns {string} The current environment
   */
  getEnvironment: () => {
    return ONFIDO_ENV;
  },

  /**
   * Create an applicant in Onfido
   * @param {string} firstName - First name of the applicant
   * @param {string} lastName - Last name of the applicant
   * @param {string} email - Email of the applicant
   * @returns {Promise<Object>} Response from Onfido API
   */
  createApplicant: async (firstName, lastName, email) => {
    try {
      logWithEnv(
        `Creating applicant: ${firstName} ${lastName} (production mode)`
      );

      const response = await api.post("/onfido/applicant", {
        firstName,
        lastName,
        email,
        apiToken: ONFIDO_API_TOKEN,
        isProduction: isProductionMode,
      });

      logWithEnv(`Applicant created: ${response.data.data.id}`);
      return response.data;
    } catch (error) {
      logWithEnv(`Error creating applicant: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Generate an SDK token for frontend use
   * @param {string} applicantId - ID of the applicant
   * @returns {Promise<Object>} Response containing SDK token
   */
  generateSdkToken: async (applicantId) => {
    try {
      logWithEnv(
        `Generating SDK token for applicant: ${applicantId} (production mode)`
      );

      const response = await api.post("/onfido/token", {
        applicantId,
        apiToken: ONFIDO_API_TOKEN,
        isProduction: isProductionMode,
        referrer: window.location.origin + "/*", // Keep this for referrer security
      });

      logWithEnv("SDK token generated successfully");
      logWithEnv(
        `production mode: ${isProductionMode ? "enabled" : "disabled"}`
      );

      return response.data;
    } catch (error) {
      logWithEnv(`Error generating SDK token: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a check for an applicant
   * @param {string} applicantId - ID of the applicant
   * @returns {Promise<Object>} Response from Onfido API
   */
  createCheck: async (applicantId) => {
    try {
      logWithEnv(
        `Creating check for applicant: ${applicantId} (production mode)`
      );

      const response = await api.post("/onfido/check", {
        applicantId,
        apiToken: ONFIDO_API_TOKEN,
        isProduction: isProductionMode,
      });

      logWithEnv(`Check created: ${response.data.data.id}`);
      return response.data;
    } catch (error) {
      logWithEnv(`Error creating check: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Extract document data from a check
   * @param {string} checkId - ID of the check
   * @returns {Promise<Object>} Response containing extracted document data
   */
  extractDocumentData: async (checkId) => {
    try {
      logWithEnv(
        `Extracting document data from check: ${checkId} (production mode)`
      );

      const response = await api.get(`/onfido/check/${checkId}/extract`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          isProduction: isProductionMode,
        },
      });

      logWithEnv(`Document data extracted successfully from check: ${checkId}`);
      return response.data;
    } catch (error) {
      logWithEnv(`Error extracting document data: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch document by ID directly from Onfido API
   * @param {string} documentId - ID of the document
   * @param {string} sdkToken - SDK token for authentication
   * @returns {Promise<Object>} Document data
   */
  fetchDocument: async (documentId, sdkToken) => {
    try {
      logWithEnv(`Fetching document: ${documentId} (production mode)`);

      const response = await api.get(`/onfido/document/${documentId}`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          sdkToken: sdkToken,
          isProduction: isProductionMode,
        },
      });

      logWithEnv(`Document fetched successfully: ${documentId}`);
      return response.data;
    } catch (error) {
      logWithEnv(`Error fetching document: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get document by ID (alias for fetchDocument to match backend routes)
   * @param {string} documentId - ID of the document
   * @param {string} sdkToken - SDK token for authentication
   * @returns {Promise<Object>} Document data
   */
  getDocumentById: async (documentId, sdkToken) => {
    return onfidoService.fetchDocument(documentId, sdkToken);
  },

  /**
   * Extract text from document image using OCR
   * @param {string} documentId - ID of the document
   * @returns {Promise<Object>} Extracted text data
   */
  extractTextFromDocument: async (documentId) => {
    try {
      logWithEnv(
        `Extracting text from document: ${documentId} (production mode)`
      );

      const response = await api.get(`/onfido/document/${documentId}/ocr`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          isProduction: isProductionMode,
        },
      });

      logWithEnv(`OCR extraction successful for document: ${documentId}`);
      return response.data;
    } catch (error) {
      logWithEnv(`Error extracting text from document: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get document OCR data (alias for extractTextFromDocument to match backend routes)
   * @param {string} documentId - ID of the document
   * @returns {Promise<Object>} OCR data
   */
  getDocumentOcr: async (documentId) => {
    return onfidoService.extractTextFromDocument(documentId);
  },

  /**
   * Get debug token info - useful during development
   */
  debugToken: async () => {
    try {
      logWithEnv("Getting debug token info");
      return {
        apiToken: ONFIDO_API_TOKEN
          ? ONFIDO_API_TOKEN.substring(0, 10) + "..."
          : "Not set",
        environment: ONFIDO_ENV,
        isProduction: isProductionMode,
      };
    } catch (error) {
      logWithEnv(`Error getting debug token info: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Poll a check until it's complete
   * @param {string} checkId - ID of the check to poll
   * @param {number} timeout - Timeout in seconds between polling attempts (default: 5)
   * @param {number} maxAttempts - Maximum number of polling attempts (default: 10)
   * @returns {Promise<Object>} Response containing check data
   */
  pollCheck: async (checkId, timeout = 5, maxAttempts = 10) => {
    try {
      logWithEnv(`Polling check ${checkId} for completion (production mode)`);

      const response = await api.get(`/onfido/check/${checkId}/poll`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          isProduction: isProductionMode,
          timeout,
          maxAttempts,
        },
      });

      if (response.data?.data?.isComplete) {
        logWithEnv(`Check ${checkId} is complete`);
      } else {
        logWithEnv(`Check ${checkId} is still processing after polling`);
      }

      return response.data;
    } catch (error) {
      logWithEnv(`Error polling check: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

export default onfidoService;
