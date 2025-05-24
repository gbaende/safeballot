#!/bin/bash

# Prompt for user ID and OTP code
echo "Enter the user ID from the login response:"
read USER_ID

echo "Enter the OTP code (check server logs):"
read OTP_CODE

# Step 3: Verify the OTP code
echo -e "\nVerifying OTP code..."
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"code\":\"$OTP_CODE\"}" \
  -v 