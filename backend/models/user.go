package models

import (
	"time"
)

// User represents a user in the SafeBallot system
type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	Password    string    `json:"-"` // Password is never returned in JSON
	FirstName   string    `json:"first_name,omitempty"`
	LastName    string    `json:"last_name,omitempty"`
	Name        string    `json:"name,omitempty"` // Full name for compatibility
	IsVerified  bool      `json:"is_verified"`
	VoterID     string    `json:"voter_id,omitempty"`
	Role        string    `json:"role,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at,omitempty"`
	LastLoginAt time.Time `json:"last_login_at,omitempty"`
}

// NewUser creates a new user instance
func NewUser(email, password string) *User {
	now := time.Now()
	return &User{
		Email:      email,
		Password:   password, // In a real app, this would be hashed
		IsVerified: false,
		Role:       "voter", // Default role
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

// GetFullName returns the user's full name
func (u *User) GetFullName() string {
	if u.FirstName != "" || u.LastName != "" {
		return u.FirstName + " " + u.LastName
	}
	return u.Name // Fallback to Name field if FirstName/LastName not set
}
