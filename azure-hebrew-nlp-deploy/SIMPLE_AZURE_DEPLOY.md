# Simple Azure Deployment Steps

## Your app is ready in: `azure-full-app/`

## Option 1: Deploy using Azure CLI (RECOMMENDED)
Run these commands one by one:

```bash
# 1. Navigate to the app directory
cd /home/odedbe/wonder/azure-hebrew-nlp-deploy/azure-full-app

# 2. Remove node_modules to make smaller package
rm -rf node_modules

# 3. Create deployment package
zip -r ../deploy.zip .

# 4. Deploy to Azure
az webapp deploy \
  --resource-group wonder-llm-rg \
  --name wonder-ceo-web \
  --src-path ../deploy.zip \
  --type zip \
  --async false

# 5. Set the app to build on deploy
az webapp config appsettings set \
  --resource-group wonder-llm-rg \
  --name wonder-ceo-web \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true

# 6. Restart the app
az webapp restart \
  --resource-group wonder-llm-rg \
  --name wonder-ceo-web
```

## Option 2: Using Azure Portal (NO UPLOAD BUTTON)

Since you don't have an upload button, use **Deployment Center**:

1. Go to Azure Portal
2. Navigate to your App Service: **wonder-ceo-web**
3. Click **Deployment Center** (left menu)
4. Choose **External Git**
5. Repository URL: Create a GitHub repo and push the azure-full-app folder
6. Branch: main
7. Save

## Option 3: Use Azure Cloud Shell

1. Open Azure Portal
2. Click the Cloud Shell icon (>_) at the top
3. Upload files:
   - Click upload/download icon
   - Upload the `azure-full-app.zip`
4. Run:
```bash
unzip azure-full-app.zip
cd azure-full-app
npm install
az webapp up --name wonder-ceo-web --resource-group wonder-llm-rg
```

## What's Included:
- ✅ Full React frontend (built)
- ✅ Hebrew NLP backend
- ✅ All dependencies in package.json
- ✅ Transparent scoring formula
- ✅ Mock Hebrew nurse database

## Testing After Deploy:
```bash
# Test health
curl https://wonder-ceo-web.azurewebsites.net/health

# Open in browser
https://wonder-ceo-web.azurewebsites.net
```

## Current Local Test (WORKING):
The app is running locally on http://localhost:8081 - fully functional!