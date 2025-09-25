import { useState } from 'react';
import { MessageCircle, FlaskConical, ArrowRight, Activity } from 'lucide-react';
import ChatBot from '@/components/chatbot/ChatBot';
import EngineTester from '@/components/tester/EngineTester';

type ViewMode = 'chat' | 'test' | 'split';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Wonder Healthcare Platform</h1>
                <p className="text-xs text-gray-500">AI-Powered Nurse Matching System • 371 Active Nurses</p>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'chat'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat Only</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>Split View</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('test')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'test'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  <span>Test Only</span>
                </div>
              </button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'chat' && (
          <div className="h-full">
            <ChatBot className="h-full" />
          </div>
        )}

        {viewMode === 'test' && (
          <div className="h-full overflow-y-auto">
            <EngineTester />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="h-full flex">
            {/* Left Panel - Chatbot */}
            <div className="flex-1 border-r border-gray-200">
              <div className="h-full flex flex-col">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3 border-b border-primary-200">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary-600" />
                    <h2 className="font-semibold text-primary-900">Natural Language Chat</h2>
                  </div>
                  <p className="text-xs text-primary-700 mt-1">
                    Ask questions like "Who's available in Tel Aviv today at 3pm?"
                  </p>
                </div>
                <ChatBot className="flex-1" />
              </div>
            </div>

            {/* Right Panel - Engine Tester */}
            <div className="flex-1">
              <div className="h-full flex flex-col">
                <div className="bg-gradient-to-r from-success-50 to-success-100 px-4 py-3 border-b border-success-200">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-success-600" />
                    <h2 className="font-semibold text-success-900">Engine Testing Panel</h2>
                  </div>
                  <p className="text-xs text-success-700 mt-1">
                    Test and compare all 3 matching engines directly
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EngineTester />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-gray-900 text-gray-300 px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Gateway: <span className="text-green-400">5050</span></span>
            <span>•</span>
            <span>UI: <span className="text-green-400">3000</span></span>
            <span>•</span>
            <span>Engines: <span className="text-green-400">3 Active</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span>Azure GPT: <span className="text-yellow-400">Slow (15s)</span></span>
            <span>•</span>
            <span>Basic Filter: <span className="text-red-400">No Results</span></span>
            <span>•</span>
            <span>Fuzzy Match: <span className="text-red-400">Error</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;