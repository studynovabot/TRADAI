# Deploy to Vercel script
Write-Host "Preparing for Vercel deployment..." -ForegroundColor Cyan

# Backup original files
Write-Host "Backing up original files..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination "package.json.bak" -Force
Copy-Item -Path "vercel.json" -Destination "vercel.json.bak" -Force

try {
    # Replace with Vercel-specific files
    Write-Host "Replacing with Vercel-specific files..." -ForegroundColor Yellow
    Copy-Item -Path "vercel-package.json" -Destination "package.json" -Force
    Copy-Item -Path "vercel-deploy.json" -Destination "vercel.json" -Force

    # Deploy to Vercel
    Write-Host "Deploying to Vercel..." -ForegroundColor Green
    vercel --prod

    # Check deployment status
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
    }
} finally {
    # Restore original files
    Write-Host "Restoring original files..." -ForegroundColor Yellow
    Copy-Item -Path "package.json.bak" -Destination "package.json" -Force
    Copy-Item -Path "vercel.json.bak" -Destination "vercel.json" -Force
    
    # Remove backup files
    Remove-Item -Path "package.json.bak" -Force
    Remove-Item -Path "vercel.json.bak" -Force
}

Write-Host "Deployment process completed!" -ForegroundColor Cyan