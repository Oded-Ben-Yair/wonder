import { useState } from 'react';
import { executeMatch } from './utils/api';

function AppSimple() {
  const [city, setCity] = useState('Tel Aviv');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await executeMatch({
        municipality: city,
        limit: 5,
        specializations: [],
        isUrgent: false
      });
      setResults(response.nurses || []);
    } catch (err: any) {
      setError('Failed to fetch results. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wonder Healthcare Platform
          </h1>
          <p className="text-gray-600 mb-8">
            Find available nurses from QuickList database (371 active nurses)
          </p>

          <div className="flex gap-4 mb-8">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter city (e.g., Tel Aviv, Haifa)"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Nurses'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Found {results.length} nurses in {city}:
              </h2>
              {results.map((nurse: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{nurse.name}</p>
                      <p className="text-sm text-gray-600">
                        Services: {nurse.services?.join(', ') || 'General'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {nurse.city || city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Rating: {nurse.rating || 'N/A'} ⭐
                      </p>
                      <p className="text-sm text-gray-600">
                        Reviews: {nurse.reviewsCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              Enter a city and click search to find available nurses
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppSimple;