import React from 'react';
import { 
  MapPin, 
  Clock, 
  Star, 
  User, 
  Heart, 
  Shield, 
  Activity,
  ChevronRight 
} from 'lucide-react';
import { EngineResult, StructuredQuery } from '@/types';

interface NurseResultsProps {
  results: EngineResult[];
  query: StructuredQuery;
  engine: string;
  latency: number;
  className?: string;
  compact?: boolean;
}

const NurseResults: React.FC<NurseResultsProps> = ({
  results,
  query,
  engine,
  latency,
  className = '',
  compact = false
}) => {
  if (!results || results.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">
          <User className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">No nurses found matching your criteria</p>
      </div>
    );
  }

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    const percentage = score * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatSpecialization = (spec: string) => {
    return spec.toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSpecializationIcon = (spec: string) => {
    if (spec.includes('WOUND') || spec.includes('CARE')) return Heart;
    if (spec.includes('SECURITY')) return Shield;
    if (spec.includes('EMERGENCY')) return Activity;
    return User;
  };

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {results.slice(0, 3).map((result) => (
          <div key={result.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {result.name || `Nurse ${result.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-gray-500">ID: {result.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(result.score)}`}>
                {formatScore(result.score)}%
              </span>
            </div>
          </div>
        ))}
        {results.length > 3 && (
          <p className="text-xs text-gray-500 text-center">
            +{results.length - 3} more results available
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Results Header */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Found {results.length} nurse{results.length === 1 ? '' : 's'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{latency}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              <span>{engine}</span>
            </div>
          </div>
        </div>
        
        {/* Query Summary */}
        {query && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Search criteria:</span>
            {query.municipality && (
              <span className="ml-2 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {query.municipality}
              </span>
            )}
            {query.specialization && query.specialization.length > 0 && (
              <span className="ml-2">
                • {query.specialization.map(s => formatSpecialization(s)).join(', ')}
              </span>
            )}
            {query.urgent && (
              <span className="ml-2 text-red-600 font-medium">• URGENT</span>
            )}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result) => {
          const nurse = result.nurse;
          const IconComponent = nurse?.specialization?.length 
            ? getSpecializationIcon(nurse.specialization[0])
            : User;

          return (
            <div key={result.id} className="nurse-card group">
              <div className="flex items-start justify-between">
                {/* Nurse Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          {result.name || `Nurse ${result.id.slice(0, 8)}`}
                        </h4>
                        <p className="text-sm text-gray-500">ID: {result.id.slice(0, 8)}...</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(result.score)}`}>
                          <Star className="w-3 h-3 inline mr-1" />
                          {formatScore(result.score)}%
                        </span>
                        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Specializations */}
                    {nurse?.specialization && nurse.specialization.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {nurse.specialization.slice(0, 3).map((spec) => (
                            <span 
                              key={spec}
                              className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                            >
                              {formatSpecialization(spec)}
                            </span>
                          ))}
                          {nurse.specialization.length > 3 && (
                            <span className="inline-block px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                              +{nurse.specialization.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {nurse?.municipality && nurse.municipality.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span>{nurse.municipality.slice(0, 2).join(', ')}</span>
                        {nurse.municipality.length > 2 && (
                          <span className="text-gray-400">+{nurse.municipality.length - 2} areas</span>
                        )}
                      </div>
                    )}

                    {/* Status Indicators */}
                    <div className="flex items-center gap-3 text-xs">
                      {nurse?.isActive && (
                        <span className="flex items-center gap-1 text-green-600">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Active
                        </span>
                      )}
                      {nurse?.isApproved && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Shield className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {nurse?.isOnboardingCompleted && (
                        <span className="text-gray-600">Onboarded</span>
                      )}
                    </div>

                    {/* Reason */}
                    {result.reason && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <span className="font-medium">Match reason:</span> {result.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          <span>
            Avg. score: {Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default NurseResults;