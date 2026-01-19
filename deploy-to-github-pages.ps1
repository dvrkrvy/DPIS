# PowerShell script to deploy to GitHub Pages
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying to GitHub Pages" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

try {
    # Navigate to project root
    Set-Location $PSScriptRoot

    # Step 1: Build frontend
    Write-Host "Step 1: Building frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed!"
    }

    Write-Host ""
    Write-Host "Step 2: Deploying to GitHub Pages..." -ForegroundColor Yellow
    npm run deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed!"
    }

    Write-Host ""
    Write-Host "Step 3: Committing and pushing changes..." -ForegroundColor Yellow
    Set-Location ..
    git add .
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Deploy to GitHub Pages - $timestamp"
    git push origin main

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host "Your site should be available at: https://dvrkrvy.github.io/DPIS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}
