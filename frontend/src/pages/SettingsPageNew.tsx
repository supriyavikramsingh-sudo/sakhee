import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { SettingsSidebar } from '../components/settings/SettingsSidebar';
import PreferencesSection from '../components/settings/PreferencesSection';
import SubscriptionSection from '../components/settings/SubscriptionSection';

const SettingsPageNew = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-peach-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Settings</h1>
          <p className="text-gray-600">Manage your preferences and subscription</p>
        </div>

        {/* Split Layout */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar - 1/4 width */}
          <div className="md:col-span-1">
            <SettingsSidebar activePath={location.pathname} />
          </div>

          {/* Content Area - 3/4 width */}
          <div className="md:col-span-3">
            <Routes>
              <Route index element={<Navigate to="/settings/preferences" replace />} />
              <Route path="preferences" element={<PreferencesSection />} />
              <Route path="subscription" element={<SubscriptionSection />} />
              <Route path="*" element={<Navigate to="/settings/preferences" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPageNew;
