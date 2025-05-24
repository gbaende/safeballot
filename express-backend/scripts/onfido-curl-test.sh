#!/bin/bash

# Load environment variables
if [ -f "../../.env" ]; then
  export $(grep -v '^#' ../../.env | xargs)
  echo "Loaded environment variables from ../../.env"
else
  echo "Warning: .env file not found"
fi

# Set Onfido API variables
ONFIDO_TOKEN=${ONFIDO_API_KEY}
ONFIDO_BASE="https://api.onfido.com/v3"

if [[ -z "$ONFIDO_TOKEN" ]]; then
  echo "Error: ONFIDO_API_KEY environment variable not set"
  exit 1
fi

echo "Using token: ${ONFIDO_TOKEN:0:10}..."
echo "Using base URL: $ONFIDO_BASE"
echo "Token type: $(if [[ "$ONFIDO_TOKEN" == api_sandbox* ]]; then echo "SANDBOX"; else echo "LIVE"; fi)"

# Check for required file paths
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <front_document_path> [back_document_path]"
  echo "Example: $0 /path/to/front.jpg /path/to/back.jpg"
  exit 1
fi

FRONT_PATH="$1"
BACK_PATH="$2"

if [[ ! -f "$FRONT_PATH" ]]; then
  echo "Error: Front document file not found at $FRONT_PATH"
  exit 1
fi

if [[ ! -z "$BACK_PATH" && ! -f "$BACK_PATH" ]]; then
  echo "Error: Back document file not found at $BACK_PATH"
  exit 1
fi

# Step 1: Create Applicant
echo -e "\n--- Step 1: Creating applicant ---"
APPLICANT_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE/applicants" \
  -H "Authorization: Token token=$ONFIDO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test.user@example.com"}')

echo "Response: $APPLICANT_RESPONSE"
APPLICANT_ID=$(echo $APPLICANT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$APPLICANT_ID" ]]; then
  echo "Error: Failed to extract applicant ID"
  exit 1
fi

echo "Applicant ID: $APPLICANT_ID"

# Step 2: Generate SDK Token
echo -e "\n--- Step 2: Generating SDK token ---"
SDK_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE/sdk_token" \
  -H "Authorization: Token token=$ONFIDO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"applicant_id\":\"$APPLICANT_ID\",\"referrer\":\"https://localhost:3000/*\"}")

echo "Response: $SDK_RESPONSE"
SDK_TOKEN=$(echo $SDK_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$SDK_TOKEN" ]]; then
  echo "Error: Failed to extract SDK token"
  exit 1
fi

echo "SDK Token: ${SDK_TOKEN:0:15}..."

# Step 3.1: Upload Front Document
echo -e "\n--- Step 3.1: Uploading front document ---"
FRONT_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE/documents" \
  -H "Authorization: Token token=$ONFIDO_TOKEN" \
  -F "file=@$FRONT_PATH" \
  -F "type=driving_licence" \
  -F "side=front" \
  -F "issuing_country=USA" \
  -F "applicant_id=$APPLICANT_ID")

echo "Response: $FRONT_RESPONSE"
FRONT_ID=$(echo $FRONT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$FRONT_ID" ]]; then
  echo "Error: Failed to extract front document ID"
  exit 1
fi

echo "Front Document ID: $FRONT_ID"

# Step 3.2: Upload Back Document (if provided)
BACK_ID=""
if [[ ! -z "$BACK_PATH" ]]; then
  echo -e "\n--- Step 3.2: Uploading back document ---"
  BACK_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE/documents" \
    -H "Authorization: Token token=$ONFIDO_TOKEN" \
    -F "file=@$BACK_PATH" \
    -F "type=driving_licence" \
    -F "side=back" \
    -F "issuing_country=USA" \
    -F "applicant_id=$APPLICANT_ID")

  echo "Response: $BACK_RESPONSE"
  BACK_ID=$(echo $BACK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

  if [[ -z "$BACK_ID" ]]; then
    echo "Error: Failed to extract back document ID"
    exit 1
  fi

  echo "Back Document ID: $BACK_ID"
fi

# Step 4.1: Fetch Document Metadata
echo -e "\n--- Step 4.1: Fetching document metadata ---"
DOC_RESPONSE=$(curl -s -X GET "$ONFIDO_BASE/documents/$FRONT_ID" \
  -H "Authorization: Token token=$ONFIDO_TOKEN")

echo "Response: $DOC_RESPONSE"

# Step 4.2: Fetch OCR Data
echo -e "\n--- Step 4.2: Fetching OCR data ---"
OCR_RESPONSE=$(curl -s -X GET "$ONFIDO_BASE/documents/$FRONT_ID/ocr" \
  -H "Authorization: Token token=$ONFIDO_TOKEN")

echo "Response: $OCR_RESPONSE"

# Step 5: Create a Check
echo -e "\n--- Step 5: Creating check ---"
CHECK_PAYLOAD="{\"applicant_id\":\"$APPLICANT_ID\",\"report_names\":[\"document\"],\"document_ids\":[\"$FRONT_ID\""
if [[ ! -z "$BACK_ID" ]]; then
  CHECK_PAYLOAD="$CHECK_PAYLOAD,\"$BACK_ID\""
fi
CHECK_PAYLOAD="$CHECK_PAYLOAD]}"

echo "Payload: $CHECK_PAYLOAD"

CHECK_RESPONSE=$(curl -s -X POST "$ONFIDO_BASE/checks" \
  -H "Authorization: Token token=$ONFIDO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CHECK_PAYLOAD")

echo "Response: $CHECK_RESPONSE"
CHECK_ID=$(echo $CHECK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$CHECK_ID" ]]; then
  echo "Error: Failed to extract check ID"
  exit 1
fi

echo "Check ID: $CHECK_ID"

# Step 6: Poll Check Status
echo -e "\n--- Step 6: Polling check status ---"
MAX_ATTEMPTS=15
WAIT_SECONDS=2
ATTEMPT=1
REPORT_ID=""

while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
  echo "Poll attempt $ATTEMPT/$MAX_ATTEMPTS..."
  
  POLL_RESPONSE=$(curl -s -X GET "$ONFIDO_BASE/checks/$CHECK_ID" \
    -H "Authorization: Token token=$ONFIDO_TOKEN")
  
  STATUS=$(echo $POLL_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "Status: $STATUS"
  
  if [[ "$STATUS" == "complete" ]]; then
    echo "Check complete!"
    
    # Try to extract report ID
    REPORT_ID=$(echo $POLL_RESPONSE | grep -o '"reports":\[.*\]' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [[ ! -z "$REPORT_ID" ]]; then
      echo "Report ID: $REPORT_ID"
      break
    else
      echo "Warning: No report ID found in response"
      echo "Full response: $POLL_RESPONSE"
      break
    fi
  fi
  
  echo "Waiting $WAIT_SECONDS seconds..."
  sleep $WAIT_SECONDS
  
  ATTEMPT=$((ATTEMPT + 1))
done

if [[ $ATTEMPT -gt $MAX_ATTEMPTS ]]; then
  echo "Check did not complete within maximum attempts"
  exit 1
fi

# Step 7: Fetch Detailed Report (if available)
if [[ ! -z "$REPORT_ID" ]]; then
  echo -e "\n--- Step 7: Fetching detailed report ---"
  REPORT_RESPONSE=$(curl -s -X GET "$ONFIDO_BASE/reports/$REPORT_ID" \
    -H "Authorization: Token token=$ONFIDO_TOKEN")
  
  echo "Response: $REPORT_RESPONSE"
  
  # Check for extracted data
  if echo $REPORT_RESPONSE | grep -q '"extracted_data"'; then
    echo -e "\nExtracted data found in report!"
    EXTRACTED=$(echo $REPORT_RESPONSE | grep -o '"extracted_data":{[^}]*}' | sed 's/"extracted_data"://')
    echo "Extracted data: $EXTRACTED"
  elif echo $REPORT_RESPONSE | grep -q '"properties"'; then
    echo -e "\nProperties found in report!"
    PROPERTIES=$(echo $REPORT_RESPONSE | grep -o '"properties":{[^}]*}' | sed 's/"properties"://')
    echo "Properties: $PROPERTIES"
  else
    echo "No extracted data found in report"
  fi
fi

echo -e "\n--- Test completed successfully ---"
echo "Applicant ID: $APPLICANT_ID"
echo "Front Document ID: $FRONT_ID"
if [[ ! -z "$BACK_ID" ]]; then
  echo "Back Document ID: $BACK_ID"
fi
echo "Check ID: $CHECK_ID"
if [[ ! -z "$REPORT_ID" ]]; then
  echo "Report ID: $REPORT_ID"
fi 