#!/bin/bash

# Medical Report Feature - Quick Start Script
# This script helps you quickly test the medical report upload feature

echo "🏥 Sakhee Medical Report Analyzer - Quick Start"
echo "==============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if a process is running on a port
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

echo "📋 Pre-flight checks..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm is installed: $(npm --version)"

# Check server dependencies
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
else
    echo "✅ Server dependencies installed"
fi

# Check client dependencies
if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
else
    echo "✅ Client dependencies installed"
fi

echo ""
echo "🚀 Starting services..."
echo ""

# Check if ports are already in use
if check_port 3000; then
    echo "⚠️  Port 3000 is already in use (Server)"
    read -p "   Kill the process and restart? (y/n): " kill_server
    if [ "$kill_server" = "y" ]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        echo "   ✓ Killed process on port 3000"
    else
        echo "   Using existing server on port 3000"
    fi
fi

if check_port 5173; then
    echo "⚠️  Port 5173 is already in use (Client)"
    read -p "   Kill the process and restart? (y/n): " kill_client
    if [ "$kill_client" = "y" ]; then
        lsof -ti:5173 | xargs kill -9 2>/dev/null
        echo "   ✓ Killed process on port 5173"
    else
        echo "   Using existing client on port 5173"
    fi
fi

echo ""
echo "Starting server and client..."
echo ""

# Start server in background
cd server && npm run dev > ../server.log 2>&1 &
SERVER_PID=$!
echo "✅ Server starting (PID: $SERVER_PID) - Logs: server.log"

# Wait a bit for server to start
sleep 3

# Start client in background
cd ../client && npm run dev > ../client.log 2>&1 &
CLIENT_PID=$!
echo "✅ Client starting (PID: $CLIENT_PID) - Logs: client.log"

cd ..

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✨ Services are running!"
echo ""
echo "📊 Status:"
echo "   Server: http://localhost:3000"
echo "   Client: http://localhost:5173"
echo ""
echo "📝 Testing Steps:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Login or create an account"
echo "   3. Navigate to /reports page"
echo "   4. Click 'Upload New' to upload a medical report"
echo "   5. Upload a PDF, DOCX, or image file"
echo "   6. View the AI analysis"
echo "   7. Try replacing the report with a new one"
echo "   8. Test the delete functionality"
echo ""
echo "📋 Logs:"
echo "   Server logs: tail -f server.log"
echo "   Client logs: tail -f client.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $SERVER_PID $CLIENT_PID"
echo "   or run: ./stop-services.sh"
echo ""
echo "🧪 To test the service layer:"
echo "   cd server && node src/scripts/testMedicalReportService.js"
echo ""
echo "📚 Documentation:"
echo "   - Feature docs: MEDICAL_REPORT_FEATURE.md"
echo "   - Implementation: IMPLEMENTATION_SUMMARY.md"
echo ""
echo "✅ Setup complete! Happy testing! 🎉"
echo ""

# Save PIDs for easy stopping
echo "$SERVER_PID" > .server.pid
echo "$CLIENT_PID" > .client.pid
