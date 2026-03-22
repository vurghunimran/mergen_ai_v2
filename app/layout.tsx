import type { Metadata } from "next";
import { Merriweather, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700", "800"]
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "MERGEN AI | Verified Research Communities",
  description:
    "Launch AI-generated surveys, connect with verified communities, and turn responses into clear insight reports.",
  icons: {
    icon: "/logo-symbol-orange-hq.svg",
    shortcut: "/logo-symbol-orange-hq.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${merriweather.variable}`}>
      <body className="bg-cream font-body text-black antialiased">{children}</body>
    </html>
  );
}
