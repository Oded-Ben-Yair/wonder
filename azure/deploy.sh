#!/bin/bash

# Wonder Healthcare Platform - Azure Deployment Script
# Automates complete infrastructure deployment using Azure CLI
#
# Prerequisites:
# - Azure CLI installed and logged in
# - Service Principal credentials set as environment variables
# - Docker installed for container image builds
#
# Usage:
#   ./azure/deploy.sh --env prod --location "East US"
#   ./azure/deploy.sh --env dev --dry-run

set -e  # Exit on any error

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
ENVIRONMENT="prod"
LOCATION="East US"
DRY_RUN=false
SKIP_BUILD=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --location)
      LOCATION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      cat << EOF
Azure Deployment Script for Wonder Healthcare Platform

Usage: $0 [OPTIONS]

Options:
  --env ENVIRONMENT     Environment (dev|staging|prod) [default: prod]
  --location LOCATION   Azure region [default: "East US"]
  --dry-run            Show what would be deployed without making changes
  --skip-build         Skip container image build and push
  --verbose            Enable verbose logging
  --help               Show this help message

Environment Variables Required:
  AZURE_CLIENT_ID      Service principal client ID
  AZURE_CLIENT_SECRET  Service principal client secret  
  AZURE_TENANT_ID      Azure tenant ID
  AZURE_SUBSCRIPTION_ID Azure subscription ID
  DB_ADMIN_PASSWORD    PostgreSQL admin password
  AZURE_OPENAI_KEY     Azure OpenAI service key
  ADMIN_EMAIL          Administrator email for alerts

Examples:
  $0 --env prod --location "East US"
  $0 --env dev --dry-run
  $0 --env prod --skip-build
EOF
      exit 0
      ;;
    *)
      log_error "Unknown option $1"
      exit 1
      ;;
  esac
done

# Validate environment
validate_environment() {
  log_info "Validating environment and prerequisites..."

  # Check required tools
  for cmd in az docker jq; do
    if ! command -v $cmd &> /dev/null; then
      log_error "$cmd is required but not installed"
      exit 1
    fi
  done

  # Check Azure CLI login
  if ! az account show &> /dev/null; then
    log_error "Azure CLI is not logged in. Run 'az login' first."
    exit 1
  fi

  # Check required environment variables
  local required_vars=(
    "AZURE_CLIENT_ID"
    "AZURE_CLIENT_SECRET" 
    "AZURE_TENANT_ID"
    "AZURE_SUBSCRIPTION_ID"
    "DB_ADMIN_PASSWORD"
    "AZURE_OPENAI_KEY"
    "ADMIN_EMAIL"
  )

  for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
      log_error "Environment variable $var is required but not set"
      exit 1
    fi
  done

  # Validate environment value
  if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Environment must be dev, staging, or prod"
    exit 1
  fi

  log_success "Environment validation passed"
}

# Set Azure context
setup_azure_context() {
  log_info "Setting up Azure context..."

  # Login with service principal
  az login --service-principal \
    -u "$AZURE_CLIENT_ID" \
    -p "$AZURE_CLIENT_SECRET" \
    --tenant "$AZURE_TENANT_ID" &> /dev/null

  # Set subscription
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"

  # Get current context
  local account_info=$(az account show --query "{name:name, subscriptionId:id, tenantId:tenantId}" -o json)
  log_info "Azure context: $(echo $account_info | jq -r '.name')"
  log_info "Subscription: $(echo $account_info | jq -r '.subscriptionId')"
  log_info "Tenant: $(echo $account_info | jq -r '.tenantId')"
}

# Create or update resource group
setup_resource_group() {
  local rg_name="wonder-healthcare-$ENVIRONMENT"
  
  log_info "Setting up resource group: $rg_name"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would create/update resource group: $rg_name in $LOCATION"
    return 0
  fi

  # Create resource group if it doesn't exist
  if ! az group show --name "$rg_name" &> /dev/null; then
    az group create --name "$rg_name" --location "$LOCATION" --tags \
      Environment="$ENVIRONMENT" \
      Application="Wonder Healthcare" \
      ManagedBy="Azure CLI"
    log_success "Resource group created: $rg_name"
  else
    log_info "Resource group already exists: $rg_name"
  fi

  export RESOURCE_GROUP_NAME="$rg_name"
}

# Build and push container images
build_and_push_images() {
  if $SKIP_BUILD; then
    log_info "Skipping container image build (--skip-build)"
    return 0
  fi

  local registry_name="wonderhealthcare${ENVIRONMENT}acr"
  local image_tag=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
  
  log_info "Building and pushing container images..."
  log_info "Registry: ${registry_name}.azurecr.io"
  log_info "Image tag: $image_tag"

  if $DRY_RUN; then
    log_info "[DRY RUN] Would build and push container images"
    return 0
  fi

  # Get registry credentials
  local registry_password=$(az acr credential show --name "$registry_name" --query "passwords[0].value" -o tsv)
  
  # Login to registry
  echo "$registry_password" | docker login "${registry_name}.azurecr.io" --username "$registry_name" --password-stdin

  # Build gateway image
  log_info "Building gateway container image..."
  cd "$PROJECT_ROOT"
  docker build -t "${registry_name}.azurecr.io/wonder-gateway:$image_tag" \
               -t "${registry_name}.azurecr.io/wonder-gateway:latest" \
               -f Dockerfile .

  # Push images
  log_info "Pushing images to registry..."
  docker push "${registry_name}.azurecr.io/wonder-gateway:$image_tag"
  docker push "${registry_name}.azurecr.io/wonder-gateway:latest"

  log_success "Container images built and pushed successfully"
}

# Deploy infrastructure using Bicep
deploy_infrastructure() {
  log_info "Deploying Azure infrastructure..."

  local deployment_name="wonder-healthcare-$(date +%Y%m%d-%H%M%S)"
  local template_file="$SCRIPT_DIR/main.bicep"
  local parameters_file="$SCRIPT_DIR/parameters.json"

  # Create temporary parameters file with actual values
  local temp_params="/tmp/wonder-parameters-$$.json"
  
  cat > "$temp_params" << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appName": {"value": "wonder-healthcare"},
    "environment": {"value": "$ENVIRONMENT"},
    "location": {"value": "$LOCATION"},
    "adminEmail": {"value": "$ADMIN_EMAIL"},
    "dbAdminUsername": {"value": "wonderadmin"},
    "dbAdminPassword": {"value": "$DB_ADMIN_PASSWORD"},
    "azureOpenAIKey": {"value": "$AZURE_OPENAI_KEY"},
    "azureOpenAIEndpoint": {"value": "${AZURE_OPENAI_ENDPOINT:-https://your-openai.openai.azure.com/}"},
    "containerRegistryName": {"value": "wonderhealthcare${ENVIRONMENT}acr"},
    "customDomain": {"value": "${CUSTOM_DOMAIN:-}"}
  }
}
EOF

  if $DRY_RUN; then
    log_info "[DRY RUN] Would deploy infrastructure with template: $template_file"
    log_info "[DRY RUN] Parameters preview:"
    jq '.parameters | to_entries | map({key: .key, value: (.value.value // "***REDACTED***")})' "$temp_params"
    rm -f "$temp_params"
    return 0
  fi

  # Validate template
  log_info "Validating Bicep template..."
  az deployment group validate \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --template-file "$template_file" \
    --parameters "@$temp_params"

  # Deploy infrastructure
  log_info "Deploying infrastructure (this may take 10-15 minutes)..."
  local deployment_output=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "$deployment_name" \
    --template-file "$template_file" \
    --parameters "@$temp_params" \
    --query "properties.outputs" \
    --output json)

  # Clean up temp file
  rm -f "$temp_params"

  # Save deployment outputs
  echo "$deployment_output" > "$PROJECT_ROOT/azure-deployment-outputs.json"
  
  log_success "Infrastructure deployment completed"
  
  # Display key outputs
  log_info "Deployment Summary:"
  echo "$deployment_output" | jq -r '.deploymentSummary.value.endpoints | to_entries[] | "  \(.key): \(.value)"'
}

# Run database migration
run_database_migration() {
  log_info "Running database migration..."

  if $DRY_RUN; then
    log_info "[DRY RUN] Would run database migration"
    return 0
  fi

  # Get database connection string from deployment outputs
  local connection_string=$(jq -r '.databaseConnectionString.value' "$PROJECT_ROOT/azure-deployment-outputs.json" 2>/dev/null)
  
  if [[ -z "$connection_string" || "$connection_string" == "null" ]]; then
    log_warning "Could not get database connection string from deployment outputs"
    log_info "Please run migration manually: node database/migrate.js --env $ENVIRONMENT"
    return 0
  fi

  # Run migration
  cd "$PROJECT_ROOT"
  export DATABASE_URL="$connection_string"
  
  log_info "Running database schema creation..."
  node database/migrate.js --env "$ENVIRONMENT"

  log_success "Database migration completed"
}

# Verify deployment
verify_deployment() {
  log_info "Verifying deployment..."

  if $DRY_RUN; then
    log_info "[DRY RUN] Would verify deployment health"
    return 0
  fi

  # Get endpoints from deployment outputs
  local api_url=$(jq -r '.deploymentSummary.value.endpoints.api' "$PROJECT_ROOT/azure-deployment-outputs.json" 2>/dev/null)
  local frontend_url=$(jq -r '.deploymentSummary.value.endpoints.frontend' "$PROJECT_ROOT/azure-deployment-outputs.json" 2>/dev/null)

  if [[ -n "$api_url" && "$api_url" != "null" ]]; then
    log_info "Testing API health endpoint: $api_url/health"
    
    # Wait for container app to start
    sleep 30
    
    # Test health endpoint with retries
    for i in {1..5}; do
      if curl -f -s "$api_url/health" > /dev/null; then
        log_success "API health check passed"
        break
      elif [[ $i -eq 5 ]]; then
        log_warning "API health check failed after 5 attempts"
        log_info "This may be normal during initial deployment. Check logs in Azure Portal."
      else
        log_info "API health check attempt $i/5 failed, retrying in 30 seconds..."
        sleep 30
      fi
    done
  fi

  if [[ -n "$frontend_url" && "$frontend_url" != "null" ]]; then
    log_info "Frontend URL: $frontend_url"
    log_info "Static Web App deployment may take additional time to complete"
  fi
}

# Display deployment summary
show_deployment_summary() {
  log_info "Deployment Summary"
  echo "=================="
  echo ""
  echo "Environment: $ENVIRONMENT"
  echo "Location: $LOCATION"
  echo "Resource Group: ${RESOURCE_GROUP_NAME:-N/A}"
  echo ""

  if [[ -f "$PROJECT_ROOT/azure-deployment-outputs.json" ]]; then
    local outputs=$(cat "$PROJECT_ROOT/azure-deployment-outputs.json")
    
    echo "🌐 Endpoints:"
    echo "$outputs" | jq -r '.deploymentSummary.value.endpoints | to_entries[] | "  \(.key): \(.value)"'
    echo ""
    
    echo "📦 Resources:"
    echo "$outputs" | jq -r '.deploymentSummary.value.resources | to_entries[] | "  \(.key): \(.value)"'
    echo ""
    
    echo "📋 Next Steps:"
    echo "$outputs" | jq -r '.deploymentSummary.value.nextSteps[]' | sed 's/^/  - /'
    echo ""
  fi

  echo "🔍 Monitoring:"
  echo "  - Azure Portal: https://portal.azure.com"
  echo "  - Application Insights: Check the monitoring section"
  echo "  - Logs: Available in Container Apps and Application Insights"
  echo ""
  
  echo "📖 Documentation:"
  echo "  - Deployment Guide: $PROJECT_ROOT/AZURE_DEPLOYMENT.md"
  echo "  - Operations Guide: $PROJECT_ROOT/OPERATIONS.md"
  echo ""
}

# Cleanup function
cleanup() {
  local exit_code=$?
  if [[ -f "/tmp/wonder-parameters-$$.json" ]]; then
    rm -f "/tmp/wonder-parameters-$$.json"
  fi
  exit $exit_code
}
trap cleanup EXIT

# Main execution
main() {
  echo "🏥 Wonder Healthcare Platform - Azure Deployment"
  echo "=============================================="
  echo ""

  validate_environment
  setup_azure_context
  setup_resource_group
  build_and_push_images
  deploy_infrastructure
  run_database_migration
  verify_deployment
  show_deployment_summary

  if $DRY_RUN; then
    log_info "Dry run completed. No changes were made."
  else
    log_success "Deployment completed successfully!"
    log_info "Check Azure Portal for detailed resource status"
  fi
}

# Execute main function
main "$@"