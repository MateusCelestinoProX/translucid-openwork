/**
 * patch-engine-openwork.js — Translucid OpenWork (Crystal Glass + Palette Theme Picker)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const themePicker = require('./theme-picker-bundle.js');

const targetDir = process.argv[2];

if (!targetDir || !fs.existsSync(targetDir)) {
  console.error('❌ Diretório não fornecido ou inexistente:', targetDir);
  process.exit(1);
}

console.log('⚡ [OpenWork] Aplicando Crystal Translucid + Theme Picker em:', targetDir);

const customGlassStyle = `
  <style id="translucid-openwork-glass">
    /* 🍏 ESTÉTICA CRYSTAL TRANSLUCID — ULTRA VIDRO NATIVO MACOS */
    :root, [data-theme], [data-theme="light"], [data-theme="dark"], .light, .dark, body, html {
      color-scheme: dark !important;

      --dls-surface: transparent !important;
      --dls-sidebar: transparent !important;
      --dls-app-bg: transparent !important;
      --dls-background: transparent !important;
      --dls-canvas: transparent !important;
      --dls-surface-muted: rgba(255, 255, 255, 0.03) !important;
      --dls-card-shadow: none !important;
      --dls-shell-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;

      --background: transparent !important;
      --foreground: #e6edf3 !important;
      --card: transparent !important;
      --card-foreground: #e6edf3 !important;
      --popover: rgba(18, 22, 30, 0.75) !important;
      --popover-foreground: #e6edf3 !important;
      --popover-border: rgba(255, 255, 255, 0.10) !important;
      --sidebar: transparent !important;
      --sidebar-foreground: #e6edf3 !important;
      --sidebar-border: rgba(255, 255, 255, 0.06) !important;
      --muted: rgba(255, 255, 255, 0.04) !important;
      --muted-foreground: #9198a1 !important;
      --secondary: rgba(255, 255, 255, 0.04) !important;
      --secondary-foreground: #e6edf3 !important;
      --accent: rgba(255, 255, 255, 0.06) !important;
      --accent-foreground: #ffffff !important;

      --dls-text-primary: #e6edf3 !important;
      --dls-text-secondary: #9198a1 !important;
      --dls-border: rgba(255, 255, 255, 0.06) !important;
      --border: rgba(255, 255, 255, 0.06) !important;
      --input: rgba(255, 255, 255, 0.08) !important;

      --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif !important;
      --font-heading: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif !important;
      --font-mono: 'JetBrainsMono Nerd Font', 'Fira Code', 'SF Mono', Menlo, monospace !important;
    }

    #root, main, [data-slot="app-root"], .app-container, [data-slot="canvas-container"], section, article {
      background: rgba(10, 14, 20, 0.18) !important;
      transform: translateZ(0);
    }

    html, body {
      background: transparent !important;
      background-color: transparent !important;
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    aside, nav, header, [data-slot="sidebar"] {
      background: transparent !important;
      background-color: transparent !important;
      transform: translateZ(0);
    }

    [class*="bg-background"], [class*="bg-zinc-"], [class*="bg-neutral-"], [class*="bg-slate-"], [class*="bg-card"], [class*="bg-muted"] {
      background: transparent !important;
      background-color: transparent !important;
    }

    code, pre, [class*="font-mono"], .monaco-editor, .xterm {
      font-family: var(--font-mono) !important;
      font-variant-ligatures: contextual !important;
      letter-spacing: normal !important;
    }

    input, textarea, select, [contenteditable="true"] {
      background-color: rgba(255, 255, 255, 0.04) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: #e6edf3 !important;
      border-radius: 8px !important;
      box-shadow: none !important;
    }

    dialog, [role="dialog"], [class*="modal"], [class*="popover"] {
      background: rgba(18, 22, 30, 0.80) !important;
      backdrop-filter: blur(30px) !important;
      -webkit-backdrop-filter: blur(30px) !important;
      border: 1px solid rgba(255, 255, 255, 0.10) !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.50) !important;
    }

    .ow-native-titlebar-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      height: 24px !important;
      padding: 0 10px !important;
      margin-left: 6px !important;
      margin-right: 2px !important;
      border-radius: 6px !important;
      background: rgba(255, 255, 255, 0.07) !important;
      border: 1px solid rgba(255, 255, 255, 0.10) !important;
      color: #c9d1d9 !important;
      font-family: var(--font-sans) !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      -webkit-app-region: no-drag !important;
      flex-shrink: 0 !important;
      transition: all 0.15s ease !important;
    }
    .ow-native-titlebar-btn:hover {
      background: rgba(255, 255, 255, 0.14) !important;
      border-color: rgba(255, 255, 255, 0.22) !important;
      color: #ffffff !important;
    }
  </style>
`;

const openworkDashboardScript = `
  <script id="ow-dashboard-script">
    (function() {
      function mountBtn() {
        if (document.getElementById('openwork-dashboard-btn')) return;
        const container = document.querySelector('[data-slot="titlebar-actions"]') ||
                          document.querySelector('[data-slot="titlebar-right"]') ||
                          document.getElementById('opencode-titlebar-right') ||
                          document.querySelector('header [class*="actions"]') ||
                          document.querySelector('header') ||
                          document.querySelector('nav');
        if (container) {
          const btn = document.createElement('button');
          btn.id = 'openwork-dashboard-btn';
          btn.type = 'button';
          btn.title = 'Abrir Control Center (http://localhost:3030/)';
          btn.className = 'ow-native-titlebar-btn';
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5"></rect></svg><span>Dashboard</span>';
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const url = 'http://localhost:3030/';
            if (window.openwork && typeof window.openwork.openExternal === 'function') {
              window.openwork.openExternal(url);
            } else if (window.api && typeof window.api.openExternal === 'function') {
              window.api.openExternal(url);
            } else {
              window.open(url, '_blank');
            }
          });
          container.insertBefore(btn, container.firstChild);
        }
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBtn);
      else mountBtn();
      setInterval(mountBtn, 1000);
    })();
  </script>
`;

function patchHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/<style id="translucid-openwork-glass">[\s\S]*?<\/style>/g, '');
  html = html.replace(/<script id="ow-dashboard-script">[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script id="translucid-theme-picker-script">[\s\S]*?<\/script>/g, '');

  html = html.replace(/<html([^>]*)>/i, '<html$1 class="dark openwork-electron openwork-platform-mac" data-theme="dark" style="background-color: transparent !important; background: transparent !important; color-scheme: dark !important;">');
  html = html.replace(/<body([^>]*)>/i, '<body$1 class="dark bg-transparent text-white" data-theme="dark" style="background: transparent !important; background-color: transparent !important; color-scheme: dark !important;">');

  html = html.replace('</head>', `${customGlassStyle}\n</head>`);
  const themePickerScript = themePicker.generateScript('openwork');
  html = html.replace('</body>', `${openworkDashboardScript}\n${themePickerScript}\n</body>`);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('✅ HTML Crystal Translucid + Theme Picker injetado:', filePath);
}

function patchMainJs(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Limpa duplicidades
  code = code.replace(/\n\s*mainWindow\?\.setVibrancy\(macosVibrancyForCurrentTheme\(\)\);\n\s*mainWindow\?\.setBackgroundColor\("#00000001"\);\n\s*return true;\n\}/g, "");
  code = code.replace(/\n\s*mainWindow\?\.setVibrancy\(macosVibrancyForCurrentTheme\(\)\);\n\s*mainWindow\?\.setBackgroundColor\("#00000000"\);\n\s*return true;\n\}/g, "");
  code = code.replace(/\n\s*mainWindow\?\.setVibrancy\("under-window"\);\n\s*mainWindow\?\.setBackgroundColor\("#00000000"\);\n\s*return true;\n\}/g, "");

  code = code.replace(/function\s+macosVibrancyForCurrentTheme\(\)\s*\{[\s\S]*?\}/, 'function macosVibrancyForCurrentTheme() {\n  return "under-window";\n}');

  code = code.replace(/function\s+applyNativeTheme\(mode\)\s*\{[\s\S]*?return\s+true;\s*\}/, `function applyNativeTheme(mode) {
  nativeTheme.themeSource = "dark";
  if (process.platform === "darwin") {
    mainWindow?.setVibrancy("under-window");
    mainWindow?.setBackgroundColor("#00000000");
  }
  return true;
}`);

  code = code.replace(/backgroundColor:\s*"#00000001"/g, 'backgroundColor: "#00000000"');
  code = code.replace(/titleBarStyle:\s*"hiddenInset"/g, 'titleBarStyle: "hidden"');

  fs.writeFileSync(filePath, code, 'utf8');

  try {
    execSync(`node --check "${filePath}"`);
    console.log('✅ JavaScript Main process validado:', filePath);
  } catch (err) {
    console.error('❌ Erro de sintaxe:', err.message);
    process.exit(1);
  }
}

function findAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAndPatch(fullPath);
    } else if (entry.isFile()) {
      if (entry.name === 'index.html') patchHtml(fullPath);
      else if (entry.name === 'main.mjs' || entry.name === 'main.js') patchMainJs(fullPath);
    }
  }
}

findAndPatch(targetDir);
console.log('🎉 [OpenWork Engine] Crystal Translucid + Theme Picker concluído!');
