import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head></Head>
      <link rel="icon" href="/favicon.ico" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body
        style={{
          overflow: "hidden",
          position: "relative",
          backgroundColor: "black",
          height: "100vh",
        }}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
