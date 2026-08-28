const fs = require('fs');
const path = require('path');

const clientJs = `(function() {
  const THEMES_LIST = __THEMES_PLACEHOLDER__;
  const EFFECTS_LIST = [
    { id: "walking-lava", name: "Plasma Lava (Orbs)", icon: "🌋", desc: "2 massas de energia com gradientes puros caminhando suavemente pela tela" },
    { id: "cyber-pulse", name: "Cyber Neon Pulse", icon: "⚡", desc: "Feixes perimetrais de laser e pulso neon com vibração eletromagnética" },
    { id: "glass-parallax", name: "Glass Parallax 3D", icon: "🪞", desc: "Feixe de refração de cristal reativo à posição do cursor do mouse" },
    { id: "aurora-waves", name: "Aurora Liquid Waves", icon: "🌊", desc: "Ondas ondulantes orgânicas estilo Aurora Boreal no topo e laterais" },
    { id: "deep-horizon", name: "Deep Horizon Nebula", icon: "🌅", desc: "Nébula atmosférica profunda irradiando da base com pulso suave" },
    { id: "plasma-vortex", name: "Cosmic Vortex", icon: "🌌", desc: "Vórtice giratório de plasma galáctico com brilho central" },
    { id: "pure-glass", name: "Pure Crystal Glass", icon: "💎", desc: "Vidro cristal 100% puro e translúcido sem luzes ou efeitos dinâmicos" }
  ];

  const QUICK_PALETTES = [
    { name: "Cyan Cyber", p: "#00f0ff", s: "#ff007f", a: "#ffe600" },
    { name: "Neon Emerald", p: "#10b981", s: "#06b6d4", a: "#34d399" },
    { name: "Purple Dream", p: "#a855f7", s: "#ec4899", a: "#8b5cf6" },
    { name: "Solar Flare", p: "#f59e0b", s: "#ef4444", a: "#fbbf24" },
    { name: "Electric Blue", p: "#3b82f6", s: "#8b5cf6", a: "#60a5fa" },
    { name: "Crimson Blood", p: "#f43f5e", s: "#fb923c", a: "#fda4af" }
  ];

  const appPrefix = "__APP_PREFIX__";
  const isWork = appPrefix === "openwork";
  const storageThemeKey = appPrefix + "-translucid-theme-id";
  const storageEffectKey = appPrefix + "-translucid-effect-id";
  const storageSpeedKey = appPrefix + "-translucid-speed";
  const storageIntensityKey = appPrefix + "-translucid-intensity";
  const storageCustomPrimary = appPrefix + "-translucid-custom-primary";
  const storageCustomSecondary = appPrefix + "-translucid-custom-secondary";
  const storageCustomAccent = appPrefix + "-translucid-custom-accent";
  const storageCustomMode = appPrefix + "-translucid-custom-mode";

  const btnId = appPrefix + "-theme-btn";
  const btnClass = isWork ? "ow-native-titlebar-btn" : "oc-native-titlebar-btn";
  const dashBtnId = isWork ? "openwork-dashboard-btn" : "opencode-dashboard-btn";

  let activeThemeId = localStorage.getItem(storageThemeKey) || (isWork ? "ayu-dark" : "poimandres");
  let activeEffectId = localStorage.getItem(storageEffectKey) || "walking-lava";
  let activeSpeed = localStorage.getItem(storageSpeedKey) || "medium";
  let activeIntensity = parseFloat(localStorage.getItem(storageIntensityKey) || "0.45");
  let isCustomMode = localStorage.getItem(storageCustomMode) === "true";
  let customPrimary = localStorage.getItem(storageCustomPrimary) || "#5DE4c7";
  let customSecondary = localStorage.getItem(storageCustomSecondary) || "#f087bd";
  let customAccent = localStorage.getItem(storageCustomAccent) || "#00CED1";

  let mouseX = 0.5, mouseY = 0.5, targetMouseX = 0.5, targetMouseY = 0.5;
  let parallaxRunning = false, parallaxRafId = null;

  function getActiveColors() {
    if (isCustomMode) {
      return {
        id: "custom",
        name: "Personalizado",
        primary: customPrimary,
        keyword: customSecondary,
        func: customAccent,
        string: customSecondary,
        comment: "#64748b",
        accents: [customPrimary, customSecondary, customAccent]
      };
    }
    const found = THEMES_LIST.find(t => t.id === activeThemeId);
    return found || THEMES_LIST[0] || {
      id: "poimandres",
      name: "Poimandres",
      primary: "#5DE4c7",
      keyword: "#f087bd",
      func: "#00CED1",
      string: "#fffac2",
      comment: "#767c9d",
      accents: ["#5DE4c7", "#00CED1", "#f087bd", "#fffac2"]
    };
  }

  function getSpeedSec(speed) {
    if (speed === "low") return 34;
    if (speed === "high") return 12;
    if (speed === "turbo") return 6;
    return 20;
  }

  function getOrCreateVisualLayers() {
    const root = document.documentElement;

    let walkingLayer = document.getElementById("translucid-walking-layer");
    if (!walkingLayer) {
      walkingLayer = document.createElement("div");
      walkingLayer.id = "translucid-walking-layer";
      walkingLayer.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 99998; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;";
      walkingLayer.innerHTML = '<div id="walking-orb-1" class="walking-orb"></div><div id="walking-orb-2" class="walking-orb"></div>';
      root.appendChild(walkingLayer);
    }

    let ambientLayer = document.getElementById("translucid-ambient-glow-layer");
    if (!ambientLayer) {
      ambientLayer = document.createElement("div");
      ambientLayer.id = "translucid-ambient-glow-layer";
      ambientLayer.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 99997; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;";
      root.appendChild(ambientLayer);
    }

    let pulseLayer = document.getElementById("translucid-pulse-layer");
    if (!pulseLayer) {
      pulseLayer = document.createElement("div");
      pulseLayer.id = "translucid-pulse-layer";
      pulseLayer.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 99996; overflow: hidden; mix-blend-mode: screen; transition: opacity 0.3s ease;";
      pulseLayer.innerHTML = '<div id="cyber-pulse-beam-1" class="cyber-beam"></div><div id="cyber-pulse-beam-2" class="cyber-beam"></div>';
      root.appendChild(pulseLayer);
    }

    return {
      walkingLayer,
      ambientLayer,
      pulseLayer,
      orb1: document.getElementById("walking-orb-1"),
      orb2: document.getElementById("walking-orb-2"),
      beam1: document.getElementById("cyber-pulse-beam-1"),
      beam2: document.getElementById("cyber-pulse-beam-2")
    };
  }

  function handleParallaxMouseMove(e) {
    targetMouseX = e.clientX / window.innerWidth;
    targetMouseY = e.clientY / window.innerHeight;
  }

  function startParallaxLoop() {
    if (parallaxRunning) return;
    parallaxRunning = true;
    window.addEventListener("mousemove", handleParallaxMouseMove);

    function loop() {
      if (activeEffectId === "glass-parallax") {
        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;
        const px = (mouseX * 100).toFixed(2);
        const py = (mouseY * 100).toFixed(2);
        const amb = document.getElementById("translucid-ambient-glow-layer");
        const colors = getActiveColors();
        const op = activeIntensity;
        if (amb) {
          amb.style.background = "radial-gradient(circle 620px at " + px + "% " + py + "%, " + colors.primary + " " + (op * 0.7).toFixed(2) + ", " + colors.keyword + " " + (op * 0.25).toFixed(2) + ", transparent 72%)";
        }
        parallaxRafId = requestAnimationFrame(loop);
      } else {
        stopParallaxLoop();
      }
    }
    parallaxRafId = requestAnimationFrame(loop);
  }

  function stopParallaxLoop() {
    parallaxRunning = false;
    window.removeEventListener("mousemove", handleParallaxMouseMove);
    if (parallaxRafId) {
      cancelAnimationFrame(parallaxRafId);
      parallaxRafId = null;
    }
  }

  function applyThemeAndEffect(themeId, effectId, speed, intensity, customOpts) {
    if (customOpts) {
      if (customOpts.isCustom !== undefined) isCustomMode = customOpts.isCustom;
      if (customOpts.primary) customPrimary = customOpts.primary;
      if (customOpts.secondary) customSecondary = customOpts.secondary;
      if (customOpts.accent) customAccent = customOpts.accent;

      localStorage.setItem(storageCustomMode, isCustomMode ? "true" : "false");
      localStorage.setItem(storageCustomPrimary, customPrimary);
      localStorage.setItem(storageCustomSecondary, customSecondary);
      localStorage.setItem(storageCustomAccent, customAccent);
    }

    if (themeId && !customOpts?.isCustom) {
      activeThemeId = themeId;
      isCustomMode = false;
      localStorage.setItem(storageCustomMode, "false");
      localStorage.setItem(storageThemeKey, activeThemeId);
    }

    if (effectId) {
      activeEffectId = effectId;
      localStorage.setItem(storageEffectKey, activeEffectId);
    }

    if (speed) {
      activeSpeed = speed;
      localStorage.setItem(storageSpeedKey, activeSpeed);
    }

    if (intensity !== undefined && intensity !== null) {
      activeIntensity = parseFloat(intensity);
      localStorage.setItem(storageIntensityKey, activeIntensity.toString());
    }

    try {
      localStorage.setItem(appPrefix + "-color-scheme", "dark");
    } catch(e) {}

    const colors = getActiveColors();
    const durationSec = getSpeedSec(activeSpeed);
    const { walkingLayer, ambientLayer, pulseLayer, orb1, orb2, beam1, beam2 } = getOrCreateVisualLayers();

    document.documentElement.dataset.translucidTheme = colors.id;
    document.documentElement.dataset.translucidEffect = activeEffectId;
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");

    walkingLayer.style.display = "none";
    ambientLayer.style.display = "none";
    pulseLayer.style.display = "none";
    ambientLayer.style.background = "none";
    ambientLayer.style.animation = "none";
    ambientLayer.style.backgroundSize = "auto";

    const primaryAlpha = colors.primary;
    const secondaryAlpha = colors.keyword || colors.primary;
    const accentAlpha = colors.func || colors.primary;

    if (activeEffectId === "walking-lava") {
      walkingLayer.style.display = "block";
      walkingLayer.style.opacity = "1";

      if (orb1 && orb2) {
        orb1.style.opacity = (activeIntensity * 1.1).toFixed(2);
        orb2.style.opacity = (activeIntensity * 0.95).toFixed(2);
        orb1.style.background = "radial-gradient(circle, " + primaryAlpha + " 0%, " + secondaryAlpha + "99 42%, transparent 72%)";
        orb2.style.background = "radial-gradient(circle, " + accentAlpha + " 0%, " + primaryAlpha + "99 42%, transparent 72%)";
        
        orb1.style.animation = "none";
        orb2.style.animation = "none";
        void orb1.offsetWidth;
        void orb2.offsetWidth;

        orb1.style.animation = "orbWalkOpposite1 " + durationSec + "s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate";
        orb2.style.animation = "orbWalkOpposite2 " + durationSec + "s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate";
      }
      stopParallaxLoop();

    } else if (activeEffectId === "cyber-pulse") {
      pulseLayer.style.display = "block";
      pulseLayer.style.opacity = "1";

      if (beam1 && beam2) {
        beam1.style.background = "linear-gradient(90deg, transparent, " + primaryAlpha + ", transparent)";
        beam1.style.boxShadow = "0 0 35px " + primaryAlpha;
        beam1.style.opacity = activeIntensity.toFixed(2);
        beam1.style.animation = "cyberPulseTop " + (durationSec * 0.4).toFixed(1) + "s ease-in-out infinite alternate";

        beam2.style.background = "linear-gradient(180deg, transparent, " + secondaryAlpha + ", transparent)";
        beam2.style.boxShadow = "0 0 35px " + secondaryAlpha;
        beam2.style.opacity = (activeIntensity * 0.9).toFixed(2);
        beam2.style.animation = "cyberPulseRight " + (durationSec * 0.5).toFixed(1) + "s ease-in-out infinite alternate";
      }
      stopParallaxLoop();

    } else if (activeEffectId === "glass-parallax") {
      ambientLayer.style.display = "block";
      ambientLayer.style.opacity = "1";
      startParallaxLoop();

    } else if (activeEffectId === "aurora-waves") {
      ambientLayer.style.display = "block";
      ambientLayer.style.opacity = "1";
      ambientLayer.style.background = "radial-gradient(ellipse 110% 65% at 50% -10%, " + primaryAlpha + " 0%, " + secondaryAlpha + "66 40%, " + accentAlpha + "22 70%, transparent 90%)";
      ambientLayer.style.animation = "auroraWaveMovement " + (durationSec * 0.75).toFixed(1) + "s ease-in-out infinite alternate";
      stopParallaxLoop();

    } else if (activeEffectId === "deep-horizon") {
      ambientLayer.style.display = "block";
      ambientLayer.style.opacity = "1";
      ambientLayer.style.background = "radial-gradient(ellipse 120% 60% at 50% 115%, " + primaryAlpha + " 0%, " + secondaryAlpha + "66 45%, transparent 85%)";
      ambientLayer.style.animation = "deepHorizonPulse " + (durationSec * 0.8).toFixed(1) + "s ease-in-out infinite alternate";
      stopParallaxLoop();

    } else if (activeEffectId === "plasma-vortex") {
      ambientLayer.style.display = "block";
      ambientLayer.style.opacity = "1";
      ambientLayer.style.background = "conic-gradient(from 0deg at 50% 50%, " + primaryAlpha + " 0deg, " + secondaryAlpha + " 120deg, " + accentAlpha + " 240deg, " + primaryAlpha + " 360deg)";
      ambientLayer.style.maskImage = "radial-gradient(circle 500px at 50% 50%, rgba(0,0,0," + activeIntensity.toFixed(2) + ") 0%, transparent 70%)";
      ambientLayer.style.webkitMaskImage = "radial-gradient(circle 500px at 50% 50%, rgba(0,0,0," + activeIntensity.toFixed(2) + ") 0%, transparent 70%)";
      ambientLayer.style.animation = "plasmaVortexSpin " + (durationSec * 1.2).toFixed(1) + "s linear infinite";
      stopParallaxLoop();

    } else if (activeEffectId === "pure-glass") {
      stopParallaxLoop();
    }

    let styleEl = document.getElementById("dynamic-theme-overrides");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-theme-overrides";
      document.documentElement.appendChild(styleEl);
    }

    styleEl.innerHTML = [
      ".walking-orb { position: absolute; border-radius: 50%; filter: blur(80px); -webkit-filter: blur(80px); will-change: transform; pointer-events: none; }",
      "#walking-orb-1 { width: 600px; height: 600px; top: -80px; left: -80px; }",
      "#walking-orb-2 { width: 640px; height: 640px; bottom: -100px; right: -100px; }",
      ".cyber-beam { position: absolute; pointer-events: none; border-radius: 999px; }",
      "#cyber-pulse-beam-1 { top: 0; left: 0; right: 0; height: 4px; }",
      "#cyber-pulse-beam-2 { top: 0; bottom: 0; right: 0; width: 4px; }",
      "@keyframes orbWalkOpposite1 { 0% { transform: translate3d(0px, 0px, 0) scale(1); } 25% { transform: translate3d(440px, 160px, 0) scale(1.22); } 50% { transform: translate3d(820px, -20px, 0) scale(0.92); } 75% { transform: translate3d(320px, 280px, 0) scale(1.20); } 100% { transform: translate3d(640px, 80px, 0) scale(1.06); } }",
      "@keyframes orbWalkOpposite2 { 0% { transform: translate3d(0px, 0px, 0) scale(1); } 25% { transform: translate3d(-460px, -170px, 0) scale(1.22); } 50% { transform: translate3d(-860px, 40px, 0) scale(0.90); } 75% { transform: translate3d(-340px, -300px, 0) scale(1.26); } 100% { transform: translate3d(-660px, -90px, 0) scale(1.03); } }",
      "@keyframes cyberPulseTop { 0% { transform: translateX(-60%); opacity: 0.2; } 50% { opacity: 1; } 100% { transform: translateX(60%); opacity: 0.2; } }",
      "@keyframes cyberPulseRight { 0% { transform: translateY(-60%); opacity: 0.2; } 50% { opacity: 1; } 100% { transform: translateY(60%); opacity: 0.2; } }",
      "@keyframes auroraWaveMovement { 0% { transform: scaleY(1) translateY(0); filter: hue-rotate(-15deg); } 50% { transform: scaleY(1.3) translateY(20px); filter: hue-rotate(15deg); } 100% { transform: scaleY(1) translateY(0); filter: hue-rotate(-15deg); } }",
      "@keyframes deepHorizonPulse { 0% { transform: scaleY(1); opacity: " + (activeIntensity * 0.8).toFixed(2) + "; } 50% { transform: scaleY(1.4); opacity: " + (activeIntensity * 1.25).toFixed(2) + "; } 100% { transform: scaleY(1); opacity: " + (activeIntensity * 0.8).toFixed(2) + "; } }",
      "@keyframes plasmaVortexSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }",
      ":root, [data-theme], [data-color-scheme] {",
      "  --primary: " + colors.primary + " !important;",
      "  --accent: " + colors.primary + " !important;",
      "  --dls-accent: " + colors.primary + " !important;",
      "  --ring: " + colors.primary + " !important;",
      "  --theme-accent: " + colors.primary + " !important;",
      "  --primary-foreground: #0b0f17 !important;",
      "  --accent-foreground: #0b0f17 !important;",
      "  --sidebar-primary: " + colors.primary + " !important;",
      "  --sidebar-accent: rgba(255, 255, 255, 0.08) !important;",
      "  --sidebar-ring: " + colors.primary + " !important;",
      "  --v2-text-text-base: #e6edf3 !important;",
      "}",
      "#root, main, [data-slot=\\"app-root\\"], .app-container { background: rgba(10, 14, 20, 0.16) !important; }",
      "button.bg-primary, .btn-primary, [data-variant=\\"primary\\"], [data-state=\\"active\\"][data-slot=\\"tab\\"], .tab.active {",
      "  background-color: " + colors.primary + " !important;",
      "  color: #0d1117 !important;",
      "  font-weight: 600 !important;",
      "}",
      ":focus-visible { outline: 2px solid " + colors.primary + " !important; outline-offset: 1px !important; }",
      ".text-primary, [data-slot=\\"icon\\"].active { color: " + colors.primary + " !important; }",
      "::selection { background: " + colors.primary + "44 !important; color: #ffffff !important; }",
      ".token.keyword, span.hljs-keyword, .cm-keyword { color: " + colors.keyword + " !important; }",
      ".token.function, span.hljs-title.function_, .cm-function { color: " + colors.func + " !important; }",
      ".token.string, span.hljs-string, .cm-string { color: " + (colors.string || colors.keyword) + " !important; }",
      ".token.comment, span.hljs-comment, .cm-comment { color: " + colors.comment + " !important; font-style: italic !important; }",
      ".token.number, .token.constant, span.hljs-number, .cm-number { color: " + colors.primary + " !important; }",
      "#" + btnId + ", #translucid-floating-trigger-badge { color: " + colors.primary + " !important; }"
    ].join("\\n");

    updateModalUI(colors);
  }

  function updateModalUI(colors) {
    const modal = document.getElementById("app-theme-picker-modal");
    if (!modal) return;

    const tabPresets = modal.querySelector("#tab-btn-presets");
    const tabCustom = modal.querySelector("#tab-btn-custom");
    const viewPresets = modal.querySelector("#view-presets");
    const viewCustom = modal.querySelector("#view-custom");

    if (tabPresets && tabCustom && viewPresets && viewCustom) {
      if (isCustomMode) {
        tabPresets.style.background = "transparent";
        tabPresets.style.color = "#94a3b8";
        tabCustom.style.background = "rgba(255, 255, 255, 0.12)";
        tabCustom.style.color = "#ffffff";
        viewPresets.style.display = "none";
        viewCustom.style.display = "flex";
      } else {
        tabPresets.style.background = "rgba(255, 255, 255, 0.12)";
        tabPresets.style.color = "#ffffff";
        tabCustom.style.background = "transparent";
        tabCustom.style.color = "#94a3b8";
        viewPresets.style.display = "flex";
        viewCustom.style.display = "none";
      }
    }

    modal.querySelectorAll(".app-theme-card").forEach(card => {
      const isCur = !isCustomMode && card.dataset.themeId === activeThemeId;
      card.style.borderColor = isCur ? colors.primary : "rgba(255, 255, 255, 0.08)";
      card.style.background = isCur ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.04)";
      const check = card.querySelector(".theme-check-icon");
      if (check) check.style.display = isCur ? "block" : "none";
    });

    modal.querySelectorAll(".app-effect-pill").forEach(pill => {
      const isCurEff = pill.dataset.effectId === activeEffectId;
      pill.style.borderColor = isCurEff ? colors.primary : "rgba(255, 255, 255, 0.08)";
      pill.style.background = isCurEff ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.04)";
      pill.style.color = isCurEff ? "#ffffff" : "#94a3b8";
    });

    modal.querySelectorAll(".app-speed-btn").forEach(btn => {
      const isCurSpd = btn.dataset.speed === activeSpeed;
      btn.style.borderColor = isCurSpd ? colors.primary : "rgba(255, 255, 255, 0.08)";
      btn.style.background = isCurSpd ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.04)";
      btn.style.color = isCurSpd ? "#ffffff" : "#94a3b8";
    });

    const intensityVal = modal.querySelector("#intensity-val-label");
    if (intensityVal) intensityVal.textContent = Math.round(activeIntensity * 100) + "%";

    const inputP = modal.querySelector("#custom-color-primary");
    const inputS = modal.querySelector("#custom-color-secondary");
    const inputA = modal.querySelector("#custom-color-accent");
    if (inputP && inputP.value !== customPrimary) inputP.value = customPrimary;
    if (inputS && inputS.value !== customSecondary) inputS.value = customSecondary;
    if (inputA && inputA.value !== customAccent) inputA.value = customAccent;
  }

  function openThemeModal() {
    let modal = document.getElementById("app-theme-picker-modal");
    if (modal) {
      modal.style.display = modal.style.display === "none" ? "flex" : "none";
      if (modal.style.display === "flex") {
        updateModalUI(getActiveColors());
        const input = modal.querySelector("#theme-search-input");
        if (input && !isCustomMode) input.focus();
      }
      return;
    }

    modal = document.createElement("div");
    modal.id = "app-theme-picker-modal";
    modal.style.cssText = "position: fixed; top: 44px; right: 18px; width: 420px; max-height: 85vh; background: rgba(13, 17, 24, 0.96); backdrop-filter: blur(45px); -webkit-backdrop-filter: blur(45px); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; box-shadow: 0 30px 90px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.3); z-index: 999999; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif; color: #e6edf3; animation: themeModalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);";

    let keyframes = document.getElementById("theme-picker-keyframes");
    if (!keyframes) {
      keyframes = document.createElement("style");
      keyframes.id = "theme-picker-keyframes";
      keyframes.innerHTML = "@keyframes themeModalFadeIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } } .app-theme-card:hover, .app-effect-pill:hover, .app-speed-btn:hover, .quick-palette-chip:hover { background: rgba(255, 255, 255, 0.10) !important; border-color: rgba(255, 255, 255, 0.25) !important; transform: translateY(-1px); }";
      document.documentElement.appendChild(keyframes);
    }

    let h = "";
    h += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02);">';
    h += '  <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px;"><span style="font-size: 16px;">⚡</span><span>Controle de Efeitos & Estética (' + (isWork ? "OpenWork" : "OpenCode") + ')</span></div>';
    h += '  <button id="close-theme-modal-btn" style="background: transparent; border: none; color: #9198a1; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; line-height: 1;">✕</button>';
    h += '</div>';

    h += '<div style="overflow-y: auto; max-height: calc(85vh - 60px); display: flex; flex-direction: column;">';
    
    h += '  <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.2);">';
    h += '    <div style="font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;"><span>Efeito de Energia em Tempo Real</span><span style="color: #64748b; font-size: 9.5px; font-weight: 500;">(Metal 120 FPS)</span></div>';
    h += '    <div id="effects-pills-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;"></div>';
    h += '  </div>';

    h += '  <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 10px;">';
    h += '    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;"><span style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Brilho / Glow:</span><div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end;"><input id="glow-intensity-slider" type="range" min="0.15" max="0.95" step="0.05" value="' + activeIntensity + '" style="width: 130px; cursor: pointer; accent-color: var(--primary);"><span id="intensity-val-label" style="font-size: 11px; font-weight: 600; min-width: 32px; text-align: right; color: var(--primary);">' + Math.round(activeIntensity * 100) + '%</span></div></div>';
    h += '    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;"><span style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Velocidade:</span><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;"><button class="app-speed-btn" data-speed="low" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">🐢 Calmo</button><button class="app-speed-btn" data-speed="medium" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">⚡ Fluido</button><button class="app-speed-btn" data-speed="high" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">🚀 Rápido</button><button class="app-speed-btn" data-speed="turbo" style="padding: 4px 6px; border-radius: 6px; font-size: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8;">⚡⚡ Turbo</button></div></div>';
    h += '  </div>';

    h += '  <div style="padding: 8px 16px; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; gap: 6px;"><button id="tab-btn-presets" style="flex: 1; padding: 6px 10px; border-radius: 6px; border: none; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">🎨 37 Temas Presets</button><button id="tab-btn-custom" style="flex: 1; padding: 6px 10px; border-radius: 6px; border: none; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">✨ Cores Personalizadas</button></div>';

    h += '  <div id="view-presets" style="display: flex; flex-direction: column;"><div style="padding: 10px 16px 6px 16px;"><input id="theme-search-input" type="text" placeholder="Filtrar por nome do tema..." style="width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 7px; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 11.5px; outline: none;"></div><div id="theme-cards-container" style="padding: 6px 16px 14px 16px; overflow-y: auto; max-height: 240px; display: flex; flex-direction: column; gap: 5px;"></div></div>';

    h += '  <div id="view-custom" style="display: none; flex-direction: column; padding: 12px 16px 16px 16px; gap: 12px;">';
    h += '    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">';
    h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Luz Principal</span><input id="custom-color-primary" type="color" value="' + customPrimary + '" style="width: 100%; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: transparent;"></div>';
    h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Luz Secundária</span><input id="custom-color-secondary" type="color" value="' + customSecondary + '" style="width: 100%; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: transparent;"></div>';
    h += '      <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"><span style="font-size: 10px; color: #94a3b8; font-weight: 600;">Destaque / Accent</span><input id="custom-color-accent" type="color" value="' + customAccent + '" style="width: 100%; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: transparent;"></div>';
    h += '    </div>';

    h += '    <div style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 10.5px; font-weight: 600; color: #94a3b8;">Paletas Rápidas Populares:</span><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">';
    h += QUICK_PALETTES.map(qp => '      <button class="quick-palette-chip" data-p="' + qp.p + '" data-s="' + qp.s + '" data-a="' + qp.a + '" style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); cursor: pointer; font-size: 10px; color: #e2e8f0; text-align: left;"><span style="display: flex; gap: 2px;"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:' + qp.p + ';"></span><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:' + qp.s + ';"></span><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:' + qp.a + ';"></span></span><span>' + qp.name + '</span></button>').join("");
    h += '    </div></div>';
    h += '  </div>';
    h += '</div>';

    modal.innerHTML = h;
    document.documentElement.appendChild(modal);

    const effectsContainer = modal.querySelector("#effects-pills-container");
    EFFECTS_LIST.forEach(eff => {
      const pill = document.createElement("button");
      pill.className = "app-effect-pill";
      pill.dataset.effectId = eff.id;
      pill.style.cssText = "display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.14s ease; text-align: left; outline: none; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);";
      pill.title = eff.desc;
      pill.innerHTML = "<span>" + eff.icon + "</span><span style=\"white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">" + eff.name + "</span>";
      pill.addEventListener("click", () => { applyThemeAndEffect(null, eff.id, null, null, null); });
      effectsContainer.appendChild(pill);
    });

    modal.querySelectorAll(".app-speed-btn").forEach(btn => {
      btn.addEventListener("click", () => { applyThemeAndEffect(null, null, btn.dataset.speed, null, null); });
    });

    const slider = modal.querySelector("#glow-intensity-slider");
    slider.addEventListener("input", (e) => { applyThemeAndEffect(null, null, null, parseFloat(e.target.value), null); });

    const tabPresets = modal.querySelector("#tab-btn-presets");
    const tabCustom = modal.querySelector("#tab-btn-custom");
    tabPresets.addEventListener("click", () => {
      isCustomMode = false;
      applyThemeAndEffect(activeThemeId, null, null, null, { isCustom: false });
    });
    tabCustom.addEventListener("click", () => {
      isCustomMode = true;
      applyThemeAndEffect(null, null, null, null, { isCustom: true });
    });

    const cpP = modal.querySelector("#custom-color-primary");
    const cpS = modal.querySelector("#custom-color-secondary");
    const cpA = modal.querySelector("#custom-color-accent");
    function onColorChange() {
      applyThemeAndEffect(null, null, null, null, { isCustom: true, primary: cpP.value, secondary: cpS.value, accent: cpA.value });
    }
    cpP.addEventListener("input", onColorChange);
    cpS.addEventListener("input", onColorChange);
    cpA.addEventListener("input", onColorChange);

    modal.querySelectorAll(".quick-palette-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        cpP.value = chip.dataset.p;
        cpS.value = chip.dataset.s;
        cpA.value = chip.dataset.a;
        onColorChange();
      });
    });

    const container = modal.querySelector("#theme-cards-container");
    function renderList(query) {
      query = query || "";
      container.innerHTML = "";
      const filtered = THEMES_LIST.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase()));
      filtered.forEach(theme => {
        const card = document.createElement("div");
        card.className = "app-theme-card";
        card.dataset.themeId = theme.id;
        card.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; border-radius: 7px; cursor: pointer; transition: all 0.14s ease; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);";
        const swatches = (theme.accents || [theme.primary, theme.keyword, theme.func]).map(c => '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + c + '; box-shadow: 0 0 3px ' + c + '88;"></span>').join("");
        card.innerHTML = '<div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 11.5px; font-weight: 500; color: #f1f5f9;">' + theme.name + '</span><div style="display: flex; gap: 4px; align-items: center;">' + swatches + '</div></div><div style="display: flex; align-items: center;"><svg class="theme-check-icon" style="display: none; color: ' + theme.primary + '; width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
        card.addEventListener("click", () => {
          applyThemeAndEffect(theme.id, null, null, null, { isCustom: false });
        });
        container.appendChild(card);
      });
    }
    renderList();

    const searchInput = modal.querySelector("#theme-search-input");
    searchInput.addEventListener("input", (e) => renderList(e.target.value));

    modal.querySelector("#close-theme-modal-btn").addEventListener("click", () => { modal.style.display = "none"; });
    document.addEventListener("click", function(e) {
      if (modal.style.display !== "none" && !modal.contains(e.target) && !e.target.closest("#" + btnId) && !e.target.closest("#translucid-floating-trigger-badge")) {
        modal.style.display = "none";
      }
    });
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && modal.style.display !== "none") { modal.style.display = "none"; }
    });
    updateModalUI(getActiveColors());
  }

  window.addEventListener("keydown", function(e) {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "T" || e.key === "t")) {
      e.preventDefault(); e.stopPropagation(); openThemeModal();
    }
  });

  function mountButtons() {
    const dashBtn = document.getElementById(dashBtnId) || document.getElementById("opencode-dashboard-btn") || document.getElementById("openwork-dashboard-btn");
    if (!document.getElementById(btnId)) {
      const themeBtn = document.createElement("button");
      themeBtn.id = btnId;
      themeBtn.type = "button";
      themeBtn.title = "Personalizar Efeitos & Cores (" + (isWork ? "OpenWork" : "OpenCode") + ") — Cmd+Shift+T";
      themeBtn.className = btnClass;
      themeBtn.style.cssText = "display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; height: 22px !important; padding: 0 7px !important; margin-right: 4px !important; border-radius: 5px !important; background: rgba(255, 255, 255, 0.08) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; cursor: pointer !important; -webkit-app-region: no-drag !important; z-index: 99999 !important; font-size: 11px !important; color: var(--primary, #5DE4c7) !important;";
      themeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg><span>Efeitos</span>';

      themeBtn.addEventListener("click", function(e) { e.stopPropagation(); e.preventDefault(); openThemeModal(); });
      if (dashBtn && dashBtn.parentNode) {
        dashBtn.parentNode.insertBefore(themeBtn, dashBtn.nextSibling);
      } else {
        const targetContainer = document.getElementById("opencode-titlebar-right") || document.querySelector('[data-slot="titlebar-actions"]') || document.querySelector('[data-slot="titlebar-tabs-scroll"]') || document.querySelector("header") || document.querySelector("nav");
        if (targetContainer) targetContainer.appendChild(themeBtn);
      }
    }

    if (!document.getElementById("translucid-floating-trigger-badge")) {
      const badge = document.createElement("button");
      badge.id = "translucid-floating-trigger-badge";
      badge.type = "button";
      badge.title = "Personalizar Efeitos & Cores (Cmd+Shift+T)";
      badge.style.cssText = "position: fixed; bottom: 12px; right: 14px; z-index: 999999; width: 28px; height: 28px; border-radius: 50%; background: rgba(14, 18, 26, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.18); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--primary, #5DE4c7); box-shadow: 0 4px 16px rgba(0,0,0,0.4); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); outline: none; -webkit-app-region: no-drag !important;";
      badge.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

      badge.addEventListener("mouseenter", () => { badge.style.transform = "scale(1.15)"; badge.style.borderColor = "var(--primary, #5DE4c7)"; });
      badge.addEventListener("mouseleave", () => { badge.style.transform = "scale(1)"; badge.style.borderColor = "rgba(255, 255, 255, 0.18)"; });
      badge.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); openThemeModal(); });
      document.documentElement.appendChild(badge);
    }
  }

  applyThemeAndEffect(activeThemeId, activeEffectId, activeSpeed, activeIntensity, null);
  setInterval(() => { getOrCreateVisualLayers(); mountButtons(); }, 1200);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { getOrCreateVisualLayers(); mountButtons(); });
  } else {
    getOrCreateVisualLayers(); mountButtons();
  }
})();`;

fs.writeFileSync(path.join(__dirname, "theme-picker-client.js"), clientJs, "utf8");
console.log("theme-picker-client.js written successfully!");

const bundleWrapper = `const fs = require('fs');
const path = require('path');

let ALL_THEMES = [];
try {
  ALL_THEMES = JSON.parse(fs.readFileSync('/tmp/all-themes.json', 'utf8'));
} catch (e) {
  ALL_THEMES = [
    { id: 'poimandres', name: 'Poimandres', primary: '#5DE4c7', keyword: '#f087bd', func: '#00CED1', string: '#fffac2', comment: '#767c9d', accents: ['#5DE4c7', '#00CED1', '#f087bd', '#fffac2'] },
    { id: 'ayu-dark', name: 'Ayu Dark', primary: '#E6B450', keyword: '#FF8F40', func: '#39BAE6', string: '#AAD94C', comment: '#626d7a', accents: ['#E6B450', '#FF8F40', '#39BAE6', '#AAD94C'] },
    { id: 'moonlight', name: 'Moonlight', primary: '#af9fff', keyword: '#ff757f', func: '#78dbff', string: '#c3e88d', comment: '#7a88cf', accents: ['#af9fff', '#ff757f', '#78dbff', '#c3e88d'] }
  ];
}

const EFFECTS = [
  { id: 'walking-lava', name: 'Plasma Lava (Orbs)', icon: '🌋', desc: '2 massas de energia com gradientes puros caminhando suavemente pela tela' },
  { id: 'cyber-pulse', name: 'Cyber Neon Pulse', icon: '⚡', desc: 'Feixes perimetrais de laser e pulso neon com vibração eletromagnética' },
  { id: 'glass-parallax', name: 'Glass Parallax 3D', icon: '🪞', desc: 'Feixe de refração de cristal reativo à posição do cursor do mouse' },
  { id: 'aurora-waves', name: 'Aurora Liquid Waves', icon: '🌊', desc: 'Ondas ondulantes orgânicas estilo Aurora Boreal no topo e laterais' },
  { id: 'deep-horizon', name: 'Deep Horizon Nebula', icon: '🌅', desc: 'Nébula atmosférica profunda irradiando da base com pulso suave' },
  { id: 'plasma-vortex', name: 'Cosmic Vortex', icon: '🌌', desc: 'Vórtice giratório de plasma galáctico com brilho central' },
  { id: 'pure-glass', name: 'Pure Crystal Glass', icon: '💎', desc: 'Vidro cristal 100% puro e translúcido sem luzes ou efeitos dinâmicos' }
];

module.exports = {
  THEMES: ALL_THEMES,
  EFFECTS,
  generateScript: function(appType = 'opencode') {
    const clientPath = path.join(__dirname, 'theme-picker-client.js');
    let code = fs.readFileSync(clientPath, 'utf8');
    code = code.replace('__THEMES_PLACEHOLDER__', JSON.stringify(ALL_THEMES));
    code = code.replace('__APP_PREFIX__', appType);
    return '<script id="translucid-theme-picker-script">\\n' + code + '\\n</script>';
  }
};
`;

fs.writeFileSync(path.join(__dirname, "theme-picker-bundle.js"), bundleWrapper, "utf8");
console.log("theme-picker-bundle.js written successfully!");
