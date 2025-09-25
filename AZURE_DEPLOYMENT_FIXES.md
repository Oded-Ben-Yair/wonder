# Azure Deployment Issues and Fixes - Wonder Healthcare Platform

## 🚨 Critical Issues Fixed

### 1. Dockerfile Path Corrections
**Problem:** Dockerfile referenced non-existent directories (`engine-azure-gpt5` instead of `packages/engine-azure-gpt`)

**Fix Applied:** Updated all paths in Dockerfile to correct structure:
- Changed `engine-azure-gpt5` → `packages/engine-azure-gpt`
- Fixed workspace references to use package names from package.json
- Updated CMD to use correct gateway path

### 2. Database Migration Module Configuration
**Problem:** `database/migrate.js` uses ES6 imports but lacked package.json

**Fix Applied:** Created `/database/package.json` with:
- Type: module for ES6 support
- Required dependencies (pg, dotenv)
- Migration scripts

### 3. Azure Resource Configuration
**Problem:** Parameters file had placeholder values and incomplete configuration

**Fix Applied:** 
- Created `azure/parameters.production.json` with proper structure
- Created `azure/prepare-deployment.sh` for environment validation
- Modified Bicep template to allow deployment without GitHub repo initially

## 📋 Deployment Steps

### Prerequisites
```bash
# Required environment variables
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export ADMIN_EMAIL="admin@example.com"
export DB_ADMIN_PASSWORD="SecurePassword123!"
export AZURE_OPENAI_KEY="your-openai-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
```

### Step 1: Validate Environment
```bash
# Run preparation script
./azure/prepare-deployment.sh

# This will:
# - Check environment variables
# - Validate Dockerfile
# - Test container build locally
# - Generate deployment parameters
```

### Step 2: Login to Azure
```bash
# Login with Azure CLI
az login

# Set subscription
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
```

### Step 3: Create Resource Group
```bash
az group create \
  --name wonder-healthcare-prod \
  --location "East US" \
  --tags Application="Wonder Healthcare" Environment="Production"
```

### Step 4: Deploy Infrastructure
```bash
# Deploy using Bicep template
az deployment group create \
  --resource-group wonder-healthcare-prod \
  --template-file azure/main.bicep \
  --parameters @azure/parameters.generated.json \
  --name "wonder-deploy-$(date +%Y%m%d-%H%M%S)"
```

### Step 5: Build and Push Container
```bash
# Get ACR credentials
ACR_NAME="wonderhealthcareprodacr"
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Login to ACR
echo $ACR_PASSWORD | docker login $ACR_NAME.azurecr.io -u $ACR_NAME --password-stdin

# Build and tag image
docker build -t $ACR_NAME.azurecr.io/wonder-gateway:latest .

# Push to ACR
docker push $ACR_NAME.azurecr.io/wonder-gateway:latest
```

### Step 6: Update Container App
```bash
# Update with new image
az containerapp update \
  --resource-group wonder-healthcare-prod \
  --name wonder-healthcare-prod-gateway \
  --image wonderhealthcareprodacr.azurecr.io/wonder-gateway:latest
```

### Step 7: Run Database Migration
```bash
# Get connection string from Key Vault
CONNECTION_STRING=$(az keyvault secret show \
  --vault-name wonder-healthcare-prod-kv \
  --name database-connection-string \
  --query value -o tsv)

# Run migration
DATABASE_URL="$CONNECTION_STRING" node database/migrate.js --env production
```

### Step 8: Configure Static Web App (Optional)
```bash
# Link GitHub repository (if using GitHub Actions)
az staticwebapp update \
  --name wonder-healthcare-prod-ui \
  --source https://github.com/your-username/wonder \
  --branch main \
  --token $GITHUB_TOKEN
```

## ✅ Verification Steps

### 1. Check Health Endpoint
```bash
APP_URL=$(az containerapp show \
  --resource-group wonder-healthcare-prod \
  --name wonder-healthcare-prod-gateway \
  --query "properties.configuration.ingress.fqdn" -o tsv)

curl https://$APP_URL/health
```

### 2. Test API Endpoints
```bash
# List engines
curl https://$APP_URL/engines

# Test match endpoint
curl -X POST https://$APP_URL/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":5}'
```

### 3. Monitor Logs
```bash
# View Container App logs
az containerapp logs show \
  --resource-group wonder-healthcare-prod \
  --name wonder-healthcare-prod-gateway \
  --follow

# Check Application Insights
az monitor app-insights query \
  --app wonder-healthcare-prod-insights \
  --query "traces | where timestamp > ago(1h) | order by timestamp desc"
```

## 🔧 Troubleshooting

### Container Fails to Start
1. Check environment variables in Container App settings
2. Verify database connection string in Key Vault
3. Check container logs for specific errors

### Health Check Fails
1. Verify port 5050 is correctly configured
2. Check if all engines are loading properly
3. Review Application Insights for startup errors

### Database Connection Issues
1. Verify PostgreSQL firewall rules allow Azure services
2. Check connection string format
3. Ensure SSL is enabled (sslmode=require)

### Static Web App Not Working
1. Verify CORS settings in gateway
2. Check API_BASE_URL in Static Web App configuration
3. Ensure proper build output directory (dist)

## 📊 Resource Costs (Estimated)

| Resource | SKU | Monthly Cost |
|----------|-----|--------------|
| Container App | Consumption | $50-100 |
| PostgreSQL | B2s | $50 |
| Static Web App | Standard | $9 |
| Application Insights | Pay-as-you-go | $20-50 |
| Key Vault | Standard | $5 |
| Container Registry | Premium | $50 |
| **Total** | | **~$200-250** |

## 🔐 Security Considerations

1. **Secrets Management**: All sensitive data stored in Key Vault
2. **Network Security**: Configure private endpoints for production
3. **Authentication**: Implement Azure AD authentication
4. **CORS**: Restrict to specific domains only
5. **SSL/TLS**: Enforced on all endpoints
6. **Container Security**: Non-root user, vulnerability scanning

## 📝 Next Steps

1. Configure custom domain with SSL certificate
2. Set up Azure AD authentication
3. Implement automated backups for PostgreSQL
4. Configure auto-scaling rules
5. Set up monitoring dashboards
6. Implement CI/CD with GitHub Actions
7. Configure geo-replication for high availability

## 🆘 Support

For deployment issues, check:
- Azure Portal > Resource Group > Activity Log
- Application Insights > Failures
- Container Apps > Log Stream
- PostgreSQL > Connection Security

---

Last Updated: 2025-09-16
Fixed By: Azure Deployment Debugger