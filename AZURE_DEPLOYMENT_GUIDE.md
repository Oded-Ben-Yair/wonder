# Azure Deployment Guide for Hebrew Integration

## Current Status
✅ **Local**: Full Hebrew integration working with 6,703 nurses
⚠️ **Azure**: Deployment complete but needs configuration

## Issue
The Azure Web App (wonder-ceo-web) is serving HTML files instead of running the Node.js API backend.

## Solution - Azure Portal Configuration

### 1. Access Azure Portal
- Go to: https://portal.azure.com
- Sign in with your credentials

### 2. Navigate to App Service
- Resource Group: `wonder-llm-rg`
- App Service: `wonder-ceo-web`

### 3. Configure Runtime Settings
Go to **Configuration** → **General settings**:
- **Stack**: Node
- **Major version**: 18 LTS
- **Minor version**: LTS
- **Startup Command**: `node src/server.js`
- Click **Save**

### 4. Configure Application Settings
Go to **Configuration** → **Application settings** → **New application setting**:

Add these settings:
| Name | Value |
|------|-------|
| WEBSITE_NODE_DEFAULT_VERSION | 18-lts |
| PORT | 8080 |
| NODE_ENV | production |
| USE_DB | false |
| HEBREW_SUPPORT | true |

Click **Save** after adding all settings.

### 5. Configure Path Mappings (Important!)
Go to **Configuration** → **Path mappings**:
- Remove any virtual application pointing to `/site/wwwroot/public`
- Ensure main virtual application points to `/site/wwwroot`

### 6. Restart the App
- Go to **Overview**
- Click **Restart**
- Wait 2-3 minutes for the app to fully start

## Testing the API

After configuration, test the API:

```bash
# Test health endpoint
curl https://wonder-ceo-web.azurewebsites.net/health

# Expected response:
{
  "status": "healthy",
  "engines": ["engine-basic", "engine-fuzzy"],
  "timestamp": ...
}

# Test Hebrew name search
curl -X POST "https://wonder-ceo-web.azurewebsites.net/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"nurseName":"אורטל","topK":3}'

# Expected: Returns nurses with Hebrew names like "אורטל צוקרל"
```

## Files Deployed

### Package Contents (hebrew-api-only.zip - 38MB):
- ✅ `src/` - All source files with Hebrew data
  - `src/data/nurse_names.json` (1.2MB) - Hebrew name mappings
  - `src/data/hebrew_search_index.json` (358KB) - Search index
  - `src/server.js` - Main API server
- ✅ `engine-basic/` - Basic search engine
- ✅ `engine-fuzzy/` - Fuzzy search engine
- ✅ `package.json` - Configured for Node.js
- ✅ `web.config` - IIS configuration
- ❌ No HTML files (removed to prevent static serving)

## Alternative: GitHub Actions Deployment

If manual configuration doesn't work, use GitHub Actions:

1. Create `.github/workflows/deploy-azure.yml`:
```yaml
name: Deploy to Azure Web App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Build and zip
        run: |
          cd packages/gateway
          npm ci
          zip -r deploy.zip . -x "node_modules/*" "*.log"

      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: wonder-ceo-web
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: packages/gateway/deploy.zip
```

2. Get publish profile from Azure Portal:
   - Go to App Service → Overview
   - Click "Get publish profile"
   - Add as GitHub secret named `AZURE_WEBAPP_PUBLISH_PROFILE`

## Verification Checklist

After configuration, verify:
- [ ] `/health` returns JSON, not HTML
- [ ] `/match` endpoint accepts POST requests
- [ ] Hebrew names are returned (אורטל, בתיה, etc.)
- [ ] Response contains 6,703 nurses (not 457)
- [ ] No HTML is served from API endpoints

## Support

If the app still serves HTML after configuration:
1. Check **Log stream** in Azure Portal for errors
2. Verify `web.config` is present in deployment
3. Ensure no `index.html` or `default.html` in root
4. Check that startup command is `node src/server.js`

## Status Summary
- **Local Development**: ✅ Fully working with Hebrew
- **Deployment Package**: ✅ Created with all Hebrew data
- **Azure Upload**: ✅ Successfully deployed
- **Azure Configuration**: ⚠️ Needs manual portal configuration
- **API Functionality**: ⏳ Will work after configuration

---
*Last Updated: 2025-09-28*