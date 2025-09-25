# QuickSight Data Export Guide

## Method 1: From Analysis View
1. Go to **Analyses** tab (you have "Nurses analysis" there)
2. Open the "Nurses analysis"
3. Find a table visualization showing nurse data
4. Click the **three dots (⋮)** in the corner of the table
5. Select **"Export to CSV"**
6. Choose **"Export all records"** (not just visible)

## Method 2: Using AWS CLI (if you have access)
```bash
# Install AWS CLI if needed
sudo apt-get install awscli

# Configure AWS credentials
aws configure

# List datasets
aws quicksight list-data-sets --aws-account-id YOUR_ACCOUNT_ID

# Create an export job
aws quicksight create-ingestion \
  --data-set-id NURSES_DATASET_ID \
  --ingestion-id export-$(date +%s) \
  --aws-account-id YOUR_ACCOUNT_ID
```

## Method 3: Ask QuickList Team
If you can't export directly:
1. Contact QuickList support team
2. Request a data export of all nurse records
3. Ask for CSV format with all fields

## What You Need in the CSV:
- nurse_id
- name (specialization)
- municipality/city
- gender
- is_active
- is_approved
- Any availability fields

## Once You Have the File:
1. Save it as `nurses-full.csv`
2. Replace the existing file:
```bash
cp nurses-full.csv /home/odedbe/wonder/nurses.csv
```

3. The app will automatically use the new data!