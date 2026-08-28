#!/usr/bin/env zsh
# ==============================================================================
# ✨ Translucid OpenWork — Aplicador Automatizado de Transparência Líquida
# ==============================================================================

set -e

APP_PATH="/Applications/OpenWork.app"
RESOURCES_DIR="${APP_PATH}/Contents/Resources"
ASAR_FILE="${RESOURCES_DIR}/app.asar"
BACKUP_FILE="${RESOURCES_DIR}/app.asar.backup"
WORK_DIR="/tmp/openwork-translucid-build"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔮 [Translucid OpenWork] Iniciando processo de personalização visual Liquid Glass..."

# 1. Validação de existência do app
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Erro: OpenWork.app não encontrado em /Applications."
    echo "   Certifique-se de que o aplicativo está instalado em /Applications/OpenWork.app."
    exit 1
fi

# 2. Fechar o OpenWork se estiver aberto
echo "🛑 Encerrando instâncias em execução do OpenWork..."
killall "OpenWork" 2>/dev/null || true
killall "openwork" 2>/dev/null || true
sleep 1

# 3. Backup de segurança
if [ ! -f "$BACKUP_FILE" ]; then
    echo "📦 Criando backup original em: ${BACKUP_FILE}..."
    cp "$ASAR_FILE" "$BACKUP_FILE"
    echo "✅ Backup concluído com sucesso."
else
    echo "ℹ️ Backup existente preservado em: ${BACKUP_FILE}"
fi

# 4. Extração do pacote ASAR
echo "📂 Extraindo app.asar do OpenWork para ambiente temporário..."
rm -rf "$WORK_DIR"
npx --yes @electron/asar extract "$ASAR_FILE" "$WORK_DIR"

# 5. Execução do motor de injeção JS no ASAR
echo "💉 Injetando regras de Liquid Glass, Apple Vibrancy e Dashboard Button no pacote ASAR..."
node "${SCRIPT_DIR}/patch-engine.js" "$WORK_DIR"

# 6. Reempacotamento do ASAR
echo "📦 Reempacotando app.asar..."
npx --yes @electron/asar pack "$WORK_DIR" "$ASAR_FILE"

# 7. Injeção direta no app-dist (se existir em Resources)
if [ -d "${RESOURCES_DIR}/app-dist" ]; then
    echo "💉 Injetando regras no diretório solto app-dist..."
    node "${SCRIPT_DIR}/patch-engine.js" "${RESOURCES_DIR}/app-dist"
fi

# 8. Limpeza
rm -rf "$WORK_DIR"

# 9. Remoção de quarentena do macOS e reassinatura ad-hoc de segurança
echo "🛡️ Removendo quarentena do macOS Gatekeeper e reassinando OpenWork.app..."
xattr -cr "$APP_PATH" 2>/dev/null || true
codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || true

echo "\n✨ [Sucesso!] OpenWork agora possui interface 100% translúcida estilo Apple Glass!"
echo "🚀 Abrindo OpenWork Desktop..."
open -a "$APP_PATH"
