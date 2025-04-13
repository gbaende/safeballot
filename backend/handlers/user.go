package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/safeballot/backend/config"
	"github.com/safeballot/backend/middleware"
	"github.com/safeballot/backend/models"
	"golang.org/x/crypto/bcrypt"
)

// UserHandler handles user-related operations
type UserHandler struct {
	db  *sql.DB
	cfg *config.Config
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(db *sql.DB, cfg *config.Config) *UserHandler {
	return &UserHandler{
		db:  db,
		cfg: cfg,
	}
}

// GetProfile returns the profile of the authenticated user
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get user from database
	var user models.User
	err := h.db.QueryRow(
		"SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1",
		userID,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	// Return the user profile
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    user,
	})
}

// UpdateProfile updates the profile of the authenticated user
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var updateRequest struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateRequest); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if updateRequest.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Update the user in the database
	_, err := h.db.Exec(
		"UPDATE users SET name = $1, updated_at = $2 WHERE id = $3",
		updateRequest.Name, time.Now(), userID,
	)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// ChangePassword changes the password of the authenticated user
func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var changePasswordRequest struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&changePasswordRequest); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if changePasswordRequest.CurrentPassword == "" || changePasswordRequest.NewPassword == "" {
		http.Error(w, "Current password and new password are required", http.StatusBadRequest)
		return
	}

	if len(changePasswordRequest.NewPassword) < 8 {
		http.Error(w, "New password must be at least 8 characters long", http.StatusBadRequest)
		return
	}

	// Get the current password hash from the database
	var passwordHash string
	err := h.db.QueryRow("SELECT password_hash FROM users WHERE id = $1", userID).Scan(&passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	// Compare the current password with the hash
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(changePasswordRequest.CurrentPassword))
	if err != nil {
		http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
		return
	}

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(changePasswordRequest.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		http.Error(w, "Error changing password", http.StatusInternalServerError)
		return
	}

	// Update the password in the database
	_, err = h.db.Exec(
		"UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
		string(hashedPassword), time.Now(), userID,
	)
	if err != nil {
		log.Printf("Error updating password: %v", err)
		http.Error(w, "Failed to change password", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// ListUsers returns all users (admin only)
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user is an admin
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	if role != "admin" {
		http.Error(w, "Only admins can access this resource", http.StatusForbidden)
		return
	}

	// Get all users from the database
	rows, err := h.db.Query("SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY name")
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, "Error retrieving users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}
		users = append(users, user)
	}

	// Return the users
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    users,
	})
}

// GetUser returns a specific user (admin only)
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from URL params
	targetUserID := r.URL.Query().Get("id")
	if targetUserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	// Get current user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the current user is an admin or the target user
	if targetUserID != userID {
		var role string
		err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "User not found", http.StatusNotFound)
				return
			}
			log.Printf("Error querying user: %v", err)
			http.Error(w, "Error retrieving user", http.StatusInternalServerError)
			return
		}

		if role != "admin" {
			http.Error(w, "Only admins can access other users' details", http.StatusForbidden)
			return
		}
	}

	// Get user from database
	var user models.User
	err := h.db.QueryRow(
		"SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1",
		targetUserID,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	// Return the user
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    user,
	})
}

// CreateUser creates a new user (admin only)
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user is an admin
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	if role != "admin" {
		http.Error(w, "Only admins can create users", http.StatusForbidden)
		return
	}

	// Parse request body
	var createRequest struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&createRequest); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if createRequest.Name == "" || createRequest.Email == "" || createRequest.Password == "" {
		http.Error(w, "Name, email, and password are required", http.StatusBadRequest)
		return
	}

	if len(createRequest.Password) < 8 {
		http.Error(w, "Password must be at least 8 characters long", http.StatusBadRequest)
		return
	}

	// Set a default role if not provided
	if createRequest.Role == "" {
		createRequest.Role = "voter"
	}

	// Check if the role is valid
	if createRequest.Role != "admin" && createRequest.Role != "host" && createRequest.Role != "voter" {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	// Check if the email is already in use
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", createRequest.Email).Scan(&count)
	if err != nil {
		log.Printf("Error checking email: %v", err)
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Email already in use", http.StatusBadRequest)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(createRequest.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	// Generate a new user ID
	newUserID := uuid.New().String()

	// Create the user in the database
	_, err = h.db.Exec(
		"INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		newUserID, createRequest.Name, createRequest.Email, string(hashedPassword), createRequest.Role, true, time.Now(), time.Now(),
	)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	// Return the created user
	newUser := models.User{
		ID:        newUserID,
		Name:      createRequest.Name,
		Email:     createRequest.Email,
		Role:      createRequest.Role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    newUser,
	})
}

// UpdateUser updates a user (admin only)
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	// Get target user ID from URL params
	targetUserID := r.URL.Query().Get("id")
	if targetUserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	// Get current user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the current user is an admin
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	if role != "admin" && targetUserID != userID {
		http.Error(w, "Only admins can update other users", http.StatusForbidden)
		return
	}

	// Parse request body
	var updateRequest struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateRequest); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the request
	if updateRequest.Name == "" || updateRequest.Email == "" {
		http.Error(w, "Name and email are required", http.StatusBadRequest)
		return
	}

	// Check if the email is already in use by another user
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1 AND id != $2", updateRequest.Email, targetUserID).Scan(&count)
	if err != nil {
		log.Printf("Error checking email: %v", err)
		http.Error(w, "Error updating user", http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Email already in use by another user", http.StatusBadRequest)
		return
	}

	// If the user is not an admin, they cannot change their role
	if role != "admin" {
		updateRequest.Role = role
	} else if updateRequest.Role == "" {
		// If an admin didn't specify a role, get the current role
		err = h.db.QueryRow("SELECT role FROM users WHERE id = $1", targetUserID).Scan(&updateRequest.Role)
		if err != nil {
			log.Printf("Error querying user role: %v", err)
			http.Error(w, "Error updating user", http.StatusInternalServerError)
			return
		}
	}

	// Update the user in the database
	_, err = h.db.Exec(
		"UPDATE users SET name = $1, email = $2, role = $3, updated_at = $4 WHERE id = $5",
		updateRequest.Name, updateRequest.Email, updateRequest.Role, time.Now(), targetUserID,
	)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// DeleteUser deletes a user (admin only)
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	// Get target user ID from URL params
	targetUserID := r.URL.Query().Get("id")
	if targetUserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	// Get current user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the current user is an admin
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	if role != "admin" {
		http.Error(w, "Only admins can delete users", http.StatusForbidden)
		return
	}

	// Delete the user from the database
	_, err = h.db.Exec("DELETE FROM users WHERE id = $1", targetUserID)
	if err != nil {
		log.Printf("Error deleting user: %v", err)
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}
