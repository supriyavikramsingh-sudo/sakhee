import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../store'
import apiClient from '../../services/apiClient'
import MessageBubble from './MessageBubble'
import SourceCitations from './SourceCitations'
import { Send, Plus, Loader } from 'lucide-react'

const ChatInterface = ({ userProfile, userId }) => {
  const { t } = useTranslation()
  const { messages, addMessage, setLoading, isLoading } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    // Add user message to UI
    addMessage({
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    })

    setInput('')
    setLoading(true)

    try {
      // Send to backend
      const response = await apiClient.chat(input, {
        userId,
        age: userProfile?.age,
        location: userProfile?.location,
        dietaryPreference: userProfile?.dietType,
        goals: userProfile?.goals
      })
      
      // Add assistant message
      addMessage({
        id: Date.now() + 1,
        type: 'assistant',
        content: response.data.message.response,
        sources: response.data?.sources,
        requiresDoctor: response.data?.requiresDoctor,
        severity: response.data?.severity,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      addMessage({
        id: Date.now() + 1,
        type: 'error',
        content: t('chat.errorMessage'),
        timestamp: new Date()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    if (confirm(t('chat.confirmClear'))) {
      // Clear chat
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-8 min-h-96">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-3">
                👋 {t('chat.welcome')}
              </h2>
              <p className="text-muted mb-6 max-w-md">
                {t('chat.welcomeMessage')}
              </p>
              <div className="bg-surface rounded-lg p-6 text-left max-w-md">
                <p className="font-bold text-sm mb-3">💡 {t('chat.tips')}:</p>
                <ul className="text-sm text-muted space-y-2">
                  <li>✓ Ask about PCOS symptoms</li>
                  <li>✓ Request meal suggestions</li>
                  <li>✓ Discuss lifestyle tips</li>
                  <li>✓ Share your health concerns</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            return(
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {msg.sources && msg.sources.length > 0 && (
                <SourceCitations sources={msg.sources} />
              )}
            </div>
          )})
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
  )
}

export default ChatInterface