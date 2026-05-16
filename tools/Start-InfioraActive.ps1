$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$apps = @(
  @{
    Name = 'Infiora Admin'
    Path = 'infiora-admin-main/infiora-admin-main'
    Command = 'npm run dev'
    Url = 'http://localhost:4000'
  },
  @{
    Name = 'Infiora App'
    Path = 'infiora-app-main/infiora-app-main'
    Command = 'npm run dev'
    Url = 'http://localhost:4002'
  },
  @{
    Name = 'Infiora Backend'
    Path = 'infiora-backend-main/infiora-backend-main'
    Command = 'npm run dev'
    Url = 'http://localhost:8080'
  }
)

foreach ($app in $apps) {
  $workingDirectory = Join-Path $repoRoot $app.Path
  $launchCommand = "Set-Location '$workingDirectory'; $($app.Command)"

  Start-Process powershell -ArgumentList @('-NoExit', '-Command', $launchCommand) -WorkingDirectory $workingDirectory
  Write-Host "Started $($app.Name) at $($app.Url)"
}

Write-Host ''
Write-Host 'Default active stack started.'
Write-Host 'Note: infiora-dash-main is excluded from the default Wave 3 startup path.'
