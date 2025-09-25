#!/bin/bash

# Wonder Healthcare Platform - Azure Environment Setup
# =====================================================

echo "🏥 Wonder Healthcare Platform - Environment Setup"
echo "================================================="
echo ""

# Set subscription ID (U-BTech - CSP)
export AZURE_SUBSCRIPTION_ID="08b0ac81-a17e-421c-8c1b-41b59ee758a3"

# Get user input for sensitive variables
read -p "Enter admin email address: " ADMIN_EMAIL
export ADMIN_EMAIL="${ADMIN_EMAIL}"

# Generate secure password for DB if not provided
read -p "Enter database admin password (or press Enter to generate): " DB_ADMIN_PASSWORD
if [ -z "$DB_ADMIN_PASSWORD" ]; then
    DB_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/")
    echo "Generated secure password: $DB_ADMIN_PASSWORD"
    echo "⚠️  Please save this password securely!"
fi
export DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD}"

# Azure OpenAI configuration
echo ""
echo "Azure OpenAI Configuration (Optional - can be configured later)"
echo "----------------------------------------------------------------"
read -p "Enter Azure OpenAI API Key (or press Enter to skip): " AZURE_OPENAI_KEY
export AZURE_OPENAI_KEY="${AZURE_OPENAI_KEY:-placeholder-key}"

read -p "Enter Azure OpenAI Endpoint (or press Enter for default): " AZURE_OPENAI_ENDPOINT
export AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-https://placeholder.openai.azure.com/}"

# Display configured values
echo ""
echo "✅ Environment Variables Configured:"
echo "====================================="
echo "AZURE_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION_ID"
echo "ADMIN_EMAIL: $ADMIN_EMAIL"
echo "DB_ADMIN_PASSWORD: [hidden]"
echo "AZURE_OPENAI_KEY: ${AZURE_OPENAI_KEY:0:10}..."
echo "AZURE_OPENAI_ENDPOINT: $AZURE_OPENAI_ENDPOINT"

# Save to .env file for future use
cat > /home/odedbe/wonder/azure/.env.production << EOF
AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID
ADMIN_EMAIL=$ADMIN_EMAIL
DB_ADMIN_PASSWORD=$DB_ADMIN_PASSWORD
AZURE_OPENAI_KEY=$AZURE_OPENAI_KEY
AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
EOF

echo ""
echo "💾 Configuration saved to azure/.env.production"
echo ""
echo "To load these variables in future sessions, run:"
echo "  source /home/odedbe/wonder/azure/.env.production"
echo ""
echo "✅ Ready to run deployment preparation!"
echo "  Run: ./azure/prepare-deployment.sh"