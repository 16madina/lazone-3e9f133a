import { useDeepLinks } from '@/hooks/useDeepLinks';

/**
 * Component that handles deep links for payment redirects
 * Must be placed inside BrowserRouter
 */
export const DeepLinkHandler = () => {
  useDeepLinks();
  return null;
};
