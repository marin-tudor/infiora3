$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'infiora-backend-main/infiora-backend-main'
$routesFile = Join-Path $repoRoot 'infiora-backend-main/infiora-backend-main/src/routes/v1/index.ts'
$outputDir = Join-Path $repoRoot 'packages/infiora-api-contract/generated'
$routeManifestFile = Join-Path $outputDir 'active-routes.json'
$openapiFile = Join-Path $outputDir 'openapi.json'
$typesFile = Join-Path $repoRoot 'packages/infiora-api-contract/types.ts'

if (!(Test-Path $routesFile)) {
  throw "Route file not found: $routesFile"
}

# ── Step 1: Route prefix manifest (backwards-compat) ─────────────────────────
$content = Get-Content $routesFile -Raw
$matchResult = [regex]::Matches($content, "path:\s*'([^']+)'")
$paths = @()

foreach ($match in $matchResult) {
  $pathValue = $match.Groups[1].Value
  if (-not $paths.Contains($pathValue)) {
    $paths += $pathValue
  }
}

$payload = [ordered]@{
  generatedAt  = (Get-Date).ToString('o')
  authority    = 'infiora-backend-main/infiora-backend-main'
  baseUrl      = '/v1'
  routePrefixes = $paths
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$payload | ConvertTo-Json -Depth 5 | Set-Content $routeManifestFile
Write-Host "✓ Route manifest: $routeManifestFile"

# ── Step 2: Full OpenAPI spec from swagger-jsdoc ──────────────────────────────
Write-Host "Generating OpenAPI spec from swagger JSDoc..."
node (Join-Path $PSScriptRoot 'generate-openapi.cjs')
if ($LASTEXITCODE -ne 0) {
  Write-Warning "OpenAPI spec generation failed. Check swagger JSDoc in route files."
} else {
  Write-Host "✓ OpenAPI spec: $openapiFile"
}

# ── Step 3: TypeScript types from openapi-typescript ─────────────────────────
if (Test-Path $openapiFile) {
  Write-Host "Generating TypeScript types from OpenAPI spec..."

  # Try npx openapi-typescript (no global install needed)
  $npxCmd = 'npx'
  $otArgs = @('openapi-typescript', $openapiFile, '--output', $typesFile)

  try {
    & $npxCmd @otArgs 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "✓ TypeScript types: $typesFile"
    } else {
      Write-Warning "openapi-typescript failed (exit $LASTEXITCODE). Install it: npm i -D openapi-typescript"
    }
  } catch {
    Write-Warning "Could not run openapi-typescript: $_"
    Write-Host "  To generate types manually: npx openapi-typescript $openapiFile -o $typesFile"
  }
} else {
  Write-Warning "openapi.json not found — skipping type generation"
}

Write-Host ""
Write-Host "Done. API contract artifacts:"
Write-Host "  Route manifest : $routeManifestFile"
if (Test-Path $openapiFile)  { Write-Host "  OpenAPI spec   : $openapiFile" }
if (Test-Path $typesFile)    { Write-Host "  TypeScript types: $typesFile" }
