import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useAuth } from '@/hooks/useAuth';

// Pages that have their own header implementation
const pagesWithCustomHeader = ['/', '/auth', '/verify-email'];

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
    <div className="fixed top-0 right-0 z-40 p-3 sm:p-4">
      <NotificationDropdown />
    </div>
  );
};
