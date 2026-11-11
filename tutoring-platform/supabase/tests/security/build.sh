#!/bin/bash
# يبني قاعدة محلية تحاكي Supabase ويطبّق كل الـ migrations بالترتيب.
# الاستعمال: ./build.sh <dbname> [آخر رقم migration]   (SKIP="16 25" لتخطّي أرقام)
# يتطلّب Postgres محلياً؛ الاتصال عبر متغيّرات PGHOST/PGPORT/PGUSER المعتادة.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; MIG="$HERE/../../migrations"
DB=$1; LAST=${2:-99}; P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" || exit 1
$P -d "$DB" -f "$HERE/prelude.sql" 2>&1 | grep -v NOTICE
for f in "$MIG"/*.sql; do
  n=$(basename "$f" | sed 's/^202608020900\([0-9]*\)_.*/\1/'); n=$((10#$n))
  [ "$n" -gt "$LAST" ] && continue
  case " ${SKIP:-} " in *" $n "*) continue;; esac
  # pg_net غير متوفّر محلياً — prelude.sql يوفّر بديلاً وهمياً لـ net.http_post
  out=$(sed 's/^create extension if not exists pg_net;//' "$f" | PGOPTIONS="-c role=postgres" $P -d "$DB" 2>&1 | grep -v NOTICE)
  if echo "$out" | grep -q ERROR; then echo "FAILED at $(basename "$f")"; echo "$out" | head -5; exit 1; fi
done
echo "built $DB up to $LAST"
