/**
 * Composant SEO Head pour optimiser le référencement
 * À utiliser avec react-helmet ou similaire
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Atlas Finance - Système de Gestion Comptable SYSCOHADA',
  description = 'Solution ERP complète pour la gestion comptable et financière conforme aux normes SYSCOHADA. Multi-devises, multi-sociétés, avec tableau de bord intelligent.',
  keywords = [
    'ERP',
    'comptabilité',
    'SYSCOHADA',
    'gestion financière',
    'Afrique',
    'XOF',
    'XAF',
    'tableau de bord',
    'multi-devises',
    'OHADA',
  ],
  image = '/images/atlas-finance-og-image.png',
  url = 'https://atlasfinance.com',
  type = 'website',
  author = 'Atlas Finance Team',
  publishedTime,
  modifiedTime,
}) => {
  const fullTitle = title.includes('Atlas Finance') ? title : `${title} | Atlas Finance`;
  const fullUrl = url.startsWith('http') ? url : `https://atlasfinance.com${url}`;
  const fullImage = image.startsWith('http') ? image : `https://atlasfinance.com${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="Atlas Finance" />
      <meta property="og:locale" content="fr_FR" />

      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullImage} />

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Favicon */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Language */}
      <meta httpEquiv="content-language" content="fr" />
      <link rel="alternate" hrefLang="fr" href={fullUrl} />
      <link rel="alternate" hrefLang="en" href={`${fullUrl}/en`} />

      {/* Schema.org for Google */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Atlas Finance',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: description,
          url: fullUrl,
          image: fullImage,
          author: {
            '@type': 'Organization',
            name: 'Atlas Finance',
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'XOF',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150',
          },
        })}
      </script>

      {/* Organization Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Atlas Finance',
          url: 'https://atlasfinance.com',
          logo: `https://atlasfinance.com/logo.png`,
          description: 'Solution ERP pour la gestion d\'entreprise en Afrique',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'CM',
          },
          sameAs: [
            'https://facebook.com/atlasfinance',
            'https://twitter.com/atlasfinance',
            'https://linkedin.com/company/atlasfinance',
          ],
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;
