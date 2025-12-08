import { Link, useLocation } from 'react-router-dom';
import Logo from '/images/logo.svg';

const Navigation = () => {
  const { pathname } = useLocation();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img className="h-12" src={Logo} alt="AI Sakhee Logo" />
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-6">
            {pathname === '/about' ? (
              <Link
                to="/"
                className="text-gray-700 font-medium hover:text-primary transition px-4 py-2"
              >
                Join Community
              </Link>
            ) : (
              <Link
                to="/about"
                className="text-gray-700 font-medium hover:text-primary transition px-4 py-2"
              >
                About Us
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
