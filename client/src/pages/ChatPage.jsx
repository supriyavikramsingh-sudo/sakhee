import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfileStore } from '../store';
import Navbar from '../components/layout/Navbar';
import ChatInterface from '../components/chat/ChatInterface';
import MedicalDisclaimer from '../components/chat/MedicalDisclaimer';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { firestoreService } from '../services/firestoreService';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store';

const ChatPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { profile } = useUserProfileStore();
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { addMessage } = useChatStore();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      window.location.href = '/onboarding';
      return;
    }

    // Load disclaimer state
    const acknowledged = localStorage.getItem('disclaimerAcknowledged');
    setDisclaimerAcknowledged(!!acknowledged);
    setPageLoading(false);
  }, [user]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user?.uid) return;

      try {
        const result = await firestoreService.getChatHistory(user.uid);
        console.log('Chat history loaded:', result);

        if (result.success && result.data && Array.isArray(result.data)) {
          // Load all messages at once instead of adding one by one
          result.data.forEach((msg) => addMessage(msg));
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [user?.uid]);

  if (pageLoading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {!disclaimerAcknowledged ? (
        <MedicalDisclaimer
          onAcknowledge={() => {
            localStorage.setItem('disclaimerAcknowledged', 'true');
            setDisclaimerAcknowledged(true);
          }}
        />
      ) : (
        <ChatInterface userProfile={profile} userId={user?.uid} />
      )}
    </div>
  );
};

export default ChatPage;
