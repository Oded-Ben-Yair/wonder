import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Award,
  MapPin,
  Star,
  Clock,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import { ScoreBreakdown } from '@/types';
import { he } from '@/i18n/he';

interface AIMatchInsightsProps {
  scoreBreakdown?: ScoreBreakdown;
  totalScore: number;
  nurseName: string;
  className?: string;
}

const AIMatchInsights: React.FC<AIMatchInsightsProps> = ({
  scoreBreakdown,
  totalScore,
  nurseName,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!scoreBreakdown) return null;

  const matchPercent = Math.round(totalScore * 100);
  const matchQuality = matchPercent >= 85 ? he.insights.matchQuality.excellent :
                       matchPercent >= 70 ? he.insights.matchQuality.great :
                       he.insights.matchQuality.good;
  const matchQualityColor = matchPercent >= 85 ? 'text-green-700 bg-green-50' :
                           matchPercent >= 70 ? 'text-yellow-700 bg-yellow-50' :
                           'text-orange-700 bg-orange-50';
  const matchQualityIcon = matchPercent >= 85 ? '🟢' : matchPercent >= 70 ? '🟡' : '🟠';

  // Helper function to get user-friendly explanations
  const getFactorExplanation = (factorName: string, score: number): string => {
    switch (factorName) {
      case 'serviceMatch':
        if (score >= 0.8) return he.insights.serviceMatch.high.replace('{name}', nurseName);
        if (score >= 0.5) return he.insights.serviceMatch.medium.replace('{name}', nurseName);
        return he.insights.serviceMatch.low.replace('{name}', nurseName);

      case 'location':
        if (score >= 0.9) return he.insights.location.high.replace('{name}', nurseName);
        if (score >= 0.7) return he.insights.location.medium.replace('{name}', nurseName);
        return he.insights.location.low.replace('{name}', nurseName);

      case 'rating':
        if (score >= 0.9) return he.insights.rating.high.replace('{name}', nurseName);
        if (score >= 0.7) return he.insights.rating.medium.replace('{name}', nurseName);
        return he.insights.rating.low.replace('{name}', nurseName);

      case 'availability':
        if (score >= 0.9) return he.insights.availability.high.replace('{name}', nurseName);
        if (score >= 0.6) return he.insights.availability.medium.replace('{name}', nurseName);
        return he.insights.availability.low.replace('{name}', nurseName);

      case 'experience':
        if (score >= 0.8) return he.insights.experience.high.replace('{name}', nurseName);
        if (score >= 0.5) return he.insights.experience.medium.replace('{name}', nurseName);
        return he.insights.experience.low.replace('{name}', nurseName);

      default:
        return scoreBreakdown[factorName as keyof ScoreBreakdown]?.explanation || 'No explanation available';
    }
  };

  const factors = [
    {
      key: 'serviceMatch',
      label: he.insights.factorLabels.serviceMatch,
      icon: Award,
      color: 'bg-blue-500',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
      data: scoreBreakdown.serviceMatch
    },
    {
      key: 'location',
      label: he.insights.factorLabels.location,
      icon: MapPin,
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      data: scoreBreakdown.location
    },
    {
      key: 'rating',
      label: he.insights.factorLabels.rating,
      icon: Star,
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-200',
      bgColor: 'bg-yellow-50',
      data: scoreBreakdown.rating
    },
    {
      key: 'availability',
      label: he.insights.factorLabels.availability,
      icon: Clock,
      color: 'bg-purple-500',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50',
      data: scoreBreakdown.availability
    },
    {
      key: 'experience',
      label: he.insights.factorLabels.experience,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      borderColor: 'border-indigo-200',
      bgColor: 'bg-indigo-50',
      data: scoreBreakdown.experience
    }
  ];

  return (
    <div className={`mt-3 ${className}`}>
      {/* Collapsed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200 ${matchQualityColor} hover:shadow-md`}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Hide' : 'Show'} match explanation for ${nurseName}`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">
            {he.insights.whyMatch.replace('{quality}', matchQuality)} {matchQualityIcon}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Overall Score Card */}
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Overall Compatibility</h4>
                  <p className="text-xs text-gray-600">Based on AI analysis of 5 factors</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{matchPercent}%</div>
                <div className="text-xs text-gray-500">{matchQuality} Match</div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  matchPercent >= 85 ? 'bg-green-500' :
                  matchPercent >= 70 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${matchPercent}%` }}
              />
            </div>
          </div>

          {/* Individual Factors */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Match Breakdown
            </h5>

            {factors.map((factor) => {
              const IconComponent = factor.icon;
              const factorPercent = Math.round(factor.data.score * 100);
              const weightPercent = Math.round(factor.data.weight * 100);
              const contributionPoints = (factor.data.weighted * 100).toFixed(1);

              return (
                <div
                  key={factor.key}
                  className={`p-3 rounded-lg border ${factor.borderColor} ${factor.bgColor}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <div className={`${factor.color} p-1.5 rounded text-white mt-0.5`}>
                        <IconComponent className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {factor.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({weightPercent}% weight)
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">
                          {getFactorExplanation(factor.key, factor.data.score)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-semibold text-gray-900">
                        {contributionPoints}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>

                  {/* Factor Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full h-2 border border-gray-200">
                      <div
                        className={`${factor.color} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${factorPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 min-w-[35px] text-right">
                      {factorPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
              <p>
                <strong className="text-gray-900">AI Transparency:</strong> This scoring system helps you understand
                why {nurseName} was matched to your request. Each factor is weighted based on what typically matters
                most in nurse selection. All scores are calculated objectively from verified data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMatchInsights;
