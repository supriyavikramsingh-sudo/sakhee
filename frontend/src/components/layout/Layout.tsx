import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BackgroundJobBanner from '../common/BackgroundJobBanner';

export const Layout = () => {
  return (
    <>
      <BackgroundJobBanner />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default Layout;
