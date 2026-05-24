#!/bin/bash
# Shared environment setup for backend scripts

ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "Starting in production mode..."
  export NODE_ENV="production"
  # If DATABASE_URL is not provided by the host (e.g. Railway Postgres plugin
  # injects it), fall back to a local SQLite file under DATA_DIR. The fallback
  # exists so the Vibecode dev container keeps working; Railway will always
  # provide DATABASE_URL so this branch is skipped there.
  if [[ -z "${DATABASE_URL:-}" ]]; then
    DATA_DIR="${DATA_DIR:-/data}"
    export DATABASE_FILE="${DATA_DIR}/production.db"
    export DATABASE_URL="file:${DATABASE_FILE}"
  fi
else
  echo "Starting in development mode..."
  export NODE_ENV="development"
fi
