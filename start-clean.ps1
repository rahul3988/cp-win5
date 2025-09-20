# Win5x Clean Start Script
Write-Host "Win5x Clean Start Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Kill all Node processes
Write-Host "Killing Node processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "All Node processes killed" -ForegroundColor Green
} catch {
    Write-Host "No Node processes to kill" -ForegroundColor Gray
}

# Kill Redis processes
Write-Host "Checking Redis processes..." -ForegroundColor Yellow
try {
    $redisProcesses = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcesses) {
        $redisProcesses | Stop-Process -Force
        Write-Host "Redis processes killed" -ForegroundColor Green
    } else {
        Write-Host "No Redis processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "No Redis processes to kill" -ForegroundColor Gray
}

# Clear ports
Write-Host "Clearing ports 3000, 3001, 3002..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $connections | ForEach-Object {
                try {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {
                    # Ignore errors
                }
            }
            Write-Host "Port $port cleared" -ForegroundColor Green
        } else {
            Write-Host "Port $port already free" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Port $port already free" -ForegroundColor Gray
    }
}

# Wait for cleanup
Write-Host "Waiting for cleanup..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check directory
Write-Host "Checking project directory..." -ForegroundColor Yellow
if (!(Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Run from project root." -ForegroundColor Red
    exit 1
}
Write-Host "Project directory confirmed" -ForegroundColor Green

# Install dependencies if needed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    pnpm install
    Write-Host "Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

# Start servers
Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host "Starting backend, admin panel, and user panel..." -ForegroundColor Gray

$serverProcess = Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow -PassThru
Write-Host "Servers starting in background (PID: $($serverProcess.Id))" -ForegroundColor Green

# Wait for servers
Write-Host "Waiting for servers to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check server status
Write-Host "Checking server status..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$adminRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$userRunning = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "Backend API (3001): RUNNING" -ForegroundColor Green
} else {
    Write-Host "Backend API (3001): NOT RUNNING" -ForegroundColor Red
}

if ($adminRunning) {
    Write-Host "Admin Panel (3000): RUNNING" -ForegroundColor Green
} else {
    Write-Host "Admin Panel (3000): NOT RUNNING" -ForegroundColor Red
}

if ($userRunning) {
    Write-Host "User Panel (3002): RUNNING" -ForegroundColor Green
} else {
    Write-Host "User Panel (3002): NOT RUNNING" -ForegroundColor Red
}

# Test API
Write-Host "Testing API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body '{"username":"testuser1","password":"Test123!"}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "Backend API: WORKING" -ForegroundColor Green
} catch {
    Write-Host "Backend API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Get network IP
Write-Host "Getting network information..." -ForegroundColor Yellow
try {
    $networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" }
    if ($networkAdapters) {
        $localIP = $networkAdapters[0].IPAddress
        Write-Host "Local IP Address: $localIP" -ForegroundColor Green
    } else {
        $localIP = "localhost"
        Write-Host "Using localhost" -ForegroundColor Gray
    }
} catch {
    $localIP = "localhost"
    Write-Host "Using localhost" -ForegroundColor Gray
}

# Open browsers
Write-Host "Opening browsers..." -ForegroundColor Yellow
try {
    Start-Process "chrome.exe" -ArgumentList "http://localhost:3002", "http://$localIP:3002" -ErrorAction SilentlyContinue
    Write-Host "User Panel opened in Chrome" -ForegroundColor Green
} catch {
    Write-Host "Failed to open Chrome for User Panel" -ForegroundColor Red
}

try {
    Start-Process "chrome.exe" -ArgumentList "http://localhost:3000", "http://$localIP:3000" -ErrorAction SilentlyContinue
    Write-Host "Admin Panel opened in Chrome" -ForegroundColor Green
} catch {
    Write-Host "Failed to open Chrome for Admin Panel" -ForegroundColor Red
}

# Display final information
Write-Host ""
Write-Host "Win5x Servers Started!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "Local Access:" -ForegroundColor Yellow
Write-Host "  User Panel:  http://localhost:3002" -ForegroundColor White
Write-Host "  Admin Panel: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor White

Write-Host ""
Write-Host "Network Access:" -ForegroundColor Yellow
Write-Host "  User Panel:  http://$localIP:3002" -ForegroundColor White
Write-Host "  Admin Panel: http://$localIP:3000" -ForegroundColor White
Write-Host "  Backend API: http://$localIP:3001" -ForegroundColor White

Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "Admin Panel:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White

Write-Host ""
Write-Host "User Panel:" -ForegroundColor Yellow
Write-Host "  Username: testuser1, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser2, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser3, Password: Test123!" -ForegroundColor White

Write-Host ""
Write-Host "Notes:" -ForegroundColor Yellow
Write-Host "- Keep this terminal open to keep servers running" -ForegroundColor White
Write-Host "- Press Ctrl+C to stop all servers" -ForegroundColor White
Write-Host "- Use network URLs for mobile access" -ForegroundColor White

Write-Host ""
Write-Host "Ready to play! Enjoy Win5x!" -ForegroundColor Green
