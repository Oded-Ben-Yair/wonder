# Azure Configuration Fix Instructions

## Option 1: Via Azure CLI (Recommended)

Run these commands in order:

```bash
# 1. Set the correct Node.js runtime and startup command
az webapp config set \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg \
  --startup-file "node src/server.js" \
  --use-32bit-worker-process false

# 2. Ensure all environment variables are set
az webapp config appsettings set \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    USE_DB=false \
    HEBREW_SUPPORT=true \
    WEBSITE_NODE_DEFAULT_VERSION=20-lts \
    WEBSITE_RUN_FROM_PACKAGE=0

# 3. Deploy the correct package
az webapp deploy \
  --resource-group wonder-llm-rg \
  --name wonder-ceo-web \
  --src-path packages/gateway/azure-deploy-api \
  --type folder

# 4. Restart the app
az webapp restart \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg

# 5. Wait 2 minutes then test
sleep 120
curl https://wonder-ceo-web.azurewebsites.net/health
```

## Option 2: Via Azure Portal

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Resource Groups → `wonder-llm-rg` → `wonder-ceo-web`

3. **In Configuration → General Settings**:
   - Stack: **Node**
   - Major version: **20-lts**
   - Startup Command: **`node src/server.js`**
   - Platform: **64 Bit**
   - Always On: **On** (if available)
   - Click **Save**

4. **In Configuration → Application Settings**, add/verify:
   | Name | Value |
   |------|-------|
   | NODE_ENV | production |
   | PORT | 8080 |
   | USE_DB | false |
   | HEBREW_SUPPORT | true |
   | WEBSITE_NODE_DEFAULT_VERSION | 20-lts |
   | WEBSITE_RUN_FROM_PACKAGE | 0 |

   Click **Save**

5. **In Deployment Center**:
   - Deployment Method: **Local Git** or **ZIP Deploy**
   - If using ZIP, upload the `hebrew-backend-deploy.zip`

6. **Restart the App**:
   - Go to Overview
   - Click **Restart**
   - Wait 2-3 minutes

## Option 3: Quick Fix Script

Save and run this script:

```bash
#!/bin/bash
# fix-azure.sh

echo "🔧 Fixing Azure Configuration..."

# Fix platform settings
az webapp config set \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg \
  --use-32bit-worker-process false \
  --startup-file "node src/server.js"

# Set all required environment variables
az webapp config appsettings set \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    USE_DB=false \
    HEBREW_SUPPORT=true \
    WEBSITE_NODE_DEFAULT_VERSION=20-lts

# Restart
az webapp restart \
  --name wonder-ceo-web \
  --resource-group wonder-llm-rg

echo "⏳ Waiting for app to start (2 minutes)..."
sleep 120

# Test
echo "🧪 Testing API..."
curl -s https://wonder-ceo-web.azurewebsites.net/health | jq .

echo "✅ Configuration fixed!"
```

## Verification

After applying the fix, test with:

```bash
# Test health endpoint
curl https://wonder-ceo-web.azurewebsites.net/health

# Expected response:
{
  "status": "healthy",
  "engines": ["engine-basic", "engine-fuzzy"],
  "timestamp": "..."
}

# Test Hebrew query
curl -X POST "https://wonder-ceo-web.azurewebsites.net/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"nurseName":"אורטל","topK":3}'

# Should return Hebrew nurse names
```

## Common Issues & Solutions

### Issue 1: Still getting HTML error page
**Solution**: The app might be looking for `index.html`. Ensure no static files in deployment.

### Issue 2: 503 Service Unavailable
**Solution**: App is still starting. Wait 2-3 minutes after restart.

### Issue 3: Module not found errors
**Solution**: Ensure `package.json` has `"type": "module"` for ES modules.

### Issue 4: Port binding error
**Solution**: Azure uses PORT environment variable. Ensure code uses `process.env.PORT || 8080`.

## Current Status Check

Run this to see current status:
```bash
az webapp show --name wonder-ceo-web --resource-group wonder-llm-rg --query "{status:state, url:defaultHostName, runtime:siteConfig.linuxFxVersion}"
```

---
**Note**: The main issue is that Azure is configured for Windows workers (`use32BitWorkerProcess: true`) while trying to run Node.js Linux runtime. This needs to be fixed first.