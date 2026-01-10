import { useEffect } from 'react';

const SitemapPage = () => {
  useEffect(() => {
    // Redirect to the sitemap edge function
    const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`;
    
    // Fetch and display the sitemap
    fetch(sitemapUrl)
      .then(response => response.text())
      .then(xml => {
        // Replace the entire document with the XML
        document.open('text/xml');
        document.write(xml);
        document.close();
      })
      .catch(error => {
        console.error('Error fetching sitemap:', error);
      });
  }, []);

  return null;
};

export default SitemapPage;
