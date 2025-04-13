package models

import (
	"time"
)

// Ballot represents an election ballot in the system
type Ballot struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	CreatedBy        string     `json:"created_by"`             // User ID of creator
	CreatorName      string     `json:"creator_name,omitempty"` // Not stored in DB, populated for API responses
	StartDate        time.Time  `json:"start_date"`
	EndDate          time.Time  `json:"end_date"`
	Status           string     `json:"status"` // draft, live, completed
	MaxVoters        int        `json:"max_voters"`
	RegisteredVoters int        `json:"registered_voters"`
	Questions        []Question `json:"questions"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// Question represents a ballot question
type Question struct {
	ID           string    `json:"id"`
	BallotID     string    `json:"ballot_id"`
	Title        string    `json:"title"`
	OrderIndex   int       `json:"order_index"`
	Options      []Option  `json:"options"`
	AllowWriteIn bool      `json:"allow_write_in"`
	Description  string    `json:"description,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Option represents a possible answer to a ballot question
type Option struct {
	ID         string `json:"id"`
	Text       string `json:"text"`
	SubText    string `json:"sub_text,omitempty"` // For candidates' running mates or party
	PartyName  string `json:"party_name,omitempty"`
	OrderIndex int    `json:"order_index"`
}

// Vote represents a cast vote for a ballot question
type Vote struct {
	ID         string    `json:"id"`
	BallotID   string    `json:"ballot_id"`
	QuestionID string    `json:"question_id"`
	OptionID   string    `json:"option_id,omitempty"` // Empty if write-in
	WriteIn    string    `json:"write_in,omitempty"`
	VoterID    string    `json:"voter_id"` // Anonymized voter reference
	CastAt     time.Time `json:"cast_at"`
}

// NewBallot creates a new ballot
func NewBallot(title string, creatorID string, startDate, endDate time.Time, maxVoters int) *Ballot {
	return &Ballot{
		Title:     title,
		CreatedBy: creatorID,
		StartDate: startDate,
		EndDate:   endDate,
		Status:    "draft",
		MaxVoters: maxVoters,
		Questions: []Question{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}
