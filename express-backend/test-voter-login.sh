#!/bin/bash

# Test voter login endpoint with the test-voter we created
echo "Testing voter login endpoint with test-voter@example.com..."
curl -X POST http://localhost:8080/api/auth/voter/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test-voter@example.com","password":"password123"}' \
  -v

echo "\n\nCheck the server logs for detailed information about the request processing." 