#!/bin/bash
# Test Mercado Pago checkout flow

: "${TEST_EMAIL:?Set TEST_EMAIL before running this script}"
: "${TEST_PASSWORD:?Set TEST_PASSWORD before running this script}"

# 1. Login
LOGIN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  --data-urlencode "email=$TEST_EMAIL" \
  --data-urlencode "password=$TEST_PASSWORD")

echo "Login: $(echo "$LOGIN" | head -c 100)"

# Extract token using node (more reliable)
TOKEN=$(echo "$LOGIN" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const d = JSON.parse(chunks.join(''));
    console.log(d.data.access_token);
  } catch(e) { console.error('Parse error:', e.message); }
});
")

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  echo "Response: $LOGIN"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# 2. Create preference
PREF=$(curl -s -X POST http://localhost:3000/v1/payments/create-preference \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"premium_monthly"}')

echo ""
echo "Preference response: $PREF"
