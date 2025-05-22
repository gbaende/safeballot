package payments

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
)

// PaymentIntentRequest represents the incoming request to create a payment intent
type PaymentIntentRequest struct {
	Amount   int64  `json:"amount"`
	Currency string `json:"currency"`
}

// PaymentConfirmRequest represents the incoming request to confirm a payment
type PaymentConfirmRequest struct {
	PaymentIntentID string `json:"paymentIntentId"`
	PaymentMethodID string `json:"paymentMethodId"`
}

// InitStripe initializes the Stripe API with the secret key
func InitStripe() {
	// Replace with your actual Stripe secret key or read from environment variable
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	if stripeKey == "" {
		stripeKey = "sk_test_4eC39HqLyjWDarjtT1zdp7dc" // Test key, replace in production
	}
	stripe.Key = stripeKey
}

// CreatePaymentIntentHandler handles requests to create a new payment intent
func CreatePaymentIntentHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the request body
	var req PaymentIntentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate the amount
	if req.Amount <= 0 {
		http.Error(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	// Set default currency if not provided
	if req.Currency == "" {
		req.Currency = "usd"
	}

	// Create the payment intent
	params := &stripe.PaymentIntentParams{
		Amount:             stripe.Int64(req.Amount),
		Currency:           stripe.String(req.Currency),
		PaymentMethodTypes: stripe.StringSlice([]string{"card", "us_bank_account"}),
		// Optional: Add receipt email, description, metadata, etc.
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		log.Printf("Error creating payment intent: %v", err)
		http.Error(w, fmt.Sprintf("Error creating payment: %v", err), http.StatusInternalServerError)
		return
	}

	// Respond with the client secret
	response := struct {
		ClientSecret string `json:"clientSecret"`
	}{
		ClientSecret: pi.ClientSecret,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// ConfirmPaymentHandler handles requests to confirm a payment
func ConfirmPaymentHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the request body
	var req PaymentConfirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate the payment intent ID
	if req.PaymentIntentID == "" {
		http.Error(w, "Payment intent ID is required", http.StatusBadRequest)
		return
	}

	// Validate the payment method ID
	if req.PaymentMethodID == "" {
		http.Error(w, "Payment method ID is required", http.StatusBadRequest)
		return
	}

	// Confirm the payment intent
	params := &stripe.PaymentIntentConfirmParams{
		PaymentMethod: stripe.String(req.PaymentMethodID),
	}

	pi, err := paymentintent.Confirm(req.PaymentIntentID, params)
	if err != nil {
		log.Printf("Error confirming payment intent: %v", err)
		http.Error(w, fmt.Sprintf("Error confirming payment: %v", err), http.StatusInternalServerError)
		return
	}

	// Respond with the confirmation status
	response := struct {
		Status   string `json:"status"`
		Requires struct {
			Action string `json:"action"`
		} `json:"requires"`
	}{
		Status: string(pi.Status),
	}

	if pi.Status == stripe.PaymentIntentStatusRequiresAction {
		response.Requires.Action = string(pi.NextAction.Type)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// GetPaymentStatusHandler handles requests to check the status of a payment intent
func GetPaymentStatusHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the payment intent ID from the URL or query parameters
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Payment intent ID is required", http.StatusBadRequest)
		return
	}

	// Retrieve the payment intent
	pi, err := paymentintent.Get(id, nil)
	if err != nil {
		log.Printf("Error retrieving payment intent: %v", err)
		http.Error(w, fmt.Sprintf("Error retrieving payment: %v", err), http.StatusInternalServerError)
		return
	}

	// Respond with the payment status
	response := struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Amount string `json:"amount"`
	}{
		ID:     pi.ID,
		Status: string(pi.Status),
		Amount: strconv.FormatInt(pi.Amount/100, 10) + "." + strconv.FormatInt(pi.Amount%100, 10),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
