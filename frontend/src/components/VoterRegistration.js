import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";
import "./VoterRegistration.css";

const VoterRegistration = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    ssn: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showIdScanner, setShowIdScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required";
    if (!formData.ssn.trim()) newErrors.ssn = "SSN is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (basic)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    // SSN validation (basic)
    if (formData.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(formData.ssn)) {
      newErrors.ssn = "Please enter a valid SSN (XXX-XX-XXXX)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/voter-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate("/registration-success");
      } else {
        const errorData = await response.json();
        setErrors({
          submit: errorData.message || "Registration failed. Please try again.",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        submit: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startIdScanning = async () => {
    setShowIdScanner(true);

    try {
      const licenseKey = process.env.REACT_APP_BLINKID_LICENSE_KEY;

      // Check if license key is provided and valid
      if (!licenseKey || licenseKey === "your_blinkid_license_key_here") {
        throw new Error(
          "Valid BlinkID license key required. Please get a license from https://microblink.com"
        );
      }

      // Check if browser is supported
      if (!BlinkIDSDK.isBrowserSupported()) {
        throw new Error("Browser not supported for ID scanning");
      }

      // Initialize the SDK
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
      loadSettings.engineLocation = "/resources/";

      const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);

      // Create recognizer
      const recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
        wasmSDK
      );
      const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
        wasmSDK,
        [recognizer],
        true
      );

      // Start video recognition
      const videoRecognizer =
        await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoRef.current,
          recognizerRunner
        );

      const processResult = await videoRecognizer.recognize();

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const recognitionResult = await recognizer.getResult();
        console.log("Recognition result:", recognitionResult);

        // Extract data and populate form
        if (recognitionResult.firstName) {
          setFormData((prev) => ({
            ...prev,
            firstName:
              recognitionResult.firstName.description ||
              recognitionResult.firstName,
          }));
        }

        if (recognitionResult.lastName) {
          setFormData((prev) => ({
            ...prev,
            lastName:
              recognitionResult.lastName.description ||
              recognitionResult.lastName,
          }));
        }

        if (recognitionResult.dateOfBirth) {
          const dob =
            recognitionResult.dateOfBirth.originalDateString ||
            recognitionResult.dateOfBirth;
          setFormData((prev) => ({
            ...prev,
            dateOfBirth: dob,
          }));
        }

        if (recognitionResult.address) {
          setFormData((prev) => ({
            ...prev,
            address:
              recognitionResult.address.description ||
              recognitionResult.address,
          }));
        }

        setScanResult(recognitionResult);
      }

      // Clean up
      videoRecognizer.releaseVideoFeed();
      recognizerRunner.delete();
      recognizer.delete();
    } catch (error) {
      console.error("ID scanning error:", error);
      setErrors({
        scan: "Failed to scan ID. Please try again or fill the form manually.",
      });
    } finally {
      setShowIdScanner(false);
    }
  };

  const stopIdScanning = () => {
    setShowIdScanner(false);
  };

  return (
    <div className="voter-registration">
      <div className="registration-container">
        <h1>Voter Registration</h1>
        <p className="registration-subtitle">
          Register to vote and make your voice heard in our democracy
        </p>

        {errors.submit && (
          <div className="error-message global-error">{errors.submit}</div>
        )}

        {errors.scan && (
          <div className="error-message global-error">{errors.scan}</div>
        )}

        <div className="id-scanner-section">
          <button
            type="button"
            onClick={startIdScanning}
            className="scan-id-button"
            disabled={showIdScanner}
          >
            {showIdScanner ? "Scanning..." : "Scan ID to Auto-Fill"}
          </button>

          {showIdScanner && (
            <div className="scanner-modal">
              <div className="scanner-content">
                <h3>Position your ID in the camera view</h3>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="scanner-video"
                />
                <button onClick={stopIdScanning} className="stop-scan-button">
                  Cancel Scan
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? "error" : ""}
                required
              />
              {errors.firstName && (
                <span className="error-message">{errors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? "error" : ""}
                required
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth *</label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className={errors.dateOfBirth ? "error" : ""}
              required
            />
            {errors.dateOfBirth && (
              <span className="error-message">{errors.dateOfBirth}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address">Street Address *</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={errors.address ? "error" : ""}
              required
            />
            {errors.address && (
              <span className="error-message">{errors.address}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={errors.city ? "error" : ""}
                required
              />
              {errors.city && (
                <span className="error-message">{errors.city}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="state">State *</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className={errors.state ? "error" : ""}
                required
              >
                <option value="">Select State</option>
                <option value="AL">Alabama</option>
                <option value="AK">Alaska</option>
                <option value="AZ">Arizona</option>
                <option value="AR">Arkansas</option>
                <option value="CA">California</option>
                <option value="CO">Colorado</option>
                <option value="CT">Connecticut</option>
                <option value="DE">Delaware</option>
                <option value="FL">Florida</option>
                <option value="GA">Georgia</option>
                {/* Add more states as needed */}
              </select>
              {errors.state && (
                <span className="error-message">{errors.state}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code *</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className={errors.zipCode ? "error" : ""}
                required
              />
              {errors.zipCode && (
                <span className="error-message">{errors.zipCode}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ssn">Social Security Number *</label>
            <input
              type="text"
              id="ssn"
              name="ssn"
              value={formData.ssn}
              onChange={handleInputChange}
              className={errors.ssn ? "error" : ""}
              placeholder="XXX-XX-XXXX"
              required
            />
            {errors.ssn && <span className="error-message">{errors.ssn}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? "error" : ""}
                required
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={errors.phone ? "error" : ""}
                placeholder="(555) 123-4567"
                required
              />
              {errors.phone && (
                <span className="error-message">{errors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Register to Vote"}
            </button>
          </div>
        </form>

        {scanResult && (
          <div className="scan-result">
            <h3>Scan Results</h3>
            <pre>{JSON.stringify(scanResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterRegistration;
