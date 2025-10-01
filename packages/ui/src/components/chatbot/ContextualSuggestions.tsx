import React from 'react';
import { Sparkles } from 'lucide-react';
import { he } from '@/i18n/he';

interface ContextualSuggestionsProps {
  lastQuery: string;
  onSuggestionClick: (suggestion: string) => void;
}

const ContextualSuggestions: React.FC<ContextualSuggestionsProps> = ({
  lastQuery,
  onSuggestionClick
}) => {
  // Generate contextual suggestions based on last query
  const generateSuggestions = (query: string): string[] => {
    const lowerQuery = query.toLowerCase();

    // Check for wound care queries
    if (lowerQuery.includes('wound') || lowerQuery.includes('פצע')) {
      return [
        he.suggestions.woundCare.urgent,
        he.suggestions.woundCare.home,
        he.suggestions.woundCare.insurance,
        he.suggestions.woundCare.experience
      ];
    }

    // Check for medication queries
    if (lowerQuery.includes('medication') || lowerQuery.includes('תרופ')) {
      return [
        he.suggestions.medication.today,
        he.suggestions.medication.injections,
        he.suggestions.medication.evening,
        he.suggestions.medication.senior
      ];
    }

    // Check for urgent queries
    if (lowerQuery.includes('urgent') || lowerQuery.includes('דחוף')) {
      return [
        he.suggestions.urgent.oneHour,
        he.suggestions.urgent.home,
        he.suggestions.urgent.closest,
        he.suggestions.urgent.emergency
      ];
    }

    // Check for location-specific
    if (lowerQuery.includes('tel aviv') || lowerQuery.includes('תל אביב')) {
      return [
        he.suggestions.telAviv.nearby,
        he.suggestions.telAviv.weekends,
        he.suggestions.telAviv.english,
        he.suggestions.telAviv.topRated
      ];
    }

    // Default suggestions
    return [
      he.suggestions.default.urgentCare,
      he.suggestions.default.specificArea,
      he.suggestions.default.fiveStar,
      he.suggestions.default.availableToday
    ];
  };

  const suggestions = generateSuggestions(lastQuery);

  if (!lastQuery || suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-blue-50 border-t border-primary-100">
      <Sparkles className="w-4 h-4 text-primary-600 flex-shrink-0" />
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
          {he.suggestions.refine}
        </span>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="
              text-xs bg-white text-primary-700 px-3 py-1.5 rounded-full
              border border-primary-200 hover:border-primary-400
              hover:bg-primary-50 hover:shadow-sm
              transition-all duration-200 whitespace-nowrap
              font-medium
            "
            aria-label={`Refine search: ${suggestion}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContextualSuggestions;
