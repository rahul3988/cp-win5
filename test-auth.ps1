# Win5x Authentication Test Script
# This script tests user registration and login functionality

Write-Host "🧪 Win5x Authentication Test Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# API Base URL
$API_BASE = "http://localhost:3001/api"

# Test user data
$testUser = @{
    username = "testuser$(Get-Random -Minimum 1000 -Maximum 9999)"
    email = "test$(Get-Random -Minimum 1000 -Maximum 9999)@win5x.com"
    password = "Test123!"
}

Write-Host "`n📝 Testing User Registration..." -ForegroundColor Yellow
Write-Host "Username: $($testUser.username)" -ForegroundColor Gray
Write-Host "Email: $($testUser.email)" -ForegroundColor Gray

try {
    # Test user registration
    $registerResponse = Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body ($testUser | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
    Write-Host "Access Token: $($registerResponse.data.accessToken.Substring(0, 20))..." -ForegroundColor Gray
    
    # Store credentials for login test
    $global:testCredentials = @{
        username = $testUser.username
        password = $testUser.password
    }
    
} catch {
    Write-Host "❌ Registration failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 400) {
        $errorDetails = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorDetails)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n🔐 Testing User Login..." -ForegroundColor Yellow

try {
    # Test user login
    $loginData = @{
        username = $testUser.username
        password = $testUser.password
    }
    
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body ($loginData | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Welcome: $($loginResponse.data.user.username)" -ForegroundColor Gray
    Write-Host "Email: $($loginResponse.data.user.email)" -ForegroundColor Gray
    Write-Host "Betting Wallet: ₹$($loginResponse.data.user.walletBetting)" -ForegroundColor Gray
    Write-Host "Gaming Wallet: ₹$($loginResponse.data.user.walletGaming)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🧪 Testing Pre-created Test Users..." -ForegroundColor Yellow

$testUsers = @(
    @{ username = "testuser1"; password = "Test123!" },
    @{ username = "testuser2"; password = "Test123!" },
    @{ username = "testuser3"; password = "Test123!" }
)

foreach ($user in $testUsers) {
    try {
        Write-Host "Testing login for $($user.username)..." -ForegroundColor Gray
        
        $loginResponse = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body ($user | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "✅ $($user.username) login successful!" -ForegroundColor Green
        Write-Host "   Betting Wallet: ₹$($loginResponse.data.user.walletBetting)" -ForegroundColor Gray
        Write-Host "   Gaming Wallet: ₹$($loginResponse.data.user.walletGaming)" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ $($user.username) login failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🔑 Testing Admin Login..." -ForegroundColor Yellow

try {
    $adminLogin = @{
        username = "admin"
        password = "Admin123!"
    }
    
    $adminResponse = Invoke-RestMethod -Uri "$API_BASE/auth/admin/login" -Method POST -Body ($adminLogin | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ Admin login successful!" -ForegroundColor Green
    Write-Host "Admin: $($adminResponse.data.admin.username)" -ForegroundColor Gray
    Write-Host "Role: $($adminResponse.data.admin.role)" -ForegroundColor Gray
    $permissions = $adminResponse.data.admin.permissions -join ", "
    Write-Host "Permissions: $permissions" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Admin login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Test Summary:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "• User registration: Tested" -ForegroundColor White
Write-Host "• User login: Tested" -ForegroundColor White
Write-Host "• Test users login: Tested" -ForegroundColor White
Write-Host "• Admin login: Tested" -ForegroundColor White

Write-Host "`n🌐 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3002 (User Panel)" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 (Admin Panel)" -ForegroundColor White
Write-Host "3. Test the web interface with the credentials above" -ForegroundColor White

Write-Host "`n✨ Authentication test completed!" -ForegroundColor Green
