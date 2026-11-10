[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')]
    [string]$KaggleUser,

    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $scriptRoot '..\artifacts\kaggle-upload'
}
$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$datasetRoot = Join-Path $packageRoot 'dataset'
$outputFull = [System.IO.Path]::GetFullPath($OutputRoot)
$artifactsRoot = [System.IO.Path]::GetFullPath((Join-Path $packageRoot 'artifacts'))
$artifactsPrefix = $artifactsRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar

if (-not $outputFull.StartsWith($artifactsPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Por seguranca, OutputRoot deve ficar dentro de $artifactsRoot"
}

& (Join-Path $packageRoot 'scripts\validate_dataset.ps1') -DatasetRoot $datasetRoot

if (Test-Path -LiteralPath $outputFull -PathType Container) {
    Remove-Item -LiteralPath $outputFull -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $outputFull | Out-Null
$trainingDestination = Join-Path $outputFull 'train'
$transparentDestination = Join-Path $outputFull 'transparent-originals'
Copy-Item -LiteralPath (Join-Path $datasetRoot 'reviewed\main_train_rgb') -Destination $trainingDestination -Recurse -Force
Copy-Item -LiteralPath (Join-Path $datasetRoot 'reviewed\main_rgba') -Destination $transparentDestination -Recurse -Force
Copy-Item -LiteralPath (Join-Path $datasetRoot 'review_manifest.csv') -Destination $outputFull -Force
Copy-Item -LiteralPath (Join-Path $datasetRoot 'review_manifest.jsonl') -Destination $outputFull -Force
Copy-Item -LiteralPath (Join-Path $datasetRoot 'DATASET_CARD.md') -Destination $outputFull -Force

$templatePath = Join-Path $scriptRoot 'dataset-metadata.template.json'
$metadataText = [System.IO.File]::ReadAllText($templatePath).Replace('__KAGGLE_USER__', $KaggleUser)
[System.IO.File]::WriteAllText(
    (Join-Path $outputFull 'dataset-metadata.json'),
    $metadataText,
    [System.Text.UTF8Encoding]::new($false)
)

$zipPath = Join-Path $artifactsRoot "guria-nails-flux2-klein-kaggle-$KaggleUser.zip"
if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
    Remove-Item -LiteralPath $zipPath -Force
}

# Compress-Archive no Windows grava separadores "\" dentro do ZIP. O Kaggle
# rejeita esses nomes. Criamos cada entrada explicitamente com "/".
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipStream = $null
$zipArchive = $null
try {
    $zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
    $zipArchive = [System.IO.Compression.ZipArchive]::new(
        $zipStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false
    )
    foreach ($file in Get-ChildItem -LiteralPath $outputFull -File -Recurse | Sort-Object FullName) {
        $relativeName = $file.FullName.Substring($outputFull.Length)
        $relativeName = $relativeName.TrimStart([char[]]@([char]'\', [char]'/')).Replace('\', '/')
        $entry = $zipArchive.CreateEntry($relativeName, [System.IO.Compression.CompressionLevel]::Optimal)
        $inputStream = $null
        $entryStream = $null
        try {
            $inputStream = [System.IO.File]::OpenRead($file.FullName)
            $entryStream = $entry.Open()
            $inputStream.CopyTo($entryStream)
        }
        finally {
            if ($null -ne $entryStream) { $entryStream.Dispose() }
            if ($null -ne $inputStream) { $inputStream.Dispose() }
        }
    }
}
finally {
    if ($null -ne $zipArchive) { $zipArchive.Dispose() }
    if ($null -ne $zipStream) { $zipStream.Dispose() }
}

[pscustomobject]@{
    upload_folder = $outputFull
    zip = $zipPath
    kaggle_id = "$KaggleUser/guria-nails-flux2-klein"
    create_command = "kaggle datasets create -p `"$outputFull`" -r zip"
} | Format-List
