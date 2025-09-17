import csv
import json
from datetime import datetime
import os
from collections import defaultdict

def load_nurses_data(base_path='/home/odedbe/wonder/packages/engine-'):
    """Load nurses data from all engine packages."""
    all_nurses = []
    for engine in ['basic', 'fuzzy', 'azure-gpt']:
        file_path = os.path.join(base_path + engine, 'sample_data', 'nurses.csv')
        with open(file_path, 'r', encoding='utf-8-sig') as f:  # Use utf-8-sig to handle BOM
            reader = csv.DictReader(f)
            all_nurses.extend(list(reader))
    return all_nurses

def clean_nurses_data(nurses):
    """Clean and transform nurses data."""
    nurses_dict = defaultdict(lambda: {
        'nurseId': None,
        'gender': None,
        'specialization': set(),
        'mobility': set(),
        'municipality': set(),
        'updatedAt': None,
        'status': set(),
        'isActive': False,
        'isProfileUpdated': False,
        'isOnboardingCompleted': False,
        'isApproved': False,
        'treatmentType': set()
    })

    for nurse in nurses:
        nurse_id = nurse['nurse_id']
        
        # Aggregate data for each nurse
        nurses_dict[nurse_id]['nurseId'] = nurse_id
        nurses_dict[nurse_id]['gender'] = nurse['gender']
        nurses_dict[nurse_id]['specialization'].add(nurse['name'])
        nurses_dict[nurse_id]['mobility'].add(nurse['mobility'])
        nurses_dict[nurse_id]['municipality'].add(nurse['municipality'])
        
        # Update timestamp
        current_time = nurse['updated_at[nurse_nurse]']
        if not nurses_dict[nurse_id]['updatedAt'] or current_time > nurses_dict[nurse_id]['updatedAt']:
            nurses_dict[nurse_id]['updatedAt'] = current_time
        
        # Aggregate status and boolean fields
        nurses_dict[nurse_id]['status'].add(nurse['status'])
        nurses_dict[nurse_id]['isActive'] |= (nurse['is_active'] == '1')
        nurses_dict[nurse_id]['isProfileUpdated'] |= (nurse['is_profile_updated'] == '1')
        nurses_dict[nurse_id]['isOnboardingCompleted'] |= (nurse['is_onboarding_completed'] == '1')
        nurses_dict[nurse_id]['isApproved'] |= (nurse['is_approved[nurse_nurse]'] == '1')
        nurses_dict[nurse_id]['treatmentType'].add(nurse['treatment_type'])

    # Convert sets to lists
    for nurse_data in nurses_dict.values():
        nurse_data['specialization'] = list(nurse_data['specialization'])
        nurse_data['mobility'] = list(nurse_data['mobility'])
        nurse_data['municipality'] = list(nurse_data['municipality'])
        nurse_data['status'] = list(nurse_data['status'])
        nurse_data['treatmentType'] = list(nurse_data['treatmentType'])

    return list(nurses_dict.values())

def generate_data_quality_report(nurses):
    """Generate a comprehensive data quality report."""
    municipality_dist = defaultdict(int)
    status_dist = defaultdict(int)
    mobility_dist = defaultdict(int)

    for nurse in nurses:
        for m in nurse['municipality']:
            municipality_dist[m] += 1
        for s in nurse['status']:
            status_dist[s] += 1
        for mob in nurse['mobility']:
            mobility_dist[mob] += 1

    report = {
        'total_records': len(nurses),
        'unique_nurses': len(nurses),
        'municipality_distribution': dict(municipality_dist),
        'status_distribution': dict(status_dist),
        'mobility_distribution': dict(mobility_dist),
        'report_timestamp': datetime.now().isoformat()
    }
    return report

def save_nurses_data(nurses, base_path='/home/odedbe/wonder/packages/gateway/src/data'):
    """Save processed nurses data to JSON."""
    # Save full dataset
    with open(os.path.join(base_path, 'nurses.json'), 'w', encoding='utf-8') as f:
        json.dump(nurses, f, ensure_ascii=False, indent=2, default=str)
    
    # Save data quality report
    report = generate_data_quality_report(nurses)
    with open(os.path.join(base_path, 'nurses_data_quality_report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)

def main():
    # Load and process nurses data
    nurses = load_nurses_data()
    nurses_cleaned = clean_nurses_data(nurses)
    save_nurses_data(nurses_cleaned)
    
    print("Nurses data processing completed successfully!")

if __name__ == '__main__':
    main()