#!/bin/bash
# Azure deployment script for Wonder CEO app

echo "=== Wonder CEO Azure Deployment ==="
echo "This script deploys the enhanced backend to Azure"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if logged in
echo -e "${YELLOW}Checking Azure login...${NC}"
if ! az account show &>/dev/null; then
    echo -e "${RED}Not logged in to Azure${NC}"
    echo "Please run: az login --use-device-code"
    exit 1
fi

# Set correct subscription
echo -e "${YELLOW}Setting subscription...${NC}"
az account set --subscription "cd86a2f0-1e3b-4417-b379-5efb5843f838"

# Show current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}Using subscription: $SUBSCRIPTION${NC}"

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
rm -f deploy-ceo.zip
zip -r deploy-ceo.zip gateway-simple/ -x "*/node_modules/*" -q

# Deploy to wonder-ceo-web
echo -e "${YELLOW}Deploying to wonder-ceo-web.azurewebsites.net...${NC}"
az webapp deploy \
    --resource-group wonder-llm-rg \
    --name wonder-ceo-web \
    --src-path deploy-ceo.zip \
    --type zip \
    --async false

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful!${NC}"

    # Restart the app
    echo -e "${YELLOW}Restarting app...${NC}"
    az webapp restart --resource-group wonder-llm-rg --name wonder-ceo-web

    # Test the deployment
    echo -e "${YELLOW}Waiting 15 seconds for app to start...${NC}"
    sleep 15

    echo -e "${YELLOW}Testing deployment...${NC}"
    curl -s https://wonder-ceo-web.azurewebsites.net/health | jq '.'

    echo ""
    echo -e "${GREEN}=== Deployment Complete ===${NC}"
    echo "Backend API: https://wonder-ceo-web.azurewebsites.net"
    echo "Test with: curl https://wonder-ceo-web.azurewebsites.net/health"
else
    echo -e "${RED}Deployment failed!${NC}"
    echo "Please check Azure Portal or try manual deployment"
fi