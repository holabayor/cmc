import { Sora, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Kingdom Creatives | Creative Create Conference 2026",
  description: "A premier gathering for kingdom media creators, blending spiritual authority with modern creative energy. Equip yourself with state-of-the-art skills to impact the digital frontier at Clemzeal Hall, Uniosun, Osogbo on July 4th, 2026.",
  keywords: [
    "Creative Create Conference 2026",
    "Kingdom Creatives",
    "Osogbo Media Conference",
    "Gospel digital creators",
    "Christian media training",
    "Video production workshop Nigeria",
    "Uniosun Clemzeal Hall event",
  ],
  authors: [{ name: "Creative Create Committee" }],
  creator: "Kingdom Creatives Digital Team",
  publisher: "Kingdom Creatives",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Kingdom Creatives | Creative Create Conference 2026",
    description: "Equipping digital frontier media creators with spiritual authority and modern creative skills. Register now for July 4th, 2026 in Osogbo, Nigeria.",
    url: "https://creativecreate.org", // Placeholder, will match production domain
    siteName: "Creative Create Conference",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kingdom Creatives | Creative Create Conference 2026",
    description: "Equipping digital frontier media creators with spiritual authority and modern creative skills. Register now for July 4th, 2026.",
  },
  alternates: {
    canonical: "https://creativecreate.org",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${hankenGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-all duration-300">
        {children}
      </body>
    </html>
  );
}
