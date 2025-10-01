// Core Nurse Data Types
export interface Nurse {
  nurseId: string;
  gender: 'MALE' | 'FEMALE';
  specialization: Specialization[];
  mobility: Mobility[];
  municipality: string[];
  updatedAt: string;
  status: Status[];
  isActive: boolean;
  isProfileUpdated: boolean;
  isOnboardingCompleted: boolean;
  isApproved: boolean;
  treatmentType?: TreatmentType[];
}

export type Specialization =
  | 'DEFAULT'
  | 'CENTRAL_CATHETER_TREATMENT'
  | 'CATHETER_INSERTION_REPLACEMENT'
  | 'WOUND_CARE'
  | 'WOUND_TREATMENT'
  | 'DIABETIC_WOUND_TREATMENT'
  | 'DIFFICULT_WOUND_HEALING_TREATMENT'
  | 'BURN_TREATMENT'
  | 'STOMA_TREATMENT'
  | 'DAY_NIGHT_CIRCUMCISION_NURSE'
  | 'ENEMA_UNDER_INSTRUCTION'
  | 'PRIVATE_SECURITY_HOSPITAL'
  | 'PRIVATE_SECURITY_HOME'
  | 'PEDIATRIC_CARE'
  | 'GERIATRIC_CARE'
  | 'MENTAL_HEALTH'
  | 'EMERGENCY_CARE'
  | 'BLOOD_TESTS'
  | 'MEDICATION'
  | 'MEDICATION_ARRANGEMENT'
  | 'BREASTFEEDING_CONSULTATION'
  | 'HOME_NEWBORN_VISIT'
  | 'FOLLOW_UP_AFTER_SURGERY'
  | 'ABDOMINAL_DRAINAGE_BY_EXTERNAL_DRAINAGE'
  | 'ESCORTED_BY_NURSE'
  | 'FERTILITY_TREATMENTS'
  | 'GASTROSTOMY_CARE_FEEDING'
  | 'HANDLING_AND_TRACKING_METRICS'
  | 'HEALTHY_LIFESTYLE_GUIDANCE';

export type Mobility = 
  | 'WALKING_CANE'
  | 'INDEPENDENT'
  | 'BEDRIDDEN'
  | 'WHEELCHAIR'
  | 'WALKER';

export type Status = 'OPEN' | 'CLOSED' | 'CANCELLED' | 'PENDING';

export type TreatmentType = 
  | 'INJECTION'
  | 'INFUSION'
  | 'WOUND_DRESSING'
  | 'MEDICATION_MANAGEMENT'
  | 'MONITORING'
  | 'THERAPY';

// Query Types
export interface StructuredQuery {
  municipality?: string;
  nurseName?: string;  // Added for Hebrew name searches
  specialization?: Specialization[];
  specializations?: Specialization[];  // alias for specialization
  mobility?: Mobility[];
  treatmentType?: TreatmentType[];
  urgent?: boolean;
  isUrgent?: boolean;  // alias for urgent
  date?: string;
  time?: string;
  available?: boolean;
  topK?: number;
  limit?: number;  // alias for topK
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface NaturalLanguageQuery {
  text: string;
  timestamp: Date;
  parsed?: StructuredQuery;
}

// Engine Types
export interface Engine {
  name: string;
  healthy: boolean;
  url: string;
  description?: string;
  averageLatency?: number;
}

export interface ScoreComponent {
  weight: number;
  score: number;
  weighted: number;
  explanation: string;
}

export interface ScoreBreakdown {
  serviceMatch: ScoreComponent;
  location: ScoreComponent;
  rating: ScoreComponent;
  availability: ScoreComponent;
  experience: ScoreComponent;
}

export interface EngineResult {
  id: string;
  name?: string;
  score: number;
  matchScore?: number;  // 0-1 scale match percentage
  scoreBreakdown?: ScoreBreakdown;  // Detailed score components
  calculationFormula?: string;  // Human-readable formula
  rating?: number;      // 1-5 star rating
  city?: string;        // Nurse location
  services?: string[];  // Available services
  distance?: number;    // Distance in km
  reason?: string;
  nurse?: Nurse;
}

// API Response Types
export interface QueryStatistics {
  totalNurses: number;
  filteredByLocation: number;
  filteredByService: number;
  availableNurses: number;
  rankedResults: number;
  timings: {
    parsing: number;
    matching: number;
    total: number;
  };
}

export interface MatchResponse {
  results?: EngineResult[];  // Legacy support
  nurses: EngineResult[];    // Current backend format
  engine?: string;
  latency_ms?: number;
  query: any;
  total: number;
  total_results?: number;
  timestamp: string;
  statistics?: QueryStatistics;  // New statistics
  usage?: {
    total_tokens?: number;
    cost?: number;
  };
}

export interface EnginesResponse {
  engines: Engine[];
}

// Chat Types
export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'bot' | 'system';
  timestamp: Date;
  data?: {
    query?: StructuredQuery;
    results?: EngineResult[];
    engine?: string;
    latency?: number;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'query' | 'result' | 'error' | 'status' | 'search_request';
  sessionId: string;
  data: any;
  timestamp: Date;
}

// Component Props Types
export interface ChatBotProps {
  className?: string;
  onQuerySubmit?: (query: NaturalLanguageQuery) => void;
  onResultReceived?: (result: MatchResponse) => void;
}

export interface EngineTesterProps {
  className?: string;
  engines: Engine[];
  onEngineSelect?: (engine: string) => void;
  onQueryExecute?: (query: StructuredQuery, engine: string) => void;
}

export interface NurseResultsProps {
  results: EngineResult[];
  query: StructuredQuery;
  engine: string;
  latency: number;
  className?: string;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Form Types
export interface QueryForm {
  city: string;
  services: string;
  expertise: string;
  urgent: boolean;
  topK: number;
  engine: string;
}