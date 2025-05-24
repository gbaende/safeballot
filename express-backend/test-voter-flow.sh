#!/bin/bash

# Define the test user
TEST_EMAIL="test-voter@example.com"
TEST_PASSWORD="password123"

# Step 1: Login with the test voter
echo "Step 1: Login with the test voter..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/voter/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

# Extract the userId and ttlMinutes from the response
USER_ID=$(echo $RESPONSE | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
TTL_MINUTES=$(echo $RESPONSE | grep -o '"ttlMinutes":[0-9]*' | cut -d':' -f2)

if [ -z "$USER_ID" ]; then
  echo "Error: Could not extract user ID from response"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "Login successful!"
echo "User ID: $USER_ID"
echo "OTP expires in: $TTL_MINUTES minutes"

# Step 2: Look up the OTP code in the log output
echo -e "\nStep 2: Looking for OTP code in recent logs..."
# Look for OTP in the logs by pattern (assumes it was logged by the server)
CODE=$(node -e "
const { getOtp } = require('./utils/otpStore');

async function lookupOtp(userId) {
  try {
    // First try to connect to DB
    await require('./db/db').connectDb();
    
    // Use the existing utility function to get OTP
    const code = await getOtp(userId);
    if (code) {
      console.log(code);
    } else {
      console.error('No OTP found for user ID: ' + userId);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error looking up OTP:', err);
    process.exit(1);
  }
}

lookupOtp('$USER_ID');
")

if [ -z "$CODE" ]; then
  echo "Error: Could not find OTP code in logs or database"
  echo "Please check server console for the OTP code and enter it manually:"
  read -p "Enter OTP code: " CODE
  if [ -z "$CODE" ]; then
    echo "No OTP code entered. Aborting."
    exit 1
  fi
fi

echo "Using OTP Code: $CODE"

# Step 3: Verify the OTP code
echo -e "\nStep 3: Verifying OTP code..."
VERIFY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"code\":\"$CODE\"}")

# Check if verification was successful
SUCCESS=$(echo $VERIFY_RESPONSE | grep -o '"success":true')

if [ -z "$SUCCESS" ]; then
  echo "Error: OTP verification failed"
  echo "Response: $VERIFY_RESPONSE"
  exit 1
fi

# Extract token from response
TOKEN=$(echo $VERIFY_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "OTP verification successful!"
if [ ! -z "$TOKEN" ]; then
  echo "JWT Token received: ${TOKEN:0:20}..."
else
  echo "Warning: No token found in response"
fi

echo -e "\nTest completed successfully!" 