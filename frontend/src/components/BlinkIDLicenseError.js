import React from "react";
import "./BlinkIDLicenseError.css";

const BlinkIDLicenseError = ({ error }) => {
  return (
    <div className="blinkid-license-error">
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>BlinkID License Required</h2>
        <p className="error-message">{error}</p>

        <div className="license-help">
          <h3>How to get a BlinkID license:</h3>
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
            <li>Click "Start free plan" to sign up</li>
            <li>
              Request a <strong>BlinkID Browser SDK</strong> license (not
              Capture)
            </li>
            <li>Get 30 days free trial for all products</li>
            <li>
              Add your license key to the <code>.env</code> file
            </li>
          </ol>

          <div className="current-issue">
            <h4>Current Issue:</h4>
            <p>
              Your current license key is for "Microblink Capture" product, but
              you need a "BlinkID" license.
            </p>
          </div>

          <div className="contact-info">
            <p>
              Need help? Contact Microblink support at{" "}
              <a href="mailto:help.microblink.com">help.microblink.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlinkIDLicenseError;
