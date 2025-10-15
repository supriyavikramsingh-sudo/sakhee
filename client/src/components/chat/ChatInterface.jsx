import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store';
import apiClient from '../../services/apiClient';
import MessageBubble from './MessageBubble';
import SourceCitations from './SourceCitations';
import MealPlanRedirectCard from './MealPlanRedirectCard';
import { Send, Plus, Loader } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { firestoreService } from '../../services/firestoreService';

const ChatInterface = ({ userProfile, userId }) => {
  const { t } = useTranslation();
  const { messages, addMessage, setLoading, isLoading } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  console.log('Messages in ChatInterface:', messages);

  useEffect(() => {
    scrollToBottom();
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
      // Send to backend
      console.log('Sending message to backend...', { userId, userProfile });
      const response = await apiClient.chat(input, {
        userId,
        age: userProfile?.age,
        location: userProfile?.location,
        dietaryPreference: userProfile?.dietType,
        goals: userProfile?.goals,
      });

      console.log('Backend response structure:', response);
      console.log('Response data:', response.data);

      // Check if this is a meal plan redirect response
      if (response.data?.type === 'MEAL_PLAN_REDIRECT') {
        console.log('Meal plan redirect detected');
        const redirectTimestamp = Date.now();
        // Add a special message for meal plan redirect
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

      console.log('Message content:', response.data?.message?.response);

      // Check if we have a valid response
      if (!response.data?.message?.response) {
        throw new Error('Invalid response structure from server');
      }

      const assistantTimestamp = Date.now();

      await firestoreService.saveChatMessage(user.uid, {
        type: 'assistant',
        content: response.data.message.response,
        timestamp: assistantTimestamp,
      });

      // Add assistant message
      addMessage({
        id: assistantTimestamp,
        type: 'assistant',
        content: response.data.message.response,
        sources: response.data?.sources,
        requiresDoctor: response.data?.requiresDoctor,
        severity: response.data?.severity,
        timestamp: assistantTimestamp,
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

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-8 min-h-96">
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
          messages.map((msg, idx) => {
            return (
              <div key={msg.id}>
                {msg.type === 'meal_plan_redirect' ? (
                  <MealPlanRedirectCard data={msg.redirectData} />
                ) : (
                  <>
                    <MessageBubble message={msg} />
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitations sources={msg.sources} />
                    )}
                  </>
                )}
              </div>
            );
          })
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
