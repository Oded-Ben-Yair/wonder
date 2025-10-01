# Database Setup Guide

This guide covers setting up PostgreSQL or MongoDB for the WonderCare nurse matching service.

## PostgreSQL Setup

### Schema

```sql
-- Main nurses table
create table if not exists nurses (
  id text primary key,
  name text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  rating numeric(2,1) not null,
  reviews_count integer not null
);

-- Services offered by each nurse
create table if not exists nurse_services (
  nurse_id text references nurses(id),
  service text not null
);

-- Expertise tags for each nurse
create table if not exists nurse_expertise (
  nurse_id text references nurses(id),
  tag text not null
);

-- Availability schedule
create table if not exists nurse_availability (
  nurse_id text references nurses(id),
  day text not null,  -- "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  slots text[] not null -- e.g. '{"07:00-11:00","17:00-21:00"}'
);

-- Indexes for performance
create index idx_nurses_city on nurses(city);
create index idx_nurse_services_nurse_id on nurse_services(nurse_id);
create index idx_nurse_expertise_nurse_id on nurse_expertise(nurse_id);
create index idx_nurse_availability_nurse_id on nurse_availability(nurse_id);
```

### Sample Data Seeding

```sql
-- Insert sample nurses
insert into nurses (id, name, city, lat, lng, rating, reviews_count) values
  ('n1', 'Nurit Ben-Ami', 'Tel Aviv', 32.0853, 34.7818, 4.8, 124),
  ('n2', 'Adi Cohen', 'Tel Aviv', 32.09, 34.78, 4.6, 98),
  ('n3', 'Michal Levy', 'Jerusalem', 31.7683, 35.2137, 4.9, 156),
  ('n4', 'David Shapiro', 'Haifa', 32.7940, 34.9896, 4.7, 87);

-- Insert services
insert into nurse_services (nurse_id, service) values
  ('n1', 'Wound Care'),
  ('n1', 'Geriatric Care'),
  ('n2', 'Pediatrics'),
  ('n2', 'Vaccination'),
  ('n3', 'Wound Care'),
  ('n3', 'Geriatric Care'),
  ('n4', 'Pediatrics'),
  ('n4', 'Home Care');

-- Insert expertise tags
insert into nurse_expertise (nurse_id, tag) values
  ('n1', 'Pediatrics'),
  ('n1', 'Home Care'),
  ('n2', 'Emergency'),
  ('n2', 'Critical Care'),
  ('n3', 'Geriatrics'),
  ('n3', 'Wound Specialist'),
  ('n4', 'Pediatric Specialist'),
  ('n4', 'Vaccination Expert');

-- Insert availability
insert into nurse_availability (nurse_id, day, slots) values
  ('n1', 'Mon', '{"08:00-16:00"}'),
  ('n1', 'Tue', '{"08:00-16:00"}'),
  ('n1', 'Wed', '{"08:00-16:00"}'),
  ('n2', 'Mon', '{"09:00-17:00"}'),
  ('n2', 'Thu', '{"09:00-17:00"}'),
  ('n2', 'Fri', '{"09:00-14:00"}'),
  ('n3', 'Tue', '{"10:00-18:00"}'),
  ('n3', 'Wed', '{"10:00-18:00"}'),
  ('n3', 'Thu', '{"10:00-18:00"}'),
  ('n4', 'Mon', '{"07:00-15:00"}'),
  ('n4', 'Wed', '{"07:00-15:00"}'),
  ('n4', 'Fri', '{"07:00-12:00"}');
```

### Running PostgreSQL

```bash
# Set environment variables
export USE_DB=true
export DB_KIND=postgres
export DATABASE_URL=postgres://user:password@localhost:5432/wondercare

# Start the server
npm start

# Test database health
curl -s http://localhost:5001/db/health
```

## MongoDB Setup

### Required Document Structure

Each nurse document should have the following structure:

```json
{
  "id": "n1",
  "name": "Nurit Ben-Ami",
  "city": "Tel Aviv",
  "lat": 32.0853,
  "lng": 34.7818,
  "rating": 4.8,
  "reviewsCount": 124,
  "services": ["Wound Care", "Geriatric Care"],
  "expertise": ["Pediatrics", "Home Care"],
  "availability": [
    { "day": "Mon", "slots": ["08:00-16:00"] },
    { "day": "Tue", "slots": ["08:00-16:00"] },
    { "day": "Wed", "slots": ["08:00-16:00"] }
  ]
}
```

### MongoDB Seed Script

```javascript
// Connect to MongoDB and insert sample data
db = db.getSiblingDB('wondercare');

db.nurses.insertMany([
  {
    id: "n1",
    name: "Nurit Ben-Ami",
    city: "Tel Aviv",
    lat: 32.0853,
    lng: 34.7818,
    rating: 4.8,
    reviewsCount: 124,
    services: ["Wound Care", "Geriatric Care"],
    expertise: ["Pediatrics", "Home Care"],
    availability: [
      { day: "Mon", slots: ["08:00-16:00"] },
      { day: "Tue", slots: ["08:00-16:00"] },
      { day: "Wed", slots: ["08:00-16:00"] }
    ]
  },
  {
    id: "n2",
    name: "Adi Cohen",
    city: "Tel Aviv",
    lat: 32.09,
    lng: 34.78,
    rating: 4.6,
    reviewsCount: 98,
    services: ["Pediatrics", "Vaccination"],
    expertise: ["Emergency", "Critical Care"],
    availability: [
      { day: "Mon", slots: ["09:00-17:00"] },
      { day: "Thu", slots: ["09:00-17:00"] },
      { day: "Fri", slots: ["09:00-14:00"] }
    ]
  }
]);

// Create indexes
db.nurses.createIndex({ city: 1 });
db.nurses.createIndex({ "services": 1 });
db.nurses.createIndex({ id: 1 }, { unique: true });
```

### Running MongoDB

```bash
# Set environment variables
export USE_DB=true
export DB_KIND=mongo
export MONGODB_URI=mongodb://user:password@localhost:27017
export MONGODB_DB=wondercare
export MONGODB_COLLECTION=nurses

# Start the server
npm start

# Test database health
curl -s http://localhost:5001/db/health
```

## Fallback to JSON

When `USE_DB=false` (default), the system automatically falls back to reading from `sample_data/nurses.json`. This ensures the application works without any database setup.

```bash
# Using JSON fallback (default)
export USE_DB=false
npm start

# Check that JSON fallback is active
curl -s http://localhost:5001/db/health
# Response: {"ok":false,"reason":"USE_DB=false"}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| USE_DB | Enable database integration | false |
| DB_KIND | Database type (postgres/mongo) | postgres |
| DATABASE_URL | PostgreSQL connection string | - |
| MONGODB_URI | MongoDB connection URI | - |
| MONGODB_DB | MongoDB database name | wondercare |
| MONGODB_COLLECTION | MongoDB collection name | nurses |

## Health Check Endpoint

The `/db/health` endpoint provides database connection status:

```bash
# When database is connected
curl -s http://localhost:5001/db/health
# Response: {"ok":true,"probe":{"ok":1}}

# When using JSON fallback
curl -s http://localhost:5001/db/health
# Response: {"ok":false,"reason":"USE_DB=false"}

# When database connection fails
curl -s http://localhost:5001/db/health
# Response: {"ok":false,"error":"connection error message"}
```