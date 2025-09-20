# Win5x Quick Restart Script
# Quick script to kill processes and restart servers

Write-Host "⚡ Win5x Quick Restart" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

# Kill all Node processes
Write-Host "Killing Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear ports
Write-Host "Clearing ports..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    try {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# Wait
Start-Sleep -Seconds 2

# Start servers
Write-Host "Starting servers..." -ForegroundColor Yellow
Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow

# Wait for startup
Write-Host "Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Open browsers
Write-Host "Opening browsers..." -ForegroundColor Yellow
Start-Process "chrome.exe" -ArgumentList "http://localhost:3002", "http://localhost:3000"

Write-Host "✅ Done! Servers should be running now." -ForegroundColor Green
Write-Host "User Panel: http://localhost:3002" -ForegroundColor White
Write-Host "Admin Panel: http://localhost:3000" -ForegroundColor White
