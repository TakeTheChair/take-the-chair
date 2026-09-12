import type { Metadata } from "next";
import "@fontsource/old-standard-tt/400.css";
import "@fontsource/old-standard-tt/400-italic.css";
import "@fontsource/old-standard-tt/700.css";
import "@fontsource/ibm-plex-sans-condensed/400.css";
import "@fontsource/ibm-plex-sans-condensed/500.css";
import "@fontsource/ibm-plex-sans-condensed/600.css";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Outbuy the Chair, pick the stock, print it for every holder. $CHAIR on Robinhood Chain. Not live yet.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Take The Chair ($CHAIR)",
  description,
  openGraph: { title: "Take The Chair", description, siteName: "Take The Chair", type: "website" },
  twitter: { card: "summary_large_image", site: "@TakeTheChair", title: "Take The Chair", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
