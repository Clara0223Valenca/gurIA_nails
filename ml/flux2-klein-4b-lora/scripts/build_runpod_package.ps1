[CmdletBinding()]
param(
    [string]$DestinationPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($DestinationPath)) {
    $DestinationPath = Join-Path $scriptRoot '..\..\guria-nails-flux2-klein-runpod.zip'
}
$destinationFull = [System.IO.Path]::GetFullPath($DestinationPath)
if ($destinationFull.StartsWith($packageRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'O ZIP deve ficar fora da pasta empacotada para evitar inclusao recursiva.'
}

& (Join-Path $scriptRoot 'validate_dataset.ps1') -DatasetRoot (Join-Path $packageRoot 'dataset')
$packageItems = @(
    Get-ChildItem -LiteralPath $packageRoot -Force |
        Where-Object Name -ne 'artifacts'
)
Compress-Archive -Path $packageItems.FullName -DestinationPath $destinationFull -CompressionLevel Optimal -Force

[pscustomobject]@{
    package_root = $packageRoot
    zip = $destinationFull
    size_bytes = (Get-Item -LiteralPath $destinationFull).Length
} | Format-List
