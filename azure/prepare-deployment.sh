#!/bin/bash

# Wonder Healthcare Platform - Pre-Deployment Preparation Script
# This script prepares the environment for Azure deployment
#
# Usage: ./azure/prepare-deployment.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🏥 Wonder Healthcare Platform - Deployment Preparation"
echo "====================================================="
echo ""

# Check for required environment variables
check_env_vars() {
    echo "📋 Checking required environment variables..."
    
    local missing_vars=()
    local required_vars=(
        "AZURE_SUBSCRIPTION_ID"
        "ADMIN_EMAIL"
        "DB_ADMIN_PASSWORD"
        "AZURE_OPENAI_KEY"
        "AZURE_OPENAI_ENDPOINT"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        else
            echo -e "  ${GREEN}✓${NC} $var is set"
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "\n${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "  ${RED}• $var${NC}"
        done
        echo -e "\n${YELLOW}Please set these variables before deployment:${NC}"
        echo "  export AZURE_SUBSCRIPTION_ID='your-subscription-id'"
        echo "  export ADMIN_EMAIL='admin@example.com'"
        echo "  export DB_ADMIN_PASSWORD='secure-password'"
        echo "  export AZURE_OPENAI_KEY='your-openai-key'"
        echo "  export AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com/'"
        exit 1
    fi
}

# Create production parameters file
create_parameters_file() {
    echo -e "\n📝 Creating deployment parameters file..."
    
    local params_file="$SCRIPT_DIR/parameters.generated.json"
    
    cat > "$params_file" << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appName": {"value": "wonder-healthcare"},
    "environment": {"value": "prod"},
    "location": {"value": "${AZURE_LOCATION:-East US}"},
    "adminEmail": {"value": "$ADMIN_EMAIL"},
    "dbAdminUsername": {"value": "wonderadmin"},
    "dbAdminPassword": {"value": "$DB_ADMIN_PASSWORD"},
    "azureOpenAIKey": {"value": "$AZURE_OPENAI_KEY"},
    "azureOpenAIEndpoint": {"value": "$AZURE_OPENAI_ENDPOINT"},
    "containerRegistryName": {"value": "wonderhealthcareprodacr"},
    "customDomain": {"value": ""},
    "tags": {
      "value": {
        "Application": "Wonder Healthcare",
        "Environment": "Production",
        "ManagedBy": "Bicep",
        "CostCenter": "Healthcare",
        "DeployedBy": "$USER",
        "DeploymentDate": "$(date +%Y-%m-%d)"
      }
    }
  }
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Parameters file created: $params_file"
}

# Validate Dockerfile
validate_dockerfile() {
    echo -e "\n🐳 Validating Dockerfile..."
    
    if [[ ! -f "$PROJECT_ROOT/Dockerfile" ]]; then
        echo -e "  ${RED}❌ Dockerfile not found${NC}"
        exit 1
    fi
    
    # Check for correct paths
    local issues=()
    
    if grep -q "engine-azure-gpt5" "$PROJECT_ROOT/Dockerfile"; then
        issues+=("References to 'engine-azure-gpt5' found (should be 'engine-azure-gpt')")
    fi
    
    if ! grep -q "packages/gateway" "$PROJECT_ROOT/Dockerfile"; then
        issues+=("Missing correct package paths")
    fi
    
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo -e "  ${YELLOW}⚠ Dockerfile issues found:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "    • $issue"
        done
        echo -e "  ${YELLOW}Run the fix-dockerfile.sh script to resolve${NC}"
    else
        echo -e "  ${GREEN}✓${NC} Dockerfile validation passed"
    fi
}

# Check Node.js dependencies
check_dependencies() {
    echo -e "\n📦 Checking Node.js dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [[ ! -d "node_modules" ]]; then
        echo -e "  ${YELLOW}⚠ Dependencies not installed${NC}"
        echo "  Installing dependencies..."
        npm ci
    else
        echo -e "  ${GREEN}✓${NC} Dependencies installed"
    fi
    
    # Check for vulnerabilities
    echo "  Checking for vulnerabilities..."
    npm audit --audit-level=high || true
}

# Build container locally for testing
test_container_build() {
    echo -e "\n🏗️ Testing container build locally..."
    
    cd "$PROJECT_ROOT"
    
    if docker build -t wonder-gateway:test . > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Container builds successfully"
        
        # Test container startup
        echo "  Testing container startup..."
        if docker run -d --name wonder-test -p 5051:5050 \
            -e NODE_ENV=production \
            -e PORT=5050 \
            -e USE_DB=false \
            wonder-gateway:test > /dev/null 2>&1; then
            
            sleep 5
            if curl -f -s http://localhost:5051/health > /dev/null 2>&1; then
                echo -e "  ${GREEN}✓${NC} Container health check passed"
            else
                echo -e "  ${YELLOW}⚠ Container health check failed${NC}"
            fi
            
            docker stop wonder-test > /dev/null 2>&1
            docker rm wonder-test > /dev/null 2>&1
        else
            echo -e "  ${YELLOW}⚠ Container failed to start${NC}"
        fi
    else
        echo -e "  ${RED}❌ Container build failed${NC}"
        echo "  Run 'docker build -t wonder-gateway:test .' to see errors"
    fi
}

# Generate deployment checklist
generate_checklist() {
    echo -e "\n📋 Deployment Checklist"
    echo "======================"
    
    cat << EOF

Pre-Deployment:
□ Environment variables configured
□ Azure CLI installed and logged in
□ Docker installed and running
□ Dockerfile validated
□ Dependencies installed
□ Container builds successfully

Azure Resources to be Created:
□ Resource Group: wonder-healthcare-prod
□ Container Registry: wonderhealthcareprodacr
□ Container App: wonder-healthcare-prod-gateway
□ PostgreSQL Database: wonder-healthcare-prod-db
□ Static Web App: wonder-healthcare-prod-ui
□ Key Vault: wonder-healthcare-prod-kv
□ Application Insights: wonder-healthcare-prod-insights
□ Log Analytics Workspace: wonder-healthcare-prod-logs

Deployment Commands:
1. Login to Azure:
   az login

2. Set subscription:
   az account set --subscription "$AZURE_SUBSCRIPTION_ID"

3. Create resource group:
   az group create --name wonder-healthcare-prod --location "East US"

4. Deploy infrastructure:
   az deployment group create \\
     --resource-group wonder-healthcare-prod \\
     --template-file azure/main.bicep \\
     --parameters @azure/parameters.generated.json

5. Build and push container:
   ./azure/deploy.sh --env prod

Post-Deployment:
□ Verify health endpoint: https://<app-url>/health
□ Check Application Insights for errors
□ Configure Static Web App GitHub integration
□ Run database migrations
□ Test API endpoints
□ Set up monitoring alerts

EOF
}

# Main execution
main() {
    check_env_vars
    create_parameters_file
    validate_dockerfile
    check_dependencies
    test_container_build
    generate_checklist
    
    echo -e "\n${GREEN}✅ Deployment preparation complete!${NC}"
    echo -e "Review the checklist above and proceed with deployment."
}

main "$@"