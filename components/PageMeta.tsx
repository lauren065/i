import Head from 'next/head';

const SITE_URL = 'https://cheolm.in';
const OG_IMAGE = `${SITE_URL}/og.svg`;
const DEFAULT_DESC = 'i · a studio under a domain.';

export function PageMeta({
  title,
  description = DEFAULT_DESC,
  path = '/',
  image = OG_IMAGE,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
}) {
  const fullTitle = title === 'i' ? 'i · cheolm.in' : `${title} · cheolm.in`;
  const url = `${SITE_URL}${path}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:site_name" content="cheolm.in" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
