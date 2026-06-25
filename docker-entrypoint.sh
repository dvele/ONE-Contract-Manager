#!/bin/sh
set -e

echo "Applying database schema (drizzle-kit push)..."
node /app/node_modules/drizzle-kit/bin.cjs push --config /app/drizzle.config.ts
echo "Schema applied. Starting server..."

# Execute the command passed as arguments to this script (CMD from Dockerfile)
exec "$@"
