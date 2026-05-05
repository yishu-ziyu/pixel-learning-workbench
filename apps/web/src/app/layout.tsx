import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "材料学习转换器",
  description: "把 PDF、报告和课程笔记解析成结构化检索结果，再转换成可以跟着做的学习路径。",
  applicationName: "材料学习转换器",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "材料学习",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "材料学习转换器",
    description: "输入材料，检索结构，转换成可练习的学习路径。",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0f8f78",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Script id="extension-error-filter" strategy="beforeInteractive">
          {`
            (function () {
              function isExtensionError(event) {
                var filename = String(event && event.filename ? event.filename : "");
                var message = String(event && event.message ? event.message : "");
                return filename.indexOf("chrome-extension://") === 0 || message.indexOf("chrome-extension://") >= 0;
              }

              window.addEventListener("error", function (event) {
                if (!isExtensionError(event)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                return true;
              }, true);

              window.addEventListener("unhandledrejection", function (event) {
                var reason = event && event.reason;
                var stack = String(reason && reason.stack ? reason.stack : reason || "");
                if (stack.indexOf("chrome-extension://") < 0) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                return true;
              }, true);
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
