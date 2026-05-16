import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SettingsProvider } from "@/lib/settings-context";
import { DataProvider } from "@/lib/data-context";

export const metadata: Metadata = {
  title: "AgentBench — AI Agent 评测运维平台",
  description:
    "AI Agent 回归测试、漂移检测与质量保障。以 AI 编码为工具，为 AI 编码而构建。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
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
