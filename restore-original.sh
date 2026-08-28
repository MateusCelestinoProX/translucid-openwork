#!/usr/bin/env zsh
# ==============================================================================
# 🔄 Translucid OpenWork — Restaurador do Estado Original de Fábrica
# ==============================================================================

set -e

APP_PATH="/Applications/OpenWork.app"
RESOURCES_DIR="${APP_PATH}/Contents/Resources"
ASAR_FILE="${RESOURCES_DIR}/app.asar"
BACKUP_FILE="${RESOURCES_DIR}/app.asar.backup"

echo "🔄 [OpenWork] Iniciando restauração do app original..."

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Nenhum backup encontrado em ${BACKUP_FILE}."
    exit 1
fi

echo "🛑 Fechando OpenWork..."
killall "OpenWork" 2>/dev/null || true
killall "openwork" 2>/dev/null || true
sleep 1

echo "📦 Restaurando app.asar original..."
cp "$BACKUP_FILE" "$ASAR_FILE"

echo "✅ [Sucesso!] OpenWork foi restaurado com sucesso para o padrão de fábrica."
echo "🚀 Abrindo OpenWork..."
open -a "$APP_PATH"
