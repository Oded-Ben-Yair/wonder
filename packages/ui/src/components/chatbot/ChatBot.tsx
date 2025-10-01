import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, Loader2 } from 'lucide-react';
import {
  ChatMessage,
  StructuredQuery,
  MatchResponse
} from '@/types';
import { parseNaturalLanguageQuery } from '@/utils/queryParser';
import { executeMatch } from '@/utils/api';
import NurseResults from './NurseResults';
import QuickActions from './QuickActions';
import ContextualSuggestions from './ContextualSuggestions';
import { he } from '@/i18n/he';

interface ChatBotProps {
  className?: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      content: `${he.chat.welcomeTitle}\n\n${he.chat.welcomeMessage}`,
      type: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState('');
  const [hasResults, setHasResults] = useState(false);
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
    setLastUserQuery(userQuery);

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
        content: he.chat.searching,
        type: 'bot',
        timestamp: new Date(),
      });

      // Execute the query
      const startTime = Date.now();
      const response = await executeMatch(structuredQuery);
      const latency = Date.now() - startTime;

      // Update thinking message with results
      const resultMessage = formatResultsMessage(response, structuredQuery, latency);
      const results = response.results || response.nurses || [];
      setHasResults(results.length > 0);

      updateMessage(thinkingMessageId, {
        content: resultMessage.content,
        data: {
          query: structuredQuery,
          results: results,
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

  // Helper function to convert service codes to Hebrew names
  const getServiceFriendlyName = (services: string[] | undefined): string => {
    if (!services || services.length === 0) return 'טיפול כללי';

    return services
      .map(s => he.services[s as keyof typeof he.services] || s)
      .slice(0, 2)
      .join(' & ');
  };

  // Helper function to convert English city names to Hebrew
  const cityTranslation: Record<string, string> = {
    'Tel Aviv': 'תל אביב',
    'Tel Aviv-Yafo': 'תל אביב-יפו',
    'Jerusalem': 'ירושלים',
    'Haifa': 'חיפה',
    'Rishon LeZion': 'ראשון לציון',
    'Petah Tikva': 'פתח תקווה',
    'Ashdod': 'אשדוד',
    'Netanya': 'נתניה',
    'Beersheba': 'באר שבע',
    'Beer Sheva': 'באר שבע',
    'Holon': 'חולון',
    'Ramat Gan': 'רמת גן',
    'Bat Yam': 'בת ים',
    'Rehovot': 'רחובות',
    'Ashkelon': 'אשקלון',
    'Herzliya': 'הרצליה',
    'Kfar Saba': 'כפר סבא',
    'Hadera': 'חדרה',
    'Modiin': 'מודיעין',
    'Nazareth': 'נצרת'
  };

  const formatResultsMessage = (
    response: MatchResponse,
    query: StructuredQuery,
    latency: number
  ): { content: string } => {
    const results = response.results || response.nurses || [];
    const stats = response.statistics || {} as any;

    // Context-aware empty state
    if (results.length === 0) {
      const helpfulSuggestions = [];

      if (query.municipality) {
        helpfulSuggestions.push(`🗺️ הרחב את אזור החיפוש מעבר ל${query.municipality}`);
      }
      if (query.specializations && query.specializations.length > 2) {
        helpfulSuggestions.push('🎯 נסה לחפש פחות שירותים ספציפיים');
      }
      if (query.isUrgent) {
        helpfulSuggestions.push('⏰ הסר את סינון "דחוף" כדי לראות יותר אחיות זמינות');
      }

      if (helpfulSuggestions.length === 0) {
        helpfulSuggestions.push('🔄 נסה מיקום אחר');
        helpfulSuggestions.push('📅 נסה תאריכים או שעות שונות');
        helpfulSuggestions.push('💡 הרחב את קריטריוני החיפוש');
      }

      return {
        content: `😔 **לא מצאנו התאמות מדויקות לבקשה שלך**\n\n` +
          `אל דאגה! הנה כמה דרכים למצוא את מה שאתה צריך:\n\n` +
          helpfulSuggestions.map(s => `• ${s}`).join('\n') +
          `\n\n💬 **או ספר לי מה הכי חשוב לך**, ואתאים את החיפוש.`
      };
    }

    // User-friendly results message
    let content = `✨ **${he.chat.foundMatches.replace('{count}', results.length.toString())}**\n\n`;

    content += `🎯 **${he.chat.yourRequest}**\n`;
    content += `• ${he.chat.serviceNeeded} ${getServiceFriendlyName(query.specializations)}\n`;
    content += `• ${he.chat.location} ${query.municipality ? (cityTranslation[query.municipality] || query.municipality) : 'בכל רחבי הארץ'}\n`;
    if (query.isUrgent) content += `• ⚡ **${he.chat.urgent}** - מציג אחיות זמינות באופן מיידי\n`;

    content += `\n🤖 **${he.chat.howAIFoundThem}**\n\n`;
    const totalNurses = stats.totalNurses?.toLocaleString() || '6,703';
    const foundNurses = stats.filteredByLocation || results.length;
    content += he.chat.searchedNurses
      .replace('{total}', totalNurses)
      .replace('{found}', foundNurses.toString());

    content += `\n\n${he.chat.scoredOn5Factors}\n`;
    content += `${he.chat.scoreFactor1}\n`;
    content += `${he.chat.scoreFactor2}\n`;
    content += `${he.chat.scoreFactor3}\n`;
    content += `${he.chat.scoreFactor4}\n`;
    content += `${he.chat.scoreFactor5}\n\n`;

    content += `📋 **התאמות מובילות:**\n\n`;

    // Show top 3 results with user-friendly descriptions
    results.slice(0, 3).forEach((result, i) => {
      const matchPercent = Math.round((result.matchScore || result.score || 0) * 100);
      const matchQuality = matchPercent >= 85 ? '🟢 התאמה מצוינת' : matchPercent >= 70 ? '🟡 התאמה מעולה' : '🟠 התאמה טובה';

      content += `**${i + 1}. ${result.name}**\n`;
      content += `   ${matchQuality} (${matchPercent}% תאימות)\n`;
      content += `   ${result.city || result.nurse?.municipality?.[0] || 'מיקום זמין'}\n`;

      if (result.scoreBreakdown?.serviceMatch?.score !== undefined && result.scoreBreakdown.serviceMatch.score >= 0.8) {
        content += `   ✨ *מומחית בשירות המבוקש*\n`;
      }
      if (result.scoreBreakdown?.location?.score !== undefined && result.scoreBreakdown.location.score >= 0.9) {
        content += `   📍 *קרובה מאוד למיקומך*\n`;
      }
      if (result.rating && result.rating >= 4.5) {
        content += `   ⭐ *מדורגת גבוה על ידי מטופלים (${result.rating.toFixed(1)}/5.0)*\n`;
      }
      content += `\n`;
    });

    if (results.length > 3) {
      content += `_...ועוד ${results.length - 3} ${results.length - 3 === 1 ? 'התאמה' : 'התאמות'} למטה_\n\n`;
    }

    content += `⚡ *תוצאות נמסרו ב-${stats.timings?.total || latency}ms*\n`;

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
    "אני צריך אחות לטיפול בפצעים בתל אביב",
    "מי זמינה היום בשעה 15:00 בתל אביב?",
    "חפש אחות למתן תרופות בחיפה",
    "אחות דחוף לטיפול בפצע ברמת גן",
    "מצא 5 אחיות בנתניה",
    "אחות לטיפול בקשישים בירושלים",
    "מי יכולה להגיע היום לפתח תקווה?",
    "צריך אחות לבדיקת לחץ דם בראשון לציון"
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
            <h2 className="text-lg font-semibold text-gray-900">מחפש אחיות</h2>
            <p className="text-sm text-gray-500">שאל אותי למצוא אחיות בשפה טבעית</p>
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
                <span>{he.chat.searching}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions - Show after first search */}
      {hasResults && !isLoading && (
        <div className="flex-shrink-0 px-4 pt-4 bg-gray-50">
          <QuickActions
            onAction={(actionQuery) => {
              setInputText(actionQuery);
              inputRef.current?.focus();
            }}
            hasResults={hasResults}
            lastQuery={lastUserQuery}
          />
        </div>
      )}

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">{he.chat.tryAsking}</p>
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

      {/* Contextual Suggestions - Show when has results */}
      {hasResults && lastUserQuery && !isLoading && (
        <ContextualSuggestions
          lastQuery={lastUserQuery}
          onSuggestionClick={(suggestion) => {
            setInputText(suggestion);
            inputRef.current?.focus();
          }}
        />
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
            placeholder={he.chat.inputPlaceholder}
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
          לחץ Enter לשליחה, Shift+Enter לשורה חדשה
        </p>
      </div>
    </div>
  );
};

export default ChatBot;