#!/bin/sh
set -e

# drizzle-kit push asks before adding a constraint to a table that already holds
# rows, and there is no flag to answer it non-interactively: `--force` means
# "auto-approve all data loss statements", which is the *truncating* answer, and
# `--strict` only asks more often.
#
# stdin is /dev/null so the prompt cannot block. Without it the container hangs
# at the question, never starts the server, fails its health checks and is
# killed — which is what revision 13 did on 2026-09-22. Piping `yes ""` does not
# help: the prompt reads raw TTY keypresses, not piped newlines.
#
# The trade-off is that a push needing an answer applies nothing and still exits
# 0, so the schema silently stays behind. The check below is what makes that
# visible; the permanent fix is to apply the awkward change to the database once
# by hand, after which push has nothing to ask about and runs clean.
echo "Applying database schema (drizzle-kit push)..."
node /app/node_modules/drizzle-kit/bin.cjs push --config /app/drizzle.config.ts < /dev/null

# Re-running is a schema-agnostic check: after a successful push there is
# nothing left to do, so anything other than "no changes" means it did not land.
# This is how a bail becomes loud instead of silent — on 2026-09-22 a stale
# schema booted a server whose code expected columns the database did not have
# (financials.additional_offsite), and nothing in the logs said so.
#
# A warning, not a failure: a stale schema still serves most of the app, while
# exiting here would turn a partial outage into a boot loop.
echo "Verifying the schema actually applied..."
RECHECK="$(node /app/node_modules/drizzle-kit/bin.cjs push --config /app/drizzle.config.ts < /dev/null 2>&1 || true)"
if printf '%s' "$RECHECK" | grep -qi "no changes detected"; then
  echo "Schema verified: no pending changes."
else
  echo "=============================================================="
  echo "WARNING: the schema push did not fully apply."
  echo "The server is starting anyway, but any endpoint touching a new"
  echo "column will fail. If the output below shows a question, apply"
  echo "that change to the database by hand — push cannot answer it."
  printf '%s\n' "$RECHECK"
  echo "=============================================================="
fi

echo "Starting server..."

# Execute the command passed as arguments to this script (CMD from Dockerfile)
exec "$@"
