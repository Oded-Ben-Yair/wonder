-- Wonder Healthcare Platform - PostgreSQL Database Schema
-- Optimized for Azure Database for PostgreSQL Flexible Server
-- Compatible with existing engine-basic/src/db.js infrastructure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core nurse profiles table
-- Maps to existing nurses.json structure with enhanced relational design
CREATE TABLE nurses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id VARCHAR(100) UNIQUE NOT NULL, -- Original ID from JSON data
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    lat DECIMAL(10,8), -- Latitude for geospatial queries
    lng DECIMAL(11,8), -- Longitude for geospatial queries
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5.0),
    reviews_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    is_profile_updated BOOLEAN DEFAULT false,
    gender VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services offered by nurses
-- Normalized from the services array in JSON data
CREATE TABLE nurse_services (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,
    service_type VARCHAR(50), -- Raw service type from JSON (e.g., 'WOUND_CARE', 'MEDICATION')
    service_category VARCHAR(50), -- Mapped category (e.g., 'Wound Care', 'General Nursing')
    is_primary BOOLEAN DEFAULT false, -- Primary specialization flag
    certification_date DATE, -- When certified for this service
    experience_years INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (nurse_id, service)
);

-- Nurse expertise and specialization tags
-- Supports both structured specializations and free-form tags
CREATE TABLE nurse_expertise (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    expertise_tag VARCHAR(100) NOT NULL,
    expertise_type VARCHAR(50), -- 'specialization', 'skill', 'certification'
    proficiency_level VARCHAR(20) DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'expert'
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (nurse_id, expertise_tag)
);

-- Real-time availability scheduling
-- Supports both recurring schedules and specific date/time slots
CREATE TABLE nurse_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    availability_type VARCHAR(20) DEFAULT 'specific', -- 'recurring', 'specific', 'blocked'
    
    -- For specific date availability
    available_date DATE,
    start_time TIME,
    end_time TIME,
    
    -- For recurring availability (weekly pattern)
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
    recurring_start_time TIME,
    recurring_end_time TIME,
    
    -- Availability status
    is_available BOOLEAN DEFAULT true,
    booking_id UUID, -- Reference to actual bookings (future feature)
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geographic service areas
-- Maps to municipality arrays in JSON data
CREATE TABLE nurse_locations (
    nurse_id UUID REFERENCES nurses(id) ON DELETE CASCADE,
    municipality VARCHAR(100) NOT NULL,
    municipality_hebrew VARCHAR(100), -- Hebrew name if applicable
    is_primary BOOLEAN DEFAULT false,
    service_radius_km INTEGER DEFAULT 25,
    travel_compensation_required BOOLEAN DEFAULT false,
    
    -- Geographic bounds for the service area
    region VARCHAR(50), -- 'North', 'Central', 'South', 'Jerusalem', etc.
    district VARCHAR(50), -- Administrative district
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (nurse_id, municipality)
);

-- Audit log for data changes
-- Tracks all modifications for compliance and debugging
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    operation VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100), -- User or system that made the change
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance optimization indexes
-- Optimized for common query patterns in the matching engines

-- Primary lookup indexes
CREATE INDEX idx_nurses_city ON nurses(city) WHERE is_active = true AND is_approved = true;
CREATE INDEX idx_nurses_active ON nurses(is_active, is_approved);
CREATE INDEX idx_nurses_rating ON nurses(rating DESC, reviews_count DESC) WHERE is_active = true;
CREATE INDEX idx_nurses_location ON nurses(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Service and expertise indexes  
CREATE INDEX idx_nurse_services_service ON nurse_services(service);
CREATE INDEX idx_nurse_services_category ON nurse_services(service_category);
CREATE INDEX idx_nurse_expertise_tag ON nurse_expertise(expertise_tag);

-- Availability indexes for scheduling queries
CREATE INDEX idx_nurse_availability_date ON nurse_availability(available_date, is_available) 
    WHERE availability_type = 'specific';
CREATE INDEX idx_nurse_availability_recurring ON nurse_availability(day_of_week, recurring_start_time) 
    WHERE availability_type = 'recurring';
CREATE INDEX idx_nurse_availability_nurse ON nurse_availability(nurse_id, is_available);

-- Location-based indexes for geographic queries
CREATE INDEX idx_nurse_locations_municipality ON nurse_locations(municipality);
CREATE INDEX idx_nurse_locations_region ON nurse_locations(region, is_primary);

-- Composite indexes for complex queries
CREATE INDEX idx_nurses_city_rating ON nurses(city, rating DESC) 
    WHERE is_active = true AND is_approved = true;
CREATE INDEX idx_services_nurse_category ON nurse_services(nurse_id, service_category);

-- Geospatial index for distance-based queries (if PostGIS is available)
-- CREATE INDEX idx_nurses_geospatial ON nurses USING GIST(ST_Point(lng, lat)) 
--     WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_user);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_user);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to main tables
CREATE TRIGGER nurses_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON nurses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER nurse_services_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON nurse_services
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER nurse_availability_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON nurse_availability
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER nurses_updated_at_trigger
    BEFORE UPDATE ON nurses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER nurse_availability_updated_at_trigger
    BEFORE UPDATE ON nurse_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
-- Optimized views that match existing engine query patterns

-- Active nurses with their primary service and location
CREATE VIEW active_nurses_summary AS
SELECT 
    n.id,
    n.nurse_id,
    n.name,
    n.city,
    n.lat,
    n.lng,
    n.rating,
    n.reviews_count,
    array_agg(DISTINCT ns.service_category) FILTER (WHERE ns.service_category IS NOT NULL) as services,
    array_agg(DISTINCT ne.expertise_tag) FILTER (WHERE ne.expertise_tag IS NOT NULL) as expertise,
    array_agg(DISTINCT nl.municipality) FILTER (WHERE nl.municipality IS NOT NULL) as municipalities
FROM nurses n
LEFT JOIN nurse_services ns ON n.id = ns.nurse_id
LEFT JOIN nurse_expertise ne ON n.id = ne.nurse_id
LEFT JOIN nurse_locations nl ON n.id = nl.nurse_id
WHERE n.is_active = true AND n.is_approved = true
GROUP BY n.id, n.nurse_id, n.name, n.city, n.lat, n.lng, n.rating, n.reviews_count;

-- Nurse availability summary for scheduling
CREATE VIEW nurse_availability_summary AS
SELECT 
    na.nurse_id,
    n.name,
    n.city,
    array_agg(
        CASE 
            WHEN na.availability_type = 'specific' 
            THEN json_build_object(
                'date', na.available_date,
                'start_time', na.start_time,
                'end_time', na.end_time,
                'available', na.is_available
            )
            ELSE json_build_object(
                'day_of_week', na.day_of_week,
                'start_time', na.recurring_start_time,
                'end_time', na.recurring_end_time,
                'available', na.is_available
            )
        END
    ) as availability_slots
FROM nurse_availability na
JOIN nurses n ON na.nurse_id = n.id
WHERE n.is_active = true AND n.is_approved = true
GROUP BY na.nurse_id, n.name, n.city;

-- Database statistics and health monitoring
CREATE VIEW db_health_stats AS
SELECT 
    'nurses' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true AND is_approved = true) as active_records,
    AVG(rating) as avg_rating,
    NOW() as last_updated
FROM nurses
UNION ALL
SELECT 
    'nurse_services',
    COUNT(*),
    COUNT(*) FILTER (WHERE is_primary = true),
    NULL,
    NOW()
FROM nurse_services
UNION ALL
SELECT 
    'nurse_availability',
    COUNT(*),
    COUNT(*) FILTER (WHERE is_available = true AND available_date >= CURRENT_DATE),
    NULL,
    NOW()
FROM nurse_availability;

-- Grant appropriate permissions for application user
-- These will be applied during deployment with the actual application user

-- Example permissions (to be customized during deployment):
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO wonder_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO wonder_app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO wonder_readonly_user;

-- Comments for documentation
COMMENT ON TABLE nurses IS 'Core nurse profiles with contact and rating information';
COMMENT ON TABLE nurse_services IS 'Services and specializations offered by each nurse';
COMMENT ON TABLE nurse_expertise IS 'Detailed expertise tags and skill levels';
COMMENT ON TABLE nurse_availability IS 'Real-time availability scheduling for nurses';
COMMENT ON TABLE nurse_locations IS 'Geographic service areas for each nurse';
COMMENT ON TABLE audit_log IS 'Audit trail for all data modifications';

COMMENT ON VIEW active_nurses_summary IS 'Optimized view for engine queries - active nurses with aggregated services and locations';
COMMENT ON VIEW nurse_availability_summary IS 'Availability data formatted for scheduling queries';
COMMENT ON VIEW db_health_stats IS 'Database health and statistics for monitoring dashboards';