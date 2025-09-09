# CLAUDE.md - Master Orchestration Documentation

This file serves as the central command center for the multi-agent orchestration system managing the Wonder healthcare matching platform.

## 🎯 Project Overview

**Project:** Wonder - Production-Grade Healthcare Matching Platform
**Goal:** Unified monorepo with natural language chatbot and multi-engine nurse matching
**Start Date:** 2025-09-09
**Target Completion:** 2025-09-23

## 🏗️ System Architecture

### Core Components
1. **Chatbot Interface**: Natural language query system for nurse availability
2. **Three Matching Engines**:
   - Azure GPT-5 (LLM-based semantic matching)
   - Basic Filter (Rule-based filtering)
   - Fuzzy Match (Weighted fuzzy string matching)
3. **Unified Data Layer**: Integration with nurses.csv from QuickList
4. **Production Gateway**: Orchestrates all engines with monitoring

## 🤖 Multi-Agent Orchestra

### Agent Roster and Responsibilities

| Agent | Branch | Status | Current Task | Last Update |
|-------|--------|--------|--------------|-------------|
| **Orchestrator** | main/develop | Active | Managing agent deployment | 2025-09-09 |
| **Backend Engineer** | feature/backend-refactor | Pending | Awaiting assignment | - |
| **Frontend Developer** | feature/ui-modernization | Pending | Awaiting assignment | - |
| **Data Analyst** | feature/data-validation | Pending | Awaiting assignment | - |
| **Tester** | feature/testing-suite | Pending | Awaiting assignment | - |
| **QA Agent** | feature/quality-assurance | Pending | Awaiting assignment | - |
| **LLM Specialist** | feature/llm-optimization | Pending | Awaiting assignment | - |
| **DevOps** | feature/infrastructure | Pending | Awaiting assignment | - |
| **Documentation** | feature/documentation | Pending | Awaiting assignment | - |

## 📋 Commands and Workflows

### Git Operations
```bash
# Check current branch status
git status

# Create new feature branch
git checkout -b feature/[agent-task]

# Commit with conventional commits
git add -A
git commit -m "feat(agent): Description"

# Push and create PR
git push origin feature/[agent-task]
```

### Testing Commands
```bash
# Run all tests
npm test

# Run specific engine tests
npm test -- --grep "engine-name"

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance
```

### Development Commands
```bash
# Start gateway
cd gateway && npm start

# Start with hot reload
npm run dev

# Build for production
npm run build

# Deploy to staging
npm run deploy:staging
```

## 🔄 Quality Loop Process

```mermaid
graph TD
    A[Tester runs tests] --> B{Tests Pass?}
    B -->|No| C[Mark issues]
    C --> D[Orchestrator assigns fix]
    D --> E[Agent fixes issue]
    E --> A
    B -->|Yes| F[Data Analyst validates]
    F --> G{Data correct?}
    G -->|No| C
    G -->|Yes| H[LLM Specialist optimizes]
    H --> I[QA final review]
    I --> J[Merge to develop]
```

## 📊 Data Model

### Nurses Data Structure (from QuickList CSV)
```javascript
{
  nurse_id: string,
  gender: string,
  name: string,
  mobility: string,
  municipality: string,
  updated_at: datetime,
  status: string,
  is_active: boolean,
  is_profile_updated: boolean,
  is_onboarding_completed: boolean,
  is_approved: boolean,
  treatment_type: string
}
```

### Query Interface
```javascript
// Natural language query
"Who is available today at 3pm in Tel Aviv?"

// Parsed to structured query
{
  municipality: "Tel Aviv",
  date: "2025-09-09",
  time: "15:00",
  available: true
}
```

## 🚀 Deployment Strategy

### Environment Structure
- **Local**: Development and testing
- **Staging**: Integration testing with all agents
- **Production**: Final deployment after QA approval

### Branch Protection Rules
- `main`: Protected, requires 2 reviews
- `develop`: Protected, requires 1 review
- `production`: Protected, requires QA sign-off

## 📈 Progress Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Code Coverage | 90% | 0% | 🔴 |
| Test Pass Rate | 100% | 0% | 🔴 |
| Documentation | 100% | 10% | 🔴 |
| Performance Score | 95/100 | 0/100 | 🔴 |
| Security Score | A | N/A | 🔴 |

## ⚠️ Critical Rules

1. **NO agent works without checking this file first**
2. **Every commit must update PRODUCTION_TRACKER.md**
3. **All PRs must reference this documentation**
4. **Test-Analyze-Fix loop is mandatory**
5. **No merge without full test coverage**
6. **Documentation is not optional**

## 🎯 Next Actions

1. ✅ Create CLAUDE.md (this file)
2. ⏳ Create PRODUCTION_TRACKER.md
3. ⏳ Backup existing repositories
4. ⏳ Deploy agent system
5. ⏳ Begin parallel development

## 📝 Notes and Decisions

- **2025-09-09**: Project initiated, master documentation created
- Decided to use React for frontend (modern, component-based)
- Chose PostgreSQL over JSON for production data storage
- Will implement WebSocket for real-time updates

## 🔗 Important Links

- **Main Repository**: /home/odedbe/wonder
- **Engines**:
  - Azure GPT: /home/odedbe/wonder/engine-azure-gpt5
  - Basic Filter: /home/odedbe/wonder/engine-basic
  - Fuzzy Match: /home/odedbe/wonder/engine-fuzzy
- **Gateway**: /home/odedbe/wonder/gateway
- **Data**: /home/odedbe/wonder/engine-*/sample_data/nurses.csv

---

**Last Updated**: 2025-09-09 06:30:00
**Updated By**: Orchestrator Agent
**Version**: 1.0.0