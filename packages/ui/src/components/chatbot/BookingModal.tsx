import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MapPin } from 'lucide-react';
import { he } from '@/i18n/he';

interface BookingModalProps {
  nurseName: string;
  nurseLocation?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (booking: { date: Date; timeSlot: string }) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  nurseName,
  nurseLocation,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Generate next 7 days
  const getNext7Days = () => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generate time slots from 9 AM to 6 PM (every 2 hours)
  const timeSlots = [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 18:00'
  ];

  const availableDays = getNext7Days();

  const formatDate = (date: Date) => {
    const dayNames = [
      he.booking.weekdays.sunday,
      he.booking.weekdays.monday,
      he.booking.weekdays.tuesday,
      he.booking.weekdays.wednesday,
      he.booking.weekdays.thursday,
      he.booking.weekdays.friday,
      he.booking.weekdays.saturday
    ];
    const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

    return {
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()]
    };
  };

  const handleSubmit = () => {
    if (selectedDate && selectedTimeSlot) {
      if (onSubmit) {
        onSubmit({ date: selectedDate, timeSlot: selectedTimeSlot });
      } else {
        // Default behavior: show coming soon alert
        alert(`${he.booking.comingSoon}\n\n${he.booking.selectedDate} ${selectedDate.toLocaleDateString('he-IL')}\n${he.booking.selectedTime} ${selectedTimeSlot}`);
      }
      onClose();
    }
  };

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

  // Reset selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(null);
      setSelectedTimeSlot(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        aria-hidden="true"
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-title"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="booking-title" className="text-xl font-bold text-gray-900">
                  {he.booking.title.replace('{name}', nurseName)}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{nurseName}</span>
                  {nurseLocation && (
                    <>
                      <span className="text-gray-400">•</span>
                      <MapPin className="w-4 h-4" />
                      <span>{nurseLocation}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Date Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">{he.booking.selectDate}</h3>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {availableDays.map((date, index) => {
                  const { dayName, dayNum, monthName } = formatDate(date);
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = index === 0;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200
                        ${isSelected
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-600 shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:shadow-md'
                        }
                      `}
                      aria-pressed={isSelected}
                      aria-label={`Select ${dayName}, ${monthName} ${dayNum}`}
                    >
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                        {dayName}
                      </span>
                      <span className="text-xl font-bold my-1">{dayNum}</span>
                      <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                        {monthName}
                      </span>
                      {isToday && (
                        <span className={`text-xs mt-1 font-medium ${isSelected ? 'text-white' : 'text-primary-600'}`}>
                          היום
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">{he.booking.selectTime}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {timeSlots.map((slot, index) => {
                  const isSelected = selectedTimeSlot === slot;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedTimeSlot(slot)}
                      disabled={!selectedDate}
                      className={`
                        flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 font-medium
                        ${isSelected
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-600 shadow-lg'
                          : selectedDate
                            ? 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:shadow-md'
                            : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                        }
                      `}
                      aria-pressed={isSelected}
                      aria-label={`Time slot ${slot}`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
              {!selectedDate && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  אנא בחר תאריך תחילה
                </p>
              )}
            </div>

            {/* Selection Summary */}
            {selectedDate && selectedTimeSlot && (
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4 border border-primary-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">הבחירה שלך:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    <span>{selectedDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span>{selectedTimeSlot}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {he.booking.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTimeSlot}
              className={`
                px-5 py-2.5 rounded-lg font-medium transition-all duration-200
                ${selectedDate && selectedTimeSlot
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {he.booking.confirmBooking}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingModal;
