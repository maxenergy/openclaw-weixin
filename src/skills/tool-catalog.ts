type ToolCatalogEntry = {
  name: string;
  description: string;
  scope: "core" | "weixin-plugin";
};

const TOOL_QUERY_PATTERNS = [
  /列出.*工具/i,
  /当前.*工具/i,
  /可调用.*工具/i,
  /你有.*工具/i,
  /^工具$/i,
  /^tools?$/i,
  /show tools?/i,
];

const TOOL_CATALOG: ToolCatalogEntry[] = [
  { name: "shell", description: "执行 shell 命令。", scope: "core" },
  { name: "system_run", description: "执行系统命令并返回输出。", scope: "core" },
  { name: "web_search", description: "联网搜索网页并返回标题、链接和摘要。", scope: "core" },
  { name: "fetch_url", description: "抓取指定网页内容供后续分析。", scope: "core" },
  { name: "node_eval", description: "执行短小的 JavaScript 代码。", scope: "core" },
  { name: "sessions", description: "读取或处理当前会话状态。", scope: "core" },
  { name: "weixin_automation", description: "管理微信相关自动化任务，例如截图定时任务。", scope: "weixin-plugin" },
  { name: "cli_anything", description: "安装、查询或接入 CLI-Anything / CLI-Hub 相关能力。", scope: "weixin-plugin" },
  { name: "document_conversion", description: "把收到的文档转换成 PDF 并回传。", scope: "weixin-plugin" },
  { name: "document_presentation", description: "把文档整理并生成 PPTX 文件。", scope: "weixin-plugin" },
];

export function isToolCatalogQuery(text: string): boolean {
  const normalized = text.trim();
  return TOOL_QUERY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getToolCatalogText(): string {
  const grouped = {
    core: TOOL_CATALOG.filter((entry) => entry.scope === "core"),
    plugin: TOOL_CATALOG.filter((entry) => entry.scope === "weixin-plugin"),
  };

  const renderGroup = (title: string, entries: ToolCatalogEntry[]) => [
    `${title}:`,
    ...entries.map((entry) => `- ${entry.name}: ${entry.description}`),
  ];

  return [
    `我当前可调用的工具有 ${TOOL_CATALOG.length} 个。`,
    "",
    ...renderGroup("核心工具", grouped.core),
    "",
    ...renderGroup("微信插件工具", grouped.plugin),
    "",
    "这里只列工具，不包含 skill。要看 skill，请发“列出你现有的技能”。",
  ].join("\n");
}
