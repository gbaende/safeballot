import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";

// BlinkID Service Configuration
const BLINKID_LICENSE_KEY =
  process.env.REACT_APP_BLINKID_LICENSE_KEY || "demo-license-key";
const BLINKID_ENGINE_LOCATION = "/blinkid-engine";

class BlinkIDService {
  constructor() {
    this.wasmSDK = null;
    this.recognizer = null;
    this.recognizerRunner = null;
    this.videoRecognizer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize BlinkID SDK
   */
  async initialize(licenseKey) {
    try {
      if (this.isInitialized) {
        return { success: true, message: "BlinkID already initialized" };
      }

      console.log("Initializing BlinkID SDK...");

      // Check if license key is provided and valid
      if (!licenseKey || licenseKey === "your_blinkid_license_key_here") {
        throw new Error(
          "Valid BlinkID license key required. Please get a license from https://microblink.com"
        );
      }

      // Check if browser is supported
      if (!BlinkIDSDK.isBrowserSupported()) {
        throw new Error("Browser not supported by BlinkID SDK");
      }

      // Initialize the SDK
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
      loadSettings.engineLocation = "/resources/";
      this.wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);

      // Create recognizer
      this.recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
        this.wasmSDK
      );

      // Create recognizer runner
      this.recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
        this.wasmSDK,
        [this.recognizer],
        false
      );

      this.isInitialized = true;
      console.log("BlinkID SDK initialized successfully");

      return {
        success: true,
        message: "BlinkID SDK initialized successfully",
      };
    } catch (error) {
      console.error("Failed to initialize BlinkID SDK:", error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isReady() {
    return (
      this.isInitialized &&
      this.wasmSDK &&
      this.recognizer &&
      this.recognizerRunner
    );
  }

  /**
   * Get SDK instance
   */
  getSDK() {
    return this.wasmSDK;
  }

  /**
   * Get recognizer instance
   */
  getRecognizer() {
    return this.recognizer;
  }

  /**
   * Start video recognition
   */
  async startVideoRecognition(videoElement) {
    if (!this.isInitialized) {
      throw new Error("BlinkID SDK not initialized");
    }

    try {
      this.videoRecognizer =
        await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoElement,
          this.recognizerRunner
        );

      const processResult = await this.videoRecognizer.recognize();

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const recognitionResult = await this.recognizer.getResult();
        return this.formatResult(recognitionResult);
      } else {
        throw new Error("Recognition was not successful");
      }
    } catch (error) {
      console.error("Video recognition failed:", error);
      throw error;
    }
  }

  /**
   * Process document image
   */
  async processImage(imageElement) {
    if (!this.isInitialized) {
      throw new Error("BlinkID SDK not initialized");
    }

    try {
      const imageFrame = BlinkIDSDK.captureFrame(imageElement);
      const processResult = await this.recognizerRunner.processImage(
        imageFrame
      );

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const recognitionResult = await this.recognizer.getResult();
        return this.formatResult(recognitionResult);
      } else {
        throw new Error("Image recognition was not successful");
      }
    } catch (error) {
      console.error("Image processing failed:", error);
      throw error;
    }
  }

  formatResult(result) {
    return {
      firstName: result.firstName || "",
      lastName: result.lastName || "",
      fullName: result.fullName || "",
      address: result.address || "",
      dateOfBirth: result.dateOfBirth || null,
      dateOfIssue: result.dateOfIssue || null,
      dateOfExpiry: result.dateOfExpiry || null,
      documentNumber: result.documentNumber || "",
      personalIdNumber: result.personalIdNumber || "",
      sex: result.sex || "",
      nationality: result.nationality || "",
      issuer: result.issuer || "",
      faceImage: result.faceImage || null,
      fullDocumentImage: result.fullDocumentImage || null,
      signatureImage: result.signatureImage || null,
      processingStatus: result.processingStatus || "Unknown",
      recognitionMode: result.recognitionMode || "Unknown",
    };
  }

  /**
   * Extract structured data from BlinkID result
   */
  extractDocumentData(result) {
    const data = result.recognitionResult || {};

    return {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      fullName:
        data.fullName ||
        `${data.firstName || ""} ${data.lastName || ""}`.trim(),
      dateOfBirth: data.dateOfBirth || "",
      documentNumber: data.documentNumber || "",
      expiryDate: data.dateOfExpiry || "",
      nationality: data.nationality || "",
      issuingCountry: data.issuingCountry || "",
      issuingState: data.issuingState || "",
      documentType: data.documentType || "unknown",
      address: data.address || "",
      sex: data.sex || "",
      personalIdNumber: data.personalIdNumber || "",
      // Additional fields that might be available
      placeOfBirth: data.placeOfBirth || "",
      issuingAuthority: data.issuingAuthority || "",
      restrictions: data.restrictions || "",
      endorsements: data.endorsements || "",
      vehicleClass: data.vehicleClass || "",
    };
  }

  /**
   * Convert File to Image Element
   */
  fileToImageElement(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate document data
   */
  validateDocumentData(data) {
    const errors = [];

    if (!data.firstName && !data.lastName && !data.fullName) {
      errors.push("Name information is missing");
    }

    if (!data.dateOfBirth) {
      errors.push("Date of birth is missing");
    }

    if (!data.documentNumber) {
      errors.push("Document number is missing");
    }

    // Check if date of birth is valid
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const now = new Date();
      if (dob > now) {
        errors.push("Date of birth cannot be in the future");
      }

      const age = now.getFullYear() - dob.getFullYear();
      if (age < 18) {
        errors.push("Must be 18 years or older");
      }
    }

    // Check if document is expired
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate);
      const now = new Date();
      if (expiry < now) {
        errors.push("Document has expired");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format document data for display
   */
  formatDocumentData(data) {
    return {
      "Full Name": data.fullName || `${data.firstName} ${data.lastName}`,
      "Date of Birth": this.formatDate(data.dateOfBirth),
      "Document Number": data.documentNumber,
      "Document Type": this.formatDocumentType(data.documentType),
      Nationality: data.nationality,
      "Issuing Country": data.issuingCountry,
      "Issuing State": data.issuingState,
      "Expiry Date": this.formatDate(data.expiryDate),
      Address: data.address,
      Sex: data.sex,
    };
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return "Not available";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Format document type for display
   */
  formatDocumentType(type) {
    const typeMap = {
      driving_license: "Driving License",
      passport: "Passport",
      national_identity_card: "National ID Card",
      residence_permit: "Residence Permit",
      unknown: "Unknown Document",
    };

    return typeMap[type] || type || "Unknown Document";
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      if (this.videoRecognizer) {
        this.videoRecognizer.releaseVideoFeed();
        this.videoRecognizer = null;
      }

      if (this.recognizerRunner) {
        this.recognizerRunner.delete();
        this.recognizerRunner = null;
      }

      if (this.recognizer) {
        this.recognizer.delete();
        this.recognizer = null;
      }

      this.wasmSDK = null;
      this.isInitialized = false;
      console.log("BlinkID SDK cleaned up successfully");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Get supported document types
   */
  getSupportedDocumentTypes() {
    return [
      "driving_license",
      "passport",
      "national_identity_card",
      "residence_permit",
    ];
  }

  /**
   * Check browser compatibility
   */
  checkBrowserCompatibility() {
    const isCompatible =
      "MediaDevices" in window &&
      "getUserMedia" in navigator.mediaDevices &&
      "WebAssembly" in window &&
      "Worker" in window;

    return {
      isCompatible,
      features: {
        mediaDevices: "MediaDevices" in window,
        getUserMedia: "getUserMedia" in navigator.mediaDevices,
        webAssembly: "WebAssembly" in window,
        webWorkers: "Worker" in window,
      },
    };
  }

  isBrowserSupported() {
    return BlinkIDSDK.isBrowserSupported();
  }
}

// Create singleton instance
const blinkidService = new BlinkIDService();

export default blinkidService;
