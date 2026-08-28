// =========================================================
// OPENCODE MASTER DASHBOARD · FULL CREWS & ORCHESTRATION
// =========================================================

let globalState = {
  config: {},
  opencode: {},
  models: [],
  skills: [],
  skillsDetailed: [],
  agents: [],
  crews: [],
  teams: [],
  mcps: [],
  crewbee: {}
};

let telemetryData = {
  totalSessions: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  sessionsTree: []
};

let logsPayload = {
  counts: { total: 0, success: 0, error: 0, warn: 0, info: 0 },
  logs: []
};

let skillsList = [];
let allDiscoveredAgents = [];
let allDiscoveredCrews = [];
let currentLogCategoryFilter = 'all';
let currentAgentCategoryFilter = 'all';
let currentSkillsViewMode = localStorage.getItem('opencode_skills_view') || 'grid';

let opencodeServerOnline = false;
let sseEventSource = null;
let liveOpencodeEvents = [];

// Injeta estilos auxiliares
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .metric-tag.status-offline { background: rgba(244,63,94,0.15); color: #fda4af; border-color: rgba(244,63,94,0.35); }
    .tag-crew-master { background: rgba(245, 158, 11, 0.18); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 10px; font-weight: 800; font-family: var(--font-mono); padding: 2px 8px; border-radius: 4px; }
    .tag-crew-subagent { background: rgba(6, 182, 212, 0.15); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.35); font-size: 10px; font-weight: 800; font-family: var(--font-mono); padding: 2px 8px; border-radius: 4px; }
  `;
  document.head.appendChild(style);
})();

const PANTHEON_ICONS = {
  orchestrator: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
  oracle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`,
  council: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  librarian: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
  explorer: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
  designer: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"></path></svg>`,
  fixer: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`
};

const PANTHEON_METADATA = {
  orchestrator: {
    name: 'Orchestrator',
    lane: 'Planning & Delegation Graph',
    perms: 'read_files, write_files',
    stats: 'Enterprise DAG Meta-Orchestrator',
    desc: 'Coordena o grafo de trabalho, planeja e despacha tarefas para os especialistas em background.',
    orchestratorPrompt: `@orchestrator\n- Lane: Planning & Delegation Graph\n- Role: Coordenador supremo e orquestrador\n- Permissions: read_files, write_files\n- **Delegate when:** Tarefas compostas que demandam múltiplos especialistas\n- **Rule of thumb:** Decompor e orquestrar execuções paralelas.`
  },
  oracle: {
    name: 'Oracle',
    lane: 'Architecture, risk, debugging strategy & review',
    perms: 'read_files',
    stats: '5x better decision maker, 0.8x speed',
    desc: 'Consultor de raciocínio profundo, algoritmos complexos, arquitetura e debugging avançado.',
    orchestratorPrompt: `@oracle\n- Lane: Architecture, risk, debugging strategy, and review\n- Role: Strategic advisor for high-stakes decisions and persistent problems, code reviewer\n- Permissions: read_files\n- Stats: 5x better decision maker, problem solver\n- **Delegate when:** Major architectural decisions • Persistent problems (2+ attempts) • High-risk refactors • Security/scalability decisions\n- **Don't delegate when:** Routine decisions • Straightforward bug fixes\n- **Rule of thumb:** Need senior architect review or code review? → @oracle.`
  },
  council: {
    name: 'Council',
    lane: 'High-stakes multi-model consensus synthesis',
    perms: 'read_files',
    stats: 'Multi-LLM Consensus Engine',
    desc: 'Executa múltiplos modelos em paralelo e sintetiza uma resposta consensual unificada.',
    orchestratorPrompt: `@council\n- Lane: High-stakes multi-model decision support\n- Role: Multi-LLM consensus engine\n- Permissions: read_files\n- **Delegate when:** Critical decisions need multiple independent perspectives • Ambiguous problems\n- **Rule of thumb:** Need multi-model validation? → @council.`
  },
  librarian: {
    name: 'Librarian',
    lane: 'External docs & research (Context7 / GitHub)',
    perms: 'read_files',
    stats: 'Fast Documentation Search',
    desc: 'Pesquisa documentações técnicas atualizadas (Context7) e repositórios GitHub (gh_grep).',
    orchestratorPrompt: `@librarian\n- Lane: External documentation and library research\n- Role: Documentation researcher and code finder\n- Permissions: read_files (context7, gh_grep)\n- **Delegate when:** API docs, third-party libraries, breaking changes\n- **Don't delegate when:** General programming knowledge\n- **Rule of thumb:** "How does this library work?" → @librarian.`
  },
  explorer: {
    name: 'Explorer',
    lane: 'Fast codebase search & dependency recon',
    perms: 'read_files',
    stats: '10x faster search, 1/10th cost',
    desc: 'Varredura de repositório, mapeamento de dependências e símbolos.',
    orchestratorPrompt: `@explorer\n- Lane: Fast codebase search and discovery\n- Role: Read-only scout for searching\n- Permissions: read_files\n- Stats: 10x faster codebase search, 1/10 cost\n- **Delegate when:** Locating files, searching across multiple directories, symbol discovery\n- **Rule of thumb:** Need to find where something is defined? → @explorer.`
  },
  designer: {
    name: 'Designer',
    lane: 'UI/UX design, polish, glassmorphism & layout',
    perms: 'read_files, write_files',
    stats: '10x better UI/UX design',
    desc: 'Frontend, CSS moderno, glassmorphism, design systems e interfaces responsivas.',
    orchestratorPrompt: `@designer\n- Lane: UI/UX design, related edits, design polish and review\n- Role: Visual and interaction quality specialist\n- Permissions: read_files, write_files\n- Stats: 10x better UI/UX than generalist\n- **Delegate when:** User-facing interfaces needing polish • Responsive layouts • Animations & micro-interactions\n- **Rule of thumb:** Users see it and polish matters? → @designer.`
  },
  fixer: {
    name: 'Fixer',
    lane: 'Bounded implementation & fast mechanical code edits',
    perms: 'read_files, write_files',
    stats: '2x faster code edits, 1/2 cost',
    desc: 'Correções cirúrgicas de bugs, tipagem, erros de compilação e testes automatizados.',
    orchestratorPrompt: `@fixer\n- Lane: Bounded implementation and executioner\n- Role: Fast execution specialist for well-defined tasks\n- Permissions: read_files, write_files\n- Stats: 2x faster code edits, 1/2 cost\n- **Delegate when:** Bounded code changes with complete context • Multi-folder parallel edits\n- **Don't delegate when:** Needs discovery/research/architectural decisions\n- **Rule of thumb:** Headless/mechanical implementation → @fixer.`
  },
  observer: {
    name: 'Observer',
    lane: 'Visual & multimodal media analysis',
    perms: 'read_files',
    stats: 'Isolates image/media tokens from context',
    desc: 'Análise de imagens, screenshots, diagramas e documentos visuais.',
    orchestratorPrompt: `@observer\n- Lane: Visual/media analysis isolated from orchestrator context\n- Role: Visual analysis specialist for images, PDFs, diagrams\n- Permissions: read_files\n- **Delegate when:** Need to analyze images, error screenshots, UI mockups\n- **Rule of thumb:** Multi-modal image analysis? → @observer.`
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  setupDropZone();
  initThemeWidget();

  await fetchState();
  await fetchActivityData();
  await fetchLogsData();
  await fetchSkillsData();

  setInterval(fetchActivityData, 5000);
  setInterval(fetchLogsData, 6000);
  setInterval(syncStateFromOpencode, 8000);

  await checkOpencodeServer();
  connectOpencodeSSE();
  setInterval(checkOpencodeServer, 10000);
});

// THEME WIDGET
function initThemeWidget() {
  const saved = localStorage.getItem('opencode_dither_mode') || '5';
  const mode = parseInt(saved, 10);
  const labels = {
    0: 'Cyber Indigo',
    1: 'Chroma Rainbow',
    2: 'Acid Emerald',
    3: 'Nebula Violet',
    4: 'Solar Sunset',
    5: 'Midnight Thunder',
    6: 'Cyberpunk Neon',
    7: 'Crimson Eclipse'
  };

  const labelEl = document.getElementById('currentThemeLabel');
  if (labelEl) labelEl.textContent = labels[mode] || 'Midnight Thunder';

  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === String(mode));
  });

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-widget-container')) {
      document.getElementById('themeDropdownMenu')?.classList.remove('active');
    }
  });
}

function toggleThemeDropdown(e) {
  e.stopPropagation();
  const menu = document.getElementById('themeDropdownMenu');
  if (menu) menu.classList.toggle('active');
}

function selectDitherTheme(mode, label, btn) {
  if (window.ditherSettings) {
    window.ditherSettings.colorMode = mode;
  }
  localStorage.setItem('opencode_dither_mode', String(mode));

  const labelEl = document.getElementById('currentThemeLabel');
  if (labelEl) labelEl.textContent = label;

  document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  document.getElementById('themeDropdownMenu')?.classList.remove('active');
  showToast(`Paleta: ${label}`);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) targetContent.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => 
    b.getAttribute('onclick')?.includes(`'${tabId}'`)
  );
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'crews') renderCrewsTab();
  if (tabId === 'logs') fetchLogsData();
  if (tabId === 'skills') fetchSkillsData();
  if (tabId === 'agents') applyAgentsFilter();
  if (tabId === 'mcps') renderMCPsTab();
}

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    globalState = await res.json();
    allDiscoveredAgents = globalState.agents || [];
    allDiscoveredCrews = globalState.crews || [];
    renderAll();
  } catch (err) {
    console.error('Erro ao obter estado:', err);
  }
}

async function fetchActivityData() {
  try {
    const res = await fetch('/api/activity');
    telemetryData = await res.json();
    renderTelemetry();
  } catch (err) {
    console.error('Erro ao obter telemetria:', err);
  }
}

async function fetchLogsData() {
  try {
    const res = await fetch('/api/logs');
    logsPayload = await res.json();
    renderLogsUI();
  } catch (err) {
    console.error('Erro ao obter logs:', err);
  }
}

async function fetchSkillsData() {
  try {
    const res = await fetch('/api/skills');
    const data = await res.json();
    skillsList = data.skills || [];
    applySkillsFilter();
  } catch (err) {
    console.error('Erro ao obter skills:', err);
  }
}

async function syncStateFromOpencode() {
  try {
    const [stateRes, skillsRes, mcpsRes] = await Promise.all([
      fetch('/api/state'),
      fetch('/api/skills'),
      fetch('/api/mcps')
    ]);

    const newState = await stateRes.json();
    const skillsData = await skillsRes.json();
    const mcpsData = await mcpsRes.json();

    allDiscoveredAgents = newState.agents || [];
    allDiscoveredCrews = newState.crews || [];
    globalState = { ...globalState, ...newState };

    skillsList = skillsData.skills || [];
    globalState.mcps = mcpsData.mcps || [];

    renderQuickbar();

    // Atualiza a visualização da aba ativa sem perder foco
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'tab-crews') renderCrewsTab();
    else if (activeTab === 'tab-agents') applyAgentsFilter();
    else if (activeTab === 'tab-skills') applySkillsFilter();
    else if (activeTab === 'tab-mcps') renderMCPsTab();
  } catch (err) {
    console.warn('Sync error:', err);
  }
}

// Sincronização contínua em tempo real a cada 2 segundos com o OpenCode
setInterval(syncStateFromOpencode, 2000);

function renderAll() {
  renderQuickbar();
  renderCrewsTab();
  applyAgentsFilter();
  setSkillsViewMode(currentSkillsViewMode);
}

// QUICKBAR STRIP
function renderQuickbar() {
  const container = document.getElementById('quickbarChipsList');
  if (!container) return;

  const preset = globalState.config.preset || 'omniroute';
  const activePresetConfig = globalState.config.presets?.[preset] || {};

  const chips = [];

  // Core Agents
  for (const [key] of Object.entries(PANTHEON_METADATA)) {
    const model = activePresetConfig[key]?.model || (key === 'council' ? 'Consensus' : 'omniroute/combo/code');
    const shortModel = model.split('/').pop() || model;

    chips.push(`
      <div class="quick-agent-pill" onclick="switchTab('agents')">
        <span class="quick-agent-status"></span>
        <span class="quick-agent-handle">@${key}</span>
        <span class="quick-agent-model">${escapeHtml(shortModel)}</span>
      </div>
    `);
  }

  // Active Crew Masters
  for (const crew of allDiscoveredCrews) {
    if (!crew.enabled) continue;
    for (const agent of crew.agents) {
      if (agent.type === 'primary' || agent.name === crew.leader) {
        const shortModel = (agent.model || 'omniroute').split('/').pop() || agent.model;
        chips.push(`
          <div class="quick-agent-pill" onclick="openCrewAgentModal('${escapeHtml(crew.id)}', '${escapeHtml(agent.name)}')">
            <span class="quick-agent-status" style="background: #f59e0b; box-shadow: 0 0 6px #f59e0b;"></span>
            <span class="quick-agent-handle" style="color: #fde047;">👑 @${escapeHtml(agent.name)}</span>
            <span class="quick-agent-model">${escapeHtml(shortModel)}</span>
          </div>
        `);
      }
    }
  }

  container.innerHTML = chips.join('');
}

// =========================================================
// FULL CREWS VISUAL WORKSPACE RENDERING
// =========================================================

function renderPresidentHub() {
  const container = document.getElementById('presidentHubContainer');
  if (!container) return;

  const presidente = allDiscoveredAgents.find(a => a.name === 'presidente') || {
    name: 'presidente',
    displayName: 'Presidente',
    role: 'Presidente & Orquestrador Executivo Global',
    model: 'omniroute/combo/code',
    skills: ['oh-my-opencode-slim', 'reflect', 'verification-planning']
  };

  const crews = allDiscoveredCrews.length > 0 ? allDiscoveredCrews : (globalState.crews || []);
  const leaderHandles = crews.map(c => {
    const leader = (c.agents || []).find(a => a.type === 'primary' || a.name === c.leader) || (c.agents && c.agents[0]);
    return leader ? { handle: leader.name, role: leader.role || leader.displayName, crewName: c.name, crewId: c.id } : null;
  }).filter(Boolean);

  container.innerHTML = `
    <div class="glass-card president-command-card" style="border: 1px solid rgba(245, 158, 11, 0.4); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 20, 28, 0.95) 100%); padding: 20px 24px; border-radius: 18px; position: relative; overflow: hidden;">
      <div style="position: absolute; right: -20px; top: -20px; width: 140px; height: 140px; background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%); pointer-events: none;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; gap: 16px; align-items: center;">
          <div style="width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); border: 2px solid #fde047;">
            🏛️
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h2 style="font-size: 20px; font-weight: 800; color: #fff; margin: 0;">@presidente</h2>
              <span class="tag-origin president" style="background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
                🏛️ LÍDER DOS LÍDERES (MODO PRIMÁRIO)
              </span>
              <span class="tag-origin initial-prompt" style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.5); font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
                ⚡ INITIAL PROMPT MODEL
              </span>
            </div>
            <p style="font-size: 12.5px; color: var(--text-dim); margin: 4px 0 0 0;">
              ${escapeHtml(presidente.role || 'Presidente & Orquestrador Executivo Global')} · <strong>Comanda ${crews.length} Equipes e ${leaderHandles.length} Mestres</strong>
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-secondary" style="font-size: 11px; padding: 6px 12px;" onclick="openCrewAgentModal('none', 'presidente')">
            ⚙️ Configurar Presidente
          </button>
          <button class="btn-secondary" style="font-size: 11px; padding: 6px 12px;" onclick="openFolderInFinder('~/.config/opencode/agents')">
            📂 Abrir no Finder
          </button>
          <button class="btn-cta" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 800; font-size: 11.5px; padding: 7px 14px; border: none; box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);" onclick="openPresidentDirectiveModal()">
            ⚡ Despachar Diretriz aos Líderes
          </button>
        </div>
      </div>

      <!-- REDE DE COMANDO: PRESIDENTE CONECTADO AOS LÍDERES -->
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(245, 158, 11, 0.2);">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #fde68a; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span>🔗 Conexão Direta com Mestres de Esquadrão:</span>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${leaderHandles.length > 0 ? leaderHandles.map(l => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399;"></span>
              <span style="font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; color: #fff;">@${escapeHtml(l.handle)}</span>
              <span style="font-size: 10.5px; color: var(--text-dim);">(${escapeHtml(l.crewName)})</span>
            </div>
          `).join('') : `
            <span style="font-size: 11.5px; color: var(--text-dim);">Nenhum líder de equipe cadastrado no momento.</span>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderCrewsTab() {
  renderPresidentHub();

  const container = document.getElementById('crewsContainerGrid');
  if (!container) return;

  const crews = allDiscoveredCrews.length > 0 ? allDiscoveredCrews : (globalState.crews || []);

  if (crews.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 40px; margin-bottom: 12px;">👥</div>
        <h3 style="font-size: 18px; font-weight: 800; color: #fff;">Nenhuma Crew Criada</h3>
        <p style="font-size: 13px; color: var(--text-dim); max-width: 440px; margin: 8px auto 20px auto;">
          Crie uma nova equipe para estruturar agentes mestres, subagentes subordinados, mural de instruções, skills e servidores MCP.
        </p>
        <button class="btn-cta" onclick="openCreateCrewModal()">+ Criar Primeira Crew</button>
      </div>
    `;
    return;
  }

  container.innerHTML = crews.map(crew => {
    const isEnabled = crew.enabled !== false;
    const agents = crew.agents || [];
    
    // Identifica todos os líderes/mestres da equipe
    let masters = agents.filter(a => a.type === 'primary' || a.name === crew.leader);
    if (masters.length === 0 && agents.length > 0) {
      masters = [agents[0]];
    }

    const subagents = agents.filter(a => !masters.some(m => m.name === a.name));

    // Mapeia 1 linha por líder + seus respectivos servos
    const leaderLines = masters.map(master => {
      let assignedServants = subagents.filter(s => 
        s.master === master.name || 
        (master.subagents && master.subagents.includes(s.name))
      );

      if (masters.length === 1 && assignedServants.length === 0 && subagents.length > 0) {
        assignedServants = subagents;
      }

      return {
        master,
        servants: assignedServants
      };
    });

    const claimedServantNames = new Set(leaderLines.flatMap(l => l.servants.map(s => s.name)));
    const unassignedServants = subagents.filter(s => !claimedServantNames.has(s.name));

    return `
      <div class="crew-box-card ${!isEnabled ? 'crew-disabled' : ''}">
        <!-- CREW HEADER -->
        <div class="crew-header-main">
          <div class="crew-header-left">
            <div class="crew-avatar-lg">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="crew-title-area">
              <h3>
                ${escapeHtml(crew.name)}
                <span class="tag-team">@crew/${escapeHtml(crew.id)}</span>
                <span class="tag-active-pill ${isEnabled ? 'online' : 'offline'}">
                  <span class="pulse-dot"></span>
                  ${isEnabled ? 'ATIVA' : 'EM ESPERA'}
                </span>
              </h3>
              <p>${escapeHtml(crew.description || 'Equipe autônoma.')} · <strong>${agents.length} especialistas</strong></p>
            </div>
          </div>

          <div class="crew-header-actions">
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="openEditCrewModal('${escapeHtml(crew.id)}')">
              ✏️ Editar
            </button>
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="openFolderInFinder('full crews/${escapeHtml(crew.id)}/mural')">
              📂 Mural (Finder)
            </button>
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="openFolderInFinder('full crews/${escapeHtml(crew.id)}')">
              📁 Pasta Equipe
            </button>
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="openCreateCrewAgentModal('${escapeHtml(crew.id)}')">
              + Novo Agente
            </button>
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.35);" onclick="openCrewSkillPickerModal('${escapeHtml(crew.id)}')">
              📦 Atribuir Skills
            </button>
            <button 
              class="btn-secondary" 
              style="font-size: 11px; padding: 6px 10px; background:${isEnabled ? 'rgba(234,179,8,0.12)' : 'rgba(16,185,129,0.15)'}; color:${isEnabled ? '#fde047' : '#6ee7b7'}; border-color:${isEnabled ? 'rgba(234,179,8,0.3)' : 'rgba(16,185,129,0.3)'};"
              onclick="toggleCrewByName('${escapeHtml(crew.id)}', ${isEnabled})"
            >
              ${isEnabled ? 'Desativar' : 'Ativar'}
            </button>
            <button class="btn-remove-agent" style="font-size: 11px; padding: 6px 10px;" onclick="deleteCrewById('${escapeHtml(crew.id)}')">
              Excluir
            </button>
          </div>
        </div>

        <!-- HIERARCHY & AGENTS (LINHAS DE LIDERANÇA: 1 LINHA POR LÍDER + SERVOS) -->
        <div class="crew-hierarchy-container">
          <div class="crew-section-label">
            <span>Hierarquia de Comando (1 Linha por Líder + Servos Subordinados)</span>
            <span>${agents.length} Especialistas na Equipe</span>
          </div>

          <div class="office-squad-lines" style="margin-top: 10px;">
            ${agents.length === 0 ? `
              <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13px; font-family: var(--font-mono);">
                Nenhum agente cadastrado nesta equipe. Clique em <strong>+ Novo Agente</strong> para começar.
              </div>
            ` : ''}

            ${leaderLines.map(line => `
              <div class="office-leader-line" id="crewLeaderLine_${crew.id}_${line.master.name}">
                <!-- LÍDER NO INÍCIO DA LINHA -->
                <div class="leader-node-wrap">
                  <span class="leader-node-tag">👑 Líder</span>
                  ${renderCrewAgentInlineCard(line.master, crew.id, true)}
                </div>

                <!-- CONECTOR -->
                <div class="leader-servants-connector">
                  <div class="connector-arrow"><span>➔</span></div>
                  <span class="connector-label">${line.servants.length} ${line.servants.length === 1 ? 'servo' : 'servos'}</span>
                </div>

                <!-- SERVOS NA MESMA LINHA -->
                <div class="servants-cards-row">
                  ${line.servants.length > 0 
                    ? line.servants.map(s => renderCrewAgentInlineCard(s, crew.id, false)).join('')
                    : `
                      <div style="padding: 14px 18px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 11.5px;">
                        <span>↳</span> Nenhum servo vinculado a @${escapeHtml(line.master.name)}.
                        <button class="btn-secondary" style="font-size: 9px; padding: 2px 6px;" onclick="openCreateCrewAgentModal('${escapeHtml(crew.id)}')">+ Vincular</button>
                      </div>
                    `
                  }
                </div>
              </div>
            `).join('')}

            ${unassignedServants.length > 0 ? `
              <div class="office-leader-line no-leader-line">
                <div class="leader-node-wrap">
                  <span class="leader-node-tag" style="color: #60a5fa;">↳ Avulsos</span>
                  <div style="width: 156px; height: 100px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; font-size: 11px; color: var(--text-dim); text-align: center; padding: 8px;">
                    Especialistas sem líder
                  </div>
                </div>
                <div class="leader-servants-connector">
                  <div class="connector-arrow"><span>➔</span></div>
                </div>
                <div class="servants-cards-row">
                  ${unassignedServants.map(s => renderCrewAgentInlineCard(s, crew.id, false)).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- MURAL SNAPSHOT & CREW ASSETS -->
        <div class="crew-aux-grid">
          <!-- Mural Preview Card -->
          <div class="crew-panel-card">
            <div class="crew-section-label">
              <span>Mural de Instruções Diretas</span>
              <button class="btn-secondary" style="font-size: 9px; padding: 2px 6px;" onclick="openCrewMuralModal('${escapeHtml(crew.id)}')">Editar Mural</button>
            </div>
            <div class="crew-mural-preview">
              ${escapeHtml(crew.mural?.instructions || 'Nenhuma instrução definida. Clique em Editar Mural para adicionar diretrizes.')}
            </div>
          </div>

          <!-- Team Skills Card -->
          <div class="crew-panel-card">
            <div class="crew-section-label">
              <span>Habilidades da Equipe (${crew.skills?.length || 0})</span>
              <button class="btn-secondary" style="font-size: 9.5px; padding: 2px 8px; color: #c084fc; border-color: rgba(168,85,247,0.35);" onclick="openCrewSkillPickerModal('${escapeHtml(crew.id)}')">⚡ Gerenciar Skills</button>
            </div>
            <div class="skills-pill-row">
              ${(crew.skills || []).length > 0 
                ? crew.skills.map(sk => `<span class="skill-chip" title="${escapeHtml(sk.description)}">${escapeHtml(sk.name)}</span>`).join('')
                : `<span style="font-size:11.5px; color:var(--text-dim); font-family:var(--font-mono);">Nenhuma skill cadastrada na equipe</span>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCrewAgentInlineCard(agent, crewId, isLeader = false) {
  const shortModel = (agent.model || 'omniroute').split('/').pop() || agent.model;
  const sch = agent.schedule || {};
  const hasSchedule = sch.enabled === true;

  let scheduleText = '';
  if (hasSchedule) {
    const freq = sch.frequency || 'once';
    if (freq === 'hourly') scheduleText = `A cada ${sch.interval_hours || 1}h`;
    else if (freq === 'daily') scheduleText = `Diário ${sch.time || '09:00'}`;
    else if (freq === 'weekly') scheduleText = `Semanal ${sch.time || '09:00'}`;
    else if (freq === 'monthly') scheduleText = `Mensal dia ${sch.month_day || 1}`;
    else if (freq === 'cron') scheduleText = `Cron`;
    else scheduleText = sch.datetime ? new Date(sch.datetime).toLocaleDateString([], {month:'numeric', day:'numeric'}) : 'Agendado';
  }

  const isReadOnly = agent.permissions && !agent.permissions.includes('write');
  const isInitialPrompt = agent.mode === 'primary' || agent.mode === 'all' || agent.isInitialPrompt === true;

  return `
    <div class="office-agent-mini-card ${isLeader ? 'is-leader' : ''}" id="crewAgentCard_${crewId}_${agent.name}">
      <!-- TOP: AVATAR & STATUS -->
      <div class="agent-mini-top-row">
        <div class="agent-mini-avatar ${isLeader ? 'avatar-leader' : ''}">
          ${agent.avatar ? `<img src="${escapeHtml(agent.avatar)}" alt="avatar">` : (isLeader ? `👑` : `👤`)}
          <span class="agent-status-beacon ${hasSchedule ? 'working' : 'idle'}" title="${hasSchedule ? 'Agendamento Ativo' : 'Pronto'}"></span>
        </div>
      </div>

      <!-- IDENTITY & DYNAMIC ROLE -->
      <div class="agent-mini-body">
        <div class="agent-mini-handle">
          ${isLeader ? `<span style="color:#fde047; font-size: 14px;">👑</span> ` : ''}@${escapeHtml(agent.name)}
        </div>
        <div class="agent-mini-role">${escapeHtml(agent.role || agent.displayName || 'Especialista')}</div>
        ${agent.lane ? `<div class="agent-lane-badge" title="${escapeHtml(agent.lane)}">🎯 ${escapeHtml(agent.lane)}</div>` : ''}
        
        <!-- SLIM ARCHITECTURE BADGES -->
        <div class="agent-slim-meta-row" style="justify-content: center; margin: 8px 0;">
          <span class="agent-perm-badge ${isReadOnly ? 'perm-readonly' : 'perm-readwrite'}">
            ${isReadOnly ? '🔒 Read-Only' : '⚡ Read/Write'}
          </span>
          ${agent.stats ? `<span class="agent-stats-badge" title="${escapeHtml(agent.stats)}">🚀 ${escapeHtml(agent.stats.slice(0, 16))}</span>` : ''}
          ${isInitialPrompt ? `<span class="tag-origin initial-prompt" style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.5); font-weight: 800; font-size: 8.5px; padding: 2px 5px; border-radius: 4px;">⚡ INIT</span>` : ''}
        </div>
      </div>

      <!-- BOTTOM: ACTIONS & META (100% EMBUTIDO DENTRO DO CARD) -->
      <div class="agent-mini-footer">
        <div class="agent-mini-pills-row">
          ${hasSchedule ? `
            <span class="agent-mini-pill" style="color:#34d399; border-color:rgba(52,211,153,0.3); background:rgba(52,211,153,0.08);">
              🕒 ${escapeHtml(scheduleText)}
            </span>
          ` : ''}
          <span class="agent-mini-pill">${escapeHtml(shortModel)}</span>
        </div>

        <div class="agent-mini-actions-grid">
          <button class="agent-routing-btn btn-card-action" onclick="openAgentRoutingModal('${escapeHtml(agent.name)}')">
            📋 Contrato
          </button>
          <button class="btn-secondary btn-card-action" onclick="runCrewAgentTaskNow('${escapeHtml(crewId)}', '${escapeHtml(agent.name)}')">
            ▶ Executar
          </button>
          <button class="btn-secondary btn-card-action" onclick="openCrewAgentModal('${escapeHtml(crewId)}', '${escapeHtml(agent.name)}')">
            ✏️ Editar
          </button>
          <button class="btn-remove-agent btn-card-delete" title="Excluir da Equipe" onclick="deleteCrewAgentByName('${escapeHtml(crewId)}', '${escapeHtml(agent.name)}')">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `;
}

// =========================================================
// CREW ACTIONS & MODAL CONTROLLERS
// =========================================================

function openCreateCrewModal() {
  document.getElementById('modalCrewName').value = '';
  document.getElementById('modalCrewId').value = '';
  document.getElementById('modalCrewDesc').value = '';
  document.getElementById('modalCrewLeader').value = '';
  document.getElementById('createCrewModal').style.display = 'flex';
}

function closeCreateCrewModal() {
  document.getElementById('createCrewModal').style.display = 'none';
}

function autoFillCrewId() {
  const name = document.getElementById('modalCrewName').value;
  const idInput = document.getElementById('modalCrewId');
  if (!idInput.dataset.manual) {
    idInput.value = name.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
  }
}

async function submitCreateCrewForm() {
  const name = document.getElementById('modalCrewName').value.trim();
  const id = document.getElementById('modalCrewId').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const description = document.getElementById('modalCrewDesc').value.trim();
  const leader = document.getElementById('modalCrewLeader').value.trim().toLowerCase().replace('@', '');
  const modelPreset = document.getElementById('modalCrewPreset').value;

  if (!name || !id) {
    alert('Nome e Identificador da Crew são obrigatórios.');
    return;
  }

  try {
    const res = await fetch('/api/crews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, description, leader, modelPreset, enabled: true })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeCreateCrewModal();
      showToast(`Crew "${name}" criada com sucesso!`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error || 'Falha ao criar equipe'}`);
    }
  } catch (err) {
    alert(`Erro de conexão: ${err.message}`);
  }
}

async function toggleCrewByName(crewId, currentEnabled) {
  const nextState = !currentEnabled;
  try {
    const res = await fetch(`/api/crews/${crewId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextState })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Crew "${crewId}" ${nextState ? 'ativada' : 'desativada'}.`);
      await fetchState();
    }
  } catch (err) {
    showToast('Erro ao alternar: ' + err.message);
  }
}

async function deleteCrewById(crewId) {
  const confirmed = await showConfirmDialog({
    title: 'Excluir Crew',
    message: `Deseja remover permanentemente a equipe <strong style="color:#fff;">"${escapeHtml(crewId)}"</strong> e todos os seus agentes, skills e mural?`,
    confirmText: 'Excluir Crew Definitivamente',
    isDanger: true
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/crews/${crewId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Crew "${crewId}" excluída.`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (err) {
    alert(`Falha ao excluir: ${err.message}`);
  }
}

// =========================================================
// FINDER & NATIVE WORKSPACE HELPERS
// =========================================================

async function openFolderInFinder(path) {
  try {
    const res = await fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`📂 Pasta aberta no Finder: ${data.path.split('/').pop()}`);
    } else {
      alert(`Erro ao abrir pasta: ${data.error}`);
    }
  } catch (err) {
    showToast(`Erro de conexão: ${err.message}`);
  }
}

async function chooseAgentWorkingDir() {
  try {
    const res = await fetch('/api/choose-folder', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.path) {
      document.getElementById('modalCrewAgentCustomDir').value = data.path;
      showToast(`📁 Pasta selecionada: ${data.path}`);
    }
  } catch (err) {
    console.warn('Folder picker indisponível:', err);
  }
}

// =========================================================
// PRESIDENTIAL DIRECTIVES MODAL
// =========================================================

function openPresidentDirectiveModal() {
  document.getElementById('presidentDirectivePrompt').value = '';
  document.getElementById('presidentDirectiveModal').style.display = 'flex';
}

function closePresidentDirectiveModal() {
  document.getElementById('presidentDirectiveModal').style.display = 'none';
}

async function submitPresidentDirective() {
  const directive = document.getElementById('presidentDirectivePrompt').value.trim();
  if (!directive) {
    alert('Digite a diretriz estratégica do Presidente.');
    return;
  }

  showToast('🏛️ Despachando Diretriz Presidencial para todos os líderes de equipe...');
  try {
    const res = await fetch('/api/president/delegate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closePresidentDirectiveModal();
      showToast(`✅ Diretriz transmitida para ${data.dispatchedTo?.length || 0} líderes de equipe!`);
      await fetchState();
    } else {
      alert(`Erro ao despachar: ${data.error}`);
    }
  } catch (err) {
    alert(`Erro de conexão: ${err.message}`);
  }
}

// =========================================================
// EDIT CREW MODAL
// =========================================================

function openEditCrewModal(crewId) {
  const crew = allDiscoveredCrews.find(c => c.id === crewId);
  if (!crew) return;

  document.getElementById('editCrewId').value = crewId;
  document.getElementById('editCrewName').value = crew.name || crewId;
  document.getElementById('editCrewDesc').value = crew.description || '';
  document.getElementById('editCrewLeader').value = crew.leader || '';
  document.getElementById('editCrewPreset').value = crew.modelPreset || 'omniroute/combo/code';

  document.getElementById('editCrewModal').style.display = 'flex';
}

function closeEditCrewModal() {
  document.getElementById('editCrewModal').style.display = 'none';
}

async function submitEditCrewForm() {
  const crewId = document.getElementById('editCrewId').value;
  const name = document.getElementById('editCrewName').value.trim();
  const description = document.getElementById('editCrewDesc').value.trim();
  const leader = document.getElementById('editCrewLeader').value.trim().toLowerCase().replace('@', '');
  const modelPreset = document.getElementById('editCrewPreset').value;

  if (!name) {
    alert('Nome da equipe é obrigatório.');
    return;
  }

  try {
    const res = await fetch(`/api/crews/${crewId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, leader, modelPreset })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeEditCrewModal();
      showToast(`Equipe "${name}" atualizada com sucesso!`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error || 'Falha ao editar equipe'}`);
    }
  } catch (err) {
    alert(`Erro de conexão: ${err.message}`);
  }
}

// =========================================================
// ADVANCED CREW AGENT MODAL & SUBAGENTS
// =========================================================

function onAgentCrewTargetChange() {
  const target = document.getElementById('modalCrewAgentCrewTarget')?.value || 'none';
  const name = document.getElementById('modalCrewAgentName')?.value.trim();
  const dirInput = document.getElementById('modalCrewAgentCustomDir');
  if (dirInput) {
    if (target === 'none' || target === 'custom') {
      dirInput.value = `/Users/mcp/.config/opencode/agents/`;
    } else {
      dirInput.value = `/Users/mcp/Documents/Default Project/full crews/${target}/agents/${name || ''}`;
    }
  }
}

function onInitialPromptToggleChange() {
  const cb = document.getElementById('modalCrewAgentInitialPrompt');
  const label = document.getElementById('initialPromptToggleLabel');
  if (cb && label) {
    if (cb.checked) {
      label.textContent = '⚡ Ativado (Initial Prompt)';
      label.style.color = '#a5b4fc';
    } else {
      label.textContent = '🔒 Subagente (Background)';
      label.style.color = '#94a3b8';
    }
  }
}

function openCreateCrewAgentModal(crewId = 'none') {
  populateCrewAgentModalOptions(crewId);

  const isCustom = !crewId || crewId === 'none' || crewId === 'custom';
  document.getElementById('modalCrewAgentCrewId').value = isCustom ? 'none' : crewId;
  document.getElementById('modalCrewAgentOriginalName').value = '';
  document.getElementById('crewAgentModalTitle').textContent = isCustom ? 'Novo Agente' : `Novo Agente da Crew @${crewId}`;
  document.getElementById('crewAgentModalCrewBadge').textContent = isCustom ? 'Destino: Agente Independente' : `Crew: ${crewId}`;

  const selectTarget = document.getElementById('modalCrewAgentCrewTarget');
  if (selectTarget) selectTarget.value = isCustom ? 'none' : crewId;

  document.getElementById('modalCrewAgentName').value = '';
  document.getElementById('modalCrewAgentName').disabled = false;
  document.getElementById('modalCrewAgentDisplayName').value = '';
  document.getElementById('modalCrewAgentRole').value = '';
  document.getElementById('modalCrewAgentType').value = 'subagent';

  // Initial Prompt Model Toggle
  const initialPromptCb = document.getElementById('modalCrewAgentInitialPrompt');
  if (initialPromptCb) {
    initialPromptCb.checked = false;
    onInitialPromptToggleChange();
  }

  document.getElementById('modalCrewAgentCustomDir').value = isCustom 
    ? `/Users/mcp/.config/opencode/agents/`
    : `/Users/mcp/Documents/Default Project/full crews/${crewId}/agents/`;

  // Oh-My-OpenCode Slim Architecture Fields
  document.getElementById('modalCrewAgentLane').value = '';
  document.getElementById('modalCrewAgentPermissions').value = 'read_files, write_files';
  document.getElementById('modalCrewAgentStats').value = '';
  document.getElementById('modalCrewAgentVariant').value = 'default';
  document.getElementById('modalCrewAgentOrchestratorPrompt').value = '';

  // Reset Schedule
  document.getElementById('modalCrewAgentScheduleEnabled').checked = false;
  document.getElementById('modalCrewAgentScheduleFrequency').value = 'daily';
  document.getElementById('modalCrewAgentScheduleTime').value = '09:00';
  document.getElementById('modalCrewAgentScheduleIntervalHours').value = '1';
  document.getElementById('modalCrewAgentScheduleMonthDay').value = '1';
  document.getElementById('modalCrewAgentScheduleDatetime').value = '';
  document.getElementById('modalCrewAgentScheduleCron').value = '';
  document.getElementById('modalCrewAgentSchedulePrompt').value = '';

  document.querySelectorAll('#scheduleWeekdaysContainer input').forEach(cb => {
    cb.checked = ['1', '2', '3', '4', '5'].includes(cb.value);
  });

  document.getElementById('modalCrewAgentPrompt').value = `# Diretrizes do Especialista\n\n<Role>\nVocê é um especialista focado em...\n</Role>\n\n## Diretrizes\n1. Siga as convenções da equipe.\n2. Entregue resultados cirúrgicos e estruturados.`;

  document.getElementById('modalCrewAgentAvatarImg').style.display = 'none';
  document.getElementById('modalCrewAgentAvatarPlaceholder').style.display = 'block';

  toggleHierarchyFields();
  toggleScheduleFields();
  updateScheduleFrequencyUI();

  document.getElementById('crewAgentModal').style.display = 'flex';
}

function openCrewAgentModal(crewId, agentName) {
  populateCrewAgentModalOptions(crewId);

  const crew = allDiscoveredCrews.find(c => c.id === crewId);
  const agent = crew?.agents?.find(a => a.name === agentName) || allDiscoveredAgents.find(a => a.name === agentName);
  if (!agent) return;

  const isPresident = agent.name === 'presidente' || agentName === 'presidente';
  const isCustom = !crewId || crewId === 'none' || crewId === 'custom' || agent.category === 'custom' || isPresident;
  document.getElementById('modalCrewAgentCrewId').value = isCustom ? 'none' : (crewId || agent.crewId);
  document.getElementById('modalCrewAgentOriginalName').value = agent.name;
  document.getElementById('crewAgentModalTitle').textContent = isPresident ? 'Configurar @presidente (Líder Supremo)' : `Editar @${agent.name}`;
  document.getElementById('crewAgentModalCrewBadge').textContent = isPresident ? 'Governança Global' : (isCustom ? 'Agente Independente' : `Crew: ${crewId || agent.crewId}`);

  const selectTarget = document.getElementById('modalCrewAgentCrewTarget');
  if (selectTarget) selectTarget.value = isCustom ? 'none' : (crewId || agent.crewId);

  document.getElementById('modalCrewAgentName').value = agent.name;
  document.getElementById('modalCrewAgentName').disabled = true;
  document.getElementById('modalCrewAgentDisplayName').value = agent.displayName || agent.name;
  document.getElementById('modalCrewAgentRole').value = agent.role || agent.description || '';
  document.getElementById('modalCrewAgentType').value = isPresident ? 'primary' : (agent.type === 'primary' || agent.type === 'crew_master' ? 'primary' : 'subagent');

  // Initial Prompt Model Toggle
  const isInitialPrompt = isPresident || agent.mode === 'primary' || agent.mode === 'all' || agent.isInitialPrompt === true;
  const initialPromptCb = document.getElementById('modalCrewAgentInitialPrompt');
  if (initialPromptCb) {
    initialPromptCb.checked = isInitialPrompt;
    onInitialPromptToggleChange();
  }

  // Oh-My-OpenCode Slim Architecture Fields
  document.getElementById('modalCrewAgentLane').value = agent.lane || (isPresident ? 'Global Enterprise Governance & Meta-Orchestration' : '');
  document.getElementById('modalCrewAgentPermissions').value = agent.permissions || 'read_files, write_files';
  document.getElementById('modalCrewAgentStats').value = agent.stats || (isPresident ? '10x Strategic Vision & Executive Orchestration' : '');
  document.getElementById('modalCrewAgentVariant').value = agent.variant || (isPresident ? 'high' : 'default');
  document.getElementById('modalCrewAgentOrchestratorPrompt').value = agent.orchestratorPrompt || '';

  const selectMaster = document.getElementById('modalCrewAgentMaster');
  if (selectMaster) selectMaster.value = agent.master || '';

  const selectModel = document.getElementById('modalCrewAgentModel');
  if (selectModel) selectModel.value = agent.model || 'omniroute/combo/code';

  document.getElementById('modalCrewAgentCustomDir').value = agent.custom_directory || (isPresident ? `/Users/mcp/.config/opencode/` : `/Users/mcp/Documents/Default Project/full crews/${crewId}/agents/${agent.name}`);

  // Complete Schedule Load
  const sch = agent.schedule || {};
  const isSchEnabled = sch.enabled === true;
  document.getElementById('modalCrewAgentScheduleEnabled').checked = isSchEnabled;
  document.getElementById('modalCrewAgentScheduleFrequency').value = sch.frequency || (sch.datetime ? 'once' : 'daily');
  document.getElementById('modalCrewAgentScheduleTime').value = sch.time || '09:00';
  document.getElementById('modalCrewAgentScheduleIntervalHours').value = sch.interval_hours || 1;
  document.getElementById('modalCrewAgentScheduleMonthDay').value = sch.month_day || 1;
  document.getElementById('modalCrewAgentScheduleDatetime').value = sch.datetime || '';
  document.getElementById('modalCrewAgentScheduleCron').value = sch.cron_expr || '';
  document.getElementById('modalCrewAgentSchedulePrompt').value = sch.task_prompt || '';

  const weekdays = Array.isArray(sch.weekdays) ? sch.weekdays : [1, 2, 3, 4, 5];
  document.querySelectorAll('#scheduleWeekdaysContainer input').forEach(cb => {
    cb.checked = weekdays.includes(parseInt(cb.value, 10));
  });

  // Skills
  const assignedSkills = agent.skills || [];
  document.querySelectorAll('input[name="modalCrewAgentSkills"]').forEach(cb => {
    cb.checked = assignedSkills.includes(cb.value);
  });

  // MCPs
  const assignedMcps = agent.mcps || [];
  document.querySelectorAll('input[name="modalCrewAgentMcps"]').forEach(cb => {
    cb.checked = assignedMcps.includes(cb.value);
  });

  document.getElementById('modalCrewAgentPrompt').value = agent.prompt || '';

  // Avatar
  if (agent.avatar) {
    document.getElementById('modalCrewAgentAvatarImg').src = agent.avatar;
    document.getElementById('modalCrewAgentAvatarImg').style.display = 'block';
    document.getElementById('modalCrewAgentAvatarPlaceholder').style.display = 'none';
  } else {
    document.getElementById('modalCrewAgentAvatarImg').style.display = 'none';
    document.getElementById('modalCrewAgentAvatarPlaceholder').style.display = 'block';
  }

  toggleHierarchyFields();
  toggleScheduleFields();
  updateScheduleFrequencyUI();

  document.getElementById('crewAgentModal').style.display = 'flex';
}

function openEditCoreAgent(agentKey, currentModel) {
  const existingAgent = allDiscoveredAgents.find(a => a.name === agentKey);
  const meta = PANTHEON_METADATA[agentKey] || {
    desc: `Agente Core @${agentKey}`,
    lane: 'Core OpenCode System Orchestration',
    perms: 'read_files, write_files',
    stats: '10x Native Precision'
  };

  populateCrewAgentModalOptions('none');

  document.getElementById('modalCrewAgentCrewId').value = 'none';
  document.getElementById('modalCrewAgentOriginalName').value = agentKey;
  document.getElementById('crewAgentModalTitle').textContent = `Configurar Core @${agentKey}`;
  document.getElementById('crewAgentModalCrewBadge').textContent = 'Plugin / Core System';

  const selectTarget = document.getElementById('modalCrewAgentCrewTarget');
  if (selectTarget) selectTarget.value = 'none';

  document.getElementById('modalCrewAgentName').value = agentKey;
  document.getElementById('modalCrewAgentName').disabled = true;
  document.getElementById('modalCrewAgentDisplayName').value = existingAgent?.displayName || `@${agentKey}`;
  document.getElementById('modalCrewAgentRole').value = existingAgent?.role || existingAgent?.description || meta.desc || '';
  document.getElementById('modalCrewAgentType').value = (agentKey === 'orchestrator' || agentKey === 'council' || existingAgent?.type === 'primary') ? 'primary' : 'subagent';

  // Initial Prompt Model Slot: Check whether it is active
  const isInitialPrompt = existingAgent ? (existingAgent.mode === 'primary' || existingAgent.mode === 'all' || existingAgent.isInitialPrompt === true) : (agentKey === 'orchestrator' || agentKey === 'council');
  const initialPromptCb = document.getElementById('modalCrewAgentInitialPrompt');
  if (initialPromptCb) {
    initialPromptCb.checked = isInitialPrompt;
    onInitialPromptToggleChange();
  }

  document.getElementById('modalCrewAgentLane').value = existingAgent?.lane || meta.lane || '';
  document.getElementById('modalCrewAgentPermissions').value = existingAgent?.permissions || meta.perms || 'read_files, write_files';
  document.getElementById('modalCrewAgentStats').value = existingAgent?.stats || meta.stats || '';
  document.getElementById('modalCrewAgentVariant').value = existingAgent?.variant || 'default';
  document.getElementById('modalCrewAgentOrchestratorPrompt').value = existingAgent?.orchestratorPrompt || '';

  const selectModel = document.getElementById('modalCrewAgentModel');
  if (selectModel) selectModel.value = existingAgent?.model || currentModel || 'omniroute/combo/code';

  document.getElementById('modalCrewAgentCustomDir').value = `/Users/mcp/.config/opencode/oh-my-opencode-slim/`;

  // Schedule reset
  document.getElementById('modalCrewAgentScheduleEnabled').checked = false;
  document.getElementById('modalCrewAgentScheduleFrequency').value = 'daily';
  document.getElementById('modalCrewAgentScheduleTime').value = '09:00';
  document.getElementById('modalCrewAgentScheduleIntervalHours').value = '1';
  document.getElementById('modalCrewAgentScheduleMonthDay').value = '1';
  document.getElementById('modalCrewAgentScheduleDatetime').value = '';
  document.getElementById('modalCrewAgentScheduleCron').value = '';
  document.getElementById('modalCrewAgentSchedulePrompt').value = '';

  document.getElementById('modalCrewAgentPrompt').value = existingAgent?.prompt || `# Core Agent @${agentKey}\n\n${meta.desc}`;

  document.getElementById('modalCrewAgentAvatarImg').style.display = 'none';
  document.getElementById('modalCrewAgentAvatarPlaceholder').style.display = 'block';

  toggleHierarchyFields();
  toggleScheduleFields();
  updateScheduleFrequencyUI();

  document.getElementById('crewAgentModal').style.display = 'flex';
}

function updateScheduleFrequencyUI() {
  const freq = document.getElementById('modalCrewAgentScheduleFrequency')?.value || 'daily';

  const freqTimeRow = document.getElementById('freqTimeRow');
  const freqIntervalHoursGroup = document.getElementById('freqIntervalHoursGroup');
  const freqMonthDayGroup = document.getElementById('freqMonthDayGroup');
  const freqWeekdaysGroup = document.getElementById('freqWeekdaysGroup');
  const freqOnceGroup = document.getElementById('freqOnceGroup');
  const freqCronGroup = document.getElementById('freqCronGroup');

  if (freqTimeRow) freqTimeRow.style.display = (freq === 'daily' || freq === 'weekly' || freq === 'monthly' || freq === 'hourly') ? 'grid' : 'none';
  if (freqIntervalHoursGroup) freqIntervalHoursGroup.style.display = freq === 'hourly' ? 'block' : 'none';
  if (freqMonthDayGroup) freqMonthDayGroup.style.display = freq === 'monthly' ? 'block' : 'none';
  if (freqWeekdaysGroup) freqWeekdaysGroup.style.display = freq === 'weekly' ? 'block' : 'none';
  if (freqOnceGroup) freqOnceGroup.style.display = freq === 'once' ? 'block' : 'none';
  if (freqCronGroup) freqCronGroup.style.display = freq === 'cron' ? 'block' : 'none';

  updateNextRunPreview();
}

function updateNextRunPreview() {
  const isEnabled = document.getElementById('modalCrewAgentScheduleEnabled')?.checked;
  const badge = document.getElementById('modalCrewAgentScheduleStatusBadge');
  const text = document.getElementById('modalCrewAgentScheduleNextRunText');
  if (!badge || !text) return;

  if (!isEnabled) {
    badge.textContent = 'DESATIVADO';
    badge.style.color = 'var(--text-dim)';
    text.textContent = 'Agendamento inativo';
    return;
  }

  badge.textContent = 'ATIVO';
  badge.style.color = '#34d399';

  const freq = document.getElementById('modalCrewAgentScheduleFrequency')?.value || 'daily';
  const time = document.getElementById('modalCrewAgentScheduleTime')?.value || '09:00';
  const now = new Date();

  if (freq === 'once') {
    const dt = document.getElementById('modalCrewAgentScheduleDatetime')?.value;
    text.textContent = dt ? `Próxima: ${new Date(dt).toLocaleString()}` : 'Informe a data e hora';
  } else if (freq === 'hourly') {
    const hours = parseInt(document.getElementById('modalCrewAgentScheduleIntervalHours')?.value, 10) || 1;
    text.textContent = `A cada ${hours}h (próxima em ~${hours}h)`;
  } else if (freq === 'daily') {
    text.textContent = `Diariamente às ${time}`;
  } else if (freq === 'weekly') {
    const checked = Array.from(document.querySelectorAll('#scheduleWeekdaysContainer input:checked')).map(cb => {
      const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return names[parseInt(cb.value, 10)];
    });
    text.textContent = checked.length > 0 ? `${checked.join(', ')} às ${time}` : `Selecione ao menos 1 dia`;
  } else if (freq === 'monthly') {
    const day = document.getElementById('modalCrewAgentScheduleMonthDay')?.value || 1;
    text.textContent = `Todo dia ${day} do mês às ${time}`;
  } else if (freq === 'cron') {
    const cron = document.getElementById('modalCrewAgentScheduleCron')?.value || '—';
    text.textContent = `Cron: ${cron}`;
  }
}

async function testRunCurrentModalAgentTask() {
  const crewId = document.getElementById('modalCrewAgentCrewId')?.value;
  const agentName = document.getElementById('modalCrewAgentName')?.value;
  const prompt = document.getElementById('modalCrewAgentSchedulePrompt')?.value.trim() || 'Executar tarefas especializadas.';
  if (!crewId || !agentName) return;

  showToast(`🚀 Disparando teste imediato para @${agentName}...`);
  await runCrewAgentTaskNow(crewId, agentName, prompt);
}

function closeCrewAgentModal() {
  document.getElementById('crewAgentModal').style.display = 'none';
}

// ── CrewBee Engine: Sync manifestos (TEAM.md + AGENTS.md) da crew atual ──────
async function syncCurrentCrewManifests() {
  const crewId = document.getElementById('modalCrewAgentCrewId')?.value;
  if (!crewId || crewId === 'none') {
    showToast('Selecione uma crew primeiro para sincronizar os manifestos.', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/crews/${crewId}/sync-manifests`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`🐝 ${data.message}`, 'success');
    } else {
      showToast(data.error || 'Erro ao sincronizar manifestos', 'error');
    }
  } catch (e) {
    showToast('Erro de comunicação com o servidor', 'error');
  }
}

// ── CrewBee Section: Toggle collapse ─────────────────────────────────────────
function toggleCrewBeeSection(header) {
  const section = header.closest('.crewbee-section');
  if (section) section.classList.toggle('is-open');
}

// ── Toggle Crew no OpenCode (crewbee.json) ────────────────────────────────────
async function toggleCrewInOpenCode(crewId, currentEnabled) {
  try {
    const res = await fetch(`/api/crews/${crewId}/toggle-opencode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !currentEnabled })
    });
    const data = await res.json();
    if (data.success) {
      const status = data.enabled ? 'ativada' : 'desativada';
      showToast(`Crew ${crewId} ${status} no OpenCode (crewbee.json)`, 'success');
      return data.enabled;
    }
  } catch {}
  return currentEnabled;
}

function populateCrewAgentModalOptions(crewId) {
  // 1. Models
  const selectModel = document.getElementById('modalCrewAgentModel');
  if (selectModel) {
    selectModel.innerHTML = globalState.models.map(m => 
      `<option value="${m.id}">${m.name ? `${m.name} (${m.id})` : m.id}</option>`
    ).join('');
  }

  // 2. Target Crew Dropdown
  const selectTargetCrew = document.getElementById('modalCrewAgentCrewTarget');
  if (selectTargetCrew) {
    const crews = allDiscoveredCrews.length > 0 ? allDiscoveredCrews : (globalState.crews || []);
    let options = `<option value="none">✨ Agente Custom Independente (~/.config/opencode/agents/)</option>`;
    options += crews.map(c => `<option value="${c.id}" ${c.id === crewId ? 'selected' : ''}>👥 ${c.name} (@crew/${c.id})</option>`).join('');
    selectTargetCrew.innerHTML = options;
  }

  // 3. Masters in this crew
  const crew = allDiscoveredCrews.find(c => c.id === crewId);
  const masters = crew?.agents?.filter(a => a.type === 'primary' || a.name === crew.leader) || [];
  const selectMaster = document.getElementById('modalCrewAgentMaster');
  if (selectMaster) {
    selectMaster.innerHTML = `<option value="">Nenhum (Líder Direto)</option>` + masters.map(m => 
      `<option value="${m.name}">👑 @${m.name} (${m.displayName || m.name})</option>`
    ).join('');
  }

  // 4. Subagents list for checkbox
  const subagentsBox = document.getElementById('modalCrewAgentSubagentsList');
  if (subagentsBox && crew) {
    const subs = crew.agents.filter(a => a.type !== 'primary');
    subagentsBox.innerHTML = subs.map(s => `
      <label class="skill-checkbox-label">
        <input type="checkbox" value="${s.name}" name="modalCrewAgentSubagents">
        <span>@${s.name}</span>
      </label>
    `).join('');
  }

  // 5. Skills (Global + Crew-level)
  const skillsBox = document.getElementById('modalCrewAgentSkillsContainer');
  if (skillsBox) {
    const globalSkills = (globalState.skills || []).map(s => typeof s === 'string' ? s : s.name);
    const crewSkills = (crew?.skills || []).map(s => s.name);
    const allSkills = Array.from(new Set([...crewSkills, ...globalSkills]));

    skillsBox.innerHTML = allSkills.map(s => `
      <label class="skill-checkbox-label">
        <input type="checkbox" value="${s}" name="modalCrewAgentSkills">
        <span>${s} ${crewSkills.includes(s) ? '⭐' : ''}</span>
      </label>
    `).join('');
  }

  // 6. MCPs
  const mcpsBox = document.getElementById('modalCrewAgentMcpsContainer');
  if (mcpsBox) {
    const allMcps = (globalState.mcps || []).map(m => m.name || m);
    mcpsBox.innerHTML = allMcps.map(m => `
      <label class="skill-checkbox-label">
        <input type="checkbox" value="${m}" name="modalCrewAgentMcps">
        <span>${m}</span>
      </label>
    `).join('');
  }
}

function toggleHierarchyFields() {
  const type = document.getElementById('modalCrewAgentType').value;
  const masterGroup = document.getElementById('fieldMasterSelectGroup');
  const subGroup = document.getElementById('fieldSubagentsGroup');

  if (type === 'primary') {
    if (masterGroup) masterGroup.style.display = 'none';
    if (subGroup) subGroup.style.display = 'block';
  } else {
    if (masterGroup) masterGroup.style.display = 'block';
    if (subGroup) subGroup.style.display = 'none';
  }
}

function toggleScheduleFields() {
  const isEnabled = document.getElementById('modalCrewAgentScheduleEnabled').checked;
  const box = document.getElementById('scheduleFieldsBox');
  if (box) box.style.display = isEnabled ? 'block' : 'none';
  updateScheduleFrequencyUI();
}

async function handleAgentAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const crewId = document.getElementById('modalCrewAgentCrewId').value;
  const agentName = document.getElementById('modalCrewAgentName').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

  if (!agentName) {
    alert('Digite o identificador do agente antes de enviar o avatar.');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch(`/api/crews/${crewId}/agents/${agentName}/avatar`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('modalCrewAgentAvatarImg').src = `${data.url}?t=${Date.now()}`;
      document.getElementById('modalCrewAgentAvatarImg').style.display = 'block';
      document.getElementById('modalCrewAgentAvatarPlaceholder').style.display = 'none';
      showToast('Avatar atualizado!');
    }
  } catch (err) {
    showToast('Erro ao enviar avatar: ' + err.message);
  }
}

function insertCrewAgentPromptTemplate() {
  const name = document.getElementById('modalCrewAgentName').value.trim() || 'especialista';
  const role = document.getElementById('modalCrewAgentRole').value.trim() || 'Especialista da Crew';
  const type = document.getElementById('modalCrewAgentType').value;

  const template = type === 'primary' ? `
# @${name} · Orquestrador & Líder da Crew

<Role>
Você é o Líder e Orquestrador Geral desta equipe. Sua missão é planejar, analisar briefings e delegar sub-tarefas para seus especialistas subordinados.
</Role>

## Fluxo de Delegação
1. Receber o objetivo macro do usuário ou do mural da equipe.
2. Planejar o plano de ação passo a passo.
3. Despachar execuções especializadas para os subagentes da equipe.
4. Consolidar os resultados com evidências claras.
` : `
# @${name} · ${role}

<Role>
Você é um subagente especialista subordinado ao líder da equipe.
</Role>

## Responsabilidades
1. Executar tarefas técnicas específicas com precisão cirúrgica.
2. Utilizar as skills e ferramentas MCP concedidas.
3. Reportar os outputs diretamente ao líder.
`;

  document.getElementById('modalCrewAgentPrompt').value = template.trim();
}

async function generateAgentOrchestratorPromptInModal() {
  const name = document.getElementById('modalCrewAgentName')?.value.trim() || 'especialista';
  const role = document.getElementById('modalCrewAgentRole')?.value.trim() || `Especialista ${name}`;
  const lane = document.getElementById('modalCrewAgentLane')?.value.trim() || 'Specialized Domain Execution';
  const permissions = document.getElementById('modalCrewAgentPermissions')?.value || 'read_files, write_files';
  const stats = document.getElementById('modalCrewAgentStats')?.value.trim() || '2x faster execution';

  try {
    const res = await fetch('/api/agents/generate-orchestrator-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, lane, permissions, stats })
    });
    const data = await res.json();
    if (data.prompt) {
      document.getElementById('modalCrewAgentOrchestratorPrompt').value = data.prompt;
      showToast('Matriz de roteamento gerada com sucesso!');
    }
  } catch (err) {
    showToast('Erro ao gerar contrato: ' + err.message);
  }
}

let currentRoutingContent = '';

function openAgentRoutingModal(agentName) {
  const agent = allDiscoveredAgents.find(a => a.name === agentName) || 
    Object.entries(PANTHEON_METADATA).map(([k, v]) => ({ name: k, role: v.desc, lane: v.lane, stats: v.stats, orchestratorPrompt: v.orchestratorPrompt })).find(a => a.name === agentName);
  
  if (!agent) return;

  const modal = document.getElementById('agentRoutingModal');
  const title = document.getElementById('routingModalTitle');
  const subtitle = document.getElementById('routingModalSubtitle');
  const content = document.getElementById('routingModalContent');

  title.textContent = `Contrato de Roteamento @${agent.name}`;
  subtitle.textContent = `Regras de despacho e atuação de @${agent.name} (Oh-My-OpenCode)`;
  
  let contract = agent.orchestratorPrompt;
  if (!contract) {
    const lane = agent.lane || (agent.mode === 'primary' ? 'Orchestration & Squad Leadership' : 'Specialized Domain Execution');
    const perms = agent.permissions || 'read_files, write_files';
    const stats = agent.stats || '2x faster execution';
    contract = `@${agent.name}\n- Lane: ${lane}\n- Role: ${agent.role || agent.description || `Especialista ${agent.name}`}\n- Permissions: ${perms}\n- Stats: ${stats}\n- **Delegate when:** Tarefas delimitadas de ${lane}\n- **Don't delegate when:** Fora do escopo de ${lane}\n- **Rule of thumb:** Demanda especializada em ${lane}? → @${agent.name}.`;
  }

  currentRoutingContent = contract;
  content.textContent = contract;
  modal.style.display = 'flex';
}

function closeAgentRoutingModal() {
  document.getElementById('agentRoutingModal').style.display = 'none';
}

function copyRoutingModalContent() {
  if (currentRoutingContent) {
    navigator.clipboard.writeText(currentRoutingContent);
    showToast('Contrato copiado para a área de transferência!');
  }
}

async function submitCrewAgentForm() {
  const targetCrew = document.getElementById('modalCrewAgentCrewTarget')?.value || document.getElementById('modalCrewAgentCrewId')?.value || 'none';
  const name = document.getElementById('modalCrewAgentName').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const displayName = document.getElementById('modalCrewAgentDisplayName').value.trim() || name;
  const role = document.getElementById('modalCrewAgentRole').value.trim() || `Especialista ${name}`;
  const type = document.getElementById('modalCrewAgentType').value;
  const master = type === 'subagent' ? document.getElementById('modalCrewAgentMaster').value : null;
  const subagents = type === 'primary' ? Array.from(document.querySelectorAll('input[name="modalCrewAgentSubagents"]:checked')).map(cb => cb.value) : [];
  const model = document.getElementById('modalCrewAgentModel').value;
  const custom_directory = document.getElementById('modalCrewAgentCustomDir').value.trim();

  // Oh-My-OpenCode Slim Architecture Fields
  const lane = document.getElementById('modalCrewAgentLane')?.value.trim() || '';
  const permissions = document.getElementById('modalCrewAgentPermissions')?.value || 'read_files, write_files';
  const stats = document.getElementById('modalCrewAgentStats')?.value.trim() || '';
  const variant = document.getElementById('modalCrewAgentVariant')?.value || 'default';
  const orchestratorPrompt = document.getElementById('modalCrewAgentOrchestratorPrompt')?.value.trim() || '';

  const scheduleEnabled = document.getElementById('modalCrewAgentScheduleEnabled').checked;
  const scheduleFrequency = document.getElementById('modalCrewAgentScheduleFrequency').value;
  const scheduleTime = document.getElementById('modalCrewAgentScheduleTime').value || '09:00';
  const scheduleIntervalHours = parseInt(document.getElementById('modalCrewAgentScheduleIntervalHours').value, 10) || 1;
  const scheduleMonthDay = parseInt(document.getElementById('modalCrewAgentScheduleMonthDay').value, 10) || 1;
  const scheduleDatetime = document.getElementById('modalCrewAgentScheduleDatetime').value;
  const scheduleCron = document.getElementById('modalCrewAgentScheduleCron')?.value.trim() || '';
  const schedulePrompt = document.getElementById('modalCrewAgentSchedulePrompt').value.trim();

  const weekdays = Array.from(document.querySelectorAll('#scheduleWeekdaysContainer input:checked')).map(cb => parseInt(cb.value, 10));

  const selectedSkills = Array.from(document.querySelectorAll('input[name="modalCrewAgentSkills"]:checked')).map(cb => cb.value);
  const selectedMcps = Array.from(document.querySelectorAll('input[name="modalCrewAgentMcps"]:checked')).map(cb => cb.value);
  const prompt = document.getElementById('modalCrewAgentPrompt').value.trim();

  const isInitialPrompt = document.getElementById('modalCrewAgentInitialPrompt')?.checked === true;
  const mode = isInitialPrompt ? 'primary' : 'subagent';

  if (!name) {
    alert('Identificador do agente é obrigatório.');
    return;
  }

  const payload = {
    name,
    displayName,
    role,
    type,
    mode,
    isInitialPrompt,
    lane,
    permissions,
    stats,
    variant,
    orchestratorPrompt,
    master,
    subagents,
    model,
    crewId: targetCrew,
    custom_directory,
    skills: selectedSkills,
    mcps: selectedMcps,
    schedule: {
      enabled: scheduleEnabled,
      frequency: scheduleFrequency,
      time: scheduleTime,
      interval_hours: scheduleIntervalHours,
      weekdays: weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5],
      month_day: scheduleMonthDay,
      datetime: scheduleDatetime,
      cron_expr: scheduleCron,
      task_prompt: schedulePrompt,
      status: scheduleEnabled ? 'pending' : 'idle'
    },
    prompt
  };

  try {
    let res;
    if (targetCrew === 'none' || targetCrew === 'custom') {
      res = await fetch('/api/custom-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/crews/${targetCrew}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (res.ok && data.success) {
      closeCrewAgentModal();
      showToast(`Agente @${name} salvo com sucesso!`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error || 'Falha ao salvar agente'}`);
    }
  } catch (err) {
    alert(`Erro de conexão: ${err.message}`);
  }
}

async function deleteCrewAgentByName(crewId, agentName) {
  const confirmed = await showConfirmDialog({
    title: 'Excluir Agente da Crew',
    message: `Deseja remover permanentemente o agente <strong style="color:#fff;">@${escapeHtml(agentName)}</strong> desta equipe?`,
    confirmText: 'Excluir Agente',
    isDanger: true
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/crews/${crewId}/agents/${agentName}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Agente @${agentName} excluído.`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

async function runCrewAgentTaskNow(crewId, agentName) {
  showToast(`🚀 Disparando tarefa de @${agentName}...`);
  try {
    const res = await fetch(`/api/crews/${crewId}/agents/${agentName}/run-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`✅ Tarefa de @${agentName} executada com sucesso!`);
      await fetchState();
    } else {
      alert(`Erro: ${data.error || 'Falha ao executar tarefa'}`);
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

// =========================================================
// MURAL & SKILL MODALS
// =========================================================

function openCrewMuralModal(crewId) {
  const crew = allDiscoveredCrews.find(c => c.id === crewId);
  if (!crew) return;

  document.getElementById('modalMuralCrewId').value = crewId;
  document.getElementById('crewMuralModalTitle').textContent = `Mural de Instruções · ${crew.name}`;
  document.getElementById('crewMuralModalSubtitle').textContent = `full crews/${crewId}/mural/`;
  document.getElementById('modalMuralInstructions').value = crew.mural?.instructions || '';

  const mediaCountEl = document.getElementById('modalMuralMediaCount');
  const mediaListEl = document.getElementById('modalMuralMediaList');

  const files = crew.mural?.mediaFiles || [];
  if (mediaCountEl) mediaCountEl.textContent = `${files.length} arquivo${files.length !== 1 ? 's' : ''}`;

  if (mediaListEl) {
    if (files.length === 0) {
      mediaListEl.innerHTML = `<span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Nenhum arquivo anexado em mural/media/.</span>`;
    } else {
      mediaListEl.innerHTML = files.map(f => `
        <span class="skill-chip">📎 ${escapeHtml(f)}</span>
      `).join('');
    }
  }

  document.getElementById('crewMuralModal').style.display = 'flex';
}

function closeCrewMuralModal() {
  document.getElementById('crewMuralModal').style.display = 'none';
}

async function submitCrewMuralForm() {
  const crewId = document.getElementById('modalMuralCrewId').value;
  const instructions = document.getElementById('modalMuralInstructions').value;

  try {
    const res = await fetch(`/api/crews/${crewId}/mural/instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions })
    });
    if (res.ok) {
      closeCrewMuralModal();
      showToast('Mural da equipe atualizado!');
      await fetchState();
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

function openCreateCrewSkillModal(crewId, agentName = '') {
  document.getElementById('modalCrewSkillCrewId').value = crewId;
  document.getElementById('modalCrewSkillAgentName').value = agentName;
  document.getElementById('modalCrewSkillName').value = '';
  document.getElementById('modalCrewSkillDesc').value = '';
  document.getElementById('modalCrewSkillContent').value = '';
  document.getElementById('modalCrewSkillScope').value = agentName ? 'agent' : 'team';
  document.getElementById('crewSkillModal').style.display = 'flex';
}

function openCreateCrewSkillForAgent() {
  const crewId = document.getElementById('modalCrewAgentCrewId').value;
  const agentName = document.getElementById('modalCrewAgentName').value.trim();
  openCreateCrewSkillModal(crewId, agentName);
}

function closeCrewSkillModal() {
  document.getElementById('crewSkillModal').style.display = 'none';
}

function updateCrewSkillScope() {}

async function submitCrewSkillForm() {
  const crewId = document.getElementById('modalCrewSkillCrewId').value;
  const agentName = document.getElementById('modalCrewSkillAgentName').value;
  const name = document.getElementById('modalCrewSkillName').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const scope = document.getElementById('modalCrewSkillScope').value;
  const description = document.getElementById('modalCrewSkillDesc').value.trim();
  const content = document.getElementById('modalCrewSkillContent').value.trim();

  if (!name) {
    alert('Nome da Skill é obrigatório.');
    return;
  }

  const payload = {
    name,
    description,
    content,
    agentName: scope === 'agent' ? agentName : null
  };

  try {
    const res = await fetch(`/api/crews/${crewId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeCrewSkillModal();
      showToast(`Skill "${name}" gravada com sucesso!`);
      await fetchState();
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

// =========================================================
// SELETOR GLOBAL DE SKILLS DA CREW (ESTILO SET YOUR MODEL)
// =========================================================

let currentSkillPickerCrewId = null;
let currentSkillPickerSelected = new Set();
let currentSkillPickerCategory = 'all';

async function openCrewSkillPickerModal(crewId) {
  currentSkillPickerCrewId = crewId;
  const crew = (allDiscoveredCrews || []).find(c => c.id === crewId) || (globalState.crews || []).find(c => c.id === crewId);
  const crewTitle = crew ? crew.name : crewId;

  const titleEl = document.getElementById('crewSkillPickerTitle');
  if (titleEl) titleEl.textContent = `Atribuir Habilidades à Crew: ${crewTitle}`;

  const subtitleEl = document.getElementById('crewSkillPickerSubtitle');
  if (subtitleEl) subtitleEl.textContent = `Selecione quais skills do ecossistema estarão disponíveis para a equipe "${crewTitle}"`;

  const searchInput = document.getElementById('crewSkillPickerSearch');
  if (searchInput) searchInput.value = '';

  currentSkillPickerCategory = 'all';
  document.querySelectorAll('#crewSkillPickerModal .filter-pill').forEach(p => p.classList.remove('active'));
  const allPill = document.getElementById('pickerFilterAll');
  if (allPill) allPill.classList.add('active');

  // Garante que a lista de skills do sistema esteja carregada
  if (!skillsList || skillsList.length === 0) {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      skillsList = data.skills || [];
    } catch (e) {
      console.warn('Erro ao carregar skills para modal:', e);
    }
  }

  // Inicializa o conjunto com as skills já presentes na crew
  currentSkillPickerSelected = new Set();
  if (crew && Array.isArray(crew.skills)) {
    crew.skills.forEach(sk => {
      if (typeof sk === 'string') currentSkillPickerSelected.add(sk.toLowerCase());
      else if (sk && sk.name) currentSkillPickerSelected.add(sk.name.toLowerCase());
    });
  }

  renderCrewSkillPickerGrid();
  document.getElementById('crewSkillPickerModal').style.display = 'flex';
}

function closeCrewSkillPickerModal() {
  const modal = document.getElementById('crewSkillPickerModal');
  if (modal) modal.style.display = 'none';
  currentSkillPickerCrewId = null;
  currentSkillPickerSelected.clear();
}

function setCrewSkillPickerCategory(category) {
  currentSkillPickerCategory = category;
  document.querySelectorAll('#crewSkillPickerModal .filter-pill').forEach(p => p.classList.remove('active'));
  const btn = document.getElementById(`pickerFilter${category.charAt(0).toUpperCase() + category.slice(1)}`);
  if (btn) btn.classList.add('active');
  renderCrewSkillPickerGrid();
}

function filterCrewSkillPickerGrid() {
  renderCrewSkillPickerGrid();
}

function renderCrewSkillPickerGrid() {
  const container = document.getElementById('crewSkillPickerGrid');
  if (!container) return;

  const query = (document.getElementById('crewSkillPickerSearch')?.value || '').trim().toLowerCase();

  let filtered = [...skillsList];

  if (currentSkillPickerCategory === 'core') {
    filtered = filtered.filter(s => s.category === 'core' || s.origin === 'core' || s.source === 'core' || s.path?.includes('oh-my-opencode-slim') || s.originLabel?.includes('Plugin'));
  } else if (currentSkillPickerCategory === 'crew') {
    filtered = filtered.filter(s => s.category === 'crew' || s.origin === 'crew' || s.source?.startsWith('crew'));
  } else if (currentSkillPickerCategory === 'custom') {
    filtered = filtered.filter(s => s.category === 'custom' || s.origin === 'custom' || (!s.path?.includes('oh-my-opencode-slim') && !s.originLabel?.includes('Plugin') && s.category !== 'crew'));
  }

  if (query) {
    filtered = filtered.filter(s => s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query)));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim); font-family: var(--font-mono);">Nenhuma habilidade encontrada para este filtro.</div>`;
    updateCrewSkillPickerCounter();
    return;
  }

  container.innerHTML = filtered.map(skill => {
    const isSelected = currentSkillPickerSelected.has(skill.name.toLowerCase());
    const isCrew = skill.category === 'crew' || skill.origin === 'crew' || (skill.path && skill.path.includes('full crews'));
    const isCore = skill.category === 'core' || skill.origin === 'core' || (skill.path && skill.path.includes('oh-my-opencode-slim')) || skill.originLabel?.includes('Plugin');

    let tagClass = 'custom';
    let tagLabel = '✨ CUSTOM';
    if (isCrew) {
      tagClass = 'crew';
      tagLabel = skill.crewId ? `👥 CREW: ${skill.crewId}` : '👥 CREW SKILL';
    } else if (isCore) {
      tagClass = 'core';
      tagLabel = '⚙️ PLUGIN / CORE';
    }

    return `
      <div class="crew-skill-picker-card ${isSelected ? 'is-selected' : ''}" onclick="toggleSkillPickerSelection('${escapeHtml(skill.name)}')">
        <div class="skill-picker-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${isSelected ? 'checked' : ''} style="accent-color: #a855f7; width: 16px; height: 16px;" onclick="event.stopPropagation(); toggleSkillPickerSelection('${escapeHtml(skill.name)}')">
            <span class="skill-picker-name">@${escapeHtml(skill.name)}</span>
          </div>
          <span class="tag-origin ${tagClass}" style="font-size: 9px; padding: 2px 6px;">${tagLabel}</span>
        </div>
        <p class="skill-picker-desc" title="${escapeHtml(skill.description)}">${escapeHtml(skill.description || 'Instruções operacionais especializadas.')}</p>
        <div class="skill-picker-footer">
          <span style="font-family: var(--font-mono); font-size: 9.5px; opacity: 0.7;">SKILL.md</span>
          <span style="font-size: 10px; font-weight: 700; color: ${isSelected ? '#c084fc' : 'var(--text-dim)'};">${isSelected ? '✓ Atribuída' : '+ Atribuir'}</span>
        </div>
      </div>
    `;
  }).join('');

  updateCrewSkillPickerCounter();
}

function toggleSkillPickerSelection(skillName) {
  const clean = skillName.toLowerCase();
  if (currentSkillPickerSelected.has(clean)) {
    currentSkillPickerSelected.delete(clean);
  } else {
    currentSkillPickerSelected.add(clean);
  }
  renderCrewSkillPickerGrid();
}

function selectAllSkillPickerSkills() {
  skillsList.forEach(s => {
    if (s && s.name) currentSkillPickerSelected.add(s.name.toLowerCase());
  });
  renderCrewSkillPickerGrid();
  showToast(`⚡ Todas as ${skillsList.length} habilidades selecionadas!`);
}

function deselectAllSkillPickerSkills() {
  currentSkillPickerSelected.clear();
  renderCrewSkillPickerGrid();
  showToast('Todas as habilidades desmarcadas.');
}

async function assignAllSystemSkillsToCrew(crewId) {
  const confirmed = await showConfirmDialog({
    title: 'Atribuir Todas as Skills',
    message: `Deseja copiar e vincular <strong>TODAS as ${skillsList.length} skills</strong> do sistema à equipe <strong>"${escapeHtml(crewId)}"</strong>?`,
    confirmText: 'Atribuir Todas as Skills',
    isDanger: false
  });
  if (!confirmed) return;

  const skillNames = skillsList.map(s => s.name);
  try {
    const res = await fetch(`/api/crews/${crewId}/skills/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillNames })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`⚡ ${skillNames.length} habilidades atribuídas à crew "${crewId}"!`, 'success');
      await fetchState();
    } else {
      showToast('Erro: ' + (data.error || 'Falha ao sincronizar'));
    }
  } catch (err) {
    showToast('Erro de rede: ' + err.message);
  }
}

function updateCrewSkillPickerCounter() {
  const count = currentSkillPickerSelected.size;
  const countEl = document.getElementById('crewSkillPickerCounter');
  if (countEl) {
    countEl.textContent = `${count} ${count === 1 ? 'habilidade selecionada' : 'habilidades selecionadas'}`;
  }
}

async function saveCrewAssignedSkills() {
  if (!currentSkillPickerCrewId) return;

  const skillNames = Array.from(currentSkillPickerSelected);

  try {
    const res = await fetch(`/api/crews/${currentSkillPickerCrewId}/skills/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillNames })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Habilidades da equipe sincronizadas com sucesso (${skillNames.length})!`);
      closeCrewSkillPickerModal();
      await fetchState();
    } else {
      showToast('Erro: ' + (data.error || 'Falha ao sincronizar'));
    }
  } catch (err) {
    showToast('Erro de rede: ' + err.message);
  }
}

async function deleteAgentByName(name) {
  const confirmed = await showConfirmDialog({
    title: 'Excluir Agente',
    message: `Deseja remover permanentemente o agente <strong style="color:#fff;">@${escapeHtml(name)}</strong>?`,
    confirmText: 'Excluir Agente Definitivamente',
    isDanger: true
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(name)}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Agente @${name} excluído.`);
      await fetchState();
    } else {
      showToast('Erro: ' + (data.error || 'Falha ao excluir agente'));
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}


// =========================================================
// AGENTS STUDIO & COMPLETE DISCOVERY
// =========================================================

function setAgentCategoryFilter(category) {
  currentAgentCategoryFilter = category;

  document.querySelectorAll('#filterAgentAll, #filterAgentInitialPrompt, #filterAgentPresident, #filterAgentCore, #filterAgentCrew, #filterAgentNative, #filterAgentCustom').forEach(pill => pill.classList.remove('active'));
  
  const mapBtn = {
    all: 'filterAgentAll',
    initial_prompt: 'filterAgentInitialPrompt',
    president: 'filterAgentPresident',
    core: 'filterAgentCore',
    crew: 'filterAgentCrew',
    native: 'filterAgentNative',
    custom: 'filterAgentCustom'
  };

  const activeBtn = document.getElementById(mapBtn[category]);
  if (activeBtn) activeBtn.classList.add('active');

  applyAgentsFilter();
}

function applyAgentsFilter() {
  const query = (document.getElementById('agentsSearchInput')?.value || '').toLowerCase().trim();

  const totalCore = Object.keys(PANTHEON_METADATA).length;
  const crewList = allDiscoveredAgents.filter(a => a.category === 'crew');
  const nativeList = allDiscoveredAgents.filter(a => a.category === 'native');
  const customList = allDiscoveredAgents.filter(a => a.category === 'custom' || (!a.category && a.name !== 'presidente'));
  const presidentList = allDiscoveredAgents.filter(a => a.name === 'presidente' || a.category === 'president');
  const initialPromptList = allDiscoveredAgents.filter(a => a.mode === 'primary' || a.mode === 'all' || a.isInitialPrompt === true || a.name === 'presidente');

  const countAllEl = document.getElementById('countAgentsAll');
  if (countAllEl) countAllEl.textContent = totalCore + allDiscoveredAgents.length;
  const countInitialPromptEl = document.getElementById('countAgentsInitialPrompt');
  if (countInitialPromptEl) countInitialPromptEl.textContent = initialPromptList.length + 2; // +2 for core orchestrator & council
  const countCoreEl = document.getElementById('countAgentsCore');
  if (countCoreEl) countCoreEl.textContent = totalCore;
  const countCrewEl = document.getElementById('countAgentsCrew');
  if (countCrewEl) countCrewEl.textContent = crewList.length;
  const countCustomEl = document.getElementById('countAgentsCustom');
  if (countCustomEl) countCustomEl.textContent = customList.length;
  const countPresEl = document.getElementById('countAgentsPresident');
  if (countPresEl) countPresEl.textContent = presidentList.length || 1;

  renderAgentGrid(query);
}

function renderAgentGrid(query = '') {
  const grid = document.getElementById('agentCardsGrid');
  if (!grid) return;

  const preset = globalState.config.preset || 'omniroute';
  const activePresetConfig = globalState.config.presets?.[preset] || {};

  grid.innerHTML = '';

  // 1. Core Agents
  if (currentAgentCategoryFilter === 'all' || currentAgentCategoryFilter === 'core' || currentAgentCategoryFilter === 'initial_prompt') {
    for (const [key, meta] of Object.entries(PANTHEON_METADATA)) {
      const isCoreInitialPrompt = (key === 'orchestrator' || key === 'council');
      if (currentAgentCategoryFilter === 'initial_prompt' && !isCoreInitialPrompt) continue;

      if (query && !key.toLowerCase().includes(query) && !meta.desc.toLowerCase().includes(query)) continue;

      const agentConf = activePresetConfig[key] || {};
      const model = agentConf.model || (key === 'council' ? 'Multi-Model Consensus' : 'omniroute/combo/code');
      const icon = PANTHEON_ICONS[key] || PANTHEON_ICONS.orchestrator;
      const isReadOnly = !meta.perms?.includes('write');

      const card = document.createElement('div');
      card.className = 'agent-card glass-card';
      card.innerHTML = `
        <div>
          <div class="agent-card-top">
            <div class="agent-avatar-box">${icon}</div>
            <div style="flex:1;min-width:0;">
              <div class="agent-name-row" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                <h3>@${key}</h3>
                <span class="tag-origin core">⚙️ PLUGIN / CORE</span>
                ${isCoreInitialPrompt ? `<span class="tag-origin initial-prompt" style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.5); font-weight: 800;">⚡ INITIAL PROMPT</span>` : ''}
              </div>
              <p class="agent-card-desc">${meta.desc}</p>
              ${meta.lane ? `<div class="agent-lane-badge">🎯 ${escapeHtml(meta.lane)}</div>` : ''}
            </div>
          </div>

          <div class="agent-slim-meta-row">
            <span class="agent-perm-badge ${isReadOnly ? 'perm-readonly' : 'perm-readwrite'}">
              ${isReadOnly ? '🔒 Read-Only' : '⚡ Read/Write'}
            </span>
            ${meta.stats ? `<span class="agent-stats-badge" title="${escapeHtml(meta.stats)}">🚀 ${escapeHtml(meta.stats)}</span>` : ''}
          </div>

          <div class="agent-model-container">
            <div class="model-header-label">MODELO LLM</div>
            <div class="model-value-name">${escapeHtml(model)}</div>
          </div>
          <div class="skill-path-box">~/.config/opencode/oh-my-opencode-slim/</div>
        </div>
        <div class="agent-card-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <button class="agent-routing-btn" onclick="openAgentRoutingModal('${key}')">📋 Contrato</button>
          <div style="display: flex; gap: 6px;">
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 8px;" onclick="openFolderInFinder('~/.config/opencode')">📂 Finder</button>
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px;" onclick="openEditCoreAgent('${key}', '${escapeHtml(model)}')">Editar Modelo</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  // 2. Discovered Agents
  for (const agent of allDiscoveredAgents) {
    const isPresident = agent.name === 'presidente' || agent.category === 'president';
    const isCrew = agent.category === 'crew';
    const isNative = agent.category === 'native';
    const isCustom = agent.category === 'custom' || (!isPresident && !isCrew && !isNative);
    const isInitialPrompt = isPresident || agent.mode === 'primary' || agent.mode === 'all' || agent.isInitialPrompt === true;

    if (currentAgentCategoryFilter === 'core') continue;
    if (currentAgentCategoryFilter === 'initial_prompt' && !isInitialPrompt) continue;
    if (currentAgentCategoryFilter === 'president' && !isPresident) continue;
    if (currentAgentCategoryFilter === 'crew' && !isCrew) continue;
    if (currentAgentCategoryFilter === 'native' && !isNative && !isPresident) continue;
    if (currentAgentCategoryFilter === 'custom' && !isCustom) continue;

    if (query && !agent.name.toLowerCase().includes(query) && !(agent.description && agent.description.toLowerCase().includes(query)) && !(agent.crewName && agent.crewName.toLowerCase().includes(query))) {
      continue;
    }

    const isMaster = agent.isLeader || (agent.type === 'crew_master');
    let tagClass = 'custom';
    let tagLabel = '✨ CUSTOM / MANUAL';

    if (isPresident) {
      tagClass = 'president';
      tagLabel = '🏛️ PRESIDENTE GLOBAL';
    } else if (isCrew) {
      tagClass = isMaster ? 'crew' : 'crew';
      tagLabel = isMaster ? `👑 CREW MESTRE: ${agent.crewId}` : `👥 CREW: ${agent.crewId}`;
    } else if (isNative) {
      tagClass = 'native';
      tagLabel = '📄 NATIVO (~/.config)';
    }

    const card = document.createElement('div');
    card.className = `agent-card glass-card ${isPresident ? 'president-agent-card' : ''}`;
    if (isPresident) {
      card.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      card.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 20, 28, 0.95) 100%)';
    }

    const folderPath = isCrew 
      ? `full crews/${agent.crewId}/agents/${agent.name}` 
      : (isPresident ? `~/.config/opencode/agents/` : `~/.config/opencode/agents/`);

    const isReadOnly = agent.permissions && !agent.permissions.includes('write');

    card.innerHTML = `
      <div>
        <div class="agent-card-top">
          <div class="agent-avatar-box" style="${isPresident ? 'background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 20px;' : (isMaster ? 'background: rgba(245, 158, 11, 0.16); color: #fde047;' : 'background: rgba(6, 182, 212, 0.15); color: #22d3ee;')}">
            ${agent.avatar ? `<img src="${escapeHtml(agent.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : (isPresident ? `🏛️` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`)}
          </div>
          <div style="flex:1; min-width:0;">
            <div class="agent-name-row" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
              <h3 style="${isPresident ? 'color:#fde047;' : ''}">@${escapeHtml(agent.name)}</h3>
              <span class="tag-origin ${tagClass}">${tagLabel}</span>
              ${isInitialPrompt ? `<span class="tag-origin initial-prompt" style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.5); font-weight: 800;">⚡ INITIAL PROMPT</span>` : ''}
            </div>
            <p class="agent-card-desc">${escapeHtml(agent.description || 'Agente especializado.')}</p>
            ${agent.lane ? `<div class="agent-lane-badge">🎯 ${escapeHtml(agent.lane)}</div>` : ''}
          </div>
        </div>

        <div class="agent-slim-meta-row">
          <span class="agent-perm-badge ${isReadOnly ? 'perm-readonly' : 'perm-readwrite'}">
            ${isReadOnly ? '🔒 Read-Only' : '⚡ Read/Write'}
          </span>
          ${agent.stats ? `<span class="agent-stats-badge" title="${escapeHtml(agent.stats)}">🚀 ${escapeHtml(agent.stats.slice(0, 18))}</span>` : ''}
          ${agent.variant && agent.variant !== 'default' ? `<span class="agent-variant-badge">🧠 ${escapeHtml(agent.variant)}</span>` : ''}
        </div>

        <div class="agent-model-container">
          <div class="model-header-label">MODELO LLM</div>
          <div class="model-value-name">${escapeHtml(agent.model || 'omniroute/combo/code')}</div>
        </div>

        <div class="skill-path-box">
          ${escapeHtml(folderPath)}
        </div>

        ${agent.skills && agent.skills.length > 0 ? `
          <div class="skills-pill-row">
            ${agent.skills.map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="agent-card-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
        <div style="display: flex; gap: 5px;">
          <button class="agent-routing-btn" onclick="openAgentRoutingModal('${escapeHtml(agent.name)}')">
            📋 Contrato
          </button>
          <button class="btn-secondary" style="font-size: 11px; padding: 5px 8px;" onclick="openFolderInFinder('${escapeHtml(folderPath)}')">
            📂 Finder
          </button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary" style="font-size: 11px; padding: 5px 10px;" onclick="${isCrew ? `openCrewAgentModal('${escapeHtml(agent.crewId)}', '${escapeHtml(agent.name)}')` : `openCrewAgentModal('none', '${escapeHtml(agent.name)}')`}">
            ${isPresident ? '⚙️ Configurar' : 'Editar'}
          </button>
          ${!isPresident ? `<button class="btn-remove-agent" style="font-size: 11px; padding: 5px 8px;" onclick="${isCrew ? `deleteCrewAgentByName('${escapeHtml(agent.crewId)}', '${escapeHtml(agent.name)}')` : `deleteAgentByName('${escapeHtml(agent.name)}')`}">Excluir</button>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  if (grid.children.length === 0) {
    grid.innerHTML = `<div style="color: var(--text-dim); font-family: var(--font-mono); text-align: center; grid-column: 1 / -1; padding: 40px;">Nenhum agente encontrado para os filtros selecionados.</div>`;
  }
}

// =========================================================
// TELEMETRY, LOGS & SKILLS
// =========================================================

function renderTelemetry() {
  const statSessionsEl = document.getElementById('statSessions');
  const statTokensEl = document.getElementById('statTokens');
  const statCacheEl = document.getElementById('statCache');

  if (statSessionsEl) statSessionsEl.textContent = (telemetryData.totalSessions || 0).toLocaleString();
  if (statTokensEl) statTokensEl.textContent = (telemetryData.totalTokens || 0).toLocaleString();
  if (statCacheEl) statCacheEl.textContent = (telemetryData.cacheReadTokens || 0).toLocaleString();

  const sessionsContainer = document.getElementById('sessionsList');
  if (sessionsContainer) {
    let tree = telemetryData.sessionsTree || [];
    const query = (document.getElementById('sessionFilterInput')?.value || '').toLowerCase().trim();
    if (query) {
      tree = tree.filter(s => (s.title && s.title.toLowerCase().includes(query)) || (s.agent && s.agent.toLowerCase().includes(query)) || (s.slug && s.slug.toLowerCase().includes(query)));
    }

    if (tree.length === 0) {
      sessionsContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 13px; font-family: var(--font-mono); text-align: center; padding: 30px;">${query ? 'Nenhuma sessão correspondente ao filtro.' : 'Nenhuma sessão ativa encontrada.'}</div>`;
    } else {
      sessionsContainer.innerHTML = tree.map(s => {
        const agentName = s.agent || 'orchestrator';
        const rawTime = s.time_updated || s.time_created || Date.now();
        const formattedDate = new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const inTok = (s.tokens_input || 0).toLocaleString();
        const outTok = (s.tokens_output || 0).toLocaleString();
        const cacheTok = (s.cache_read_input_tokens || 0).toLocaleString();
        const totalTok = ((s.tokens_input || 0) + (s.tokens_output || 0)).toLocaleString();

        return `
          <div class="session-parent-box" style="margin-bottom: 8px; border-radius: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 10px 14px;">
            <div class="session-main-row" style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
              <div class="session-left" style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span class="session-agent-badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: var(--font-mono);">
                  @${escapeHtml(agentName)}
                </span>
                <div style="min-width: 0;">
                  <div class="session-title-text" style="font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(s.title || s.slug || 'Sessão')}
                  </div>
                  <div class="session-meta-text" style="font-size: 10.5px; color: var(--text-dim);">
                    ${formattedDate} · In: ${inTok} | Out: ${outTok} | Cache: ${cacheTok}
                  </div>
                </div>
              </div>
              <div class="session-right" style="text-align: right; flex-shrink: 0;">
                <div class="session-tokens" style="font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: #34d399;">
                  ${totalTok} tok
                </div>
                <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: rgba(52, 211, 153, 0.15); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.3);">
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderLiveEventsFeed();
}

let currentSkillCategoryFilter = 'all';
let currentMcpCategoryFilter = 'all';
let feedAutoScroll = true;

function setSkillCategoryFilter(category) {
  currentSkillCategoryFilter = category;
  document.querySelectorAll('#filterSkillAll, #filterSkillCrew, #filterSkillCustom, #filterSkillCore').forEach(pill => pill.classList.remove('active'));
  const mapBtn = {
    all: 'filterSkillAll',
    crew: 'filterSkillCrew',
    custom: 'filterSkillCustom',
    core: 'filterSkillCore'
  };
  const activeBtn = document.getElementById(mapBtn[category]);
  if (activeBtn) activeBtn.classList.add('active');
  applySkillsFilter();
}

function setMcpCategoryFilter(category) {
  currentMcpCategoryFilter = category;
  document.querySelectorAll('#filterMcpAll, #filterMcpCrew, #filterMcpCustom, #filterMcpCore').forEach(pill => pill.classList.remove('active'));
  const mapBtn = {
    all: 'filterMcpAll',
    crew: 'filterMcpCrew',
    custom: 'filterMcpCustom',
    core: 'filterMcpCore'
  };
  const activeBtn = document.getElementById(mapBtn[category]);
  if (activeBtn) activeBtn.classList.add('active');
  renderMCPsTab();
}

function setSkillsViewMode(mode) {
  currentSkillsViewMode = mode;
  localStorage.setItem('opencode_skills_view', mode);

  document.getElementById('btnViewGrid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('btnViewList')?.classList.toggle('active', mode === 'list');

  const gridEl = document.getElementById('skillsCardsGrid');
  const listEl = document.getElementById('skillsListContainer');

  if (mode === 'grid') {
    if (gridEl) gridEl.style.display = 'grid';
    if (listEl) listEl.style.display = 'none';
  } else {
    if (gridEl) gridEl.style.display = 'none';
    if (listEl) listEl.style.display = 'flex';
  }

  applySkillsFilter();
}

function applySkillsFilter() {
  const query = (document.getElementById('skillsSearchInput')?.value || '').toLowerCase().trim();
  
  // Atualiza contadores dos pills
  const countAll = skillsList.length;
  const countCrew = skillsList.filter(s => s.source === 'crew' || s.category === 'crew' || (s.path && s.path.includes('full crews'))).length;
  const countCore = skillsList.filter(s => s.source === 'core' || s.category === 'core' || s.path?.includes('oh-my-opencode-slim') || s.originLabel?.includes('Plugin')).length;
  const countCustom = skillsList.filter(s => s.category === 'custom' || (!s.path?.includes('oh-my-opencode-slim') && !s.originLabel?.includes('Plugin') && s.category !== 'crew')).length;

  if (document.getElementById('countSkillsAll')) document.getElementById('countSkillsAll').textContent = countAll;
  if (document.getElementById('countSkillsCrew')) document.getElementById('countSkillsCrew').textContent = countCrew;
  if (document.getElementById('countSkillsCore')) document.getElementById('countSkillsCore').textContent = countCore;
  if (document.getElementById('countSkillsCustom')) document.getElementById('countSkillsCustom').textContent = countCustom;

  let filtered = skillsList;

  if (currentSkillCategoryFilter === 'crew') {
    filtered = filtered.filter(s => s.source === 'crew' || s.category === 'crew' || (s.path && s.path.includes('full crews')));
  } else if (currentSkillCategoryFilter === 'custom') {
    filtered = filtered.filter(s => s.category === 'custom' || (!s.path?.includes('oh-my-opencode-slim') && !s.originLabel?.includes('Plugin') && s.category !== 'crew'));
  } else if (currentSkillCategoryFilter === 'core') {
    filtered = filtered.filter(s => s.source === 'core' || s.category === 'core' || s.path?.includes('oh-my-opencode-slim') || s.originLabel?.includes('Plugin'));
  }

  if (query) {
    filtered = filtered.filter(s => s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query)));
  }

  const countEl = document.getElementById('skillsTotalCount');
  if (countEl) countEl.textContent = `${filtered.length} Habilidades`;

  renderSkillsGrid(filtered);
  renderSkillsList(filtered);
}

function renderSkillsGrid(items = skillsList) {
  const container = document.getElementById('skillsCardsGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div style="color: var(--text-dim); font-family: var(--font-mono); text-align: center; grid-column: 1 / -1; padding: 40px;">Nenhuma habilidade encontrada.</div>`;
    return;
  }

  container.innerHTML = items.map(skill => {
    const isCrew = skill.source === 'crew' || skill.category === 'crew' || (skill.path && skill.path.includes('full crews'));
    const isCore = skill.source === 'core' || skill.category === 'core' || (skill.path && skill.path.includes('oh-my-opencode-slim'));
    const isCustom = !isCrew && !isCore;

    let tagClass = 'custom';
    let tagLabel = '✨ CUSTOM';
    if (isCrew) {
      tagClass = 'crew';
      tagLabel = skill.crewId ? `👥 CREW: ${skill.crewId}` : '👥 CREW SKILL';
    } else if (isCore) {
      tagClass = 'core';
      tagLabel = '⚙️ PLUGIN / CORE';
    }

    const folderPath = skill.path || `~/.config/opencode/skills/${skill.name}`;

    return `
      <div class="skill-card glass-card">
        <div>
          <div class="skill-card-top">
            <div class="skill-avatar-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
            </div>
            <div style="flex:1;min-width:0;">
              <div class="skill-name-row">
                <h3>${escapeHtml(skill.name)}</h3>
                <span class="tag-origin ${tagClass}">${tagLabel}</span>
              </div>
              <p class="skill-card-desc" title="${escapeHtml(skill.description)}">${escapeHtml(skill.description || 'Instruções operacionais.')}</p>
            </div>
          </div>
          <div class="skill-path-box">${escapeHtml(folderPath)}</div>
        </div>
        <div class="skill-card-footer" style="display:flex;justify-content:space-between;align-items:center;">
          <button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="openFolderInFinder('${escapeHtml(folderPath)}')">📂 Finder</button>
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="openEditSkillModal('${escapeHtml(skill.name)}')">Editar</button>
            <button class="btn-remove-agent" style="font-size:11px;padding:4px 8px;" onclick="deleteSkillByName('${escapeHtml(skill.name)}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSkillsList(items = skillsList) {
  const container = document.getElementById('skillsListContainer');
  if (!container) return;

  container.innerHTML = items.map(skill => {
    const isCrew = skill.source === 'crew' || skill.category === 'crew' || (skill.path && skill.path.includes('full crews'));
    const isCore = skill.source === 'core' || skill.category === 'core' || (skill.path && skill.path.includes('oh-my-opencode-slim'));

    let tagClass = 'custom';
    let tagLabel = '✨ CUSTOM';
    if (isCrew) {
      tagClass = 'crew';
      tagLabel = skill.crewId ? `👥 CREW: ${skill.crewId}` : '👥 CREW SKILL';
    } else if (isCore) {
      tagClass = 'core';
      tagLabel = '⚙️ PLUGIN / CORE';
    }

    const folderPath = skill.path || `~/.config/opencode/skills/${skill.name}`;

    return `
      <div class="skill-list-row">
        <div class="skill-list-left">
          <div class="skill-avatar-box" style="width:32px;height:32px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <div class="skill-list-info">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="skill-list-title">${escapeHtml(skill.name)}</span>
              <span class="tag-origin ${tagClass}">${tagLabel}</span>
            </div>
            <div class="skill-list-desc">${escapeHtml(skill.description || 'Instruções operacionais.')}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="openFolderInFinder('${escapeHtml(folderPath)}')">📂 Finder</button>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="openEditSkillModal('${escapeHtml(skill.name)}')">Editar</button>
          <button class="btn-remove-agent" style="padding: 4px 8px; font-size: 11px;" onclick="deleteSkillByName('${escapeHtml(skill.name)}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function openCreateSkillModal() {
  document.getElementById('skillModalTitle').textContent = 'Nova Habilidade Global (SKILL.md)';
  document.getElementById('modalSkillName').value = '';
  document.getElementById('modalSkillName').disabled = false;
  document.getElementById('modalSkillDesc').value = '';
  document.getElementById('modalSkillContent').value = '';
  document.getElementById('skillModal').style.display = 'flex';
}

function openEditSkillModal(skillName) {
  const skill = skillsList.find(s => s.name === skillName);
  if (!skill) return;
  document.getElementById('skillModalTitle').textContent = `Editar: ${skillName}`;
  document.getElementById('modalSkillName').value = skill.name;
  document.getElementById('modalSkillName').disabled = true;
  document.getElementById('modalSkillDesc').value = skill.description || '';
  document.getElementById('modalSkillContent').value = skill.content || '';
  document.getElementById('skillModal').style.display = 'flex';
}

function closeSkillModal() {
  document.getElementById('skillModal').style.display = 'none';
}

function insertSkillTemplate() {
  const name = document.getElementById('modalSkillName').value.trim() || 'custom-skill';
  const desc = document.getElementById('modalSkillDesc').value.trim() || 'Diretrizes especializadas.';
  document.getElementById('modalSkillContent').value = `---
name: ${name}
description: ${desc}
---

# ${name.toUpperCase()}

## Objetivo
Descreva as situações para acionar esta habilidade.

## Diretrizes
1. Aplicar alterações modulares.
2. Validar integridade com testes.`;
}

function handleSkillFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('modalSkillContent').value = e.target?.result || '';
    const baseName = file.name.replace(/\.(md|txt)$/i, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!document.getElementById('modalSkillName').value) document.getElementById('modalSkillName').value = baseName;
    showToast(`Arquivo "${file.name}" importado.`);
  };
  reader.readAsText(file);
}

function setupDropZone() {
  const dropZone = document.getElementById('skillDropZone');
  if (!dropZone) return;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer?.files?.[0]) handleSkillFileUpload({ target: { files: e.dataTransfer.files } });
  });
}

async function submitSkillForm() {
  const name = document.getElementById('modalSkillName').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const description = document.getElementById('modalSkillDesc').value.trim();
  const content = document.getElementById('modalSkillContent').value.trim();
  if (!name || !content) { alert('Nome e Conteúdo são obrigatórios.'); return; }

  try {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, content })
    });
    if (res.ok) {
      closeSkillModal();
      showToast(`Habilidade "${name}" registrada.`);
      await fetchSkillsData();
      await fetchState();
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function deleteSkillByName(name) {
  const confirmed = await showConfirmDialog({
    title: 'Excluir Habilidade',
    message: `Deseja remover a habilidade <strong style="color:#fff;">"${escapeHtml(name)}"</strong>?`,
    confirmText: 'Excluir',
    isDanger: true
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/skills/${name}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Habilidade "${name}" excluída.`);
      await fetchSkillsData();
      await fetchState();
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

// LOGS
function setLogCategoryFilter(category) {
  currentLogCategoryFilter = category;
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
  const activePill = Array.from(document.querySelectorAll('.filter-pill')).find(p => p.getAttribute('onclick')?.includes(category));
  if (activePill) activePill.classList.add('active');
  applyLogFilters();
}

function renderLogsUI() {
  document.getElementById('countAll').textContent = logsPayload.counts.total || 0;
  document.getElementById('countSuccess').textContent = logsPayload.counts.success || 0;
  document.getElementById('countError').textContent = logsPayload.counts.error || 0;
  document.getElementById('countWarn').textContent = logsPayload.counts.warn || 0;
  document.getElementById('countInfo').textContent = logsPayload.counts.info || 0;

  const agentFilter = document.getElementById('logAgentFilterSelect');
  if (agentFilter) {
    const currentVal = agentFilter.value;
    const uniqueAgents = Array.from(new Set(logsPayload.logs.map(l => l.agent).filter(Boolean)));
    agentFilter.innerHTML = `<option value="all">Todos os Agentes</option>` + uniqueAgents.map(a => 
      `<option value="${a}" ${a === currentVal ? 'selected' : ''}>@${a}</option>`
    ).join('');
  }
  applyLogFilters();
}

function applyLogFilters() {
  const container = document.getElementById('fullLogsContainer');
  if (!container) return;

  const searchText = (document.getElementById('logSearchInput')?.value || '').toLowerCase().trim();
  const selectedAgent = document.getElementById('logAgentFilterSelect')?.value || 'all';

  let filtered = logsPayload.logs;
  if (currentLogCategoryFilter !== 'all') filtered = filtered.filter(l => l.category === currentLogCategoryFilter);
  if (selectedAgent !== 'all') filtered = filtered.filter(l => l.agent === selectedAgent);
  if (searchText) {
    filtered = filtered.filter(l => l.message.toLowerCase().includes(searchText) || l.agent.toLowerCase().includes(searchText));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="color: var(--text-dim); font-size: 13px; font-family: var(--font-mono); text-align: center; padding: 40px;">[0] Nenhum evento registrado para estes filtros.</div>`;
    return;
  }

  container.innerHTML = filtered.map(log => `
    <div class="log-item-card category-${log.category}">
      <div class="log-item-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="log-category-badge">${log.type || 'LOG'}</span>
          <span style="font-weight: 700; font-size: 12px; font-family: var(--font-mono); color: #ffffff;">@${escapeHtml(log.agent)}</span>
        </div>
        <div class="log-meta-info"><span>${new Date(log.timestamp).toLocaleTimeString()}</span></div>
      </div>
      <div class="log-message-body">${escapeHtml(log.message)}</div>
    </div>
  `).join('');
}

// MCPs
async function renderMCPsTab() {
  const grid = document.getElementById('mcpCardsGrid');
  const badge = document.getElementById('mcpCountBadge');
  if (!grid) return;

  try {
    const res = await fetch('/api/mcps');
    const data = await res.json();
    let mcps = data.mcps || globalState.mcps || [];

    const query = (document.getElementById('mcpSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
      mcps = mcps.filter(m => (m.name && m.name.toLowerCase().includes(query)) || (m.command && m.command.toLowerCase().includes(query)));
    }

    if (currentMcpCategoryFilter === 'crew') {
      mcps = mcps.filter(m => m.category === 'crew');
    } else if (currentMcpCategoryFilter === 'custom') {
      mcps = mcps.filter(m => m.category === 'custom' || (!m.category && m.type !== 'core'));
    } else if (currentMcpCategoryFilter === 'core') {
      mcps = mcps.filter(m => m.category === 'core' || m.type === 'core');
    }

    if (badge) badge.textContent = `${mcps.length} servidor${mcps.length !== 1 ? 'es' : ''}`;

    if (mcps.length === 0) {
      grid.innerHTML = `<div style="color: var(--text-dim); font-family: var(--font-mono); text-align: center; grid-column: 1 / -1; padding: 40px;">Nenhum servidor MCP encontrado.</div>`;
      return;
    }

    grid.innerHTML = mcps.map(mcp => {
      const isEnabled = mcp.enabled !== false;
      const status = mcp.status || (isEnabled ? 'configured' : 'disabled');
      const isCrew = mcp.category === 'crew';
      const isCore = mcp.category === 'core';

      let tagClass = 'custom';
      let tagLabel = '✨ CUSTOM';
      if (isCrew) {
        tagClass = 'crew';
        tagLabel = mcp.crewId ? `👥 CREW: ${mcp.crewId}` : '👥 CREW MCP';
      } else if (isCore) {
        tagClass = 'core';
        tagLabel = '⚙️ PLUGIN / CORE';
      }

      const statusBadgeMap = {
        connected: `<span class="mcp-status-badge mcp-status-connected"><span class="pulse-dot"></span>CONECTADO</span>`,
        failed: `<span class="mcp-status-badge mcp-status-failed">FALHA</span>`,
        configured: `<span class="mcp-status-badge mcp-status-configured">CONFIGURADO</span>`,
        disabled: `<span class="mcp-status-badge mcp-status-disabled">DESATIVADO</span>`
      };

      return `
        <div class="agent-card glass-card">
          <div>
            <div class="agent-card-top">
              <div class="agent-avatar-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div class="agent-name-row">
                  <h3>${escapeHtml(mcp.name)}</h3>
                  <span class="tag-origin ${tagClass}">${tagLabel}</span>
                </div>
                <div style="margin-top:4px;">${statusBadgeMap[status] || statusBadgeMap.configured}</div>
              </div>
            </div>
            <div class="agent-model-container">
              <div class="model-header-label">COMANDO / ORIGEM</div>
              <div class="model-value-name" style="word-break:break-all;font-size:11px;">${escapeHtml(mcp.command || mcp.url || '—')}</div>
            </div>
          </div>
          <div class="agent-card-footer" style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);margin-top:14px;">
            <button class="btn-secondary" style="font-size:11px;padding:4px 8px;" onclick="openFolderInFinder('~/.config/opencode/mcp_config.json')">📂 Finder</button>
            <div style="display:flex;gap:6px;">
              <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="toggleMcpByName('${escapeHtml(mcp.name)}', ${isEnabled})">
                ${isEnabled ? 'Desativar' : 'Ativar'}
              </button>
              <button class="btn-remove-agent" style="font-size:11px;padding:4px 8px;" onclick="deleteMcpByName('${escapeHtml(mcp.name)}')">Excluir</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:#fda4af;padding:20px;">Erro ao carregar MCPs: ${escapeHtml(err.message)}</div>`;
  }
}

async function toggleMcpByName(name, currentEnabled) {
  const nextState = !currentEnabled;
  try {
    const res = await fetch('/api/mcp/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled: nextState })
    });
    if (res.ok) {
      showToast(`MCP '${name}' ${nextState ? 'ativado' : 'desativado'}.`);
      await renderMCPsTab();
      await fetchState();
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

async function deleteMcpByName(name) {
  const confirmed = await showConfirmDialog({
    title: 'Excluir MCP',
    message: `Deseja excluir o servidor <strong style="color:#fff;">'${escapeHtml(name)}'</strong>?`,
    confirmText: 'Excluir',
    isDanger: true
  });
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/mcp/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`MCP '${name}' excluído.`);
      await renderMCPsTab();
      await fetchState();
    }
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

// OPENCODE CONNECTION & SSE
async function checkOpencodeServer() {
  try {
    const res = await fetch('/api/opencode/health');
    const data = await res.json();
    opencodeServerOnline = data.online === true;

    const tagEl = document.getElementById('opencodeServerTag');
    const versionEl = document.getElementById('statOpencodeVersion');
    const urlEl = document.getElementById('statOpencodeUrl');

    if (tagEl) {
      tagEl.textContent = opencodeServerOnline ? 'Online' : 'Offline';
      tagEl.className = 'metric-tag ' + (opencodeServerOnline ? 'status-online' : 'status-offline');
    }
    if (versionEl) {
      versionEl.textContent = data.version ? `v${data.version}` : (opencodeServerOnline ? 'conectado' : 'offline');
      versionEl.style.color = opencodeServerOnline ? '#10b981' : '#f43f5e';
    }
    if (urlEl) {
      const activePort = data.port || '4040';
      urlEl.textContent = opencodeServerOnline ? `localhost:${activePort} · REST Ativa` : 'localhost:4040 · opencode web';
    }
  } catch {
    opencodeServerOnline = false;
  }
}

function connectOpencodeSSE() {
  if (sseEventSource) sseEventSource.close();
  const badge = document.getElementById('sseStatusBadge');

  function setBadge(text, bg, color) {
    if (!badge) return;
    badge.textContent = text;
    badge.style.background = bg;
    badge.style.color = color;
  }

  sseEventSource = new EventSource('/api/opencode/events');
  sseEventSource.onopen = () => setBadge('SSE LIVE', 'rgba(16,185,129,0.15)', '#34d399');
  sseEventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const payload = parsed.payload || parsed;
      const type = payload?.type || 'event';
      if (type.includes('heartbeat') || type === 'server.connected' || type === 'server.offline') return;

      let msg = '';
      if (payload.text) msg = payload.text;
      else if (payload.reason) msg = `Step: ${payload.reason}`;
      else if (payload.tool) msg = `Tool: ${payload.tool} (${payload.state?.title || ''})`;
      else if (payload.properties && Object.keys(payload.properties).length > 0) msg = JSON.stringify(payload.properties);
      else msg = JSON.stringify(payload);

      if (!msg || msg === '{}' || msg === '[]') return;

      const liveItem = {
        id: `sse_${Date.now()}_${Math.random()}`,
        agent: parsed.directory ? parsed.directory.split('/').pop() : 'opencode',
        type: type.toUpperCase(),
        category: type.includes('error') ? 'error' : (type.includes('step') ? 'success' : 'info'),
        message: msg.slice(0, 240),
        timestamp: Date.now()
      };

      liveOpencodeEvents.unshift(liveItem);
      if (liveOpencodeEvents.length > 50) liveOpencodeEvents.pop();
      renderLiveEventsFeed();
    } catch {}
  };
  sseEventSource.onerror = () => {
    setBadge('SSE OFFLINE', 'rgba(244,63,94,0.15)', '#fda4af');
    sseEventSource.close();
    setTimeout(connectOpencodeSSE, 8000);
  };
}

function clearLiveEventsFeed() {
  liveOpencodeEvents = [];
  if (logsPayload && logsPayload.logs) logsPayload.logs = [];
  renderLiveEventsFeed();
  showToast('Terminal limpo.');
}

function toggleFeedAutoScroll() {
  feedAutoScroll = !feedAutoScroll;
  showToast(feedAutoScroll ? 'Auto-scroll ativado' : 'Auto-scroll pausado');
}

function renderLiveEventsFeed() {
  const feedEl = document.getElementById('overviewEventsFeed');
  if (!feedEl) return;

  const combined = [];
  const seenIds = new Set();

  for (const item of liveOpencodeEvents) {
    if (item.message && item.message !== '{}' && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }

  for (const log of (logsPayload.logs || [])) {
    if (log.message && log.message !== '{}' && !seenIds.has(log.id)) {
      seenIds.add(log.id);
      combined.push(log);
    }
  }

  const items = combined.slice(0, 15);

  if (items.length === 0) {
    feedEl.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; font-family: var(--font-mono); text-align: center; padding: 25px;">Aguardando execuções de prompts ou chamadas de ferramentas...</div>`;
    return;
  }

  feedEl.innerHTML = items.map(item => {
    const categoryClass = item.category === 'error' ? 'error' : (item.category === 'success' ? 'success' : (item.type?.includes('TOOL') ? 'warn' : 'info'));
    return `
      <div class="event-card ${categoryClass}">
        <div class="event-header">
          <span class="event-type-badge">${escapeHtml(item.type || 'EVENT')} · @${escapeHtml(item.agent || 'opencode')}</span>
          <span class="event-time">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div class="event-snippet">${escapeHtml((item.message || '').slice(0, 240))}</div>
      </div>
    `;
  }).join('');
}

function showToast(msg) {
  const toast = document.getElementById('toastPopup');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function showConfirmDialog({ title, message, confirmText = 'Confirmar', isDanger = true }) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if (!modal || !okBtn || !cancelBtn) { resolve(window.confirm(message)); return; }

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    okBtn.textContent = confirmText;
    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(msg) {
  const toast = document.getElementById('toastPopup');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function showConfirmDialog({ title, message, confirmText = 'Confirmar', isDanger = true }) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if (!modal || !okBtn || !cancelBtn) { resolve(window.confirm(message)); return; }

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    okBtn.textContent = confirmText;
    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// =========================================================
// UNIVERSAL MODAL SYSTEM (ESC + BACKDROP CLICK)
// =========================================================

function closeAgentModal() {
  const modal = document.getElementById('agentModal');
  if (modal) modal.style.display = 'none';
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';
}

function closeAnyModal(modalEl) {
  if (!modalEl) return;
  const id = modalEl.id;
  if (id === 'createCrewModal') closeCreateCrewModal();
  else if (id === 'editCrewModal') closeEditCrewModal();
  else if (id === 'presidentDirectiveModal') closePresidentDirectiveModal();
  else if (id === 'crewAgentModal') closeCrewAgentModal();
  else if (id === 'crewMuralModal') closeCrewMuralModal();
  else if (id === 'crewSkillModal') closeCrewSkillModal();
  else if (id === 'crewSkillPickerModal') closeCrewSkillPickerModal();
  else if (id === 'agentModal') closeAgentModal();
  else if (id === 'skillModal') closeSkillModal();
  else if (id === 'agentRoutingModal') closeAgentRoutingModal();
  else if (id === 'confirmModal') closeConfirmModal();
  else modalEl.style.display = 'none';
}

function closeAllModals() {
  const openModals = document.querySelectorAll('.modal-backdrop, .modal-overlay');
  openModals.forEach(m => {
    if (m.style.display && m.style.display !== 'none') {
      closeAnyModal(m);
    }
  });
}

// Regra Universal 1: Tecla ESC fecha todas as janelas, diálogos e editores
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    closeAllModals();
  }
});

// Regra Universal 2: Clicar fora (no backdrop escurecido) fecha o modal imediatamente
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay'))) {
    closeAnyModal(e.target);
  }
});

