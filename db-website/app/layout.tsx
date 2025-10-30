import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrogDB - Sword & Supper Mission Database",
  description: "Browse and search all Sword & Supper missions. Filterable database with detailed stats for every mission.",
  openGraph: {
    title: "FrogDB - Sword & Supper Mission Database",
    description: "Browse and search all Sword & Supper missions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
