package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

// Response is a generic API response structure
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// HealthCheckHandler handles health check requests
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	response := Response{
		Success: true,
		Message: "SafeBallot API is running",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterHandler handles user registration
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for the preflight request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Set content type before any error might occur
	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	var requestData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		response := Response{
			Success: false,
			Message: "Invalid request format: " + err.Error(),
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Basic validation
	if requestData.Email == "" || requestData.Password == "" {
		response := Response{
			Success: false,
			Message: "Email and password are required",
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Determine user role based on email domain
	userRole := "voter" // Default role
	if strings.HasSuffix(strings.ToLower(requestData.Email), ".org") {
		userRole = "host"
	}

	// TODO: Implement actual user registration logic

	// For logging purposes
	// fmt.Printf("User registered: %s\n", requestData.Email)

	response := Response{
		Success: true,
		Message: "User registered successfully",
		Data: map[string]string{
			"user_id": "123456", // Just a placeholder
			"role":    userRole,
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// LoginHandler handles user login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for the preflight request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Set content type before any error might occur
	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	var requestData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		response := Response{
			Success: false,
			Message: "Invalid request format: " + err.Error(),
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Basic validation
	if requestData.Email == "" || requestData.Password == "" {
		response := Response{
			Success: false,
			Message: "Email and password are required",
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Determine user role based on email domain
	userRole := "voter" // Default role
	if strings.HasSuffix(strings.ToLower(requestData.Email), ".org") {
		userRole = "host"
	}

	// Generate a 4-digit OTP code
	otpCode := generateOTP()

	// Log the OTP code for testing purposes - use a clear format
	fmt.Printf("==================================\n")
	fmt.Printf("User logged in: %s\n", requestData.Email)
	fmt.Printf("OTP CODE: %s (USE THIS TO VERIFY)\n", otpCode)
	fmt.Printf("==================================\n")

	// Also log to standard logger
	log.Printf("Login - Email: %s, OTP: %s", requestData.Email, otpCode)

	// TODO: Implement actual login logic

	response := Response{
		Success: true,
		Message: "Login successful",
		Data: map[string]string{
			"token": "sample_jwt_token", // Just a placeholder
			"role":  userRole,
			"email": requestData.Email,
			"otp":   otpCode, // Include OTP in response for demo purposes
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// generateOTP creates a random 4-digit OTP code
func generateOTP() string {
	// Simple 4-digit OTP for demo purposes
	rand.Seed(time.Now().UnixNano())
	otpNum := rand.Intn(9000) + 1000 // Generate a number between 1000 and 9999
	return fmt.Sprintf("%04d", otpNum)
}

// VerifyHandler handles ID verification
func VerifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Implement actual ID verification logic

	response := Response{
		Success: true,
		Message: "Verification successful",
		Data: map[string]bool{
			"verified": true,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// BallotsHandler handles multiple ballots operations
func BallotsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// Get all ballots
		response := Response{
			Success: true,
			Message: "Ballots retrieved successfully",
			Data: []map[string]interface{}{
				{
					"id":     "2024_presidential",
					"title":  "2024 Presidential Election - General Ballot",
					"status": "live",
				},
				{
					"id":     "healthcare_reform",
					"title":  "Statewide Ballot Measure: Healthcare Reform Initiative",
					"status": "registration",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// BallotHandler handles single ballot operations
func BallotHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// Get ballot information
		response := Response{
			Success: true,
			Message: "Ballot retrieved successfully",
			Data: map[string]interface{}{
				"id":             "2024_presidential",
				"title":          "2024 Presidential Election - General Ballot",
				"status":         "live",
				"time_remaining": "3:12:16",
				"questions": []map[string]string{
					{
						"title": "President and Vice President of the United States",
					},
					// Additional questions would be listed here
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case http.MethodPost:
		// Create new ballot
		// TODO: Implement ballot creation logic

		response := Response{
			Success: true,
			Message: "Ballot created successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// VoteHandler handles voting operations
func VoteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Implement actual vote casting logic

	response := Response{
		Success: true,
		Message: "Vote cast successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UsersHandler handles multiple users operations
func UsersHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement users operations
	http.Error(w, "Not implemented yet", http.StatusNotImplemented)
}

// UserHandler handles single user operations
func UserHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement user operations
	http.Error(w, "Not implemented yet", http.StatusNotImplemented)
}
