import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  Clock, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  Engine, 
  StructuredQuery, 
  MatchResponse, 
  LoadingState 
} from '@/types';
import { getEngines, executeMatch, compareEngines } from '@/utils/api';
import NurseResults from '../chatbot/NurseResults';

interface EngineTestResult {
  engine: string;
  response?: MatchResponse;
  error?: string;
  duration: number;
}

const EngineTester: React.FC = () => {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [query, setQuery] = useState<StructuredQuery>({
    municipality: 'Tel Aviv-Yafo',
    topK: 5
  });
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [testResults, setTestResults] = useState<EngineTestResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Load engines on mount
  useEffect(() => {
    loadEngines();
  }, []);

  const loadEngines = async () => {
    try {
      setLoadingState('loading');
      const engineList = await getEngines();
      setEngines(engineList);
      
      // Select first healthy engine by default
      const healthyEngine = engineList.find(e => e.healthy);
      if (healthyEngine) {
        setSelectedEngine(healthyEngine.name);
      }
      setLoadingState('success');
    } catch (error) {
      console.error('Failed to load engines:', error);
      setLoadingState('error');
    }
  };

  const handleExecuteTest = async () => {
    if (!selectedEngine) {
      alert('Please select an engine first');
      return;
    }

    setLoadingState('loading');
    setTestResults([]);

    try {
      const startTime = Date.now();
      const response = await executeMatch(query, selectedEngine);
      const duration = Date.now() - startTime;

      const result: EngineTestResult = {
        engine: selectedEngine,
        response,
        duration: response.latency_ms || duration
      };

      setTestResults([result]);
      setLoadingState('success');
    } catch (error) {
      const result: EngineTestResult = {
        engine: selectedEngine,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      };

      setTestResults([result]);
      setLoadingState('error');
    }
  };

  const handleCompareEngines = async () => {
    const healthyEngines = engines.filter(e => e.healthy).map(e => e.name);
    
    if (healthyEngines.length < 2) {
      alert('Need at least 2 healthy engines for comparison');
      return;
    }

    setLoadingState('loading');
    setTestResults([]);
    setIsComparing(true);

    try {
      const startTime = Date.now();
      const comparisons = await compareEngines(query, healthyEngines.slice(0, 3)); // Limit to 3 for performance
      
      const results: EngineTestResult[] = comparisons.map(comp => ({
        engine: comp.engine,
        response: comp.error ? undefined : comp.result,
        error: comp.error,
        duration: comp.result?.latency_ms || (Date.now() - startTime)
      }));

      setTestResults(results);
      setLoadingState('success');
    } catch (error) {
      setLoadingState('error');
    } finally {
      setIsComparing(false);
    }
  };

  const updateQueryField = (field: keyof StructuredQuery, value: any) => {
    setQuery(prev => ({ ...prev, [field]: value }));
  };

  const getEngineStatus = (engine: Engine) => {
    if (engine.healthy) {
      return { icon: CheckCircle, color: 'text-green-500', text: 'Healthy' };
    } else {
      return { icon: AlertCircle, color: 'text-red-500', text: 'Offline' };
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Engine Tester</h1>
        <p className="text-gray-600">Test and compare matching engines with structured queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Configuration</h2>
            </div>

            {/* Engine Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engine
                </label>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                  className="input-field"
                  disabled={loadingState === 'loading'}
                >
                  <option value="">Select Engine</option>
                  {engines.map((engine) => {
                    const status = getEngineStatus(engine);
                    return (
                      <option 
                        key={engine.name} 
                        value={engine.name}
                        disabled={!engine.healthy}
                      >
                        {engine.name} ({status.text})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Query Parameters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Municipality
                </label>
                <input
                  type="text"
                  value={query.municipality || ''}
                  onChange={(e) => updateQueryField('municipality', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Tel Aviv-Yafo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specializations (comma-separated)
                </label>
                <input
                  type="text"
                  value={query.specialization?.join(', ') || ''}
                  onChange={(e) => updateQueryField('specialization', 
                    e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  )}
                  className="input-field"
                  placeholder="e.g., WOUND_CARE, PEDIATRIC_CARE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Results
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={query.topK || 5}
                  onChange={(e) => updateQueryField('topK', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={query.urgent || false}
                  onChange={(e) => updateQueryField('urgent', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="urgent" className="text-sm text-gray-700">
                  Urgent request
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={query.available || false}
                  onChange={(e) => updateQueryField('available', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="available" className="text-sm text-gray-700">
                  Available only
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleExecuteTest}
                disabled={!selectedEngine || loadingState === 'loading'}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {loadingState === 'loading' && !isComparing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute Test
              </button>

              <button
                onClick={handleCompareEngines}
                disabled={engines.filter(e => e.healthy).length < 2 || loadingState === 'loading'}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                {isComparing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                Compare Engines
              </button>

              <button
                onClick={loadEngines}
                disabled={loadingState === 'loading'}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Engines
              </button>
            </div>
          </div>

          {/* Engine Status */}
          <div className="card p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Engine Status</h3>
            </div>
            <div className="space-y-2">
              {engines.map((engine) => {
                const status = getEngineStatus(engine);
                const StatusIcon = status.icon;
                
                return (
                  <div key={engine.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className="text-sm font-medium">{engine.name}</span>
                    </div>
                    <span className={`text-xs ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>

            {loadingState === 'idle' && testResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Configure your test parameters and click "Execute Test" to begin</p>
              </div>
            )}

            {loadingState === 'loading' && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary-600 animate-spin" />
                <p className="text-gray-600">
                  {isComparing ? 'Running engine comparison...' : 'Executing test...'}
                </p>
              </div>
            )}

            {testResults.length > 0 && (
              <div className="space-y-6">
                {testResults.map((result, index) => (
                  <div key={`${result.engine}-${index}`} className="border rounded-lg">
                    {/* Result Header */}
                    <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{result.engine}</h3>
                        {result.error ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Error
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Success
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(result.duration)}</span>
                        </div>
                        {result.response?.results && (
                          <div className="flex items-center gap-1">
                            <Database className="w-4 h-4" />
                            <span>{result.response.results.length} results</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result Content */}
                    <div className="p-4">
                      {result.error ? (
                        <div className="text-red-600 bg-red-50 p-3 rounded-lg">
                          <strong>Error:</strong> {result.error}
                        </div>
                      ) : result.response ? (
                        <NurseResults
                          results={result.response.nurses || result.response.results || []}
                          query={query}
                          engine={result.engine}
                          latency={result.duration}
                        />
                      ) : (
                        <div className="text-gray-500">No response data</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Comparison Summary */}
                {testResults.length > 1 && (
                  <div className="card p-4 bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">Comparison Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Fastest Engine</p>
                        <p className="text-blue-900">
                          {testResults
                            .filter(r => !r.error)
                            .sort((a, b) => a.duration - b.duration)[0]?.engine || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Most Results</p>
                        <p className="text-blue-900">
                          {testResults
                            .filter(r => r.response?.nurses || r.response?.results)
                            .sort((a, b) => ((b.response?.nurses || b.response?.results)?.length || 0) - ((a.response?.nurses || a.response?.results)?.length || 0))[0]?.engine || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Success Rate</p>
                        <p className="text-blue-900">
                          {Math.round((testResults.filter(r => !r.error).length / testResults.length) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineTester;