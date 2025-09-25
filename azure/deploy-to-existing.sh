#!/bin/bash

# Wonder Healthcare Platform - Deploy to Existing Azure Infrastructure
# =====================================================================

set -e

echo "🏥 Wonder Healthcare Platform - Deployment to Existing Infrastructure"
echo "====================================================================="
echo ""

# Configuration
RESOURCE_GROUP="wonder-llm-rg"
LOCATION="swedencentral"
APP_SERVICE_PLAN="wonder-linux-plan"
GATEWAY_APP="wonder-engine-web"
UI_APP="wonder-ceo-web"
AZURE_OPENAI_NAME="brn-azai"
AZURE_OPENAI_ENDPOINT="https://swedencentral.api.cognitive.microsoft.com/"

# Get Azure OpenAI key
echo "📝 Getting Azure OpenAI key..."
AZURE_OPENAI_KEY=$(az cognitiveservices account keys list \
    --name $AZURE_OPENAI_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "key1" -o tsv)

if [ -z "$AZURE_OPENAI_KEY" ]; then
    echo "❌ Failed to retrieve Azure OpenAI key"
    exit 1
fi

echo "✅ Retrieved Azure OpenAI configuration"

# Deploy Gateway to wonder-engine-web
echo ""
echo "🚀 Deploying Gateway to $GATEWAY_APP..."

# Configure app settings for gateway
az webapp config appsettings set \
    --name $GATEWAY_APP \
    --resource-group $RESOURCE_GROUP \
    --settings \
    PORT=5050 \
    NODE_ENV=production \
    AZURE_OPENAI_KEY="$AZURE_OPENAI_KEY" \
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4" \
    USE_DB=false \
    --output none

echo "✅ App settings configured for gateway"

# Build the gateway
echo "📦 Building gateway application..."
cd /home/odedbe/wonder/packages/gateway
npm install --production

# Create deployment package
echo "📦 Creating deployment package for gateway..."
cd /home/odedbe/wonder
zip -r gateway-deploy.zip packages/gateway packages/engine-basic packages/engine-fuzzy packages/engine-azure-gpt packages/shared-utils package.json -x "*/node_modules/*" "*/.*" "*/__pycache__/*"

# Deploy using zip deployment
echo "📤 Deploying gateway code..."
az webapp deployment source config-zip \
    --name $GATEWAY_APP \
    --resource-group $RESOURCE_GROUP \
    --src gateway-deploy.zip \
    --output none

echo "✅ Gateway deployed to $GATEWAY_APP"

# Deploy UI to wonder-ceo-web
echo ""
echo "🎨 Building and deploying UI to $UI_APP..."

# Build UI
cd /home/odedbe/wonder/packages/ui
npm install
npm run build

# Configure UI app as static site
az webapp config set \
    --name $UI_APP \
    --resource-group $RESOURCE_GROUP \
    --startup-file "" \
    --linux-fx-version "STATICSITE|1.0" \
    --output none

# Create UI deployment package
cd dist
zip -r /home/odedbe/wonder/ui-deploy.zip *

# Deploy UI
az webapp deployment source config-zip \
    --name $UI_APP \
    --resource-group $RESOURCE_GROUP \
    --src /home/odedbe/wonder/ui-deploy.zip \
    --output none

echo "✅ UI deployed to $UI_APP"

# Get URLs
GATEWAY_URL=$(az webapp show --name $GATEWAY_APP --resource-group $RESOURCE_GROUP --query "defaultHostName" -o tsv)
UI_URL=$(az webapp show --name $UI_APP --resource-group $RESOURCE_GROUP --query "defaultHostName" -o tsv)

# Configure CORS for gateway
echo ""
echo "🔧 Configuring CORS..."
az webapp cors add \
    --name $GATEWAY_APP \
    --resource-group $RESOURCE_GROUP \
    --allowed-origins "https://$UI_URL" "http://localhost:3000" \
    --output none

echo "✅ CORS configured"

# Restart apps
echo ""
echo "♻️ Restarting applications..."
az webapp restart --name $GATEWAY_APP --resource-group $RESOURCE_GROUP
az webapp restart --name $UI_APP --resource-group $RESOURCE_GROUP

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "🌐 Gateway URL: https://$GATEWAY_URL"
echo "🎨 UI URL: https://$UI_URL"
echo ""
echo "📊 Endpoints:"
echo "  - Health Check: https://$GATEWAY_URL/health"
echo "  - List Engines: https://$GATEWAY_URL/engines"
echo "  - Match API: https://$GATEWAY_URL/match"
echo ""
echo "🔍 To check deployment status:"
echo "  az webapp log tail --name $GATEWAY_APP --resource-group $RESOURCE_GROUP"
echo ""
echo "📝 Next steps:"
echo "  1. Test the health endpoint"
echo "  2. Verify UI loads correctly"
echo "  3. Test the chatbot functionality"
echo "  4. Monitor logs for any errors"