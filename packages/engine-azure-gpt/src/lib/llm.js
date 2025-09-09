import { azureRespond } from "../clients/azure.js";

const {
  AZURE_OPENAI_URI,
  AZURE_OPENAI_KEY,
  AZURE_OPENAI_RESOURCE_HOST,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION
} = process.env;

function isLiveAzureEnabled() {
  // Live if we have either a full URI+KEY, or host+deployment+version+key
  const hasFull = AZURE_OPENAI_URI && AZURE_OPENAI_KEY;
  const hasParts = AZURE_OPENAI_RESOURCE_HOST && AZURE_OPENAI_DEPLOYMENT && AZURE_OPENAI_API_VERSION && AZURE_OPENAI_KEY;
  return Boolean(hasFull || hasParts);
}

function resolvedAzureUri() {
  if (AZURE_OPENAI_URI) return AZURE_OPENAI_URI;
  if (AZURE_OPENAI_RESOURCE_HOST) {
    // Use new v1 API endpoint (no api-version query parameter needed)
    return `${AZURE_OPENAI_RESOURCE_HOST}/openai/v1/responses`;
  }
  return null;
}

// Helper: Mask sensitive data for logging
function maskSensitive(str) {
  if (!str) return '';
  if (str.length > 500) return str.substring(0, 500) + '...[truncated]';
  return str;
}

function buildPrompt(query, candidates){
  // Keep message compact; send only essential fields
  const q = {
    city: query.city ?? null,
    servicesQuery: query.servicesQuery ?? (query.service ? [query.service] : []),
    expertiseQuery: query.expertiseQuery ?? [],
    timeWindow: query.start && query.end ? { start: query.start, end: query.end } : null,
    location: (query.lat!=null && query.lng!=null) ? { lat: query.lat, lng: query.lng } : null,
    urgent: !!query.urgent
  };
  const c = candidates.map(n => ({
    id: n.id, name: n.name, city: n.city,
    rating: n.rating, reviewsCount: n.reviewsCount,
    services: n.services, expertiseTags: n.expertiseTags,
    lat: n.lat, lng: n.lng, availability: n.availability
  }));
  return { q, c };
}

// Mock response for when Azure credentials are not configured
function getMockResponse(allNurses, topK = 5) {
  const mockResults = allNurses.slice(0, topK).map((nurse, idx) => ({
    id: nurse.id,
    name: nurse.name,
    score: (1.0 - idx * 0.15), // Decreasing scores
    reason: `Mock match: ${nurse.services[0] || 'General care'} expertise, ${nurse.city} location`
  }));
  
  return mockResults;
}

export async function llmMatch(query, allNurses){
  // Check for Azure credentials
  if (!isLiveAzureEnabled()) {
    console.log('Azure credentials not configured. Using mock mode for local development.');
    console.log('Set AZURE_OPENAI_URI, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT for live matching.');
    return getMockResponse(allNurses, query.topK || 5);
  }
  
  // Limit candidates to reduce token usage for Azure API - optimized for speed
  const maxCandidates = Math.min(5, allNurses.length);
  const limitedNurses = allNurses.slice(0, maxCandidates);
  
  const uri = resolvedAzureUri();
  const uriHost = new URL(uri).hostname;
  console.log(`Calling Azure OpenAI at ${uriHost} (deployment: ${AZURE_OPENAI_DEPLOYMENT || 'auto'})`);
  
  const payload = buildPrompt(query, limitedNurses);
  console.log(`Processing ${limitedNurses.length} candidates (limited from ${allNurses.length})`);

  // Build input for Azure Responses API v1 - optimized for speed
  const systemPrompt = 'You are a healthcare matching engine. Rank nurse candidates by: service match, location, rating, availability. Respond with JSON only: {"results": [{"id": "string", "score": 0.95, "reason": "brief explanation"}]}';
  
  const userPrompt = `Query: ${JSON.stringify(payload.q)}\nCandidates: ${JSON.stringify(payload.c)}\n\nReturn top ${query.topK || 3} matches as JSON.`;
  
  // Build messages for Azure Chat Completions API
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Log truncated request for debugging
  console.log('Request payload:', maskSensitive(JSON.stringify(messages)));
  
  // Make API call with new robust client
  // GPT-5 specific: use minimal reasoning_effort and reduced max_tokens for faster responses
  const result = await azureRespond({
    uri,
    apiKey: AZURE_OPENAI_KEY,
    messages,
    max_tokens: 1000, // Reduced from 4000 for faster response
    reasoning_effort: 'minimal',
    temperature: 0.1 // Lower temperature for more consistent, faster responses
  });
  
  if (!result.ok) {
    console.error(`Azure OpenAI error:`, result.error);
    throw new Error(`Azure OpenAI error: ${result.error}`);
  }
  
  console.log('Response received:', maskSensitive(result.text));
  
  let parsed;
  try { 
    parsed = typeof result.text === 'string' ? JSON.parse(result.text) : result.text;
  } catch(e) { 
    console.error('Failed to parse JSON:', maskSensitive(result.text));
    throw new Error('LLM did not return valid JSON: ' + maskSensitive(result.text)); 
  }
  
  try {
    const results = (parsed.results || []).sort((a,b)=> (b.score??0)-(a.score??0));
    
    console.log(`Azure returned ${results.length} results`);
    console.log(`Sample result IDs:`, results.slice(0,3).map(r => r.id));
    
    // Attach names for convenience (use full list for name lookup)
    const byId = Object.fromEntries(allNurses.map(n=>[n.id,n]));
    console.log(`Nurse lookup has ${Object.keys(byId).length} entries`);
    console.log(`Sample nurse IDs:`, Object.keys(byId).slice(0,3));
    
    const enhancedResults = results.map(r => {
      const nurse = byId[r.id];
      console.log(`Looking up ID ${r.id}: ${nurse ? 'FOUND' : 'NOT FOUND'}`);
      return {
        id: r.id,
        name: nurse?.name || r.id,
        score: r.score,
        reason: r.reason
      };
    });
    
    console.log(`Returning ${enhancedResults.length} results from ${allNurses.length} total nurses`);
    
    // Return in format expected by gateway
    return {
      results: enhancedResults,
      count: enhancedResults.length
    };
  } catch (processingError) {
    console.error('Error processing results:', processingError.message);
    console.error('Stack:', processingError.stack);
    throw processingError;
  }
}