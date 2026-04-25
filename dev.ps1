# APIvault — Dev Runner
# Run: powershell -ExecutionPolicy Bypass -File dev.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`nStarting APIvault dev environment..." -ForegroundColor Cyan

# Start server in background
$server = Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$root\server'; Write-Host 'SERVER' -ForegroundColor Green; npm run dev" `
  -PassThru

# Start client in background
$client = Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$root\client'; Write-Host 'CLIENT' -ForegroundColor Blue; npm run dev" `
  -PassThru

Write-Host ""
Write-Host "  Server → http://localhost:3000" -ForegroundColor Green
Write-Host "  Client → http://localhost:5173" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop both processes" -ForegroundColor Gray

# Wait and clean up on exit
try {
  Wait-Process -Id $server.Id, $client.Id
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $client.Id -Force -ErrorAction SilentlyContinue
}
