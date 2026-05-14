import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SettingsProvider } from "@/lib/settings-context";
import { DataProvider } from "@/lib/data-context";

export const metadata: Metadata = {
  title: "AgentBench - AI Agent EvalOps Platform",
  description:
    "Regression testing, drift detection, and quality assurance for AI agents. Built with AI coding, for AI coding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex">
        <SettingsProvider>
          <DataProvider>
            <Sidebar />
            <main className="flex-1 ml-60">{children}</main>
          </DataProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
