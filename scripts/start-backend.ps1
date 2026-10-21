param(
  [switch]$Xampp
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$environmentFiles = @('.env')
if ($Xampp) {
  $environmentFiles += '.env.xampp'
}

foreach ($fileName in $environmentFiles) {
  $environmentFile = Join-Path $workspaceRoot $fileName
  if ($Xampp -and $fileName -eq '.env.xampp' -and -not (Test-Path -LiteralPath $environmentFile)) {
    throw 'Arquivo .env.xampp não encontrado. Copie .env.xampp.example para .env.xampp e configure usuário e senha.'
  }
  if (Test-Path -LiteralPath $environmentFile) {
    Get-Content -LiteralPath $environmentFile | ForEach-Object {
      $line = $_.Trim()
      if ($line -and -not $line.StartsWith('#')) {
        $separator = $line.IndexOf('=')
        if ($separator -gt 0) {
          $key = $line.Substring(0, $separator).Trim()
          $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
          [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
      }
    }
  }
}

$hasJdk = $false
if ($env:JAVA_HOME) {
  $hasJdk = Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\javac.exe')
}
if (-not $hasJdk) {
  $jdk = Get-ChildItem -LiteralPath 'C:\Program Files\Java' -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 1
  if ($jdk) {
    $env:JAVA_HOME = $jdk.FullName
    $env:PATH = "$($jdk.FullName)\bin;$env:PATH"
  }
}

$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
$mavenExecutable = if ($mavenCommand) { $mavenCommand.Source } else { $null }
if (-not $mavenExecutable) {
  $mavenCache = Join-Path $env:USERPROFILE '.m2\wrapper\dists'
  $mavenCandidates = foreach ($distribution in (Get-ChildItem -LiteralPath $mavenCache -Directory -Filter 'apache-maven-*' -ErrorAction SilentlyContinue)) {
    foreach ($installation in (Get-ChildItem -LiteralPath $distribution.FullName -Directory -ErrorAction SilentlyContinue)) {
      $candidate = Join-Path $installation.FullName 'bin\mvn.cmd'
      if (Test-Path -LiteralPath $candidate) { $candidate }
    }
  }
  $mavenExecutable = $mavenCandidates | Select-Object -First 1
}
if (-not $mavenExecutable) {
  throw 'Maven não encontrado. Instale Maven 3.6.3 ou superior, ou configure um Maven Wrapper neste projeto.'
}

Set-Location (Join-Path $workspaceRoot 'backend')
& $mavenExecutable spring-boot:run
