// Hebrew Translations for Wonder Healthcare Platform
// עברית - פלטפורמת Wonder Healthcare

export const he = {
  // Header / App.tsx
  header: {
    brandName: 'Wonder Healthcare',
    tagline: 'התאמת אחיות מבוססת AI',
    professionalCount: '3,100+ אחיות מקצועיות',
    statusLive: 'פעיל',
    hipaaCompliant: 'עומד בתקן HIPAA'
  },

  // ChatBot.tsx
  chat: {
    welcomeTitle: '👋 **ברוכים הבאים ל-Wonder Healthcare!**',
    welcomeMessage:
      `אני עוזר ה-AI שלך, כאן כדי לעזור לך למצוא את האחות המתאימה ביותר מרשת של **3,100+ אחיות מקצועיות**.\n\n` +
      `✨ **איך זה עובד:**\n` +
      `1️⃣ ספר לי מה אתה צריך (בעברית או אנגלית)\n` +
      `2️⃣ אחפש ואנתח אלפי פרופילים באופן מיידי\n` +
      `3️⃣ תקבל התאמות מדורגות עם הסברים ברורים\n\n` +
      `🎯 **נסה לשאול:**\n` +
      `• "אני צריך אחות לטיפול בפצעים בתל אביב"\n` +
      `• "מי זמינה היום בשעה 15:00 בחיפה?"\n` +
      `• "מצא אחות למתן תרופות בירושלים"`,
    inputPlaceholder: 'שאל אותי למצוא אחיות... (לדוגמה: "מי זמינה היום בתל אביב?")',
    sendButton: 'שלח',
    searching: 'מחפש...',
    tryAsking: 'נסה לשאול:',
    
    // Query analysis
    foundMatches: 'נמצאו {count} התאמות מצוינות עבורך!',
    yourRequest: 'הבקשה שלך:',
    serviceNeeded: 'שירות נדרש:',
    location: 'מיקום:',
    urgency: 'דחיפות:',
    urgent: 'דחוף',
    notUrgent: 'לא דחוף',
    howAIFoundThem: 'איך ה-AI שלנו מצא אותן:',
    searchedNurses: 'המערכת שלנו חיפשה **{total} אחיות מקצועיות** ברחבי הארץ ומצאה **{found}** באזור שלך.',
    scoredOn5Factors: 'כל התאמה מדורגת על 5 גורמים מרכזיים:',
    scoreFactor1: '• **התאמת מומחיות** (30%) - עד כמה הכישורים שלהן מתאימים לצרכים שלך',
    scoreFactor2: '• **קרבה** (25%) - מרחק ונוחות נסיעה',
    scoreFactor3: '• **ביקורות מטופלים** (20%) - דירוגים ומשוב מטופלים קודמים',
    scoreFactor4: '• **זמינות** (15%) - יכולה לשרת אותך מתי שאתה צריך',
    scoreFactor5: '• **ניסיון** (10%) - שנות ניסיון מקצועיות'
  },

  // NurseResults.tsx  
  results: {
    foundNurses: 'נמצאו {count} {plural}',
    nurseSingular: 'אחות',
    nursePlural: 'אחיות',
    noNursesFound: 'לא נמצאו אחיות התואמות את הקריטריונים שלך',
    searchCriteria: 'קריטריוני חיפוש:',
    urgent: 'דחוף',
    specializations: 'התמחויות:',
    locations: 'מיקומים:',
    statusActive: 'פעילה',
    statusApproved: 'מאושרת',
    statusOnboarded: 'עברה הכשרה',
    matchReason: 'סיבת ההתאמה:',
    showingResults: 'מציג {count} {plural}',
    resultSingular: 'תוצאה',
    resultPlural: 'תוצאות',
    avgScore: 'ציון ממוצע:',
    moreResults: '+{count} תוצאות נוספות זמינות',
    viewDetails: 'לחץ לפרטים נוספים',
    viewProfile: 'לחץ לצפייה בפרופיל המלא'
  },

  // AIMatchInsights.tsx
  insights: {
    matchQuality: {
      excellent: 'מצוינת',
      great: 'מעולה',
      good: 'טובה'
    },
    whyMatch: 'למה זו התאמה {quality}?',
    overallCompatibility: 'תאימות כוללת',
    keyFactors: 'גורמים מרכזיים:',
    
    // Factor labels
    factorLabels: {
      serviceMatch: 'התאמת מומחיות',
      location: 'קרבה גיאוגרפית',
      rating: 'ביקורות מטופלים',
      availability: 'זמינות',
      experience: 'רמת ניסיון'
    },

    // Explanations
    serviceMatch: {
      high: '{name} מומחית בשירות הספציפי שאתה צריך',
      medium: '{name} בעלת ניסיון רלוונטי לבקשה שלך',
      low: '{name} בעלת ניסיון בשירותים קשורים'
    },
    location: {
      high: '{name} נמצאת קרובה מאוד אליך',
      medium: '{name} נמצאת במרחק נוח',
      low: '{name} נמצאת באזור הכללי'
    },
    rating: {
      high: '{name} בעלת ביקורות מצוינות מטופלים (10% העליונים)',
      medium: '{name} בעלת משוב טוב ממטופלים',
      low: '{name} בונה את המוניטין שלה'
    },
    availability: {
      high: '{name} זמינה בשעה המבוקשת שלך',
      medium: '{name} בעלת גמישות בתיאום',
      low: 'ל-{name} עשויה להיות זמינות מוגבלת'
    },
    experience: {
      high: '{name} בעלת ניסיון מקצועי נרחב',
      medium: '{name} בעלת ניסיון מוצק',
      low: '{name} מקצועית בתחילת דרכה'
    },

    trustFooter: 'אנחנו מאמינים בשקיפות. החישוב המלא מבוסס על אלגוריתמים מתקדמים הלוקחים בחשבון מספר רב של גורמים כדי למצוא את ההתאמה הטובה ביותר עבורך.'
  },

  // ContextualSuggestions.tsx
  suggestions: {
    refine: 'חידוד:',
    
    // Wound care suggestions
    woundCare: {
      urgent: 'צריך ביקור דחוף?',
      home: 'מעדיף ביקור בית?',
      insurance: 'מכוסה בביטוח?',
      experience: 'הצג רמת ניסיון'
    },
    
    // Medication suggestions
    medication: {
      today: 'זמינה היום?',
      injections: 'יכולה לתת זריקות?',
      evening: 'תורים בערב?',
      senior: 'מומחית לטיפול בקשישים?'
    },
    
    // Urgent suggestions
    urgent: {
      oneHour: 'תוך שעה?',
      home: 'יכולה להגיע לבית?',
      closest: 'הצג רק קרובות',
      emergency: 'מוסמכת לחירום?'
    },
    
    // Tel Aviv suggestions
    telAviv: {
      nearby: 'ערים סמוכות גם?',
      weekends: 'זמינה בסופי שבוע?',
      english: 'דוברת אנגלית?',
      topRated: 'הצג מדורגות ביותר'
    },
    
    // Default suggestions
    default: {
      urgentCare: 'צריך טיפול דחוף?',
      specificArea: 'מעדיף אזור ספציפי?',
      fiveStar: 'הצג רק 5 כוכבים',
      availableToday: 'זמינה היום?'
    }
  },

  // NurseProfileDrawer.tsx
  profile: {
    title: 'פרופיל',
    matchScore: 'ציון התאמה',
    specializations: 'התמחויות',
    serviceLocations: 'אזורי שירות',
    treatmentTypes: 'סוגי טיפולים',
    about: 'אודות',
    contactInfo: 'פרטי התקשרות',
    actions: {
      bookAppointment: 'קביעת תור',
      callNow: 'התקשר עכשיו',
      sendMessage: 'שלח הודעה',
      close: 'סגור'
    },
    labels: {
      rating: 'דירוג:',
      reviews: 'ביקורות',
      experience: 'ניסיון:',
      years: 'שנים',
      availability: 'זמינות:',
      location: 'מיקום:'
    }
  },

  // BookingModal.tsx
  booking: {
    title: 'קביעת תור עם {name}',
    selectDate: 'בחר תאריך',
    selectTime: 'בחר שעה',
    confirmBooking: 'אשר הזמנה',
    cancel: 'ביטול',
    timeSlots: {
      morning: 'בוקר',
      afternoon: 'צהריים',
      evening: 'ערב'
    },
    weekdays: {
      sunday: 'ראשון',
      monday: 'שני',
      tuesday: 'שלישי',
      wednesday: 'רביעי',
      thursday: 'חמישי',
      friday: 'שישי',
      saturday: 'שבת'
    },
    comingSoon: '🎉 תכונת הזמנה תהיה זמינה בקרוב!',
    selectedDate: 'תאריך שנבחר:',
    selectedTime: 'שעה שנבחרה:'
  },

  // Service Names (for display)
  services: {
    WOUND_CARE: 'טיפול בפצעים',
    MEDICATION: 'מתן תרופות',
    CENTRAL_CATHETER_TREATMENT: 'טיפול בצנתר מרכזי',
    SUTURE_REMOVAL: 'הסרת תפרים',
    GASTROSTOMY_CARE_FEEDING: 'טיפול וההזנה בגסטרוסטומיה',
    TUBE_FEEDING_THERAPY: 'טיפול בהזנה צינורית',
    DAY_NIGHT_CIRCUMCISION_NURSE: 'אחות ברית יום/לילה',
    BLOOD_TESTS: 'בדיקות דם',
    HANDLING_AND_TRACKING_METRICS: 'טיפול ומעקב מדדים',
    PRIVATE_SECURITY_HOSPITAL: 'שמירה פרטית בית חולים',
    PRIVATE_SECURITY_HOME: 'שמירה פרטית בבית',
    CATHETER_INSERTION_REPLACEMENT: 'החדרה והחלפת קטטר',
    ENEMA_UNDER_INSTRUCTION: 'חוקן לפי הוראות',
    DEFAULT: 'כללי'
  },

  // Common/Shared
  common: {
    loading: 'טוען...',
    error: 'שגיאה',
    retry: 'נסה שוב',
    close: 'סגור',
    cancel: 'ביטול',
    confirm: 'אישור',
    save: 'שמור',
    edit: 'ערוך',
    delete: 'מחק',
    back: 'חזור',
    next: 'הבא',
    previous: 'קודם',
    submit: 'שלח',
    search: 'חיפוש'
  }
};

// Helper function to replace placeholders
export const t = (key: string, replacements?: Record<string, string | number>): string => {
  let text = key;
  if (replacements) {
    Object.keys(replacements).forEach(placeholder => {
      text = text.replace(new RegExp(`{${placeholder}}`, 'g'), String(replacements[placeholder]));
    });
  }
  return text;
};

export default he;
