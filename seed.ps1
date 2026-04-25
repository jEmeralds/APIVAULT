# APIvault — Seed Script
# Creates admin user + default APIs + user_api_access trigger
# Run AFTER setup.ps1 and AFTER filling server/.env
# powershell -ExecutionPolicy Bypass -File seed.ps1

$ErrorActionPreference = "Stop"

# PSScriptRoot works whether run as a file or pasted into terminal
if ($PSScriptRoot) {
  $root = $PSScriptRoot
} else {
  $root = Split-Path -Parent (Get-Location).Path
}

Write-Host "`nAPIvault Seed" -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor Gray

# Load .env
$env_path = Join-Path $root "server\.env"

if (-not (Test-Path $env_path)) {
  Write-Host "ERROR: server\.env not found at $env_path" -ForegroundColor Red
  Write-Host "Make sure you are running this from the apivault project root" -ForegroundColor Yellow
  exit 1
}

Get-Content $env_path | ForEach-Object {
  if ($_ -match "^\s*([^#][^=]+)=(.+)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}

$url = [System.Environment]::GetEnvironmentVariable("SUPABASE_URL")
$key = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_KEY")

if (-not $url -or $url -eq "your_supabase_url") {
  Write-Host "ERROR: SUPABASE_URL not set in server\.env" -ForegroundColor Red
  exit 1
}
if (-not $key -or $key -eq "your_service_key") {
  Write-Host "ERROR: SUPABASE_SERVICE_KEY not set in server\.env" -ForegroundColor Red
  exit 1
}

Write-Host "Supabase: $url" -ForegroundColor Gray

function Invoke-Supabase($table, $body) {
  $headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
  }
  $resp = Invoke-RestMethod -Uri "$url/rest/v1/$table" -Method POST `
    -Headers $headers -Body ($body | ConvertTo-Json -Depth 5)
  return $resp
}

# 1. Create admin user (or fetch existing)
Write-Host "`n>> Creating admin user" -ForegroundColor Cyan
$adminEmail = Read-Host "  Admin email"

# Try to fetch existing user first
$getHeaders = @{ "apikey" = $key; "Authorization" = "Bearer $key" }
$existing = Invoke-RestMethod -Uri "$url/rest/v1/users?email=eq.$adminEmail&select=id,vault_key" -Headers $getHeaders

if ($existing -and $existing.Count -gt 0) {
  $admin = $existing[0]
  Write-Host "  Admin already exists - fetching vault key" -ForegroundColor Yellow
} else {
  $admin = Invoke-Supabase "users" @{
    email     = $adminEmail
    role      = "admin"
    credits   = 9999.0
    plan      = "business"
    status    = "active"
  }
}

$adminKey = $admin.vault_key
Write-Host "  Admin vault key: sk-vault-$adminKey" -ForegroundColor Green
Write-Host "  SAVE THIS - you will not see it again" -ForegroundColor Yellow

# Create access record for admin (ignore if exists)
try {
  Invoke-Supabase "user_api_access" @{
    user_id     = $admin.id
    categories  = @("ai","payments","comms","data","dev")
    daily_limit = 99999
  } | Out-Null
} catch { }

# 2. Seed default API entries
Write-Host "`n>> Seeding API registry stubs" -ForegroundColor Cyan

$poolHeaders = @{
  "apikey"        = $key
  "Authorization" = "Bearer $key"
}
$pools = Invoke-RestMethod -Uri "$url/rest/v1/pools?select=id,name" -Headers $poolHeaders

function Get-PoolId($name) {
  return ($pools | Where-Object { $_.name -eq $name }).id
}

$apis = @(
  @{ slug="grok-image";  name="Grok Image";   category="ai";       pool="ai_pool";    cost=0.07;  markup=71;  upstream="https://api.x.ai/v1" }
  @{ slug="gpt4o";       name="GPT-4o";        category="ai";       pool="ai_pool";    cost=0.005; markup=60;  upstream="https://api.openai.com/v1" }
  @{ slug="heygen";      name="HeyGen";        category="ai";       pool="ai_pool";    cost=0.50;  markup=20;  upstream="https://api.heygen.com/v2" }
  @{ slug="stripe";      name="Stripe";        category="payments"; pool="pay_pool";   cost=0.0;   markup=0;   upstream="https://api.stripe.com/v1" }
  @{ slug="mpesa";       name="M-Pesa";        category="payments"; pool="pay_pool";   cost=0.0;   markup=0;   upstream="https://sandbox.safaricom.co.ke" }
  @{ slug="twilio";      name="Twilio SMS";    category="comms";    pool="comms_pool"; cost=0.008; markup=12;  upstream="https://api.twilio.com/2010-04-01" }
  @{ slug="sendgrid";    name="SendGrid";      category="comms";    pool="comms_pool"; cost=0.0;   markup=0;   upstream="https://api.sendgrid.com/v3" }
  @{ slug="newsapi";     name="NewsAPI";       category="data";     pool="data_pool";  cost=0.001; markup=100; upstream="https://newsapi.org/v2" }
  @{ slug="openweather"; name="OpenWeather";   category="data";     pool="data_pool";  cost=0.0;   markup=0;   upstream="https://api.openweathermap.org/data/2.5" }
  @{ slug="github";      name="GitHub API";    category="dev";      pool="dev_pool";   cost=0.0;   markup=0;   upstream="https://api.github.com" }
)

foreach ($a in $apis) {
  $poolId = Get-PoolId $a.pool
  if (-not $poolId) {
    Write-Host "  SKIP $($a.slug) - pool $($a.pool) not found" -ForegroundColor Yellow
    continue
  }
  try {
    Invoke-Supabase "api_registry" @{
      slug           = $a.slug
      name           = $a.name
      category       = $a.category
      pool_id        = $poolId
      upstream_url   = $a.upstream
      master_key_ref = "pending_$($a.slug)"
      cost_per_call  = $a.cost
      markup         = $a.markup
      status         = "paused"
    } | Out-Null
    Write-Host "  OK  $($a.slug)" -ForegroundColor Green
  } catch {
    Write-Host "  SKIP $($a.slug) - already exists" -ForegroundColor Gray
  }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Seed complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin vault key: sk-vault-$adminKey" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Log into the admin dashboard with the key above"
Write-Host "  2. Go to APIs and add master keys for each service"
Write-Host "  3. Set each API status to live once the key is added"
Write-Host ""