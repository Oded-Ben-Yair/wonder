# AWS QuickSight to Wonder App Integration

## Current Situation
You have AWS QuickSight dashboard at:
`https://eu-west-1.quicksight.aws.amazon.com/sn/account/wonder-prod/analyses/0948565e-7f1d-441d-b4db-4c2e8fbea74f`

QuickSight is a **visualization tool**, not the database. It's reading data from somewhere else.

## Finding Your Data Source

### Step 1: Identify the Underlying Data Source
In AWS QuickSight, you need to find where the data comes from:

1. **Log into AWS QuickSight**
2. **Go to your analysis** (the link you provided)
3. **Click on the dataset** being used
4. **View dataset details** to find:
   - Data source type (RDS, Redshift, S3, Athena, etc.)
   - Connection details
   - Database/table names

### Step 2: Common AWS Data Sources

Your QuickList data is likely in one of these:

#### Option A: Amazon RDS (PostgreSQL/MySQL)
```javascript
// gateway-simple/server.js
const { Client } = require('pg');

const client = new Client({
  host: 'your-rds-endpoint.eu-west-1.rds.amazonaws.com',
  database: 'quicklist_prod',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function loadNursesData() {
  await client.connect();

  const query = `
    SELECT
      nurse_id,
      gender,
      specialization,
      municipality,
      is_active,
      is_approved
    FROM nurses
    WHERE is_active = 1 AND is_approved = 1
  `;

  const result = await client.query(query);
  // Process result.rows like CSV
}
```

#### Option B: Amazon Redshift
```javascript
const { Client } = require('pg'); // Redshift uses PostgreSQL protocol

const client = new Client({
  host: 'your-cluster.eu-west-1.redshift.amazonaws.com',
  database: 'quicklist',
  user: process.env.REDSHIFT_USER,
  password: process.env.REDSHIFT_PASSWORD,
  port: 5439
});
```

#### Option C: Amazon S3 + Athena
```javascript
const AWS = require('aws-sdk');
const athena = new AWS.Athena({ region: 'eu-west-1' });

async function queryAthena() {
  const params = {
    QueryString: 'SELECT * FROM quicklist.nurses WHERE is_active = 1',
    QueryExecutionContext: { Database: 'quicklist' },
    ResultConfiguration: {
      OutputLocation: 's3://your-bucket/query-results/'
    }
  };

  const result = await athena.startQueryExecution(params).promise();
  // Wait for query and get results
}
```

#### Option D: Direct S3 CSV/JSON Files
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'eu-west-1' });

async function loadFromS3() {
  const params = {
    Bucket: 'quicklist-data',
    Key: 'nurses/latest.csv'
  };

  const data = await s3.getObject(params).promise();
  const csvContent = data.Body.toString('utf-8');
  // Parse CSV like current implementation
}
```

## How to Find Your Connection Details

### From AWS Console:

1. **Go to AWS Console** (https://console.aws.amazon.com)
2. **Switch to eu-west-1** (Ireland) region
3. **Check these services:**
   - **RDS**: Look for databases
   - **Redshift**: Look for clusters
   - **S3**: Look for buckets with QuickList data
   - **Glue**: Check data catalog
   - **Athena**: Check saved queries

### From QuickSight:

1. In QuickSight, go to **Manage QuickSight**
2. Click **Manage data**
3. Find your dataset
4. Click **Edit dataset**
5. View **Data source** tab
6. Note the connection type and details

## Implementation Steps

### 1. Get AWS Credentials
```bash
# You'll need:
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-1

# Or database specific:
DATABASE_HOST=xxx.rds.amazonaws.com
DATABASE_NAME=quicklist
DATABASE_USER=xxx
DATABASE_PASSWORD=xxx
```

### 2. Update Backend Code
```javascript
// gateway-simple/server.js

// Add AWS SDK if needed
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-west-1'
});

// Replace CSV loading with database query
async function loadNursesData() {
  try {
    // Connect to your actual data source
    // Use one of the options above based on your setup

    const data = await fetchFromDataSource();

    // Transform to our format
    nursesData = processQuickListData(data);

    console.log(`Loaded ${nursesData.length} nurses from QuickList`);
  } catch (error) {
    console.error('Failed to load from QuickList:', error);
    // Fallback to CSV
    loadFromCSV();
  }
}
```

### 3. Set Environment Variables in Azure
```bash
az webapp config appsettings set \
  --resource-group wonder-llm-rg \
  --name wonder-engine-web \
  --settings \
    AWS_ACCESS_KEY_ID="xxx" \
    AWS_SECRET_ACCESS_KEY="xxx" \
    DATABASE_HOST="xxx" \
    DATABASE_PASSWORD="xxx"
```

### 4. Deploy and Test
```bash
# Deploy updated backend
zip -r deploy.zip gateway-simple/ -x "node_modules/*"
az webapp deploy --resource-group wonder-llm-rg \
  --name wonder-engine-web --src-path deploy.zip --type zip

# Test connection
curl https://wonder-engine-web.azurewebsites.net/health
```

## Security Best Practices

1. **Use IAM Roles** instead of access keys when possible
2. **Encrypt credentials** in Azure Key Vault
3. **Use read-only database users**
4. **Implement connection pooling**
5. **Add retry logic** for network failures
6. **Cache data** to reduce database load

## Need Help?

To proceed, we need to know:
1. What type of data source QuickSight is using (RDS, S3, etc.)
2. Database/bucket names
3. Table/file structure
4. Access credentials

Check with your AWS administrator or look in the QuickSight dataset configuration for these details.