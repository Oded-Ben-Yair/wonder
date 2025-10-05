#!/usr/bin/env python3
"""
Data Enrichment Script for Wonder Care Matching Engine
Merges Excel Hebrew names with realistic nurse profiles
"""

import json
import pandas as pd
import random
import numpy as np
from datetime import datetime, timedelta
from collections import Counter

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

def load_excel_names(excel_path):
    """Load nurse names from Excel file"""
    print("📊 Loading Excel file with nurse names...")
    df = pd.read_excel(excel_path)
    print(f"✅ Loaded {len(df)} nurse names")
    return df

def analyze_existing_patterns(json_path):
    """Extract patterns from existing nurses.json"""
    print("\n📊 Analyzing existing nurses.json for patterns...")
    with open(json_path, 'r', encoding='utf-8') as f:
        existing_nurses = json.load(f)

    # Extract all unique values
    specializations = set()
    cities = set()

    for nurse in existing_nurses:
        if 'specialization' in nurse and nurse['specialization']:
            specializations.update(nurse['specialization'])
        if 'municipality' in nurse and nurse['municipality']:
            cities.update(nurse['municipality'])

    # Get frequency distributions for weighted sampling
    spec_counter = Counter()
    city_counter = Counter()

    for nurse in existing_nurses:
        if 'specialization' in nurse:
            spec_counter.update(nurse['specialization'])
        if 'municipality' in nurse:
            city_counter.update(nurse['municipality'])

    patterns = {
        'specializations': sorted(list(specializations)),
        'cities': sorted(list(cities)),
        'spec_weights': spec_counter,
        'city_weights': city_counter,
        'sample_nurse': existing_nurses[0] if existing_nurses else {}
    }

    print(f"✅ Found {len(patterns['specializations'])} specialization types")
    print(f"✅ Found {len(patterns['cities'])} cities")

    return patterns

def generate_weighted_choice(items, weights, k=1):
    """Generate weighted random choice"""
    if not weights:
        return random.sample(items, min(k, len(items)))

    # Normalize weights
    total = sum(weights.values())
    probs = [weights.get(item, 1) / total for item in items]

    return list(np.random.choice(items, size=min(k, len(items)), replace=False, p=probs))

def generate_rating():
    """Generate realistic rating (3.5-5.0, weighted toward 4.2-4.8)"""
    rating = np.random.normal(4.4, 0.4)
    return round(max(3.5, min(5.0, rating)), 1)

def generate_review_count():
    """Generate realistic review count (10-300, lognormal distribution)"""
    count = int(np.random.lognormal(3.5, 1.2))
    return max(10, min(300, count))

def generate_experience_years():
    """Generate experience years (1-20, normal distribution)"""
    years = int(np.random.normal(6, 3))
    return max(1, min(20, years))

def generate_availability():
    """Generate availability schedule"""
    days = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19']
    num_days = random.randint(3, 5)
    selected_days = random.sample(days, num_days)

    availability = {}
    for day in selected_days:
        num_slots = random.randint(2, 4)
        slots = []
        for _ in range(num_slots):
            hour = random.randint(8, 18)
            slots.append({
                "start": f"{hour:02d}:00",
                "end": f"{hour+2:02d}:00"
            })
        availability[day] = slots

    return availability

def generate_gender():
    """Generate gender (85% female, 15% male)"""
    return "FEMALE" if random.random() < 0.85 else "MALE"

def enrich_nurse(row, patterns, index):
    """Create enriched nurse profile from Excel name row"""
    nurse_id = str(row['id']) if pd.notna(row['id']) else f"nurse-{index}"
    first_name = str(row['first_name']) if pd.notna(row['first_name']) else f"אחות"
    last_name = str(row['last_name']) if pd.notna(row['last_name']) else f"{index}"

    # Generate specializations (2-4 per nurse)
    num_specs = random.randint(2, 4)
    specializations = generate_weighted_choice(
        patterns['specializations'],
        patterns['spec_weights'],
        k=num_specs
    )

    # Generate cities (1-3 per nurse)
    num_cities = random.randint(1, 3)
    municipalities = generate_weighted_choice(
        patterns['cities'],
        patterns['city_weights'],
        k=num_cities
    )

    # Generate mobility support (2-4 options)
    mobility_options = ['INDEPENDENT', 'WALKING_CANE', 'WHEELCHAIR', 'WALKER', 'BEDRIDDEN']
    num_mobility = random.randint(2, 4)
    mobility = random.sample(mobility_options, num_mobility)

    # Create enriched nurse profile
    enriched = {
        "nurseId": nurse_id,
        "firstName": first_name,
        "lastName": last_name,
        "gender": generate_gender(),
        "specialization": specializations,
        "mobility": mobility,
        "municipality": municipalities,
        "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": random.sample(["CLOSED", "CANCELLED"], random.randint(1, 2)),
        "isActive": True,
        "isProfileUpdated": random.random() > 0.3,
        "isOnboardingCompleted": True,
        "isApproved": True,
        "rating": generate_rating(),
        "reviewsCount": generate_review_count(),
        "experienceYears": generate_experience_years(),
        "availability": generate_availability(),
        "languages": random.sample(
            ["HEBREW", "ENGLISH", "RUSSIAN", "ARABIC", "AMHARIC"],
            random.randint(1, 3)
        )
    }

    # Progress indicator
    if (index + 1) % 500 == 0:
        print(f"  ✨ Enriched {index + 1}/{patterns['total_count']} nurses...")

    return enriched

def save_enriched_data(enriched_nurses, output_path):
    """Save enriched nurse data to JSON file"""
    print(f"\n💾 Saving enriched data to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(enriched_nurses, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {len(enriched_nurses)} enriched nurse profiles")

def main():
    print("🚀 Wonder Care - Data Enrichment Script")
    print("=" * 60)

    # Paths
    excel_path = '/home/odedbe/wonder/data-17588841641121111.xlsx'
    json_path = '/home/odedbe/wonder/packages/gateway/src/data/nurses.json'
    output_path = '/home/odedbe/wonder/packages/gateway/src/data/nurses-enriched.json'

    # Load data
    df_names = load_excel_names(excel_path)
    patterns = analyze_existing_patterns(json_path)
    patterns['total_count'] = len(df_names)  # For progress tracking

    # Enrich data
    print(f"\n🔄 Enriching {len(df_names)} nurse profiles...")
    enriched_nurses = []

    for index, row in df_names.iterrows():
        enriched = enrich_nurse(row, patterns, index)
        enriched_nurses.append(enriched)

    # Save enriched data
    save_enriched_data(enriched_nurses, output_path)

    # Statistics
    print("\n📊 Enrichment Statistics:")
    print(f"  Total nurses: {len(enriched_nurses)}")
    print(f"  Avg rating: {np.mean([n['rating'] for n in enriched_nurses]):.2f}")
    print(f"  Avg reviews: {np.mean([n['reviewsCount'] for n in enriched_nurses]):.0f}")
    print(f"  Avg experience: {np.mean([n['experienceYears'] for n in enriched_nurses]):.1f} years")

    gender_dist = Counter(n['gender'] for n in enriched_nurses)
    print(f"  Gender: {gender_dist['FEMALE']} F ({gender_dist['FEMALE']/len(enriched_nurses)*100:.1f}%), {gender_dist['MALE']} M")

    print("\n✅ Data enrichment complete!")
    print(f"📁 Output: {output_path}")

if __name__ == '__main__':
    main()
