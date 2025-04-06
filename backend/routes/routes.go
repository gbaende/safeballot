package routes

import (
	"net/http"

	"github.com/safeballot/backend/handlers"
)

// SetupRoutes configures all API routes
func SetupRoutes() {
	// Health check
	http.HandleFunc("/api/health", handlers.HealthCheckHandler)

	// Auth routes
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)
	http.HandleFunc("/api/verify", handlers.VerifyHandler)

	// Ballot routes
	http.HandleFunc("/api/ballots", handlers.BallotsHandler)
	http.HandleFunc("/api/ballot", handlers.BallotHandler)
	http.HandleFunc("/api/vote", handlers.VoteHandler)

	// User routes
	http.HandleFunc("/api/users", handlers.UsersHandler)
	http.HandleFunc("/api/user", handlers.UserHandler)

	// Template dashboard route for testing
	http.HandleFunc("/template-dashboard", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "frontend/views/template-dashboard.ejs")
	})

	// Voter authentication flow pages
	http.HandleFunc("/otp", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "frontend/views/otp.ejs")
	})

	http.HandleFunc("/voter-id", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "frontend/views/voter-id.ejs")
	})

	http.HandleFunc("/biometric", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "frontend/views/biometric.ejs")
	})
}
