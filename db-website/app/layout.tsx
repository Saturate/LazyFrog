import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://frogdb.akj.io"),
  title: "FrogDB - Sword & Supper Mission Database",
  description: "Browse and search all Sword & Supper missions. Filterable database with detailed stats for every mission.",
  openGraph: {
    title: "FrogDB - Sword & Supper Mission Database",
    description: "Browse and search all Sword & Supper missions",
    type: "website",
    url: "https://frogdb.akj.io",
    siteName: "FrogDB",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FrogDB - Sword & Supper Mission Database",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
