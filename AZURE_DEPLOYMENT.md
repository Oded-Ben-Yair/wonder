# 🚀 Azure Deployment Guide - Wonder Healthcare Platform

## 📋 Executive Summary

This guide provides complete end-to-end deployment of the Wonder Healthcare staffing platform to Microsoft Azure, transforming the current development setup into a production-ready system with live database integration.

**Architecture Overview:**
- **Frontend**: Azure Static Web Apps (React/TypeScript UI)
- **Backend**: Azure Container Apps (Node.js Gateway + Engines)
- **Database**: Azure Database for PostgreSQL (Live nurse data)
- **Security**: Azure Key Vault (Secrets management)
- **Monitoring**: Application Insights (Performance + Logging)

**Timeline**: 45 minutes automated deployment
**Cost**: $75-150/month (production-ready)
**SLA**: 99.9% uptime guarantee

---

## 🎯 Phase 1: Prerequisites & Credential Setup

### Required Azure Credentials
```bash
# Service Principal Credentials (all required)
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_SUBSCRIPTION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Credential Creation Methods

#### Method 1: Azure Portal (Recommended - 5 minutes)
1. **Azure Active Directory** → **App registrations** → **New registration**
2. Name: `Wonder-Healthcare-Deploy`
3. Copy **Application (client) ID** and **Directory (tenant) ID**
4. **Certificates & secrets** → **New client secret** → Copy **value**
5. **Subscriptions** → Your subscription → **Access control (IAM)**
6. **Add role assignment** → **Contributor** → Select your app

#### Method 2: Azure CLI (Alternative)
```bash
az login
az ad sp create-for-rbac --name "Wonder-Healthcare-Deploy" \
  --role contributor \
  --scopes "/subscriptions/YOUR-SUBSCRIPTION-ID"
```

### Permission Requirements
- **Contributor** role on subscription or resource group
- **User Access Administrator** for role assignments
- Ability to create resources: Container Apps, PostgreSQL, Key Vault, Static Web Apps

---

## 🏗️ Phase 2: Infrastructure Deployment (15 minutes)

### Core Azure Resources Created

#### 2.1 Resource Group
```bash
# Primary resource container
Name: wonder-healthcare-prod
Location: East US (optimal for healthcare workloads)
Tags: Environment=Production, Project=Wonder, CostCenter=Healthcare
```

#### 2.2 Azure Database for PostgreSQL
```yaml
Configuration:
  Server: wonder-healthcare-db
  Tier: Flexible Server (Production SLA: 99.99%)
  Compute: Standard_B2s (2 vCores, 4GB RAM)
  Storage: 32GB Premium SSD (auto-grows to 1TB)
  
Features:
  - Automated daily backups (35-day retention)
  - Point-in-time recovery (5-minute granularity)
  - High availability with zone redundancy
  - Private endpoint integration (no public access)
  - Encryption at rest and in transit
  
Security:
  - Firewall: Azure services only
  - SSL: Required (TLS 1.2+)
  - Authentication: PostgreSQL native + Azure AD
```

#### 2.3 Azure Container Apps Environment
```yaml
Configuration:
  Environment: wonder-healthcare-env
  Network: VNET integration with private subnets
  Scaling: 0-10 replicas (CPU + HTTP request based)
  
Features:
  - Zero-downtime deployments (blue-green)
  - Automatic SSL certificate management
  - Load balancing with session affinity
  - Container health probes and auto-restart
  
Gateway Service:
  Image: wondergateway:latest
  Resources: 0.5 CPU, 1GB RAM per replica
  Ports: 5050 (HTTPS only)
  Environment: Production optimized
```

#### 2.4 Azure Container Registry
```yaml
Configuration:
  Registry: wonderhealthcare.azurecr.io
  Tier: Premium (geo-replication + vulnerability scanning)
  
Features:
  - Multi-region replication for performance
  - Automated vulnerability scanning
  - Image retention policies
  - Trusted content with signed images
```

#### 2.5 Azure Static Web Apps
```yaml
Configuration:
  Name: wonder-healthcare-ui
  Plan: Standard (custom domains + advanced features)
  Build: Vite production build
  
Features:
  - Global CDN distribution
  - Automatic HTTPS with custom domains
  - Branch-based staging environments
  - API proxying to Container Apps
  - Authentication integration
```

---

## 💾 Phase 3: Database Schema & Migration (10 minutes)

### Database Schema Design
The database leverages the existing `packages/engine-basic/src/db.js` infrastructure:

```sql
-- Core nurse profiles
CREATE TABLE nurses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id VARCHAR(100) UNIQUE NOT NULL, -- Original ID from JSON
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8), 
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5.0),
    reviews_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    is_profile_updated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Services offered by nurses
CREATE TABLE nurse_services (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,
    service_type VARCHAR(50), -- 'WOUND_CARE', 'MEDICATION', etc.
    PRIMARY KEY (nurse_id, service)
);

-- Nurse expertise and specializations
CREATE TABLE nurse_expertise (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    expertise_tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (nurse_id, expertise_tag)
);

-- Real-time availability scheduling
CREATE TABLE nurse_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    booking_id UUID, -- Reference to actual bookings
    created_at TIMESTAMP DEFAULT NOW()
);

-- Geographic service areas
CREATE TABLE nurse_locations (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    municipality VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    service_radius_km INTEGER DEFAULT 25,
    PRIMARY KEY (nurse_id, municipality)
);

-- Performance optimization indexes
CREATE INDEX idx_nurses_city ON nurses(city);
CREATE INDEX idx_nurses_active ON nurses(is_active, is_approved);
CREATE INDEX idx_nurses_rating ON nurses(rating DESC, reviews_count DESC);
CREATE INDEX idx_nurse_services_service ON nurse_services(service);
CREATE INDEX idx_nurse_availability_date ON nurse_availability(available_date, is_available);
CREATE INDEX idx_nurse_locations_municipality ON nurse_locations(municipality);
```

### Data Migration Strategy

#### Current Data Analysis
- **Source**: `packages/gateway/src/data/nurses.json`
- **Records**: 7,914 nurse profiles
- **Cities**: 199 unique municipalities
- **Services**: 29 treatment types mapped to 7 service categories

#### Migration Process
```javascript
// Automated migration using existing transformNurseData function
// File: database/migrate.js

import { transformNurseData } from '../packages/gateway/src/server.js';
import { Client } from 'pg';

export async function migrateNurseData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Read current JSON data
  const nursesData = JSON.parse(fs.readFileSync('./packages/gateway/src/data/nurses.json'));
  
  // Transform and insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < nursesData.length; i += batchSize) {
    const batch = nursesData.slice(i, i + batchSize);
    const transformed = batch.map(transformNurseData);
    
    await insertNurseBatch(client, transformed);
    console.log(`Migrated ${i + batch.length}/${nursesData.length} nurses`);
  }
}
```

#### Data Validation & Quality
- **Validation**: Geographic coordinates within Israel bounds
- **Sanitization**: City name standardization (Hebrew/English)
- **Enrichment**: Synthetic ratings based on approvals and specializations
- **Indexing**: Optimized for city, service, and availability queries

---

## 🔧 Phase 4: Application Configuration (10 minutes)

### Environment Configuration

#### Gateway Service Environment
```bash
# Production environment variables
NODE_ENV=production
PORT=5050
LOG_LEVEL=info

# Database configuration (from Key Vault)
USE_DB=true
DB_KIND=postgres
DATABASE_URL=postgresql://wonder_user:***@wonder-healthcare-db.postgres.database.azure.com:5432/wonder

# Azure OpenAI integration (from Key Vault)  
AZURE_OPENAI_KEY=sk-proj-***
AZURE_OPENAI_URI=https://wonder-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4

# CORS and security
ALLOWED_ORIGINS=https://wonder-healthcare.azurestaticapps.net,https://wonder-healthcare.azurecontainerapps.io
CORS_CREDENTIALS=true

# Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=***
APPLICATIONINSIGHTS_CONNECTION_STRING=***
```

#### Frontend Configuration
```typescript
// packages/ui/src/config/azure.ts
export const azureConfig = {
  apiBaseUrl: 'https://wonder-healthcare.azurecontainerapps.io',
  staticWebApp: 'https://wonder-healthcare.azurestaticapps.net',
  enableRealTimeUpdates: true,
  cacheStrategy: 'stale-while-revalidate',
  timeouts: {
    api: 30000,
    upload: 120000
  }
};
```

### Container Optimization

#### Dockerfile Enhancements
```dockerfile
# Multi-stage build optimized for Azure Container Apps
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
COPY packages/gateway/package*.json ./packages/gateway/
COPY packages/engine-*/package*.json ./packages/engine-*/
COPY packages/shared-utils/package*.json ./packages/shared-utils/

# Install dependencies with production optimizations
RUN npm ci --only=production --workspaces && npm cache clean --force

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine

# Security: Install dumb-init and create non-root user
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app .

USER nodejs

# Health check for Azure Container Apps
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "
    const http = require('http');
    const req = http.request('http://localhost:5050/health', (res) => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
    req.on('error', () => process.exit(1));
    req.end();
  "

EXPOSE 5050
CMD ["dumb-init", "node", "packages/gateway/src/server.js"]
```

---

## 🔒 Phase 5: Security & Compliance (5 minutes)

### Azure Key Vault Integration
```yaml
Key Vault: wonder-healthcare-kv
Access Policy: Managed Identity (Container Apps)

Secrets Stored:
  - database-connection-string: PostgreSQL connection with credentials
  - azure-openai-key: OpenAI API key for LLM integration
  - azure-openai-uri: OpenAI endpoint URL
  - app-insights-key: Application Insights instrumentation key
  - cors-allowed-origins: Approved frontend domains
```

### Network Security
```yaml
Network Configuration:
  Virtual Network: wonder-healthcare-vnet
  Subnets:
    - container-apps-subnet: 10.0.1.0/24
    - database-subnet: 10.0.2.0/24 (private endpoints)
    - gateway-subnet: 10.0.3.0/24 (Application Gateway)
  
Security Groups:
  - Database: Block all external access, allow Container Apps only
  - Container Apps: HTTPS only (443), health checks (80)
  - Application Gateway: WAF enabled, DDoS protection
```

### Compliance Features
- **Data Encryption**: TLS 1.2+ in transit, AES-256 at rest
- **Access Control**: Azure AD authentication, RBAC
- **Audit Logging**: All data access and changes logged
- **Backup & Recovery**: Automated daily backups with 35-day retention
- **Privacy**: GDPR-compliant data handling and anonymization

---

## 📊 Phase 6: Monitoring & Observability (5 minutes)

### Application Insights Configuration
```yaml
Monitoring Stack:
  Application Insights: wonder-healthcare-insights
  Log Analytics: wonder-healthcare-logs
  Alerts: wonder-healthcare-alerts
  
Metrics Collected:
  - Request rate, response time, error rate
  - Database connection pool utilization
  - Container resource usage (CPU, memory)
  - Azure OpenAI API usage and latency
  - User engagement and feature usage
```

### Health Monitoring Endpoints
```javascript
// Enhanced health check endpoints
GET /health - Basic service health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}

GET /health/detailed - Comprehensive system health
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "latency": "15ms",
    "connections": "5/20"
  },
  "engines": [
    {"name": "engine-basic", "status": "healthy", "response_time": "120ms"},
    {"name": "engine-azure-gpt", "status": "healthy", "response_time": "800ms"}
  ],
  "external_apis": {
    "azure_openai": {"status": "available", "latency": "450ms"}
  }
}
```

### Alerting Strategy
```yaml
Critical Alerts (Immediate):
  - Service down (0 healthy instances)
  - Database connection failure
  - Error rate > 5%
  - Response time > 5 seconds

Warning Alerts (15-minute delay):
  - Memory usage > 80%
  - CPU usage > 80%
  - Database connections > 80%
  - Response time > 2 seconds

Informational (Daily summary):
  - Usage statistics
  - Performance trends
  - Cost optimization opportunities
```

---

## 💰 Cost Optimization & Scaling

### Monthly Cost Breakdown (Production)
```yaml
Core Services:
  Container Apps: $40-80 (scales to zero when unused)
  PostgreSQL Flexible Server: $50-100 (2 vCore, can scale down)
  Static Web Apps: $0-10 (free tier covers most usage)
  Container Registry: $5-15 (Premium tier)
  Key Vault: $1-3 (minimal transactions)
  Application Insights: $10-30 (data ingestion based)
  Networking: $5-15 (data transfer, load balancer)

Total Monthly Cost: $111-253 (production-ready)

Cost Optimization Features:
  - Auto-scaling to zero during low usage
  - Reserved instance pricing (30% savings)
  - Development environment cost controls
  - Budget alerts and spending limits
```

### Scaling Strategy
```yaml
Auto-scaling Triggers:
  Scale Out (increase replicas):
    - CPU > 70% for 2 minutes
    - HTTP requests > 100/second
    - Response time > 2 seconds
    
  Scale In (decrease replicas):
    - CPU < 30% for 10 minutes
    - HTTP requests < 20/second
    - Minimum 1 replica during business hours (8 AM - 8 PM)

Manual Scaling:
  - Anticipated traffic spikes (marketing campaigns)
  - Maintenance windows (scale to minimum)
  - Peak usage periods (scale proactively)
```

---

## 🚀 Deployment Execution Process

### Pre-Deployment Checklist
- [ ] Azure credentials validated and permissions confirmed
- [ ] Current application tested locally with all engines
- [ ] Database migration scripts tested with sample data
- [ ] Environment variables prepared and validated
- [ ] DNS/domain configuration ready (if using custom domain)

### Automated Deployment Steps
```bash
# Deployment sequence (automated via script)
1. Create Azure Resource Group and core resources (5 min)
2. Deploy Azure Database for PostgreSQL with schema (5 min)
3. Build and push container images to Azure Container Registry (5 min)
4. Deploy Container Apps with environment configuration (10 min)
5. Run database migration and data import (5 min)
6. Deploy frontend to Azure Static Web Apps (5 min)
7. Configure custom domains and SSL certificates (5 min)
8. Set up monitoring, alerts, and health checks (5 min)
```

### Post-Deployment Verification
- [ ] All health endpoints return 200 OK
- [ ] Database contains migrated nurse data (7,914+ records)
- [ ] Frontend loads and can query backend APIs
- [ ] All three engines (basic, fuzzy, azure-gpt) respond correctly
- [ ] Monitoring dashboards show green status
- [ ] SSL certificates valid and auto-renewing
- [ ] Auto-scaling tested with load simulation

---

## 🛠️ Operations & Maintenance

### Daily Operations
- **Health Check**: Automated monitoring with PagerDuty integration
- **Performance**: Application Insights dashboards reviewed
- **Costs**: Daily cost alerts and budget tracking
- **Security**: Azure Security Center recommendations review

### Weekly Operations  
- **Backup Verification**: Test database backup restoration
- **Performance Analysis**: Review response times and optimization opportunities
- **Capacity Planning**: Analyze usage trends and scaling needs
- **Security Updates**: Apply container base image updates

### Monthly Operations
- **Disaster Recovery**: Full DR test with failover procedures
- **Cost Optimization**: Review resource utilization and right-sizing
- **Performance Tuning**: Database query optimization and indexing review
- **Compliance Audit**: Security and compliance posture assessment

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: Container Apps not starting
```bash
# Diagnostic steps
az containerapp logs show --name wonder-healthcare-gateway --resource-group wonder-healthcare-prod
az containerapp show --name wonder-healthcare-gateway --resource-group wonder-healthcare-prod

# Common causes:
1. Environment variable missing or incorrect format
2. Database connection string invalid
3. Container image build failed
4. Resource limits too low (memory/CPU)

# Solutions:
- Verify all Key Vault secrets are accessible
- Test database connection from local environment
- Check container registry for successful image push
- Scale up container resources temporarily
```

#### Issue: Database connection timeouts
```bash
# Diagnostic steps
az postgres flexible-server show --name wonder-healthcare-db --resource-group wonder-healthcare-prod
az postgres flexible-server parameter list --server-name wonder-healthcare-db --resource-group wonder-healthcare-prod

# Common causes:  
1. Connection pool exhausted
2. Firewall rules blocking Container Apps
3. Database server under high load
4. Network connectivity issues

# Solutions:
- Increase connection pool size in application
- Verify Container Apps subnet in database firewall rules
- Scale up database compute resources
- Enable query performance insights for analysis
```

#### Issue: High response times
```bash
# Diagnostic steps using Application Insights
1. Check dependency response times (database, Azure OpenAI)
2. Analyze request patterns and bottlenecks
3. Review container resource utilization
4. Check database query performance

# Optimization strategies:
- Enable database connection pooling
- Implement Redis caching for frequent queries
- Optimize database indexes based on query patterns
- Scale Container Apps horizontally
```

### Emergency Procedures

#### Complete Service Outage
1. **Immediate Response** (0-15 minutes)
   - Activate incident response team
   - Switch to maintenance mode page
   - Notify stakeholders via communication plan

2. **Investigation** (15-30 minutes)  
   - Check Azure Status Page for platform issues
   - Review Application Insights for error patterns
   - Validate database connectivity and health
   - Check container logs for application errors

3. **Resolution** (30-60 minutes)
   - Implement rollback to last known good deployment
   - Scale resources vertically if capacity issue
   - Restart containers if application-level issue
   - Engage Azure Support if platform issue

#### Data Corruption/Loss
1. **Immediate Response**
   - Stop all write operations to database
   - Preserve current database state for forensics
   - Activate backup restoration procedures

2. **Recovery Process**
   - Restore from most recent clean backup
   - Replay transaction logs if available
   - Validate data integrity post-restoration
   - Resume operations with enhanced monitoring

---

## 📞 Support & Escalation

### Support Channels
- **Level 1**: Application monitoring alerts (automated)
- **Level 2**: Development team on-call rotation
- **Level 3**: Azure Support (Professional tier)
- **Level 4**: Microsoft Azure escalation management

### Contact Information
```yaml
Primary Contacts:
  - Technical Lead: [Configure in deployment]
  - DevOps Engineer: [Configure in deployment]
  - Database Administrator: [Configure in deployment]

Azure Support:
  - Support Plan: Professional (4-hour response SLA)
  - Case Management: Azure Portal
  - Premier Support: Available for upgrade

Vendor Contacts:
  - OpenAI Support: For Azure OpenAI service issues
  - Third-party Services: As configured during deployment
```

---

## 🎯 Success Metrics & KPIs

### Technical Performance
- **Availability**: 99.9% uptime (target: 99.95%)
- **Response Time**: < 500ms average (target: < 300ms)
- **Error Rate**: < 1% (target: < 0.5%)
- **Database Performance**: < 100ms query response (target: < 50ms)

### Business Metrics
- **User Satisfaction**: Response quality and relevance
- **System Utilization**: Peak concurrent users supported
- **Cost Efficiency**: Cost per transaction/query
- **Feature Adoption**: Usage patterns across different engines

### Operational Metrics
- **Deployment Frequency**: Automated deployments per week
- **Mean Time to Recovery**: Average incident resolution time
- **Change Failure Rate**: Percentage of deployments requiring rollback
- **Lead Time**: Time from code commit to production deployment

---

This deployment guide provides comprehensive coverage for transforming the Wonder Healthcare platform from development to production-ready Azure infrastructure with live database integration, comprehensive monitoring, and operational excellence.