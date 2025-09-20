# Win5x Clean Start Script
# This script kills all previous processes, clears Redis, and starts servers cleanly

Write-Host "🧹 Win5x Clean Start Script" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Step 1: Kill all Node.js processes
Write-Host "`n1. Killing all Node.js processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ All Node.js processes killed" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No Node.js processes to kill" -ForegroundColor Gray
}

# Step 2: Kill Redis processes (if running locally)
Write-Host "`n2. Checking Redis processes..." -ForegroundColor Yellow
try {
    $redisProcesses = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcesses) {
        $redisProcesses | Stop-Process -Force
        Write-Host "✅ Redis processes killed" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ No local Redis processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "ℹ️ No Redis processes to kill" -ForegroundColor Gray
}

# Step 3: Clear any processes using our ports
Write-Host "`n3. Clearing ports 3000, 3001, 3002..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $connections | ForEach-Object {
                try {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {
                    # Ignore errors if process already stopped
                }
            }
            Write-Host "✅ Port ${port} cleared" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Port ${port} already free" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ℹ️ Port ${port} already free" -ForegroundColor Gray
    }
}

# Step 4: Wait for cleanup
Write-Host "`n4. Waiting for cleanup to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 5: Check if we're in the right directory
Write-Host "`n5. Checking project directory..." -ForegroundColor Yellow
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Project directory confirmed" -ForegroundColor Green

# Step 6: Install dependencies if needed
Write-Host "`n6. Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    pnpm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Step 7: Start servers
Write-Host "`n7. Starting servers..." -ForegroundColor Yellow
Write-Host "Starting backend, admin panel, and user panel..." -ForegroundColor Gray

# Start the development servers in background
$serverProcess = Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow -PassThru
Write-Host "✅ Servers starting in background (PID: $($serverProcess.Id))" -ForegroundColor Green

# Step 8: Wait for servers to initialize
Write-Host "`n8. Waiting for servers to initialize..." -ForegroundColor Yellow
Write-Host "This may take 15-30 seconds..." -ForegroundColor Gray

$maxWait = 30
$waited = 0
$allServersRunning = $false

while ($waited -lt $maxWait -and !$allServersRunning) {
    Start-Sleep -Seconds 2
    $waited += 2
    
    $backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    $adminRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    $userRunning = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
    
    if ($backendRunning -and $adminRunning -and $userRunning) {
        $allServersRunning = $true
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

# Step 9: Verify server status
Write-Host "`n9. Verifying server status..." -ForegroundColor Yellow
$servers = @(
    @{ Port = 3000; Name = "Admin Panel"; URL = "http://localhost:3000" },
    @{ Port = 3001; Name = "Backend API"; URL = "http://localhost:3001" },
    @{ Port = 3002; Name = "User Panel"; URL = "http://localhost:3002" }
)

foreach ($server in $servers) {
    $connection = Get-NetTCPConnection -LocalPort $server.Port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "✅ ${server.Name} (Port ${server.Port}): RUNNING" -ForegroundColor Green
    } else {
        Write-Host "❌ ${server.Name} (Port ${server.Port}): NOT RUNNING" -ForegroundColor Red
    }
}

# Step 10: Test API endpoints
Write-Host "`n10. Testing API endpoints..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body '{"username":"testuser1","password":"Test123!"}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Backend API: WORKING" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 11: Get network IP for external access
Write-Host "`n11. Getting network information..." -ForegroundColor Yellow
try {
    $networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" }
    if ($networkAdapters) {
        $localIP = $networkAdapters[0].IPAddress
        Write-Host "✅ Local IP Address: $localIP" -ForegroundColor Green
    } else {
        $localIP = "localhost"
        Write-Host "ℹ️ Using localhost (no network IP found)" -ForegroundColor Gray
    }
} catch {
    $localIP = "localhost"
    Write-Host "ℹ️ Using localhost" -ForegroundColor Gray
}

# Step 12: Open browsers
Write-Host "`n12. Opening browsers..." -ForegroundColor Yellow

# Open User Panel in Chrome
try {
    Start-Process "chrome.exe" -ArgumentList "http://localhost:3002", "http://$localIP:3002" -ErrorAction SilentlyContinue
    Write-Host "✅ User Panel opened in Chrome (localhost and network)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to open Chrome - please open manually" -ForegroundColor Red
}

# Open Admin Panel in Chrome
try {
    Start-Process "chrome.exe" -ArgumentList "http://localhost:3000", "http://$localIP:3000" -ErrorAction SilentlyContinue
    Write-Host "✅ Admin Panel opened in Chrome (localhost and network)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to open Chrome - please open manually" -ForegroundColor Red
}

# Step 13: Display final information
Write-Host "`n🎉 Win5x Servers Started Successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`n🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Local Access:" -ForegroundColor Yellow
Write-Host "  • User Panel:  http://localhost:3002" -ForegroundColor White
Write-Host "  • Admin Panel: http://localhost:3000" -ForegroundColor White
Write-Host "  • Backend API: http://localhost:3001" -ForegroundColor White

Write-Host "`nNetwork Access (for mobile/other devices):" -ForegroundColor Yellow
Write-Host "  • User Panel:  http://$localIP:3002" -ForegroundColor White
Write-Host "  • Admin Panel: http://$localIP:3000" -ForegroundColor White
Write-Host "  • Backend API: http://$localIP:3001" -ForegroundColor White

Write-Host "`n🔑 Login Credentials:" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Admin Panel:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: Admin123!" -ForegroundColor White

Write-Host "`nUser Panel:" -ForegroundColor Yellow
Write-Host "  Username: testuser1, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser2, Password: Test123!" -ForegroundColor White
Write-Host "  Username: testuser3, Password: Test123!" -ForegroundColor White

Write-Host "`n📱 Mobile Access:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Use the network URLs above to access from mobile devices on the same network" -ForegroundColor White
Write-Host "Make sure your firewall allows connections on ports 3000, 3001, 3002" -ForegroundColor White

Write-Host "`n⚠️ Important Notes:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
Write-Host "• Keep this terminal open to keep servers running" -ForegroundColor White
Write-Host "• Press Ctrl+C to stop all servers" -ForegroundColor White
Write-Host "• If login fails, wait a few more seconds for servers to fully start" -ForegroundColor White
Write-Host "• Check browser console (F12) for any JavaScript errors" -ForegroundColor White

Write-Host "`n✨ Ready to play! Enjoy Win5x! 🎮" -ForegroundColor Green
