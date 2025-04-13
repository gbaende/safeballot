package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/safeballot/backend/config"
	"github.com/safeballot/backend/middleware"
	"github.com/safeballot/backend/models"
)

// BallotHandler handles ballot-related operations
type BallotHandler struct {
	db  *sql.DB
	cfg *config.Config
}

// NewBallotHandler creates a new BallotHandler
func NewBallotHandler(db *sql.DB, cfg *config.Config) *BallotHandler {
	return &BallotHandler{
		db:  db,
		cfg: cfg,
	}
}

// List returns all ballots accessible to the user
func (h *BallotHandler) List(w http.ResponseWriter, r *http.Request) {
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

	// If the user is an admin or host, show all ballots they created
	// Otherwise, show only the ballots they have access to
	if role == "admin" {
		rows, err = h.db.Query("SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters, created_at, updated_at FROM ballots ORDER BY created_at DESC")
	} else if role == "host" {
		rows, err = h.db.Query("SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters, created_at, updated_at FROM ballots WHERE created_by = $1 ORDER BY created_at DESC", userID)
	} else {
		// For voters, get ballots they have access to
		rows, err = h.db.Query(`
            SELECT b.id, b.title, b.created_by, b.start_date, b.end_date, b.status, b.max_voters, b.registered_voters, b.created_at, b.updated_at 
            FROM ballots b 
            JOIN ballot_voters bv ON b.id = bv.ballot_id 
            WHERE bv.user_id = $1 
            ORDER BY b.created_at DESC
        `, userID)
	}

	if err != nil {
		log.Printf("Error querying ballots: %v", err)
		http.Error(w, "Error retrieving ballots", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	ballots := []models.Ballot{}
	for rows.Next() {
		var ballot models.Ballot
		err := rows.Scan(
			&ballot.ID,
			&ballot.Title,
			&ballot.CreatedBy,
			&ballot.StartDate,
			&ballot.EndDate,
			&ballot.Status,
			&ballot.MaxVoters,
			&ballot.RegisteredVoters,
			&ballot.CreatedAt,
			&ballot.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning ballot row: %v", err)
			continue
		}
		ballots = append(ballots, ballot)
	}

	// Return the ballots
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    ballots,
	})
}

// Create creates a new ballot
func (h *BallotHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req struct {
		Title       string    `json:"title"`
		Description string    `json:"description"`
		StartDate   time.Time `json:"start_date"`
		EndDate     time.Time `json:"end_date"`
		MaxVoters   int       `json:"max_voters"`
		Questions   []struct {
			Title        string `json:"title"`
			Description  string `json:"description"`
			AllowWriteIn bool   `json:"allow_write_in"`
			OrderIndex   int    `json:"order_index"`
			Options      []struct {
				Text       string `json:"text"`
				SubText    string `json:"sub_text"`
				PartyName  string `json:"party_name"`
				OrderIndex int    `json:"order_index"`
			} `json:"options"`
		} `json:"questions"`
		Voters []struct {
			Email string `json:"email"`
		} `json:"voters,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the ballot
	if req.Title == "" {
		http.Error(w, "Ballot title is required", http.StatusBadRequest)
		return
	}

	// Validate dates
	if req.StartDate.Before(time.Now()) && !req.StartDate.Equal(time.Now()) {
		http.Error(w, "Start date cannot be in the past", http.StatusBadRequest)
		return
	}

	if req.EndDate.Before(req.StartDate) {
		http.Error(w, "End date cannot be before start date", http.StatusBadRequest)
		return
	}

	// Check that at least one question exists
	if len(req.Questions) == 0 {
		http.Error(w, "Ballot must have at least one question", http.StatusBadRequest)
		return
	}

	// Generate a new ballot ID
	ballotID := uuid.New().String()

	// Start transaction for ballot creation
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to create ballot", http.StatusInternalServerError)
		return
	}

	// Defer transaction rollback in case of error
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Insert the ballot into the database
	_, err = tx.Exec(
		"INSERT INTO ballots (id, title, created_by, start_date, end_date, status, max_voters, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		ballotID, req.Title, userID, req.StartDate, req.EndDate, "draft", req.MaxVoters, time.Now(), time.Now(),
	)
	if err != nil {
		log.Printf("Error creating ballot: %v", err)
		http.Error(w, "Failed to create ballot", http.StatusInternalServerError)
		return
	}

	// Create questions and options
	for _, question := range req.Questions {
		questionID := uuid.New().String()

		// Insert question
		_, err = tx.Exec(
			"INSERT INTO questions (id, ballot_id, title, description, order_index, allow_write_in, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
			questionID, ballotID, question.Title, question.Description, question.OrderIndex, question.AllowWriteIn, time.Now(), time.Now(),
		)
		if err != nil {
			log.Printf("Error creating question: %v", err)
			http.Error(w, "Failed to create ballot question", http.StatusInternalServerError)
			return
		}

		// Insert options for this question
		for _, option := range question.Options {
			optionID := uuid.New().String()

			_, err = tx.Exec(
				"INSERT INTO options (id, question_id, text, sub_text, party_name, order_index, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
				optionID, questionID, option.Text, option.SubText, option.PartyName, option.OrderIndex, time.Now(), time.Now(),
			)
			if err != nil {
				log.Printf("Error creating option: %v", err)
				http.Error(w, "Failed to create ballot option", http.StatusInternalServerError)
				return
			}
		}
	}

	// Add voters if provided
	for _, voter := range req.Voters {
		if voter.Email == "" {
			continue
		}

		// Check if the voter already exists as a user
		var voterUserID string
		var voterExists bool

		err = tx.QueryRow("SELECT id FROM users WHERE email = $1", voter.Email).Scan(&voterUserID)
		if err == nil {
			voterExists = true
		}

		voterRegID := uuid.New().String()

		if voterExists {
			// User exists, add them as a voter with user_id
			_, err = tx.Exec(
				"INSERT INTO ballot_voters (id, ballot_id, user_id, email, invitation_sent, registration_date) VALUES ($1, $2, $3, $4, $5, $6)",
				voterRegID, ballotID, voterUserID, voter.Email, false, time.Now(),
			)
		} else {
			// User doesn't exist, add them as a voter with just email
			_, err = tx.Exec(
				"INSERT INTO ballot_voters (id, ballot_id, email, invitation_sent, registration_date) VALUES ($1, $2, $3, $4, $5)",
				voterRegID, ballotID, voter.Email, false, time.Now(),
			)
		}

		if err != nil {
			log.Printf("Error adding voter: %v", err)
			// Continue anyway, not critical
		}
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to create ballot", http.StatusInternalServerError)
		return
	}

	// Return the created ballot
	ballot := models.Ballot{
		ID:        ballotID,
		Title:     req.Title,
		CreatedBy: userID,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		Status:    "draft",
		MaxVoters: req.MaxVoters,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    ballot,
	})

	log.Printf("Ballot created successfully: %s (%s)", req.Title, ballotID)
}

// Get returns a specific ballot
func (h *BallotHandler) Get(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get the ballot from the database
	var ballot models.Ballot
	err := h.db.QueryRow(
		"SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters, created_at, updated_at FROM ballots WHERE id = $1",
		ballotID,
	).Scan(
		&ballot.ID,
		&ballot.Title,
		&ballot.CreatedBy,
		&ballot.StartDate,
		&ballot.EndDate,
		&ballot.Status,
		&ballot.MaxVoters,
		&ballot.RegisteredVoters,
		&ballot.CreatedAt,
		&ballot.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	// Check if the user has access to this ballot
	if ballot.CreatedBy != userID {
		// Check if the user is a voter for this ballot
		var count int
		err := h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1 AND user_id = $2", ballotID, userID).Scan(&count)
		if err != nil || count == 0 {
			http.Error(w, "You do not have access to this ballot", http.StatusForbidden)
			return
		}
	}

	// Get questions for this ballot
	rows, err := h.db.Query(
		"SELECT id, title, description, order_index, allow_write_in, created_at, updated_at FROM questions WHERE ballot_id = $1 ORDER BY order_index",
		ballotID,
	)
	if err != nil {
		log.Printf("Error querying ballot questions: %v", err)
		http.Error(w, "Error retrieving ballot questions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var question models.Question
		err := rows.Scan(
			&question.ID,
			&question.Title,
			&question.Description,
			&question.OrderIndex,
			&question.AllowWriteIn,
			&question.CreatedAt,
			&question.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning question row: %v", err)
			continue
		}

		// Get options for this question
		optRows, err := h.db.Query(
			"SELECT id, text, sub_text, party_name, order_index FROM options WHERE question_id = $1 ORDER BY order_index",
			question.ID,
		)
		if err != nil {
			log.Printf("Error querying question options: %v", err)
			continue
		}

		options := []models.Option{}
		for optRows.Next() {
			var option models.Option
			err := optRows.Scan(
				&option.ID,
				&option.Text,
				&option.SubText,
				&option.PartyName,
				&option.OrderIndex,
			)
			if err != nil {
				log.Printf("Error scanning option row: %v", err)
				continue
			}
			options = append(options, option)
		}
		optRows.Close()

		question.Options = options
		questions = append(questions, question)
	}

	ballot.Questions = questions

	// Return the ballot
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    ballot,
	})
}

// Update updates a ballot
func (h *BallotHandler) Update(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to update this ballot
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", ballotID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to update this ballot", http.StatusForbidden)
		return
	}

	// Parse request body
	var ballot models.Ballot
	if err := json.NewDecoder(r.Body).Decode(&ballot); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Update the ballot in the database
	_, err = h.db.Exec(
		"UPDATE ballots SET title = $1, start_date = $2, end_date = $3, status = $4, max_voters = $5, updated_at = $6 WHERE id = $7",
		ballot.Title, ballot.StartDate, ballot.EndDate, ballot.Status, ballot.MaxVoters, time.Now(), ballotID,
	)
	if err != nil {
		log.Printf("Error updating ballot: %v", err)
		http.Error(w, "Failed to update ballot", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// Delete deletes a ballot
func (h *BallotHandler) Delete(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to delete this ballot
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", ballotID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to delete this ballot", http.StatusForbidden)
		return
	}

	// Delete the ballot from the database
	_, err = h.db.Exec("DELETE FROM ballots WHERE id = $1", ballotID)
	if err != nil {
		log.Printf("Error deleting ballot: %v", err)
		http.Error(w, "Failed to delete ballot", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})
}

// ListQuestions returns all questions for a ballot
func (h *BallotHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get questions for this ballot
	rows, err := h.db.Query(
		"SELECT id, title, description, order_index, allow_write_in, created_at, updated_at FROM questions WHERE ballot_id = $1 ORDER BY order_index",
		ballotID,
	)
	if err != nil {
		log.Printf("Error querying ballot questions: %v", err)
		http.Error(w, "Error retrieving ballot questions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var question models.Question
		err := rows.Scan(
			&question.ID,
			&question.Title,
			&question.Description,
			&question.OrderIndex,
			&question.AllowWriteIn,
			&question.CreatedAt,
			&question.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning question row: %v", err)
			continue
		}

		// Get options for this question
		optRows, err := h.db.Query(
			"SELECT id, text, sub_text, party_name, order_index FROM options WHERE question_id = $1 ORDER BY order_index",
			question.ID,
		)
		if err != nil {
			log.Printf("Error querying question options: %v", err)
			continue
		}

		options := []models.Option{}
		for optRows.Next() {
			var option models.Option
			err := optRows.Scan(
				&option.ID,
				&option.Text,
				&option.SubText,
				&option.PartyName,
				&option.OrderIndex,
			)
			if err != nil {
				log.Printf("Error scanning option row: %v", err)
				continue
			}
			options = append(options, option)
		}
		optRows.Close()

		question.Options = options
		questions = append(questions, question)
	}

	// Return the questions
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    questions,
	})
}

// CreateQuestion creates a new question for a ballot
func (h *BallotHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to update this ballot
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", ballotID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to update this ballot", http.StatusForbidden)
		return
	}

	// Parse request body
	var question models.Question
	if err := json.NewDecoder(r.Body).Decode(&question); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the question
	if question.Title == "" {
		http.Error(w, "Question title is required", http.StatusBadRequest)
		return
	}

	// Get the next order index
	var orderIndex int
	err = h.db.QueryRow("SELECT COALESCE(MAX(order_index), -1) + 1 FROM questions WHERE ballot_id = $1", ballotID).Scan(&orderIndex)
	if err != nil {
		log.Printf("Error querying max order index: %v", err)
		orderIndex = 0
	}

	// Generate a new question ID
	questionID := uuid.New().String()

	// Insert the question into the database
	_, err = h.db.Exec(
		"INSERT INTO questions (id, ballot_id, title, description, order_index, allow_write_in, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		questionID, ballotID, question.Title, question.Description, orderIndex, question.AllowWriteIn, time.Now(), time.Now(),
	)
	if err != nil {
		log.Printf("Error creating question: %v", err)
		http.Error(w, "Failed to create question", http.StatusInternalServerError)
		return
	}

	// Insert options if provided
	for i, option := range question.Options {
		optionID := uuid.New().String()
		_, err = h.db.Exec(
			"INSERT INTO options (id, question_id, text, sub_text, party_name, order_index) VALUES ($1, $2, $3, $4, $5, $6)",
			optionID, questionID, option.Text, option.SubText, option.PartyName, i,
		)
		if err != nil {
			log.Printf("Error creating option: %v", err)
			// Continue with other options
		}
	}

	// Return the created question
	question.ID = questionID
	question.OrderIndex = orderIndex
	question.CreatedAt = time.Now()
	question.UpdatedAt = time.Now()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    question,
	})
}

// ListVoters returns a list of voters for a ballot
func (h *BallotHandler) ListVoters(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to view voters for this ballot
	var createdBy string
	err := h.db.QueryRow("SELECT created_by FROM ballots WHERE id = $1", ballotID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to view voters for this ballot", http.StatusForbidden)
		return
	}

	// Get voters for this ballot
	rows, err := h.db.Query(`
		SELECT bv.id, bv.email, bv.invitation_sent, bv.invitation_accepted, bv.voted, bv.registration_date, 
		u.id AS user_id, u.first_name, u.last_name
		FROM ballot_voters bv
		LEFT JOIN users u ON bv.user_id = u.id
		WHERE bv.ballot_id = $1
		ORDER BY bv.email
	`, ballotID)
	if err != nil {
		log.Printf("Error querying ballot voters: %v", err)
		http.Error(w, "Error retrieving ballot voters", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Voter struct {
		ID                 string    `json:"id"`
		Email              string    `json:"email"`
		FirstName          string    `json:"first_name,omitempty"`
		LastName           string    `json:"last_name,omitempty"`
		UserID             string    `json:"user_id,omitempty"`
		InvitationSent     bool      `json:"invitation_sent"`
		InvitationAccepted bool      `json:"invitation_accepted"`
		Voted              bool      `json:"voted"`
		RegistrationDate   time.Time `json:"registration_date"`
	}

	voters := []Voter{}
	for rows.Next() {
		var voter Voter
		var userID, firstName, lastName sql.NullString

		err := rows.Scan(
			&voter.ID,
			&voter.Email,
			&voter.InvitationSent,
			&voter.InvitationAccepted,
			&voter.Voted,
			&voter.RegistrationDate,
			&userID,
			&firstName,
			&lastName,
		)
		if err != nil {
			log.Printf("Error scanning voter row: %v", err)
			continue
		}

		if userID.Valid {
			voter.UserID = userID.String
		}

		if firstName.Valid {
			voter.FirstName = firstName.String
		}

		if lastName.Valid {
			voter.LastName = lastName.String
		}

		voters = append(voters, voter)
	}

	// Return the voters
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    voters,
	})
}

// AddVoters adds voters to a ballot
func (h *BallotHandler) AddVoters(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to add voters to this ballot
	var createdBy string
	var status string
	err := h.db.QueryRow("SELECT created_by, status FROM ballots WHERE id = $1", ballotID).Scan(&createdBy, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to add voters to this ballot", http.StatusForbidden)
		return
	}

	if status != "draft" && status != "live" {
		http.Error(w, "Cannot add voters to a completed ballot", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req struct {
		Voters []struct {
			Email string `json:"email"`
			Name  string `json:"name,omitempty"` // Optional name for non-registered users
		} `json:"voters"`
		SendInvitations bool `json:"send_invitations"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Voters) == 0 {
		http.Error(w, "At least one voter is required", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to add voters", http.StatusInternalServerError)
		return
	}

	// Defer rollback in case of error
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Check if we're exceeding the maximum number of voters
	var currentVoters, maxVoters int
	err = tx.QueryRow("SELECT registered_voters, max_voters FROM ballots WHERE id = $1", ballotID).Scan(&currentVoters, &maxVoters)
	if err != nil {
		log.Printf("Error querying ballot voters count: %v", err)
		http.Error(w, "Failed to add voters", http.StatusInternalServerError)
		return
	}

	if currentVoters+len(req.Voters) > maxVoters {
		http.Error(w, "Cannot add voters: would exceed maximum voter limit", http.StatusBadRequest)
		return
	}

	// Add voters
	addedCount := 0
	skippedCount := 0
	addedVoters := []string{}

	for _, voter := range req.Voters {
		if voter.Email == "" {
			skippedCount++
			continue
		}

		// Check if this voter is already registered for this ballot
		var exists int
		err = tx.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1 AND email = $2",
			ballotID, voter.Email).Scan(&exists)
		if err != nil {
			log.Printf("Error checking voter existence: %v", err)
			continue
		}

		if exists > 0 {
			skippedCount++
			continue
		}

		// Check if the voter already exists as a user
		var existingUserID string
		err = tx.QueryRow("SELECT id FROM users WHERE email = $1", voter.Email).Scan(&existingUserID)

		// Generate voter registration ID
		voterRegID := uuid.New().String()

		if err == nil {
			// User exists, add them with user_id
			_, err = tx.Exec(
				"INSERT INTO ballot_voters (id, ballot_id, user_id, email, invitation_sent, registration_date) VALUES ($1, $2, $3, $4, $5, $6)",
				voterRegID, ballotID, existingUserID, voter.Email, req.SendInvitations, time.Now(),
			)
		} else {
			// User doesn't exist, add them with just email
			_, err = tx.Exec(
				"INSERT INTO ballot_voters (id, ballot_id, email, invitation_sent, registration_date) VALUES ($1, $2, $3, $4, $5)",
				voterRegID, ballotID, voter.Email, req.SendInvitations, time.Now(),
			)
		}

		if err != nil {
			log.Printf("Error adding voter %s: %v", voter.Email, err)
			skippedCount++
			continue
		}

		addedCount++
		addedVoters = append(addedVoters, voter.Email)

		// TODO: Send invitation email if sendInvitations is true
		if req.SendInvitations {
			// This would be implemented with an email service
			log.Printf("Would send invitation to %s for ballot %s", voter.Email, ballotID)
		}
	}

	// Update the ballot's registered voters count
	_, err = tx.Exec("UPDATE ballots SET registered_voters = registered_voters + $1, updated_at = $2 WHERE id = $3",
		addedCount, time.Now(), ballotID)
	if err != nil {
		log.Printf("Error updating ballot registered_voters: %v", err)
		http.Error(w, "Failed to update ballot", http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to add voters", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"added_count":   addedCount,
			"skipped_count": skippedCount,
			"added_voters":  addedVoters,
		},
	})

	log.Printf("Added %d voters to ballot %s", addedCount, ballotID)
}

// RemoveVoter removes a voter from a ballot
func (h *BallotHandler) RemoveVoter(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID and voter ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	voterID := chi.URLParam(r, "voterID")

	if ballotID == "" || voterID == "" {
		http.Error(w, "Ballot ID and voter ID are required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the user has permission to remove voters from this ballot
	var createdBy string
	var status string
	var registeredVoters int
	err := h.db.QueryRow("SELECT created_by, status, registered_voters FROM ballots WHERE id = $1", ballotID).Scan(&createdBy, &status, &registeredVoters)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if createdBy != userID {
		http.Error(w, "You do not have permission to remove voters from this ballot", http.StatusForbidden)
		return
	}

	if status != "draft" {
		http.Error(w, "Voters can only be removed from ballots in draft status", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to remove voter", http.StatusInternalServerError)
		return
	}

	// Defer rollback in case of error
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Check if the voter has already voted
	var voted bool
	err = tx.QueryRow("SELECT voted FROM ballot_voters WHERE id = $1 AND ballot_id = $2", voterID, ballotID).Scan(&voted)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Voter not found for this ballot", http.StatusNotFound)
			return
		}
		log.Printf("Error checking voter status: %v", err)
		http.Error(w, "Error checking voter status", http.StatusInternalServerError)
		return
	}

	if voted {
		http.Error(w, "Cannot remove a voter who has already voted", http.StatusBadRequest)
		return
	}

	// Delete the voter
	result, err := tx.Exec("DELETE FROM ballot_voters WHERE id = $1 AND ballot_id = $2", voterID, ballotID)
	if err != nil {
		log.Printf("Error deleting voter: %v", err)
		http.Error(w, "Failed to remove voter", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to remove voter", http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "Voter not found for this ballot", http.StatusNotFound)
		return
	}

	// Update the ballot's registered voters count
	_, err = tx.Exec("UPDATE ballots SET registered_voters = registered_voters - 1, updated_at = $1 WHERE id = $2",
		time.Now(), ballotID)
	if err != nil {
		log.Printf("Error updating ballot registered_voters: %v", err)
		http.Error(w, "Failed to update ballot", http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to remove voter", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"success": true,
	})

	log.Printf("Removed voter %s from ballot %s", voterID, ballotID)
}

// CastVote handles casting a vote for a ballot question
func (h *BallotHandler) CastVote(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the ballot exists and is live
	var status string
	err := h.db.QueryRow("SELECT status FROM ballots WHERE id = $1", ballotID).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	if status != "live" {
		http.Error(w, "Ballot is not live for voting", http.StatusBadRequest)
		return
	}

	// Check if the user is registered as a voter for this ballot
	var voterID string
	var voted bool
	err = h.db.QueryRow("SELECT id, voted FROM ballot_voters WHERE ballot_id = $1 AND user_id = $2",
		ballotID, userID).Scan(&voterID, &voted)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "You are not registered as a voter for this ballot", http.StatusForbidden)
			return
		}
		log.Printf("Error querying voter: %v", err)
		http.Error(w, "Error verifying voter registration", http.StatusInternalServerError)
		return
	}

	// Check if the user has already voted
	if voted {
		http.Error(w, "You have already voted in this election", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req struct {
		Votes []struct {
			QuestionID string `json:"question_id"`
			OptionID   string `json:"option_id,omitempty"` // Empty for write-in
			WriteIn    string `json:"write_in,omitempty"`  // Present for write-in
		} `json:"votes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if len(req.Votes) == 0 {
		http.Error(w, "At least one vote is required", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to cast vote", http.StatusInternalServerError)
		return
	}

	// Defer rollback in case of error
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Cast votes for each question
	for _, vote := range req.Votes {
		// Validate that this question belongs to the ballot
		var exists int
		err = tx.QueryRow("SELECT COUNT(*) FROM questions WHERE id = $1 AND ballot_id = $2",
			vote.QuestionID, ballotID).Scan(&exists)
		if err != nil {
			log.Printf("Error validating question: %v", err)
			http.Error(w, "Error validating ballot question", http.StatusInternalServerError)
			return
		}

		if exists == 0 {
			http.Error(w, "Invalid question ID", http.StatusBadRequest)
			return
		}

		// Validate option ID if provided
		if vote.OptionID != "" {
			err = tx.QueryRow("SELECT COUNT(*) FROM options WHERE id = $1 AND question_id = $2",
				vote.OptionID, vote.QuestionID).Scan(&exists)
			if err != nil {
				log.Printf("Error validating option: %v", err)
				http.Error(w, "Error validating ballot option", http.StatusInternalServerError)
				return
			}

			if exists == 0 {
				http.Error(w, "Invalid option ID", http.StatusBadRequest)
				return
			}
		}

		// Validate write-in if this is a write-in vote
		if vote.OptionID == "" && vote.WriteIn == "" {
			http.Error(w, "Either an option ID or write-in value must be provided", http.StatusBadRequest)
			return
		}

		// Insert the vote
		voteID := uuid.New().String()
		_, err = tx.Exec(
			"INSERT INTO votes (id, ballot_id, question_id, option_id, write_in, voter_id, cast_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
			voteID, ballotID, vote.QuestionID, vote.OptionID, vote.WriteIn, userID, time.Now(),
		)
		if err != nil {
			log.Printf("Error inserting vote: %v", err)
			http.Error(w, "Failed to cast vote", http.StatusInternalServerError)
			return
		}
	}

	// Mark the voter as having voted
	_, err = tx.Exec("UPDATE ballot_voters SET voted = true WHERE id = $1", voterID)
	if err != nil {
		log.Printf("Error updating voter status: %v", err)
		http.Error(w, "Failed to update voter status", http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to cast vote", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Vote successfully cast",
	})

	log.Printf("User %s cast a vote in ballot %s", userID, ballotID)
}

// GetResults returns the results for a ballot
func (h *BallotHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	// Get ballot ID from URL
	ballotID := chi.URLParam(r, "ballotID")
	if ballotID == "" {
		http.Error(w, "Ballot ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Check if the ballot exists
	var status string
	var createdBy string
	err := h.db.QueryRow("SELECT status, created_by FROM ballots WHERE id = $1", ballotID).Scan(&status, &createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Ballot not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying ballot: %v", err)
		http.Error(w, "Error retrieving ballot", http.StatusInternalServerError)
		return
	}

	// Verify the user can view results
	// Only the ballot creator can view results if the ballot is not completed
	if status != "completed" && createdBy != userID {
		// Check if the user is a voter for this ballot
		var count int
		err = h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1 AND user_id = $2",
			ballotID, userID).Scan(&count)
		if err != nil || count == 0 {
			http.Error(w, "You do not have access to this ballot's results", http.StatusForbidden)
			return
		}
	}

	// Get the ballot details
	var ballot models.Ballot
	err = h.db.QueryRow(
		"SELECT id, title, created_by, start_date, end_date, status, max_voters, registered_voters FROM ballots WHERE id = $1",
		ballotID,
	).Scan(
		&ballot.ID,
		&ballot.Title,
		&ballot.CreatedBy,
		&ballot.StartDate,
		&ballot.EndDate,
		&ballot.Status,
		&ballot.MaxVoters,
		&ballot.RegisteredVoters,
	)
	if err != nil {
		log.Printf("Error querying ballot details: %v", err)
		http.Error(w, "Error retrieving ballot details", http.StatusInternalServerError)
		return
	}

	// Get ballot questions
	rows, err := h.db.Query(
		"SELECT id, title, description, order_index, allow_write_in FROM questions WHERE ballot_id = $1 ORDER BY order_index",
		ballotID,
	)
	if err != nil {
		log.Printf("Error querying ballot questions: %v", err)
		http.Error(w, "Error retrieving ballot questions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type QuestionResult struct {
		models.Question
		Options []struct {
			models.Option
			VoteCount  int     `json:"vote_count"`
			Percentage float64 `json:"percentage"`
		} `json:"options"`
		WriteInCount   int     `json:"write_in_count"`
		WriteInPercent float64 `json:"write_in_percent"`
		TotalVotes     int     `json:"total_votes"`
	}

	type BallotResults struct {
		models.Ballot
		Questions         []QuestionResult `json:"questions"`
		TotalVoters       int              `json:"total_voters"`
		VotedCount        int              `json:"voted_count"`
		ParticipationRate float64          `json:"participation_rate"`
	}

	// Prepare the results
	results := BallotResults{
		Ballot:    ballot,
		Questions: []QuestionResult{},
	}

	// Get voting metrics
	err = h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1", ballotID).Scan(&results.TotalVoters)
	if err != nil {
		log.Printf("Error counting voters: %v", err)
		results.TotalVoters = 0
	}

	err = h.db.QueryRow("SELECT COUNT(*) FROM ballot_voters WHERE ballot_id = $1 AND voted = true", ballotID).Scan(&results.VotedCount)
	if err != nil {
		log.Printf("Error counting votes: %v", err)
		results.VotedCount = 0
	}

	// Calculate participation rate
	if results.TotalVoters > 0 {
		results.ParticipationRate = float64(results.VotedCount) / float64(results.TotalVoters) * 100
	}

	// Process questions and their results
	for rows.Next() {
		var question QuestionResult
		err := rows.Scan(
			&question.ID,
			&question.Title,
			&question.Description,
			&question.OrderIndex,
			&question.AllowWriteIn,
		)
		if err != nil {
			log.Printf("Error scanning question: %v", err)
			continue
		}

		// Get options for this question
		optRows, err := h.db.Query(
			"SELECT id, text, sub_text, party_name, order_index FROM options WHERE question_id = $1 ORDER BY order_index",
			question.ID,
		)
		if err != nil {
			log.Printf("Error querying options: %v", err)
			continue
		}

		// Count total votes for this question
		err = h.db.QueryRow("SELECT COUNT(*) FROM votes WHERE question_id = $1", question.ID).Scan(&question.TotalVotes)
		if err != nil {
			log.Printf("Error counting votes for question: %v", err)
			question.TotalVotes = 0
		}

		// Get option results
		for optRows.Next() {
			var option struct {
				models.Option
				VoteCount  int     `json:"vote_count"`
				Percentage float64 `json:"percentage"`
			}
			err := optRows.Scan(
				&option.ID,
				&option.Text,
				&option.SubText,
				&option.PartyName,
				&option.OrderIndex,
			)
			if err != nil {
				log.Printf("Error scanning option: %v", err)
				continue
			}

			// Count votes for this option
			err = h.db.QueryRow("SELECT COUNT(*) FROM votes WHERE question_id = $1 AND option_id = $2",
				question.ID, option.ID).Scan(&option.VoteCount)
			if err != nil {
				log.Printf("Error counting votes for option: %v", err)
				option.VoteCount = 0
			}

			// Calculate percentage
			if question.TotalVotes > 0 {
				option.Percentage = float64(option.VoteCount) / float64(question.TotalVotes) * 100
			}

			question.Options = append(question.Options, option)
		}
		optRows.Close()

		// Count write-in votes if allowed
		if question.AllowWriteIn {
			err = h.db.QueryRow("SELECT COUNT(*) FROM votes WHERE question_id = $1 AND write_in != ''",
				question.ID).Scan(&question.WriteInCount)
			if err != nil {
				log.Printf("Error counting write-in votes: %v", err)
				question.WriteInCount = 0
			}

			// Calculate write-in percentage
			if question.TotalVotes > 0 {
				question.WriteInPercent = float64(question.WriteInCount) / float64(question.TotalVotes) * 100
			}
		}

		results.Questions = append(results.Questions, question)
	}

	// Return the results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    results,
	})
}
