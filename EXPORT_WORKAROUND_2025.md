# QuickSight Export Workaround - September 2025

## Option 1: Use QuickSight API (Programmatic Export)

```bash
# Install AWS CLI v2 (latest for 2025)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure with your credentials
aws configure
# Enter: AWS Access Key ID
# Enter: AWS Secret Access Key
# Enter: eu-west-1
# Enter: json

# Export dataset
aws quicksight describe-data-set \
  --aws-account-id $(aws sts get-caller-identity --query Account --output text) \
  --data-set-id nurses-dataset-id \
  --region eu-west-1

# Generate presigned URL for download
aws quicksight generate-embed-url-for-registered-user \
  --aws-account-id $(aws sts get-caller-identity --query Account --output text) \
  --experience-configuration Dashboard={InitialDashboardId=nurses-dashboard} \
  --user-arn your-user-arn
```

## Option 2: Use QuickSight Q (Natural Language Query)

1. In QuickSight, look for **Q bar** (search bar)
2. Type: "Show all nurses data as table"
3. Once table appears, export that view

## Option 3: Create Export Analysis

1. Create NEW analysis
2. Add dataset "Nurses_צגתר"
3. Create a **Table visual**
4. Add ALL fields to the table
5. In table settings, set row limit to maximum (1,000,000)
6. Now export button should appear

## Option 4: Use SPICE Dataset Refresh + S3

Since your dataset uses SPICE (in-memory):

```python
# Python script to extract SPICE data
import boto3
import pandas as pd

# Initialize QuickSight client
client = boto3.client('quicksight', region_name='eu-west-1')

# Get dataset
response = client.describe_data_set(
    AwsAccountId='YOUR_ACCOUNT_ID',
    DataSetId='nurses-dataset-id'
)

# Request data export
export_response = client.create_export(
    AwsAccountId='YOUR_ACCOUNT_ID',
    DataSetId='nurses-dataset-id',
    FileFormat='CSV'
)

print(f"Export initiated: {export_response['ExportId']}")
```

## Option 5: Browser Developer Tools Hack

1. Open Nurses analysis in QuickSight
2. Press F12 (Developer Tools)
3. Go to Network tab
4. Refresh the page
5. Look for API calls containing nurse data
6. Right-click → Copy as cURL
7. Save the JSON response data

## Option 6: Contact QuickList Directly

Email template:
```
Subject: Data Export Request - Wonder Integration

Hi QuickList Team,

We need a full export of our nurse database for the Wonder platform integration.

Required format: CSV
Required fields: All nurse records with specializations, cities, and availability
Purpose: CEO demonstration to investors

Please provide:
1. Full CSV export
2. Or API access credentials
3. Or direct database read-only access

Thank you,
[Your name]
```