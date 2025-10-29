import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Logo from '/images/logo.svg';

export const Navbar = () => {
  const { t } = useTranslation();
  const pathName = window.location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto max-sm:px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img className="h-12" src={Logo} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            {user && (
              <>
                <Link
                  to="/chat"
                  className={`text-gray-700 hover:text-primary transition ${
                    pathName === '/chat' ? 'text-primary' : ''
                  }`}
                >
                  {t('nav.chat')}
                </Link>
                <Link
                  to="/meals"
                  className={`text-gray-700 hover:text-primary transition ${
                    pathName === '/meals' ? 'text-primary' : ''
                  }`}
                >
                  {t('nav.meals')}
                </Link>
                <Link
                  to="/progress"
                  className={`text-gray-700 hover:text-primary transition ${
                    pathName === '/progress' ? 'text-primary' : ''
                  }`}
                >
                  {t('nav.progress')}
                </Link>
                <Link
                  to="/reports"
                  className={`text-gray-700 hover:text-primary transition ${
                    pathName === '/reports' ? 'text-primary' : ''
                  }`}
                >
                  {t('nav.reports')}
                </Link>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/settings" className="text-gray-700 hover:text-primary transition">
                  ⚙️ {t('nav.settings')}
                </Link>
              </>
            ) : (
              <Link to="/onboarding" className="btn-primary">
                {t('nav.getStarted')}
              </Link>
            )}

            {/* User Section */}
            {user && (
              <div className="flex items-center gap-3">
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
                <span className="text-sm">{user.displayName}</span>
                <button
                  onClick={handleSignOut}
                  className="text-danger hover:text-opacity-70 transition flex items-center space-x-1"
                >
                  <LogOut size={20} />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface p-4 space-y-3">
          {user && (
            <>
              <Link to="/chat" className="block text-primary hover:underline">
                {t('nav.chat')}
              </Link>
              <Link to="/meals" className="block text-primary hover:underline">
                {t('nav.meals')}
              </Link>
              <Link to="/progress" className="block text-primary hover:underline">
                {t('nav.progress')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
