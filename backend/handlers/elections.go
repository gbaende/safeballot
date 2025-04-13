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
)

// ElectionController handles election-related operations
type ElectionController struct {
	db  *sql.DB
	cfg *config.Config
}

// NewElectionController creates a new ElectionController
func NewElectionController(db *sql.DB, cfg *config.Config) *ElectionController {
	return &ElectionController{
		db:  db,
		cfg: cfg,
	}
}

// Summary returns a summary of elections for the dashboard
func (h *ElectionController) Summary(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get user role from database
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		log.Printf("Error querying user role: %v", err)
		http.Error(w, "Error retrieving user information", http.StatusInternalServerError)
		return
	}

	// Prepare the summary response
	summary := struct {
		ActiveElections   int `json:"active_elections"`
		DraftElections    int `json:"draft_elections"`
		CompleteElections int `json:"complete_elections"`
		TotalVoters       int `json:"total_voters"`
		TotalVotes        int `json:"total_votes"`
	}{}

	// Count elections by status
	if role == "admin" {
		// Admins see all elections
		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'live'").Scan(&summary.ActiveElections)
		if err != nil {
			log.Printf("Error counting active elections: %v", err)
		}

		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'draft'").Scan(&summary.DraftElections)
		if err != nil {
			log.Printf("Error counting draft elections: %v", err)
		}

		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'completed'").Scan(&summary.CompleteElections)
		if err != nil {
			log.Printf("Error counting completed elections: %v", err)
		}

		err = h.db.QueryRow("SELECT SUM(registered_voters) FROM ballots").Scan(&summary.TotalVoters)
		if err != nil {
			log.Printf("Error counting total voters: %v", err)
			summary.TotalVoters = 0
		}

		err = h.db.QueryRow("SELECT COUNT(*) FROM votes").Scan(&summary.TotalVotes)
		if err != nil {
			log.Printf("Error counting total votes: %v", err)
		}
	} else if role == "host" {
		// Hosts see only their elections
		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'live' AND created_by = $1", userID).Scan(&summary.ActiveElections)
		if err != nil {
			log.Printf("Error counting active elections: %v", err)
		}

		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'draft' AND created_by = $1", userID).Scan(&summary.DraftElections)
		if err != nil {
			log.Printf("Error counting draft elections: %v", err)
		}

		err = h.db.QueryRow("SELECT COUNT(*) FROM ballots WHERE status = 'completed' AND created_by = $1", userID).Scan(&summary.CompleteElections)
		if err != nil {
			log.Printf("Error counting completed elections: %v", err)
		}

		err = h.db.QueryRow("SELECT SUM(registered_voters) FROM ballots WHERE created_by = $1", userID).Scan(&summary.TotalVoters)
		if err != nil {
			log.Printf("Error counting total voters: %v", err)
			summary.TotalVoters = 0
		}

		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM votes v
			JOIN ballots b ON v.ballot_id = b.id
			WHERE b.created_by = $1
		`, userID).Scan(&summary.TotalVotes)
		if err != nil {
			log.Printf("Error counting total votes: %v", err)
		}
	} else {
		// Voters see elections they're participating in
		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM ballots b
			JOIN ballot_voters bv ON b.id = bv.ballot_id
			WHERE bv.user_id = $1 AND b.status = 'live'
		`, userID).Scan(&summary.ActiveElections)
		if err != nil {
			log.Printf("Error counting active elections: %v", err)
		}

		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM ballots b
			JOIN ballot_voters bv ON b.id = bv.ballot_id
			WHERE bv.user_id = $1 AND b.status = 'completed'
		`, userID).Scan(&summary.CompleteElections)
		if err != nil {
			log.Printf("Error counting completed elections: %v", err)
		}

		err = h.db.QueryRow(`
			SELECT COUNT(*) FROM votes
			WHERE voter_id = $1
		`, userID).Scan(&summary.TotalVotes)
		if err != nil {
			log.Printf("Error counting total votes: %v", err)
		}
	}

	// Return the summary
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    summary,
	})
}

// RecentElections returns a list of recent elections for the user
func (h *ElectionController) RecentElections(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get user role from database
	var role string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		log.Printf("Error querying user role: %v", err)
		http.Error(w, "Error retrieving user information", http.StatusInternalServerError)
		return
	}

	var rows *sql.Rows

	// Get recent elections based on user role
	if role == "admin" {
		rows, err = h.db.Query(`
			SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters, created_at, updated_at
			FROM ballots
			ORDER BY created_at DESC
			LIMIT 5
		`)
	} else if role == "host" {
		rows, err = h.db.Query(`
			SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters, created_at, updated_at
			FROM ballots
			WHERE created_by = $1
			ORDER BY created_at DESC
			LIMIT 5
		`, userID)
	} else {
		rows, err = h.db.Query(`
			SELECT b.id, b.title, b.created_by, b.start_date, b.end_date, b.status, b.max_voters, b.registered_voters, b.created_at, b.updated_at
			FROM ballots b
			JOIN ballot_voters bv ON b.id = bv.ballot_id
			WHERE bv.user_id = $1
			ORDER BY b.created_at DESC
			LIMIT 5
		`, userID)
	}

	if err != nil {
		log.Printf("Error querying recent elections: %v", err)
		http.Error(w, "Error retrieving recent elections", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	elections := []models.Ballot{}
	for rows.Next() {
		var election models.Ballot
		err := rows.Scan(
			&election.ID,
			&election.Title,
			&election.CreatedBy,
			&election.StartDate,
			&election.EndDate,
			&election.Status,
			&election.MaxVoters,
			&election.RegisteredVoters,
			&election.CreatedAt,
			&election.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning election row: %v", err)
			continue
		}

		// Get creator information
		var creatorFirstName, creatorLastName string
		err = h.db.QueryRow("SELECT first_name, last_name FROM users WHERE id = $1", election.CreatedBy).Scan(&creatorFirstName, &creatorLastName)
		if err == nil {
			election.CreatorName = creatorFirstName + " " + creatorLastName
		}

		elections = append(elections, election)
	}

	// Return the elections
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    elections,
	})
}

// UpcomingElections returns a list of upcoming elections for the user
func (h *ElectionController) UpcomingElections(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get upcoming elections (those that haven't started yet)
	rows, err := h.db.Query(`
		SELECT b.id, b.title, b.created_by, b.start_date, b.end_date, b.status, b.max_voters, b.registered_voters, b.created_at, b.updated_at
		FROM ballots b
		JOIN ballot_voters bv ON b.id = bv.ballot_id
		WHERE bv.user_id = $1 AND b.start_date > $2 AND b.status = 'live'
		ORDER BY b.start_date ASC
		LIMIT 5
	`, userID, time.Now())

	if err != nil {
		log.Printf("Error querying upcoming elections: %v", err)
		http.Error(w, "Error retrieving upcoming elections", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	elections := []models.Ballot{}
	for rows.Next() {
		var election models.Ballot
		err := rows.Scan(
			&election.ID,
			&election.Title,
			&election.CreatedBy,
			&election.StartDate,
			&election.EndDate,
			&election.Status,
			&election.MaxVoters,
			&election.RegisteredVoters,
			&election.CreatedAt,
			&election.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning election row: %v", err)
			continue
		}
		elections = append(elections, election)
	}

	// Return the elections
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    elections,
	})
}

// ElectionStatus returns statistics about an election
func (h *ElectionController) ElectionStatus(w http.ResponseWriter, r *http.Request) {
	// Get election ID from URL
	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get the election from the database
	var election models.Ballot
	err := h.db.QueryRow(
		"SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters FROM ballots WHERE id = $1",
		electionID,
	).Scan(
		&election.ID,
		&election.Title,
		&election.CreatedBy,
		&election.StartDate,
		&election.EndDate,
		&election.Status,
		&election.MaxVoters,
		&election.RegisteredVoters,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Election not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying election: %v", err)
		http.Error(w, "Error retrieving election", http.StatusInternalServerError)
		return
	}

	// Check if user has access to this election
	if election.CreatedBy != userID {
		var count int
		err := h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1 AND user_id = $2", electionID, userID).Scan(&count)
		if err != nil || count == 0 {
			http.Error(w, "You do not have access to this election", http.StatusForbidden)
			return
		}
	}

	// Get voting statistics
	var votersCount, votesCount int
	err = h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1", electionID).Scan(&votersCount)
	if err != nil {
		log.Printf("Error counting voters: %v", err)
		votersCount = 0
	}

	err = h.db.QueryRow(`
		SELECT COUNT(DISTINCT voter_id) FROM votes WHERE ballot_id = $1
	`, electionID).Scan(&votesCount)
	if err != nil {
		log.Printf("Error counting votes: %v", err)
		votesCount = 0
	}

	// Calculate participation percentage
	var participationRate float64
	if votersCount > 0 {
		participationRate = float64(votesCount) / float64(votersCount) * 100
	}

	// Return the election status
	status := struct {
		Title             string    `json:"title"`
		Status            string    `json:"status"`
		StartDate         time.Time `json:"start_date"`
		EndDate           time.Time `json:"end_date"`
		RegisteredVoters  int       `json:"registered_voters"`
		VotesCast         int       `json:"votes_cast"`
		ParticipationRate float64   `json:"participation_rate"`
	}{
		Title:             election.Title,
		Status:            election.Status,
		StartDate:         election.StartDate,
		EndDate:           election.EndDate,
		RegisteredVoters:  votersCount,
		VotesCast:         votesCount,
		ParticipationRate: participationRate,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    status,
	})
}

// StartElection changes the status of an election to 'live'
func (h *ElectionController) StartElection(w http.ResponseWriter, r *http.Request) {
	// Get election ID from URL
	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to update this election
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", electionID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Election not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying election: %v", err)
		http.Error(w, "Error retrieving election", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to start this election", http.StatusForbidden)
		return
	}

	// Update the election status to 'live'
	_, err = h.db.Exec(
		"UPDATE ballots SET status = 'live', updated_at = $1 WHERE id = $2",
		time.Now(), electionID,
	)
	if err != nil {
		log.Printf("Error starting election: %v", err)
		http.Error(w, "Failed to start election", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// EndElection changes the status of an election to 'completed'
func (h *ElectionController) EndElection(w http.ResponseWriter, r *http.Request) {
	// Get election ID from URL
	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to update this election
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", electionID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Election not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying election: %v", err)
		http.Error(w, "Error retrieving election", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to end this election", http.StatusForbidden)
		return
	}

	// Update the election status to 'completed'
	_, err = h.db.Exec(
		"UPDATE ballots SET status = 'completed', updated_at = $1 WHERE id = $2",
		time.Now(), electionID,
	)
	if err != nil {
		log.Printf("Error ending election: %v", err)
		http.Error(w, "Failed to end election", http.StatusInternalServerError)
		return
	}

	// Calculate and store results
	err = h.calculateElectionResults(electionID)
	if err != nil {
		log.Printf("Error calculating election results: %v", err)
		// Continue anyway, we can recalculate later
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// Helper function to calculate election results
func (h *ElectionController) calculateElectionResults(electionID string) error {
	// Get all questions for this election
	rows, err := h.db.Query("SELECT id FROM questions WHERE ballot_id = $1", electionID)
	if err != nil {
		return err
	}
	defer rows.Close()

	questionIDs := []string{}
	for rows.Next() {
		var questionID string
		err := rows.Scan(&questionID)
		if err != nil {
			return err
		}
		questionIDs = append(questionIDs, questionID)
	}

	// For each question, calculate results for each option
	for _, questionID := range questionIDs {
		// Get all options for this question
		optRows, err := h.db.Query("SELECT id FROM options WHERE question_id = $1", questionID)
		if err != nil {
			return err
		}

		optionIDs := []string{}
		for optRows.Next() {
			var optionID string
			err := optRows.Scan(&optionID)
			if err != nil {
				continue
			}
			optionIDs = append(optionIDs, optionID)
		}
		optRows.Close()

		// Count total votes for this question
		var totalVotes int
		err = h.db.QueryRow("SELECT COUNT(*) FROM votes WHERE question_id = $1", questionID).Scan(&totalVotes)
		if err != nil {
			return err
		}

		// Calculate results for each option
		for _, optionID := range optionIDs {
			var voteCount int
			err = h.db.QueryRow("SELECT COUNT(*) FROM votes WHERE question_id = $1 AND option_id = $2", questionID, optionID).Scan(&voteCount)
			if err != nil {
				continue
			}

			// Calculate percentage
			var percentage float64
			if totalVotes > 0 {
				percentage = float64(voteCount) / float64(totalVotes) * 100
			}

			// Store result
			resultID := uuid.New().String()
			_, err = h.db.Exec(
				"INSERT INTO election_results (id, ballot_id, question_id, option_id, votes_count, percentage, calculated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
				resultID, electionID, questionID, optionID, voteCount, percentage, time.Now(),
			)
			if err != nil {
				log.Printf("Error storing result for option %s: %v", optionID, err)
				// Continue with next option
			}
		}
	}

	return nil
}
