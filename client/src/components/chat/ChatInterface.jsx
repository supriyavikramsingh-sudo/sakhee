import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store';
import apiClient from '../../services/apiClient';
import MessageBubble from './MessageBubble';
import SourceCitations from './SourceCitations';
import MealPlanRedirectCard from './MealPlanRedirectCard';
import { Send, Plus, Loader, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { firestoreService } from '../../services/firestoreService';

const ChatInterface = ({ userProfile, userId }) => {
  const { t } = useTranslation();
  const {
    messages,
    addMessage,
    setLoading,
    isLoading,
    loadHistory,
    loadMoreMessages,
    hasMoreMessages,
  } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { user } = useAuthStore();
  const hasLoadedHistory = useRef(false);
  const isLoadingOlderMessages = useRef(false);
  const [isLatestMessageFromLLM, setIsLatestMessageFromLLM] = useState(false);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user?.uid || hasLoadedHistory.current) return;

      try {
        const result = await firestoreService.getChatHistory(user.uid);
        console.log('Chat history loaded:', result);

        if (result.success && result.data && Array.isArray(result.data)) {
          // Load all messages at once using loadHistory instead of adding one by one
          loadHistory(result.data);
          hasLoadedHistory.current = true;
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [user?.uid, loadHistory]);

  useEffect(() => {
    // Only scroll to bottom if we're not loading older messages
    if (!isLoadingOlderMessages.current) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };

      scrollToBottom();
    }

    // Reset the flag after scrolling logic
    isLoadingOlderMessages.current = false;
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message to UI
    const userTimestamp = Date.now();
    addMessage({
      id: userTimestamp,
      type: 'user',
      content: input,
      timestamp: userTimestamp,
    });

    await firestoreService.saveChatMessage(user.uid, {
      type: 'user',
      content: input,
      timestamp: userTimestamp,
    });

    setInput('');
    setLoading(true);

    try {
      const response = await apiClient.chat(input, {
        userId,
        age: userProfile?.age,
        location: userProfile?.location,
        dietaryPreference: userProfile?.dietType,
        goals: userProfile?.goals,
      });

      console.log('Backend response structure:', response);
      console.log('Response data:', response.data);
      console.log('Sources in response:', response.data?.sources);
      console.log('Context used:', response.data?.contextUsed);

      // Check if this is a meal plan redirect response
      if (response.data?.type === 'MEAL_PLAN_REDIRECT') {
        const redirectTimestamp = Date.now();
        addMessage({
          id: redirectTimestamp,
          type: 'meal_plan_redirect',
          content: response.data.message,
          redirectData: response.data,
          timestamp: redirectTimestamp,
        });

        await firestoreService.saveChatMessage(user.uid, {
          type: 'meal_plan_redirect',
          content: response.data.message,
          redirectData: response.data,
          timestamp: redirectTimestamp,
        });

        setLoading(false);
        return;
      }

      // Check if we have a valid response
      if (!response.data?.message?.response) {
        throw new Error('Invalid response structure from server');
      }

      const assistantTimestamp = Date.now();

      // Prepare full message data with sources
      const assistantMessageData = {
        type: 'assistant',
        content: response.data.message.response,
        sources: response.data?.sources || [],
        requiresDoctor: response.data?.requiresDoctor,
        severity: response.data?.severity,
        timestamp: assistantTimestamp,
      };

      // Save to Firestore with sources
      await firestoreService.saveChatMessage(user.uid, assistantMessageData);

      // Add assistant message to UI
      addMessage({
        id: assistantTimestamp,
        ...assistantMessageData,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('Error details:', error.message, error.stack);
      addMessage({
        id: Date.now(),
        type: 'error',
        content: t('chat.errorMessage'),
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm(t('chat.confirmClear'))) {
      // Clear chat
    }
  };

  const handleLoadMore = () => {
    // Set flag to prevent auto-scroll to bottom
    isLoadingOlderMessages.current = true;

    // Save current scroll position
    const container = messagesContainerRef.current;
    const scrollHeightBefore = container?.scrollHeight || 0;
    const scrollTopBefore = container?.scrollTop || 0;

    loadMoreMessages();

    // Restore scroll position after new messages are loaded
    setTimeout(() => {
      if (container) {
        const scrollHeightAfter = container.scrollHeight;
        const heightDifference = scrollHeightAfter - scrollHeightBefore;
        container.scrollTop = scrollTopBefore + heightDifference;
      }
    }, 0);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-8 mb-8 min-h-96">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-3">👋 {t('chat.welcome')}</h2>
              <p className="text-muted mb-6 max-w-md">{t('chat.welcomeMessage')}</p>
              <div className="bg-surface rounded-lg p-6 text-left max-w-md">
                <p className="font-bold text-sm mb-3">💡 {t('chat.tips')}:</p>
                <ul className="text-sm text-muted space-y-2">
                  <li>✓ Ask about PCOS symptoms</li>
                  <li>✓ Discuss lifestyle tips</li>
                  <li>✓ Share your health concerns</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-primary hover:text-white text-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ChevronUp size={16} />
                  <span className="text-sm font-medium">Load older messages</span>
                </button>
              </div>
            )}

            {messages.map((msg, idx) => {
              return (
                <div key={msg.id || idx}>
                  {msg.type === 'meal_plan_redirect' ? (
                    <MealPlanRedirectCard data={msg.redirectData} />
                  ) : (
                    <>
                      <MessageBubble
                        message={msg}
                        isLatestMessageFromLLM={isLatestMessageFromLLM}
                        setIsLatestMessageFromLLM={setIsLatestMessageFromLLM}
                      />
                      {msg.sources && msg.sources.length > 0 && (
                        <SourceCitations sources={msg.sources} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted">
            <Loader className="animate-spin" size={20} />
            <span>{t('chat.aiThinking')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-surface pt-4">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.inputPlaceholder')}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-surface rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50 transition"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>

          <div className="flex gap-2 text-xs text-muted">
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1 hover:text-primary transition"
            >
              <Plus size={16} />
              {t('chat.newChat')}
            </button>
          </div>
        </form>

        {/* Disclaimer Footer */}
        <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-lg text-xs text-gray-700">
          ⚠️ {t('common.disclaimerText')}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
