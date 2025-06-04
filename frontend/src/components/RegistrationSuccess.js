import React from "react";
import { useNavigate } from "react-router-dom";
import "./RegistrationSuccess.css";

const RegistrationSuccess = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="registration-success">
      <div className="success-container">
        <div className="success-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#48bb78" />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1>Registration Successful!</h1>

        <p className="success-message">
          Thank you for registering to vote! Your voter registration has been
          submitted successfully.
        </p>

        <div className="next-steps">
          <h3>What's Next?</h3>
          <ul>
            <li>
              <strong>Check Your Email:</strong> We've sent a verification email
              to the address you provided. Please check your inbox and follow
              the instructions to verify your registration.
            </li>
            <li>
              <strong>Verification Required:</strong> Your registration will be
              processed once you verify your email address and your information
              is confirmed by election officials.
            </li>
            <li>
              <strong>Stay Informed:</strong> You'll receive updates about
              upcoming elections and voting opportunities once your registration
              is approved.
            </li>
          </ul>
        </div>

        <div className="important-info">
          <h3>Important Information</h3>
          <p>
            Your voter registration is subject to verification by election
            officials. Processing times may vary by jurisdiction. If you have
            any questions about your registration status, please contact your
            local election office.
          </p>
        </div>

        <div className="action-buttons">
          <button onClick={handleGoHome} className="home-button">
            Return to Home
          </button>
        </div>

        <div className="contact-info">
          <p>
            Need help? Contact us at{" "}
            <a href="mailto:support@safeballot.com">support@safeballot.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
