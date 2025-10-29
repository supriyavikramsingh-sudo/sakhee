import { useEffect, useState } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import MedicalDisclaimer from '../components/chat/MedicalDisclaimer';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import Navbar from '../components/layout/Navbar';
import { useAuthStore } from '../store/authStore';

const ChatPage = () => {
  const { user, userProfile } = useAuthStore();
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

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

  if (pageLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen main-bg flex flex-col">
      <Navbar />

      {!disclaimerAcknowledged ? (
        <MedicalDisclaimer
          onAcknowledge={() => {
            localStorage.setItem('disclaimerAcknowledged', 'true');
            setDisclaimerAcknowledged(true);
          }}
        />
      ) : (
        <ChatInterface userProfile={userProfile} userId={user?.uid} />
      )}
    </div>
  );
};

export default ChatPage;
