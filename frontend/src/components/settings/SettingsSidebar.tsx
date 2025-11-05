import { Settings, CreditCard } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SettingsSidebarProps {
  activePath?: string;
}

export const SettingsSidebar: FC<SettingsSidebarProps> = ({ activePath }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = activePath || location.pathname;

  const menuItems = [
    {
      id: 'preferences',
      label: 'Preferences',
      icon: Settings,
      path: '/settings/preferences',
    },
    {
      id: 'subscription',
      label: 'Subscription & Billing',
      icon: CreditCard,
      path: '/settings/subscription',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-fit sticky top-24">
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || currentPath.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-pink-50 text-primary font-semibold border-l-4 border-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
