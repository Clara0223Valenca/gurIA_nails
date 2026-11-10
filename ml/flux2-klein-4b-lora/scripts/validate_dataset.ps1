[CmdletBinding()]
param(
    [string]$DatasetRoot = '',
    [string]$SourceRoot = '',
    [string]$ReportDirectory = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($DatasetRoot)) {
    $DatasetRoot = Join-Path $scriptRoot '..\dataset'
}
if ([string]::IsNullOrWhiteSpace($ReportDirectory)) {
    $ReportDirectory = Join-Path $scriptRoot '..\reports'
}

$auditScript = Join-Path $scriptRoot 'audit_reviewed_dataset.ps1'
if (-not (Test-Path -LiteralPath $auditScript -PathType Leaf)) {
    throw "Auditor ausente: $auditScript"
}

if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
    $semesterRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..\..\..\..'))
    $sourceParent = Get-ChildItem -LiteralPath $semesterRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -like 'gurIA nails*' -and
            (Test-Path -LiteralPath (Join-Path $_.FullName 'imagens dataset') -PathType Container)
        } |
        Select-Object -First 1
    if ($null -ne $sourceParent) {
        $SourceRoot = Join-Path $sourceParent.FullName 'imagens dataset'
    }
}

if (Test-Path -LiteralPath $SourceRoot -PathType Container) {
    & $auditScript -DatasetRoot $DatasetRoot -SourceRoot $SourceRoot -ReportDirectory $ReportDirectory
}
else {
    Write-Warning "Pasta fonte indisponivel; validando apenas as copias materializadas."
    & $auditScript -DatasetRoot $DatasetRoot -ReportDirectory $ReportDirectory
}

if (-not $?) { exit 1 }
exit 0
