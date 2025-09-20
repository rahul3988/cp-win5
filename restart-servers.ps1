# Win5x Server Restart Script
Write-Host "Restarting Win5x Servers with Correct Port Configuration..." -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment for processes to stop
Start-Sleep -Seconds 3

# Start servers with correct configuration
Write-Host "Starting servers with correct ports..." -ForegroundColor Yellow
Write-Host "- Backend API: Port 3001" -ForegroundColor Gray
Write-Host "- Admin Panel: Port 3000" -ForegroundColor Gray  
Write-Host "- User Panel: Port 3002" -ForegroundColor Gray

# Start the development servers
Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow -PassThru

Write-Host "Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if servers are running on correct ports
Write-Host "Checking server status..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "Port $port: RUNNING" -ForegroundColor Green
    } else {
        Write-Host "Port $port: NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Server URLs:" -ForegroundColor Cyan
Write-Host "===========" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "- Admin Panel: http://localhost:3000" -ForegroundColor White
Write-Host "- User Panel:  http://localhost:3002" -ForegroundColor White

Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Admin Panel (http://localhost:3000):" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White

Write-Host ""
Write-Host "User Panel (http://localhost:3002):" -ForegroundColor Yellow
Write-Host "  Username: testuser1, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser2, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser3, Password: Test123!" -ForegroundColor White

Write-Host ""
Write-Host "Servers restarted successfully!" -ForegroundColor Green
Write-Host "Try logging in again with the correct URLs above." -ForegroundColor Yellow
