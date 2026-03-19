import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seoul AI Guide",
  description: "서울의 모든 경험을 AI 에이전트와 함께",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
