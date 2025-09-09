import axios from 'axios';
import { MatchResponse, EnginesResponse, StructuredQuery, Engine } from '@/types';

// Configure axios defaults
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

/**
 * Get available engines
 */
export async function getEngines(): Promise<Engine[]> {
  try {
    const response = await api.get<EnginesResponse>('/engines');
    return response.data.engines;
  } catch (error) {
    console.error('Failed to fetch engines:', error);
    throw error;
  }
}

/**
 * Execute a match query
 */
export async function executeMatch(
  query: StructuredQuery,
  engine?: string
): Promise<MatchResponse> {
  try {
    const url = engine ? `/match?engine=${encodeURIComponent(engine)}` : '/match';
    const response = await api.post<MatchResponse>(url, query);
    return response.data;
  } catch (error) {
    console.error('Failed to execute match:', error);
    throw error;
  }
}

/**
 * Execute match with specific parameters (legacy support)
 */
export async function executeMatchLegacy(params: {
  city: string;
  servicesQuery?: string[];
  expertiseQuery?: string[];
  urgent?: boolean;
  topK?: number;
  engine?: string;
}): Promise<MatchResponse> {
  try {
    const url = params.engine ? `/match?engine=${encodeURIComponent(params.engine)}` : '/match';
    const response = await api.post<MatchResponse>(url, params);
    return response.data;
  } catch (error) {
    console.error('Failed to execute legacy match:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<{ status: string; timestamp: number }> {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}

/**
 * Get engine statistics
 */
export async function getEngineStats(engine?: string): Promise<any> {
  try {
    const url = engine ? `/stats?engine=${encodeURIComponent(engine)}` : '/stats';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch engine stats:', error);
    throw error;
  }
}

/**
 * Compare multiple engines
 */
export async function compareEngines(
  query: StructuredQuery,
  engines: string[]
): Promise<{ engine: string; result: MatchResponse; error?: string }[]> {
  const results = await Promise.allSettled(
    engines.map(async (engine) => {
      try {
        const result = await executeMatch(query, engine);
        return { engine, result };
      } catch (error) {
        return { 
          engine, 
          result: {} as MatchResponse, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        engine: engines[index],
        result: {} as MatchResponse,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Batch execute queries
 */
export async function batchExecute(
  queries: { query: StructuredQuery; engine?: string; id: string }[]
): Promise<{ id: string; result?: MatchResponse; error?: string }[]> {
  const results = await Promise.allSettled(
    queries.map(async ({ query, engine, id }) => {
      try {
        const result = await executeMatch(query, engine);
        return { id, result };
      } catch (error) {
        return { 
          id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        id: queries[index].id,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

// Error handling helper
export function isApiError(error: any): error is { message: string; code?: string } {
  return error && typeof error.message === 'string';
}

// Retry helper
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
}

export default api;