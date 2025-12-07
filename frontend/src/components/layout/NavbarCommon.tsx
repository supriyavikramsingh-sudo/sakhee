import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '/images/logo.svg';

export const NavbarCommon = () => {
  const navigate = useNavigate();
  const { pathname: pathName } = useLocation();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <Link to="/" className="flex items-center space-x-2">
            <img src={Logo} className="h-12" alt="Sakhee" />
          </Link>

          <div className="hidden md:flex space-x-6">
            <Link
              to="/join"
              className={`text-gray-700 font-medium hover:text-primaryDark transition ${
                pathName === '/join' ? 'text-primaryDark' : ''
              }`}
            >
              Join
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
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="btn-outline">
              Sign in
            </button>
            <a href="/#section2" className="btn-primary">
              Learn More
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarCommon;
