import React, { useState } from "react";

const MockBlinkIDStep = ({ onComplete, onError, onBack }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showMockResult, setShowMockResult] = useState(false);

  const mockScanData = {
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    documentNumber: "DL123456789",
    expiryDate: "2028-01-15",
    nationality: "USA",
    issuingCountry: "United States",
    documentType: "driving_license",
    address: "123 Main St, Anytown, ST 12345",
  };

  const handleMockScan = () => {
    setIsScanning(true);

    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false);
      setShowMockResult(true);
    }, 2000);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete({
        success: true,
        documentData: mockScanData,
        rawResult: mockScanData,
      });
    }
  };

  if (showMockResult) {
    return (
      <div className="blinkid-container">
        <div className="blinkid-success">
          <div className="success-icon">✅</div>
          <h3>Document Scanned Successfully! (Mock)</h3>
          <div className="scan-results">
            <h4>Extracted Information:</h4>
            <div className="result-item">
              <strong>Name:</strong> {mockScanData.firstName}{" "}
              {mockScanData.lastName}
            </div>
            <div className="result-item">
              <strong>Date of Birth:</strong> {mockScanData.dateOfBirth}
            </div>
            <div className="result-item">
              <strong>Document Number:</strong> {mockScanData.documentNumber}
            </div>
            <div className="result-item">
              <strong>Document Type:</strong> {mockScanData.documentType}
            </div>
            <div className="result-item">
              <strong>Address:</strong> {mockScanData.address}
            </div>
          </div>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={handleComplete}>
              Continue with Mock Data
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowMockResult(false)}
            >
              Scan Again
            </button>
          </div>
        </div>

        <style jsx>{`
          .blinkid-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              sans-serif;
          }

          .blinkid-success {
            text-align: center;
            padding: 40px 20px;
          }

          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }

          .scan-results {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
          }

          .result-item {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
          }

          .result-item:last-child {
            border-bottom: none;
          }

          .success-actions {
            margin-top: 30px;
          }

          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin: 0 10px;
            transition: background-color 0.2s;
          }

          .btn-primary {
            background-color: #007bff;
            color: white;
          }

          .btn-primary:hover {
            background-color: #0056b3;
          }

          .btn-secondary {
            background-color: #6c757d;
            color: white;
          }

          .btn-secondary:hover {
            background-color: #545b62;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="blinkid-container">
      <div className="blinkid-scanner">
        <h3>Mock ID Document Scanner</h3>
        <p>
          This is a mock scanner for testing purposes when BlinkID license is
          not available.
        </p>

        {!isScanning ? (
          <div className="scanner-setup">
            <div className="scanner-instructions">
              <h4>Mock Scanner Features:</h4>
              <ul>
                <li>Simulates document scanning process</li>
                <li>Returns sample document data</li>
                <li>Tests the complete UI flow</li>
                <li>No camera permissions required</li>
              </ul>

              <div className="mock-notice">
                <p>
                  <strong>Note:</strong> This will generate mock data for
                  testing. To use real document scanning, you need a valid
                  BlinkID license key.
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={handleMockScan}
            >
              Start Mock Scanning
            </button>

            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                Go Back
              </button>
            )}
          </div>
        ) : (
          <div className="scanner-active">
            <div className="mock-scanner">
              <div className="scanning-animation">
                <div className="scanner-frame"></div>
                <p className="scanner-hint">Scanning document...</p>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setIsScanning(false)}
            >
              Cancel Scanning
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .blinkid-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .scanner-instructions {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: left;
        }

        .scanner-instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .scanner-instructions li {
          margin: 8px 0;
        }

        .mock-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin-top: 15px;
        }

        .mock-notice p {
          margin: 0;
          color: #856404;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          margin: 0 10px;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .btn-large {
          padding: 16px 32px;
          font-size: 18px;
        }

        .mock-scanner {
          background: #000;
          border-radius: 8px;
          padding: 40px;
          margin: 20px 0;
          text-align: center;
        }

        .scanning-animation {
          color: white;
        }

        .scanner-frame {
          width: 200px;
          height: 130px;
          border: 2px solid #007bff;
          border-radius: 8px;
          margin: 0 auto 20px;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(0, 123, 255, 0.1) 50%,
            transparent 70%
          );
          animation: scan 2s linear infinite;
        }

        .scanner-hint {
          color: white;
          margin: 10px 0;
        }

        .progress-bar {
          width: 200px;
          height: 4px;
          background: #333;
          border-radius: 2px;
          margin: 20px auto;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #007bff;
          border-radius: 2px;
          animation: progress 2s linear infinite;
        }

        @keyframes scan {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: 200px 0;
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default MockBlinkIDStep;
