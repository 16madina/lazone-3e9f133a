import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useAuth } from '@/hooks/useAuth';

// Pages that have their own header implementation or don't need notification bell
const pagesWithCustomHeader = [
  '/', 
  '/auth', 
  '/verify-email', 
  '/profile',
  '/credits',
  '/my-listings',
  '/settings/edit-profile',
  '/map',
  '/messages'
];

// Pages that should not show the header at all
const pagesWithoutHeader = ['/install'];

export const GlobalHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Don't show on pages with custom headers or without headers
  if (pagesWithCustomHeader.includes(location.pathname) || pagesWithoutHeader.includes(location.pathname)) {
    return null;
  }

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 right-0 z-40 p-3 sm:p-4"
      style={{ 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)'
      }}
    >
      <NotificationDropdown />
    </div>
  );
};
