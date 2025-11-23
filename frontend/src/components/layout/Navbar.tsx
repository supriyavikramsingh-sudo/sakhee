import type { MenuProps } from 'antd';
import { Badge, Dropdown, Space } from 'antd';
import { ChevronDown, LogOut, Menu, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import firestoreService from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';
import Logo from '/images/logo.svg';
import MobileNavbar from './MobileNavbar';

export const Navbar = () => {
  const { t } = useTranslation();
  const { pathname: pathName } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <Link to="/settings" className="text-blue-500">
          {t('nav.settings')}
        </Link>
      ),
      icon: <Settings size={20} />,
    },
    {
      type: 'divider',
    },
    {
      key: '2',
      label: 'Logout',
      onClick: handleSignOut,
      icon: <LogOut size={20} />,
    },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img className="h-12" src={Logo} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            <Link
              to="/chat"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/chat' ? 'text-primaryDark' : ''
              }`}
            >
              {t('nav.chat')}
            </Link>
            <Link
              to="/meals"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/meals' ? 'text-primaryDark' : ''
              }`}
            >
              {t('nav.meals')}
            </Link>
            <Link
              to="/progress"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/progress' ? 'text-primaryDark' : ''
              }`}
            >
              {t('nav.progress')}
            </Link>
            <Link
              to="/reports"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/reports' ? 'text-primaryDark' : ''
              }`}
            >
              {t('nav.reports')}
            </Link>
            <Link
              to="/about"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/about' ? 'text-primaryDark' : ''
              }`}
            >
              About
            </Link>
            <Link
              to="/pricing"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/pricing' || pathName === '/pricing-details' ? 'text-primaryDark' : ''
              }`}
            >
              Pricing
            </Link>
          </div>

          {/* User Menu */}
          <div className="max-sm:hidden flex items-center gap-4">
            <Dropdown menu={{ items }}>
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  {isTestAccount ? (
                    <Badge count={'⭐'} offset={[-35, 2]} color="#fbbc04">
                      <img
                        src={user?.photoURL ?? ''}
                        alt={user?.displayName ?? 'User Avatar'}
                        className="w-8 h-8 rounded-full"
                      />
                    </Badge>
                  ) : (
                    <img
                      src={user?.photoURL ?? ''}
                      alt={user?.displayName ?? 'User Avatar'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}

                  <span className="text-sm">{user?.displayName}</span>
                  <ChevronDown />
                </Space>
              </a>
            </Dropdown>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && <MobileNavbar />}
    </nav>
  );
};

export default Navbar;
