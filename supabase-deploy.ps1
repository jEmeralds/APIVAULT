# APIvault — Supabase Direct Deploy
# Run: powershell -ExecutionPolicy Bypass -File supabase-deploy.ps1

if ($PSScriptRoot) { $root = $PSScriptRoot }
else { $root = (Get-Location).Path }

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "   ERR $msg" -ForegroundColor Red; exit 1 }

# ─── Step 1: Install Supabase CLI directly (no Scoop needed) ──────────────

Write-Step "Checking Supabase CLI"

$cliInstalled = $false
try { supabase --version 2>$null | Out-Null; $cliInstalled = $true } catch { }

if (-not $cliInstalled) {
  Write-Host "   Downloading Supabase CLI from GitHub..." -ForegroundColor Gray

  $cliDir  = Join-Path $env:LOCALAPPDATA "supabase"
  $tarPath = Join-Path $env:TEMP "supabase_cli.tar.gz"

  New-Item -ItemType Directory -Force -Path $cliDir | Out-Null

  $downloadUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $tarPath -UseBasicParsing
  tar -xzf $tarPath -C $cliDir
  Remove-Item $tarPath -Force

  # Add to PATH for this session and permanently
  $env:PATH = "$cliDir;$env:PATH"
  $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
  if ($userPath -notlike "*$cliDir*") {
    [System.Environment]::SetEnvironmentVariable("PATH", "$cliDir;$userPath", "User")
  }

  Write-OK "Supabase CLI installed to $cliDir"
}

try {
  $v = supabase --version
  Write-OK "Supabase CLI: $v"
} catch {
  Write-Err "CLI not found after install. Try manually: https://supabase.com/docs/guides/cli"
}

# ─── Step 2: Login ────────────────────────────────────────────────────────

Write-Step "Logging into Supabase"
Write-Host "   Your browser will open to authenticate" -ForegroundColor Gray
Write-Host "   Press Enter to continue..." -ForegroundColor Gray
Read-Host | Out-Null

supabase login
Write-OK "Logged in"

# ─── Step 3: Project reference ────────────────────────────────────────────

Write-Step "Enter your Supabase project reference"
Write-Host "   Supabase dashboard -> Settings -> General -> Reference ID" -ForegroundColor Gray
Write-Host "   Example: egbpfvbtjcmjmsnesteq" -ForegroundColor Gray
Write-Host ""
$projectRef = Read-Host "   Reference ID"

if ($projectRef.Length -lt 10) {
  Write-Err "Reference ID too short. Check and re-run."
}

# ─── Step 4: Init + stage migration ──────────────────────────────────────

Write-Step "Setting up Supabase config"
Set-Location $root

if (-not (Test-Path (Join-Path $root "supabase"))) {
  supabase init
  Write-OK "supabase/ created"
} else {
  Write-OK "supabase/ already exists"
}

$migrationsDir = Join-Path $root "supabase\migrations"
New-Item -ItemType Directory -Force -Path $migrationsDir | Out-Null

$source    = Join-Path $root "server\db\migrations.sql"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$dest      = Join-Path $migrationsDir "${timestamp}_apivault_init.sql"

if (-not (Test-Path $source)) { Write-Err "server\db\migrations.sql not found." }

[System.IO.File]::Copy($source, $dest, $true)
Write-OK "Migration staged at supabase\migrations\"

# ─── Step 5: Link + push ──────────────────────────────────────────────────

Write-Step "Linking to project $projectRef"
supabase link --project-ref $projectRef
Write-OK "Linked"

Write-Step "Pushing migration"
Write-Host "   Press Enter to confirm, Ctrl+C to cancel..." -ForegroundColor Gray
Read-Host | Out-Null

supabase db push
Write-OK "Migration pushed"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database ready" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: powershell -ExecutionPolicy Bypass -File seed.ps1"
Write-Host ""