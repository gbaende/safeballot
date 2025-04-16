package routes

import (
	"database/sql"

	"github.com/go-chi/chi/v5"
	"github.com/safeballot/backend/config"
	"github.com/safeballot/backend/handlers"
	"github.com/safeballot/backend/middleware"
)

// Setup configures all API routes
func Setup(r chi.Router, db *sql.DB, cfg *config.Config) {
	// Create handler instances with dependencies
	authHandler := handlers.NewAuthHandler(db, cfg)
	ballotHandler := handlers.NewBallotHandler(db, cfg)
	userHandler := handlers.NewUserHandler(db, cfg)
	electionController := handlers.NewElectionController(db, cfg)

	// Health check
	r.Get("/api/health", handlers.HealthCheckHandler)

	// Public routes
	r.Group(func(r chi.Router) {
		// Auth routes
		r.Post("/api/register", authHandler.Register)
		r.Post("/api/login", authHandler.Login)
		r.Post("/api/refresh-token", authHandler.RefreshToken)
		r.Post("/api/verify-email", authHandler.VerifyEmail)
		r.Post("/api/reset-password/request", authHandler.RequestPasswordReset)
		r.Post("/api/reset-password/confirm", authHandler.ConfirmPasswordReset)

		// Public election data
		r.Get("/api/elections/recent", electionController.RecentElections)
		r.Get("/api/ballots", ballotHandler.List)
	})

	// Protected routes - require authentication
	r.Group(func(r chi.Router) {
		// Apply auth middleware
		r.Use(middleware.Authenticate(cfg))

		// Election routes
		r.Get("/api/elections/summary", electionController.Summary)
		r.Get("/api/elections/upcoming", electionController.UpcomingElections)
		r.Get("/api/elections/status", electionController.ElectionStatus)
		r.Post("/api/elections/start", electionController.StartElection)
		r.Post("/api/elections/end", electionController.EndElection)

		// Ballot routes
		r.Post("/api/ballots", ballotHandler.Create)

		r.Route("/api/ballots/{ballotID}", func(r chi.Router) {
			r.Get("/", ballotHandler.Get)
			r.Put("/", ballotHandler.Update)
			r.Delete("/", ballotHandler.Delete)

			// Ballot questions
			r.Get("/questions", ballotHandler.ListQuestions)
			r.Post("/questions", ballotHandler.CreateQuestion)

			// Ballot voters
			r.Get("/voters", ballotHandler.ListVoters)
			r.Post("/voters", ballotHandler.AddVoters)
			r.Delete("/voters/{voterID}", ballotHandler.RemoveVoter)

			// Voting
			r.Post("/vote", ballotHandler.CastVote)

			// Results (only accessible when ballot is complete)
			r.Get("/results", ballotHandler.GetResults)
		})

		// User routes
		r.Get("/api/users", userHandler.ListUsers)
		r.Get("/api/users/profile", userHandler.GetProfile)
		r.Put("/api/users/profile", userHandler.UpdateProfile)
		r.Post("/api/users/change-password", userHandler.ChangePassword)
		r.Post("/api/users", userHandler.CreateUser)
		r.Get("/api/users/{id}", userHandler.GetUser)

		// Logout
		r.Post("/api/logout", authHandler.Logout)
	})
}
