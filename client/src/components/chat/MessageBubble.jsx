import { boldify } from '../../utils/helper';

const MessageBubble = ({ message }) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  console.log('Rendering message:', message);
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-3 rounded-lg ${
          isError
            ? 'bg-danger bg-opacity-10 text-danger'
            : isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-surface text-gray-900 rounded-bl-none'
        }`}
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: boldify(message.content),
          }}
        />

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
    </div>
  );
};

// Helper function to handle different timestamp formats
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

export default MessageBubble;
