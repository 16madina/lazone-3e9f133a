import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://lazoneapp.com';

export const SEOHead = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title 
    ? `${title} | LaZone - Immobilier en Afrique`
    : 'LaZone - Immobilier en Afrique | Achat, Vente, Location';
  
  const defaultDescription = 'Plateforme immobilière panafricaine. Trouvez maisons, appartements, terrains et locaux commerciaux à vendre ou à louer partout en Afrique.';
  const metaDescription = description || defaultDescription;
  
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
  const imageUrl = ogImage || `${BASE_URL}/images/og-image.png`;

  return (
    <Helmet>
      {/* Title */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      
      {/* Description */}
      <meta name="description" content={metaDescription} />
      
      {/* Canonical */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
};
