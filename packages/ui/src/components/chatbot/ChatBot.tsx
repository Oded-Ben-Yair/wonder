import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, Loader2 } from 'lucide-react';
import { 
  ChatMessage, 
  StructuredQuery, 
  MatchResponse 
} from '@/types';
import { parseNaturalLanguageQuery, queryToNaturalLanguage } from '@/utils/queryParser';
import { executeMatch } from '@/utils/api';
import NurseResults from './NurseResults';

interface ChatBotProps {
  className?: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      content: "Hi! I'm here to help you find nurses. You can ask me things like:\n\n• \"Who's available today at 3pm in Tel Aviv?\"\n• \"Find a pediatric nurse in Jerusalem\"\n• \"I need wound care specialists urgently\"\n\nWhat can I help you find?",
      type: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userQuery = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message
    addMessage({
      content: userQuery,
      type: 'user',
      timestamp: new Date(),
    });

    try {
      // Parse the natural language query
      const structuredQuery = parseNaturalLanguageQuery(userQuery);
      
      // Add bot thinking message
      const thinkingMessageId = addMessage({
        content: 'Let me search for nurses matching your request...',
        type: 'bot',
        timestamp: new Date(),
      });

      // Execute the query
      const startTime = Date.now();
      const response = await executeMatch(structuredQuery);
      const latency = Date.now() - startTime;

      // Update thinking message with results
      const resultMessage = formatResultsMessage(response, structuredQuery, latency);
      updateMessage(thinkingMessageId, {
        content: resultMessage.content,
        data: {
          query: structuredQuery,
          results: response.results,
          engine: response.engine,
          latency: response.latency_ms || latency
        }
      });

    } catch (error) {
      // Add error message
      addMessage({
        content: `Sorry, I encountered an error while searching: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        type: 'bot',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatResultsMessage = (
    response: MatchResponse, 
    query: StructuredQuery, 
    latency: number
  ): { content: string } => {
    const results = response.results || [];
    const engine = response.engine || 'Unknown';
    const actualLatency = response.latency_ms || latency;

    if (results.length === 0) {
      return {
        content: `I couldn't find any nurses matching your criteria. You might want to try:\n\n• Expanding your search area\n• Being less specific about requirements\n• Trying different times or dates\n\nWould you like to modify your search?`
      };
    }

    const queryDescription = queryToNaturalLanguage(query);
    let content = `Found ${results.length} nurse${results.length === 1 ? '' : 's'} ${queryDescription}:\n\n`;

    // Add top results in conversational format
    results.slice(0, 3).forEach((result, index) => {
      const score = (result.score * 100).toFixed(0);
      content += `${index + 1}. **${result.name || `Nurse ${result.id}`}** (${score}% match)\n`;
      if (result.reason) {
        content += `   ${result.reason}\n`;
      }
      content += `\n`;
    });

    if (results.length > 3) {
      content += `And ${results.length - 3} more result${results.length - 3 === 1 ? '' : 's'}...\n\n`;
    }

    content += `*Search completed in ${actualLatency}ms using ${engine} engine*`;

    return { content };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    inputRef.current?.focus();
  };

  const suggestions = [
    "Who's available today at 3pm in Tel Aviv?",
    "Find a pediatric nurse in Jerusalem",
    "I need wound care specialists urgently",
    "Show me nurses with wheelchairs in Haifa",
    "Find 5 nurses for medication management"
  ];

  return (
    <div className={`flex flex-col h-full max-h-screen ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nurse Finder</h2>
            <p className="text-sm text-gray-500">Ask me to find nurses in natural language</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.type === 'bot' ? (
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 ${message.type === 'user' ? 'max-w-xs lg:max-w-md ml-auto' : ''}`}>
              <div className={`chat-bubble ${message.type}`}>
                <div className="whitespace-pre-wrap">
                  {message.content.split('**').map((part, index) => 
                    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                  )}
                </div>
                
                {/* Render nurse results if available */}
                {message.data?.results && message.data.results.length > 0 && (
                  <div className="mt-3">
                    <NurseResults 
                      results={message.data.results}
                      query={message.data.query || {}}
                      engine={message.data.engine || 'Unknown'}
                      latency={message.data.latency || 0}
                      compact={true}
                    />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              </div>
            </div>
            <div className="chat-bubble bot">
              <div className="flex items-center gap-2">
                <div className="loading-spinner"></div>
                <span>Searching...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to find nurses... (e.g., 'Who's available today in Tel Aviv?')"
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="btn-primary px-3 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatBot;