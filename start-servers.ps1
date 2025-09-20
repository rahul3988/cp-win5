# Win5x Server Startup Script
# This script starts all necessary servers for the Win5x application

Write-Host "🚀 Starting Win5x Servers..." -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm is not installed" -ForegroundColor Red
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
try {
    pnpm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🗄️ Setting up database..." -ForegroundColor Yellow
try {
    Set-Location "packages/backend"
    Write-Host "Running database migrations..." -ForegroundColor Gray
    pnpm db:migrate
    Write-Host "Generating Prisma client..." -ForegroundColor Gray
    pnpm db:generate
    Write-Host "Seeding database..." -ForegroundColor Gray
    pnpm db:seed
    Set-Location "../.."
    Write-Host "✅ Database setup completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Database setup failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Write-Host "`n🔧 Starting development servers..." -ForegroundColor Yellow
Write-Host "This will start:" -ForegroundColor Gray
Write-Host "• Backend API (Port 3001)" -ForegroundColor Gray
Write-Host "• Admin Panel (Port 3000)" -ForegroundColor Gray
Write-Host "• User Panel (Port 3002)" -ForegroundColor Gray

Write-Host "`n⏳ Starting servers in the background..." -ForegroundColor Yellow

# Start the development servers
try {
    Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow -PassThru
    Write-Host "✅ Servers started successfully!" -ForegroundColor Green
    
    Write-Host "`n⏱️ Waiting for servers to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "`n🌐 Server URLs:" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host "• Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host "• Admin Panel: http://localhost:3000" -ForegroundColor White
    Write-Host "• User Panel:  http://localhost:3002" -ForegroundColor White
    
    Write-Host "`n🔑 Login Credentials:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host "Admin Panel:" -ForegroundColor Yellow
    Write-Host "  Username: admin" -ForegroundColor White
    Write-Host "  Password: Admin123!" -ForegroundColor White
    
    Write-Host "`nTest Users:" -ForegroundColor Yellow
    Write-Host "  Username: testuser1, Password: Test123!" -ForegroundColor White
    Write-Host "  Username: testuser2, Password: Test123!" -ForegroundColor White
    Write-Host "  Username: testuser3, Password: Test123!" -ForegroundColor White
    
    Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Wait for all servers to fully start (check terminal output)" -ForegroundColor White
    Write-Host "2. Open the URLs above in your browser" -ForegroundColor White
    Write-Host "3. Test login with the credentials provided" -ForegroundColor White
    Write-Host "4. Run ./test-auth.ps1 to test authentication via API" -ForegroundColor White
    
    Write-Host "`n⚠️ Note: Keep this terminal open to keep servers running" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Failed to start servers" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Win5x servers are now running!" -ForegroundColor Green
