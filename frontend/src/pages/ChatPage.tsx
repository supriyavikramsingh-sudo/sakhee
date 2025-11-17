import { useEffect, useState } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import Navbar from '../components/layout/Navbar';
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ChatInterface userProfile={userProfile} userId={user?.uid ?? ''} />
    </div>
  );
};

export default ChatPage;
