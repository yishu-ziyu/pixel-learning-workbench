import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "材料学习转换器",
    short_name: "材料学习",
    description: "把 PDF、报告和课程笔记解析成结构化检索结果，再转换成可以跟着做的学习路径。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f2",
    theme_color: "#0f8f78",
    lang: "zh-CN",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
