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
	IsVerified  bool      `json:"is_verified"`
	VoterID     string    `json:"voter_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	LastLoginAt time.Time `json:"last_login_at,omitempty"`
}

// NewUser creates a new user instance
func NewUser(email, password string) *User {
	return &User{
		Email:      email,
		Password:   password, // In a real app, this would be hashed
		IsVerified: false,
		CreatedAt:  time.Now(),
	}
}
