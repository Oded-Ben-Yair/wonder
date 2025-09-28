import React from 'react';
import { Calculator, MapPin, Star, Clock, Award, TrendingUp } from 'lucide-react';

interface ScoreComponent {
  weight: number;
  score: number;
  weighted: number;
  explanation: string;
}

interface ScoreBreakdownData {
  serviceMatch: ScoreComponent;
  location: ScoreComponent;
  rating: ScoreComponent;
  availability: ScoreComponent;
  experience: ScoreComponent;
}

interface ScoreBreakdownProps {
  scoreBreakdown?: ScoreBreakdownData;
  calculationFormula?: string;
  scorePercentage?: string;
  totalScore?: number;
  className?: string;
}

const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  scoreBreakdown,
  calculationFormula,
  scorePercentage,
  totalScore,
  className = ''
}) => {
  if (!scoreBreakdown) return null;

  const scoreItems = [
    {
      key: 'serviceMatch',
      label: 'התאמת שירות',
      icon: <Award className="w-4 h-4" />,
      color: 'bg-blue-500',
      data: scoreBreakdown.serviceMatch
    },
    {
      key: 'location',
      label: 'מיקום',
      icon: <MapPin className="w-4 h-4" />,
      color: 'bg-green-500',
      data: scoreBreakdown.location
    },
    {
      key: 'rating',
      label: 'דירוג',
      icon: <Star className="w-4 h-4" />,
      color: 'bg-yellow-500',
      data: scoreBreakdown.rating
    },
    {
      key: 'availability',
      label: 'זמינות',
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-purple-500',
      data: scoreBreakdown.availability
    },
    {
      key: 'experience',
      label: 'ניסיון',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-indigo-500',
      data: scoreBreakdown.experience
    }
  ];

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            חישוב ציון התאמה
          </h3>
        </div>
        {scorePercentage && (
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {scorePercentage}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {scoreItems.map(item => (
          <div key={item.key} className="bg-white dark:bg-gray-700 rounded p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className={`${item.color} p-1.5 rounded text-white`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({Math.round(item.data.weight * 100)}% משקל)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-1">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${item.data.score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {(item.data.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {item.data.explanation}
                  </p>
                </div>
              </div>
              <div className="text-right ml-3">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {(item.data.weighted * 100).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">נקודות</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {calculationFormula && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                נוסחת החישוב:
              </div>
              <code className="text-xs text-blue-600 dark:text-blue-400 font-mono break-all" dir="ltr">
                {calculationFormula}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreBreakdown;