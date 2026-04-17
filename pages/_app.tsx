import type { AppProps } from 'next/app';
import '../app/globals.css';
import RootLayout from '../app/layout';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RootLayout>
      <Component {...pageProps} />
    </RootLayout>
  );
}
