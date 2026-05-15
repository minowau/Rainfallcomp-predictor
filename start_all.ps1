Write-Host "Starting Standalone Map System (No Docker Mode)..."

# Skip Docker as it is not available in this environment
# cd e:\maindocuments\fullstackfull\data-engine
# docker-compose up -d

Write-Host "Starting API Backend (Standalone Lite) on Port 8000..."
# Start the Lite server in map-app/server
cd e:\maindocuments\fullstackfull\map-app\server
Start-Process -NoNewWindow -FilePath "python.exe" -ArgumentList "main.py"

Write-Host "Starting Map App Frontend on Port 5173..."
cd e:\maindocuments\fullstackfull\map-app
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run", "dev"

Write-Host "Servers started in Standalone Mode!"
Write-Host "API: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
