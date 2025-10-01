import { Activity } from 'lucide-react';
import ChatBot from '@/components/chatbot/ChatBot';
import { he } from '@/i18n/he';

function App() {

  return (
    <div className="h-screen flex flex-col bg-gradient-healthcare">
      {/* Enhanced 2025 Header */}
      <header className="header-gradient shadow-card border-b-2 border-primary-100 animate-slide-in-down">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo with Gradient & Glow */}
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-teal animate-float">
                <Activity className="w-7 h-7 text-white" />
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent">
                  {he.header.brandName}
                </h1>
                <p className="text-xs font-semibold text-gray-600">
                  🤖 {he.header.tagline} •
                  <span className="text-primary-600 ml-1">{he.header.professionalCount}</span>
                </p>
              </div>
            </div>

            {/* Status & HIPAA Badge */}
            <div className="flex items-center gap-2 text-sm">
              {/* System Status */}
              <div className="status-online shadow-soft animate-scale-in">
                <span className="font-semibold">{he.header.statusLive}</span>
              </div>

              {/* HIPAA Compliance Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-secondary-50 to-primary-50 text-secondary-700 rounded-full border border-secondary-200 shadow-soft">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-xs">{he.header.hipaaCompliant}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Pure Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <ChatBot className="h-full" />
      </main>
    </div>
  );
}

export default App;