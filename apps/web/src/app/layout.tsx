import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "像素化深度学习工作台",
  description: "把论文与长文，变成会逼你理解的像素剧情课程。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
