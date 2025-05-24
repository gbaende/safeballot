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
   * Validate that we have a properly configured token
   * @returns {Object} Validation result
   */
  validateToken: () => {
    try {
      // Check if token exists
      if (!ONFIDO_API_TOKEN) {
        return {
          valid: false,
          error: "No API token configured",
          environment: ONFIDO_ENV,
        };
      }

      // Check token type
      const isSandbox = ONFIDO_API_TOKEN.startsWith("api_sandbox");
      const isLive = ONFIDO_API_TOKEN.startsWith("api_live");

      if (!isSandbox && !isLive) {
        return {
          valid: false,
          error:
            "Invalid token format - must start with api_sandbox or api_live",
          environment: ONFIDO_ENV,
        };
      }

      // Check token/environment mismatch
      if (isSandbox && isProductionMode) {
        console.warn("Warning: Using sandbox token in production mode");
      }

      if (isLive && !isProductionMode) {
        console.warn("Warning: Using live token in sandbox mode");
      }

      return {
        valid: true,
        environment: ONFIDO_ENV,
        isProduction: isProductionMode,
        tokenType: isSandbox ? "sandbox" : "live",
        tokenMatches:
          (isSandbox && !isProductionMode) || (isLive && isProductionMode),
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        environment: ONFIDO_ENV,
      };
    }
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
   * @param {array} documentIds - IDs of the documents to include in the check (optional)
   * @returns {Promise<Object>} Response from Onfido API
   */
  createCheck: async (applicantId, documentIds = []) => {
    try {
      logWithEnv(
        `Creating check for applicant: ${applicantId} (production mode)`
      );

      // Prepare the request payload with the correct format
      const payload = {
        applicantId,
        apiToken: ONFIDO_API_TOKEN,
        isProduction: isProductionMode,
        // Required by Onfido API - need "document" report to extract data
        report_names: ["document"],
      };

      // Add document_ids if provided
      if (documentIds && documentIds.length > 0) {
        payload.document_ids = documentIds;
        logWithEnv(
          `Including document IDs in check: ${documentIds.join(", ")}`
        );
      }

      // Log the full payload for debugging
      console.log(
        "Creating check with payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await api.post("/onfido/check", payload);

      // Log the raw response
      console.log(
        "Check creation raw response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.success) {
        logWithEnv(`Check created: ${response.data.data.id}`);
      }
      return response.data;
    } catch (error) {
      logWithEnv(`Error creating check: ${error.message}`);
      console.error(
        "Check creation error details:",
        error.response?.data || error
      );
      return { success: false, error: error.message };
    }
  },

  /**
   * Extract document data from a check
   * @param {string} checkId - ID of the check
   * @param {number} attempts - Number of polling attempts (default: 10)
   * @param {number} wait - Seconds to wait between attempts (default: 2)
   * @param {boolean} debug - Enable detailed debug logging on server
   * @returns {Promise<Object>} Response containing extracted document data
   */
  extractDocumentData: async (
    checkId,
    attempts = 10,
    wait = 2,
    debug = false
  ) => {
    try {
      logWithEnv(
        `Extracting document data from check: ${checkId} (production mode, max attempts: ${attempts}, debug: ${debug})`
      );

      // First poll the check until it's complete
      const pollResult = await onfidoService.pollCheck(checkId, wait, attempts);

      if (!pollResult.success) {
        logWithEnv(`Polling failed for check: ${checkId}: ${pollResult.error}`);
        return pollResult;
      }

      if (!pollResult.data?.isComplete) {
        logWithEnv(`Check ${checkId} did not complete within the allowed time`);
        return {
          success: false,
          error: "Check did not complete within the allowed time",
        };
      }

      // If the check is complete, extract document data
      const response = await api.get(`/onfido/check/${checkId}/extract`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          isProduction: isProductionMode,
          debug,
        },
      });

      if (response.data.success) {
        logWithEnv(
          `Document data extracted successfully from check: ${checkId}`
        );
        // Log raw report data for debugging
        if (debug && response.data.report) {
          console.log(
            ">> Raw report payload:",
            JSON.stringify(response.data.report, null, 2)
          );
        }
        // Return the direct response data for easy access - no longer nested
        return response.data;
      } else {
        logWithEnv(
          `Document data extraction failed for ${checkId}: ${response.data.error}`
        );
        return response.data;
      }
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

      // Log the full OCR response for debugging
      console.log("OCR returned:", JSON.stringify(response.data, null, 2));

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
   * @returns {Promise<Object>} OCR data with extracted fields at the top level
   */
  getDocumentOcr: async (documentId) => {
    try {
      logWithEnv(
        `Getting OCR data for document: ${documentId} (production mode)`
      );

      const response = await api.get(`/onfido/document/${documentId}/ocr`, {
        params: {
          apiToken: ONFIDO_API_TOKEN,
          isProduction: isProductionMode,
        },
      });

      // Log the raw OCR response
      console.log("Frontend OCR raw:", response.data);

      if (response.data.success) {
        logWithEnv(`OCR data retrieved successfully for: ${documentId}`);
      }

      return response.data;
    } catch (error) {
      logWithEnv(`Error getting OCR data: ${error.message}`);
      return { success: false, error: error.message };
    }
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
   * @param {number} timeout - Timeout in seconds between polling attempts (default: 2)
   * @param {number} maxAttempts - Maximum number of polling attempts (default: 10)
   * @returns {Promise<Object>} Response containing check data
   */
  pollCheck: async (checkId, timeout = 2, maxAttempts = 10) => {
    try {
      logWithEnv(`Polling check ${checkId} for completion (production mode)`);

      let attempts = 0;
      let isComplete = false;
      let latestResponse = null;

      while (attempts < maxAttempts && !isComplete) {
        attempts++;
        logWithEnv(
          `Poll attempt ${attempts}/${maxAttempts} for check ${checkId}`
        );

        try {
          // Get the check status
          const response = await api.get(`/onfido/check/${checkId}`, {
            params: {
              apiToken: ONFIDO_API_TOKEN,
              isProduction: isProductionMode,
            },
          });

          latestResponse = response.data;

          // Log raw check response for debugging
          console.log(
            `Raw check response (attempt ${attempts}):`,
            JSON.stringify(response.data, null, 2)
          );

          // Check if reports are complete
          if (response.data.success && response.data.data) {
            const reports = response.data.data.reports || [];
            const documentReport = reports.find(
              (report) => report.name === "document"
            );

            if (documentReport) {
              console.log(`Document report status: ${documentReport.status}`);

              if (documentReport.status === "complete") {
                isComplete = true;
                logWithEnv(
                  `Check ${checkId} is complete after ${attempts} attempts`
                );

                // Log the complete report for debugging
                console.log("Raw Onfido report response:", documentReport);
                if (
                  documentReport.result &&
                  documentReport.result.extracted_data
                ) {
                  console.log(
                    "Extracted data:",
                    documentReport.result.extracted_data
                  );
                }

                break;
              }
            }
          }

          if (!isComplete && attempts < maxAttempts) {
            // Wait before the next poll
            await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
          }
        } catch (pollError) {
          logWithEnv(
            `Error polling check (attempt ${attempts}): ${pollError.message}`
          );
          if (attempts >= maxAttempts) throw pollError;

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
        }
      }

      if (!isComplete) {
        logWithEnv(
          `Check ${checkId} did not complete after ${maxAttempts} attempts`
        );
        return {
          success: false,
          error: `Check did not complete after ${maxAttempts} attempts`,
          data: latestResponse?.data,
        };
      }

      return {
        success: true,
        data: {
          ...latestResponse?.data,
          isComplete: true,
        },
      };
    } catch (error) {
      logWithEnv(`Error polling check: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a check and poll for results in a single request
   * @param {string} applicantId - ID of the applicant
   * @param {array} documentIds - IDs of the documents to include in the check (optional)
   * @param {number} maxAttempts - Maximum number of polling attempts (default: 5)
   * @param {number} waitTime - Seconds to wait between attempts (default: 2)
   * @returns {Promise<Object>} Response with polling results
   */
  createCheckAndPoll: async (
    applicantId,
    documentIds = [],
    maxAttempts = 5,
    waitTime = 2
  ) => {
    try {
      logWithEnv(
        `Creating check with polling for applicant: ${applicantId} (max attempts: ${maxAttempts})`
      );

      // Prepare the request payload
      const payload = {
        applicantId,
        apiToken: ONFIDO_API_TOKEN,
        isProduction: isProductionMode,
        report_names: ["document"],
        document_ids: documentIds,
        maxAttempts,
        waitTime,
      };

      if (documentIds && documentIds.length > 0) {
        logWithEnv(`Including document IDs: ${documentIds.join(", ")}`);
      }

      // Log the payload for debugging
      console.log(
        "Creating check with polling, payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await api.post("/onfido/check/poll", payload);

      if (response.data.success) {
        const isComplete = response.data.data.pollingComplete;
        logWithEnv(
          `Check created and polling completed: ${isComplete ? "yes" : "no"}`
        );

        if (isComplete) {
          logWithEnv(
            `Retrieved complete check data after ${response.data.data.attempts} attempts`
          );

          // Log check data for debugging
          if (response.data.data.finalCheckData?.reportData) {
            console.log(
              "Document report data:",
              JSON.stringify(
                response.data.data.finalCheckData.reportData,
                null,
                2
              )
            );
          }
        } else {
          logWithEnv(
            `Check not complete after ${response.data.data.attempts} attempts`
          );
        }
      }

      return response.data;
    } catch (error) {
      logWithEnv(`Error creating check with polling: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

export default onfidoService;
