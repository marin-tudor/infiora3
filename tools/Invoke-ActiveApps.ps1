param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('install', 'lint', 'test', 'build')]
  [string]$Command
)

$ErrorActionPreference = 'Stop'

$apps = @(
  @{
    Name = 'backend'
    Path = 'infiora-backend-main/infiora-backend-main'
    CommandMap = @{
      install = 'npm install'
      lint = 'npm run lint'
      test = 'npm test'
      build = 'npm run compile'
    }
  },
  @{
    Name = 'admin'
    Path = 'infiora-admin-main/infiora-admin-main'
    CommandMap = @{
      install = 'npm install --legacy-peer-deps'
      lint = 'npm run lint'
      test = ''
      build = 'npm run build'
    }
  },
  @{
    Name = 'app'
    Path = 'infiora-app-main/infiora-app-main'
    CommandMap = @{
      install = 'npm install'
      lint = 'npm run lint'
      test = ''
      build = 'npm run build'
    }
  }
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$failures = @()

foreach ($app in $apps) {
  $appPath = Join-Path $repoRoot $app.Path
  $script = $app.CommandMap[$Command]

  if ([string]::IsNullOrWhiteSpace($script)) {
    Write-Host "Skipping $($app.Name): no '$Command' command defined."
    continue
  }

  Write-Host "==> $($app.Name): $script"
  Push-Location $appPath
  try {
    $parts = $script -split ' '
    & $parts[0] @($parts[1..($parts.Length - 1)])
    if ($LASTEXITCODE -ne 0) {
      $failures += "$($app.Name) ($script)"
    }
  } catch {
    $failures += "$($app.Name) ($script): $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
}

if ($failures.Count -gt 0) {
  Write-Error ("Active app command failures:`n- " + ($failures -join "`n- "))
}
