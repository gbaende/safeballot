package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/google/uuid"
	"github.com/safeballot/backend/config"
	"github.com/safeballot/backend/middleware"
	"github.com/safeballot/backend/models"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	db  *sql.DB
	cfg *config.Config
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(db *sql.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:  db,
		cfg: cfg,
	}
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token        string      `json:"token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		log.Printf("Error checking existing email: %v", err)
		http.Error(w, "Failed to process registration", http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Email already exists", http.StatusConflict)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Generate a new user ID
	userID := uuid.New().String()

	// Determine role based on email domain (simple rule for now)
	role := "voter"
	if strings.HasSuffix(strings.ToLower(req.Email), ".org") {
		role = "host"
	}

	// Insert the user into the database
	_, err = h.db.Exec(
		"INSERT INTO users (id, email, password_hash, first_name, last_name, is_verified, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		userID, req.Email, string(hashedPassword), req.FirstName, req.LastName, false, role, time.Now(), time.Now(),
	)
	if err != nil {
		// Check for duplicate email
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_email_key\"" {
			http.Error(w, "Email already exists", http.StatusConflict)
			return
		}
		log.Printf("Error registering user: %v", err)
		http.Error(w, "Failed to register user", http.StatusInternalServerError)
		return
	}

	// Generate tokens
	tokenString, refreshToken, err := h.generateTokens(userID, req.Email, role)
	if err != nil {
		http.Error(w, "Failed to generate authentication tokens", http.StatusInternalServerError)
		return
	}

	// Create user model for response
	user := models.User{
		ID:         userID,
		Email:      req.Email,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		IsVerified: false,
		CreatedAt:  time.Now(),
	}

	// Return the tokens and user
	response := AuthResponse{
		Token:        tokenString,
		RefreshToken: refreshToken,
		User:         user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	// Log successful registration
	log.Printf("User registered successfully: %s (%s)", req.Email, userID)
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	// Get the user from the database
	var userID, email, passwordHash, firstName, lastName, role string
	var isVerified bool
	var createdAt time.Time
	err := h.db.QueryRow(
		"SELECT id, email, password_hash, first_name, last_name, is_verified, role, created_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&userID, &email, &passwordHash, &firstName, &lastName, &isVerified, &role, &createdAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Failed to authenticate user", http.StatusInternalServerError)
		return
	}

	// Compare the password with the hash
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
	if err != nil {
		// Wrong password, but don't reveal this specifically
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Update last login time
	_, err = h.db.Exec("UPDATE users SET last_login_at = $1 WHERE id = $2", time.Now(), userID)
	if err != nil {
		log.Printf("Error updating last login time: %v", err)
		// Continue anyway, not critical
	}

	// Generate tokens
	tokenString, refreshToken, err := h.generateTokens(userID, email, role)
	if err != nil {
		http.Error(w, "Failed to generate authentication tokens", http.StatusInternalServerError)
		return
	}

	// Create user model for response
	user := models.User{
		ID:         userID,
		Email:      email,
		FirstName:  firstName,
		LastName:   lastName,
		IsVerified: isVerified,
		CreatedAt:  createdAt,
	}

	// Return the tokens and user
	response := AuthResponse{
		Token:        tokenString,
		RefreshToken: refreshToken,
		User:         user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	// Log successful login
	log.Printf("User logged in: %s (%s)", email, userID)
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the refresh token
	var userID, email, role string
	var expiresAt time.Time
	err := h.db.QueryRow(
		"SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1",
		req.RefreshToken,
	).Scan(&userID, &expiresAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
			return
		}
		log.Printf("Error querying refresh token: %v", err)
		http.Error(w, "Failed to refresh token", http.StatusInternalServerError)
		return
	}

	// Check if the token has expired
	if time.Now().After(expiresAt) {
		// Delete the expired token
		_, _ = h.db.Exec("DELETE FROM refresh_tokens WHERE token = $1", req.RefreshToken)
		http.Error(w, "Refresh token has expired", http.StatusUnauthorized)
		return
	}

	// Get the user from the database
	err = h.db.QueryRow("SELECT email, role FROM users WHERE id = $1", userID).Scan(&email, &role)
	if err != nil {
		log.Printf("Error querying user for refresh token: %v", err)
		http.Error(w, "Failed to refresh token", http.StatusInternalServerError)
		return
	}

	// Generate new tokens
	tokenString, refreshToken, err := h.generateTokens(userID, email, role)
	if err != nil {
		http.Error(w, "Failed to generate authentication tokens", http.StatusInternalServerError)
		return
	}

	// Delete the old refresh token
	_, err = h.db.Exec("DELETE FROM refresh_tokens WHERE token = $1", req.RefreshToken)
	if err != nil {
		log.Printf("Error deleting old refresh token: %v", err)
		// Continue anyway, not critical
	}

	// Return the new tokens
	response := struct {
		Token        string `json:"token"`
		RefreshToken string `json:"refresh_token"`
	}{
		Token:        tokenString,
		RefreshToken: refreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get the refresh token from the request
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Delete all refresh tokens for this user for complete logout
	_, err := h.db.Exec("DELETE FROM refresh_tokens WHERE user_id = $1", userID)
	if err != nil {
		log.Printf("Error deleting refresh tokens: %v", err)
		// Continue anyway, not critical
	}

	// Return a success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})

	// Log successful logout
	log.Printf("User logged out: %s", userID)
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	// In a real app, this would verify a token sent to the user's email
	var req struct {
		Token string `json:"token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// For now, just mark the user as verified without actually checking the token
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Update the user's verification status
	_, err := h.db.Exec("UPDATE users SET is_verified = true WHERE id = $1", userID)
	if err != nil {
		log.Printf("Error verifying user: %v", err)
		http.Error(w, "Failed to verify email", http.StatusInternalServerError)
		return
	}

	// Return a success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"verified": true})
}

// RequestPasswordReset handles password reset requests
func (h *AuthHandler) RequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Check if the user exists
	var userID string
	err := h.db.QueryRow("SELECT id FROM users WHERE email = $1", req.Email).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Don't reveal that the email doesn't exist
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]bool{"success": true})
			return
		}
		log.Printf("Error querying user for password reset: %v", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	// Generate a reset token (would be emailed to the user in a real app)
	resetToken := uuid.New().String()

	// TODO: Save the reset token and expiration in the database
	// TODO: Send an email with the reset link

	// Log the token for development purposes
	log.Printf("Password reset token for user %s: %s", userID, resetToken)

	// Return a success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// ConfirmPasswordReset handles password reset confirmation
func (h *AuthHandler) ConfirmPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// TODO: Verify the reset token from the database

	// For now, just return a success response without actually changing anything
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Helper function to generate JWT tokens
func (h *AuthHandler) generateTokens(userID, email, role string) (string, string, error) {
	// Create the token claims
	claims := middleware.UserClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(h.cfg.JWTExpirationHours).Unix(),
			Issuer:    "safeballot",
		},
	}

	// Create the JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	tokenString, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		return "", "", fmt.Errorf("error signing token: %w", err)
	}

	// Generate a random refresh token
	refreshToken := uuid.New().String()

	// Store the refresh token in the database
	expiresAt := time.Now().Add(h.cfg.RefreshTokenExpiration)
	_, err = h.db.Exec(
		"INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
		uuid.New().String(), userID, refreshToken, expiresAt, time.Now(),
	)
	if err != nil {
		return "", "", fmt.Errorf("error storing refresh token: %w", err)
	}

	return tokenString, refreshToken, nil
}

// HealthCheckHandler handles API health check requests
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"version": "1.0.0",
	})
}
