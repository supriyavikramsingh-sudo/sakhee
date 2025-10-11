import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store'
import { Menu, LogOut } from 'lucide-react'
import { useState } from 'react'

export const Navbar = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🌸</span>
            <span className="font-bold text-primary text-lg">Sakhee</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            {user && (
              <>
                <Link to="/chat" className="text-gray-700 hover:text-primary transition">
                  {t('nav.chat')}
                </Link>
                <Link to="/meals" className="text-gray-700 hover:text-primary transition">
                  {t('nav.meals')}
                </Link>
                <Link to="/progress" className="text-gray-700 hover:text-primary transition">
                  {t('nav.progress')}
                </Link>
                <Link to="/reports" className="text-gray-700 hover:text-primary transition">
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
                <button
                  onClick={() => {
                    logout()
                    window.location.href = '/'
                  }}
                  className="text-danger hover:text-opacity-70 transition flex items-center space-x-1"
                >
                  <LogOut size={20} />
                  <span>{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <Link to="/onboarding" className="btn-primary">
                {t('nav.getStarted')}
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
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
  )
}

export default Navbar