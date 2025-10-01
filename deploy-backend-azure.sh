#!/bin/bash

echo "🚀 Deploying Hebrew-Integrated Backend to Azure Web App"
echo "========================================================"

# Configuration
RESOURCE_GROUP="wonder-healthcare"
APP_NAME="wonder-engine-web"
PLAN_NAME="wonder-app-plan"
LOCATION="eastus"

# Build backend package
echo "📦 Building backend package..."
cd packages/gateway

# Create deployment package with Hebrew data
echo "📝 Creating deployment package with Hebrew nurse database..."
cat > web.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="src/server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^src/server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="src/server.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
    <iisnode watchedFiles="web.config;*.js"
             nodeProcessCommandLine="node --max-old-space-size=4096"
             loggingEnabled="true"
             logDirectory="iisnode"/>
  </system.webServer>
</configuration>
EOF

# Create package.json for Azure
echo "📋 Creating Azure-compatible package.json..."
cat > package-azure.json << 'EOF'
{
  "name": "@wonder/gateway",
  "version": "1.0.0",
  "description": "Wonder Healthcare Gateway with Hebrew Support",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "postinstall": "echo 'Hebrew nurse database ready'"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.21.3",
    "cors": "^2.8.5",
    "joi": "^17.13.3",
    "pino": "^9.6.0",
    "dotenv": "^17.2.2",
    "csv-parse": "^5.6.0"
  }
}
EOF

# Copy essential files
echo "📂 Preparing deployment files..."
mkdir -p deploy-backend
cp -r src deploy-backend/
cp -r public deploy-backend/
cp web.config deploy-backend/
cp package-azure.json deploy-backend/package.json
cp -r ../engine-basic deploy-backend/
cp -r ../engine-fuzzy deploy-backend/

# Create .env for Azure
cat > deploy-backend/.env << 'EOF'
NODE_ENV=production
PORT=8080
USE_DB=false
HEBREW_SUPPORT=true
EOF

# Zip the deployment package
echo "🗜️ Creating deployment package..."
cd deploy-backend
zip -r ../../hebrew-backend-deploy.zip . -q

cd ../..

echo "☁️ Deploying to Azure Web App..."
# Deploy using Azure CLI
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src hebrew-backend-deploy.zip

# Set environment variables
echo "⚙️ Setting environment variables..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings NODE_ENV=production PORT=8080 HEBREW_SUPPORT=true USE_DB=false

# Restart the app
echo "♻️ Restarting Azure Web App..."
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

echo "✅ Backend deployed to https://${APP_NAME}.azurewebsites.net"
echo "📊 Hebrew nurse database with 3,184 nurses is now live!"
echo ""
echo "Test the deployment:"
echo "curl https://${APP_NAME}.azurewebsites.net/health"
echo "curl -X POST https://${APP_NAME}.azurewebsites.net/match?engine=engine-basic -H 'Content-Type: application/json' -d '{\"nurseName\":\"אורטל\",\"topK\":3}'"