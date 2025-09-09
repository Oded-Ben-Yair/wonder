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
  | 'WOUND_CARE'
  | 'STOMA_TREATMENT'
  | 'DAY_NIGHT_CIRCUMCISION_NURSE'
  | 'ENEMA_UNDER_INSTRUCTION'
  | 'PRIVATE_SECURITY_HOSPITAL'
  | 'PRIVATE_SECURITY_HOME'
  | 'PEDIATRIC_CARE'
  | 'GERIATRIC_CARE'
  | 'MENTAL_HEALTH'
  | 'EMERGENCY_CARE';

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
  specialization?: Specialization[];
  mobility?: Mobility[];
  treatmentType?: TreatmentType[];
  urgent?: boolean;
  date?: string;
  time?: string;
  available?: boolean;
  topK?: number;
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

export interface EngineResult {
  id: string;
  name?: string;
  score: number;
  reason?: string;
  nurse?: Nurse;
}

// API Response Types
export interface MatchResponse {
  results: EngineResult[];
  engine: string;
  latency_ms: number;
  query: StructuredQuery;
  total_results?: number;
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