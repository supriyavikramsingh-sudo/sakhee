import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore, useUserProfileStore } from '../store'
import Navbar from '../components/layout/Navbar'
import ChatInterface from '../components/chat/ChatInterface'
import MedicalDisclaimer from '../components/chat/MedicalDisclaimer'
import { LoadingSpinner } from '../components/layout/LoadingSpinner'
import { firestoreService } from '../services/firestoreService'
import { useAuthStore } from '../store/authStore'

const ChatPage = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { profile } = useUserProfileStore()
  const { messages, isLoading } = useChatStore()
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      window.location.href = '/onboarding'
      return
    }

    // Load disclaimer state
    const acknowledged = localStorage.getItem('disclaimerAcknowledged')
    setDisclaimerAcknowledged(!!acknowledged)
    setPageLoading(false)
  }, [user])

   useEffect(() => {
    if (user) {
      loadChatHistory()
    }
  }, [user])

  const loadChatHistory = async () => {
    const result = await firestoreService.getChatHistory(user.uid)
    if (result.success) {
      setMessages(result.data)
    }
  }

  if (pageLoading) {
    return <LoadingSpinner message={t('common.loading')} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {!disclaimerAcknowledged ? (
        <MedicalDisclaimer
          onAcknowledge={() => {
            localStorage.setItem('disclaimerAcknowledged', 'true')
            setDisclaimerAcknowledged(true)
          }}
        />
      ) : (
        <ChatInterface userProfile={profile} userId={user?.id} />
      )}
    </div>
  )
}

export default ChatPage