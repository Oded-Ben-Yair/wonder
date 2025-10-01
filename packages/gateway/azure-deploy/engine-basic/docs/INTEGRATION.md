# Integration Guide

This guide outlines how to integrate the Basic Filter service with external data sources for production use.

## Current Architecture

By default, the service uses a local JSON file (`sample_data/nurses.json`) as its data source. The system is designed to support multiple data backends through the adapter pattern in `src/db.js`.

## Supported Data Sources

### 1. PostgreSQL
- Set `USE_DB=true` and `DB_KIND=postgres` in `.env`
- Configure `DATABASE_URL` with connection string
- See `docs/DB_SETUP.md` for schema details

### 2. MongoDB
- Set `USE_DB=true` and `DB_KIND=mongo` in `.env`
- Configure `MONGODB_URI`, `MONGODB_DB`, and `MONGODB_COLLECTION`
- See `docs/DB_SETUP.md` for collection structure

### 3. JSON File (Default)
- Set `USE_DB=false` or leave unset
- Loads from `sample_data/nurses.json`
- Zero external dependencies

## Future Integration Options

### S3/Cloud Storage CSV
To add S3 CSV support:
1. Create new adapter in `src/db.js`
2. Add AWS SDK dependency
3. Implement CSV parsing and caching strategy
4. Environment variables needed:
   - `AWS_REGION`
   - `S3_BUCKET`
   - `S3_KEY`
   - `CSV_CACHE_TTL`

### REST API Backend
To integrate with external API:
1. Add HTTP client (axios/fetch)
2. Implement retry logic and circuit breaker
3. Cache responses for performance
4. Environment variables:
   - `API_BASE_URL`
   - `API_KEY`
   - `API_TIMEOUT`

## Adding New Data Sources

1. **Implement Adapter**: Add new case in `src/db.js` `loadNurses()` function
2. **Environment Config**: Define required environment variables
3. **Error Handling**: Ensure graceful fallback to JSON on failure
4. **Testing**: Add integration tests for new data source
5. **Documentation**: Update this guide with setup instructions

## Performance Considerations

- Implement caching for external data sources
- Use connection pooling for databases
- Add indexes on frequently queried fields (city, services)
- Consider read replicas for high-traffic scenarios

## Monitoring

Recommended metrics to track:
- Data source response times
- Cache hit/miss ratios
- Fallback activation frequency
- Connection pool utilization

## Security

- Never commit credentials to repository
- Use environment variables or secrets management
- Implement rate limiting for external APIs
- Validate and sanitize all external data