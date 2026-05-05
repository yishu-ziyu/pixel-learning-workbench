import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Store Screenshot Preview - 材料学习",
  description: "A static product-page screenshot storyboard for the material learning converter.",
};

const screenshots = [
  {
    eyebrow: "01 INPUT",
    headline: "把 PDF 和长文变成练习路径",
    body: "用户不需要先理解所有功能。第一步只是放入材料，或者打开示例材料。",
    panel: ["打开示例材料", "粘贴论文 / 报告 / 笔记", "当前下一步：解析材料"],
  },
  {
    eyebrow: "02 RETRIEVAL",
    headline: "先检索结构，不急着总结",
    body: "系统抽出论点、证据、关键词和可练习问题，让用户知道它读到了什么。",
    panel: ["4 个结构节点", "8 个关键词", "4 个可练习问题"],
  },
  {
    eyebrow: "03 PATH",
    headline: "把结构转成学习路径",
    body: "学习路径按章节推进，每一步都对应一个具体的理解动作。",
    panel: ["4 章", "13 个学习节点", "预计 26 分钟"],
  },
  {
    eyebrow: "04 PRACTICE",
    headline: "用追问和测验检查理解",
    body: "不只是看摘要。用户需要选择、解释、复盘，并得到下一步反馈。",
    panel: ["Rubric 面向", "关键词线索", "提交本步"],
  },
  {
    eyebrow: "05 REVIEW",
    headline: "学完后自动回访",
    body: "课程结束后生成 D+1、D+3、D+7 回访，让学习结果持续显现。",
    panel: ["D+1 回访", "D+3 强化", "D+7 迁移"],
  },
  {
    eyebrow: "06 MASTERY",
    headline: "看见自己是否真的掌握",
    body: "掌握度、最近反馈和回访状态一起构成继续学习的理由。",
    panel: ["掌握度 72%", "最近一步通过", "下一次回访"],
  },
];

const variants = [
  ["A", "深度阅读", "先看懂材料结构"],
  ["B", "考试练习", "把笔记变成练习"],
  ["C", "研究工作流", "拆论点和证据"],
];

export default function StorePreviewPage() {
  return (
    <main className="store-preview-shell">
      <section className="store-preview-hero">
        <p className="eyebrow">APP STORE CREATIVE KIT</p>
        <h1>材料学习</h1>
        <p>把 PDF、报告和课程笔记解析成结构，再转换成可以跟着做的学习路径。</p>
      </section>

      <section className="store-shot-grid" aria-label="App Store screenshot storyboard">
        {screenshots.map((shot) => (
          <article key={shot.eyebrow} className="store-shot">
            <div className="phone-frame">
              <div className="phone-status" />
              <div className="phone-screen">
                <p className="eyebrow">{shot.eyebrow}</p>
                <h2>{shot.headline}</h2>
                <p>{shot.body}</p>
                <div className="phone-panel">
                  {shot.panel.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="store-variant-band" aria-label="Product page optimization variants">
        <div>
          <p className="eyebrow">PRODUCT PAGE OPTIMIZATION</p>
          <h2>三组产品页实验假设</h2>
        </div>
        <div className="variant-grid">
          {variants.map(([variant, title, promise]) => (
            <article key={variant} className="variant-card">
              <span>{variant}</span>
              <strong>{title}</strong>
              <p>{promise}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
