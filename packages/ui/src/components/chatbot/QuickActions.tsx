import React from 'react';
import { Calendar, Star, MapPin, Zap } from 'lucide-react';
import { he } from '@/i18n/he';

interface QuickActionsProps {
  onAction: (actionQuery: string) => void;
  hasResults?: boolean;
  lastQuery?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onAction,
  lastQuery = ''
}) => {
  const actions = [
    {
      icon: Calendar,
      label: he.quickActions.bookTopMatch,
      color: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
      textColor: 'text-white',
      query: he.quickActions.queries.bookTopMatch,
      ariaLabel: 'Book appointment with best match'
    },
    {
      icon: Star,
      label: he.quickActions.fiveStarOnly,
      color: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
      textColor: 'text-white',
      query: lastQuery ? he.quickActions.queries.fiveStarOnly.replace('{query}', lastQuery) : he.quickActions.queries.fiveStarDefault,
      ariaLabel: 'Filter for 5-star rated nurses only'
    },
    {
      icon: MapPin,
      label: he.quickActions.expandArea,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      textColor: 'text-white',
      query: lastQuery ? he.quickActions.queries.expandArea.replace('{query}', lastQuery) : he.quickActions.queries.expandDefault,
      ariaLabel: 'Expand search to nearby areas'
    },
    {
      icon: Zap,
      label: he.quickActions.urgentAvailable,
      color: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      textColor: 'text-white',
      query: lastQuery ? he.quickActions.queries.urgentNow.replace('{query}', lastQuery) : he.quickActions.queries.urgentDefault,
      ariaLabel: 'Find urgently available nurses'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{he.quickActions.title}</h3>
        <span className="text-xs text-gray-500">{he.quickActions.subtitle}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((action, index) => {
          const IconComponent = action.icon;

          return (
            <button
              key={index}
              onClick={() => onAction(action.query)}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200
                ${action.color} ${action.textColor}
                shadow-sm hover:shadow-md transform hover:scale-105
              `}
              aria-label={action.ariaLabel}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs font-medium text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
