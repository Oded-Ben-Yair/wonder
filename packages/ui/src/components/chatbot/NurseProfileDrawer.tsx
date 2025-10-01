import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  MapPin,
  Star,
  Heart,
  Shield,
  Activity,
  Phone,
  MessageSquare,
  Calendar,
  Award,
  Clock,
  Briefcase
} from 'lucide-react';
import { EngineResult } from '@/types';
import ScoreBreakdown from '../scoring/ScoreBreakdown';
import BookingModal from './BookingModal';
import { he } from '@/i18n/he';

interface NurseProfileDrawerProps {
  nurse: EngineResult | null;
  isOpen: boolean;
  onClose: () => void;
  onBookAppointment?: (nurse: EngineResult) => void;
}

const NurseProfileDrawer: React.FC<NurseProfileDrawerProps> = ({
  nurse,
  isOpen,
  onClose,
  onBookAppointment
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen && !isAnimating) return null;
  if (!nurse) return null;

  const nurseData = nurse.nurse;
  const matchScore = Math.round((nurse.matchScore ?? nurse.score ?? 0) * 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatSpecialization = (spec: string) => {
    return spec.toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleCall = () => {
    alert('Call functionality coming soon!');
  };

  const handleMessage = () => {
    alert('Messaging functionality coming soon!');
  };

  const handleBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleBookingSubmit = (_booking: { date: Date; timeSlot: string }) => {
    // Call parent callback if provided
    if (onBookAppointment && nurse) {
      onBookAppointment(nurse);
    }
    setIsBookingModalOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 id="drawer-title" className="text-xl font-semibold text-gray-900">
              {he.profile.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={he.profile.actions.close}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {nurse.name || `Nurse ${nurse.id.slice(0, 8)}`}
              </h3>
              <p className="text-sm text-gray-500 mb-2">ID: {nurse.id.slice(0, 12)}...</p>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {nurseData?.isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Active Now
                  </span>
                )}
                {nurseData?.isApproved && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match Score Card */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4 border border-primary-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">{he.profile.matchScore}</h4>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(matchScore)} mb-2`}>
              {matchScore}%
            </div>
            <p className="text-xs text-gray-600">
              {matchScore >= 80 ? 'Excellent match for your needs' :
               matchScore >= 60 ? 'Good match for your needs' :
               'Moderate match for your needs'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleBooking}
              className="flex flex-col items-center gap-2 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
              aria-label={he.profile.actions.bookAppointment}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-medium">{he.profile.actions.bookAppointment}</span>
            </button>
            <button
              onClick={handleCall}
              className="flex flex-col items-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
              aria-label={he.profile.actions.callNow}
            >
              <Phone className="w-5 h-5" />
              <span className="text-xs font-medium">{he.profile.actions.callNow}</span>
            </button>
            <button
              onClick={handleMessage}
              className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              aria-label={he.profile.actions.sendMessage}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium">{he.profile.actions.sendMessage}</span>
            </button>
          </div>

          {/* Specializations */}
          {nurseData?.specialization && nurseData.specialization.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-primary-600" />
                <h4 className="text-base font-semibold text-gray-900">{he.profile.specializations}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {nurseData.specialization.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg"
                  >
                    {formatSpecialization(spec)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          {nurseData?.municipality && nurseData.municipality.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h4 className="text-base font-semibold text-gray-900">{he.profile.serviceLocations}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {nurseData.municipality.map((location) => (
                  <span
                    key={location}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                  >
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Treatment Types */}
          {nurseData?.treatmentType && nurseData.treatmentType.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-primary-600" />
                <h4 className="text-base font-semibold text-gray-900">{he.profile.treatmentTypes}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {nurseData.treatmentType.map((treatment) => (
                  <span
                    key={treatment}
                    className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg"
                  >
                    {formatSpecialization(treatment)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights Placeholder */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h4 className="text-base font-semibold text-gray-900">AI Insights</h4>
            </div>
            <p className="text-sm text-gray-600 italic">
              Advanced AI analysis and personalized recommendations will appear here soon.
            </p>
          </div>

          {/* Score Breakdown */}
          {nurse.scoreBreakdown && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-primary-600" />
                <h4 className="text-base font-semibold text-gray-900">Match Breakdown</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <ScoreBreakdown
                  scoreBreakdown={nurse.scoreBreakdown}
                  calculationFormula={nurse.calculationFormula}
                  scorePercentage={`${matchScore}%`}
                  totalScore={nurse.matchScore || nurse.score || 0}
                />
              </div>
            </div>
          )}

          {/* Last Updated */}
          {nurseData?.updatedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Profile last updated: {new Date(nurseData.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {nurse && (
        <BookingModal
          nurseName={nurse.name || `Nurse ${nurse.id.slice(0, 8)}`}
          nurseLocation={nurseData?.municipality?.[0]}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onSubmit={handleBookingSubmit}
        />
      )}
    </>
  );
};

export default NurseProfileDrawer;
