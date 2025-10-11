const MessageBubble = ({ message }) => {
  const isUser = message.type === 'user'
  const isError = message.type === 'error'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xl px-4 py-3 rounded-lg ${
          isError
            ? 'bg-danger bg-opacity-10 text-danger'
            : isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-surface text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {message.requiresDoctor && (
          <div className="mt-2 pt-2 border-t border-opacity-30 border-current text-xs">
            🚨 {message.severity === 'critical'
              ? 'Seek immediate medical attention'
              : 'Please consult a healthcare professional'}
          </div>
        )}

        <span className="text-xs opacity-70 mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default MessageBubble
