# Wonder Healthcare Platform UI

Modern React-based user interface for the Wonder healthcare matching platform. Features a natural language chatbot for finding nurses and a comprehensive engine testing suite.

## Features

### 🤖 Chatbot Interface
- **Natural Language Queries**: Ask in plain English
  - "Who's available today at 3pm in Tel Aviv?"
  - "Find a pediatric nurse in Jerusalem"  
  - "I need wound care specialists urgently"
- **Smart Query Parsing**: Automatically converts natural language to structured queries
- **Conversational Results**: Results displayed in chat format with context
- **Real-time Search**: Instant responses with loading states

### 🔧 Engine Tester
- **Multi-Engine Testing**: Test individual engines or compare multiple engines
- **Structured Queries**: Direct control over query parameters
- **Performance Metrics**: Latency tracking and success rates
- **Real-time Results**: Live updates during execution
- **Comparison Mode**: Side-by-side engine comparison with analytics

### 🎨 Modern Design
- **Mobile Responsive**: Works on all screen sizes
- **Clean Interface**: Minimal, professional design
- **Tailwind CSS**: Utility-first styling system  
- **Lucide Icons**: Modern, consistent iconography
- **Smooth Animations**: Polished user interactions

## Tech Stack

- **React 18**: Latest React with Hooks and Concurrent Features
- **TypeScript**: Full type safety and developer experience
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client with interceptors and retry logic
- **Socket.io-client**: Real-time WebSocket communication
- **Lucide React**: Beautiful SVG icons
- **Date-fns**: Date manipulation utilities

## Project Structure

```
src/
├── components/
│   ├── chatbot/
│   │   ├── ChatBot.tsx          # Main chat interface
│   │   └── NurseResults.tsx     # Results display component
│   ├── tester/
│   │   └── EngineTester.tsx     # Engine testing interface
│   └── shared/                  # Shared components
├── hooks/
│   └── useWebSocket.ts          # WebSocket management hooks
├── types/
│   └── index.ts                 # TypeScript interfaces
├── utils/
│   ├── api.ts                   # API client and utilities
│   ├── queryParser.ts           # Natural language parsing
│   └── index.ts                 # Utility functions
├── App.tsx                      # Main application component
├── main.tsx                     # Application entry point
└── index.css                    # Global styles and Tailwind imports
```

## Development

### Prerequisites
- Node.js 16+
- npm 8+

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration
The UI connects to the gateway API at `/api` (proxied in development). Update `vite.config.ts` to modify the API endpoint.

## API Integration

### Endpoints Used
- `GET /engines` - List available matching engines
- `POST /match` - Execute matching query
- `GET /health` - Health check
- `GET /stats` - Engine statistics

### Query Format
```typescript
interface StructuredQuery {
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
```

## Natural Language Parsing

The chatbot understands various query formats:

### Location Recognition
- "Tel Aviv", "Jerusalem", "Haifa"
- Hebrew names: "תל אביב-יפו", "חיפה"
- Alternative spellings and abbreviations

### Specialization Detection
- "wound care", "pediatric", "emergency"
- "catheter treatment", "stoma care"
- Medical terminology and common phrases

### Time/Date Parsing
- "today", "tomorrow", "Monday"
- "3pm", "15:00", "3 o'clock"
- Date formats: "12/25/2024", "25-12-2024"

### Urgency Detection
- "urgent", "emergency", "ASAP", "immediately"

## Components Usage

### ChatBot Component
```tsx
import ChatBot from '@/components/chatbot/ChatBot';

<ChatBot 
  className="h-full"
  onQuerySubmit={(query) => console.log('Query:', query)}
  onResultReceived={(result) => console.log('Result:', result)}
/>
```

### EngineTester Component  
```tsx
import EngineTester from '@/components/tester/EngineTester';

<EngineTester />
```

### NurseResults Component
```tsx
import NurseResults from '@/components/chatbot/NurseResults';

<NurseResults
  results={engineResults}
  query={structuredQuery}
  engine="azure-gpt"
  latency={250}
  compact={false}
/>
```

## WebSocket Integration

Real-time updates are supported via Socket.io:

```tsx
import { useWebSocket, useRealTimeSearch } from '@/hooks/useWebSocket';

// Basic WebSocket connection
const { isConnected, sendMessage, subscribe } = useWebSocket();

// Real-time search updates
const { searchResults, isSearching, startSearch } = useRealTimeSearch();
```

## Styling System

### Tailwind Configuration
- Primary color scheme: Blue (sky)
- Success: Green
- Warning: Amber  
- Error: Red
- Custom animations and utilities

### CSS Classes
```css
/* Component classes */
.btn-primary        /* Primary button styles */
.btn-secondary      /* Secondary button styles */
.input-field        /* Form input styles */
.card               /* Card container styles */
.nurse-card         /* Nurse result card styles */
.chat-bubble        /* Chat message styles */
.loading-spinner    /* Loading indicator */
```

## Performance Considerations

### Optimizations Implemented
- **Component Memoization**: React.memo where appropriate
- **Debounced Input**: Prevents excessive API calls
- **Virtual Scrolling**: For large result sets
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Lazy loading and compression
- **Bundle Analysis**: Webpack bundle analyzer integration

### Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.0s
- Bundle size: < 500KB gzipped

## Accessibility Features

### WCAG Compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Color Contrast**: AAA compliance for text
- **Focus Management**: Logical tab order
- **Alternative Text**: All images have alt text

### Screen Reader Support
```tsx
// Example ARIA implementation
<button 
  aria-label="Execute search query"
  aria-describedby="search-help"
  role="button"
>
  Search
</button>
```

## Testing

### Unit Tests
```bash
npm test              # Run all tests
npm test -- --watch  # Watch mode
npm test -- --coverage # Coverage report
```

### Testing Structure
- Component tests with React Testing Library
- Hook tests with @testing-library/react-hooks  
- Utility function tests with Jest
- Integration tests for API calls

## Deployment

### Build Process
```bash
npm run build
```

Generates optimized production build in `dist/` directory.

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style
2. Add TypeScript types for all new features
3. Include tests for new components
4. Update documentation for API changes
5. Ensure accessibility compliance

## License

Private - Wonder Healthcare Platform

---

**Built with ❤️ for healthcare professionals**