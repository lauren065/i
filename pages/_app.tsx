// pages/_app.tsx
import React, { useState, useEffect } from "react";
import { AppProps } from "next/app";
import { useRouter } from "next/router";

// Import styles
import "../app/globals.css";
import "tailwindcss/tailwind.css";
import RootLayout from "../app/layout";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [previousPath, setPreviousPath] = useState("");
  useEffect(() => {
    setPreviousPath(router.pathname);
  }, [router.pathname]);

  return (
    <div>
      <RootLayout>
        <Component {...pageProps} />
      </RootLayout>
    </div>
  );
}

export default MyApp;
