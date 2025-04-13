package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/dgrijalva/jwt-go"
	"github.com/safeballot/backend/config"
)

// UserClaims represents JWT claims for a user
type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// contextKey is a type for context keys to avoid collisions
type contextKey string

// UserIDKey is the context key for storing the user ID
const UserIDKey contextKey = "userID"

// Authenticate middleware verifies JWT tokens and sets user context
func Authenticate(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header is required", http.StatusUnauthorized)
				return
			}

			// Check if the header has the Bearer prefix
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
				return
			}

			// Extract token from the header
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// Parse the token
			token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
				// Validate the algorithm
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}

				// Return the secret key
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Check if the token is valid
			if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
				// Set user ID in the request context
				ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
				// Call the next handler with the updated context
				next.ServeHTTP(w, r.WithContext(ctx))
			} else {
				http.Error(w, "Invalid token claims", http.StatusUnauthorized)
				return
			}
		})
	}
}

// GetUserID extracts user ID from the request context
func GetUserID(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(UserIDKey).(string)
	return userID, ok
}

// RequireRole middleware ensures user has a specific role
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header is required", http.StatusUnauthorized)
				return
			}

			// Check if the header has the Bearer prefix
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
				return
			}

			// Extract token from the header
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// Parse the token
			token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
				return []byte("your-secret-key"), nil // Replace with config value
			})

			if err != nil {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Check if the token is valid and has the required role
			if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
				if claims.Role != role {
					http.Error(w, "Insufficient permissions", http.StatusForbidden)
					return
				}

				// Call the next handler
				next.ServeHTTP(w, r)
			} else {
				http.Error(w, "Invalid token claims", http.StatusUnauthorized)
				return
			}
		})
	}
}
