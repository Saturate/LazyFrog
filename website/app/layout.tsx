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
  metadataBase: new URL('https://lazyfrog.dev'),
  title: "LazyFrog - Automation Bot for Sword & Supper",
  description: "LazyFrog is a Chrome extension that automates Sword & Supper gameplay on Reddit. Features automatic mission finding, customizable choices, smart decisions, and mission analytics. Fully autonomous and runs locally in your browser.",
  keywords: ["LazyFrog", "Sword & Supper", "Reddit", "game automation", "bot", "Chrome extension", "automation tool"],
  authors: [{ name: "Allan Kimmer Jensen", url: "https://github.com/Saturate" }],
  creator: "Allan Kimmer Jensen",
  publisher: "Allan Kimmer Jensen",
  openGraph: {
    title: "LazyFrog - Automation Bot for Sword & Supper",
    description: "Automate your Sword & Supper gameplay with LazyFrog. Automatic mission finding, customizable choices, and smart decisions.",
    url: "https://lazyfrog.dev",
    siteName: "LazyFrog",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LazyFrog - Automation Bot for Sword & Supper",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LazyFrog - Automation Bot for Sword & Supper",
    description: "Automate your Sword & Supper gameplay with LazyFrog. Automatic mission finding, customizable choices, and smart decisions.",
    images: ["/opengraph-image"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
