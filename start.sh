#!/bin/sh
echo "Starting Zeppelin Services..."

# Start API (Background)
# This serves the Backend API and the Frontend Dashboard (via static files)
cd /zeppelin/backend && pnpm run start-api-prod &
API_PID=$!
echo "API server started with PID $API_PID"

# Start Bot (Foreground)
# This keeps the container running
echo "Starting Discord Bot..."
cd /zeppelin/backend && pnpm run start-bot-prod
