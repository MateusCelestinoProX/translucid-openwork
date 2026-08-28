#!/usr/bin/env zsh
# ==============================================================================
# 📊 Start Translucid Control Center & Dashboard (http://localhost:3030/)
# ==============================================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando Translucid Control Center Suite em http://localhost:3030/..."
cd "${SCRIPT_DIR}/dashboard"

if command -v bun &> /dev/null; then
    bun run server.ts
elif command -v npx &> /dev/null; then
    npx tsx server.ts
else
    echo "❌ Erro: Bun ou Node/tsx não encontrado."
    exit 1
fi
