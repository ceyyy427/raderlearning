// 站点身份和读者看得到的文案。换成你的行业时，先改这个文件。
// 网页和后端都读它；改完重新构建（docker compose up --build）即可生效。
// 域名不在这里：部署时用环境变量 SITE_URL 设置。

export const SITE = {
  /** 站名：导航、页面标题、分享图、RSS、MCP、后台都用它。 */
  name: "RaderLearning",
  /**
   * 行业词：拼进默认说法里，比如“AI 日报”“AI 动态”。
   * 改成“法律”“HR”“黄金”之类，页面上就会变成“法律日报”“法律动态”。
   */
  subject: "RaderLearning",
  /** 首页的完整标题（浏览器标签、搜索结果）。 */
  homeTitle: "RaderLearning — 开源项目雷达与学习工作区",
  /** 一句话介绍：搜索引擎、分享卡片、RSS、llms.txt 会用。 */
  description: "关注开源项目的真实变化，查看原始证据，完成安全练习，在浏览器本地记录理解与复习。学习什么、学多深，由你自己决定。",
  /** 首页左上角和侧边栏下面的一行小字。 */
  tagline: "从项目变化，到自己的理解",
  /** 界面语言（HTML lang、og:locale）。 */
  locale: "zh-CN",
  /** 默认域名，只在没设置 SITE_URL 时使用。 */
  defaultUrl: "http://localhost:3000",
  /**
   * MCP 工具名的前缀（小写字母、数字、下划线），工具会叫 raderlearning_get_latest、raderlearning_search……
   * 站点发布前确定，公开接入后不要再改。
   */
  mcpPrefix: "raderlearning",
  /** 对外联系邮箱（选填）：使用规则、llms.txt、响应头里会写。 */
  contactEmail: null as string | null,
  /** 页脚的一行小字（选填）。 */
  footerNote: "RaderLearning · 学习的方向与深度，由你决定",
  /** 中国大陆网站的 ICP 备案号（选填），填了就显示在页脚并链接到工信部备案系统。 */
  icp: null as string | null,
  /** 结构化数据里的网站运营者（搜索引擎用）。 */
  organization: {
    name: "RaderLearning",
    /** 创始人（选填）：{ name, url, description }。 */
    founder: null as null | { name: string; url?: string; description?: string },
  },
  /** 抓取信源时报上的名字（User-Agent 里用），不要冒用别的站。 */
  crawlerName: "RaderLearningBot",
} as const;

/** 关于页的文案。数字（信源数、收录数、精选数、日报期数）来自站内实时统计，不用写在这里。 */
export const ABOUT = {
  kicker: `关于 ${SITE.name}`,
  /** 大标题：第一行正常颜色，第二行强调色。 */
  headline: ["从开源项目的真实变化，", "走向自己的理解。"] as [string, string],
  /** 标题下面的一段话。{sources} 会换成实时的信源数。 */
  lead: `${SITE.name} 把项目变化、原始证据、安全练习和本地复习连起来。你选择关注的项目，自己判断理解程度，在当前浏览器保存学习记录；学什么、学多深，由你决定。无需账号。`,
  /** 信源河动画下面的四个环节。 */
  steps: {
    collect: "关注 GitHub Release、Issue、Pull Request、官方文档和 Changelog，发现你所用项目的变化。",
    store: "保存来源链接、抓取时间、内容哈希和原始快照；重复来源归入同一变化，失败与冲突保留明确状态。",
    select: "打开 Change Brief，沿着证据理解变化，再完成代码阅读、Diff 判断或迁移选择练习；不执行用户代码。",
    publish: "在当前浏览器保存变化、练习结果和纯文本笔记，用 Review Card 回到原始事件，重新检查自己的理解。",
  },
  /**
   * 作者块（选填），null 就不显示。
   * avatarSourceId：一个 X 账号信源的 id，头像取它的（选填）。
   * 二维码在后台“设置”里上传，或者放进 industry/brand/contact/；没有二维码就不显示那张卡片。
   */
  maker: null as null | {
    name: string;
    greeting: string[];
    avatarSourceId?: string | null;
    wechat?: { title: string; note: string };
    feishu?: { title: string; note: string };
  },
  /** 页面底部的版权与下架说明（结尾会接“反馈页”的链接）。 */
  copyright: `${SITE.name} 是面向个人开发者的项目雷达与学习工作区，来源内容的版权归原作者所有。如果你是来源方，希望更正、下架或调整展示方式，可以通过`,
} as const;

/** “AI 日报”这类说法：行业词和名词之间，英文词加空格，中文词不加。 */
export function withSubject(noun: string): string {
  return /[A-Za-z0-9]$/.test(SITE.subject) ? `${SITE.subject} ${noun}` : `${SITE.subject}${noun}`;
}

/** “按主题看 AI”“往期 AI 日报”这类说法：行业词接在中文后面，英文词前加空格，中文词不加；noun 照 withSubject 接上。 */
export function subjectAfter(text: string, noun?: string): string {
  const gap = /^[A-Za-z0-9]/.test(SITE.subject) ? " " : "";
  return `${text}${gap}${noun ? withSubject(noun) : SITE.subject}`;
}
