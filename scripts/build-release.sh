#!/usr/bin/env bash
# ============================================================
#  Sacramento — сборка релиза для дроплета (БЕЗ Docker на сервере)
#
#  Что делает:
#   1. Бэкенд -> GraalVM native image (linux/amd64) через Docker-контейнер
#      (на сервере Docker не нужен — там будет голый бинарник под systemd)
#   2. Админка -> статика (Vite build)
#   3. Витрина -> Next.js standalone (запускается обычным node)
#   4. Складывает всё в release/sacramento-release.tar.gz вместе с install.sh
#
#  Использование:
#    ./scripts/build-release.sh           # native-сборка (15-40 мин на Apple Silicon)
#    ./scripts/build-release.sh jar       # быстрый фолбэк: обычный JAR вместо native
#
#  Дальше:
#    scp release/sacramento-release.tar.gz root@ВАШ_IP:/root/
#    ssh root@ВАШ_IP 'tar xzf sacramento-release.tar.gz && cd sacramento && ./install.sh sacramento.md'
# ============================================================
set -euo pipefail

MODE="${1:-native}"   # native | jar
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/release/sacramento"
GRAAL_IMAGE="ghcr.io/graalvm/native-image-community:25"

say()  { printf "\n\033[1;34m▸ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

rm -rf "${ROOT}/release"
mkdir -p "${OUT}"

# ---------- 1. Бэкенд ----------
if [ "${MODE}" = "native" ]; then
  say "1/3 Бэкенд: GraalVM native image (linux/amd64 в Docker)..."
  command -v docker >/dev/null || fail "Нужен Docker для кросс-сборки native image"
  echo "  ⚠ На Apple Silicon сборка идёт через эмуляцию x86 — это 15-40 минут."
  echo "  ⚠ Docker'у нужно ≥8 ГБ памяти (Docker Desktop -> Settings -> Resources)."
  docker run --rm --platform linux/amd64 \
    -v "${ROOT}":/ws -w /ws/backend \
    -v sacramento-m2:/root/.m2 \
    "${GRAAL_IMAGE}" \
    ./mvnw -Pnative native:compile -DskipTests -B
  [ -f "${ROOT}/backend/target/sacramento-backend" ] || fail "Native-бинарник не собрался — попробуйте './scripts/build-release.sh jar'"
  cp "${ROOT}/backend/target/sacramento-backend" "${OUT}/sacramento-backend"
  chmod +x "${OUT}/sacramento-backend"
  ok "Нативный бинарник: $(du -h "${OUT}/sacramento-backend" | cut -f1)"
else
  say "1/3 Бэкенд: обычный JAR (фолбэк-режим)..."
  ( cd "${ROOT}/backend" && ./mvnw -q package -DskipTests )
  cp "${ROOT}/backend/target/"sacramento-backend-*.jar "${OUT}/app.jar"
  ok "JAR: $(du -h "${OUT}/app.jar" | cut -f1) (на сервере запустится с -Xmx384m)"
fi

# ---------- 2. Админка ----------
say "2/3 Админка: Vite build..."
( cd "${ROOT}/frontend/admin" && [ -d node_modules ] || npm ci >/dev/null
  cd "${ROOT}/frontend/admin" && npm run build >/dev/null )
cp -R "${ROOT}/frontend/admin/dist" "${OUT}/admin"
ok "Админка: $(du -sh "${OUT}/admin" | cut -f1)"

# ---------- 3. Витрина ----------
say "3/3 Витрина: Next.js standalone..."
( cd "${ROOT}/frontend/storefront" && [ -d node_modules ] || npm ci >/dev/null
  cd "${ROOT}/frontend/storefront" && npm run build >/dev/null )
mkdir -p "${OUT}/storefront"
cp -R "${ROOT}/frontend/storefront/.next/standalone/." "${OUT}/storefront/"
mkdir -p "${OUT}/storefront/.next/static" "${OUT}/storefront/public"
cp -R "${ROOT}/frontend/storefront/.next/static/." "${OUT}/storefront/.next/static/"
[ -d "${ROOT}/frontend/storefront/public" ] && cp -R "${ROOT}/frontend/storefront/public/." "${OUT}/storefront/public/"
ok "Витрина: $(du -sh "${OUT}/storefront" | cut -f1)"

# ---------- 4. Установщик + архив ----------
cp "${ROOT}/scripts/deploy/install.sh" "${OUT}/install.sh"
chmod +x "${OUT}/install.sh"
( cd "${ROOT}/release" && tar czf sacramento-release.tar.gz sacramento )
ok "Готово: release/sacramento-release.tar.gz ($(du -h "${ROOT}/release/sacramento-release.tar.gz" | cut -f1))"

cat <<EOF

Следующие шаги:
  scp release/sacramento-release.tar.gz root@ВАШ_IP:/root/
  ssh root@ВАШ_IP
  tar xzf sacramento-release.tar.gz && cd sacramento
  ./install.sh sacramento.md        # ваш домен

После install.sh: направьте DNS (A-записи @, www, admin, api -> IP дроплета)
и выпустите сертификаты:  certbot --nginx -d sacramento.md -d www.sacramento.md -d admin.sacramento.md -d api.sacramento.md
EOF
