import React, { useState, useRef, useEffect } from "react";
import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";

const BlinkIDTest = () => {
  const [testResults, setTestResults] = useState({
    browserSupport: null,
    sdkLoaded: null,
    licenseValid: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsLoading(true);
    const results = {
      browserSupport: null,
      sdkLoaded: null,
      licenseValid: null,
      error: null,
    };

    try {
      // Test 1: Browser Support
      console.log("Testing browser support...");
      results.browserSupport = BlinkIDSDK.isBrowserSupported();
      console.log("Browser supported:", results.browserSupport);

      if (!results.browserSupported) {
        results.error = "Browser not supported";
        setTestResults(results);
        setIsLoading(false);
        return;
      }

      // Test 2: SDK Loading with demo license
      console.log("Testing SDK loading...");
      const licenseKey = process.env.REACT_APP_BLINKID_LICENSE_KEY;

      if (!licenseKey || licenseKey === "your_blinkid_license_key_here") {
        results.error = "No license key provided";
        results.licenseValid = false;
        setTestResults(results);
        setIsLoading(false);
        return;
      }

      try {
        const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
        loadSettings.engineLocation = "/resources/";
        loadSettings.allowHelloMessage = true;

        const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);
        results.sdkLoaded = true;
        results.licenseValid = true;
        console.log("SDK loaded successfully");

        // Test recognizer creation
        const recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
          wasmSDK
        );
        console.log("Recognizer created successfully");

        // Cleanup
        recognizer.delete();
        wasmSDK.delete();
      } catch (sdkError) {
        console.error("SDK Error:", sdkError);
        results.sdkLoaded = false;

        if (sdkError.message.includes("licence is invalid")) {
          results.licenseValid = false;
          results.error =
            "License key is for wrong product (Capture vs BlinkID)";
        } else {
          results.error = sdkError.message;
        }
      }
    } catch (error) {
      console.error("Test error:", error);
      results.error = error.message;
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testWithDemoLicense = async () => {
    setIsLoading(true);

    try {
      // Try with a known working demo license for testing
      const demoLicense =
        "sRwCABJsb2NhbGhvc3QGbGV5SkRjbVZoZEdWa1QyNGlPakUzTkRnNU9USTVNekkzTnpjc0lrTnlaV0YwWldSR2IzSWlPaUkxTXpZMk1XUmxOaTFtWTJReUxUUXpPREl0WVRCaFpDMHpZV0ZsWXpFNE5qVTFZak1pZlE9PQ==";

      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(demoLicense);
      loadSettings.engineLocation = "/resources/";

      const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);

      setTestResults((prev) => ({
        ...prev,
        licenseValid: true,
        sdkLoaded: true,
        error: null,
      }));

      console.log("Demo license test successful");
      wasmSDK.delete();
    } catch (error) {
      console.error("Demo license test failed:", error);
      setTestResults((prev) => ({
        ...prev,
        error: `Demo test failed: ${error.message}`,
      }));
    }

    setIsLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>BlinkID Integration Test</h2>

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div>Testing BlinkID integration...</div>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h3>Test Results:</h3>

        <div
          style={{
            background: "#f5f5f5",
            padding: "15px",
            borderRadius: "5px",
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <strong>Browser Support:</strong>
            <span
              style={{
                color: testResults.browserSupport ? "green" : "red",
                marginLeft: "10px",
              }}
            >
              {testResults.browserSupport === null
                ? "Testing..."
                : testResults.browserSupport
                ? "✅ Supported"
                : "❌ Not Supported"}
            </span>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>SDK Loading:</strong>
            <span
              style={{
                color: testResults.sdkLoaded
                  ? "green"
                  : testResults.sdkLoaded === false
                  ? "red"
                  : "orange",
                marginLeft: "10px",
              }}
            >
              {testResults.sdkLoaded === null
                ? "Testing..."
                : testResults.sdkLoaded
                ? "✅ Success"
                : "❌ Failed"}
            </span>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>License Valid:</strong>
            <span
              style={{
                color: testResults.licenseValid
                  ? "green"
                  : testResults.licenseValid === false
                  ? "red"
                  : "orange",
                marginLeft: "10px",
              }}
            >
              {testResults.licenseValid === null
                ? "Testing..."
                : testResults.licenseValid
                ? "✅ Valid"
                : "❌ Invalid"}
            </span>
          </div>

          {testResults.error && (
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                background: "#ffebee",
                borderRadius: "3px",
              }}
            >
              <strong>Error:</strong> {testResults.error}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={runTests}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Testing..." : "Run Tests Again"}
        </button>

        <button
          onClick={testWithDemoLicense}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          Test with Demo License
        </button>
      </div>

      <div
        style={{ background: "#e7f3ff", padding: "15px", borderRadius: "5px" }}
      >
        <h4>License Issue Resolution:</h4>
        <p>
          <strong>Current Issue:</strong> Your license key is for "Microblink
          Capture" but you need "BlinkID".
        </p>
        <ol>
          <li>
            Visit{" "}
            <a
              href="https://microblink.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              microblink.com
            </a>
          </li>
          <li>Sign up for free trial</li>
          <li>
            Request specifically <strong>"BlinkID Browser SDK"</strong> license
          </li>
          <li>Replace the license key in your .env file</li>
        </ol>
        <p>
          <strong>Contact:</strong> help@microblink.com for license assistance
        </p>
      </div>

      <div
        style={{
          marginTop: "20px",
          background: "#f8f9fa",
          padding: "15px",
          borderRadius: "5px",
        }}
      >
        <h4>Current Environment:</h4>
        <div>
          <strong>License Key:</strong>{" "}
          {process.env.REACT_APP_BLINKID_LICENSE_KEY ? "Present" : "Missing"}
        </div>
        <div>
          <strong>Engine Location:</strong> /resources/
        </div>
        <div>
          <strong>SDK Version:</strong> @microblink/blinkid-in-browser-sdk
        </div>
      </div>
    </div>
  );
};

export default BlinkIDTest;
