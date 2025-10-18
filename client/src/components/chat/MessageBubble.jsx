import { boldify } from '../../utils/helper';
import { useAuthStore } from '../../store/authStore';
import SakheeAvatar from '../../../public/icons/sakheeai.svg';
import Typewriter from './Typewriter';
import { useState } from 'react';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';

  try {
    // Handle Firestore Timestamp objects
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleTimeString();
    }

    // Handle Firebase Timestamp with seconds
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleTimeString();
    }

    // Handle ISO string or regular Date object
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }

    return '';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

const MessageBubble = ({ message, isLatestMessageFromLLM, setIsLatestMessageFromLLM }) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  const { user } = useAuthStore();
  const [isGeneratedCompletly, setIsGeneratedCompletly] = useState(
    !isLatestMessageFromLLM || isUser ? true : false
  );

  return (
    <div className={`flex gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <img src={SakheeAvatar} className="w-8 h-8 rounded-full self-end -mb-4" />}
      <div
        className={`px-4 py-3 rounded-lg ${
          isError
            ? 'bg-danger bg-opacity-10 text-danger'
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
      </div>
      {isUser && (
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-8 h-8 rounded-full self-end -mb-4"
        />
      )}
    </div>
  );
};

export default MessageBubble;
