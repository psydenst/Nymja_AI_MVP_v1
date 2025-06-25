#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "✅ Database is available!"

# Apply migrations
echo "🔄 Running migrations..."
python manage.py migrate --noinput

# Collect static files (optional, useful for production)
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Start Gunicorn with ASGI + Uvicorn worker
echo "🚀 Starting Gunicorn (ASGI + UvicornWorker)..."
exec gunicorn backend.asgi:application \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 10 \
    --worker-connections 100 \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --log-level info
