package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

// MockElectionSummary provides mock election summary data
func MockElectionSummary(w http.ResponseWriter, r *http.Request) {
	summary := struct {
		ActiveElections   int `json:"active_elections"`
		DraftElections    int `json:"draft_elections"`
		CompleteElections int `json:"complete_elections"`
		TotalVoters       int `json:"total_voters"`
		TotalVotes        int `json:"total_votes"`
	}{
		ActiveElections:   3,
		DraftElections:    2,
		CompleteElections: 5,
		TotalVoters:       250,
		TotalVotes:        187,
	}

	response := map[string]interface{}{
		"success": true,
		"data":    summary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MockRecentElections provides mock recent elections data
func MockRecentElections(w http.ResponseWriter, r *http.Request) {
	now := time.Now()

	elections := []map[string]interface{}{
		{
			"id":                "e123456",
			"title":             "Board of Directors Election 2023",
			"created_by":        "u987654",
			"creator_name":      "John Smith",
			"start_date":        now.AddDate(0, 0, -10).Format(time.RFC3339),
			"end_date":          now.AddDate(0, 0, 20).Format(time.RFC3339),
			"status":            "live",
			"max_voters":        100,
			"registered_voters": 78,
			"created_at":        now.AddDate(0, -1, 0).Format(time.RFC3339),
		},
		{
			"id":                "e234567",
			"title":             "Annual HOA Meeting Vote",
			"created_by":        "u876543",
			"creator_name":      "Sarah Johnson",
			"start_date":        now.AddDate(0, 0, 5).Format(time.RFC3339),
			"end_date":          now.AddDate(0, 0, 15).Format(time.RFC3339),
			"status":            "draft",
			"max_voters":        50,
			"registered_voters": 0,
			"created_at":        now.AddDate(0, 0, -5).Format(time.RFC3339),
		},
		{
			"id":                "e345678",
			"title":             "City Council Special Election",
			"created_by":        "u765432",
			"creator_name":      "Michael Brown",
			"start_date":        now.AddDate(0, 0, -30).Format(time.RFC3339),
			"end_date":          now.AddDate(0, 0, -15).Format(time.RFC3339),
			"status":            "completed",
			"max_voters":        200,
			"registered_voters": 172,
			"created_at":        now.AddDate(0, -2, 0).Format(time.RFC3339),
		},
	}

	response := map[string]interface{}{
		"success": true,
		"data":    elections,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MockUpcomingElections provides mock upcoming elections data
func MockUpcomingElections(w http.ResponseWriter, r *http.Request) {
	now := time.Now()

	elections := []map[string]interface{}{
		{
			"id":                "e234567",
			"title":             "Annual HOA Meeting Vote",
			"created_by":        "u876543",
			"start_date":        now.AddDate(0, 0, 5).Format(time.RFC3339),
			"end_date":          now.AddDate(0, 0, 15).Format(time.RFC3339),
			"status":            "live",
			"max_voters":        50,
			"registered_voters": 45,
			"created_at":        now.AddDate(0, 0, -5).Format(time.RFC3339),
		},
		{
			"id":                "e456789",
			"title":             "School Board Election",
			"created_by":        "u654321",
			"start_date":        now.AddDate(0, 0, 10).Format(time.RFC3339),
			"end_date":          now.AddDate(0, 0, 25).Format(time.RFC3339),
			"status":            "live",
			"max_voters":        150,
			"registered_voters": 120,
			"created_at":        now.AddDate(0, 0, -10).Format(time.RFC3339),
		},
	}

	response := map[string]interface{}{
		"success": true,
		"data":    elections,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MockElectionStatus provides mock election status data
func MockElectionStatus(w http.ResponseWriter, r *http.Request) {
	now := time.Now()

	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	status := map[string]interface{}{
		"title":              "Board of Directors Election 2023",
		"status":             "live",
		"start_date":         now.AddDate(0, 0, -10).Format(time.RFC3339),
		"end_date":           now.AddDate(0, 0, 20).Format(time.RFC3339),
		"registered_voters":  78,
		"votes_cast":         52,
		"participation_rate": 66.7,
	}

	response := map[string]interface{}{
		"success": true,
		"data":    status,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MockStartElection provides mock start election response
func MockStartElection(w http.ResponseWriter, r *http.Request) {
	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	response := map[string]bool{
		"success": true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MockEndElection provides mock end election response
func MockEndElection(w http.ResponseWriter, r *http.Request) {
	electionID := r.URL.Query().Get("id")
	if electionID == "" {
		http.Error(w, "Election ID is required", http.StatusBadRequest)
		return
	}

	response := map[string]bool{
		"success": true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
