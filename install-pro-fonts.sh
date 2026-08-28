#!/usr/bin/env zsh
# ==============================================================================
# 🔤 Install Pro Fonts — Instalador Automático de Fontes para Desenvolvedores
# ==============================================================================

set -e

FONTS_DIR="$HOME/Library/Fonts"
mkdir -p "$FONTS_DIR"

echo "📥 [1/3] Baixando e Instalando Fira Code (com ligaduras de código)..."
cd /tmp
curl -sL "https://github.com/tonsky/FiraCode/releases/download/6.2/Fira_Code_v6.2.zip" -o fira.zip
unzip -o -q fira.zip -d fira
cp fira/ttf/*.ttf "$FONTS_DIR/"

echo "📥 [2/3] Baixando e Instalando JetBrains Mono Nerd Font (com ícones de terminal)..."
curl -sL "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip" -o jb.zip
unzip -o -q jb.zip -d jb
cp jb/*.ttf "$FONTS_DIR/"

echo "📥 [3/3] Baixando e Instalando Monaspace by GitHub Next (Neon, Argon, Krypton)..."
curl -sL "https://github.com/githubnext/monaspace/releases/download/v1.101/monaspace-v1.101.zip" -o monaspace.zip
unzip -o -q monaspace.zip -d monaspace
cp monaspace/monaspace-v1.101/fonts/otf/*.otf "$FONTS_DIR/"

rm -rf /tmp/fira* /tmp/jb* /tmp/monaspace*

TOTAL=$(ls -1 "$FONTS_DIR" | wc -l)
echo "✅ [Sucesso!] Todas as fontes profissionais foram instaladas com sucesso!"
echo "📊 Total de fontes ativas no sistema: ${TOTAL}"
