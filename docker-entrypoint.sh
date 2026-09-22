#!/bin/sh
set -e

# drizzle-kit asks before adding a constraint to a table that already holds
# rows. With no TTY it draws the menu, reads no answer, and exits **0 without
# applying anything** — which on 2026-09-22 booted a server whose code expected
# columns the database did not have (`financials.additional_offsite`), leaving
# /api/contracts and /api/dashboard/stats returning 500.
#
# `yes ""` accepts whichever option the prompt has highlighted, which is always
# the non-destructive one ("add the constraint without truncating the table").
#
# Never `--force`: in drizzle-kit that flag means "accept data-loss statements",
# i.e. the truncating answer to this very prompt.
echo "Applying database schema (drizzle-kit push)..."
yes "" | node /app/node_modules/drizzle-kit/bin.cjs push --config /app/drizzle.config.ts

# The push above exits 0 whether or not it applied anything, so `set -e` cannot
# be trusted to catch a bail. Re-running is the schema-agnostic check: once a
# push has succeeded there is nothing left to do, so anything other than "no
# changes" means the schema did not land.
#
# Deliberately a warning, not a failure. A server with a stale schema still
# serves most of the app, whereas exiting here would turn a partial outage into
# a boot loop and take the whole service down.
echo "Verifying the schema actually applied..."
RECHECK="$(yes "" | node /app/node_modules/drizzle-kit/bin.cjs push --config /app/drizzle.config.ts 2>&1 || true)"
if printf '%s' "$RECHECK" | grep -qi "no changes detected"; then
  echo "Schema verified: no pending changes."
else
  echo "=============================================================="
  echo "WARNING: schema push did not fully apply. The server is"
  echo "starting anyway, but endpoints touching new columns will fail."
  echo "Re-run output follows:"
  printf '%s\n' "$RECHECK"
  echo "=============================================================="
fi

echo "Schema applied. Starting server..."

# Execute the command passed as arguments to this script (CMD from Dockerfile)
exec "$@"
