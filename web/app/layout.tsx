import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Source_Serif_4({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RugBond",
  description: "Lock $wif behind \"I won't sell.\" Break the promise and it burns.",
};

// Every page shows live chain state.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <p className="banner">Testnet demo. Every token here is a mock and has no value.</p>
          <header className="top">
            <Link href="/" className="wordmark">
              RugBond
            </Link>
            <nav aria-label="Main">
              <Link href="/">Bonds</Link>
              <Link href="/bond/new">Post a bond</Link>
              <Link href="/limits">What a bond means</Link>
            </nav>
            <ConnectButton />
          </header>
          <main>{children}</main>
          <footer className="foot">
            <p>
              RugBond is unaudited experimental software. A badge is not a safety rating, investment advice or a guarantee. It
              isn&apos;t affiliated with Robinhood Markets, Inc.
            </p>
            <p>
              <a href="https://github.com/XohamOG/rugbond" target="_blank" rel="noreferrer">
                Source code
              </a>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
