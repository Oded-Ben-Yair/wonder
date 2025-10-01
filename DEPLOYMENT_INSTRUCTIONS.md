# Azure Deployment Instructions

## Current Status
✅ **Enhanced backend is ready** with all requested features:
- Shows nurse names (not just IDs)
- Supports queries beyond city (gender, mobility, specializations)
- Clear rating explanations
- Full dataset (457 nurses, 83 cities)

## Quick Test Locally
```bash
cd gateway-simple
npm install
PORT=5050 node server.js

# Test in another terminal:
curl http://localhost:5050/health
curl http://localhost:5050/stats
```

## Manual Azure Deployment

Since Azure CLI authorization is failing, use the Azure Portal:

### Option 1: Via Azure Portal (Easiest)

1. **Log into Azure Portal**: https://portal.azure.com
2. **Navigate to**: Resource Groups → wonder-llm-rg → wonder-engine-web
3. **Go to**: Deployment Center (left menu)
4. **Upload the code**:
   - Click "Manual Deploy" or "ZIP Deploy"
   - Upload: `/home/odedbe/wonder/gateway-simple.zip`
5. **Restart the app**: Overview → Restart button

### Option 2: Via FTP

1. **Get FTP credentials**:
   - Azure Portal → wonder-engine-web → Deployment Center → FTP credentials
2. **Connect via FTP client** (FileZilla, etc.)
3. **Upload these files to `/site/wwwroot`**:
   - server.js (from gateway-simple)
   - package.json
   - package-lock.json
4. **Restart app** in Azure Portal

### Option 3: Re-login to Azure CLI

```bash
# Logout and login fresh
az logout
az login --use-device-code

# Select subscription
az account set --subscription "08b0ac81-a17e-421c-8c1b-41b59ee758a3"

# Deploy
cd /home/odedbe/wonder
zip -r deploy.zip gateway-simple/ -x "*/node_modules/*"
az webapp deploy --resource-group wonder-llm-rg \
  --name wonder-engine-web --src-path deploy.zip --type zip
```

## What's New in Enhanced Backend

### 1. Nurse Names
Every nurse now has a generated name (e.g., "Sarah Cohen", "David Levy")

### 2. Advanced Filtering
```bash
# Filter by gender
curl -X POST https://wonder-engine-web.azurewebsites.net/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv", "gender":"FEMALE"}'

# Filter by mobility
curl -X POST https://wonder-engine-web.azurewebsites.net/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv", "mobility":"INDEPENDENT"}'

# Include inactive nurses
curl -X POST https://wonder-engine-web.azurewebsites.net/match \
  -H "Content-Type: application/json" \
  -d '{"includeInactive":true}'
```

### 3. Rating Explanation
Each nurse has a clear rating explanation:
```json
{
  "rating": 4.2,
  "ratingExplanation": "Based on profile completeness, mobility (INDEPENDENT), and 3 specializations"
}
```

### 4. Statistics Endpoint
```bash
curl https://wonder-engine-web.azurewebsites.net/stats
```
Returns:
- Total nurses: 457
- Active nurses: 368
- Breakdown by city, service, gender, mobility

## Testing After Deployment

```bash
# Check health
curl https://wonder-engine-web.azurewebsites.net/health

# Should show:
{
  "totalNurses": 457,
  "activeNurses": 368,
  "engineStatuses": [{"name": "engine-enhanced", ...}]
}

# Test matching with names
curl -X POST https://wonder-engine-web.azurewebsites.net/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv", "servicesQuery":["wound care"]}'

# Should return nurses with names like:
{
  "name": "Sarah Cohen",
  "ratingExplanation": "Based on profile completeness..."
}
```

## Frontend URLs
- Production: https://wonder-engine.azurewebsites.net
- Backend API: https://wonder-engine-web.azurewebsites.net

## Need Help?

If deployment still fails:
1. Share Azure Portal access with a team member
2. Or provide new Azure credentials
3. Or use a different cloud provider

The code is ready and tested locally - just needs to be deployed!