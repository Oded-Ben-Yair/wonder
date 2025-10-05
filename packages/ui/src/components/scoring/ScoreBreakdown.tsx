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
  totalScore = 0,
  className = ''
}) => {
  if (!scoreBreakdown) return null;

  // Use totalScore if needed for display
  console.log('Total score:', totalScore);

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

  // Calculate the formula string
  const defaultFormula = `Score = 0.30×Service + 0.25×Location + 0.20×Rating + 0.15×Availability + 0.10×Experience`;
  const displayFormula = calculationFormula || defaultFormula;

  // Calculate final score percentage
  const finalScore = scorePercentage || `${Math.round(totalScore * 100)}%`;

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Formula Display - Always Visible */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
              🧮 נוסחת החישוב המלאה:
            </div>
            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono block break-all" dir="ltr">
              {displayFormula}
            </code>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">
            פירוק ציון התאמה
          </h3>
        </div>
        <div className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
          {finalScore}
        </div>
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
    </div>
  );
};

export default ScoreBreakdown;