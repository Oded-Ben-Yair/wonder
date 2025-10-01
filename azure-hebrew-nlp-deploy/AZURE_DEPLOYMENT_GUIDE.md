# Azure Deployment Guide - Wonder Healthcare Platform

## Current Status
- **App Service**: wonder-ceo-web.azurewebsites.net
- **Plan**: B3 (upgraded for better performance)
- **Platform**: Linux with Node.js 20 LTS

## Complete Deployment Package Ready
The full application with React frontend and Hebrew NLP backend is ready in:
- **Location**: `/home/odedbe/wonder/azure-hebrew-nlp-deploy/azure-full-app/`
- **ZIP Package**: `azure-full-app.zip` (242KB - without node_modules)

## Files Included:
1. **server.js** - Complete Express server with:
   - Hebrew NLP nurse matching
   - Health check endpoint
   - Transparent scoring formula
   - React frontend serving

2. **public/** - Full React build:
   - index.html
   - assets/index-*.js (React app)
   - assets/index-*.css (Styles)

3. **package.json** - Dependencies configuration
4. **web.config** - IIS configuration for Windows deployment

## Manual Deployment Steps (Azure Portal):

### Option 1: Deploy via Azure Portal UI
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **App Services** > **wonder-ceo-web**
3. Click **Deployment Center** in the left menu
4. Under **Settings** tab:
   - Source: **Local Git** or **ZIP Deploy**
   - For ZIP: Upload `azure-full-app.zip`
5. Click **Save**

### Option 2: Use Azure Cloud Shell
1. Open [Azure Cloud Shell](https://portal.azure.com/#cloudshell/)
2. Upload the `azure-full-app.zip` file
3. Run:
```bash
az webapp deploy \
  --resource-group wonder-llm-rg \
  --name wonder-ceo-web \
  --src-path azure-full-app.zip \
  --type zip
```

### Option 3: Configure Build on Deploy
1. In Azure Portal > App Service > **Configuration**
2. Add Application Settings:
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
   - `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
3. Deploy the ZIP file

## Post-Deployment Configuration:

### Required Settings
In **Configuration** > **Application settings**, ensure:
- `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
- `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
- `PORT` = `8080`

### Startup Command
In **Configuration** > **General settings**:
- Startup Command: `node server.js`

## Testing the Deployment:

### 1. Health Check
```bash
curl https://wonder-ceo-web.azurewebsites.net/health
```
Expected response:
```json
{
  "status": "ok",
  "message": "Wonder Healthcare Platform with Hebrew NLP is running!",
  "hebrewSupport": true,
  "version": "2.0.0"
}
```

### 2. Engines Check
```bash
curl https://wonder-ceo-web.azurewebsites.net/engines
```

### 3. Test Nurse Matching
```bash
curl -X POST https://wonder-ceo-web.azurewebsites.net/match \
  -H "Content-Type: application/json" \
  -d '{
    "city": "תל אביב",
    "servicesQuery": ["טיפול בפצעים"],
    "topK": 3
  }'
```

### 4. Access UI
Open browser to: https://wonder-ceo-web.azurewebsites.net

## Troubleshooting:

### If deployment fails:
1. Check logs in **Deployment Center** > **Logs**
2. Use SSH console: **Development Tools** > **SSH**
3. Verify node_modules:
   ```bash
   cd /home/site/wwwroot
   npm install
   ```

### If app doesn't start:
1. Check **Diagnose and solve problems**
2. View logs: **Monitoring** > **Log stream**
3. Restart app: **Overview** > **Restart**

## Local Testing:
The app is currently running locally on port 8081:
- http://localhost:8081/health - Working ✅
- Full React UI and API endpoints functional

## Support Contact:
For issues, check:
- Azure Status: https://wonder-ceo-web.scm.azurewebsites.net
- Diagnostics: https://wonder-ceo-web.scm.azurewebsites.net/detectors