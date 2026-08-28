const fs = require('fs');
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
    return '<script id="translucid-theme-picker-script">\n' + code + '\n</script>';
  }
};
