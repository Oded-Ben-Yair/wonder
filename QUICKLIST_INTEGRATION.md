# QuickList Integration Guide

## Current State
The Wonder Healthcare Platform is currently running with CSV data exported from QuickList:
- **CSV File**: `/packages/gateway/src/data/nurses.csv` (7,914 rows → 371 unique nurses)
- **Live Demo**: https://delightful-water-0728cae03.1.azurestaticapps.net
- **API Endpoint**: https://wonder-engine-web.azurewebsites.net

## Data Structure
The system expects nurse data in this format:

### CSV Columns (Current)
```csv
nurse_id, gender, name, mobility, municipality, updated_at, status, is_active, is_profile_updated, is_onboarding_completed, is_approved, treatment_type
```

Where:
- `nurse_id`: Unique identifier
- `name`: Contains the specialization (e.g., "WOUND_CARE", "MEDICATION")
- `municipality`: City name (e.g., "Tel Aviv-Yafo", "Jerusalem", "Hefa")
- `is_active`: Boolean (0/1)
- `is_approved`: Boolean (0/1)

### Specializations Supported
- WOUND_CARE, WOUND_TREATMENT
- CENTRAL_CATHETER_TREATMENT, CATHETER_INSERTION_REPLACEMENT
- MEDICATION, MEDICATION_ARRANGEMENT
- BLOOD_TESTS
- STOMA_TREATMENT
- DAY_NIGHT_CIRCUMCISION_NURSE
- PRIVATE_SECURITY_HOME, PRIVATE_SECURITY_HOSPITAL
- BREASTFEEDING_CONSULTATION, HOME_NEWBORN_VISIT
- FOLLOW_UP_AFTER_SURGERY
- And more (see `/packages/ui/src/types/index.ts`)

## QuickList Direct Integration

### Option 1: Database Connection
Update `/gateway-simple/server.js` to connect directly to QuickList database:

```javascript
// Instead of loading CSV
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.QUICKLIST_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function loadNursesData() {
  const query = `
    SELECT
      nurse_id,
      gender,
      specialization as name,
      municipality,
      is_active,
      is_approved
    FROM nurses
    WHERE is_active = true AND is_approved = true
  `;

  const result = await pool.query(query);
  // Process result.rows similar to CSV processing
}
```

### Option 2: QuickList API Integration
If QuickList has an API:

```javascript
async function loadNursesData() {
  const response = await axios.get('https://api.quicklist.com/nurses', {
    headers: { 'Authorization': `Bearer ${process.env.QUICKLIST_API_KEY}` }
  });

  // Transform QuickList API response to our format
  nursesData = response.data.map(nurse => ({
    id: nurse.nurse_id,
    name: `Nurse ${nurse.nurse_id.substring(0, 8)}`,
    city: nurse.municipality,
    services: [normalizeService(nurse.specialization)],
    // ... other fields
  }));
}
```

### Option 3: Real-time Sync
Set up webhook or scheduled sync:

```javascript
// Webhook endpoint to receive QuickList updates
app.post('/webhook/quicklist', (req, res) => {
  const { event, data } = req.body;

  if (event === 'nurse.updated') {
    updateNurse(data);
  } else if (event === 'nurse.created') {
    addNurse(data);
  }

  res.status(200).send('OK');
});
```

## Environment Variables Needed

Add to `.env` or Azure Configuration:

```bash
# For Database Connection
QUICKLIST_DATABASE_URL=postgresql://user:pass@quicklist.db.com:5432/nurses
USE_DB=true

# For API Connection
QUICKLIST_API_KEY=your-api-key-here
QUICKLIST_API_URL=https://api.quicklist.com

# For Webhooks
QUICKLIST_WEBHOOK_SECRET=webhook-secret-for-validation
```

## Deployment Steps

1. **Update Backend Configuration**
   ```bash
   cd gateway-simple
   # Update server.js with QuickList connection
   # Test locally with QuickList staging data
   npm start
   ```

2. **Deploy to Azure**
   ```bash
   # Add environment variables
   az webapp config appsettings set \
     --resource-group wonder-llm-rg \
     --name wonder-engine-web \
     --settings QUICKLIST_DATABASE_URL="..." USE_DB="true"

   # Deploy updated code
   zip -r deploy.zip . -x "node_modules/*"
   az webapp deploy --resource-group wonder-llm-rg \
     --name wonder-engine-web --src-path deploy.zip --type zip
   ```

3. **Verify Integration**
   ```bash
   # Test API
   curl https://wonder-engine-web.azurewebsites.net/health

   # Test search
   curl -X POST https://wonder-engine-web.azurewebsites.net/match \
     -H "Content-Type: application/json" \
     -d '{"city":"Tel Aviv","servicesQuery":["WOUND_CARE"],"topK":5}'
   ```

## Data Transformation Notes

The system currently:
1. Groups multiple rows per nurse into single nurse records
2. Aggregates specializations into a services array
3. Maps city names (e.g., "Haifa" → "Hefa")
4. Filters for active and approved nurses only

Ensure QuickList data maintains these business rules.

## Testing Checklist

- [ ] Connection to QuickList established
- [ ] Data loading without errors
- [ ] All specializations mapping correctly
- [ ] City search working (including variations)
- [ ] Service filtering working
- [ ] Performance acceptable (< 500ms response time)
- [ ] Error handling for connection failures
- [ ] Fallback to CSV if QuickList unavailable

## Support Contacts

- **Azure Deployment**: Use Azure Portal or CLI
- **Backend Issues**: Check `/gateway-simple/server.js`
- **Frontend Issues**: Check `/packages/ui/src/utils/api.ts`
- **NLP Issues**: Check `/packages/ui/src/utils/queryParser.ts`