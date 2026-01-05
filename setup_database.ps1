# Database Setup Script for DPIS
Write-Host "========================================="
Write-Host "DPIS Database Setup"
Write-Host "========================================="
Write-Host ""

# Find PostgreSQL installation
$pgPath = $null
$versions = @("16", "15", "14", "13", "12")

foreach ($v in $versions) {
    $path64 = "C:\Program Files\PostgreSQL\$v\bin\psql.exe"
    $path32 = "C:\Program Files (x86)\PostgreSQL\$v\bin\psql.exe"
    
    if (Test-Path $path64) {
        $pgPath = "C:\Program Files\PostgreSQL\$v\bin"
        Write-Host "Found PostgreSQL $v at: $pgPath"
        break
    } elseif (Test-Path $path32) {
        $pgPath = "C:\Program Files (x86)\PostgreSQL\$v\bin"
        Write-Host "Found PostgreSQL $v at: $pgPath"
        break
    }
}

if (-not $pgPath) {
    Write-Host "ERROR: PostgreSQL not found!"
    Write-Host "Please ensure PostgreSQL is installed."
    Write-Host "Common locations:"
    Write-Host "  - C:\Program Files\PostgreSQL\16\bin"
    Write-Host "  - C:\Program Files\PostgreSQL\15\bin"
    pause
    exit 1
}

$psql = "$pgPath\psql.exe"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$initScript = Join-Path $scriptDir "backend\config\init.sql"

# Get password
Write-Host ""
$password = Read-Host "Enter PostgreSQL password for user 'postgres' (default: postgres)"
if ([string]::IsNullOrWhiteSpace($password)) {
    $password = "postgres"
}
$env:PGPASSWORD = $password

Write-Host ""
Write-Host "Creating database..."
& $psql -U postgres -c "CREATE DATABASE dpis_db;" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database created (or already exists)"
} else {
    Write-Host "⚠️  Database creation had issues (may already exist)"
}

Write-Host ""
Write-Host "Initializing database schema..."
& $psql -U postgres -d dpis_db -f $initScript 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema initialized!"
} else {
    Write-Host "⚠️  Schema initialization had issues"
}

Write-Host ""
Write-Host "Verifying tables..."
$tables = & $psql -U postgres -d dpis_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
if ($tables -match '\d+') {
    Write-Host "✅ Found $($matches[0]) tables in database"
} else {
    Write-Host "⚠️  Could not verify tables"
}

Write-Host ""
Write-Host "========================================="
Write-Host "Database setup complete!"
Write-Host "========================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update backend\.env file with your PostgreSQL password"
Write-Host "2. Start backend server: cd backend && npm run dev"
Write-Host "3. Start frontend server: cd frontend && npm start"
Write-Host ""
pause
