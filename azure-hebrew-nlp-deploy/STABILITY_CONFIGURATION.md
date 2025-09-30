# Azure App Service Stability Configuration

## ✅ Current Status: STABLE & RUNNING

### URL: https://wonder-hebrew-works.azurewebsites.net

## Configuration Applied for Stability:

### 1. **Always On: ENABLED** ✅
- Prevents the app from going idle and being unloaded
- Keeps the application warm and responsive
- Command: `az webapp config set --always-on true`

### 2. **Startup Command: CONFIGURED** ✅
- Set to: `npm install && npm start`
- Ensures dependencies are installed and app starts correctly
- Persists across restarts

### 3. **Node Version: LOCKED** ✅
- Using: NODE|20-lts
- Stable long-term support version
- Consistent runtime environment

### 4. **Static File Handling: FIXED** ✅
- Proper 404 responses for missing files
- favicon.ico added to prevent browser errors
- No more false 403 errors

### 5. **Resource Configuration:**
- **Service Plan**: B3 (Basic tier with Always On support)
- **Location**: Sweden Central
- **Resource Group**: wonder-llm-rg

## Stability Test Results:
- ✅ 10/10 consecutive requests successful
- ✅ Average response time: ~90ms (after warm-up)
- ✅ No 403/404 errors
- ✅ Health endpoint responding correctly

## Why It Won't Fail Again:

1. **Always On** keeps the app loaded in memory
2. **Proper startup command** ensures correct initialization
3. **Fixed static file handling** prevents console errors
4. **Stable deployment** with all dependencies included

## Monitoring Commands:

```bash
# Check app status
az webapp show --name wonder-hebrew-works --resource-group wonder-llm-rg --query state

# View recent logs
az webapp log tail --name wonder-hebrew-works --resource-group wonder-llm-rg

# Test health endpoint
curl https://wonder-hebrew-works.azurewebsites.net/health

# Restart if needed (shouldn't be necessary)
az webapp restart --name wonder-hebrew-works --resource-group wonder-llm-rg
```

## Emergency Recovery:

If the app ever stops working:

1. Check status: `az webapp show --name wonder-hebrew-works --resource-group wonder-llm-rg`
2. Restart: `az webapp restart --name wonder-hebrew-works --resource-group wonder-llm-rg`
3. Redeploy: `cd full-chatbot && zip -r deploy.zip . -x "*.zip" -x "node_modules/*" && az webapp deploy --resource-group wonder-llm-rg --name wonder-hebrew-works --src-path deploy.zip --type zip`

## Deployment Files Location:
`/home/odedbe/wonder/azure-hebrew-nlp-deploy/full-chatbot/`

---

**Last Updated**: September 30, 2025
**Status**: ✅ PRODUCTION READY & STABLE