// /app/layout.tsx
import { Inter } from "next/font/google";
import "tailwindcss/tailwind.css";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={inter.className}>{children}</div>;
}
