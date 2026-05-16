$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$requiredPaths = @(
  'README.md',
  'docs/active-system.md',
  'docs/alternative-stacks.md',
  'packages/infiora-api-contract/package.json',
  'infiora-backend-main/infiora-backend-main',
  'infiora-admin-main/infiora-admin-main',
  'infiora-app-main/infiora-app-main'
)

$missing = @()
foreach ($relativePath in $requiredPaths) {
  $fullPath = Join-Path $repoRoot $relativePath
  if (!(Test-Path $fullPath)) {
    $missing += $relativePath
  }
}

& (Join-Path $PSScriptRoot 'Generate-ApiContract.ps1')
& (Join-Path $PSScriptRoot 'Test-TextEncoding.ps1')

$artifactPatterns = @('node_modules/', '.next/', '/dist/', '/logs/', '.tsbuildinfo', 'test-results/')
$trackedArtifacts = & git -C $repoRoot ls-files | Where-Object {
  $f = $_
  $artifactPatterns | Where-Object { $f -like "*$_*" }
}
if ($trackedArtifacts) {
  Write-Error ("Generated artifacts tracked in git (add to .gitignore):`n- " + ($trackedArtifacts -join "`n- "))
}

if ($missing.Count -gt 0) {
  Write-Error ("Workspace validation failed. Missing paths:`n- " + ($missing -join "`n- "))
}

Write-Host 'Workspace validation passed.'
