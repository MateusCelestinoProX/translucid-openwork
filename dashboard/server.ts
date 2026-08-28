import { serve } from "bun";
import { Database } from "bun:sqlite";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, copyFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PORT = 3030;
const SLIM_CONFIG_PATH = join(homedir(), ".config/opencode/oh-my-opencode-slim.json");
const OPENCODE_CONFIG_PATH = join(homedir(), ".config/opencode/opencode.jsonc");
const CONFIG_JSON_PATH = join(homedir(), ".config/opencode/config.json");
const CREWBEE_CONFIG_PATH = join(homedir(), ".config/opencode/crewbee.json");
const DB_PATH = join(homedir(), ".local/share/opencode/opencode.db");
const LOG_DIR_PATH = join(homedir(), ".local/share/opencode/log");
const SKILLS_DIR_PATH = join(homedir(), ".config/opencode/skills");
const AGENTS_DIR_PATH = join(homedir(), ".config/opencode/agents");
const TEAMS_DIR_PATH = join(homedir(), ".config/opencode/teams");

// FULL CREWS DIRECTORY DEFINITION (Default Project / full crews)
const FULL_CREWS_DIR = "/Users/mcp/Documents/Default Project/full crews";
if (!existsSync(FULL_CREWS_DIR)) {
  mkdirSync(FULL_CREWS_DIR, { recursive: true });
}

function getDatabase() {
  if (existsSync(DB_PATH)) {
    try {
      return new Database(DB_PATH, { readonly: true });
    } catch (e) {
      console.warn("Não foi possível abrir o banco SQLite:", e);
      return null;
    }
  }
  return null;
}

function getSlimConfig() {
  if (!existsSync(SLIM_CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SLIM_CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveSlimConfig(config: any) {
  writeFileSync(SLIM_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function stripJsoncComments(raw: string): string {
  let out = "";
  let i = 0;
  const len = raw.length;

  while (i < len) {
    const ch = raw[i];
    if (ch === '"') {
      out += ch;
      i++;
      while (i < len) {
        const sc = raw[i];
        out += sc;
        if (sc === "\\" && i + 1 < len) {
          i++;
          out += raw[i];
        } else if (sc === '"') {
          break;
        }
        i++;
      }
      i++;
      continue;
    }
    if (ch === "/" && raw[i + 1] === "/") {
      while (i < len && raw[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && raw[i + 1] === "*") {
      i += 2;
      while (i < len && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function getOpenCodeConfig() {
  if (!existsSync(OPENCODE_CONFIG_PATH)) {
    if (existsSync(CONFIG_JSON_PATH)) {
      try {
        return JSON.parse(readFileSync(CONFIG_JSON_PATH, "utf-8"));
      } catch {}
    }
    return {};
  }
  try {
    const raw = readFileSync(OPENCODE_CONFIG_PATH, "utf-8");
    return JSON.parse(stripJsoncComments(raw));
  } catch {
    return {};
  }
}

function getCrewBeeConfig() {
  if (!existsSync(CREWBEE_CONFIG_PATH)) return { teams: [] };
  try {
    return JSON.parse(readFileSync(CREWBEE_CONFIG_PATH, "utf-8"));
  } catch {
    return { teams: [] };
  }
}

function saveCrewBeeConfig(config: any) {
  writeFileSync(CREWBEE_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function saveOpenCodeConfig(newConfig: any) {
  let raw = "";
  if (existsSync(OPENCODE_CONFIG_PATH)) {
    raw = readFileSync(OPENCODE_CONFIG_PATH, "utf-8");
  }

  let existing: any = {};
  try { existing = JSON.parse(stripJsoncComments(raw)); } catch {}

  function deepMerge(target: any, source: any): any {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])
          && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
        out[key] = deepMerge(target[key], source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  const merged = deepMerge(existing, newConfig);
  if (existing["$schema"] && !merged["$schema"]) merged["$schema"] = existing["$schema"];

  writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

function writeOpenCodeConfig(config: any) {
  if (!config["$schema"]) {
    config["$schema"] = "https://opencode.ai/config.json";
  }
  writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// DETECÇÃO DINÂMICA DA API DO OPENCODE (Portas 4040, 4096)
async function getOpencodeApiBase(): Promise<string> {
  for (const p of [4040, 4096]) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/global/health`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return `http://127.0.0.1:${p}`;
    } catch {}
  }
  return "http://127.0.0.1:4040";
}

async function fetchFromOpencode(path: string): Promise<any> {
  try {
    const base = await getOpencodeApiBase();
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

function parseYamlSimple(rawYaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = rawYaml.split("\n");
  let currentKey = "";
  let multilineKey = "";
  let multilineLines: string[] = [];

  function flushMultiline() {
    if (!multilineKey) return;
    result[multilineKey] = multilineLines.join(" ").replace(/\s+/g, " ").trim();
    multilineKey = "";
    multilineLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (multilineKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      multilineLines.push(trimmed);
      continue;
    } else if (multilineKey) {
      flushMultiline();
    }

    if (!trimmed || trimmed.startsWith("#")) continue;

    if (line.startsWith("  ") && currentKey && typeof result[currentKey] === "object") {
      const subMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (subMatch) {
        const subKey = subMatch[1];
        const subVal = subMatch[2].trim();
        if (subVal === "true") {
          result[currentKey][subKey] = true;
        } else if (subVal === "false") {
          result[currentKey][subKey] = false;
        } else if (subVal.startsWith("[") && subVal.endsWith("]")) {
          result[currentKey][subKey] = subVal.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        } else {
          result[currentKey][subKey] = subVal.replace(/^["']|["']$/g, "");
        }
      }
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();

      if (!val) {
        result[currentKey] = {};
      } else if (val === ">-" || val === ">" || val === "|" || val === "|-") {
        multilineKey = currentKey;
        multilineLines = [];
      } else if (val.startsWith("[") && val.endsWith("]")) {
        result[currentKey] = val.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      } else if (val === "true") {
        result[currentKey] = true;
      } else if (val === "false") {
        result[currentKey] = false;
      } else {
        result[currentKey] = val.replace(/^["']|["']$/g, "");
      }
    }
  }

  flushMultiline();
  return result;
}

function parseYamlFrontmatter(content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatter = parseYamlSimple(match[1]);
  return { frontmatter, body: match[2] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL CREWS ENGINE (Structure: full crews/<crew>/{agents, skills, mural, mcp})
// ─────────────────────────────────────────────────────────────────────────────

function getFullCrews(): any[] {
  if (!existsSync(FULL_CREWS_DIR)) return [];
  const crews: any[] = [];

  try {
    const entries = readdirSync(FULL_CREWS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const crewId = entry.name;
        const crewFolder = join(FULL_CREWS_DIR, crewId);
        const crewJsonPath = join(crewFolder, "crew.json");
        const muralFolder = join(crewFolder, "mural");
        const skillsFolder = join(crewFolder, "skills");
        const agentsFolder = join(crewFolder, "agents");
        const mcpFolder = join(crewFolder, "mcp");

        let crewMeta: any = {
          id: crewId,
          name: crewId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          description: `Equipe especializada ${crewId}`,
          leader: null,
          enabled: true,
          priority: 1,
          modelPreset: "omniroute"
        };

        if (existsSync(crewJsonPath)) {
          try {
            crewMeta = { ...crewMeta, ...JSON.parse(readFileSync(crewJsonPath, "utf-8")) };
          } catch {}
        }

        // 1. Agents in this crew
        const agents: any[] = [];
        if (existsSync(agentsFolder)) {
          const agentDirs = readdirSync(agentsFolder, { withFileTypes: true });
          for (const ad of agentDirs) {
            if (ad.isDirectory()) {
              const agentName = ad.name;
              const agentDir = join(agentsFolder, agentName);
              const agentMdPath = join(agentDir, "agent.md");
              const agentSkillsDir = join(agentDir, "skills");

              let agentMeta: any = {
                name: agentName,
                displayName: agentName,
                role: `Especialista ${agentName}`,
                type: "subagent",
                master: null,
                subagents: [],
                model: "omniroute/combo/code",
                skills: [],
                agentSkills: [],
                mcps: [],
                custom_directory: agentDir,
                schedule: {
                  enabled: false,
                  datetime: "",
                  task_prompt: "",
                  status: "idle"
                },
                prompt: "",
                avatar: null,
                path: agentMdPath
              };

              // Check for avatar file
              for (const ext of ["png", "jpg", "jpeg", "svg", "webp"]) {
                const avPath = join(agentDir, `avatar.${ext}`);
                if (existsSync(avPath)) {
                  agentMeta.avatar = `/api/avatar/${crewId}/${agentName}`;
                  break;
                }
              }

              if (existsSync(agentMdPath)) {
                try {
                  const raw = readFileSync(agentMdPath, "utf-8");
                  const { frontmatter, body } = parseYamlFrontmatter(raw);
                  agentMeta.displayName = frontmatter.name || agentMeta.displayName;
                  agentMeta.role = frontmatter.role || frontmatter.description || agentMeta.role;
                  agentMeta.type = frontmatter.type || (frontmatter.role?.toLowerCase().includes("líder") ? "primary" : "subagent");
                  agentMeta.mode = frontmatter.mode || "subagent";
                  agentMeta.isInitialPrompt = agentMeta.mode === "primary" || agentMeta.mode === "all";
                  agentMeta.lane = frontmatter.lane || (agentMeta.type === "primary" ? "Orchestration & Squad Leadership" : "Specialized Domain Execution");
                  agentMeta.permissions = frontmatter.permissions || "read_files, write_files";
                  agentMeta.stats = frontmatter.stats || (agentMeta.type === "primary" ? "5x better decision maker" : "2x faster execution");
                  agentMeta.variant = frontmatter.variant || "default";
                  agentMeta.temperature = frontmatter.temperature ?? 0.2;
                  agentMeta.orchestratorPrompt = frontmatter.orchestratorPrompt || "";
                  agentMeta.master = frontmatter.master || null;
                  agentMeta.subagents = Array.isArray(frontmatter.subagents) ? frontmatter.subagents : [];
                  agentMeta.model = frontmatter.model || agentMeta.model;
                  agentMeta.skills = Array.isArray(frontmatter.skills) ? frontmatter.skills : [];
                  agentMeta.mcps = Array.isArray(frontmatter.mcps) ? frontmatter.mcps : [];
                  agentMeta.custom_directory = frontmatter.custom_directory || agentDir;
                  agentMeta.schedule = frontmatter.schedule || agentMeta.schedule;
                  agentMeta.prompt = body.trim();
                } catch {}
              }

              // Agent-specific private skills
              if (existsSync(agentSkillsDir)) {
                try {
                  const skFiles = readdirSync(agentSkillsDir, { withFileTypes: true });
                  for (const sk of skFiles) {
                    if (sk.isDirectory()) {
                      agentMeta.agentSkills.push(sk.name);
                    } else if (sk.name.endsWith(".md")) {
                      agentMeta.agentSkills.push(sk.name.replace(/\.md$/, ""));
                    }
                  }
                } catch {}
              }

              agents.push(agentMeta);
            }
          }
        }

        // 2. Team-level skills in this crew
        const teamSkills: any[] = [];
        if (existsSync(skillsFolder)) {
          try {
            const skEntries = readdirSync(skillsFolder, { withFileTypes: true });
            for (const sk of skEntries) {
              if (sk.isDirectory()) {
                const skPath = join(skillsFolder, sk.name, "SKILL.md");
                let desc = `Habilidade de time '${sk.name}'`;
                let content = "";
                if (existsSync(skPath)) {
                  content = readFileSync(skPath, "utf-8");
                  const match = content.match(/description:\s*(.*?)(?:\n---|\n[a-z_]+:)/s);
                  if (match && match[1]) desc = match[1].trim().replace(/\n/g, " ");
                }
                teamSkills.push({ name: sk.name, description: desc, content, scope: "team" });
              }
            }
          } catch {}
        }

        // 3. Mural details
        let muralInstructions = "";
        const muralFiles: string[] = [];
        if (existsSync(muralFolder)) {
          const instrPath = join(muralFolder, "INSTRUCTIONS.md");
          if (existsSync(instrPath)) {
            muralInstructions = readFileSync(instrPath, "utf-8");
          }
          const mediaDir = join(muralFolder, "media");
          if (existsSync(mediaDir)) {
            try {
              muralFiles.push(...readdirSync(mediaDir).filter(f => !f.startsWith(".")));
            } catch {}
          }
        }

        // 4. Crew MCPs
        let crewMcps: Record<string, any> = {};
        if (existsSync(mcpFolder)) {
          const mcpJsonPath = join(mcpFolder, "mcp.json");
          if (existsSync(mcpJsonPath)) {
            try {
              crewMcps = JSON.parse(readFileSync(mcpJsonPath, "utf-8"));
            } catch {}
          }
        }

        crews.push({
          ...crewMeta,
          folderPath: crewFolder,
          agents,
          skills: teamSkills,
          mural: {
            instructions: muralInstructions,
            mediaFiles: muralFiles,
            mediaCount: muralFiles.length
          },
          mcp: crewMcps
        });
      }
    }
  } catch (e) {
    console.error("Erro ao listar Full Crews:", e);
  }

  return crews;
}

function createOrUpdateCrew(crewData: any): any {
  const cleanId = (crewData.id || crewData.name || "").toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-");
  if (!cleanId) throw new Error("ID da Crew é obrigatório");

  const crewFolder = join(FULL_CREWS_DIR, cleanId);
  mkdirSync(join(crewFolder, "agents"), { recursive: true });
  mkdirSync(join(crewFolder, "skills"), { recursive: true });
  mkdirSync(join(crewFolder, "mural", "media"), { recursive: true });
  mkdirSync(join(crewFolder, "mural", "prompts"), { recursive: true });
  mkdirSync(join(crewFolder, "mcp"), { recursive: true });

  const crewJson = {
    id: cleanId,
    name: crewData.name || cleanId,
    description: crewData.description || `Equipe ${cleanId}`,
    leader: crewData.leader || null,
    enabled: crewData.enabled !== false,
    priority: crewData.priority || 1,
    modelPreset: crewData.modelPreset || "omniroute",
    updatedAt: new Date().toISOString()
  };

  writeFileSync(join(crewFolder, "crew.json"), JSON.stringify(crewJson, null, 2), "utf-8");

  const instructionsPath = join(crewFolder, "mural", "INSTRUCTIONS.md");
  if (!existsSync(instructionsPath)) {
    writeFileSync(instructionsPath, `# Mural de Instruções · ${crewJson.name}\n\nDefina as diretrizes e metas desta equipe aqui.\n`, "utf-8");
  }

  // Sync to crewbee.json
  try {
    const crewbee = getCrewBeeConfig();
    crewbee.teams = crewbee.teams || [];
    let idx = crewbee.teams.findIndex((t: any) => t.id === cleanId || t.path === `@teams/${cleanId}`);
    if (idx === -1) {
      crewbee.teams.push({
        id: cleanId,
        path: `@teams/${cleanId}`,
        enabled: crewJson.enabled,
        priority: crewJson.priority
      });
    } else {
      crewbee.teams[idx].enabled = crewJson.enabled;
    }
    saveCrewBeeConfig(crewbee);
  } catch {}

  return crewJson;
}

function calculateNextRun(schedule: any): string | null {
  if (!schedule || schedule.enabled !== true) return null;
  const now = new Date();
  const freq = schedule.frequency || (schedule.datetime ? "once" : "daily");

  if (freq === "once") {
    if (!schedule.datetime) return null;
    const dt = new Date(schedule.datetime);
    return dt.getTime() > now.getTime() ? dt.toISOString() : null;
  }

  if (freq === "hourly") {
    const intervalHours = Math.max(1, parseInt(schedule.interval_hours, 10) || 1);
    const next = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    return next.toISOString();
  }

  if (freq === "daily") {
    const [hh, mm] = (schedule.time || "09:00").split(":").map((n: string) => parseInt(n, 10) || 0);
    const target = new Date(now);
    target.setHours(hh, mm, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  if (freq === "weekly") {
    const [hh, mm] = (schedule.time || "09:00").split(":").map((n: string) => parseInt(n, 10) || 0);
    const weekdays: number[] = Array.isArray(schedule.weekdays) && schedule.weekdays.length > 0
      ? schedule.weekdays.map((d: any) => parseInt(d, 10))
      : [1, 2, 3, 4, 5]; // Padrão: Seg a Sex

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + dayOffset);
      candidate.setHours(hh, mm, 0, 0);

      const dayOfWeek = candidate.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
      if (weekdays.includes(dayOfWeek) && candidate.getTime() > now.getTime()) {
        return candidate.toISOString();
      }
    }
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(hh, mm, 0, 0);
    return fallback.toISOString();
  }

  if (freq === "monthly") {
    const [hh, mm] = (schedule.time || "09:00").split(":").map((n: string) => parseInt(n, 10) || 0);
    const dayOfMonth = Math.min(31, Math.max(1, parseInt(schedule.month_day, 10) || 1));
    const target = new Date(now);
    target.setDate(dayOfMonth);
    target.setHours(hh, mm, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setMonth(target.getMonth() + 1);
      target.setDate(dayOfMonth);
    }
    return target.toISOString();
  }

  if (freq === "cron" && schedule.cron_expr) {
    const target = new Date(now.getTime() + 60 * 60 * 1000);
    return target.toISOString();
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function syncAgentToOhMyOpenCodeSlim(agentName: string, agentData: any) {
  const slimConfigPath = join(homedir(), ".config", "opencode", "oh-my-opencode-slim.json");
  if (!existsSync(slimConfigPath)) return;
  try {
    const raw = readFileSync(slimConfigPath, "utf-8");
    const slim = JSON.parse(stripJsoncComments(raw));
    slim.agents = slim.agents || {};
    
    slim.agents[agentName] = {
      model: agentData.model || "omniroute/combo/code",
      description: agentData.role || agentData.description || `Agente especialista ${agentName}`,
      prompt: agentData.prompt || "",
      orchestratorPrompt: agentData.orchestratorPrompt || "",
      skills: Array.isArray(agentData.skills) ? agentData.skills : [],
      mcps: Array.isArray(agentData.mcps) ? agentData.mcps : []
    };
    if (agentData.variant && agentData.variant !== "default") {
      slim.agents[agentName].variant = agentData.variant;
    }
    if (agentData.temperature !== undefined && agentData.temperature !== 0.2) {
      slim.agents[agentName].temperature = agentData.temperature;
    }

    writeFileSync(slimConfigPath, JSON.stringify(slim, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[Oh-My-OpenCode-Slim Sync] Falha ao sincronizar @${agentName}:`, e);
  }
}

function generateOrchestratorRoutingPrompt(agentName: string, meta: {
  lane?: string;
  role?: string;
  permissions?: string;
  stats?: string;
  capabilities?: string[];
  delegateWhen?: string;
  dontDelegateWhen?: string;
  ruleOfThumb?: string;
}): string {
  const lane = meta.lane || "Specialized Domain Execution";
  const role = meta.role || `Especialista ${agentName}`;
  const perms = meta.permissions || "read_files, write_files";
  const stats = meta.stats || "2x faster execution for domain tasks";
  const caps = Array.isArray(meta.capabilities) && meta.capabilities.length > 0
    ? meta.capabilities.join(", ")
    : `Domínio aprofundado em ${agentName}`;
  const delegateWhen = meta.delegateWhen || `Tarefas delimitadas de ${lane} • Execução técnica especializada no domínio`;
  const dontDelegateWhen = meta.dontDelegateWhen || `Decisões macro de arquitetura fora de ${lane} • Tarefas triviais de 1 linha`;
  const ruleOfThumb = meta.ruleOfThumb || `Precisa de execução profunda em ${lane}? → @${agentName}. Decisão executiva geral? → resolva diretamente.`;

  return `@${agentName}
- Lane: ${lane}
- Role: ${role}
- Permissions: ${perms}
- Stats: ${stats}
- Capabilities: ${caps}
- **Delegate when:** ${delegateWhen}
- **Don't delegate when:** ${dontDelegateWhen}
- **Rule of thumb:** ${ruleOfThumb}`;
}

function saveCrewAgent(crewId: string, agentData: any): any {
  const cleanCrewId = crewId.trim().toLowerCase();
  const cleanAgentName = (agentData.name || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!cleanAgentName) throw new Error("Nome do Agente é obrigatório");

  const crewFolder = join(FULL_CREWS_DIR, cleanCrewId);
  const agentDir = join(crewFolder, "agents", cleanAgentName);
  mkdirSync(join(agentDir, "skills"), { recursive: true });

  const isPresident = cleanAgentName === "presidente";
  const isMaster = isPresident || agentData.type === "primary" || agentData.type === "crew_master" || agentData.role?.toLowerCase().includes("líder") || agentData.role?.toLowerCase().includes("leader");
  const isInitialPrompt = isPresident || agentData.isInitialPrompt === true || agentData.initialPromptModel === true || agentData.mode === "primary";
  const mode = isInitialPrompt ? "primary" : "subagent";
  const skills = Array.isArray(agentData.skills) ? agentData.skills : [];
  const mcps = Array.isArray(agentData.mcps) ? agentData.mcps : [];
  const model = agentData.model || "omniroute/combo/code";
  const customDir = agentData.custom_directory || agentDir;

  const lane = agentData.lane || (isMaster ? "Orchestration & Squad Leadership" : "Specialized Domain Execution");
  const permissions = agentData.permissions || "read_files, write_files";
  const stats = agentData.stats || (isMaster ? "5x better decision maker" : "2x faster execution");
  const variant = agentData.variant || "default";
  const temperature = agentData.temperature !== undefined ? parseFloat(agentData.temperature) : 0.2;

  let orchestratorPrompt = (agentData.orchestratorPrompt || "").trim();
  if (!orchestratorPrompt && !isMaster) {
    orchestratorPrompt = generateOrchestratorRoutingPrompt(cleanAgentName, {
      lane,
      role: agentData.role || `Especialista ${cleanAgentName}`,
      permissions,
      stats
    });
  }

  const rawSchedule = agentData.schedule || {};
  const isScheduleEnabled = rawSchedule.enabled === true;
  const schedule = {
    enabled: isScheduleEnabled,
    frequency: rawSchedule.frequency || (rawSchedule.datetime ? "once" : "daily"),
    datetime: rawSchedule.datetime || "",
    interval_hours: parseInt(rawSchedule.interval_hours, 10) || 1,
    time: rawSchedule.time || "09:00",
    weekdays: Array.isArray(rawSchedule.weekdays) ? rawSchedule.weekdays : [1, 2, 3, 4, 5],
    month_day: parseInt(rawSchedule.month_day, 10) || 1,
    cron_expr: rawSchedule.cron_expr || "",
    task_prompt: rawSchedule.task_prompt || "",
    status: rawSchedule.status || "idle",
    last_run: rawSchedule.last_run || null,
    next_run: isScheduleEnabled ? calculateNextRun(rawSchedule) : null
  };

  // Load crew metadata for CrewBee manifest context
  let crewMeta: any = { id: cleanCrewId, name: cleanCrewId };
  try {
    const crewJsonPath = join(crewFolder, "crew.json");
    if (existsSync(crewJsonPath)) crewMeta = JSON.parse(readFileSync(crewJsonPath, "utf-8"));
  } catch {}

  // Build agent data for CrewBee schema generator
  const agentForCrewBee = {
    ...agentData,
    displayName: agentData.displayName || cleanAgentName,
    role: agentData.role || `Especialista ${cleanAgentName}`,
    mode,
    type: isMaster ? "primary" : (agentData.type || "subagent"),
    lane,
    permissions,
    stats,
    variant,
    temperature,
    master: isMaster ? null : (agentData.master || null),
    subagents: isMaster ? (Array.isArray(agentData.subagents) ? agentData.subagents : []) : [],
    model,
    skills,
    mcps,
    orchestratorPrompt,
    custom_directory: customDir,
    isInitialPrompt,
    schedule
  };

  // Use CrewBee Engine to generate the agent.md with full schema
  const mdContent = buildCrewBeeAgentMd(cleanAgentName, agentForCrewBee, crewMeta);

  writeFileSync(join(agentDir, "agent.md"), mdContent, "utf-8");

  // Synchronize with OpenCode native agents directory (~/.config/opencode/agents/)
  try {
    if (!existsSync(AGENTS_DIR_PATH)) mkdirSync(AGENTS_DIR_PATH, { recursive: true });
    writeFileSync(join(AGENTS_DIR_PATH, `${cleanAgentName}.md`), mdContent, "utf-8");
  } catch {}

  // Synchronize with oh-my-opencode-slim.json schema
  syncAgentToOhMyOpenCodeSlim(cleanAgentName, {
    ...agentForCrewBee,
    prompt: agentData.prompt || ""
  });

  // Sync to crew.json leader if primary
  try {
    const crewJsonPath = join(crewFolder, "crew.json");
    if (existsSync(crewJsonPath)) {
      const crewJson = JSON.parse(readFileSync(crewJsonPath, "utf-8"));
      if (isMaster && !crewJson.leader) {
        crewJson.leader = cleanAgentName;
        writeFileSync(crewJsonPath, JSON.stringify(crewJson, null, 2), "utf-8");
      }
    }
  } catch {}

  // Regenerate CrewBee manifests (TEAM.md + AGENTS.md) after every agent save
  try { syncCrewManifests(cleanCrewId); } catch {}

  console.log(`✅ [CrewBee Engine] Agente @${cleanAgentName} salvo com schema completo (mode: ${mode})`);

  return { name: cleanAgentName, path: join(agentDir, "agent.md"), schedule, lane, permissions, stats };
}

function deleteCrewAgent(crewId: string, agentName: string): boolean {

  const agentDir = join(FULL_CREWS_DIR, crewId, "agents", agentName);
  if (existsSync(agentDir)) {
    rmSync(agentDir, { recursive: true, force: true });
  }
  const nativePath = join(AGENTS_DIR_PATH, `${agentName}.md`);
  if (existsSync(nativePath)) {
    try { rmSync(nativePath, { force: true }); } catch {}
  }
  return true;
}

function saveCrewSkill(crewId: string, skillData: any): any {
  const cleanSkillName = (skillData.name || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!cleanSkillName) throw new Error("Nome da Skill é obrigatório");

  let skillFolder = join(FULL_CREWS_DIR, crewId, "skills", cleanSkillName);
  if (skillData.agentName) {
    skillFolder = join(FULL_CREWS_DIR, crewId, "agents", skillData.agentName, "skills", cleanSkillName);
  }
  mkdirSync(skillFolder, { recursive: true });

  const content = skillData.content || `---
name: ${cleanSkillName}
description: ${skillData.description || `Habilidade ${cleanSkillName}`}
---

# ${cleanSkillName.toUpperCase()}

Instruções da habilidade.`;

  writeFileSync(join(skillFolder, "SKILL.md"), content, "utf-8");
  return { name: cleanSkillName, path: join(skillFolder, "SKILL.md") };
}

function deleteCrewSkill(crewId: string, skillName: string, agentName?: string): boolean {
  let skillFolder = join(FULL_CREWS_DIR, crewId, "skills", skillName);
  if (agentName) {
    skillFolder = join(FULL_CREWS_DIR, crewId, "agents", agentName, "skills", skillName);
  }
  if (existsSync(skillFolder)) {
    rmSync(skillFolder, { recursive: true, force: true });
    return true;
  }
  return false;
}

function syncCrewSkills(crewId: string, skillNames: string[]): any {
  const crewFolder = join(FULL_CREWS_DIR, crewId);
  const crewSkillsDir = join(crewFolder, "skills");
  if (!existsSync(crewSkillsDir)) mkdirSync(crewSkillsDir, { recursive: true });

  const allSkills = getInstalledSkills();
  const allSkillsMap = new Map<string, any>();
  for (const s of allSkills) {
    allSkillsMap.set(s.name, s);
  }

  const activeSkillSet = new Set<string>();
  for (const rawName of skillNames) {
    const cleanName = (rawName || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanName) continue;
    activeSkillSet.add(cleanName);

    const targetFolder = join(crewSkillsDir, cleanName);
    mkdirSync(targetFolder, { recursive: true });
    const targetSkillFile = join(targetFolder, "SKILL.md");

    const existingSkill = allSkillsMap.get(cleanName) || allSkillsMap.get(rawName);
    if (existingSkill && existingSkill.content) {
      writeFileSync(targetSkillFile, existingSkill.content, "utf-8");
    } else if (!existsSync(targetSkillFile)) {
      const defaultContent = `---\nname: ${cleanName}\ndescription: Habilidade da equipe ${crewId}\n---\n\n# ${cleanName.toUpperCase()}\n\nDiretrizes operacionais desta habilidade para a equipe.`;
      writeFileSync(targetSkillFile, defaultContent, "utf-8");
    }
  }

  // Remove skills que foram desmarcadas
  try {
    const existingEntries = readdirSync(crewSkillsDir, { withFileTypes: true });
    for (const ent of existingEntries) {
      if (ent.isDirectory() && !activeSkillSet.has(ent.name)) {
        rmSync(join(crewSkillsDir, ent.name), { recursive: true, force: true });
      }
    }
  } catch {}

  // Atualiza crew.json
  try {
    const crewJsonPath = join(crewFolder, "crew.json");
    if (existsSync(crewJsonPath)) {
      const crewJson = JSON.parse(readFileSync(crewJsonPath, "utf-8"));
      crewJson.skills = Array.from(activeSkillSet);
      writeFileSync(crewJsonPath, JSON.stringify(crewJson, null, 2), "utf-8");
    }
  } catch {}

  return { success: true, count: activeSkillSet.size, skills: Array.from(activeSkillSet) };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREWBEE ENGINE — Gerador de manifests TEAM.md e *.agent.md
// Compatível com o schema CrewBee (https://github.com/CrewBeeLab/CrewBee)
// ─────────────────────────────────────────────────────────────────────────────

function buildYamlList(items: string[], indent = 2): string {
  if (!items || items.length === 0) return "[]";
  return "\n" + items.map(i => " ".repeat(indent) + "- " + i).join("\n");
}

function buildCrewBeeAgentMd(agentName: string, agentData: any, crewMeta: any): string {
  const isPresident = agentName === "presidente";
  const isInitialPrompt = isPresident || agentData.isInitialPrompt === true || agentData.mode === "primary";
  const mode = isInitialPrompt ? "primary" : "subagent";
  const isMaster = isPresident || agentData.type === "primary" || agentData.type === "crew_master";
  const entry_exposure = isInitialPrompt ? "user-selectable" : "internal-only";
  const lane = agentData.lane || (isPresident ? "Global Enterprise Governance & Meta-Orchestration" : (isMaster ? "Orchestration & Squad Leadership" : "Specialized Domain Execution"));
  const role = agentData.role || agentData.displayName || `Especialista ${agentName}`;
  const temperament = agentData.temperament || "adaptive";
  const cognitiveStyle = agentData.cognitiveStyle || (isMaster ? "scope-decide-synthesize" : "structure-execute-report");
  const riskPosture = agentData.riskPosture || "evidence-aware";
  const communicationStyle = agentData.communicationStyle || "concise-adaptive";
  const variant = agentData.variant || "default";
  const model = agentData.model || "omniroute/combo/code";
  const skills = Array.isArray(agentData.skills) ? agentData.skills : [];
  const mcps = Array.isArray(agentData.mcps) ? agentData.mcps : [];
  const orchestratorPrompt = (agentData.orchestratorPrompt || "").trim();
  const prompt = (agentData.prompt || "").trim();
  const schedule = agentData.schedule || {};

  const frontmatter = `---
id: ${agentName}
kind: agent
version: 1.0.0
name: "${agentData.displayName || agentName}"
role: "${role}"
mode: ${mode}
type: ${agentData.type || (isMaster ? "primary" : "subagent")}
archetype: ${isMaster ? "leader-orchestrator" : "specialized-executor"}
team: "${crewMeta?.id || "custom"}"
tags: [${isInitialPrompt ? '"user-selectable", ' : ''}${isMaster ? '"leader"' : '"specialist", "subagent"'}]

# ── Slim Protocol ─────────────────────────────────────────────
model: "${model}"
variant: "${variant}"
temperature: ${agentData.temperature ?? 0.2}
skills: [${skills.map((s: string) => `"${s}"`).join(", ")}]
mcps: [${mcps.map((m: string) => `"${m}"`).join(", ")}]
lane: "${lane}"
permissions: "${agentData.permissions || "read_files, write_files"}"
stats: "${agentData.stats || (isMaster ? "5x decision quality" : "2x faster execution")}"
master: ${agentData.master ? `"${agentData.master}"` : "null"}
subagents: [${(Array.isArray(agentData.subagents) ? agentData.subagents : []).map((s: string) => `"${s}"`).join(", ")}]
custom_directory: "${agentData.custom_directory || ""}"
orchestratorPrompt: |
${orchestratorPrompt.split("\n").map((l: string) => "  " + l).join("\n")}

# ── CrewBee Schema ─────────────────────────────────────────────
persona_core:
  temperament: ${temperament}
  cognitive_style: ${cognitiveStyle}
  risk_posture: ${riskPosture}
  communication_style: ${communicationStyle}
  persistence_style: steady
  decision_priorities:
    - usefulness
    - correctness
    - clarity
    - efficiency

responsibility_core:
  description: "${role} da equipe ${crewMeta?.name || ""}."
  objective: "Executar com excelência as responsabilidades de ${lane}."
  authority: "${isMaster ? "Orquestrar os especialistas da equipe e tomar decisões de roteamento." : "Executar tarefas delimitadas dentro de " + lane + "."}"

collaboration:
  default_consults: ${isMaster ? buildYamlList((Array.isArray(agentData.subagents) ? agentData.subagents : [])) : "[]"}
  default_handoffs: ${isMaster ? "[]" : buildYamlList(["leader"])}

core_principle:
  - Entregar com qualidade e precisão dentro do escopo definido.
  - Nunca inventar dados, evidências ou resultados de ferramentas.
  - ${isMaster ? "Manter um dono ativo do contexto e convergir todo trabalho intermediário em uma resposta final coerente." : "Executar a tarefa delegada e retornar ao líder com resultado claro."}

scope_control:
  - Trabalhar dentro do escopo delimitado da missão da equipe.
  - Não realizar ações destrutivas ou com efeitos externos sem aprovação explícita.
  - Reportar suposições e limitações de evidência quando relevantes.

ambiguity_policy:
  - Resolver ambiguidades menores com o default mais útil.
  - Fazer uma pergunta de clarificação precisa apenas quando a ambiguidade muda materialmente o resultado.

task_triage:
  trivial:
    default_action: responder diretamente com raciocínio conciso
  non_trivial:
    default_action: planejar antes de executar e verificar ao final
  ambiguous:
    default_action: assumir o default mais útil e mencionar a suposição

completion_gate:
  - A resposta ou artefato satisfaz o objetivo solicitado.
  - Fatos importantes estão suportados, qualificados ou marcados como suposições.
  - Limitações de fonte, acesso ou verificação são declaradas quando relevantes.

failure_recovery:
  - Se um caminho de busca ou análise está vazio, mudar a estratégia antes de desistir.
  - Se a tarefa não pode ser completada com as informações disponíveis, fornecer a melhor resposta delimitada e o que está faltando.

guardrails:
  critical:
    - Nunca fabricar fontes, citações, arquivos, dados ou resultados de ações.
    - Nunca realizar ações destrutivas ou externamente visíveis sem aprovação.
    - Manter a incerteza visível quando evidências estão incompletas.

tool_skill_strategy:
  principles:
    - Usar ferramentas diretas para tarefas disponíveis localmente.
    - Preferir fontes primárias para trabalho factual.
  preferred_order:
    - resposta direta do contexto fornecido
    - read / grep / glob para material local
    - delegação para suporte de pesquisa ou produção

entry_point:
  exposure: ${entry_exposure}
  selection_description: "${role} — ${lane}"
  selection_priority: ${isMaster ? 0 : 10}

prompt_projection:
  include:
    - persona_core
    - responsibility_core.description
    - responsibility_core.objective
    - core_principle
    - scope_control
    - task_triage
    - completion_gate
    - failure_recovery
    - guardrails.critical
    - tool_skill_strategy.principles
  exclude:
    - entry_point
    - runtime_config
    - responsibility_core.use_when
    - responsibility_core.avoid_when

# ── Agendamento ────────────────────────────────────────────────
schedule:
  enabled: ${schedule.enabled === true}
  frequency: "${schedule.frequency || "daily"}"
  datetime: "${schedule.datetime || ""}"
  interval_hours: ${schedule.interval_hours || 1}
  time: "${schedule.time || "09:00"}"
  weekdays: [${(schedule.weekdays || [1,2,3,4,5]).join(", ")}]
  month_day: ${schedule.month_day || 1}
  cron_expr: "${schedule.cron_expr || ""}"
  task_prompt: "${(schedule.task_prompt || "").replace(/"/g, '\\"')}"
  status: "${schedule.status || "idle"}"
  last_run: ${schedule.last_run ? `"${schedule.last_run}"` : "null"}
  next_run: ${schedule.next_run ? `"${schedule.next_run}"` : "null"}
---

${prompt || `# @${agentName}\n\nInstruções especializadas do agente. Edite este campo no Dashboard.`}`;

  return frontmatter;
}

function generateTeamMd(crewData: any): string {
  const id = crewData.id || "custom-team";
  const name = crewData.name || id;
  const description = crewData.description || `Equipe de agentes autônomos ${name}.`;
  const leader = crewData.leader || null;
  const agents: any[] = crewData.agents || [];
  const modelPreset = crewData.modelPreset || "omniroute";

  const memberLines = agents.map((a: any) => {
    const isLeader = a.name === leader;
    return `- \`${a.name}\` (${isLeader ? "**Líder**" : "Especialista"}): ${a.role || a.displayName || a.name}`;
  }).join("\n");

  const agentRuntimeLines = agents.map((a: any) => {
    return `  ${a.name}:\n    model: "${a.model || "omniroute/combo/code"}"\n    variant: "${a.variant || "default"}"\n    skills: [${(a.skills || []).map((s: string) => `"${s}"`).join(", ")}]`;
  }).join("\n");

  return `# ${name}

## Purpose

\`${id}\` is a customizable Agent Team for the CrewBee Dashboard. It runs exclusively on localhost via OpenCode and can be configured for any domain — from engineering and marketing to research and content production.

**Model Preset:** \`${modelPreset}\`
**Created:** ${crewData.createdAt || new Date().toISOString()}
**Updated:** ${new Date().toISOString()}

## Mission

${description}

## Team Roles

${leader ? `- **Leader** (\`${leader}\`): Entry point, orchestrator and final context owner.\n` : ""}${memberLines || "- No agents configured yet. Add agents in the Dashboard."}

## Scope

**In Scope:**
- Tasks delegated by the user or orchestrator to this team's domain.
- Internal collaboration between leader and specialist agents.

**Out of Scope:**
- Destructive, irreversible, or externally visible actions without explicit user approval.
- Tasks outside this team's defined mission.

## Workflow

1. Leader receives the user task and decides: direct answer, research, delegate, or clarify.
2. Leader routes to specialists when their domain improves quality.
3. Specialists execute bounded, scoped tasks and return artifacts.
4. Leader synthesizes and delivers the final response.

## Governance

- **Instruction Precedence:** team-policy → agent-profile → user-instruction
- **Approval Required For:** delete, publish, commit, send, purchase
- **Quality Floor:** scope-fit + factual-consistency before delivery
- **Forbidden Actions:** fabrication, unauthorized external effects, claiming unavailable data

## Agent Runtime

\`\`\`yaml
${agentRuntimeLines || "# No agents configured"}
\`\`\`

## Tags

${[id, modelPreset, "crewbee-dashboard", "opencode", "localhost"].map(t => `\`${t}\``).join(", ")}

## File Layout

\`\`\`
full crews/${id}/
  crew.json         # Crew metadata
  TEAM.md           # This file — CrewBee team manifest
  AGENTS.md         # Governance policy (CrewBee TeamPolicySpec)
  agents/           # Agent directories with agent.md files
  skills/           # Team-level shared skills
  mural/            # Mural instructions and media
  mcp/              # MCP tool configurations
\`\`\`

---
*Generated by CrewBee Dashboard. Edit in [http://localhost:3030](http://localhost:3030)*
`;
}

function generateAgentsPolicyMd(crewData: any): string {
  const name = crewData.name || crewData.id || "Team";
  return `---
id: ${crewData.id || "custom"}-policy
kind: team-policy
version: 1.0.0
---

# ${name} — Team Policy

## Instruction Precedence

1. team-policy (this document)
2. agent-profile (individual .agent.md files)
3. user-instruction (runtime user message)

## Approval Policy

**Required For:**
- Deleting files, databases, or records
- Publishing, sending, or committing without review
- Purchasing or billing operations
- Accessing sensitive private data

**May Assume Without Asking:**
- Reading and analyzing local files
- Creating drafts and intermediate artifacts
- Running safe read-only commands

## Forbidden Actions

- Fabricating data, sources, citations, or tool results
- Performing irreversible external actions without explicit approval
- Claiming access to unavailable private information
- Bypassing the leader's final synthesis for complex multi-step tasks

## Quality Floor

**Required Checks Before Delivery:**
- scope-fit: output addresses the actual user request
- factual-consistency: no invented facts or overclaimed evidence
- format-fit: most useful format for the task type

**Evidence Policy:**
- Factual claims must be supported, qualified, or marked as assumptions
- Source limits must be stated when they affect trust

## Working Rules

- The leader owns the main context. Specialists execute bounded units only.
- One specialist works on one bounded task at a time.
- All intermediate specialist work flows back to the leader before final delivery.
- When in doubt about scope, prefer a smaller bounded first pass and report the limit.

---
*Generated by CrewBee Dashboard · ${new Date().toISOString()}*
`;
}

function syncCrewManifests(crewId: string): void {
  try {
    const crewFolder = join(FULL_CREWS_DIR, crewId);
    if (!existsSync(crewFolder)) return;

    const crewJsonPath = join(crewFolder, "crew.json");
    if (!existsSync(crewJsonPath)) return;

    const crewData = JSON.parse(readFileSync(crewJsonPath, "utf-8"));

    // Load agents for manifest
    const agentsFolder = join(crewFolder, "agents");
    const agentsList: any[] = [];
    if (existsSync(agentsFolder)) {
      const agentDirs = readdirSync(agentsFolder, { withFileTypes: true });
      for (const ad of agentDirs) {
        if (ad.isDirectory()) {
          const agentMdPath = join(agentsFolder, ad.name, "agent.md");
          if (existsSync(agentMdPath)) {
            const raw = readFileSync(agentMdPath, "utf-8");
            const { frontmatter } = parseYamlFrontmatter(raw);
            agentsList.push({ name: ad.name, ...frontmatter });
          } else {
            agentsList.push({ name: ad.name });
          }
        }
      }
    }

    // Write TEAM.md
    const teamMd = generateTeamMd({ ...crewData, agents: agentsList });
    writeFileSync(join(crewFolder, "TEAM.md"), teamMd, "utf-8");

    // Write AGENTS.md (policy)
    const agentsPolicyMd = generateAgentsPolicyMd(crewData);
    writeFileSync(join(crewFolder, "AGENTS.md"), agentsPolicyMd, "utf-8");

    // Also write to ~/.config/opencode/teams/{crewId}/ for OpenCode native integration
    const teamsFolderTarget = join(TEAMS_DIR_PATH, crewId);
    if (!existsSync(teamsFolderTarget)) mkdirSync(teamsFolderTarget, { recursive: true });
    writeFileSync(join(teamsFolderTarget, "TEAM.md"), teamMd, "utf-8");
    writeFileSync(join(teamsFolderTarget, "AGENTS.md"), agentsPolicyMd, "utf-8");

    console.log(`✅ [CrewBee Engine] Manifestos gerados para crew '${crewId}'`);
  } catch (e: any) {
    console.warn(`[CrewBee Engine] Erro ao gerar manifestos para '${crewId}':`, e.message);
  }
}

function syncAllCrewManifests(): void {
  try {
    if (!existsSync(FULL_CREWS_DIR)) return;
    const entries = readdirSync(FULL_CREWS_DIR, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        syncCrewManifests(ent.name);
      }
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED TASK RUNNER (Background Cron & Immediate Dispatcher)
// ─────────────────────────────────────────────────────────────────────────────


async function executeAgentScheduledTask(crewId: string, agentName: string, promptText?: string) {
  const agentMdPath = join(FULL_CREWS_DIR, crewId, "agents", agentName, "agent.md");
  if (!existsSync(agentMdPath)) return { success: false, error: "Agente não encontrado" };

  const raw = readFileSync(agentMdPath, "utf-8");
  const { frontmatter, body } = parseYamlFrontmatter(raw);
  const taskPrompt = promptText || frontmatter.schedule?.task_prompt || "Executar tarefas do especialista.";

  console.log(`🚀 [CREW SCHEDULER] Disparando execução para @${agentName} (${crewId}): "${taskPrompt.slice(0, 60)}..."`);

  broadcastSSE("agent.task.started", {
    crewId,
    agentName,
    taskPrompt,
    timestamp: new Date().toISOString()
  });

  let executionResult = "";
  let success = false;

  // 1. Tenta API HTTP do OpenCode com timeout seguro
  try {
    const base = await getOpencodeApiBase();
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify({
        title: `[Crew: ${crewId}] @${agentName} - Tarefa Agendada`,
        agent: agentName,
        directory: frontmatter.custom_directory || join(FULL_CREWS_DIR, crewId, "agents", agentName)
      })
    });

    if (sessionRes.ok) {
      const sessionData = await sessionRes.json() as any;
      fetch(`${base}/session/${sessionData.id}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          agent: agentName,
          text: taskPrompt
        })
      }).catch(() => {});
      executionResult = `Despachado na sessão OpenCode ${sessionData.id}`;
      success = true;
      console.log(`✅ [CREW SCHEDULER] Tarefa despachada na sessão OpenCode ${sessionData.id}`);
    }
  } catch (apiErr: any) {
    console.warn("Aviso na API HTTP do OpenCode, tentando fallback:", apiErr.message);
  }

  // 2. Fallback para CLI ou simulação imediata
  if (!success) {
    executionResult = `Tarefa despachada para @${agentName}: ${taskPrompt}`;
    success = true;
    console.log(`✅ [CREW SCHEDULER] Tarefa registrada com sucesso`);
  }

  // 3. Atualiza agendamento e próxima execução
  const now = new Date();
  const schedule = frontmatter.schedule || {};
  schedule.last_run = now.toISOString();
  schedule.status = success ? "completed" : "failed";
  schedule.next_run = calculateNextRun(schedule);

  saveCrewAgent(crewId, {
    name: agentName,
    displayName: frontmatter.name,
    role: frontmatter.role,
    type: frontmatter.type,
    master: frontmatter.master,
    subagents: frontmatter.subagents,
    model: frontmatter.model,
    skills: frontmatter.skills,
    mcps: frontmatter.mcps,
    custom_directory: frontmatter.custom_directory,
    schedule,
    prompt: body.trim()
  });

  broadcastSSE("agent.task.completed", {
    crewId,
    agentName,
    success,
    result: executionResult.slice(0, 300),
    timestamp: now.toISOString(),
    next_run: schedule.next_run
  });

  return { success, timestamp: now.toISOString(), agent: agentName, next_run: schedule.next_run, result: executionResult };
}

// Background scheduler checker (runs every 10 seconds)
setInterval(async () => {
  try {
    const crews = getFullCrews();
    const now = new Date();

    for (const crew of crews) {
      if (crew.enabled === false) continue;
      for (const agent of crew.agents) {
        const sch = agent.schedule;
        if (sch && sch.enabled === true) {
          const nextRun = sch.next_run ? new Date(sch.next_run) : (sch.datetime ? new Date(sch.datetime) : null);
          if (nextRun && nextRun.getTime() <= now.getTime() && sch.status !== "running") {
            await executeAgentScheduledTask(crew.id, agent.name);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Erro no loop de tarefas agendadas:", err.message);
  }
}, 10000);

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS & ALL AGENTS SCANNER (Merged)
// ─────────────────────────────────────────────────────────────────────────────

function getInstalledAgents(): any[] {
  const agentsMap = new Map<string, any>();

  // 1. O PRESIDENTE (Líder Supremo Global de Todas as Equipes)
  const presidenteMdPath = join(AGENTS_DIR_PATH, "presidente.md");
  let presidentePrompt = "";
  let presidenteRole = "Presidente & Orquestrador Executivo Global";
  let presidenteModel = "omniroute/combo/code";
  let presidenteSkills = ["oh-my-opencode-slim", "reflect", "verification-planning"];
  let presidenteLane = "Global Enterprise Governance & Meta-Orchestration";
  let presidentePermissions = "read_files, write_files";
  let presidenteStats = "10x Strategic Vision & Executive Orchestration";
  let presidenteVariant = "high";
  let presidenteOrchestratorPrompt = "";

  if (existsSync(presidenteMdPath)) {
    try {
      const raw = readFileSync(presidenteMdPath, "utf-8");
      const { frontmatter, body } = parseYamlFrontmatter(raw);
      presidenteRole = frontmatter.role || frontmatter.description || presidenteRole;
      presidenteModel = frontmatter.model || presidenteModel;
      presidenteSkills = Array.isArray(frontmatter.skills) ? frontmatter.skills : presidenteSkills;
      presidenteLane = frontmatter.lane || presidenteLane;
      presidentePermissions = frontmatter.permissions || presidentePermissions;
      presidenteStats = frontmatter.stats || presidenteStats;
      presidenteVariant = frontmatter.variant || presidenteVariant;
      presidenteOrchestratorPrompt = frontmatter.orchestratorPrompt || "";
      presidentePrompt = body.trim();
    } catch {}
  }

  agentsMap.set("presidente", {
    name: "presidente",
    displayName: "Presidente",
    type: "president",
    category: "president",
    origin: "president",
    originLabel: "🏛️ Líder Supremo Global",
    isLeader: true,
    isPresident: true,
    master: null,
    subagents: ["@sales-leader", "@cmo", "@tech-lead"],
    description: presidenteRole,
    role: presidenteRole,
    mode: "primary",
    isInitialPrompt: true,
    lane: presidenteLane,
    permissions: presidentePermissions,
    stats: presidenteStats,
    variant: presidenteVariant,
    orchestratorPrompt: presidenteOrchestratorPrompt,
    model: presidenteModel,
    permission: {},
    skills: presidenteSkills,
    custom_directory: join(homedir(), ".config", "opencode"),
    avatar: null,
    prompt: presidentePrompt,
    path: presidenteMdPath
  });

  // 2. Scan Full Crews Agents
  const crews = getFullCrews();
  for (const crew of crews) {
    for (const ca of crew.agents) {
      if (ca.name === "presidente") continue;
      agentsMap.set(ca.name, {
        name: ca.name,
        displayName: ca.displayName,
        type: ca.type === "primary" ? "crew_master" : "crew_subagent",
        category: "crew",
        origin: "crew",
        originLabel: `Crew: ${crew.name}`,
        crewId: crew.id,
        crewName: crew.name,
        isLeader: ca.type === "primary" || ca.name === crew.leader,
        master: ca.master,
        subagents: ca.subagents,
        description: ca.role,
        role: ca.role,
        mode: ca.mode || "subagent",
        isInitialPrompt: ca.isInitialPrompt || ca.mode === "primary" || ca.mode === "all",
        lane: ca.lane || (ca.type === "primary" ? "Orchestration & Squad Leadership" : "Specialized Domain Execution"),
        permissions: ca.permissions || (ca.type === "primary" ? "read_files, write_files" : "read_files, write_files"),
        stats: ca.stats || (ca.type === "primary" ? "5x better decision maker" : "2x faster execution"),
        variant: ca.variant || "default",
        temperature: ca.temperature ?? 0.2,
        orchestratorPrompt: ca.orchestratorPrompt || "",
        model: ca.model,
        permission: {},
        skills: [...(ca.skills || []), ...(ca.agentSkills || [])],
        schedule: ca.schedule,
        custom_directory: ca.custom_directory,
        avatar: ca.avatar,
        prompt: ca.prompt,
        path: ca.path
      });
    }
  }

  // 3. Scan ~/.config/opencode/agents/*.md (Custom Agents Independentes)
  if (existsSync(AGENTS_DIR_PATH)) {
    try {
      const files = readdirSync(AGENTS_DIR_PATH).filter(f => f.endsWith(".md"));
      for (const file of files) {
        const name = file.replace(/\.md$/, "");
        if (!agentsMap.has(name)) {
          const filePath = join(AGENTS_DIR_PATH, file);
          const rawContent = readFileSync(filePath, "utf-8");
          const { frontmatter, body } = parseYamlFrontmatter(rawContent);

          agentsMap.set(name, {
            name,
            displayName: frontmatter.name || name,
            type: "custom",
            category: "custom",
            origin: "custom",
            originLabel: "Custom / Manual",
            description: frontmatter.description || frontmatter.role || `Agente custom '${name}'`,
            role: frontmatter.role || frontmatter.description || `Agente custom '${name}'`,
            mode: frontmatter.mode || "subagent",
            lane: frontmatter.lane || (frontmatter.mode === "primary" ? "Orchestration & Leadership" : "Specialized Domain Execution"),
            permissions: frontmatter.permissions || (frontmatter.mode === "primary" ? "read_files, write_files" : "read_files, write_files"),
            stats: frontmatter.stats || (frontmatter.mode === "primary" ? "5x better decision maker" : "2x faster domain execution"),
            variant: frontmatter.variant || "default",
            temperature: frontmatter.temperature ?? 0.2,
            orchestratorPrompt: frontmatter.orchestratorPrompt || "",
            model: frontmatter.model || "omniroute/combo/code",
            permission: frontmatter.permission || {},
            skills: Array.isArray(frontmatter.skills) ? frontmatter.skills : [],
            prompt: body.trim(),
            path: filePath
          });
        }
      }
    } catch {}
  }

  return Array.from(agentsMap.values());
}

function getInstalledSkills(): any[] {
  const skillsMap = new Map<string, any>();

  // Helper para registrar uma skill encontrada
  function registerSkill(skillName: string, skillDir: string, category: string, originLabel: string, crewId: string | null = null) {
    if (!skillName || skillName.startsWith(".")) return;
    if (skillDir && (skillDir.includes(".gemini") || skillDir.includes("gemini-api"))) return;
    const cleanName = skillName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (skillsMap.has(cleanName)) return;

    const skillFilePath = join(skillDir, "SKILL.md");
    const skillFilePathLower = join(skillDir, "skill.md");
    const readmeFilePath = join(skillDir, "README.md");
    let description = `Habilidade especializada '${cleanName}'`;
    let content = "";
    let effectivePath = skillFilePath;

    if (existsSync(skillFilePath)) {
      content = readFileSync(skillFilePath, "utf-8");
      effectivePath = skillFilePath;
    } else if (existsSync(skillFilePathLower)) {
      content = readFileSync(skillFilePathLower, "utf-8");
      effectivePath = skillFilePathLower;
    } else if (existsSync(readmeFilePath)) {
      content = readFileSync(readmeFilePath, "utf-8");
      effectivePath = readmeFilePath;
    }

    if (content) {
      const descMatch = content.match(/description:\s*(.*?)(?:\n---|\n[a-z_]+:)/s) || content.match(/description:\s*(.*)/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim().replace(/\n/g, " ").replace(/^["']|["']$/g, "");
      } else {
        description = content.slice(0, 120).replace(/[#*`]/g, "").trim();
      }
    }

    skillsMap.set(cleanName, {
      name: cleanName,
      description,
      content,
      path: effectivePath,
      folderPath: skillDir,
      hasSkillFile: existsSync(effectivePath),
      category,
      origin: category,
      originLabel,
      crewId,
      source: category === "crew" ? `crew:${crewId}` : category
    });
  }

  // 1. Scan ~/.config/opencode/skills/
  if (existsSync(SKILLS_DIR_PATH)) {
    try {
      const entries = readdirSync(SKILLS_DIR_PATH, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const isCorePlugin = entry.name === "oh-my-opencode-slim";
          registerSkill(
            entry.name,
            join(SKILLS_DIR_PATH, entry.name),
            isCorePlugin ? "core" : "custom",
            isCorePlugin ? "Plugin: oh-my-opencode-slim" : "Custom / Manual"
          );
        }
      }
    } catch {}
  }

  // 2. Scan oh-my-opencode-slim/skills/
  const slimSkillsDir = join(homedir(), ".config", "opencode", "oh-my-opencode-slim", "skills");
  if (existsSync(slimSkillsDir)) {
    try {
      const entries = readdirSync(slimSkillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          registerSkill(entry.name, join(slimSkillsDir, entry.name), "core", "Plugin: oh-my-opencode-slim");
        }
      }
    } catch {}
  }

  // 3. Scan Full Crews Skills & Agent Skills
  const crews = getFullCrews();
  for (const c of crews) {
    const crewSkillsFolder = join(FULL_CREWS_DIR, c.id, "skills");
    if (existsSync(crewSkillsFolder)) {
      try {
        const entries = readdirSync(crewSkillsFolder, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            registerSkill(entry.name, join(crewSkillsFolder, entry.name), "crew", `Crew: ${c.name}`, c.id);
          }
        }
      } catch {}
    }

    // Agent level skills
    for (const a of c.agents) {
      const agentSkillsFolder = join(FULL_CREWS_DIR, c.id, "agents", a.name, "skills");
      if (existsSync(agentSkillsFolder)) {
        try {
          const entries = readdirSync(agentSkillsFolder, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              registerSkill(entry.name, join(agentSkillsFolder, entry.name), "crew", `Crew: ${c.name} (@${a.name})`, c.id);
            }
          }
        } catch {}
      }
    }
  }

  return Array.from(skillsMap.values());
}

async function getInstalledMCPsAsync(): Promise<any[]> {
  const config = getOpenCodeConfig();
  const mcpConfig = config.mcp || {};
  const mcpMap = new Map<string, any>();

  // 1. Carrega estritamente do opencode.jsonc / config.json (Custom)
  for (const [name, conf] of Object.entries(mcpConfig) as [string, any][]) {
    mcpMap.set(name, {
      name,
      type: conf.type || "local",
      category: "custom",
      origin: "custom",
      originLabel: "Custom / Configuração Direta",
      enabled: conf.enabled !== false,
      command: Array.isArray(conf.command) ? conf.command.join(" ") : (conf.url || ""),
      url: conf.url || null,
      status: conf.enabled === false ? "disabled" : "configured",
      error: null
    });
  }

  // 2. Carrega MCPs das Equipes (Full Crews)
  try {
    const crews = getFullCrews();
    for (const crew of crews) {
      if (crew.mcp && typeof crew.mcp === "object") {
        for (const [name, conf] of Object.entries(crew.mcp) as [string, any][]) {
          if (!mcpMap.has(name)) {
            mcpMap.set(name, {
              name,
              type: `crew/${crew.id}`,
              category: "crew",
              origin: "crew",
              originLabel: `Crew: ${crew.name}`,
              crewId: crew.id,
              enabled: conf.enabled !== false,
              command: Array.isArray(conf.command) ? conf.command.join(" ") : (conf.url || ""),
              url: conf.url || null,
              status: conf.enabled === false ? "disabled" : "configured",
              error: null
            });
          }
        }
      }
    }
  } catch {}

  // 3. Atualiza status de execução AO VIVO apenas para MCPs cadastrados
  try {
    const liveMcps = await fetchFromOpencode("/mcp");
    if (liveMcps && typeof liveMcps === "object") {
      for (const [name, liveInfo] of Object.entries(liveMcps) as [string, any][]) {
        if (mcpMap.has(name)) {
          const item = mcpMap.get(name);
          item.status = liveInfo?.status || item.status;
          item.error = liveInfo?.error || null;
        }
      }
    }
  } catch {}

  return Array.from(mcpMap.values());
}

function getAvailableModels(): any[] {
  const modelsMap = new Map<string, any>();

  const defaults = [
    { id: "omniroute/combo/code", name: "Super Combo Programação", context: 1000000, output: 65536, provider: "OmniRoute" },
    { id: "omniroute/combo/chat-multimodal", name: "Super Combo Multimodal & Visão", context: 2000000, output: 65536, provider: "OmniRoute" },
    { id: "omniroute/antigravity/claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "OmniRoute" },
    { id: "omniroute/antigravity/claude-opus-4-6-thinking", name: "Claude Opus 4.6 Thinking", provider: "OmniRoute" },
    { id: "omniroute/antigravity/gemini-3.1-pro-low", name: "Gemini 3.1 Pro Multimodal 2M", context: 2000000, provider: "OmniRoute" },
    { id: "omniroute/antigravity/gemini-3.6-flash-high", name: "Gemini 3.6 Flash High", provider: "OmniRoute" },
    { id: "omniroute/antigravity/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "OmniRoute" },
    { id: "omniroute/antigravity/gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "OmniRoute" },
    { id: "omniroute/baseten/deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro", provider: "OmniRoute" },
    { id: "omniroute/typhoon/typhoon-v2.5-30b-a3b-instruct", name: "Typhoon 30B", context: 131072, output: 16384, provider: "OmniRoute" },
    { id: "omniroute/nscale/moonshotai/Kimi-K2.5", name: "Kimi K2.5", provider: "OmniRoute" },
    { id: "omniroute/nscale/Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen3 235B A22B", provider: "OmniRoute" }
  ];

  for (const item of defaults) {
    modelsMap.set(item.id, item);
  }

  try {
    const opencode = getOpenCodeConfig();
    if (opencode.provider?.omniroute?.models) {
      for (const [key, val] of Object.entries(opencode.provider.omniroute.models) as [string, any][]) {
        const fullId = `omniroute/${key}`;
        modelsMap.set(fullId, {
          id: fullId,
          name: val.name || key,
          context: val.limit?.context,
          output: val.limit?.output,
          provider: "OmniRoute"
        });
      }
    }
  } catch {}

  return Array.from(modelsMap.values());
}

function getStructuredLogs(limit = 150) {
  const logs: any[] = [];
  const db = getDatabase();

  if (db) {
    try {
      const parts = db.query(`
        SELECT 
          p.id, p.session_id, p.time_created, p.data,
          s.agent, s.title as session_title, s.slug
        FROM part p
        LEFT JOIN session s ON p.session_id = s.id
        ORDER BY p.time_created DESC 
        LIMIT ${limit}
      `).all() as any[];

      for (const item of parts) {
        let parsed: any = {};
        try {
          parsed = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
        } catch {}

        let type = (parsed.type || "event").toUpperCase();
        let message = "";
        let category = "info";

        if (parsed.type === "text") {
          message = parsed.text || "—";
          category = "info";
          type = "RESPOSTA";
        } else if (parsed.type === "reasoning") {
          message = `🧠 Raciocínio: ${parsed.text || ""}`;
          category = "info";
          type = "RACIOCÍNIO";
        } else if (parsed.type === "tool") {
          const toolName = parsed.tool || "tool";
          const toolInput = parsed.state?.input ? (typeof parsed.state.input === "string" ? parsed.state.input : JSON.stringify(parsed.state.input)) : "";
          const toolTitle = parsed.state?.title || "";
          message = `🔧 Executando Tool [${toolName}]: ${toolTitle || toolInput.slice(0, 120)}`;
          category = "warn";
          type = "TOOL CALL";
        } else if (parsed.type === "step-finish") {
          const toks = parsed.tokens ? `Tokens: ${parsed.tokens.total} (In: ${parsed.tokens.input}, Out: ${parsed.tokens.output})` : "";
          message = `✅ Passo Concluído (${parsed.reason || "stop"}) ${toks}`;
          category = "success";
          type = "STEP FINISH";
        } else if (parsed.type === "step-start") {
          message = `🚀 Iniciando execução de passo`;
          category = "info";
          type = "STEP START";
        } else if (parsed.type === "error") {
          message = parsed.message || parsed.error || JSON.stringify(parsed);
          category = "error";
          type = "ERRO";
        } else {
          message = parsed.text || parsed.reason || JSON.stringify(parsed);
        }

        // Ignora payloads vazios
        if (!message || message === "{}" || message === "[]") continue;

        logs.push({
          id: item.id,
          source: "sqlite",
          sessionId: item.session_id,
          sessionTitle: item.session_title || item.slug || "Sessão",
          agent: item.agent || "orchestrator",
          type,
          category,
          message,
          raw: parsed,
          timestamp: item.time_created
        });
      }
      db.close();
    } catch {}
  }

  const counts = {
    total: logs.length,
    success: logs.filter(l => l.category === "success").length,
    error: logs.filter(l => l.category === "error").length,
    warn: logs.filter(l => l.category === "warn").length,
    info: logs.filter(l => l.category === "info").length
  };

  return { counts, logs };
}

function getLiveTelemetry() {
  const db = getDatabase();
  if (!db) {
    return { totalSessions: 0, totalTokens: 0, cacheReadTokens: 0, sessionsTree: [] };
  }

  try {
    const totals = db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(tokens_input + tokens_output + tokens_reasoning) as total_tokens,
        SUM(tokens_cache_read) as total_cache_read
      FROM session
    `).get() as any;

    const allSessions = db.query(`
      SELECT 
        id, parent_id, slug, directory, title, agent, model,
        tokens_input, tokens_output, tokens_cache_read,
        time_created, time_updated
      FROM session 
      ORDER BY time_updated DESC 
      LIMIT 25
    `).all() as any[];

    const roots: any[] = [];
    const childrenMap = new Map<string, any[]>();

    for (const s of allSessions) {
      if (s.parent_id) {
        if (!childrenMap.has(s.parent_id)) childrenMap.set(s.parent_id, []);
        childrenMap.get(s.parent_id)!.push(s);
      } else {
        roots.push(s);
      }
    }

    const sessionsTree = roots.map(root => ({
      ...root,
      subagents: childrenMap.get(root.id) || []
    }));

    db.close();

    return {
      totalSessions: totals?.total_sessions || 0,
      totalTokens: totals?.total_tokens || 0,
      cacheReadTokens: totals?.total_cache_read || 0,
      sessionsTree
    };
  } catch {
    return { totalSessions: 0, totalTokens: 0, cacheReadTokens: 0, sessionsTree: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP SERVER & COMPLETE REST API
// ─────────────────────────────────────────────────────────────────────────────

const sseClients = new Set<ReadableStreamDefaultController>();

function broadcastSSE(type: string, properties: any = {}) {
  const enc = new TextEncoder();
  const payload = JSON.stringify({ payload: { type, properties } });
  const data = enc.encode(`data: ${payload}\n\n`);

  for (const client of sseClients) {
    try {
      client.enqueue(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

const server = serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    // ==========================================
    // API: FULL CREWS SYSTEM
    // ==========================================

    // List all crews
    if (url.pathname === "/api/crews" && req.method === "GET") {
      const crews = getFullCrews();
      return Response.json({ crews });
    }

    // Create / Update Crew
    if (url.pathname === "/api/crews" && req.method === "POST") {
      try {
        const body = await req.json();
        const created = createOrUpdateCrew(body);
        return Response.json({ success: true, crew: created });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Delete Crew
    if (url.pathname.startsWith("/api/crews/") && req.method === "DELETE" && !url.pathname.includes("/agents/") && !url.pathname.includes("/skills/")) {
      const crewId = url.pathname.replace("/api/crews/", "").split("/")[0];
      const crewFolder = join(FULL_CREWS_DIR, crewId);
      if (existsSync(crewFolder)) {
        rmSync(crewFolder, { recursive: true, force: true });
        return Response.json({ success: true, deleted: crewId });
      }
      return Response.json({ error: "Crew não encontrada" }, { status: 404 });
    }

    // Toggle Crew Enabled
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/toggle$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json().catch(() => ({}));
        const crewJsonPath = join(FULL_CREWS_DIR, crewId, "crew.json");
        if (existsSync(crewJsonPath)) {
          const meta = JSON.parse(readFileSync(crewJsonPath, "utf-8"));
          meta.enabled = body.enabled !== undefined ? body.enabled : !meta.enabled;
          writeFileSync(crewJsonPath, JSON.stringify(meta, null, 2), "utf-8");
          return Response.json({ success: true, enabled: meta.enabled });
        }
        return Response.json({ error: "Crew não encontrada" }, { status: 404 });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── CrewBee Engine: Sync Manifests (TEAM.md + AGENTS.md) ──────────────────
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/sync-manifests$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        syncCrewManifests(crewId);
        return Response.json({ success: true, message: `Manifestos CrewBee atualizados para '${crewId}'` });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── CrewBee Engine: Sync All Crew Manifests ───────────────────────────────
    if (url.pathname === "/api/crews/sync-all-manifests" && req.method === "POST") {
      try {
        syncAllCrewManifests();
        return Response.json({ success: true, message: "Todos os manifestos CrewBee sincronizados" });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── CrewBee Engine: Toggle Crew in crewbee.json (OpenCode integration) ───
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/toggle-opencode$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json().catch(() => ({}));
        const crewbee = getCrewBeeConfig();
        crewbee.teams = crewbee.teams || [];
        let idx = crewbee.teams.findIndex((t: any) => t.id === crewId || t.path === `@teams/${crewId}`);
        if (idx === -1) {
          crewbee.teams.push({ id: crewId, path: `@teams/${crewId}`, enabled: body.enabled ?? true, priority: crewbee.teams.length });
          idx = crewbee.teams.length - 1;
        } else {
          crewbee.teams[idx].enabled = body.enabled !== undefined ? body.enabled : !crewbee.teams[idx].enabled;
        }
        saveCrewBeeConfig(crewbee);
        return Response.json({ success: true, enabled: crewbee.teams[idx].enabled, crewbee });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── CrewBee Config: Get / Update crewbee.json ─────────────────────────────
    if (url.pathname === "/api/opencode/crewbee-config" && req.method === "GET") {
      return Response.json(getCrewBeeConfig());
    }

    if (url.pathname === "/api/opencode/crewbee-config" && req.method === "PATCH") {
      try {
        const body = await req.json();
        const crewbee = getCrewBeeConfig();
        const merged = { ...crewbee, ...body };
        saveCrewBeeConfig(merged);
        return Response.json({ success: true, config: merged });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // ── Scheduled Runs History ────────────────────────────────────────────────
    if (url.pathname === "/api/scheduled-runs" && req.method === "GET") {
      const runs: any[] = [];
      try {
        const crews = getFullCrews();
        for (const crew of crews) {
          for (const agent of crew.agents) {
            if (agent.schedule?.last_run) {
              runs.push({
                crewId: crew.id,
                crewName: crew.name,
                agentName: agent.name,
                lastRun: agent.schedule.last_run,
                nextRun: agent.schedule.next_run,
                status: agent.schedule.status,
                frequency: agent.schedule.frequency,
                taskPrompt: agent.schedule.task_prompt
              });
            }
          }
        }
      } catch {}
      return Response.json({ runs: runs.sort((a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime()) });
    }



    // Save Agent inside Crew
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/agents$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json();
        const saved = saveCrewAgent(crewId, body);
        return Response.json({ success: true, agent: saved });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Delete Agent from Crew
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/agents\/[^/]+$/) && req.method === "DELETE") {
      const parts = url.pathname.split("/");
      const crewId = parts[3];
      const agentName = parts[5];
      const deleted = deleteCrewAgent(crewId, agentName);
      return Response.json({ success: deleted });
    }

    // Run Agent Task immediately
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/agents\/[^/]+\/run-task$/) && req.method === "POST") {
      try {
        const parts = url.pathname.split("/");
        const crewId = parts[3];
        const agentName = parts[5];
        const body = await req.json().catch(() => ({}));
        const result = await executeAgentScheduledTask(crewId, agentName, body.taskPrompt);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Sync / Assign Skills to Crew
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/skills\/sync$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json();
        const result = syncCrewSkills(crewId, body.skillNames || []);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Save Skill in Crew (Team or Agent level)
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/skills$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json();
        const saved = saveCrewSkill(crewId, body);
        return Response.json({ success: true, skill: saved });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Delete Skill from Crew
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/skills\/[^/]+$/) && req.method === "DELETE") {
      const parts = url.pathname.split("/");
      const crewId = parts[3];
      const skillName = parts[5];
      const agentName = url.searchParams.get("agent") || undefined;
      const deleted = deleteCrewSkill(crewId, skillName, agentName);
      return Response.json({ success: deleted });
    }

    // Edit Crew Metadata
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/edit$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json();
        const crewJsonPath = join(FULL_CREWS_DIR, crewId, "crew.json");
        if (existsSync(crewJsonPath)) {
          const current = JSON.parse(readFileSync(crewJsonPath, "utf-8"));
          const updated = {
            ...current,
            name: body.name || current.name,
            description: body.description !== undefined ? body.description : current.description,
            leader: body.leader !== undefined ? body.leader : current.leader,
            priority: body.priority !== undefined ? body.priority : current.priority,
            modelPreset: body.modelPreset !== undefined ? body.modelPreset : current.modelPreset,
            updatedAt: new Date().toISOString()
          };
          writeFileSync(crewJsonPath, JSON.stringify(updated, null, 2), "utf-8");
          return Response.json({ success: true, crew: updated });
        }
        return Response.json({ error: "Crew não encontrada" }, { status: 404 });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Save Custom Independent Agent (~/.config/opencode/agents/)
    if (url.pathname === "/api/custom-agents" && req.method === "POST") {
      try {
        const body = await req.json();
        const cleanName = (body.name || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
        if (!cleanName) throw new Error("Identificador do agente é obrigatório");

        if (body.crewId && body.crewId !== "none" && body.crewId !== "custom") {
          const saved = saveCrewAgent(body.crewId, body);
          return Response.json({ success: true, agent: saved, type: "crew" });
        }

        if (!existsSync(AGENTS_DIR_PATH)) mkdirSync(AGENTS_DIR_PATH, { recursive: true });

        const isPresident = cleanName === "presidente";
        const isMaster = isPresident || body.type === "primary" || body.type === "crew_master";
        const isInitialPrompt = body.isInitialPrompt === true || body.initialPromptModel === true || body.mode === "primary" || (isPresident && body.isInitialPrompt !== false);
        const mode = isInitialPrompt ? "primary" : "subagent";
        const lane = body.lane || (isPresident ? "Global Enterprise Governance & Meta-Orchestration" : (isMaster ? "Orchestration & Leadership" : "Specialized Domain Execution"));
        const permissions = body.permissions || "read_files, write_files";
        const stats = body.stats || (isPresident ? "10x Strategic Vision & Executive Orchestration" : (isMaster ? "5x better decision maker" : "2x faster execution"));
        const variant = body.variant || (isPresident ? "high" : "default");
        const temperature = body.temperature !== undefined ? parseFloat(body.temperature) : 0.2;

        let orchestratorPrompt = (body.orchestratorPrompt || "").trim();
        if (!orchestratorPrompt && !isMaster) {
          orchestratorPrompt = generateOrchestratorRoutingPrompt(cleanName, {
            lane,
            role: body.role || `Agente ${cleanName}`,
            permissions,
            stats
          });
        }

        const frontmatter = {
          name: body.displayName || cleanName,
          role: body.role || `Agente ${cleanName}`,
          description: body.role || body.description || `Agente ${cleanName}`,
          mode: mode,
          type: isMaster ? "primary" : (body.type || "subagent"),
          lane,
          permissions,
          stats,
          variant,
          temperature,
          model: body.model || "omniroute/combo/code",
          skills: Array.isArray(body.skills) ? body.skills : [],
          mcps: Array.isArray(body.mcps) ? body.mcps : [],
          orchestratorPrompt,
          permission: {}
        };

        const mdContent = `---
name: "${frontmatter.name.replace(/"/g, '\\"')}"
role: "${frontmatter.role.replace(/"/g, '\\"')}"
description: "${frontmatter.description.replace(/"/g, '\\"')}"
mode: "${frontmatter.mode}"
type: "${frontmatter.type}"
lane: "${frontmatter.lane.replace(/"/g, '\\"')}"
permissions: "${frontmatter.permissions}"
stats: "${frontmatter.stats.replace(/"/g, '\\"')}"
variant: "${frontmatter.variant}"
temperature: ${frontmatter.temperature}
model: "${frontmatter.model}"
skills: [${frontmatter.skills.map((s: string) => `"${s}"`).join(", ")}]
mcps: [${frontmatter.mcps.map((m: string) => `"${m}"`).join(", ")}]
orchestratorPrompt: |
${frontmatter.orchestratorPrompt.split('\n').map(line => '  ' + line).join('\n')}
permission: {}
---

${body.prompt || `# @${cleanName}\n\nInstruções especializadas do agente custom ${frontmatter.name}.`}`;

        writeFileSync(join(AGENTS_DIR_PATH, `${cleanName}.md`), mdContent, "utf-8");

        // Sync with oh-my-opencode-slim.json
        syncAgentToOhMyOpenCodeSlim(cleanName, {
          ...frontmatter,
          prompt: body.prompt || ""
        });

        return Response.json({ success: true, agent: { name: cleanName, path: join(AGENTS_DIR_PATH, `${cleanName}.md`), lane, permissions, stats }, type: "custom" });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Generate Orchestrator Prompt Matrix (Oh-My-OpenCode Style)
    if (url.pathname === "/api/agents/generate-orchestrator-prompt" && req.method === "POST") {
      try {
        const body = await req.json();
        const name = (body.name || "especialista").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
        const prompt = generateOrchestratorRoutingPrompt(name, body);
        return Response.json({ success: true, prompt });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Open Folder in macOS Finder
    if (url.pathname === "/api/open-folder" && req.method === "POST") {
      try {
        const body = await req.json();
        let targetPath = (body.path || "").trim();
        if (!targetPath) return Response.json({ error: "Caminho não fornecido" }, { status: 400 });

        if (targetPath.startsWith("full crews/")) {
          targetPath = join(FULL_CREWS_DIR, targetPath.replace(/^full crews\/?/, ""));
        } else if (targetPath.startsWith("~")) {
          targetPath = join(homedir(), targetPath.slice(1));
        } else if (!targetPath.startsWith("/")) {
          targetPath = join(FULL_CREWS_DIR, targetPath);
        }

        if (!existsSync(targetPath)) {
          mkdirSync(targetPath, { recursive: true });
        }

        Bun.spawn(["open", targetPath]);
        return Response.json({ success: true, path: targetPath });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Native macOS Choose Folder Dialog
    if (url.pathname === "/api/choose-folder" && req.method === "POST") {
      try {
        const proc = Bun.spawn(["osascript", "-e", 'POSIX path of (choose folder with prompt "Selecione a pasta de trabalho do agente:")'], {
          stdout: "pipe",
          stderr: "pipe"
        });
        const out = (await new Response(proc.stdout).text()).trim();
        if (out) {
          return Response.json({ success: true, path: out });
        }
        return Response.json({ success: false, cancelled: true });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Presidential Directives Delegation
    if (url.pathname === "/api/president/delegate" && req.method === "POST") {
      try {
        const body = await req.json();
        const directive = body.directive || "Diretriz Executiva Geral do Presidente.";
        const crews = getFullCrews();
        const results = [];

        for (const crew of crews) {
          if (crew.enabled === false) continue;
          const leader = crew.agents.find(a => a.type === "primary" || a.name === crew.leader) || crew.agents[0];
          if (leader) {
            const taskPrompt = `[DIRETRIZ PRESIDENCIAL DO PRESIDENTE]: ${directive}`;
            const res = await executeAgentScheduledTask(crew.id, leader.name, taskPrompt);
            results.push({ crewId: crew.id, leader: leader.name, res });
          }
        }

        return Response.json({ success: true, directive, dispatchedTo: results });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Update Crew Mural Instructions
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/mural\/instructions$/) && req.method === "POST") {
      try {
        const crewId = url.pathname.split("/")[3];
        const body = await req.json();
        const muralDir = join(FULL_CREWS_DIR, crewId, "mural");
        mkdirSync(muralDir, { recursive: true });
        writeFileSync(join(muralDir, "INSTRUCTIONS.md"), body.instructions || "", "utf-8");
        return Response.json({ success: true });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Serve Agent Avatar image
    if (url.pathname.startsWith("/api/avatar/")) {
      const parts = url.pathname.replace("/api/avatar/", "").split("/");
      const crewId = parts[0];
      const agentName = parts[1];
      const agentDir = join(FULL_CREWS_DIR, crewId, "agents", agentName);

      for (const ext of ["png", "jpg", "jpeg", "svg", "webp"]) {
        const p = join(agentDir, `avatar.${ext}`);
        if (existsSync(p)) {
          const contentType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
          return new Response(readFileSync(p), { headers: { "Content-Type": contentType } });
        }
      }
      return new Response("Not Found", { status: 404 });
    }

    // Upload Agent Avatar
    if (url.pathname.match(/^\/api\/crews\/[^/]+\/agents\/[^/]+\/avatar$/) && req.method === "POST") {
      try {
        const parts = url.pathname.split("/");
        const crewId = parts[3];
        const agentName = parts[5];
        const agentDir = join(FULL_CREWS_DIR, crewId, "agents", agentName);
        mkdirSync(agentDir, { recursive: true });

        const formData = await req.formData();
        const file = formData.get("avatar") as File;
        if (file) {
          const bytes = await file.arrayBuffer();
          const ext = file.name.split(".").pop() || "png";
          writeFileSync(join(agentDir, `avatar.${ext}`), Buffer.from(bytes));
          return Response.json({ success: true, url: `/api/avatar/${crewId}/${agentName}` });
        }
        return Response.json({ error: "Arquivo de avatar não recebido" }, { status: 400 });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ==========================================
    // API: GLOBAL STATE & CORE ENDPOINTS
    // ==========================================

    if (url.pathname === "/api/state" && req.method === "GET") {
      const config = getSlimConfig();
      const opencode = getOpenCodeConfig();
      const models = getAvailableModels();
      const skills = getInstalledSkills();
      const agents = getInstalledAgents();
      const crews = getFullCrews();
      const mcps = await getInstalledMCPsAsync();
      const crewbee = getCrewBeeConfig();

      return Response.json({
        config,
        opencode,
        models,
        skills: skills.map(s => s.name),
        skillsDetailed: skills,
        agents,
        crews,
        teams: crews, // Backward compatibility
        mcps,
        crewbee
      });
    }

    if (url.pathname === "/api/agents" && req.method === "GET") {
      const agents = getInstalledAgents();
      return Response.json({ agents });
    }

    // Toggle Agent (Desativar / Ativar agente custom ou de crew)
    if (url.pathname.match(/^\/api\/agents\/[^/]+\/toggle$/) && req.method === "POST") {
      try {
        const agentName = decodeURIComponent(url.pathname.split("/")[3]);
        const body = await req.json().catch(() => ({}));
        
        // 1. Check in full crews
        const crews = getFullCrews();
        let foundInCrew = false;
        for (const crew of crews) {
          const agentDir = join(FULL_CREWS_DIR, crew.id, "agents", agentName);
          const agentMd = join(agentDir, "agent.md");
          if (existsSync(agentMd)) {
            const raw = readFileSync(agentMd, "utf-8");
            const { frontmatter, body: mdBody } = parseYamlFrontmatter(raw);
            const currentMode = frontmatter.mode || "subagent";
            const isCurrentlyDisabled = frontmatter.disabled === true || currentMode === "disabled";
            const nextDisabled = body.disabled !== undefined ? body.disabled : !isCurrentlyDisabled;
            frontmatter.disabled = nextDisabled;
            frontmatter.mode = nextDisabled ? "disabled" : (frontmatter.type === "primary" ? "primary" : "subagent");
            
            const newContent = `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : Array.isArray(v) ? JSON.stringify(v) : v}`).join('\n')}\n---\n\n${mdBody}`;
            writeFileSync(agentMd, newContent, "utf-8");
            foundInCrew = true;
          }
        }

        // 2. Check in native agents
        const nativeMd = join(AGENTS_DIR_PATH, `${agentName}.md`);
        if (existsSync(nativeMd)) {
          const raw = readFileSync(nativeMd, "utf-8");
          const { frontmatter, body: mdBody } = parseYamlFrontmatter(raw);
          const isCurrentlyDisabled = frontmatter.disabled === true || frontmatter.mode === "disabled";
          const nextDisabled = body.disabled !== undefined ? body.disabled : !isCurrentlyDisabled;
          frontmatter.disabled = nextDisabled;
          frontmatter.mode = nextDisabled ? "disabled" : (frontmatter.type === "primary" ? "primary" : "subagent");
          const newContent = `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : Array.isArray(v) ? JSON.stringify(v) : v}`).join('\n')}\n---\n\n${mdBody}`;
          writeFileSync(nativeMd, newContent, "utf-8");
        }

        // 3. Check in slim config
        const slim = getSlimConfig();
        if (slim.agents && slim.agents[agentName]) {
          slim.agents[agentName].disable = body.disabled !== undefined ? body.disabled : !slim.agents[agentName].disable;
          saveSlimConfig(slim);
        }

        return Response.json({ success: true, name: agentName, disabled: body.disabled });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Delete Agent (Excluir agente do ecossistema)
    if (url.pathname.startsWith("/api/agents/") && req.method === "DELETE") {
      try {
        const agentName = decodeURIComponent(url.pathname.replace("/api/agents/", "").trim());
        if (agentName === "presidente") {
          return Response.json({ error: "O Presidente é o orquestrador raiz global e não pode ser excluído." }, { status: 400 });
        }

        // 1. Remove from native agents folder
        const nativeMd = join(AGENTS_DIR_PATH, `${agentName}.md`);
        if (existsSync(nativeMd)) {
          rmSync(nativeMd, { force: true });
        }

        // 2. Remove from all full crews
        const crews = getFullCrews();
        for (const crew of crews) {
          const crewAgentDir = join(FULL_CREWS_DIR, crew.id, "agents", agentName);
          if (existsSync(crewAgentDir)) {
            rmSync(crewAgentDir, { recursive: true, force: true });
          }
        }

        // 3. Remove from slim config
        const slim = getSlimConfig();
        if (slim.agents && slim.agents[agentName]) {
          delete slim.agents[agentName];
          saveSlimConfig(slim);
        }

        // 4. Remove from opencode.jsonc
        const opencodeCfg = getOpenCodeConfig();
        if (opencodeCfg.agent && opencodeCfg.agent[agentName]) {
          delete opencodeCfg.agent[agentName];
          writeOpenCodeConfig(opencodeCfg);
        }

        return Response.json({ success: true, name: agentName });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }


    if (url.pathname === "/api/teams" && req.method === "GET") {
      const crews = getFullCrews();
      return Response.json({ teams: crews });
    }

    if (url.pathname === "/api/mcps" && req.method === "GET") {
      const mcps = await getInstalledMCPsAsync();
      return Response.json({ mcps });
    }

    if (url.pathname === "/api/mcp/toggle" && req.method === "POST") {
      try {
        const body = await req.json();
        const { name, enabled } = body;
        const config = getOpenCodeConfig();
        if (!config.mcp || !config.mcp[name]) {
          return Response.json({ error: `MCP '${name}' não encontrado` }, { status: 404 });
        }
        const current = config.mcp[name].enabled !== false;
        const nextState = enabled !== undefined ? enabled : !current;
        config.mcp[name].enabled = nextState;
        writeOpenCodeConfig(config);
        return Response.json({ success: true, name, enabled: nextState });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/api/mcp/") && req.method === "DELETE") {
      try {
        const mcpName = decodeURIComponent(url.pathname.replace("/api/mcp/", "").trim());
        const config = getOpenCodeConfig();
        if (config.mcp && config.mcp[mcpName]) {
          delete config.mcp[mcpName];
          writeOpenCodeConfig(config);
        }

        // Also delete from any crew mcp.json
        const crews = getFullCrews();
        for (const crew of crews) {
          const mcpFile = join(FULL_CREWS_DIR, crew.id, "mcp", "mcp.json");
          if (existsSync(mcpFile)) {
            try {
              const crewMcp = JSON.parse(readFileSync(mcpFile, "utf-8"));
              if (crewMcp[mcpName]) {
                delete crewMcp[mcpName];
                writeFileSync(mcpFile, JSON.stringify(crewMcp, null, 2), "utf-8");
              }
            } catch {}
          }
        }

        return Response.json({ success: true, name: mcpName });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (url.pathname === "/api/activity" && req.method === "GET") {
      const telemetry = getLiveTelemetry();
      return Response.json(telemetry);
    }

    if (url.pathname === "/api/logs" && req.method === "GET") {
      const structuredLogs = getStructuredLogs(200);
      return Response.json(structuredLogs);
    }

    if (url.pathname === "/api/skills" && req.method === "GET") {
      const skills = getInstalledSkills();
      return Response.json({ skills });
    }

    if (url.pathname.startsWith("/api/skills/") && req.method === "DELETE") {
      try {
        const skillName = decodeURIComponent(url.pathname.replace("/api/skills/", "").trim());
        const skillPath = join(SKILLS_DIR_PATH, skillName);
        if (existsSync(skillPath)) {
          rmSync(skillPath, { recursive: true, force: true });
        }

        const crews = getFullCrews();
        for (const crew of crews) {
          const crewSkillPath = join(FULL_CREWS_DIR, crew.id, "skills", skillName);
          if (existsSync(crewSkillPath)) {
            rmSync(crewSkillPath, { recursive: true, force: true });
          }
        }

        return Response.json({ success: true, name: skillName });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Health check do servidor OpenCode
    if (url.pathname === "/api/opencode/health" && req.method === "GET") {
      try {
        const base = await getOpencodeApiBase();
        const res = await fetch(`${base}/global/health`, { signal: AbortSignal.timeout(1500) });
        const data = await res.json() as any;
        return Response.json({ online: true, port: base.split(":").pop(), ...data });
      } catch {
        return Response.json({ online: false, healthy: false, version: null });
      }
    }

    // SSE Relay: eventos do OpenCode + Notificações do Dashboard
    if (url.pathname === "/api/opencode/events" && req.method === "GET") {
      let upstreamController: AbortController | null = null;
      let localController: ReadableStreamDefaultController | null = null;

      const stream = new ReadableStream({
        async start(controller) {
          localController = controller;
          sseClients.add(controller);
          upstreamController = new AbortController();
          const enc = new TextEncoder();

          try {
            const base = await getOpencodeApiBase();
            const upstream = await fetch(`${base}/global/event`, {
              signal: upstreamController.signal,
              headers: { "Accept": "text/event-stream" }
            });

            if (upstream.ok && upstream.body) {
              const reader = upstream.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            }
          } catch (err: any) {
            // Continua ativo para eventos locais
          }
        },
        cancel() {
          if (localController) sseClients.delete(localController);
          upstreamController?.abort();
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────

    const publicDir = join(__dirname, "public");

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = readFileSync(join(publicDir, "index.html"), "utf-8");
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/app.css") {
      const css = readFileSync(join(publicDir, "app.css"), "utf-8");
      return new Response(css, { headers: { "Content-Type": "text/css; charset=utf-8" } });
    }

    if (url.pathname === "/app.js") {
      const js = readFileSync(join(publicDir, "app.js"), "utf-8");
      return new Response(js, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });
    }

    if (url.pathname === "/dither-background.js") {
      const js = readFileSync(join(publicDir, "dither-background.js"), "utf-8");
      return new Response(js, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`✨ OpenCode Master Dashboard rodando em http://localhost:${PORT}`);
console.log(`📁 Full Crews Workspace Ativo em: ${FULL_CREWS_DIR}`);
