import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Company Tasks",
  description: "Upload and track your team's tasks",
};

// Every page depends on the signed-in user's session and live data, so
// there's nothing to gain from static prerendering — and doing it at build
// time requires a valid NEXTAUTH_URL to be set before the app ever runs.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
