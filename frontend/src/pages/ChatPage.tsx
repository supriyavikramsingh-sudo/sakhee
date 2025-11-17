import { useEffect, useState } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

const ChatPage = () => {
  const { user, userProfile } = useAuthStore();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      window.location.href = '/onboarding';
      return;
    }

    setPageLoading(false);
  }, [user]);

  if (pageLoading) {
    return <LoadingSpinner />;
  }

  return <ChatInterface userProfile={userProfile} userId={user?.uid ?? ''} />;
};

export default ChatPage;
