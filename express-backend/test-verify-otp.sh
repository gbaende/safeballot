#!/bin/bash

# Read the user ID and OTP code from the user
read -p "Enter the user ID: " USER_ID
read -p "Enter the OTP code: " OTP_CODE

# Test OTP verification endpoint
echo "Testing OTP verification endpoint..."
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"code\":\"$OTP_CODE\"}" \
  -v

echo "\n\nCheck the server logs for detailed information about the request processing." 