// Wonder Healthcare Platform - Azure Infrastructure as Code
// Deploys complete production-ready infrastructure for healthcare staffing platform
//
// Usage:
//   az deployment group create \
//     --resource-group wonder-healthcare-prod \
//     --template-file azure/main.bicep \
//     --parameters @azure/parameters.json

// Parameters
@description('The name of the application (used for resource naming)')
param appName string = 'wonder-healthcare'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Administrator email for alerts and notifications')
param adminEmail string

@description('PostgreSQL administrator username')
param dbAdminUsername string = 'wonderadmin'

@description('PostgreSQL administrator password')
@secure()
param dbAdminPassword string

@description('Azure OpenAI service key')
@secure()
param azureOpenAIKey string

@description('Azure OpenAI service endpoint')
param azureOpenAIEndpoint string

@description('Container registry name (must be globally unique)')
param containerRegistryName string = '${appName}${environment}acr'

@description('Custom domain name (optional)')
param customDomain string = ''

@description('Tags to apply to all resources')
param tags object = {
  Application: 'Wonder Healthcare'
  Environment: environment
  ManagedBy: 'Bicep'
  CostCenter: 'Healthcare'
}

// Variables
var resourceNamePrefix = '${appName}-${environment}'
var databaseName = 'wonder'
var keyVaultName = '${resourceNamePrefix}-kv'
var logAnalyticsName = '${resourceNamePrefix}-logs'
var appInsightsName = '${resourceNamePrefix}-insights'
var containerAppsEnvName = '${resourceNamePrefix}-env'
var postgresServerName = '${resourceNamePrefix}-db'
var staticWebAppName = '${resourceNamePrefix}-ui'

// Existing resource (Resource Group is assumed to exist)
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = {
  scope: subscription()
  name: resourceGroup().name
}

// Log Analytics Workspace (foundation for monitoring)
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Application Insights (application monitoring)
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Key Vault (secrets management)
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Container Registry (container image storage)
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: {
    name: 'Premium' // Premium tier for geo-replication and vulnerability scanning
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled' // Can be enabled for higher availability
  }
}

// PostgreSQL Flexible Server (database)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B2s' // 2 vCores, 4GB RAM - can be scaled up/down
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: dbAdminUsername
    administratorLoginPassword: dbAdminPassword
    version: '15' // Latest supported PostgreSQL version
    storage: {
      storageSizeGB: 32 // Auto-grows as needed
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 35
      geoRedundantBackup: 'Disabled' // Can be enabled for geo-redundancy
    }
    highAvailability: {
      mode: 'Disabled' // Can be enabled for production HA
    }
    network: {
      publicNetworkAccess: 'Enabled' // Will be restricted via firewall rules
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Firewall Rules
resource postgresFirewallAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Container Apps Environment (serverless container platform)
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false // Can be enabled for higher availability
  }
}

// Container App (Gateway Service)
resource gatewayContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${resourceNamePrefix}-gateway'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 5050
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'database-connection-string'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-connection-string'
          identity: 'system'
        }
        {
          name: 'azure-openai-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/azure-openai-key'
          identity: 'system'
        }
        {
          name: 'app-insights-connection-string'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/app-insights-connection-string'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'wonder-gateway'
          image: '${containerRegistry.properties.loginServer}/wonder-gateway:latest'
          resources: {
            cpu: '0.5'
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '5050'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'USE_DB'
              value: 'true'
            }
            {
              name: 'DB_KIND'
              value: 'postgres'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-connection-string'
            }
            {
              name: 'AZURE_OPENAI_KEY'
              secretRef: 'azure-openai-key'
            }
            {
              name: 'AZURE_OPENAI_URI'
              value: azureOpenAIEndpoint
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'app-insights-connection-string'
            }
            {
              name: 'ALLOWED_ORIGINS'
              value: customDomain != '' ? 'https://${customDomain}' : 'https://${staticWebApp.properties.defaultHostname}'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 5050
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 5050
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
          {
            name: 'cpu-scaling-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    keyVaultSecretDatabaseUrl
    keyVaultSecretAzureOpenAIKey
    keyVaultSecretAppInsights
  ]
}

// Static Web App (Frontend)
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/your-username/wonder' // Update during deployment
    branch: 'main'
    buildProperties: {
      appLocation: '/packages/ui'
      apiLocation: ''
      outputLocation: 'dist'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Enabled'
  }
}

// Static Web App - API Proxy Configuration
resource staticWebAppConfig 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    API_BASE_URL: 'https://${gatewayContainerApp.properties.configuration.ingress.fqdn}'
    ENVIRONMENT: environment
  }
}

// Key Vault Secrets
resource keyVaultSecretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'database-connection-string'
  properties: {
    value: 'postgresql://${dbAdminUsername}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
  }
}

resource keyVaultSecretAzureOpenAIKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'azure-openai-key'
  properties: {
    value: azureOpenAIKey
  }
}

resource keyVaultSecretAppInsights 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'app-insights-connection-string'
  properties: {
    value: applicationInsights.properties.ConnectionString
  }
}

// RBAC - Grant Container App access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, gatewayContainerApp.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: gatewayContainerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Action Group for Alerts
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${resourceNamePrefix}-alerts'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'WonderAlert'
    enabled: true
    emailReceivers: [
      {
        name: 'Admin'
        emailAddress: adminEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// Metric Alerts
resource alertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-high-error-rate'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when error rate is high'
    severity: 2
    enabled: true
    scopes: [
      gatewayContainerApp.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ErrorRate'
          metricName: 'Requests'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Outputs
output resourceGroupName string = resourceGroup().name
output containerAppUrl string = 'https://${gatewayContainerApp.properties.configuration.ingress.fqdn}'
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output customDomainUrl string = customDomain != '' ? 'https://${customDomain}' : 'Not configured'
output databaseConnectionString string = keyVaultSecretDatabaseUrl.properties.secretUri
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryName string = containerRegistry.name
output keyVaultName string = keyVault.name
output applicationInsightsName string = applicationInsights.name
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
output postgresServerName string = postgresServer.name
output databaseName string = postgresDatabase.name

// Deployment Summary
output deploymentSummary object = {
  applicationName: appName
  environment: environment
  location: location
  endpoints: {
    api: 'https://${gatewayContainerApp.properties.configuration.ingress.fqdn}'
    frontend: 'https://${staticWebApp.properties.defaultHostname}'
    customDomain: customDomain != '' ? 'https://${customDomain}' : 'Not configured'
  }
  resources: {
    containerApp: gatewayContainerApp.name
    staticWebApp: staticWebApp.name
    database: postgresServer.name
    keyVault: keyVault.name
    containerRegistry: containerRegistry.name
    monitoring: applicationInsights.name
  }
  nextSteps: [
    'Build and push container images to ${containerRegistry.properties.loginServer}'
    'Run database migration: node database/migrate.js --env ${environment}'
    'Configure custom domain in Static Web App (if applicable)'
    'Set up CI/CD pipeline for automated deployments'
    'Configure monitoring dashboards in Application Insights'
  ]
}