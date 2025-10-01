# Manual Azure Deployment Guide

## Current Status
✅ **Enhanced backend ready** - shows nurse names, supports all filters, clear ratings
❌ **Not deployed to Azure** - authentication issues with CLI

## Quick Azure Portal Deployment

### Option 1: Azure Portal ZIP Deploy (Easiest)

1. **Go to**: https://portal.azure.com
2. **Navigate to**: Resource Groups → wonder-llm-rg → wonder-ceo-web
3. **Go to**: Development Tools → Advanced Tools → Go
4. **In Kudu console**: Tools → Zip Push Deploy
5. **Drag and drop**: `/home/odedbe/wonder/deploy-ceo.zip`
6. **Wait** for deployment to complete
7. **Go back to Azure Portal**: wonder-ceo-web → Overview → Restart

### Option 2: FTP Upload

1. **Get FTP credentials**:
   - Azure Portal → wonder-ceo-web → Deployment Center
   - Click "FTPS Credentials" tab
   - Note: Username, Password, FTP hostname

2. **Upload files via FTP**:
   ```
   Host: ftps://waws-prod-sec-009.ftp.azurewebsites.windows.net
   Directory: /site/wwwroot
   Files to upload:
   - server.js (from gateway-simple/)
   - package.json
   - package-lock.json
   - data/ folder (entire folder)
   ```

3. **Restart app** in Azure Portal

### Option 3: Use Azure CLI (if working)

```bash
# Run this script
./deploy-to-azure.sh

# Or manually:
az login --use-device-code
az account set --subscription "cd86a2f0-1e3b-4417-b379-5efb5843f838"
az webapp deploy --resource-group wonder-llm-rg --name wonder-ceo-web --src-path deploy-ceo.zip --type zip
az webapp restart --resource-group wonder-llm-rg --name wonder-ceo-web
```

## After Deployment Test

1. **Check health**:
   ```bash
   curl https://wonder-ceo-web.azurewebsites.net/health
   ```
   Should show: `"nursesLoaded": 457` and `"engine-enhanced"`

2. **Test nurse search with names**:
   ```bash
   curl -X POST https://wonder-ceo-web.azurewebsites.net/match \
     -H "Content-Type: application/json" \
     -d '{"city":"Tel Aviv", "servicesQuery":["wound care"]}'
   ```
   Should return nurses with names like "Sarah Cohen", not just IDs

3. **Test statistics**:
   ```bash
   curl https://wonder-ceo-web.azurewebsites.net/stats
   ```

## What's Fixed in This Deployment

1. ✅ **Nurse Names**: Every result shows actual names (Sarah Cohen, David Levy)
2. ✅ **Advanced Filters**: Gender, mobility, specializations, include inactive
3. ✅ **Rating Explanation**: Clear explanation of how rating is calculated
4. ✅ **Full Dataset**: All 457 nurses (not just 371)
5. ✅ **All Cities**: 83 cities supported
6. ✅ **All Specializations**: 27+ medical specializations

## Frontend Update Needed

After backend is deployed, update the frontend API URL in:
```javascript
// packages/ui/src/utils/api.ts
const API_BASE = 'https://wonder-ceo-web.azurewebsites.net';
```

## URLs After Deployment
- Backend API: https://wonder-ceo-web.azurewebsites.net
- Frontend: https://wonder-engine.azurewebsites.net (needs updating)

## If Deployment Fails

1. Check Azure Portal logs: wonder-ceo-web → Monitoring → Log Stream
2. Verify Node.js version is 20-lts (already configured)
3. Check that files were uploaded to /site/wwwroot
4. Restart the app service

The enhanced backend is ready and tested locally - just needs to get to Azure!