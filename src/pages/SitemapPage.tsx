import { useEffect } from 'react';

const SitemapPage = () => {
  useEffect(() => {
    // Redirect directly to the sitemap edge function
    const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`;
    window.location.replace(sitemapUrl);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Chargement du sitemap...</p>
    </div>
  );
};

export default SitemapPage;
