import { Outlet } from 'react-router-dom';
import NavbarCommon from './NavbarCommon';
import Footer from '../common/Footer';

export const LayoutCommon = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        <NavbarCommon />
        <div className="flex-grow">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default LayoutCommon;
