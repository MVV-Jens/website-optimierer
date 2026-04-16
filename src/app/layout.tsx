import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Website-Optimierer – UX-Analyse & Redesign",
  description:
    "Analysiert Websites nach UX-Heuristiken und generiert ein optimiertes Redesign ohne Designänderungen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded">
          Zum Hauptinhalt springen
        </a>
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="font-bold text-lg tracking-tight hover:text-primary transition-colors">
              🔍 Website-Optimierer
            </Link>
            <nav aria-label="Hauptnavigation">
              <ul className="flex items-center gap-4 text-sm list-none">
                <li>
                  <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                    Neue Analyse
                  </Link>
                </li>
                <li>
                  <Link href="/creations" className="text-muted-foreground hover:text-foreground transition-colors">
                    Kreationen
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="main-content" className="flex-1" role="main">
          {children}
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground" role="contentinfo">
          Website-Optimierer · UX-Analyse ohne Designänderungen
        </footer>
      </body>
    </html>
  );
}
