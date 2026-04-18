import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a0a0a" />
      </Head>
      <body style={{ backgroundColor: "#0a0a0a" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
