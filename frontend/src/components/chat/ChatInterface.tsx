import type { DocumentData } from 'firebase/firestore';
import { ChevronUp, Loader, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';
import { firestoreService } from '../../services/firestoreService';
import { useChatStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import TextInput from '../common/TextInput';
import DishNameInputCard from './DishNameInputCard';
import MealPlanRedirectCard from './MealPlanRedirectCard';
import MessageBubble from './MessageBubble';
import RecipeErrorCard from './RecipeErrorCard';
import RecipeResultCard from './RecipeResultCard';
import RecipeSearchButton from './RecipeSearchButton';
import SourceCitations from './SourceCitations';

interface ChatInterfaceProps {
  userProfile: DocumentData | null | undefined;
  userId: string;
}

const ChatInterface = ({ userProfile, userId }: ChatInterfaceProps) => {
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
  console.log(messages, 'messagesmessages');
  const [input, setInput] = useState<string | number>('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { user } = useAuthStore();
  const hasLoadedHistory = useRef(false);
  const isLoadingOlderMessages = useRef(false);

  // Recipe search state
  const [showDishInputCard, setShowDishInputCard] = useState(false);
  const [recipeSearchLoading, setRecipeSearchLoading] = useState(false);
  const [recipeSearchError, setRecipeSearchError] = useState<any>(null);
  const [userRecipeUsage, setUserRecipeUsage] = useState({
    remaining: 0,
    dailyLimit: 0,
    tier: 'free' as 'free' | 'pro' | 'max',
    resetAt: null as string | null,
  });

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user?.uid || hasLoadedHistory.current) return;

      try {
        const result = await firestoreService.getChatHistory(user.uid);
        console.log('Chat history loaded:', result);
        console.log('Number of messages:', result.data?.length);
        console.log(
          'Message types:',
          result.data?.map((m) => ({ type: m.type, hasContent: !!m.content, id: m.id }))
        );
        console.log('Full messages data:', result.data);

        if (result.success && result.data && Array.isArray(result.data)) {
          // Load all messages at once using loadHistory instead of adding one by one
          console.log('Calling loadHistory with', result.data.length, 'messages');
          loadHistory(result.data);
          hasLoadedHistory.current = true;
          console.log('Messages loaded into store');
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [user?.uid, loadHistory]);

  // Fetch recipe search usage
  useEffect(() => {
    const fetchRecipeUsage = async () => {
      if (!user?.uid) return;

      try {
        // Get user tier from profile or subscription
        // Support both subscription.tier and subscription_plan fields
        const tier = (
          userProfile?.subscription?.tier || 
          userProfile?.subscription_plan || 
          'free'
        ) as 'free' | 'pro' | 'max';
        
        console.log('🔍 Recipe Search - Fetching usage for tier:', tier, {
          subscriptionTier: userProfile?.subscription?.tier,
          subscriptionPlan: userProfile?.subscription_plan,
          userId: user.uid,
        });
        
        const response: any = await apiClient.getRecipeUsage(user.uid, tier);

        if (response.success && response.data) {
          setUserRecipeUsage({
            tier,
            remaining: response.data.remainingToday,
            dailyLimit: response.data.dailyLimit,
            resetAt: response.data.resetAt,
          });
        }
      } catch (error) {
        console.error('Failed to fetch recipe usage:', error);
        // Default to free tier if fetch fails
        setUserRecipeUsage({
          tier: 'free',
          remaining: 0,
          dailyLimit: 0,
          resetAt: null,
        });
      }
    };

    fetchRecipeUsage();
  }, [user?.uid, userProfile?.subscription?.tier, userProfile?.subscription_plan]);

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

    await firestoreService.saveChatMessage(user?.uid, {
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
        timestamp: assistantTimestamp,
      };

      // Only add optional fields if they exist (Firestore doesn't accept undefined)
      if (response.data?.requiresDoctor !== undefined) {
        assistantMessageData.requiresDoctor = response.data.requiresDoctor;
      }
      if (response.data?.severity !== undefined) {
        assistantMessageData.severity = response.data.severity;
      }

      console.log('Attempting to save assistant message:', assistantMessageData);

      // Save to Firestore with sources
      const saveResult = await firestoreService.saveChatMessage(user.uid, assistantMessageData);
      console.log('Save result:', saveResult);

      if (!saveResult.success) {
        console.error('Failed to save assistant message to Firestore:', saveResult.error);
      }

      // Add assistant message to UI
      addMessage({
        id: assistantTimestamp,
        ...assistantMessageData,
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      console.error('Error details:', error.message, error.stack);

      // Check if this is an inappropriate content error (status 400)
      let errorMessage = t('chat.errorMessage');

      if (error.status === 400 && error.details) {
        // Show the specific error message from the server for inappropriate content
        errorMessage = `${error.message}\n\n${error.details}`;
      } else if (error.message) {
        // Show the error message if available
        errorMessage = error.message;
      }
      addMessage({
        id: Date.now(),
        type: 'error',
        content: errorMessage,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm(t('chat.confirmClear'))) {
      try {
        // Clear chat history in Firestore
        await firestoreService.clearChatHistory(user.uid);

        // Clear messages in the store
        const { clearMessages } = useChatStore.getState();
        clearMessages();

        // Reset the history loaded flag to allow reloading
        hasLoadedHistory.current = false;

        console.log('Chat history cleared successfully');
      } catch (error) {
        console.error('Failed to clear chat history:', error);
        alert('Failed to clear chat history. Please try again.');
      }
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

  // Recipe Search Handlers
  const handleRecipeSearchClick = () => {
    // Check if FREE tier
    if (userRecipeUsage.tier === 'free') {
      setRecipeSearchError({ type: 'upgradeRequired' });
      return;
    }

    // Check rate limit
    if (userRecipeUsage.remaining <= 0) {
      setRecipeSearchError({
        type: 'rateLimited',
        resetAt: userRecipeUsage.resetAt,
        dailyLimit: userRecipeUsage.dailyLimit,
      });
      return;
    }

    // Show input card
    setShowDishInputCard(true);
  };

  const handleDishSubmit = async (dishName: string) => {
    try {
      setRecipeSearchLoading(true);
      setRecipeSearchError(null);

      console.log('🔍 Submitting recipe search:', {
        dishName,
        userTier: userRecipeUsage.tier,
        userId: user?.uid,
      });

      const response: any = await apiClient.searchRecipe({
        dishName,
        preferences: {
          region: userProfile?.location || 'India',
          dietType: userProfile?.dietType || 'vegetarian',
          restrictions: userProfile?.restrictions || [],
        },
        userId: user?.uid || userId,
        userTier: userRecipeUsage.tier,
      });

      console.log('📥 Recipe search response:', {
        success: response.success,
        count: response.data?.count,
        recipesLength: response.data?.recipes?.length,
        hasRecipes: !!response.data?.recipes,
      });

      if (response.success && response.data) {
        // Check if no recipes found
        if (!response.data.recipes || response.data.recipes.length === 0 || response.data.count === 0) {
          console.log('No recipes found for:', dishName);
          setRecipeSearchError({
            type: 'notFound',
            dishName,
          });
          setShowDishInputCard(false);
          setRecipeSearchLoading(false);
          return;
        }

        // Add recipe results to chat messages
        const recipeTimestamp = Date.now();
        response.data.recipes.forEach((recipe: any, index: number) => {
          addMessage({
            id: recipeTimestamp + index,
            type: 'recipe_result',
            content: dishName,
            recipeData: recipe,
            remainingSearches: response.data.tierLimit.remainingToday,
            dailyLimit: response.data.tierLimit.dailyLimit,
            timestamp: recipeTimestamp + index,
          });
        });

        // Update usage counter
        setUserRecipeUsage((prev) => ({
          ...prev,
          remaining: response.data.tierLimit.remainingToday,
        }));

        // Close input card
        setShowDishInputCard(false);
      }
    } catch (error: any) {
      console.error('Recipe search error:', error);

      // Handle different error types
      if (error.response?.upgradeRequired) {
        setRecipeSearchError({ type: 'upgradeRequired' });
      } else if (error.response?.rateLimited) {
        setRecipeSearchError({
          type: 'rateLimited',
          resetAt: error.response.resetAt,
          dailyLimit: error.response.tierLimit?.dailyLimit,
        });
      } else if (error.response?.data?.count === 0) {
        // No recipes found - doesn't count against limit
        setRecipeSearchError({
          type: 'notFound',
          dishName,
        });
      } else {
        setRecipeSearchError({
          type: 'apiError',
          message: error.message || 'Failed to search recipes',
        });
      }
    } finally {
      setRecipeSearchLoading(false);
    }
  };

  const handleDishInputCancel = () => {
    setShowDishInputCard(false);
  };

  const handleRetry = () => {
    setRecipeSearchError(null);
    setShowDishInputCard(true);
  };

  const handleUpgrade = () => {
    // Navigate to pricing page
    window.location.href = '/pricing';
  };

  return (
    <>
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
        {/* Messages Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-8 mb-8 min-h-96">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center border-accent p-4 border rounded-lg">
                <h2 className="text-2xl font-bold text-primary mb-3">👋 {t('chat.welcome')}</h2>
                <p className="text-muted mb-6 max-w-md">{t('chat.welcomeMessage')}</p>
                <div className="rounded-lg p-6 text-left flex justify-center flex-col items-center max-w-md">
                  <p className="font-bold text-sm mb-3">💡 {t('chat.tips')}</p>
                  <ul className="flex flex-col text-sm text-muted space-y-2">
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
                // Find the user prompt for AI messages (look at previous message)
                let userPrompt = '';
                if (msg.type === 'assistant' && idx > 0) {
                  const prevMsg = messages[idx - 1];
                  if (prevMsg.type === 'user') {
                    userPrompt = prevMsg.content;
                  }
                }

                return (
                  <div key={msg.id || idx}>
                    {msg.type === 'meal_plan_redirect' ? (
                      <MealPlanRedirectCard
                        data={msg.redirectData}
                        onRecipeSearchClick={handleRecipeSearchClick}
                      />
                    ) : msg.type === 'recipe_result' ? (
                      <RecipeResultCard
                        recipe={msg.recipeData}
                        remainingSearches={msg.remainingSearches || 0}
                        dailyLimit={msg.dailyLimit || 0}
                      />
                    ) : (
                      <>
                        <MessageBubble
                          message={msg}
                          messageId={msg.id?.toString() || `msg-${idx}`}
                          userPrompt={userPrompt}
                        />
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceCitations sources={msg.sources} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Dish Input Card */}
              {showDishInputCard && (
                <DishNameInputCard
                  onSubmit={handleDishSubmit}
                  onCancel={handleDishInputCancel}
                  remainingSearches={userRecipeUsage.remaining}
                  dailyLimit={userRecipeUsage.dailyLimit}
                  userTier={userRecipeUsage.tier as 'pro' | 'max'}
                  isLoading={recipeSearchLoading}
                />
              )}

              {/* Recipe Search Error Card */}
              {recipeSearchError && (
                <RecipeErrorCard
                  errorType={recipeSearchError.type}
                  dishName={recipeSearchError.dishName}
                  dailyLimit={recipeSearchError.dailyLimit}
                  resetTime={recipeSearchError.resetAt}
                  errorMessage={recipeSearchError.message}
                  onTryAgain={handleRetry}
                  onUpgrade={handleUpgrade}
                />
              )}
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
          <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
            {/* Recipe Search and New Chat Buttons */}
            <div className="flex justify-between items-center gap-3">
              <RecipeSearchButton
                userTier={userRecipeUsage.tier}
                remainingSearches={userRecipeUsage.remaining}
                dailyLimit={userRecipeUsage.dailyLimit}
                onRecipeSearchClick={handleRecipeSearchClick}
                disabled={recipeSearchLoading}
              />
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center gap-1 text-xs text-muted hover:text-primary transition px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <Plus size={16} />
                {t('chat.newChat')}
              </button>
            </div>

            {/* Text Input and Send Button */}
            <div className="flex justify-between items-center gap-2">
              <TextInput
                className="flex-1 !h-[44px]"
                label={''}
                value={input}
                disable={isLoading}
                placeholder={t('chat.inputPlaceholder')}
                handleInputChange={(value: string | number) => setInput(value)}
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
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
