# Win5x Authentication Test Script (Simple Version)
Write-Host "Win5x Authentication Test Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# API Base URL
$API_BASE = "http://localhost:3001/api"

Write-Host ""
Write-Host "Testing Pre-created Test Users..." -ForegroundColor Yellow

$testUsers = @(
    @{ username = "testuser1"; password = "Test123!" },
    @{ username = "testuser2"; password = "Test123!" },
    @{ username = "testuser3"; password = "Test123!" }
)

foreach ($user in $testUsers) {
    try {
        Write-Host "Testing login for $($user.username)..." -ForegroundColor Gray
        
        $loginResponse = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body ($user | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "SUCCESS: $($user.username) login successful!" -ForegroundColor Green
        Write-Host "   Betting Wallet: Rs$($loginResponse.data.user.walletBetting)" -ForegroundColor Gray
        Write-Host "   Gaming Wallet: Rs$($loginResponse.data.user.walletGaming)" -ForegroundColor Gray
        
    } catch {
        Write-Host "FAILED: $($user.username) login failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Testing Admin Login..." -ForegroundColor Yellow

try {
    $adminLogin = @{
        username = "admin"
        password = "Admin123!"
    }
    
    $adminResponse = Invoke-RestMethod -Uri "$API_BASE/auth/admin/login" -Method POST -Body ($adminLogin | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "SUCCESS: Admin login successful!" -ForegroundColor Green
    Write-Host "Admin: $($adminResponse.data.admin.username)" -ForegroundColor Gray
    Write-Host "Role: $($adminResponse.data.admin.role)" -ForegroundColor Gray
    
} catch {
    Write-Host "FAILED: Admin login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan
Write-Host "- Test users login: Tested" -ForegroundColor White
Write-Host "- Admin login: Tested" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3002 (User Panel)" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 (Admin Panel)" -ForegroundColor White
Write-Host "3. Test the web interface with the credentials above" -ForegroundColor White

Write-Host ""
Write-Host "Authentication test completed!" -ForegroundColor Green
