#!/usr/bin/env bash
# Останавливает всё, что поднял start-local.sh (включая дочерние процессы).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS="$ROOT/.local/pids"

for name in storefront admin backend; do
  file="$PIDS/$name.pid"
  if [ -f "$file" ]; then
    pid=$(cat "$file")
    pkill -P "$pid" 2>/dev/null
    kill "$pid" 2>/dev/null
    rm -f "$file"
    echo "✓ $name остановлен"
  fi
done

# страховка: добиваем по сигнатурам процессов проекта
pkill -f "spring-boot:run" 2>/dev/null
pkill -f "md.sacramento.SacramentoBackendApplication" 2>/dev/null
pkill -f "next dev.*3030" 2>/dev/null
pkill -f "vite.*5180" 2>/dev/null

docker compose -f "$ROOT/backend/compose.dev.yaml" stop >/dev/null 2>&1 && echo "✓ PostgreSQL остановлен"
echo "Готово."
