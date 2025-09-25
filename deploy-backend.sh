#!/bin/bash

echo "Deploying updated backend to Azure..."

# Copy files to temp directory
TEMP_DIR=$(mktemp -d)
cp -r /home/odedbe/wonder/gateway-simple/* $TEMP_DIR/

# Create deployment package
cd $TEMP_DIR
zip -q -r deploy.zip .

# Deploy using Azure CLI
az webapp deployment source config-zip \
  --resource-group wonder-llm-rg \
  --name wonder-engine-web \
  --src deploy.zip

# Clean up
rm -rf $TEMP_DIR

echo "Deployment complete. Restarting app..."
az webapp restart --resource-group wonder-llm-rg --name wonder-engine-web

echo "Done!"