# APIvault — Project Bootstrap
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

if ($PSScriptRoot) { $root = $PSScriptRoot }
else { $root = (Get-Location).Path }

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   !!  $msg" -ForegroundColor Yellow }

Write-Step "Creating project structure"

$dirs = @(
  "server\middleware",
  "server\services",
  "server\routes",
  "server\db",
  "client\src\pages",
  "client\src\components",
  "client\src\lib"
)
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path (Join-Path $root $d) | Out-Null
  Write-OK $d
}

Write-Step "Checking Node.js"
try {
  $v = node --version
  Write-OK "Node $v found"
} catch {
  Write-Warn "Node.js not found. Install from https://nodejs.org"
  exit 1
}

Write-Step "Installing server dependencies"
Set-Location (Join-Path $root "server")
node -e "
const fs = require('fs');
const pkg = {
  name: 'apivault-server',
  version: '1.0.0',
  type: 'module',
  main: 'index.js',
  scripts: { start: 'node index.js', dev: 'node --watch index.js' },
  dependencies: {
    '@supabase/supabase-js': '^2.39.0',
    'cors': '^2.8.5',
    'dotenv': '^16.4.1',
    'express': '^4.18.2'
  }
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
npm install --silent
Write-OK "Server packages installed"

Write-Step "Installing client dependencies"
Set-Location (Join-Path $root "client")
node -e "
const fs = require('fs');
const pkg = {
  name: 'apivault-client',
  version: '1.0.0',
  private: true,
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  dependencies: {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    'react-router-dom': '^6.22.0',
    '@supabase/supabase-js': '^2.39.0'
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.2.1',
    'autoprefixer': '^10.4.17',
    'postcss': '^8.4.35',
    'tailwindcss': '^3.4.1',
    'vite': '^5.1.0'
  }
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
npm install --silent
Write-OK "Client packages installed"

Write-Step "Creating .env files"
Set-Location $root

$serverEnv = @"
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret
PORT=3000
"@
$serverEnv | Out-File -FilePath (Join-Path $root "server\.env") -Encoding utf8
Write-OK "server\.env created"

$clientEnv = @"
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
"@
$clientEnv | Out-File -FilePath (Join-Path $root "client\.env") -Encoding utf8
Write-OK "client\.env created"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Scaffold complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Fill in server\.env  (Supabase + Paystack keys)"
Write-Host "  2. Fill in client\.env  (Supabase URL + anon key)"
Write-Host "  3. Run migrations.sql in your Supabase SQL editor"
Write-Host "  4. Run seed.ps1 to create your admin user"
Write-Host "  5. Run dev.ps1 to start both server and client"
Write-Host ""