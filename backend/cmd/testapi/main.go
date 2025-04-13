package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/safeballot/backend/handlers"
)

func main() {
	port := "8085" // Use a different port than the main app

	// Define API routes
	http.HandleFunc("/api/elections/summary", handlers.MockElectionSummary)
	http.HandleFunc("/api/elections/recent", handlers.MockRecentElections)
	http.HandleFunc("/api/elections/upcoming", handlers.MockUpcomingElections)
	http.HandleFunc("/api/elections/status", handlers.MockElectionStatus)
	http.HandleFunc("/api/elections/start", handlers.MockStartElection)
	http.HandleFunc("/api/elections/end", handlers.MockEndElection)

	// Create channel for shutdown signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start the server in a goroutine
	go func() {
		log.Printf("Test API server starting on port %s...\n", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatalf("Error starting server: %v\n", err)
		}
	}()

	// Print usage information
	fmt.Println("Elections API test server running.")
	fmt.Println("You can test the following endpoints:")
	fmt.Printf("- GET http://localhost:%s/api/elections/summary\n", port)
	fmt.Printf("- GET http://localhost:%s/api/elections/recent\n", port)
	fmt.Printf("- GET http://localhost:%s/api/elections/upcoming\n", port)
	fmt.Printf("- GET http://localhost:%s/api/elections/status?id=e123456\n", port)
	fmt.Printf("- POST http://localhost:%s/api/elections/start?id=e123456\n", port)
	fmt.Printf("- POST http://localhost:%s/api/elections/end?id=e123456\n", port)
	fmt.Println("\nPress Ctrl+C to stop the server")

	// Wait for shutdown signal
	<-stop
	log.Println("Server shutting down...")
}
