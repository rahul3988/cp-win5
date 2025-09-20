# Comprehensive Login Issue Debug Script
Write-Host "Debugging Win5x Login Issue" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Step 1: Check if servers are running
Write-Host "`n1. Checking Server Status..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "Port ${port}: RUNNING" -ForegroundColor Green
    } else {
        Write-Host "Port ${port}: NOT RUNNING" -ForegroundColor Red
    }
}

# Step 2: Test Backend API directly
Write-Host "`n2. Testing Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body '{"username":"testuser1","password":"Test123!"}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "Backend API: WORKING" -ForegroundColor Green
    Write-Host "Response: $($response.success)" -ForegroundColor Gray
} catch {
    Write-Host "Backend API: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test Admin API
Write-Host "`n3. Testing Admin API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/admin/login" -Method POST -Body '{"username":"admin","password":"Admin123!"}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "Admin API: WORKING" -ForegroundColor Green
    Write-Host "Response: $($response.success)" -ForegroundColor Gray
} catch {
    Write-Host "Admin API: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Check if frontend servers respond
Write-Host "`n4. Testing Frontend Servers..." -ForegroundColor Yellow

# Test User Panel (port 3002)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 5 -UseBasicParsing
    Write-Host "User Panel (3002): WORKING - Status $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "User Panel (3002): FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Admin Panel (port 3000)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "Admin Panel (3000): WORKING - Status $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Admin Panel (3000): FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Check database connection
Write-Host "`n5. Checking Database..." -ForegroundColor Yellow
try {
    Set-Location "packages/backend"
    $dbCheck = pnpm db:generate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database: CONNECTED" -ForegroundColor Green
    } else {
        Write-Host "Database: CONNECTION ISSUE" -ForegroundColor Red
        Write-Host "Error: $dbCheck" -ForegroundColor Red
    }
    Set-Location "../.."
} catch {
    Write-Host "Database: FAILED TO CHECK" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Check environment variables
Write-Host "`n6. Checking Environment..." -ForegroundColor Yellow
if (Test-Path "packages/backend/.env") {
    Write-Host "Backend .env: EXISTS" -ForegroundColor Green
} else {
    Write-Host "Backend .env: MISSING" -ForegroundColor Red
}

# Step 7: Recommendations
Write-Host "`n7. Recommendations:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

if (!(Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue)) {
    Write-Host "- Backend server is not running. Start it with: cd packages/backend && pnpm dev" -ForegroundColor White
}

if (!(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) {
    Write-Host "- Admin panel is not running. Start it with: cd packages/admin && pnpm dev" -ForegroundColor White
}

if (!(Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue)) {
    Write-Host "- User panel is not running. Start it with: cd packages/user && pnpm dev" -ForegroundColor White
}

Write-Host "`n- Try starting all servers with: pnpm dev" -ForegroundColor White
Write-Host "- Check browser console for JavaScript errors" -ForegroundColor White
Write-Host "- Verify you're using the correct URLs:" -ForegroundColor White
Write-Host "  * User Panel: http://localhost:3002" -ForegroundColor Gray
Write-Host "  * Admin Panel: http://localhost:3000" -ForegroundColor Gray
Write-Host "  * Backend API: http://localhost:3001" -ForegroundColor Gray

Write-Host "`nDebug completed!" -ForegroundColor Green
