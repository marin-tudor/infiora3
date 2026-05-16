param(
  [string[]]$Roots = @(
    'tests',
    'tools',
    'docs/active-system.md',
    'docs/alternative-stacks.md',
    'README.md',
    'start-infiora-all.bat',
    'playwright.config.ts',
    'infiora-backend-main/infiora-backend-main/src',
    'infiora-app-main/infiora-app-main/src',
    'infiora-admin-main/infiora-admin-main/src'
  )
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$allowedExtensions = @('.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.ps1', '.bat')
$matches = @()

$patterns = @(
  ([string][char]0x00E2 + [string][char]0x20AC),
  ([string][char]0x00C2 + [string][char]0x00B7),
  ([string][char]0x00C2 + ' '),
  ([string][char]0x00C3 + [string][char]0x2014),
  ([string][char]0x0102 + [string][char]0x2014),
  ([string][char]0x0111 + [string][char]0x017A),
  ([string][char]0x00E2 + [string][char]0x015B),
  ([string][char]0x00E2 + [string][char]0x0165),
  ([string][char]0x00E2 + [string][char]0x0161),
  ([string][char]0x00E2 + [string][char]0x0131)
)

foreach ($root in $Roots) {
  $fullRoot = Join-Path $repoRoot $root
  if (!(Test-Path $fullRoot)) {
    continue
  }

  $items = if ((Get-Item $fullRoot) -is [System.IO.FileInfo]) {
    @(Get-Item $fullRoot)
  } else {
    Get-ChildItem -Path $fullRoot -Recurse -File | Where-Object {
      $allowedExtensions -contains $_.Extension
    }
  }

  $items | ForEach-Object {
    $path = $_.FullName
    $content = [System.IO.File]::ReadAllText($path)

    foreach ($pattern in $patterns) {
      if ($content.Contains($pattern)) {
        $matches += [pscustomobject]@{
          File = $path.Replace($repoRoot + [IO.Path]::DirectorySeparatorChar, '')
          Pattern = $pattern
        }
      }
    }
  }
}

if ($matches.Count -gt 0) {
  $lines = $matches | ForEach-Object { "- $($_.File) [$($_.Pattern)]" }
  throw ("Potential mojibake detected:`n" + ($lines -join "`n"))
}

Write-Host 'Text encoding check passed.'
