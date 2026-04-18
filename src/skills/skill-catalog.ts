import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SkillSource = "workspace" | "managed" | "bundled" | "extra";

type SkillCatalogEntry = {
  name: string;
  description: string;
  source: SkillSource;
};

const HOME = process.env.HOME || "/tmp";
const REPO_ROOT = fileURLToPath(new URL("../../../../../..", import.meta.url));
const WORKSPACE_SKILLS_DIR = path.join(HOME, ".openclaw", "workspace", "skills");
const MANAGED_SKILLS_DIR = path.join(HOME, ".ravbot", "skills");
const BUNDLED_SKILLS_DIR = "/usr/share/ravbot/skills";
const DEV_SKILLS_DIR = path.join(REPO_ROOT, "ravbot", "skills");

const SOURCE_PRECEDENCE: Record<SkillSource, number> = {
  workspace: 0,
  managed: 1,
  bundled: 2,
  extra: 3,
};

const SKILL_QUERY_PATTERNS = [
  /列出.*技能/i,
  /你有.*技能/i,
  /你会.*技能/i,
  /当前.*技能/i,
  /^技能$/i,
  /^skills?$/i,
  /show skills?/i,
];

function parseFrontmatterValue(frontmatter: string, key: string): string {
  const lines = frontmatter.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = line.match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!match) continue;
    const value = (match[1] ?? "").trim();
    if (value && !/^[>|]/.test(value)) {
      return value.replace(/^['"]|['"]$/g, "");
    }
    if (/^[>|]/.test(value)) {
      const block: string[] = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        const nextLine = lines[next] ?? "";
        if (!/^\s+/.test(nextLine)) break;
        block.push(nextLine.trim());
      }
      return block.join(" ").trim();
    }
    return "";
  }
  return "";
}

function normalizeDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function readSkillEntry(skillDir: string, source: SkillSource): Promise<SkillCatalogEntry | null> {
  const skillFile = path.join(skillDir, "SKILL.md");
  try {
    const raw = await fs.readFile(skillFile, "utf-8");
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch?.[1] ?? "";
    const parsedName = parseFrontmatterValue(frontmatter, "name");
    const parsedDescription = parseFrontmatterValue(frontmatter, "description");
    const name = (parsedName || path.basename(skillDir)).trim();
    const description = normalizeDescription(parsedDescription || "未提供描述。");
    return { name, description, source };
  } catch {
    return null;
  }
}

async function readSkillsFromDir(dirPath: string, source: SkillSource): Promise<SkillCatalogEntry[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const skills = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readSkillEntry(path.join(dirPath, entry.name), source)),
    );
    return skills.filter((entry): entry is SkillCatalogEntry => Boolean(entry));
  } catch {
    return [];
  }
}

function dedupeSkills(entries: SkillCatalogEntry[]): SkillCatalogEntry[] {
  const sorted = [...entries].sort((left, right) => {
    const sourceDelta = SOURCE_PRECEDENCE[left.source] - SOURCE_PRECEDENCE[right.source];
    if (sourceDelta !== 0) return sourceDelta;
    return left.name.localeCompare(right.name);
  });
  const deduped = new Map<string, SkillCatalogEntry>();
  for (const entry of sorted) {
    if (!deduped.has(entry.name)) {
      deduped.set(entry.name, entry);
    }
  }
  return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function isSkillCatalogQuery(text: string): boolean {
  const normalized = text.trim();
  return SKILL_QUERY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function listAvailableSkills(): Promise<SkillCatalogEntry[]> {
  const all = await Promise.all([
    readSkillsFromDir(WORKSPACE_SKILLS_DIR, "workspace"),
    readSkillsFromDir(MANAGED_SKILLS_DIR, "managed"),
    readSkillsFromDir(BUNDLED_SKILLS_DIR, "bundled"),
    readSkillsFromDir(DEV_SKILLS_DIR, "extra"),
  ]);
  return dedupeSkills(all.flat());
}

export async function getSkillCatalogText(): Promise<string> {
  const skills = await listAvailableSkills();
  if (skills.length === 0) {
    return "我当前没有发现可用的 skill。";
  }

  const lines = skills.map((skill) => `- ${skill.name}: ${skill.description}`);
  return [
    `我当前可用的 skill 有 ${skills.length} 个：`,
    ...lines,
    "",
    "这里只列 skill，不包含 shell、web_search、system_run 这类内部工具能力。",
  ].join("\n");
}
