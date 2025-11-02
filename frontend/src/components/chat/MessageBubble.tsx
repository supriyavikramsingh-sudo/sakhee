import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { boldify, formatTimestamp } from '../../utils/helper';
import { feedbackService } from '../../services/feedbackService';
import Typewriter from './Typewriter';
import SakheeAvatar from '/images/sakheeai.svg';
interface MessageBubbleProps {
  message: {
    id?: string | number;
    type: 'user' | 'bot' | 'error' | 'assistant';
    content: string;
    timestamp: any;
    requiresDoctor?: boolean;
    severity?: 'normal' | 'critical';
  };
  userPrompt?: string;
}


const MessageBubble = ({ message, userPrompt }: MessageBubbleProps) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  const { user } = useAuthStore();
  const [isGeneratedCompletly, setIsGeneratedCompletly] = useState(isUser ? true : false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const isAI = message.type === 'bot' || message.type === 'assistant';

  const handleFeedback = async (feedback: 'positive' | 'negative') => {
    console.log('🎯 Feedback button clicked', {
      feedback,
      hasUserId: !!user?.uid,
      hasMessageId: !!message.id,
      hasUserPrompt: !!userPrompt,
      isSubmitting: isSubmittingFeedback,
      messageId: message.id,
      userId: user?.uid
    });

    if (!user?.uid || !message.id || !userPrompt || isSubmittingFeedback) {
      console.warn('⚠️ Feedback submission blocked:', {
        missingUserId: !user?.uid,
        missingMessageId: !message.id,
        missingUserPrompt: !userPrompt,
        alreadySubmitting: isSubmittingFeedback
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      console.log('📤 Submitting feedback...', {
        messageId: message.id.toString(),
        userId: user.uid,
        feedback,
        promptLength: userPrompt.length,
        responseLength: message.content.length
      });

      const result = await feedbackService.submitFeedback({
        messageId: message.id.toString(),
        userId: user.uid,
        userPrompt,
        aiResponse: message.content,
        feedback
      });

      console.log('📥 Feedback submission result:', result);

      if (result.success) {
        console.log('✅ Feedback submitted successfully, updating UI');
        setFeedbackGiven(feedback);
      } else {
        console.error('❌ Failed to submit feedback:', result.error);
      }
    } catch (error) {
      console.error('💥 Error submitting feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className={`flex gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <img src={SakheeAvatar} className="w-8 h-8 rounded-full self-end -mb-4" />}
      <div
        className={`px-4 py-3 rounded-lg ${
          isError
            ? 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
            : isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-surface text-gray-900 rounded-bl-none'
        }`}
      >
        {!isGeneratedCompletly ? (
          <Typewriter text={message.content} setIsGeneratedCompletly={setIsGeneratedCompletly} />
        ) : (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: boldify(message.content),
            }}
          />
        )}
        {message.requiresDoctor && (
          <div className="mt-2 pt-2 border-t border-opacity-30 border-current text-xs">
            🚨{' '}
            {message.severity === 'critical'
              ? 'Seek immediate medical attention'
              : 'Please consult a healthcare professional'}
          </div>
        )}

        <span className="text-xs opacity-70 mt-1 block">{formatTimestamp(message.timestamp)}</span>
        
        {/* Feedback buttons for AI messages */}
        {isAI && isGeneratedCompletly && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-opacity-20 border-current">
            <span className="text-xs opacity-70">Was this helpful?</span>
            <button
              onClick={() => handleFeedback('positive')}
              disabled={isSubmittingFeedback || feedbackGiven !== null}
              className={`p-1 rounded transition-colors ${
                feedbackGiven === 'positive'
                  ? 'text-green-600 bg-green-100'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              } ${isSubmittingFeedback ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title="Thumbs up"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              disabled={isSubmittingFeedback || feedbackGiven !== null}
              className={`p-1 rounded transition-colors ${
                feedbackGiven === 'negative'
                  ? 'text-red-600 bg-red-100'
                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
              } ${isSubmittingFeedback ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title="Thumbs down"
            >
              <ThumbsDown size={14} />
            </button>
            {isSubmittingFeedback && (
              <span className="text-xs opacity-70">Submitting...</span>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <img
          src={user?.photoURL ?? ''}
          alt={user?.displayName ?? 'User Avatar'}
          className="w-8 h-8 rounded-full self-end -mb-4"
        />
      )}
    </div>
  );
};

export default MessageBubble;
