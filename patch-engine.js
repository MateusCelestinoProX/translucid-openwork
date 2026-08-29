/**
 * patch-engine.js — Translucid OpenWork (Super Premium Glass + Walking Orbs & Multi-Effects)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const targetDir = process.argv[2];

if (!targetDir || !fs.existsSync(targetDir)) {
  console.error("❌ Diretório não fornecido ou inexistente:", targetDir);
  process.exit(1);
}

console.log("⚡ [OpenWork] Aplicando Super Premium Glass + Multi-Effects em:", targetDir);

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
      --popover: rgba(18, 22, 30, 0.85) !important;
      --popover-foreground: #e6edf3 !important;
      --popover-border: rgba(255, 255, 255, 0.12) !important;
      --sidebar: transparent !important;
      --sidebar-foreground: #e6edf3 !important;
      --sidebar-border: rgba(255, 255, 255, 0.08) !important;
      --muted: rgba(255, 255, 255, 0.05) !important;
      --muted-foreground: #cbd5e1 !important;
      --secondary: rgba(255, 255, 255, 0.05) !important;
      --secondary-foreground: #e6edf3 !important;
      --accent: rgba(255, 255, 255, 0.08) !important;
      --accent-foreground: #ffffff !important;

      --dls-text-primary: #e6edf3 !important;
      --dls-text-secondary: #cbd5e1 !important;
      --dls-border: rgba(255, 255, 255, 0.08) !important;
      --border: rgba(255, 255, 255, 0.08) !important;
      --input: rgba(255, 255, 255, 0.08) !important;

      --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif !important;
      --font-heading: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif !important;
      --font-mono: "JetBrainsMono Nerd Font", "Fira Code", "SF Mono", Menlo, monospace !important;
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
      background-color: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.10) !important;
      color: #e6edf3 !important;
      border-radius: 8px !important;
      box-shadow: none !important;
    }

    dialog, [role="dialog"], [class*="modal"], [class*="popover"] {
      background: rgba(18, 22, 30, 0.88) !important;
      backdrop-filter: blur(35px) !important;
      -webkit-backdrop-filter: blur(35px) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.60) !important;
    }

    .ow-native-titlebar-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      height: 22px !important;
      padding: 0 8px !important;
      margin: 0 !important;
      border-radius: 5px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      color: #cbd5e1 !important;
      font-family: var(--font-sans) !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      -webkit-app-region: no-drag !important;
      flex-shrink: 0 !important;
      transition: all 0.15s ease !important;
    }
    .ow-native-titlebar-btn:hover {
      background: rgba(255, 255, 255, 0.16) !important;
      border-color: rgba(255, 255, 255, 0.28) !important;
      color: #ffffff !important;
      transform: translateY(-1px);
    }

    /* 🔘 FIX: High Contrast Dark Text for Solid Primary Buttons (bg-foreground / bg-primary) */
    .text-background,
    [class*="text-background"],
    [data-slot="button"][class*="bg-foreground"],
    button[class*="bg-foreground"],
    [data-slot="button"][class*="bg-white"],
    button[class*="bg-white"],
    [data-slot="button"][class*="bg-primary"],
    button[class*="bg-primary"],
    .bg-foreground.text-background,
    .bg-primary.text-primary-foreground {
      color: #0b0f17 !important;
      font-weight: 600 !important;
    }

    .text-background *,
    [class*="text-background"] *,
    [data-slot="button"][class*="bg-foreground"] *,
    button[class*="bg-foreground"] *,
    [data-slot="button"][class*="bg-white"] *,
    button[class*="bg-white"] *,
    [data-slot="button"][class*="bg-primary"] *,
    button[class*="bg-primary"] *,
    .bg-foreground.text-background *,
    .bg-primary.text-primary-foreground * {
      color: #0b0f17 !important;
    }

    /* 🌟 SUPER CRISP SIDEBAR & SETTINGS CONTRAST (ALL ELEMENTS & CHILDREN) */
    [data-sidebar],
    [data-sidebar] *,
    [data-slot="sidebar"],
    [data-slot="sidebar"] *,
    [class*="sidebar"],
    [class*="sidebar"] *,
    .text-sidebar-foreground,
    .text-sidebar-foreground\/70,
    .text-sidebar-foreground\/80,
    .text-sidebar-foreground\/60,
    .text-sidebar-foreground\/50,
    aside,
    aside *,
    nav,
    nav * {
      --sidebar-foreground: #f1f5f9 !important;
      --sidebar-accent-foreground: #ffffff !important;
    }

    [data-sidebar="menu-button"],
    [data-sidebar="menu-button"] *,
    [data-sidebar="menu-sub-button"],
    [data-sidebar="menu-sub-button"] *,
    [data-sidebar="menu-action"],
    [data-sidebar="menu-action"] *,
    [data-slot="sidebar"] a,
    [data-slot="sidebar"] a *,
    [data-slot="sidebar"] button,
    [data-slot="sidebar"] button *,
    [data-slot="sidebar-menu-button"],
    [data-slot="sidebar-menu-button"] *,
    aside a,
    aside a *,
    aside button,
    aside button *,
    nav a,
    nav a *,
    nav button,
    nav button * {
      color: #e2e8f0 !important;
    }

    /* Hover State */
    [data-sidebar="menu-button"]:hover,
    [data-sidebar="menu-button"]:hover *,
    aside a:hover,
    aside a:hover *,
    aside button:hover,
    aside button:hover *,
    nav a:hover,
    nav a:hover *,
    nav button:hover,
    nav button:hover * {
      color: #ffffff !important;
    }

    /* Active Item */
    [data-sidebar="menu-button"][data-active="true"],
    [data-sidebar="menu-button"][data-active="true"] *,
    [data-sidebar="menu-button"][aria-current="page"],
    [data-sidebar="menu-button"][aria-current="page"] *,
    aside [data-active="true"],
    aside [data-active="true"] *,
    nav [data-active="true"],
    nav [data-active="true"] * {
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    /* SVG Icons */
    [data-sidebar] svg,
    [data-slot="sidebar"] svg,
    aside svg,
    nav svg {
      color: #cbd5e1 !important;
      opacity: 0.95 !important;
      stroke: currentColor !important;
    }

    /* Group Labels / Headers */
    [data-sidebar="group-label"],
    [data-sidebar="group-label"] *,
    aside [class*="uppercase"],
    nav [class*="uppercase"],
    [data-slot="sidebar"] [class*="uppercase"] {
      color: #a0aec0 !important;
      font-weight: 700 !important;
      letter-spacing: 0.05em !important;
    }
  </style>
`;

function generateOpenWorkEngineScript() {
  const THEMES_JSON = JSON.stringify([
    {
        "id": "poimandres",
        "name": "Poimandres (Cyan & Emerald)",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#00CED1",
            "#f087bd",
            "#fffac2"
        ]
    },
    {
        "id": "neon-emerald",
        "name": "Neon Emerald & Cyan",
        "primary": "#10b981",
        "keyword": "#06b6d4",
        "func": "#34d399",
        "string": "#a7f3d0",
        "comment": "#64748b",
        "accents": [
            "#10b981",
            "#06b6d4",
            "#34d399",
            "#a7f3d0"
        ]
    },
    {
        "id": "tokyo-night",
        "name": "Tokyo Night",
        "primary": "#7aa2f7",
        "keyword": "#bb9af7",
        "func": "#7dcfff",
        "string": "#9ece6a",
        "comment": "#565f89",
        "accents": [
            "#7aa2f7",
            "#bb9af7",
            "#7dcfff",
            "#9ece6a"
        ]
    },
    {
        "id": "dracula",
        "name": "Dracula Pro",
        "primary": "#bd93f9",
        "keyword": "#ff79c6",
        "func": "#50fa7b",
        "string": "#f1fa8c",
        "comment": "#6272a4",
        "accents": [
            "#bd93f9",
            "#ff79c6",
            "#50fa7b",
            "#f1fa8c"
        ]
    },
    {
        "id": "catppuccin-mocha",
        "name": "Catppuccin Mocha",
        "primary": "#cba6f7",
        "keyword": "#f38ba8",
        "func": "#89b4fa",
        "string": "#a6e3a1",
        "comment": "#6c7086",
        "accents": [
            "#cba6f7",
            "#f38ba8",
            "#89b4fa",
            "#a6e3a1"
        ]
    },
    {
        "id": "one-dark-pro",
        "name": "One Dark Pro",
        "primary": "#61afef",
        "keyword": "#c678dd",
        "func": "#98c379",
        "string": "#e5c07b",
        "comment": "#5c6370",
        "accents": [
            "#61afef",
            "#c678dd",
            "#98c379",
            "#e5c07b"
        ]
    },
    {
        "id": "synthwave-84",
        "name": "Synthwave '84",
        "primary": "#ff7edb",
        "keyword": "#f92aad",
        "func": "#36f9f6",
        "string": "#fe4450",
        "comment": "#614d85",
        "accents": [
            "#ff7edb",
            "#f92aad",
            "#36f9f6",
            "#fe4450"
        ]
    },
    {
        "id": "cyberpunk-2077",
        "name": "Cyberpunk 2077",
        "primary": "#fcee0a",
        "keyword": "#ff003c",
        "func": "#00f0ff",
        "string": "#00ff66",
        "comment": "#71717a",
        "accents": [
            "#fcee0a",
            "#ff003c",
            "#00f0ff",
            "#00ff66"
        ]
    },
    {
        "id": "nord",
        "name": "Nord Frost",
        "primary": "#88c0d0",
        "keyword": "#81a1c1",
        "func": "#8fbcbb",
        "string": "#a3be8c",
        "comment": "#616e88",
        "accents": [
            "#88c0d0",
            "#81a1c1",
            "#8fbcbb",
            "#a3be8c"
        ]
    },
    {
        "id": "gruvbox-dark",
        "name": "Gruvbox Material",
        "primary": "#ebdbb2",
        "keyword": "#fb4934",
        "func": "#b8bb26",
        "string": "#fabd2f",
        "comment": "#928374",
        "accents": [
            "#ebdbb2",
            "#fb4934",
            "#b8bb26",
            "#fabd2f"
        ]
    },
    {
        "id": "rose-pine",
        "name": "Rosé Pine",
        "primary": "#ebbcba",
        "keyword": "#eb6f92",
        "func": "#9ccfd8",
        "string": "#f6c177",
        "comment": "#6e6a86",
        "accents": [
            "#ebbcba",
            "#eb6f92",
            "#9ccfd8",
            "#f6c177"
        ]
    },
    {
        "id": "ayu-dark",
        "name": "Ayu Dark",
        "primary": "#E6B450",
        "keyword": "#FF8F40",
        "func": "#39BAE6",
        "string": "#AAD94C",
        "comment": "#626d7a",
        "accents": [
            "#E6B450",
            "#FF8F40",
            "#39BAE6",
            "#AAD94C"
        ]
    },
    {
        "id": "moonlight",
        "name": "Moonlight",
        "primary": "#af9fff",
        "keyword": "#ff757f",
        "func": "#78dbff",
        "string": "#c3e88d",
        "comment": "#7a88cf",
        "accents": [
            "#af9fff",
            "#ff757f",
            "#78dbff",
            "#c3e88d"
        ]
    },
    {
        "id": "cobalt2",
        "name": "Cobalt2",
        "primary": "#ffc600",
        "keyword": "#ff9d00",
        "func": "#0088ff",
        "string": "#3ad900",
        "comment": "#0088ff",
        "accents": [
            "#ffc600",
            "#ff9d00",
            "#0088ff",
            "#3ad900"
        ]
    },
    {
        "id": "shades-of-purple",
        "name": "Shades of Purple",
        "primary": "#fad000",
        "keyword": "#ff9d00",
        "func": "#a599e9",
        "string": "#b362ff",
        "comment": "#b362ff",
        "accents": [
            "#fad000",
            "#ff9d00",
            "#a599e9",
            "#b362ff"
        ]
    },
    {
        "id": "night-owl",
        "name": "Night Owl",
        "primary": "#82aaff",
        "keyword": "#c792ea",
        "func": "#ecc48d",
        "string": "#addb67",
        "comment": "#637777",
        "accents": [
            "#82aaff",
            "#c792ea",
            "#ecc48d",
            "#addb67"
        ]
    },
    {
        "id": "monokai-pro",
        "name": "Monokai Pro",
        "primary": "#ffd866",
        "keyword": "#ff6188",
        "func": "#78dce8",
        "string": "#a9dc76",
        "comment": "#727072",
        "accents": [
            "#ffd866",
            "#ff6188",
            "#78dce8",
            "#a9dc76"
        ]
    },
    {
        "id": "palenight",
        "name": "Material Palenight",
        "primary": "#82aaff",
        "keyword": "#c792ea",
        "func": "#ffcb6b",
        "string": "#c3e88d",
        "comment": "#676e95",
        "accents": [
            "#82aaff",
            "#c792ea",
            "#ffcb6b",
            "#c3e88d"
        ]
    },
    {
        "id": "laserwave",
        "name": "LaserWave Neon",
        "primary": "#40b4c4",
        "keyword": "#ff6b9d",
        "func": "#ffe261",
        "string": "#b381c5",
        "comment": "#91889b",
        "accents": [
            "#40b4c4",
            "#ff6b9d",
            "#ffe261",
            "#b381c5"
        ]
    },
    {
        "id": "abyss",
        "name": "Abyss Deep Ocean",
        "primary": "#225588",
        "keyword": "#6688cc",
        "func": "#ddbb88",
        "string": "#22aa44",
        "comment": "#384887",
        "accents": [
            "#225588",
            "#6688cc",
            "#ddbb88",
            "#22aa44"
        ]
    },
    {
        "id": "horizon",
        "name": "Horizon Warm",
        "primary": "#e95678",
        "keyword": "#fab795",
        "func": "#26bbd9",
        "string": "#fac29a",
        "comment": "#6c6f93",
        "accents": [
            "#e95678",
            "#fab795",
            "#26bbd9",
            "#fac29a"
        ]
    },
    {
        "id": "panda-syntax",
        "name": "Panda Syntax",
        "primary": "#19f9d8",
        "keyword": "#ff4b82",
        "func": "#ffb86c",
        "string": "#45a9f9",
        "comment": "#676b79",
        "accents": [
            "#19f9d8",
            "#ff4b82",
            "#ffb86c",
            "#45a9f9"
        ]
    },
    {
        "id": "purple-dream",
        "name": "Purple Dream",
        "primary": "#a855f7",
        "keyword": "#ec4899",
        "func": "#8b5cf6",
        "string": "#f472b6",
        "comment": "#6b7280",
        "accents": [
            "#a855f7",
            "#ec4899",
            "#8b5cf6",
            "#f472b6"
        ]
    },
    {
        "id": "cyber-cyan",
        "name": "Cyber Cyan",
        "primary": "#00f0ff",
        "keyword": "#ff007f",
        "func": "#ffe600",
        "string": "#00ffcc",
        "comment": "#555577",
        "accents": [
            "#00f0ff",
            "#ff007f",
            "#ffe600",
            "#00ffcc"
        ]
    },
    {
        "id": "charcoal",
        "name": "Charcoal",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "lavi-deep-ember",
        "name": "Lavi Deep Ember",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "lavi-deep",
        "name": "Lavi Deep",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "lavi",
        "name": "Lavi",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "poimandres-accessible",
        "name": "Poimandres Accessible",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "poimandres-turquoise-expanded",
        "name": "Poimandres Turquoise Expanded",
        "primary": "#5DE4c7",
        "keyword": "#f087bd",
        "func": "#00CED1",
        "string": "#fffac2",
        "comment": "#767c9d",
        "accents": [
            "#5DE4c7",
            "#f087bd",
            "#00CED1",
            "#fffac2"
        ]
    },
    {
        "id": "scaefy-bluloco-light",
        "name": "Bluloco Light",
        "primary": "#0099e1",
        "keyword": "#727378",
        "func": "#047485",
        "string": "#a0a1a7",
        "comment": "#383a42",
        "accents": [
            "#0099e1",
            "#727378",
            "#047485",
            "#a0a1a7"
        ]
    },
    {
        "id": "scaefy-brackets-light-pro",
        "name": "Brackets Light Pro",
        "primary": "#0066cc",
        "keyword": "#386ac3",
        "func": "#8431c5",
        "string": "#e88501",
        "comment": "#10a567",
        "accents": [
            "#0066cc",
            "#386ac3",
            "#8431c5",
            "#e88501"
        ]
    },
    {
        "id": "scaefy-classic-light",
        "name": "Classic Light",
        "primary": "#22a5c9",
        "keyword": "#e022b4",
        "func": "#0073d1",
        "string": "#189433",
        "comment": "#6c8d96",
        "accents": [
            "#22a5c9",
            "#e022b4",
            "#0073d1",
            "#189433"
        ]
    },
    {
        "id": "scaefy-coffee-cream",
        "name": "Coffee Cream",
        "primary": "#D3694C",
        "keyword": "#CE4985",
        "func": "#008ea4",
        "string": "#4d9900",
        "comment": "#ad9189",
        "accents": [
            "#D3694C",
            "#CE4985",
            "#008ea4",
            "#4d9900"
        ]
    },
    {
        "id": "scaefy-github-light",
        "name": "Github Light",
        "primary": "#d73a49",
        "keyword": "#d73a49",
        "func": "#005cc5",
        "string": "#032f62",
        "comment": "#6a737d",
        "accents": [
            "#d73a49",
            "#d73a49",
            "#005cc5",
            "#032f62"
        ]
    },
    {
        "id": "scaefy-github-plus",
        "name": "Github Plus",
        "primary": "#fafbfc",
        "keyword": "#24292e",
        "func": "#d73a49",
        "string": "#032f62",
        "comment": "#6a737d",
        "accents": [
            "#fafbfc",
            "#24292e",
            "#d73a49",
            "#032f62"
        ]
    },
    {
        "id": "scaefy-gold-d-raynh-light",
        "name": "Gold D Raynh Light",
        "primary": "#2397e5",
        "keyword": "#002e74",
        "func": "#037ed1",
        "string": "#03810d",
        "comment": "#6698b9",
        "accents": [
            "#2397e5",
            "#002e74",
            "#037ed1",
            "#03810d"
        ]
    },
    {
        "id": "scaefy-hc-flurry",
        "name": "Hc Flurry",
        "primary": "#444c54",
        "keyword": "#f08ad9",
        "func": "#0aa3d6",
        "string": "#41ad4e",
        "comment": "#898989",
        "accents": [
            "#444c54",
            "#f08ad9",
            "#0aa3d6",
            "#41ad4e"
        ]
    },
    {
        "id": "scaefy-hop-light",
        "name": "Hop Light",
        "primary": "#0066cc",
        "keyword": "#398BC9",
        "func": "#3F831E",
        "string": "#BD7111",
        "comment": "#96928F",
        "accents": [
            "#0066cc",
            "#398BC9",
            "#3F831E",
            "#BD7111"
        ]
    },
    {
        "id": "scaefy-light",
        "name": "Light",
        "primary": "#526FFF",
        "keyword": "#A626A4",
        "func": "#4078F2",
        "string": "#50A14F",
        "comment": "#A0A1A7",
        "accents": [
            "#526FFF",
            "#A626A4",
            "#4078F2",
            "#50A14F"
        ]
    },
    {
        "id": "scaefy-melle-julie-light",
        "name": "Melle Julie Light",
        "primary": "#218d8f",
        "keyword": "#ae6cbe",
        "func": "#1f89cf",
        "string": "#2aa54d",
        "comment": "#5f6868",
        "accents": [
            "#218d8f",
            "#ae6cbe",
            "#1f89cf",
            "#2aa54d"
        ]
    },
    {
        "id": "scaefy-milkshake-blueberry",
        "name": "Milkshake Blueberry",
        "primary": "#422eb0",
        "keyword": "#c121a4",
        "func": "#0076c5",
        "string": "#008b17",
        "comment": "#78777e",
        "accents": [
            "#422eb0",
            "#c121a4",
            "#0076c5",
            "#008b17"
        ]
    },
    {
        "id": "scaefy-milkshake-mango",
        "name": "Milkshake Mango",
        "primary": "#bd4f27",
        "keyword": "#c121a4",
        "func": "#0076c5",
        "string": "#008b17",
        "comment": "#8a7872",
        "accents": [
            "#bd4f27",
            "#c121a4",
            "#0076c5",
            "#008b17"
        ]
    },
    {
        "id": "scaefy-milkshake-mint",
        "name": "Milkshake Mint",
        "primary": "#2a9b7d",
        "keyword": "#c121a4",
        "func": "#0076c5",
        "string": "#008b17",
        "comment": "#6d6f6f",
        "accents": [
            "#2a9b7d",
            "#c121a4",
            "#0076c5",
            "#008b17"
        ]
    },
    {
        "id": "scaefy-milkshake-raspberry",
        "name": "Milkshake Raspberry",
        "primary": "#d1174f",
        "keyword": "#c121a4",
        "func": "#0076c5",
        "string": "#008b17",
        "comment": "#9e6475",
        "accents": [
            "#d1174f",
            "#c121a4",
            "#0076c5",
            "#008b17"
        ]
    },
    {
        "id": "scaefy-milkshake-vanilla",
        "name": "Milkshake Vanilla",
        "primary": "#937416",
        "keyword": "#c121a4",
        "func": "#0076c5",
        "string": "#008b17",
        "comment": "#6d6757",
        "accents": [
            "#937416",
            "#c121a4",
            "#0076c5",
            "#008b17"
        ]
    },
    {
        "id": "scaefy-netbeans-light",
        "name": "Netbeans Light",
        "primary": "#0066cc",
        "keyword": "#969696",
        "func": "#000000",
        "string": "#9933CC",
        "comment": "#969696",
        "accents": [
            "#0066cc",
            "#969696",
            "#000000",
            "#9933CC"
        ]
    },
    {
        "id": "scaefy-quiet-light",
        "name": "Quiet Light",
        "primary": "#3399ff",
        "keyword": "#777777",
        "func": "#aa3731",
        "string": "#448C27",
        "comment": "#aaaaaa",
        "accents": [
            "#3399ff",
            "#777777",
            "#aa3731",
            "#448C27"
        ]
    },
    {
        "id": "scaefy-solarized-light",
        "name": "Solarized Light",
        "primary": "#2aa198",
        "keyword": "#c64fbc",
        "func": "#2c97e3",
        "string": "#819501",
        "comment": "#8f9f9e",
        "accents": [
            "#2aa198",
            "#c64fbc",
            "#2c97e3",
            "#819501"
        ]
    },
    {
        "id": "scaefy-vivid-light",
        "name": "Vivid Light",
        "primary": "#7e7e7e",
        "keyword": "#E66DFF",
        "func": "#0099ff",
        "string": "#00ac39",
        "comment": "#8a8a8a",
        "accents": [
            "#7e7e7e",
            "#E66DFF",
            "#0099ff",
            "#00ac39"
        ]
    },
    {
        "id": "scaefy-ysgrifennwr",
        "name": "Ysgrifennwr",
        "primary": "#0066cc",
        "keyword": "#777777",
        "func": "#AA3731",
        "string": "#448C27",
        "comment": "#AAAAAA",
        "accents": [
            "#0066cc",
            "#777777",
            "#AA3731",
            "#448C27"
        ]
    }
]);

  return `
  <script id="translucid-openwork-master-script">
    (function() {
      'use strict';

      const THEMES_LIST = ` + THEMES_JSON + `;
      const EFFECTS_LIST = [
        { id: 'walking-lava', name: 'Plasma Lava (Orbs)', icon: '🌋', desc: '2 massas fluidas de plasma com gradientes reais caminhando suavemente pela tela' },
        { id: 'deep-horizon', name: 'Deep Horizon Radiant', icon: '🌅', desc: 'Nébula profunda na base amplificada com feixes de luz e raios irradiando para cima' },
        { id: 'celestial-radiance', name: 'Celestial Radiance', icon: '✨', desc: 'Fonte de luz no canto superior direito irradiando raios elegantes pela tela' },
        { id: 'cyber-pulse', name: 'Cyber Neon Pulse', icon: '⚡', desc: 'Feixes perimetrais de laser e pulso neon com vibração eletromagnética' },
        { id: 'aurora-waves', name: 'Aurora Liquid Waves', icon: '🌊', desc: 'Ondas ondulantes orgânicas estilo Aurora Boreal no topo e laterais' },
        { id: 'pure-glass', name: 'Pure Crystal Glass', icon: '💎', desc: 'Vidro cristal 100% puro e translúcido sem efeitos de luz adicionais' }
      ];

      const QUICK_PALETTES = [
        { name: 'Cyan & Emerald', p: '#5DE4c7', s: '#10b981', a: '#00CED1' },
        { name: 'Cyber Neon', p: '#00f0ff', s: '#ff007f', a: '#ffe600' },
        { name: 'Purple Dream', p: '#a855f7', s: '#ec4899', a: '#8b5cf6' },
        { name: 'Solar Flare', p: '#f59e0b', s: '#ef4444', a: '#fbbf24' },
        { name: 'Electric Blue', p: '#3b82f6', s: '#8b5cf6', a: '#60a5fa' },
        { name: 'Crimson Orange', p: '#f43f5e', s: '#fb923c', a: '#fda4af' }
      ];

      const KEY_THEME = 'openwork-translucid-theme-id';
      const KEY_EFFECT = 'openwork-translucid-effect-id';
      const KEY_SPEED = 'openwork-translucid-speed';
      const KEY_INTENSITY = 'openwork-translucid-intensity';
      const KEY_CUSTOM_MODE = 'openwork-translucid-custom-mode';
      const KEY_CUSTOM_P = 'openwork-translucid-custom-p';
      const KEY_CUSTOM_S = 'openwork-translucid-custom-s';
      const KEY_CUSTOM_A = 'openwork-translucid-custom-a';

      let activeThemeId = localStorage.getItem(KEY_THEME) || 'poimandres';
      let activeEffectId = localStorage.getItem(KEY_EFFECT) || 'walking-lava';
      let activeSpeed = localStorage.getItem(KEY_SPEED) || 'medium';
      let activeIntensity = parseFloat(localStorage.getItem(KEY_INTENSITY) || '0.75');
      let isCustomMode = localStorage.getItem(KEY_CUSTOM_MODE) === 'true';
      let customPrimary = localStorage.getItem(KEY_CUSTOM_P) || '#5DE4c7';
      let customSecondary = localStorage.getItem(KEY_CUSTOM_S) || '#10b981';
      let customAccent = localStorage.getItem(KEY_CUSTOM_A) || '#a855f7';

      function getActiveColors() {
        if (isCustomMode) {
          return {
            id: 'custom',
            name: 'Personalizado',
            primary: customPrimary,
            keyword: customSecondary,
            func: customAccent,
            accents: [customPrimary, customSecondary, customAccent]
          };
        }
        return THEMES_LIST.find(function(t) { return t.id === activeThemeId; }) || THEMES_LIST[0];
      }

      function getSpeedSec(spd) {
        if (spd === 'low') return 32;
        if (spd === 'high') return 12;
        if (spd === 'turbo') return 6;
        return 18;
      }

      function getOrCreateVisualLayers() {
        const root = document.documentElement;

        let walkingLayer = document.getElementById('translucid-walking-layer');
        if (!walkingLayer) {
          walkingLayer = document.createElement('div');
          walkingLayer.id = 'translucid-walking-layer';
          walkingLayer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 99998; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;';
          walkingLayer.innerHTML = '<div id="walking-orb-1" class="walking-orb"></div><div id="walking-orb-2" class="walking-orb"></div>';
          root.appendChild(walkingLayer);
        }

        let ambientLayer = document.getElementById('translucid-ambient-glow-layer');
        if (!ambientLayer) {
          ambientLayer = document.createElement('div');
          ambientLayer.id = 'translucid-ambient-glow-layer';
          ambientLayer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 99997; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;';
          root.appendChild(ambientLayer);
        }

        let horizonLayer = document.getElementById('translucid-horizon-layer');
        if (!horizonLayer) {
          horizonLayer = document.createElement('div');
          horizonLayer.id = 'translucid-horizon-layer';
          horizonLayer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 99996; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;';
          horizonLayer.innerHTML = '<div id="horizon-base-glow" class="horizon-base-glow"></div><div id="horizon-radiant-rays" class="horizon-radiant-rays"></div>';
          root.appendChild(horizonLayer);
        }

        let celestialLayer = document.getElementById('translucid-celestial-layer');
        if (!celestialLayer) {
          celestialLayer = document.createElement('div');
          celestialLayer.id = 'translucid-celestial-layer';
          celestialLayer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 99995; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;';
          celestialLayer.innerHTML = '<div id="celestial-source" class="celestial-source"></div><div id="celestial-rays" class="celestial-rays"></div>';
          root.appendChild(celestialLayer);
        }

        let pulseLayer = document.getElementById('translucid-pulse-layer');
        if (!pulseLayer) {
          pulseLayer = document.createElement('div');
          pulseLayer.id = 'translucid-pulse-layer';
          pulseLayer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 99994; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;';
          pulseLayer.innerHTML = '<div id="cyber-pulse-beam-1" class="cyber-beam"></div><div id="cyber-pulse-beam-2" class="cyber-beam"></div>';
          root.appendChild(pulseLayer);
        }

        return {
          walkingLayer: walkingLayer,
          ambientLayer: ambientLayer,
          horizonLayer: horizonLayer,
          celestialLayer: celestialLayer,
          pulseLayer: pulseLayer,
          orb1: document.getElementById('walking-orb-1'),
          orb2: document.getElementById('walking-orb-2'),
          horizonBaseGlow: document.getElementById('horizon-base-glow'),
          horizonRadiantRays: document.getElementById('horizon-radiant-rays'),
          celestialSource: document.getElementById('celestial-source'),
          celestialRays: document.getElementById('celestial-rays'),
          beam1: document.getElementById('cyber-pulse-beam-1'),
          beam2: document.getElementById('cyber-pulse-beam-2')
        };
      }

      function updateVisualLayers() {
        const colors = getActiveColors();
        const durationSec = getSpeedSec(activeSpeed);
        const layers = getOrCreateVisualLayers();

        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = 'transparent';

        layers.walkingLayer.style.display = 'none';
        layers.ambientLayer.style.display = 'none';
        layers.horizonLayer.style.display = 'none';
        layers.celestialLayer.style.display = 'none';
        layers.pulseLayer.style.display = 'none';

        const primaryColor = colors.primary;
        const secondaryColor = colors.keyword || colors.primary;
        const accentColor = colors.func || colors.primary;

        if (activeEffectId === 'walking-lava') {
          layers.walkingLayer.style.display = 'block';
          layers.walkingLayer.style.opacity = '1';

          if (layers.orb1 && layers.orb2) {
            layers.orb1.style.opacity = (activeIntensity * 1.15).toFixed(2);
            layers.orb2.style.opacity = (activeIntensity * 0.95).toFixed(2);
            layers.orb1.style.background = 'radial-gradient(circle, ' + primaryColor + ' 0%, ' + secondaryColor + '99 44%, transparent 72%)';
            layers.orb2.style.background = 'radial-gradient(circle, ' + accentColor + ' 0%, ' + primaryColor + '99 44%, transparent 72%)';
            
            layers.orb1.style.animation = 'none';
            layers.orb2.style.animation = 'none';
            void layers.orb1.offsetWidth;
            void layers.orb2.offsetWidth;

            layers.orb1.style.animation = 'orbWalkOpposite1 ' + durationSec + 's cubic-bezier(0.42, 0, 0.58, 1) infinite alternate';
            layers.orb2.style.animation = 'orbWalkOpposite2 ' + durationSec + 's cubic-bezier(0.42, 0, 0.58, 1) infinite alternate';
          }

        } else if (activeEffectId === 'deep-horizon') {
          layers.horizonLayer.style.display = 'block';
          layers.horizonLayer.style.opacity = '1';

          if (layers.horizonBaseGlow && layers.horizonRadiantRays) {
            layers.horizonBaseGlow.style.opacity = (activeIntensity * 1.35).toFixed(2);
            layers.horizonBaseGlow.style.background = 'radial-gradient(ellipse 140% 75% at 50% 120%, ' + primaryColor + ' 0%, ' + secondaryColor + '99 45%, ' + accentColor + '44 70%, transparent 92%)';
            layers.horizonBaseGlow.style.animation = 'horizonBaseGlowPulse ' + (durationSec * 0.7).toFixed(1) + 's ease-in-out infinite alternate';

            layers.horizonRadiantRays.style.opacity = (activeIntensity * 0.95).toFixed(2);
            layers.horizonRadiantRays.style.background = 'conic-gradient(from 270deg at 50% 100%, transparent 0deg, ' + primaryColor + '55 18deg, transparent 32deg, ' + secondaryColor + '66 45deg, transparent 60deg, ' + accentColor + '44 75deg, transparent 90deg, ' + secondaryColor + '44 105deg, transparent 120deg, ' + primaryColor + '66 135deg, transparent 148deg, ' + accentColor + '44 162deg, transparent 180deg)';
            layers.horizonRadiantRays.style.animation = 'horizonRaysPulse ' + (durationSec * 0.85).toFixed(1) + 's ease-in-out infinite alternate';
          }

        } else if (activeEffectId === 'celestial-radiance') {
          layers.celestialLayer.style.display = 'block';
          layers.celestialLayer.style.opacity = '1';

          if (layers.celestialSource && layers.celestialRays) {
            layers.celestialSource.style.opacity = (activeIntensity * 1.3).toFixed(2);
            layers.celestialSource.style.background = 'radial-gradient(circle at top right, ' + primaryColor + ' 0%, ' + secondaryColor + '99 35%, ' + accentColor + '44 65%, transparent 85%)';
            layers.celestialSource.style.animation = 'celestialSourceGlow ' + (durationSec * 0.6).toFixed(1) + 's ease-in-out infinite alternate';

            layers.celestialRays.style.opacity = (activeIntensity * 0.85).toFixed(2);
            layers.celestialRays.style.background = 'conic-gradient(from 180deg at 100% 0%, transparent 0deg, ' + primaryColor + '44 25deg, transparent 40deg, ' + secondaryColor + '55 60deg, transparent 75deg, ' + accentColor + '33 90deg, transparent 110deg)';
            layers.celestialRays.style.animation = 'celestialRaysPulse ' + (durationSec * 0.8).toFixed(1) + 's ease-in-out infinite alternate';
          }

        } else if (activeEffectId === 'cyber-pulse') {
          layers.pulseLayer.style.display = 'block';
          layers.pulseLayer.style.opacity = '1';

          if (layers.beam1 && layers.beam2) {
            layers.beam1.style.background = 'linear-gradient(90deg, transparent, ' + primaryColor + ', transparent)';
            layers.beam1.style.boxShadow = '0 0 35px ' + primaryColor;
            layers.beam1.style.opacity = activeIntensity.toFixed(2);
            layers.beam1.style.animation = 'cyberPulseTop ' + (durationSec * 0.4).toFixed(1) + 's ease-in-out infinite alternate';

            layers.beam2.style.background = 'linear-gradient(180deg, transparent, ' + secondaryColor + ', transparent)';
            layers.beam2.style.boxShadow = '0 0 35px ' + secondaryColor;
            layers.beam2.style.opacity = (activeIntensity * 0.9).toFixed(2);
            layers.beam2.style.animation = 'cyberPulseRight ' + (durationSec * 0.5).toFixed(1) + 's ease-in-out infinite alternate';
          }

        } else if (activeEffectId === 'aurora-waves') {
          layers.ambientLayer.style.display = 'block';
          layers.ambientLayer.style.opacity = '1';
          layers.ambientLayer.style.background = 'radial-gradient(ellipse 110% 65% at 50% -10%, ' + primaryColor + ' 0%, ' + secondaryColor + '77 40%, ' + accentColor + '33 70%, transparent 90%)';
          layers.ambientLayer.style.animation = 'auroraWaveMovement ' + (durationSec * 0.75).toFixed(1) + 's ease-in-out infinite alternate';

        } else if (activeEffectId === 'pure-glass') {
          // Clean pure glass
        }

        let styleEl = document.getElementById('openwork-dynamic-overrides');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'openwork-dynamic-overrides';
          document.documentElement.appendChild(styleEl);
        }

        styleEl.innerHTML = [
          '.walking-orb { position: absolute; border-radius: 50%; filter: blur(85px); -webkit-filter: blur(85px); will-change: transform; pointer-events: none; }',
          '#walking-orb-1 { width: 720px; height: 720px; top: -80px; left: -80px; }',
          '#walking-orb-2 { width: 760px; height: 760px; bottom: -100px; right: -100px; }',
          '.cyber-beam { position: absolute; pointer-events: none; border-radius: 999px; }',
          '#cyber-pulse-beam-1 { top: 0; left: 0; right: 0; height: 4px; }',
          '#cyber-pulse-beam-2 { top: 0; bottom: 0; right: 0; width: 4px; }',
          '.horizon-base-glow { position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%); width: 100vw; height: 480px; filter: blur(65px); -webkit-filter: blur(65px); pointer-events: none; will-change: transform, opacity; }',
          '.horizon-radiant-rays { position: absolute; bottom: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; filter: blur(40px); -webkit-filter: blur(40px); will-change: opacity, transform; }',
          '.celestial-source { position: absolute; top: -70px; right: -70px; width: 720px; height: 720px; border-radius: 50%; filter: blur(75px); -webkit-filter: blur(75px); pointer-events: none; will-change: opacity, transform; }',
          '.celestial-rays { position: absolute; top: 0; right: 0; width: 100vw; height: 100vh; pointer-events: none; filter: blur(40px); -webkit-filter: blur(40px); will-change: opacity; }',
          '@keyframes horizonBaseGlowPulse { 0% { transform: translateX(-50%) scaleY(0.95); opacity: ' + (activeIntensity * 1.0).toFixed(2) + '; } 50% { transform: translateX(-50%) scaleY(1.30); opacity: ' + (activeIntensity * 1.45).toFixed(2) + '; } 100% { transform: translateX(-50%) scaleY(0.95); opacity: ' + (activeIntensity * 1.0).toFixed(2) + '; } }',
          '@keyframes horizonRaysPulse { 0% { opacity: ' + (activeIntensity * 0.70).toFixed(2) + '; transform: scaleY(0.95); } 50% { opacity: ' + (activeIntensity * 1.25).toFixed(2) + '; transform: scaleY(1.18); } 100% { opacity: ' + (activeIntensity * 0.70).toFixed(2) + '; transform: scaleY(0.95); } }',
          '@keyframes celestialSourceGlow { 0% { transform: scale(0.95); opacity: ' + (activeIntensity * 0.9).toFixed(2) + '; } 50% { transform: scale(1.08); opacity: ' + (activeIntensity * 1.35).toFixed(2) + '; } 100% { transform: scale(0.95); opacity: ' + (activeIntensity * 0.9).toFixed(2) + '; } }',
          '@keyframes celestialRaysPulse { 0% { opacity: ' + (activeIntensity * 0.65).toFixed(2) + '; transform: rotate(0deg); } 50% { opacity: ' + (activeIntensity * 1.1).toFixed(2) + '; transform: rotate(3deg); } 100% { opacity: ' + (activeIntensity * 0.65).toFixed(2) + '; transform: rotate(0deg); } }',
          '@keyframes orbWalkOpposite1 { 0% { transform: translate3d(0px, 0px, 0) scale(1); } 25% { transform: translate3d(440px, 160px, 0) scale(1.22); } 50% { transform: translate3d(820px, -20px, 0) scale(0.92); } 75% { transform: translate3d(320px, 280px, 0) scale(1.20); } 100% { transform: translate3d(640px, 80px, 0) scale(1.06); } }',
          '@keyframes orbWalkOpposite2 { 0% { transform: translate3d(0px, 0px, 0) scale(1); } 25% { transform: translate3d(-460px, -170px, 0) scale(1.22); } 50% { transform: translate3d(-860px, 40px, 0) scale(0.90); } 75% { transform: translate3d(-340px, -300px, 0) scale(1.26); } 100% { transform: translate3d(-660px, -90px, 0) scale(1.03); } }',
          '@keyframes cyberPulseTop { 0% { transform: translateX(-60%); opacity: 0.2; } 50% { opacity: 1; } 100% { transform: translateX(60%); opacity: 0.2; } }',
          '@keyframes cyberPulseRight { 0% { transform: translateY(-60%); opacity: 0.2; } 50% { opacity: 1; } 100% { transform: translateY(60%); opacity: 0.2; } }',
          '@keyframes auroraWaveMovement { 0% { transform: scaleY(1) translateY(0); filter: hue-rotate(-15deg); } 50% { transform: scaleY(1.3) translateY(20px); filter: hue-rotate(15deg); } 100% { transform: scaleY(1) translateY(0); filter: hue-rotate(-15deg); } }',
          ':root, [data-theme], [data-color-scheme] {',
          '  --primary: ' + colors.primary + ' !important;',
          '  --accent: ' + colors.primary + ' !important;',
          '  --dls-accent: ' + colors.primary + ' !important;',
          '  --ring: ' + colors.primary + ' !important;',
          '}',
          '.text-background, [class*="text-background"], [data-slot="button"][class*="bg-foreground"], button[class*="bg-foreground"], button[class*="bg-primary"], .bg-foreground.text-background, .bg-primary.text-primary-foreground { color: #0b0f17 !important; font-weight: 600 !important; }',
          '.text-background *, [class*="text-background"] *, [data-slot="button"][class*="bg-foreground"] *, button[class*="bg-foreground"] *, button[class*="bg-primary"] *, .bg-foreground.text-background *, .bg-primary.text-primary-foreground * { color: #0b0f17 !important; }',
                    '[data-sidebar="menu-button"], [data-sidebar="menu-button"] *, [data-slot="sidebar"] a, [data-slot="sidebar"] a *, [data-slot="sidebar"] button, [data-slot="sidebar"] button *, aside a, aside a *, aside button, aside button *, nav a, nav a *, nav button, nav button * { color: #e2e8f0 !important; }',
          '[data-sidebar="menu-button"]:hover, [data-sidebar="menu-button"]:hover *, aside a:hover, aside a:hover *, aside button:hover, aside button:hover * { color: #ffffff !important; }',
          '[data-sidebar] svg, [data-slot="sidebar"] svg, aside svg, nav svg { color: #cbd5e1 !important; opacity: 0.95 !important; }',
          '#openwork-theme-btn, #openwork-dashboard-btn { color: ' + colors.primary + ' !important; }'
        ].join(String.fromCharCode(10));
      }

      function applyTheme(themeId) {
        isCustomMode = false;
        activeThemeId = themeId;
        localStorage.setItem(KEY_CUSTOM_MODE, 'false');
        localStorage.setItem(KEY_THEME, themeId);
        updateVisualLayers();
        updateModalUI();
      }

      function applyCustomColors(p, s, a) {
        isCustomMode = true;
        if (p) customPrimary = p;
        if (s) customSecondary = s;
        if (a) customAccent = a;
        localStorage.setItem(KEY_CUSTOM_MODE, 'true');
        localStorage.setItem(KEY_CUSTOM_P, customPrimary);
        localStorage.setItem(KEY_CUSTOM_S, customSecondary);
        localStorage.setItem(KEY_CUSTOM_A, customAccent);
        updateVisualLayers();
        updateModalUI();
      }

      function applyEffect(effId) {
        activeEffectId = effId;
        localStorage.setItem(KEY_EFFECT, effId);
        updateVisualLayers();
        updateModalUI();
      }

      function applySpeed(spd) {
        activeSpeed = spd;
        localStorage.setItem(KEY_SPEED, spd);
        updateVisualLayers();
        updateModalUI();
      }

      function applyIntensity(val) {
        activeIntensity = parseFloat(val);
        localStorage.setItem(KEY_INTENSITY, activeIntensity.toString());
        updateVisualLayers();
        updateModalUI();
      }

      function updateModalUI() {
        const modal = document.getElementById('openwork-theme-modal');
        if (!modal) return;

        const colors = getActiveColors();

        const tabPresets = modal.querySelector('#ow-tab-presets');
        const tabCustom = modal.querySelector('#ow-tab-custom');
        const viewPresets = modal.querySelector('#ow-view-presets');
        const viewCustom = modal.querySelector('#ow-view-custom');

        if (tabPresets && tabCustom && viewPresets && viewCustom) {
          if (isCustomMode) {
            tabPresets.style.background = 'transparent';
            tabPresets.style.color = '#94a3b8';
            tabCustom.style.background = 'rgba(255, 255, 255, 0.12)';
            tabCustom.style.color = '#ffffff';
            viewPresets.style.display = 'none';
            viewCustom.style.display = 'flex';
          } else {
            tabPresets.style.background = 'rgba(255, 255, 255, 0.12)';
            tabPresets.style.color = '#ffffff';
            tabCustom.style.background = 'transparent';
            tabCustom.style.color = '#94a3b8';
            viewPresets.style.display = 'flex';
            viewCustom.style.display = 'none';
          }
        }

        modal.querySelectorAll('.app-theme-card').forEach(function(card) {
          const isCur = !isCustomMode && card.dataset.themeId === activeThemeId;
          card.style.borderColor = isCur ? colors.primary : 'rgba(255, 255, 255, 0.08)';
          card.style.background = isCur ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.04)';
          const check = card.querySelector('.theme-check-icon');
          if (check) check.style.display = isCur ? 'block' : 'none';
        });

        modal.querySelectorAll('.app-effect-pill').forEach(function(pill) {
          const isCurEff = pill.dataset.effectId === activeEffectId;
          pill.style.borderColor = isCurEff ? colors.primary : 'rgba(255, 255, 255, 0.08)';
          pill.style.background = isCurEff ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)';
          pill.style.color = isCurEff ? '#ffffff' : '#94a3b8';
        });

        modal.querySelectorAll('.app-speed-btn').forEach(function(btn) {
          const isCurSpd = btn.dataset.speed === activeSpeed;
          btn.style.borderColor = isCurSpd ? colors.primary : 'rgba(255, 255, 255, 0.08)';
          btn.style.background = isCurSpd ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)';
          btn.style.color = isCurSpd ? '#ffffff' : '#94a3b8';
        });

        const intensityVal = modal.querySelector('#intensity-val-label');
        if (intensityVal) intensityVal.textContent = Math.round(activeIntensity * 100) + '%';
      }

      function openThemeModal() {
        let modal = document.getElementById('openwork-theme-modal');
        if (modal) {
          modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
          if (modal.style.display === 'flex') updateModalUI();
          return;
        }

        modal = document.createElement('div');
        modal.id = 'openwork-theme-modal';
        modal.style.cssText = 'position: fixed; top: 46px; left: 16px; width: 420px; max-height: 85vh; background: rgba(13, 17, 24, 0.96); backdrop-filter: blur(45px); -webkit-backdrop-filter: blur(45px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; box-shadow: 0 30px 90px rgba(0, 0, 0, 0.85); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #e6edf3; animation: themeModalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);';

        let h = '';
        h += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02);">';
        h += '  <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px;"><span style="font-size: 16px;">⚡</span><span>Controle de Efeitos & Temas (OpenWork)</span></div>';
        h += '  <button id="close-ow-modal-btn" style="background: transparent; border: none; color: #9198a1; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>';
        h += '</div>';

        h += '<div style="overflow-y: auto; max-height: calc(85vh - 60px); display: flex; flex-direction: column;">';
        
        h += '  <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.2);">';
        h += '    <div style="font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;"><span>Efeito de Energia em Tempo Real</span></div>';
        h += '    <div id="ow-effects-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;"></div>';
        h += '  </div>';

        h += '  <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 10px;">';
        h += '    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;"><span style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Brilho / Glow:</span><div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end;"><input id="ow-glow-slider" type="range" min="0.20" max="0.95" step="0.05" value="' + activeIntensity + '" style="width: 130px; cursor: pointer;"><span id="intensity-val-label" style="font-size: 11px; font-weight: 600; min-width: 32px; text-align: right; color: var(--primary);">' + Math.round(activeIntensity * 100) + '%</span></div></div>';
        h += '    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;"><span style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Velocidade:</span><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;"><button class="app-speed-btn" data-speed="low" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">🐢 Calmo</button><button class="app-speed-btn" data-speed="medium" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">⚡ Fluido</button><button class="app-speed-btn" data-speed="high" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">🚀 Rápido</button><button class="app-speed-btn" data-speed="turbo" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">⚡⚡ Turbo</button></div></div>';
        h += '  </div>';

        h += '  <div style="padding: 8px 16px; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; gap: 6px;"><button id="ow-tab-presets" style="flex: 1; padding: 6px 10px; border-radius: 6px; border: none; font-size: 11.5px; font-weight: 600; cursor: pointer;">🎨 Paletas Presets</button><button id="ow-tab-custom" style="flex: 1; padding: 6px 10px; border-radius: 6px; border: none; font-size: 11.5px; font-weight: 600; cursor: pointer;">✨ Cores Custom</button></div>';

        h += '  <div id="ow-view-presets" style="display: flex; flex-direction: column;"><div id="ow-theme-cards" style="padding: 10px 16px; overflow-y: auto; max-height: 240px; display: flex; flex-direction: column; gap: 6px;"></div></div>';

        h += '  <div id="ow-view-custom" style="display: none; flex-direction: column; padding: 12px 16px 16px 16px; gap: 12px;">';
        h += '    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">';
        h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Luz Principal</span><input id="ow-cp-p" type="color" value="' + customPrimary + '" style="width: 100%; height: 28px; border: none; cursor: pointer; background: transparent;"></div>';
        h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Luz Secundária</span><input id="ow-cp-s" type="color" value="' + customSecondary + '" style="width: 100%; height: 28px; border: none; cursor: pointer; background: transparent;"></div>';
        h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Destaque</span><input id="ow-cp-a" type="color" value="' + customAccent + '" style="width: 100%; height: 28px; border: none; cursor: pointer; background: transparent;"></div>';
        h += '    </div>';
        h += '    <div style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 10.5px; font-weight: 600; color: #94a3b8;">Paletas Rápidas:</span><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">';
        h += QUICK_PALETTES.map(function(qp) { return '<button class="quick-palette-chip" data-p="' + qp.p + '" data-s="' + qp.s + '" data-a="' + qp.a + '" style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); cursor: pointer; font-size: 10px; color: #e2e8f0;"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:' + qp.p + ';"></span><span>' + qp.name + '</span></button>'; }).join('');
        h += '    </div></div>';
        h += '  </div>';
        h += '</div>';

        modal.innerHTML = h;
        document.documentElement.appendChild(modal);

        const effectsContainer = modal.querySelector('#ow-effects-container');
        EFFECTS_LIST.forEach(function(eff) {
          const pill = document.createElement('button');
          pill.className = 'app-effect-pill';
          pill.dataset.effectId = eff.id;
          pill.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; cursor: pointer; text-align: left; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);';
          pill.title = eff.desc;
          pill.innerHTML = '<span>' + eff.icon + '</span><span>' + eff.name + '</span>';
          pill.addEventListener('click', function() { applyEffect(eff.id); });
          effectsContainer.appendChild(pill);
        });

        modal.querySelectorAll('.app-speed-btn').forEach(function(btn) {
          btn.addEventListener('click', function() { applySpeed(btn.dataset.speed); });
        });

        const slider = modal.querySelector('#ow-glow-slider');
        slider.addEventListener('input', function(e) { applyIntensity(e.target.value); });

        const tabPresets = modal.querySelector('#ow-tab-presets');
        const tabCustom = modal.querySelector('#ow-tab-custom');
        tabPresets.addEventListener('click', function() { isCustomMode = false; applyTheme(activeThemeId); });
        tabCustom.addEventListener('click', function() { isCustomMode = true; applyCustomColors(null, null, null); });

        const cpP = modal.querySelector('#ow-cp-p');
        const cpS = modal.querySelector('#ow-cp-s');
        const cpA = modal.querySelector('#ow-cp-a');
        function onColorChange() { applyCustomColors(cpP.value, cpS.value, cpA.value); }
        cpP.addEventListener('input', onColorChange);
        cpS.addEventListener('input', onColorChange);
        cpA.addEventListener('input', onColorChange);

        modal.querySelectorAll('.quick-palette-chip').forEach(function(chip) {
          chip.addEventListener('click', function() {
            cpP.value = chip.dataset.p;
            cpS.value = chip.dataset.s;
            cpA.value = chip.dataset.a;
            onColorChange();
          });
        });

        const themeCardsContainer = modal.querySelector('#ow-theme-cards');
        THEMES_LIST.forEach(function(theme) {
          const card = document.createElement('div');
          card.className = 'app-theme-card';
          card.dataset.themeId = theme.id;
          card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);';
          const swatches = (theme.accents || [theme.primary, theme.keyword]).map(function(c) {
            return '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + c + ';"></span>';
          }).join(' ');
          card.innerHTML = '<div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; font-weight: 500; color: #f1f5f9;">' + theme.name + '</span><div style="display: flex; gap: 4px;">' + swatches + '</div></div><svg class="theme-check-icon" style="display: none; color: ' + theme.primary + '; width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          card.addEventListener('click', function() { applyTheme(theme.id); });
          themeCardsContainer.appendChild(card);
        });

        modal.querySelector('#close-ow-modal-btn').addEventListener('click', function() { modal.style.display = 'none'; });
        document.addEventListener('click', function(e) {
          if (modal.style.display !== 'none' && !modal.contains(e.target) && !e.target.closest('#openwork-theme-btn')) {
            modal.style.display = 'none';
          }
        });
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && modal.style.display !== 'none') { modal.style.display = 'none'; }
        });
        updateModalUI();
      }

      window.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
          e.preventDefault(); e.stopPropagation(); openThemeModal();
        }
      });

      function mountButtons() {
        const topHeader = document.querySelector('header [class*="actions"]') ||
                          document.querySelector('header') ||
                          document.querySelector('nav') ||
                          document.querySelector('[data-slot="titlebar-actions"]') ||
                          document.getElementById('opencode-titlebar-right');

        if (topHeader) {
          let group = document.getElementById('openwork-btn-group');
          if (!group) {
            group = document.createElement('div');
            group.id = 'openwork-btn-group';
            group.style.cssText = 'display: inline-flex !important; align-items: center !important; gap: 4px !important; margin-left: 6px !important; margin-right: 6px !important; -webkit-app-region: no-drag !important; z-index: 99999 !important;';
            topHeader.insertBefore(group, topHeader.firstChild);
          }

          if (!document.getElementById('openwork-dashboard-btn')) {
            const dashBtn = document.createElement('button');
            dashBtn.id = 'openwork-dashboard-btn';
            dashBtn.type = 'button';
            dashBtn.title = 'Abrir Control Center (http://localhost:3030/)';
            dashBtn.className = 'ow-native-titlebar-btn';
            dashBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5"></rect></svg><span>Dashboard</span>';
            dashBtn.addEventListener('click', function(e) {
              e.stopPropagation(); e.preventDefault();
              window.open('http://localhost:3030/', '_blank');
            });
            group.appendChild(dashBtn);
          }

          if (!document.getElementById('openwork-theme-btn')) {
            const themeBtn = document.createElement('button');
            themeBtn.id = 'openwork-theme-btn';
            themeBtn.type = 'button';
            themeBtn.title = 'Personalizar Efeitos & Cores (Cmd+Shift+T)';
            themeBtn.className = 'ow-native-titlebar-btn';
            themeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg><span>Efeitos</span>';
            themeBtn.addEventListener('click', function(e) {
              e.stopPropagation(); e.preventDefault();
              openThemeModal();
            });
            group.appendChild(themeBtn);
          }
        }
      }

      updateVisualLayers();
      setInterval(function() {
        getOrCreateVisualLayers();
        mountButtons();
      }, 1000);

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          getOrCreateVisualLayers();
          mountButtons();
        });
      } else {
        getOrCreateVisualLayers();
        mountButtons();
      }
    })();
  </script>
  `;
}

function patchHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/<style id="translucid-openwork-glass">[\s\S]*?<\/style>/g, "");
  html = html.replace(/<style id="openwork-dynamic-overrides">[\s\S]*?<\/style>/g, "");
  html = html.replace(/<script id="ow-dashboard-script">[\s\S]*?<\/script>/g, "");
  html = html.replace(/<script id="translucid-theme-picker-script">[\s\S]*?<\/script>/g, "");
  html = html.replace(/<script id="translucid-openwork-master-script">[\s\S]*?<\/script>/g, "");

  html = html.replace(/<html([^>]*)>/i, '<html$1 class="dark openwork-electron openwork-platform-mac" data-theme="dark" style="background-color: transparent !important; background: transparent !important; color-scheme: dark !important;">');
  html = html.replace(/<body([^>]*)>/i, '<body$1 class="dark bg-transparent text-white" data-theme="dark" style="background: transparent !important; background-color: transparent !important; color-scheme: dark !important;">');

  html = html.replace("</head>", customGlassStyle + "\n</head>");
  const masterScript = generateOpenWorkEngineScript();
  html = html.replace("</body>", masterScript + "\n</body>");

  fs.writeFileSync(filePath, html, "utf8");
  console.log("✅ HTML Super Premium Glass + Multi-Effects injetado:", filePath);
}

function patchMainJs(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

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

  fs.writeFileSync(filePath, code, "utf8");

  try {
    execSync(`node --check "${filePath}"`);
    console.log("✅ JavaScript Main process validado:", filePath);
  } catch (err) {
    console.error("❌ Erro de sintaxe:", err.message);
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
      if (entry.name === "index.html") patchHtml(fullPath);
      else if (entry.name === "main.mjs" || entry.name === "main.js") patchMainJs(fullPath);
    }
  }
}

findAndPatch(targetDir);
console.log("🎉 [OpenWork Engine] Super Premium Glass + Multi-Effects concluído!");
