'use client';

import Head from 'next/head';

const SeoHelmet = ({ title, description, keywords, canonical, image }) => (
  <Head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    {canonical && <meta property="og:url" content={canonical} />}
    {image && <meta property="og:image" content={image} />}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {image && <meta name="twitter:image" content={image} />}
    {canonical && <link rel="canonical" href={canonical} />}
  </Head>
);

export default SeoHelmet;
