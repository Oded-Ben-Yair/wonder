# AZURE DEPLOYMENT FIX - URGENT

## The Problem
The Azure App Service is misconfigured. The app cannot start because:
1. Node modules are not installed (Express not found error)
2. The deployment process is not running npm install
3. The app times out completely (not even returning 503)

## Manual Fix Required

### Option 1: Use Azure Portal
1. Go to Azure Portal > App Services > wonder-ceo-web
2. Navigate to "Configuration" > "General settings"
3. Change Stack to "Node 20 LTS"
4. Set Startup Command to: `npm install && node minimal-server.js`
5. Save and restart

### Option 2: Use SSH in Azure Portal
1. Go to "Development Tools" > "SSH"
2. Run these commands:
   ```bash
   cd /home/site/wwwroot
   npm install
   node minimal-server.js
   ```

### Option 3: Switch to Linux App Service
The current Windows-based App Service with IIS is causing issues.
Create a new Linux-based App Service:

```bash
# Create new Linux App Service
az webapp create \
  --resource-group wonder-llm-rg \
  --plan wonder-linux-plan \
  --name wonder-hebrew-nlp \
  --runtime "NODE:20-lts" \
  --deployment-local-git

# Deploy the app
git init
git add .
git commit -m "Initial commit"
git remote add azure <deployment-url>
git push azure main
```

## Why This Keeps Failing

1. **WEBSITE_RUN_FROM_PACKAGE=1** was preventing proper extraction
2. **SCM_DO_BUILD_DURING_DEPLOYMENT** not working properly
3. **IIS web.config** conflicts with Node.js module resolution
4. **No npm install** is running during deployment

## Test Files Created

- `minimal-server.js` - Simple CommonJS server that should work
- Updated `package.json` - Points to minimal server
- Updated `web.config` - Points to minimal server

## Current Status
Even the minimal server with CommonJS (no ES6 modules) is not starting.
This confirms the issue is with Azure configuration, not the code.

## Recommended Action
**Switch to a Linux-based App Service** - This will avoid all the IIS/Windows issues.
