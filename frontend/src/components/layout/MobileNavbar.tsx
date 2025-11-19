import { Badge } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import firestoreService from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';

export const MobileNavbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const [isTestAccount, setIsTestAccount] = useState(false);

  useEffect(() => {
    const checkIsTestUser = async () => {
      if (!user?.email || !user?.uid) return;
      const testAccount = firestoreService.isTestAccount(user.email);
      setIsTestAccount(testAccount);
    };
    checkIsTestUser();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="md:hidden bg-surface absolute h-screen w-screen overflow-hidden p-4 space-y-4">
      <div className="flex justify-center items-center gap-3">
        {isTestAccount ? (
          <Badge count={'⭐'} offset={[-35, 2]} color="#fbbc04">
            <img
              src={user?.photoURL ?? ''}
              alt={user?.displayName ?? 'User Avatar'}
              className="w-10 h-10 rounded-full"
            />
          </Badge>
        ) : (
          <img
            src={user?.photoURL ?? ''}
            alt={user?.displayName ?? 'User Avatar'}
            className="w-10 h-10 rounded-full"
          />
        )}
        <span className="text-xl">{user?.displayName}</span>
      </div>
      <div className="grid justify-center grid-cols-2 gap-4">
        <Link
          to="/settings"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          {t('nav.settings')}
        </Link>
        <Link
          to="/chat"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          {t('nav.chat')}
        </Link>
        <Link
          to="/meals"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          {t('nav.meals')}
        </Link>
        <Link
          to="/progress"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          {t('nav.progress')}
        </Link>
        <Link
          to="/reports"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          {t('nav.reports')}
        </Link>
        <Link
          to="/about"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          About
        </Link>
        <Link
          to="/pricing"
          className="block bg-primaryDark text-white rounded-xl p-4 text-xl text-center hover:underline"
        >
          Pricing
        </Link>
      </div>
      <button onClick={handleSignOut} className="w-full text-xl btn-outline mt-4">
        Logout
      </button>
    </div>
  );
};

export default MobileNavbar;
