#!/usr/bin/env bash
# ============================================================
#  Sacramento — локальный запуск всего стека (для разработки)
#
#  PostgreSQL  -> Docker, порт 5544
#  Бэкенд      -> mvn spring-boot:run, порт 8090
#  Витрина     -> Next.js dev, порт 3030
#  Админка     -> Vite dev,   порт 5180
#
#  Запуск:    ./scripts/start-local.sh
#  Остановка: ./scripts/stop-local.sh
#  Логи:      tail -f .local/logs/*.log
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="${ROOT}/.local/logs"
PIDS="${ROOT}/.local/pids"
mkdir -p "${LOGS}" "${PIDS}"

BACKEND_PORT=8090
STOREFRONT_PORT=3030
ADMIN_PORT=5180

say()  { printf "\033[1;34m▸ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

wait_http() { # url, имя, попытки
  for _ in $(seq 1 "${3:-60}"); do
    curl -sf "$1" >/dev/null 2>&1 && return 0
    sleep 2
  done
  fail "$2 не поднялся ($1) — смотрите ${LOGS}"
}

port_free() {
  if lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "Порт $1 уже занят — остановите процесс или запустите ./scripts/stop-local.sh"
  fi
}

say "Проверяю порты ${BACKEND_PORT} / ${STOREFRONT_PORT} / ${ADMIN_PORT}..."
port_free ${BACKEND_PORT}; port_free ${STOREFRONT_PORT}; port_free ${ADMIN_PORT}

say "1/4 PostgreSQL (Docker, :5544)..."
docker compose -f "${ROOT}/backend/compose.dev.yaml" up -d --wait >/dev/null
ok "PostgreSQL запущен"

say "2/4 Бэкенд (:${BACKEND_PORT})..."
( cd "${ROOT}/backend" && SERVER_PORT=${BACKEND_PORT} \
  APP_CORS_ORIGINS="http://localhost:${STOREFRONT_PORT},http://localhost:${ADMIN_PORT}" \
  mvn -q spring-boot:run >"${LOGS}/backend.log" 2>&1 & echo $! >"${PIDS}/backend.pid" )
wait_http "http://localhost:${BACKEND_PORT}/actuator/health" "Бэкенд" 90
ok "Бэкенд: http://localhost:${BACKEND_PORT}"

say "3/4 Витрина (:${STOREFRONT_PORT})..."
( cd "${ROOT}/frontend/storefront" && [ -d node_modules ] || npm install >/dev/null 2>&1
  cd "${ROOT}/frontend/storefront" && API_URL="http://localhost:${BACKEND_PORT}" \
  npm run dev -- --port ${STOREFRONT_PORT} >"${LOGS}/storefront.log" 2>&1 & echo $! >"${PIDS}/storefront.pid" )
wait_http "http://localhost:${STOREFRONT_PORT}" "Витрина" 60
ok "Витрина: http://localhost:${STOREFRONT_PORT}"

say "4/4 Админка (:${ADMIN_PORT})..."
( cd "${ROOT}/frontend/admin" && [ -d node_modules ] || npm install >/dev/null 2>&1
  cd "${ROOT}/frontend/admin" && VITE_API_TARGET="http://localhost:${BACKEND_PORT}" \
  npm run dev -- --port ${ADMIN_PORT} --strictPort >"${LOGS}/admin.log" 2>&1 & echo $! >"${PIDS}/admin.pid" )
wait_http "http://localhost:${ADMIN_PORT}" "Админка" 60
ok "Админка: http://localhost:${ADMIN_PORT}  (admin / sacramento2026)"

echo
ok "Всё запущено:"
echo "   Витрина : http://localhost:${STOREFRONT_PORT}"
echo "   Админка : http://localhost:${ADMIN_PORT}"
echo "   API     : http://localhost:${BACKEND_PORT}"
echo "   Логи    : tail -f .local/logs/*.log"
echo "   Стоп    : ./scripts/stop-local.sh"
