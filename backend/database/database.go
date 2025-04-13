package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
	"github.com/safeballot/backend/config"
)

// Connect establishes a connection to the database
func Connect(cfg *config.Config) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Check connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Println("Successfully connected to the database")
	return db, nil
}

// Migrate runs database migrations
func Migrate(db *sql.DB) error {
	// Create tables if they don't exist
	if err := createTables(db); err != nil {
		return err
	}

	// Add initial data if needed
	if err := seedData(db); err != nil {
		return err
	}

	log.Println("Database migrations completed")
	return nil
}

// createTables creates all required tables
func createTables(db *sql.DB) error {
	// Users table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		first_name VARCHAR(255),
		last_name VARCHAR(255),
		is_verified BOOLEAN DEFAULT false,
		voter_id VARCHAR(255),
		role VARCHAR(50) NOT NULL DEFAULT 'voter',
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
		last_login_at TIMESTAMP
	)`); err != nil {
		return fmt.Errorf("error creating users table: %w", err)
	}

	// Ballots table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS ballots (
		id UUID PRIMARY KEY,
		title VARCHAR(255) NOT NULL,
		created_by UUID REFERENCES users(id),
		start_date TIMESTAMP NOT NULL,
		end_date TIMESTAMP NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'draft',
		max_voters INTEGER NOT NULL DEFAULT 0,
		registered_voters INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating ballots table: %w", err)
	}

	// Ballot Voters table (junction table between ballots and voters)
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS ballot_voters (
		id UUID PRIMARY KEY,
		ballot_id UUID REFERENCES ballots(id) ON DELETE CASCADE,
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		email VARCHAR(255), 
		invitation_sent BOOLEAN DEFAULT false,
		invitation_accepted BOOLEAN DEFAULT false,
		voted BOOLEAN DEFAULT false,
		registration_date TIMESTAMP NOT NULL DEFAULT NOW(),
		UNIQUE(ballot_id, user_id),
		UNIQUE(ballot_id, email)
	)`); err != nil {
		return fmt.Errorf("error creating ballot_voters table: %w", err)
	}

	// Questions table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS questions (
		id UUID PRIMARY KEY,
		ballot_id UUID REFERENCES ballots(id) ON DELETE CASCADE,
		title VARCHAR(255) NOT NULL,
		description TEXT,
		order_index INTEGER NOT NULL,
		allow_write_in BOOLEAN DEFAULT false,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating questions table: %w", err)
	}

	// Options table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS options (
		id UUID PRIMARY KEY,
		question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
		text VARCHAR(255) NOT NULL,
		sub_text VARCHAR(255),
		party_name VARCHAR(255),
		order_index INTEGER NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating options table: %w", err)
	}

	// Votes table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS votes (
		id UUID PRIMARY KEY,
		ballot_id UUID REFERENCES ballots(id) ON DELETE CASCADE,
		question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
		option_id UUID REFERENCES options(id) ON DELETE SET NULL,
		write_in VARCHAR(255),
		voter_id UUID REFERENCES users(id),
		cast_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating votes table: %w", err)
	}

	// Session/Refresh tokens table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS refresh_tokens (
		id UUID PRIMARY KEY,
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		token VARCHAR(255) NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating refresh_tokens table: %w", err)
	}

	// Election results table
	if _, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS election_results (
		id UUID PRIMARY KEY,
		ballot_id UUID REFERENCES ballots(id) ON DELETE CASCADE,
		question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
		option_id UUID REFERENCES options(id) ON DELETE SET NULL,
		votes_count INTEGER NOT NULL DEFAULT 0,
		percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
		calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("error creating election_results table: %w", err)
	}

	return nil
}

// seedData adds initial data if tables are empty
func seedData(db *sql.DB) error {
	// Check if we need to add seed data
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		return fmt.Errorf("error checking users: %w", err)
	}

	// If there are already users, don't seed data
	if count > 0 {
		return nil
	}

	log.Println("Adding seed data...")

	// For development, we could add test users and ballots here
	// ...

	return nil
}
