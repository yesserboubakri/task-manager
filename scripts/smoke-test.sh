#!/usr/bin/env bash
# End-to-end API smoke test. Usage: BASE=http://localhost:3000 ./scripts/smoke-test.sh
BASE="${BASE:-http://localhost:3000}"
PW="motdepasse123"
RUN="$RANDOM"
A="a${RUN}@test.com"
B="b${RUN}@test.com"
JSON='Content-Type: application/json'
FAIL=0

check() {
  if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (expected $2, got $3)"; FAIL=1; fi
}
status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
token() {
  curl -s -X POST "$BASE/api/auth/login" -H "$JSON" \
    -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

check "health" 200 "$(status "$BASE/health")"

check "register A" 201 "$(status -X POST "$BASE/api/auth/register" -H "$JSON" -d "{\"email\":\"$A\",\"password\":\"$PW\"}")"
check "register B" 201 "$(status -X POST "$BASE/api/auth/register" -H "$JSON" -d "{\"email\":\"$B\",\"password\":\"$PW\"}")"
check "register duplicate" 409 "$(status -X POST "$BASE/api/auth/register" -H "$JSON" -d "{\"email\":\"$A\",\"password\":\"$PW\"}")"
check "register weak password" 400 "$(status -X POST "$BASE/api/auth/register" -H "$JSON" -d "{\"email\":\"c${RUN}@test.com\",\"password\":\"123\"}")"
check "login wrong password" 401 "$(status -X POST "$BASE/api/auth/login" -H "$JSON" -d "{\"email\":\"$A\",\"password\":\"wrongpassword\"}")"

TA="$(token "$A")"
TB="$(token "$B")"
check "login A gives a token" 1 "$([ -n "$TA" ] && echo 1 || echo 0)"
check "login B gives a token" 1 "$([ -n "$TB" ] && echo 1 || echo 0)"

check "tasks without token" 401 "$(status "$BASE/api/tasks")"
check "tasks with bad token" 401 "$(status "$BASE/api/tasks" -H "Authorization: Bearer abc")"
check "create task without title" 400 "$(status -X POST "$BASE/api/tasks" -H "$JSON" -H "Authorization: Bearer $TA" -d '{}')"

ID="$(curl -s -X POST "$BASE/api/tasks" -H "$JSON" -H "Authorization: Bearer $TA" -d '{"title":"first task"}' | sed -n 's/.*"id":\([0-9]*\).*/\1/p')"
check "create task" 1 "$([ -n "$ID" ] && echo 1 || echo 0)"
check "list tasks" 200 "$(status "$BASE/api/tasks" -H "Authorization: Bearer $TA")"

check "B cannot update A's task" 404 "$(status -X PUT "$BASE/api/tasks/$ID" -H "$JSON" -H "Authorization: Bearer $TB" -d '{"title":"hacked"}')"
check "B cannot delete A's task" 404 "$(status -X DELETE "$BASE/api/tasks/$ID" -H "Authorization: Bearer $TB")"
check "A updates own task" 200 "$(status -X PUT "$BASE/api/tasks/$ID" -H "$JSON" -H "Authorization: Bearer $TA" -d '{"status":"done"}')"
check "A deletes own task" 204 "$(status -X DELETE "$BASE/api/tasks/$ID" -H "Authorization: Bearer $TA")"

exit $FAIL
