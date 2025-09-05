#!/bin/bash

# Wall Bounce MCP Server Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Wall Bounce MCP Server Deployment${NC}"
echo "=================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "${YELLOW}📋 Checking dependencies...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18 or later"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️ Docker is not installed. Docker deployment will be unavailable.${NC}"
fi

if ! command_exists docker-compose; then
    echo -e "${YELLOW}⚠️ Docker Compose is not installed. Docker deployment will be unavailable.${NC}"
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18 or later.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --only=production

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️ .env file not found. Running interactive setup...${NC}"
    node src/cli.js setup
fi

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

# Choose deployment method
echo ""
echo -e "${YELLOW}🚀 Choose deployment method:${NC}"
echo "1) PM2 (Recommended for single server)"
echo "2) Docker Compose (Recommended for production)"
echo "3) Systemd Service (System-level service)"
echo "4) Manual start (Development only)"
read -p "Enter your choice (1-4): " deploy_choice

case $deploy_choice in
    1)
        echo -e "${YELLOW}📦 Installing PM2...${NC}"
        if ! command_exists pm2; then
            npm install -g pm2
        fi
        
        echo -e "${YELLOW}🚀 Starting with PM2...${NC}"
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        echo -e "${GREEN}✅ Deployment complete! Server running with PM2${NC}"
        echo "Monitor: pm2 monit"
        echo "Logs: pm2 logs wall-bounce-mcp"
        ;;
    2)
        if ! command_exists docker || ! command_exists docker-compose; then
            echo -e "${RED}❌ Docker or Docker Compose not available${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}🐳 Building and starting with Docker Compose...${NC}"
        docker-compose build
        docker-compose up -d
        
        echo -e "${GREEN}✅ Deployment complete! Server running with Docker${NC}"
        echo "Check status: docker-compose ps"
        echo "Logs: docker-compose logs -f"
        ;;
    3)
        echo -e "${YELLOW}🔧 Installing systemd service...${NC}"
        sudo cp wall-bounce-mcp.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable wall-bounce-mcp
        sudo systemctl start wall-bounce-mcp
        
        echo -e "${GREEN}✅ Deployment complete! Server running as systemd service${NC}"
        echo "Check status: sudo systemctl status wall-bounce-mcp"
        echo "Logs: sudo journalctl -u wall-bounce-mcp -f"
        ;;
    4)
        echo -e "${YELLOW}🚀 Starting server manually...${NC}"
        npm start &
        
        echo -e "${GREEN}✅ Server started manually${NC}"
        echo "Note: Server will stop when terminal is closed"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
sleep 5

# Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
if curl -f http://localhost:3003/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is healthy!${NC}"
    echo ""
    echo -e "${GREEN}🌐 Access URLs:${NC}"
    echo "Local: http://localhost:3003/data/health"
    if command_exists curl && curl -s ifconfig.me >/dev/null 2>&1; then
        EXTERNAL_IP=$(curl -s ifconfig.me)
        echo "External: http://$EXTERNAL_IP:3003/data/health"
    fi
    echo ""
    echo -e "${GREEN}🎉 Wall Bounce MCP Server deployed successfully!${NC}"
else
    echo -e "${RED}❌ Health check failed. Please check the logs.${NC}"
    exit 1
fi