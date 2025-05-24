#!/bin/bash

# Set the API key - replace with your actual API key
ONFIDO_API_KEY="api_live.ivHWUptu69y.K8TMvNhLKLqCWYjqhtn-v90qMwHCWpnM"
ONFIDO_BASE_URL="https://api.onfido.com/v3"

echo "Testing Onfido API with key: ${ONFIDO_API_KEY:0:10}..."

# Create an applicant
echo "Creating test applicant..."
APPLICANT_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE_URL/applicants" \
  -H "Authorization: Token token=$ONFIDO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test.user@example.com"
  }')

echo "Response: $APPLICANT_RESPONSE"

# Check if there was an error
if echo "$APPLICANT_RESPONSE" | grep -q "error"; then
  echo "Error creating applicant. Please check your API key and try again."
  echo "You might need to contact Onfido support if the API key is correct but still not working."
  exit 1
fi

echo "Test completed." 