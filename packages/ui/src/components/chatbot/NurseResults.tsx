import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Star,
  User,
  Heart,
  Shield,
  Activity,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { EngineResult, StructuredQuery } from '@/types';
import NurseProfileDrawer from './NurseProfileDrawer';
import AIMatchInsights from './AIMatchInsights';
import { he } from '@/i18n/he';

interface NurseResultsProps {
  results: EngineResult[];
  query: StructuredQuery;
  engine: string;
  latency: number;
  className?: string;
  compact?: boolean;
  onBookAppointment?: (nurse: EngineResult) => void;
}

const NurseResults: React.FC<NurseResultsProps> = ({
  results,
  query,
  engine,
  latency,
  className = '',
  compact = false,
  onBookAppointment
}) => {
  const [selectedNurse, setSelectedNurse] = useState<EngineResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedNurseId, setExpandedNurseId] = useState<string | null>(null);

  const handleNurseClick = (nurse: EngineResult) => {
    setSelectedNurse(nurse);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Keep selectedNurse for animation, clear after transition
    setTimeout(() => setSelectedNurse(null), 300);
  };
  if (!results || results.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">
          <User className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">{he.results.noNursesFound}</p>
      </div>
    );
  }

  const formatScore = (result: EngineResult) => {
    const score = result.matchScore ?? result.score ?? 0;
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    const percentage = score * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatSpecialization = (spec: string) => {
    return he.services[spec as keyof typeof he.services] || spec;
  };

  const getSpecializationIcon = (spec: string) => {
    if (spec.includes('WOUND') || spec.includes('CARE')) return Heart;
    if (spec.includes('SECURITY')) return Shield;
    if (spec.includes('EMERGENCY')) return Activity;
    return User;
  };

  const toggleExpanded = (nurseId: string) => {
    setExpandedNurseId(expandedNurseId === nurseId ? null : nurseId);
  };

  if (compact) {

    return (
      <div className={`space-y-2 ${className}`}>
        {results.slice(0, 3).map((result) => {
          const isExpanded = expandedNurseId === result.id;
          const nurse = result.nurse;

          return (
            <div key={result.id} className="bg-white rounded-lg border border-gray-100">
              {/* Compact Card - Clickable */}
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all duration-200"
                onClick={() => toggleExpanded(result.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded(result.id);
                  }
                }}
                aria-expanded={isExpanded}
                aria-label={`View details for ${result.name || `Nurse ${result.id.slice(0, 8)}`}`}
              >
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
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(result.matchScore ?? result.score)}`}>
                    {formatScore(result)}%
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details - Complete Information */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Specializations - ALL shown */}
                  {nurse?.specialization && nurse.specialization.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">{he.results.specializations}</p>
                      <div className="flex flex-wrap gap-1">
                        {nurse.specialization.map((spec) => (
                          <span
                            key={spec}
                            className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium"
                          >
                            {formatSpecialization(spec)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location - ALL cities */}
                  {nurse?.municipality && nurse.municipality.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">{he.results.locations}</p>
                      <div className="flex flex-wrap gap-1">
                        {nurse.municipality.map((city) => (
                          <span key={city} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded font-medium">
                            <MapPin className="w-3 h-3" />
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating & Experience */}
                  <div className="grid grid-cols-2 gap-2">
                    {result.rating !== undefined && (
                      <div className="bg-amber-50 p-2 rounded">
                        <p className="text-xs text-gray-600 mb-0.5">דירוג</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-amber-700">{result.rating.toFixed(1)}/5.0</span>
                        </div>
                        {result.reviewsCount && (
                          <p className="text-xs text-gray-600 mt-0.5">{result.reviewsCount} ביקורות</p>
                        )}
                      </div>
                    )}
                    {nurse?.experienceYears !== undefined && (
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-xs text-gray-600 mb-0.5">ניסיון</p>
                        <p className="text-sm font-bold text-purple-700">{nurse.experienceYears} שנים</p>
                      </div>
                    )}
                  </div>

                  {/* Languages */}
                  {nurse?.languages && nurse.languages.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">שפות</p>
                      <div className="flex flex-wrap gap-1">
                        {nurse.languages.map((lang) => (
                          <span key={lang} className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded font-medium">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2 text-xs pt-1">
                    {nurse?.isActive && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded font-medium">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        {he.results.statusActive}
                      </span>
                    )}
                    {nurse?.isApproved && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                        <Shield className="w-3 h-3" />
                        {he.results.statusApproved}
                      </span>
                    )}
                  </div>

                  {/* AI Match Insights */}
                  {result.scoreBreakdown && (
                    <div className="pt-2 border-t border-gray-200">
                      <AIMatchInsights
                        scoreBreakdown={result.scoreBreakdown}
                        totalScore={result.matchScore || result.score || 0}
                        nurseName={result.name || `Nurse ${result.id.slice(0, 8)}`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {results.length > 3 && (
          <p className="text-xs text-gray-500 text-center">
            {he.results.moreResults.replace('{count}', (results.length - 3).toString())}
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
            {he.results.foundNurses
              .replace('{count}', results.length.toString())
              .replace('{plural}', results.length === 1 ? he.results.nurseSingular : he.results.nursePlural)}
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
            <span className="font-medium">{he.results.searchCriteria}</span>
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
              <span className="ml-2 text-red-600 font-medium">• {he.results.urgent}</span>
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
            <div
              key={result.id}
              className="nurse-card group cursor-pointer"
              onClick={() => handleNurseClick(result)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNurseClick(result);
                }
              }}
              aria-label={`View full profile for ${result.name || `Nurse ${result.id.slice(0, 8)}`}`}
            >
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
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(result.matchScore ?? result.score)}`}>
                          <Star className="w-3 h-3 inline mr-1" />
                          {formatScore(result)}%
                        </span>

                        {/* Confidence Badge */}
                        {result.matchScore && (
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            result.matchScore >= 0.9 ? 'bg-green-100 text-green-800' :
                            result.matchScore >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {result.matchScore >= 0.9 ? '🟢 התאמה מצוינת' :
                             result.matchScore >= 0.7 ? '🟡 התאמה טובה' :
                             '🟠 התאמה סבירה'}
                          </span>
                        )}

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
                          {he.results.statusActive}
                        </span>
                      )}
                      {nurse?.isApproved && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Shield className="w-3 h-3" />
                          {he.results.statusApproved}
                        </span>
                      )}
                      {nurse?.isOnboardingCompleted && (
                        <span className="text-gray-600">{he.results.statusOnboarded}</span>
                      )}
                    </div>

                    {/* Reason */}
                    {result.reason && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <span className="font-medium">{he.results.matchReason}</span> {result.reason}
                      </div>
                    )}

                    {/* AI Match Insights */}
                    {result.scoreBreakdown && (
                      <AIMatchInsights
                        scoreBreakdown={result.scoreBreakdown}
                        totalScore={result.matchScore || result.score || 0}
                        nurseName={result.name || `Nurse ${result.id.slice(0, 8)}`}
                      />
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
            {he.results.showingResults
              .replace('{count}', results.length.toString())
              .replace('{plural}', results.length === 1 ? he.results.resultSingular : he.results.resultPlural)}
          </span>
          <span>
            {he.results.avgScore} {Math.round(results.reduce((sum, r) => sum + (r.matchScore ?? r.score), 0) / results.length * 100)}%
          </span>
        </div>
      </div>

      {/* Profile Drawer */}
      <NurseProfileDrawer
        nurse={selectedNurse}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onBookAppointment={onBookAppointment}
      />
    </div>
  );
};

export default NurseResults;