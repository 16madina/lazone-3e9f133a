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

// Pattern for pages that have their own header (dynamic routes)
const pagesWithCustomHeaderPatterns = [
  /^\/property\/[^/]+$/, // Property detail pages have their own share/favorite buttons
];

// Pages that should not show the header at all
const pagesWithoutHeader = ['/install'];

export const GlobalHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if current path matches a pattern for custom header pages
  const matchesCustomHeaderPattern = pagesWithCustomHeaderPatterns.some(pattern => pattern.test(location.pathname));

  // Don't show on pages with custom headers or without headers
  if (pagesWithCustomHeader.includes(location.pathname) || pagesWithoutHeader.includes(location.pathname) || matchesCustomHeaderPattern) {
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
        paddingTop: 'calc(var(--app-sat) + 12px)',
        paddingRight: 'calc(var(--app-sar) + 12px)'
      }}
    >
      <NotificationDropdown />
    </div>
  );
};
