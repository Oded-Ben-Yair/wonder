import { useState } from 'react';
import { MessageCircle, Settings, Menu, X, Github, ExternalLink } from 'lucide-react';
import ChatBot from '@/components/chatbot/ChatBot';
import EngineTester from '@/components/tester/EngineTester';

type ActiveView = 'chatbot' | 'tester';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('chatbot');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const views = [
    {
      id: 'chatbot' as ActiveView,
      name: 'Chatbot',
      icon: MessageCircle,
      description: 'Natural language nurse finder'
    },
    {
      id: 'tester' as ActiveView,
      name: 'Engine Tester',
      icon: Settings,
      description: 'Test and compare engines'
    }
  ];

  const currentView = views.find(v => v.id === activeView);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Wonder</h1>
              <p className="text-xs text-gray-500">Nurse Matching Platform</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="mt-6">
          <div className="space-y-1 px-3">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              
              return (
                <button
                  key={view.id}
                  onClick={() => {
                    setActiveView(view.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-50 text-primary-700 border-primary-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className="font-medium">{view.name}</div>
                    <div className="text-xs text-gray-500">{view.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-center justify-between">
              <span>Wonder Healthcare Platform</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>457 nurses available</span>
              <a 
                href="https://github.com/odedbe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
              >
                <Github className="w-3 h-3" />
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Built with React 18 + TypeScript + Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentView?.name}
              </h2>
              <p className="text-sm text-gray-500">
                {currentView?.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'chatbot' && (
            <ChatBot className="h-full" />
          )}
          
          {activeView === 'tester' && (
            <div className="h-full overflow-y-auto">
              <EngineTester />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;