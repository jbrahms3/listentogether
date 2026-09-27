import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Listen Together",
  description: "A shared listening room — everyone hears the same piece, at the same time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1a1a1a",
          colorBackground: "#F8F6F1",
          colorText: "#1a1a1a",
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      <html lang="en" className={`${serif.variable} ${sans.variable}`}>
        <body className="font-sans bg-paper text-ink min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}
