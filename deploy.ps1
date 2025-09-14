# Win5x Production Deployment Script for Windows
# Run this script on your production server

Write-Host "🚀 Starting Win5x Production Deployment..." -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check PNPM
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ PNPM version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PNPM is not installed. Installing PNPM..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check PostgreSQL
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL version: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL 13+ first." -ForegroundColor Red
    exit 1
}

# Check Redis
try {
    $redisVersion = redis-server --version
    Write-Host "✅ Redis version: $redisVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Redis is not installed. Please install Redis 6+ first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites are installed" -ForegroundColor Green

# Install dependencies (REQUIRED - node_modules not included)
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Write-Host "⚠️  Note: This project comes without node_modules to reduce size" -ForegroundColor Yellow
pnpm install

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
pnpm build

# Check if .env exists
if (-not (Test-Path "packages/backend/.env")) {
    Write-Host "❌ .env file not found in packages/backend/" -ForegroundColor Red
    Write-Host "Please create .env file with production configuration" -ForegroundColor Yellow
    Write-Host "See PRODUCTION_SETUP.md for details" -ForegroundColor Yellow
    exit 1
}

# Setup database
Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow
Set-Location packages/backend

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
pnpm db:migrate

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
pnpm db:generate

# Seed initial data
Write-Host "🌱 Seeding initial data..." -ForegroundColor Yellow
pnpm db:seed

# Create admin user
Write-Host "👤 Creating admin user..." -ForegroundColor Yellow
pnpm create-admin

Set-Location ../..

# Install PM2 if not installed
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 version: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2
}

# Start the application with PM2
Write-Host "🚀 Starting application with PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Application Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "🌐 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure your web server (IIS/Nginx)" -ForegroundColor White
Write-Host "2. Set up SSL certificates" -ForegroundColor White
Write-Host "3. Configure Windows Firewall" -ForegroundColor White
Write-Host "4. Update DNS records" -ForegroundColor White
Write-Host "5. Change default admin credentials" -ForegroundColor White
Write-Host ""
Write-Host "📖 See PRODUCTION_SETUP.md for detailed configuration instructions" -ForegroundColor Yellow
Write-Host "📞 Support: winein5x@gmail.com" -ForegroundColor Yellow
