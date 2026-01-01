#!/bin/bash

# Dynamic CRM System - Quick Start Script
# This script helps you quickly setup and run the CRM system

echo "🚀 Dynamic CRM System - Quick Start"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "📥 Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment files if they don't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (for production use)
DATABASE_URL=postgresql://username:password@localhost:5432/dynamic_crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_PATH=./server/uploads
MAX_FILE_SIZE=10485760

# Client Configuration
CLIENT_URL=http://localhost:3000
EOF
    echo "⚠️  Please update the .env file with your configuration"
fi

if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client/.env.local file..."
    cat > client/.env.local << 'EOF'
# Client Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Dynamic CRM System
EOF
fi

# Create uploads directories
echo "📁 Creating upload directories..."
mkdir -p server/uploads/user-pfp
mkdir -p server/uploads/reports
mkdir -p server/uploads/leaves

# Build the client
echo "🔨 Building client..."
cd client
npm run build
cd ..

# Start the application
echo "🚀 Starting the application..."
echo "📝 Default Admin Credentials:"
echo "   Council ID: Vicky+++"
echo "   Password: admin123"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "⚡ Starting development server..."

# Check if concurrently is installed
if ! command -v concurrently &> /dev/null; then
    echo "📦 Installing concurrently..."
    npm install -g concurrently
fi

# Start both servers
npm run dev