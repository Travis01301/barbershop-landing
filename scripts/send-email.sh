#!/bin/bash

# Send update email to client
# Usage: RESEND_API_KEY=your_key EMAIL_FROM=from@example.com bash scripts/send-email.sh

if [ -z "$RESEND_API_KEY" ]; then
  echo "❌ Error: RESEND_API_KEY environment variable not set"
  exit 1
fi

EMAIL_FROM="${EMAIL_FROM:-dev@barbershop.example.com}"
RECIPIENT="jnason@ibsnyc.com"
SUBJECT="✅ Barbershop Booking System - Production Ready"

# Read HTML from file
if [ ! -f "UPDATE_EMAIL.html" ]; then
  echo "❌ Error: UPDATE_EMAIL.html not found"
  exit 1
fi

HTML_CONTENT=$(cat UPDATE_EMAIL.html)

# Send via Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"$EMAIL_FROM\",
    \"to\": \"$RECIPIENT\",
    \"subject\": \"$SUBJECT\",
    \"html\": $(echo "$HTML_CONTENT" | jq -Rs .)
  }"

echo ""
echo "✅ Email sent to $RECIPIENT"
