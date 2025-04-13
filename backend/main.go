package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/safeballot/backend/config"
	"github.com/safeballot/backend/database"
	"github.com/safeballot/backend/routes"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize configuration
	cfg := config.New()

	// Connect to database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30 * time.Second))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL, "*"}, // Allow frontend and all origins in dev
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not obscurely truncated by any proxies
	}))

	// Setup routes
	routes.Setup(r, db, cfg)

	// Create server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.GoAPIPort),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for interrupt signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		// Create shutdown context with timeout
		shutdownCtx, _ := context.WithTimeout(serverCtx, 30*time.Second)

		// Trigger graceful shutdown
		go func() {
			<-shutdownCtx.Done()
			if shutdownCtx.Err() == context.DeadlineExceeded {
				log.Println("Graceful shutdown timed out, forcing exit")
				os.Exit(1)
			}
		}()

		// Trigger server shutdown
		server.Shutdown(shutdownCtx)
		serverStopCtx()
	}()

	// Start the server
	log.Printf("SafeBallot API server starting on port %s", cfg.GoAPIPort)
	err = server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatalf("Error starting server: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()
	log.Println("Server stopped gracefully")
}
