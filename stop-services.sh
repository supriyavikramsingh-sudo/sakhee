#!/bin/bash

# Stop services script
# Stops the server and client processes started by start-medical-report-test.sh

echo "🛑 Stopping Sakhee services..."
echo ""

# Check for PID files
if [ -f ".server.pid" ]; then
    SERVER_PID=$(cat .server.pid)
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        kill $SERVER_PID
        echo "✅ Server stopped (PID: $SERVER_PID)"
    else
        echo "⚠️  Server process not found"
    fi
    rm .server.pid
else
    echo "⚠️  No server PID file found"
fi

if [ -f ".client.pid" ]; then
    CLIENT_PID=$(cat .client.pid)
    if ps -p $CLIENT_PID > /dev/null 2>&1; then
        kill $CLIENT_PID
        echo "✅ Client stopped (PID: $CLIENT_PID)"
    else
        echo "⚠️  Client process not found"
    fi
    rm .client.pid
else
    echo "⚠️  No client PID file found"
fi

# Also try to kill by port
echo ""
echo "🔍 Checking for processes on ports..."

if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✅ Killed process on port 3000"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "✅ Killed process on port 5173"
fi

echo ""
echo "✅ All services stopped!"
