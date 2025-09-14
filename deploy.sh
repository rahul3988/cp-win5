#!/bin/bash

# Win5x Production Deployment Script
# Run this script on your production server

echo "🚀 Starting Win5x Production Deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please do not run this script as root"
    exit 1
fi

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check PNPM
if ! command -v pnpm &> /dev/null; then
    echo "❌ PNPM is not installed. Installing PNPM..."
    npm install -g pnpm
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 13+ first."
    exit 1
fi

# Check Redis
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please install Redis 6+ first."
    exit 1
fi

echo "✅ All prerequisites are installed"

# Install dependencies (REQUIRED - node_modules not included)
echo "📦 Installing dependencies..."
echo "⚠️  Note: This project comes without node_modules to reduce size"
pnpm install

# Build the application
echo "🔨 Building application..."
pnpm build

# Check if .env exists
if [ ! -f "packages/backend/.env" ]; then
    echo "❌ .env file not found in packages/backend/"
    echo "Please create .env file with production configuration"
    echo "See PRODUCTION_SETUP.md for details"
    exit 1
fi

# Setup database
echo "🗄️ Setting up database..."
cd packages/backend

# Run migrations
echo "🔄 Running database migrations..."
pnpm db:migrate

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm db:generate

# Seed initial data
echo "🌱 Seeding initial data..."
pnpm db:seed

# Create admin user
echo "👤 Creating admin user..."
pnpm create-admin

cd ../..

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "🌐 Next steps:"
echo "1. Configure your web server (Nginx/Apache)"
echo "2. Set up SSL certificates"
echo "3. Configure firewall rules"
echo "4. Update DNS records"
echo "5. Change default admin credentials"
echo ""
echo "📖 See PRODUCTION_SETUP.md for detailed configuration instructions"
echo "📞 Support: winein5x@gmail.com"
