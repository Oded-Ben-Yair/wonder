-- Wonder Healthcare Platform: Business Analytics SQL Queries
-- CEO Dashboard and KPI Tracking Queries

-- =====================================================
-- 1. CUSTOMER ACQUISITION METRICS
-- =====================================================

-- Monthly New Customer Acquisition
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS new_customers,
    COUNT(*) * 100.0 / LAG(COUNT(*), 1) OVER (ORDER BY DATE_TRUNC('month', created_at)) - 100 AS growth_rate_pct
FROM customers
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Customer Acquisition Cost (CAC) Analysis
WITH marketing_spend AS (
    SELECT
        DATE_TRUNC('month', spend_date) AS month,
        SUM(amount) AS total_marketing_spend
    FROM marketing_expenses
    GROUP BY DATE_TRUNC('month', spend_date)
),
new_customers AS (
    SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS customers_acquired
    FROM customers
    GROUP BY DATE_TRUNC('month', created_at)
)
SELECT
    nc.month,
    nc.customers_acquired,
    COALESCE(ms.total_marketing_spend, 0) AS marketing_spend,
    CASE
        WHEN nc.customers_acquired > 0
        THEN COALESCE(ms.total_marketing_spend, 0) / nc.customers_acquired
        ELSE 0
    END AS cac_per_customer
FROM new_customers nc
LEFT JOIN marketing_spend ms ON nc.month = ms.month
ORDER BY nc.month DESC;

-- =====================================================
-- 2. REVENUE METRICS
-- =====================================================

-- Monthly Recurring Revenue (MRR) Tracking
SELECT
    DATE_TRUNC('month', billing_date) AS month,
    COUNT(DISTINCT customer_id) AS paying_customers,
    SUM(amount) AS monthly_revenue,
    AVG(amount) AS average_revenue_per_customer
FROM subscriptions s
JOIN payments p ON s.subscription_id = p.subscription_id
WHERE p.status = 'completed'
    AND billing_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', billing_date)
ORDER BY month;

-- Customer Lifetime Value (LTV) Analysis
WITH customer_metrics AS (
    SELECT
        customer_id,
        MIN(created_at) AS first_payment,
        MAX(created_at) AS last_payment,
        COUNT(*) AS total_payments,
        SUM(amount) AS total_revenue,
        AVG(amount) AS avg_payment,
        EXTRACT(DAYS FROM MAX(created_at) - MIN(created_at)) AS customer_lifespan_days
    FROM payments
    WHERE status = 'completed'
    GROUP BY customer_id
    HAVING COUNT(*) > 1  -- Exclude one-time customers
)
SELECT
    AVG(total_revenue) AS avg_ltv,
    AVG(customer_lifespan_days) AS avg_lifespan_days,
    AVG(total_payments) AS avg_total_payments,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue) AS median_ltv,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_revenue) AS ltv_75th_percentile,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_revenue) AS ltv_95th_percentile
FROM customer_metrics;

-- =====================================================
-- 3. PLATFORM USAGE METRICS
-- =====================================================

-- Daily/Monthly Active Users
SELECT
    DATE_TRUNC('day', activity_date) AS date,
    COUNT(DISTINCT user_id) AS daily_active_users
FROM user_activities
WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', activity_date)
ORDER BY date;

-- Nurse Matching Success Rates
SELECT
    DATE_TRUNC('week', match_date) AS week,
    COUNT(*) AS total_matches_attempted,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) AS successful_matches,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) * 100.0 / COUNT(*) AS success_rate_pct,
    AVG(response_time_ms) AS avg_response_time_ms,
    engine_used,
    COUNT(*) AS engine_usage_count
FROM nurse_matches
WHERE match_date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', match_date), engine_used
ORDER BY week DESC, engine_usage_count DESC;

-- Geographic Performance Analysis
SELECT
    city,
    COUNT(*) AS total_matches,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) AS successful_matches,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) * 100.0 / COUNT(*) AS success_rate_pct,
    AVG(response_time_ms) AS avg_response_time,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM nurse_matches
WHERE match_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY city
HAVING COUNT(*) >= 10  -- Only cities with significant activity
ORDER BY success_rate_pct DESC, total_matches DESC;

-- =====================================================
-- 4. CHURN ANALYSIS
-- =====================================================

-- Monthly Churn Rate
WITH monthly_customers AS (
    SELECT
        DATE_TRUNC('month', date) AS month,
        customer_id
    FROM (
        SELECT DISTINCT customer_id, created_at::date AS date FROM payments
        UNION ALL
        SELECT DISTINCT customer_id, activity_date AS date FROM user_activities
    ) all_activity
),
customer_months AS (
    SELECT
        month,
        customer_id,
        LAG(month, 1) OVER (PARTITION BY customer_id ORDER BY month) AS prev_month
    FROM monthly_customers
),
churn_analysis AS (
    SELECT
        month,
        COUNT(DISTINCT customer_id) AS active_customers,
        COUNT(DISTINCT CASE
            WHEN prev_month IS NULL OR prev_month < month - INTERVAL '1 month'
            THEN customer_id
        END) AS new_customers,
        LAG(COUNT(DISTINCT customer_id), 1) OVER (ORDER BY month) AS prev_month_customers
    FROM customer_months
    GROUP BY month
)
SELECT
    month,
    active_customers,
    new_customers,
    prev_month_customers,
    CASE
        WHEN prev_month_customers > 0
        THEN (prev_month_customers - (active_customers - new_customers)) * 100.0 / prev_month_customers
        ELSE 0
    END AS churn_rate_pct,
    (active_customers - new_customers) AS retained_customers
FROM churn_analysis
WHERE month >= CURRENT_DATE - INTERVAL '12 months'
ORDER BY month;

-- =====================================================
-- 5. OPERATIONAL EFFICIENCY METRICS
-- =====================================================

-- Engine Performance Comparison
SELECT
    engine_used,
    COUNT(*) AS total_queries,
    AVG(response_time_ms) AS avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) * 100.0 / COUNT(*) AS success_rate_pct,
    AVG(confidence_score) AS avg_confidence_score
FROM nurse_matches
WHERE match_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY engine_used
ORDER BY success_rate_pct DESC, avg_response_time ASC;

-- Peak Usage Analysis
SELECT
    EXTRACT(HOUR FROM match_timestamp) AS hour_of_day,
    EXTRACT(DOW FROM match_timestamp) AS day_of_week,
    COUNT(*) AS query_count,
    AVG(response_time_ms) AS avg_response_time,
    COUNT(CASE WHEN status = 'successful' THEN 1 END) * 100.0 / COUNT(*) AS success_rate_pct
FROM nurse_matches
WHERE match_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY EXTRACT(HOUR FROM match_timestamp), EXTRACT(DOW FROM match_timestamp)
ORDER BY query_count DESC;

-- =====================================================
-- 6. REVENUE FORECASTING QUERIES
-- =====================================================

-- Cohort Revenue Analysis
WITH customer_cohorts AS (
    SELECT
        customer_id,
        DATE_TRUNC('month', MIN(created_at)) AS cohort_month
    FROM payments
    WHERE status = 'completed'
    GROUP BY customer_id
),
cohort_revenue AS (
    SELECT
        c.cohort_month,
        DATE_TRUNC('month', p.created_at) AS revenue_month,
        COUNT(DISTINCT p.customer_id) AS customers,
        SUM(p.amount) AS revenue
    FROM customer_cohorts c
    JOIN payments p ON c.customer_id = p.customer_id
    WHERE p.status = 'completed'
    GROUP BY c.cohort_month, DATE_TRUNC('month', p.created_at)
)
SELECT
    cohort_month,
    revenue_month,
    customers,
    revenue,
    EXTRACT(MONTH FROM AGE(revenue_month, cohort_month)) AS months_since_first_payment,
    SUM(revenue) OVER (
        PARTITION BY cohort_month
        ORDER BY revenue_month
        ROWS UNBOUNDED PRECEDING
    ) AS cumulative_revenue
FROM cohort_revenue
ORDER BY cohort_month, revenue_month;

-- Predictive Revenue Model (Simple Linear Regression)
WITH monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', created_at) AS month,
        SUM(amount) AS revenue,
        ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('month', created_at)) AS month_number
    FROM payments
    WHERE status = 'completed'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
),
regression_stats AS (
    SELECT
        COUNT(*) AS n,
        SUM(month_number) AS sum_x,
        SUM(revenue) AS sum_y,
        SUM(month_number * revenue) AS sum_xy,
        SUM(month_number * month_number) AS sum_x2
    FROM monthly_revenue
)
SELECT
    month,
    revenue AS actual_revenue,
    -- Simple linear trend line: y = mx + b
    (rs.sum_xy * rs.n - rs.sum_x * rs.sum_y) / (rs.n * rs.sum_x2 - rs.sum_x * rs.sum_x) * month_number +
    (rs.sum_y - (rs.sum_xy * rs.n - rs.sum_x * rs.sum_y) / (rs.n * rs.sum_x2 - rs.sum_x * rs.sum_x) * rs.sum_x) / rs.n AS predicted_revenue,
    month_number
FROM monthly_revenue, regression_stats rs
ORDER BY month;

-- =====================================================
-- 7. COMPETITIVE INTELLIGENCE
-- =====================================================

-- Feature Usage and Adoption
SELECT
    feature_name,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(*) AS total_usage,
    AVG(session_duration_seconds) AS avg_session_duration,
    COUNT(*) * 1.0 / (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE activity_date >= CURRENT_DATE - INTERVAL '1 month') AS adoption_rate
FROM feature_usage
WHERE usage_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY feature_name
ORDER BY adoption_rate DESC;

-- =====================================================
-- 8. EXECUTIVE DASHBOARD SUMMARY
-- =====================================================

-- Key Metrics Summary for CEO Dashboard
SELECT
    'Total Active Customers' AS metric,
    COUNT(DISTINCT customer_id)::text AS value,
    'count' AS unit
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' AND status = 'completed'

UNION ALL

SELECT
    'Monthly Recurring Revenue' AS metric,
    TO_CHAR(SUM(amount), 'FM$999,999,999') AS value,
    'currency' AS unit
FROM payments
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND status = 'completed'

UNION ALL

SELECT
    'Average Match Success Rate' AS metric,
    ROUND(AVG(CASE WHEN status = 'successful' THEN 100.0 ELSE 0.0 END), 1)::text || '%' AS value,
    'percentage' AS unit
FROM nurse_matches
WHERE match_date >= CURRENT_DATE - INTERVAL '1 month'

UNION ALL

SELECT
    'Platform Uptime' AS metric,
    ROUND(AVG(CASE WHEN status = 'healthy' THEN 100.0 ELSE 0.0 END), 2)::text || '%' AS value,
    'percentage' AS unit
FROM system_health_checks
WHERE check_date >= CURRENT_DATE - INTERVAL '1 month'

UNION ALL

SELECT
    'Total Nurse Profiles' AS metric,
    COUNT(*)::text AS value,
    'count' AS unit
FROM nurses
WHERE status = 'active';

-- Note: These queries assume database tables exist.
-- In the current JSON-based system, these would need to be adapted
-- to work with the existing data structure or implemented when
-- transitioning to a proper database system.