package main

import (
	"log"
	"net/http"
	"os"

	"github.com/safeballot/backend/handlers"
)

// CORSMiddleware adds CORS headers to all responses
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Setup routes
	setupRoutes()

	// Apply CORS middleware to all requests
	handler := CORSMiddleware(http.DefaultServeMux)

	// Start the server
	log.Printf("SafeBallot API server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

// setupRoutes configures all API routes
func setupRoutes() {
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
}
