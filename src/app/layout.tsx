import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "iLOTBET Task Tracker",
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
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
              <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
