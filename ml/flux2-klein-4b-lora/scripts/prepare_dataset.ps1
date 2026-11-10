[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [string]$CatalogPath = (Join-Path $PSScriptRoot '..\dataset\source_catalog.csv'),

    [string]$OutputRoot = (Join-Path $PSScriptRoot '..\dataset')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$sourceRootFull = [System.IO.Path]::GetFullPath($SourceRoot)
$catalogFull = [System.IO.Path]::GetFullPath($CatalogPath)
$outputRootFull = [System.IO.Path]::GetFullPath($OutputRoot)
$transparentRoot = Join-Path $outputRootFull 'train'
$rgbTrainingRoot = Join-Path $outputRootFull 'train_rgb_white'
$splitsRoot = Join-Path $outputRootFull 'splits'

if (-not (Test-Path -LiteralPath $sourceRootFull -PathType Container)) {
    throw "Pasta fonte nao encontrada: $sourceRootFull"
}

if (-not (Test-Path -LiteralPath $catalogFull -PathType Leaf)) {
    throw "Catalogo nao encontrado: $catalogFull"
}

New-Item -ItemType Directory -Force -Path $transparentRoot, $rgbTrainingRoot, $splitsRoot | Out-Null

function Convert-ToBool {
    param([Parameter(Mandatory = $true)][string]$Value)
    return $Value.Trim().ToLowerInvariant() -in @('1', 'true', 'yes', 'sim')
}

function Save-TransparentSourceImage {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    $extension = [System.IO.Path]::GetExtension($SourcePath).ToLowerInvariant()
    if ($extension -eq '.png') {
        Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
        $sourceImage = $null
        try {
            $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
            return [pscustomobject]@{
                source_width = $sourceImage.Width
                source_height = $sourceImage.Height
                prepared_width = $sourceImage.Width
                prepared_height = $sourceImage.Height
                source_pixel_format = $sourceImage.PixelFormat.ToString()
                alpha_handling = 'preserved_exact_png'
            }
        }
        finally {
            if ($null -ne $sourceImage) { $sourceImage.Dispose() }
        }
    }

    # O unico JPG da fonte usa fundo cinza uniforme #EEEEEE. Ele e convertido
    # para RGBA sem redimensionamento, preservando o contorno branco do adesivo.
    $sourceBitmap = $null
    $transparentBitmap = $null
    try {
        $sourceBitmap = [System.Drawing.Bitmap]::new($SourcePath)
        $transparentBitmap = [System.Drawing.Bitmap]::new(
            $sourceBitmap.Width,
            $sourceBitmap.Height,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        $background = $sourceBitmap.GetPixel(0, 0)
        $transparentDistance = 3.0
        $opaqueDistance = 20.0

        for ($y = 0; $y -lt $sourceBitmap.Height; $y++) {
            for ($x = 0; $x -lt $sourceBitmap.Width; $x++) {
                $color = $sourceBitmap.GetPixel($x, $y)
                $dr = [double]($color.R - $background.R)
                $dg = [double]($color.G - $background.G)
                $db = [double]($color.B - $background.B)
                $distance = [Math]::Sqrt(($dr * $dr) + ($dg * $dg) + ($db * $db))
                if ($distance -le $transparentDistance) {
                    $alpha = 0
                }
                elseif ($distance -ge $opaqueDistance) {
                    $alpha = 255
                }
                else {
                    $alpha = [int][Math]::Round(255 * (($distance - $transparentDistance) / ($opaqueDistance - $transparentDistance)))
                }
                $transparentBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B))
            }
        }
        $transparentBitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)

        return [pscustomobject]@{
            source_width = $sourceBitmap.Width
            source_height = $sourceBitmap.Height
            prepared_width = $sourceBitmap.Width
            prepared_height = $sourceBitmap.Height
            source_pixel_format = $sourceBitmap.PixelFormat.ToString()
            alpha_handling = 'derived_from_uniform_jpeg_background'
        }
    }
    finally {
        if ($null -ne $transparentBitmap) { $transparentBitmap.Dispose() }
        if ($null -ne $sourceBitmap) { $sourceBitmap.Dispose() }
    }
}

function Save-OpaqueTrainingImage {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    $sourceImage = $null
    $bitmap = $null
    $graphics = $null

    try {
        $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
        $bitmap = [System.Drawing.Bitmap]::new(
            $sourceImage.Width,
            $sourceImage.Height,
            [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
        )
        $bitmap.SetResolution(96, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImageUnscaled($sourceImage, 0, 0)
        $bitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        if ($null -ne $graphics) { $graphics.Dispose() }
        if ($null -ne $bitmap) { $bitmap.Dispose() }
        if ($null -ne $sourceImage) { $sourceImage.Dispose() }
    }
}

$catalog = @(Import-Csv -LiteralPath $catalogFull)
if ($catalog.Count -eq 0) {
    throw 'O catalogo esta vazio.'
}

$requiredColumns = @(
    'id',
    'source_relpath',
    'caption',
    'category',
    'ip_flag',
    'include_curated'
)
$availableColumns = @($catalog[0].PSObject.Properties.Name)
$missingColumns = @($requiredColumns | Where-Object { $_ -notin $availableColumns })
if ($missingColumns.Count -gt 0) {
    throw "Colunas ausentes no catalogo: $($missingColumns -join ', ')"
}

$ids = @($catalog | ForEach-Object { $_.id })
$duplicateIds = @($ids | Group-Object | Where-Object Count -gt 1)
if ($duplicateIds.Count -gt 0) {
    throw "IDs duplicados no catalogo: $($duplicateIds.Name -join ', ')"
}

$metadata = [System.Collections.Generic.List[object]]::new()
$fullSplit = [System.Collections.Generic.List[string]]::new()
$curatedSplit = [System.Collections.Generic.List[string]]::new()
$ipReviewSplit = [System.Collections.Generic.List[string]]::new()

$position = 0
foreach ($row in $catalog) {
    $position++
    $idNumber = 0
    if (-not [int]::TryParse($row.id, [ref]$idNumber)) {
        throw "ID invalido na linha ${position}: $($row.id)"
    }

    $relativeSource = $row.source_relpath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $sourceRootFull $relativeSource))
    $sourcePrefix = $sourceRootFull.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $sourcePath.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Caminho fora da pasta fonte: $relativeSource"
    }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Imagem fonte ausente: $sourcePath"
    }

    $baseName = 'guria-nails-{0:D4}' -f $idNumber
    $imageName = "$baseName.png"
    $captionName = "$baseName.txt"
    $destinationTransparentImage = Join-Path $transparentRoot $imageName
    $destinationTransparentCaption = Join-Path $transparentRoot $captionName
    $destinationRgbImage = Join-Path $rgbTrainingRoot $imageName
    $destinationRgbCaption = Join-Path $rgbTrainingRoot $captionName

    $dimensions = Save-TransparentSourceImage `
        -SourcePath $sourcePath `
        -DestinationPath $destinationTransparentImage

    Save-OpaqueTrainingImage `
        -SourcePath $destinationTransparentImage `
        -DestinationPath $destinationRgbImage

    $caption = $row.caption.Trim()
    if (-not $caption.StartsWith('GUR1A_NAILS.', [System.StringComparison]::Ordinal)) {
        throw "Caption sem o trigger GUR1A_NAILS. no ID $($row.id)"
    }
    [System.IO.File]::WriteAllText($destinationTransparentCaption, $caption + [Environment]::NewLine, $utf8NoBom)
    [System.IO.File]::WriteAllText($destinationRgbCaption, $caption + [Environment]::NewLine, $utf8NoBom)

    $ipFlag = Convert-ToBool -Value $row.ip_flag
    $includeCurated = Convert-ToBool -Value $row.include_curated
    $sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $transparentHash = (Get-FileHash -LiteralPath $destinationTransparentImage -Algorithm SHA256).Hash.ToLowerInvariant()
    $trainingHash = (Get-FileHash -LiteralPath $destinationRgbImage -Algorithm SHA256).Hash.ToLowerInvariant()
    $qualityFlag = if ([Math]::Max($dimensions.source_width, $dimensions.source_height) -lt 1024) {
        'source_below_1024_preserved'
    }
    else {
        'ok'
    }

    $metadata.Add([pscustomobject][ordered]@{
        file_name = "train/$imageName"
        training_file_name = "train_rgb_white/$imageName"
        text = $caption
        id = $idNumber
        source_relpath = $row.source_relpath
        category = $row.category
        ip_flag = $ipFlag
        include_full = $true
        include_curated = $includeCurated
        quality_flag = $qualityFlag
        source_width = $dimensions.source_width
        source_height = $dimensions.source_height
        prepared_width = $dimensions.prepared_width
        prepared_height = $dimensions.prepared_height
        source_pixel_format = $dimensions.source_pixel_format
        alpha_handling = $dimensions.alpha_handling
        source_sha256 = $sourceHash
        transparent_sha256 = $transparentHash
        training_sha256 = $trainingHash
    })

    $fullSplit.Add($imageName)
    if ($includeCurated) { $curatedSplit.Add($imageName) }
    if ($ipFlag) { $ipReviewSplit.Add($imageName) }

}

$metadataCsv = Join-Path $outputRootFull 'metadata.csv'
$metadataJsonl = Join-Path $outputRootFull 'metadata.jsonl'
$metadata | Export-Csv -LiteralPath $metadataCsv -NoTypeInformation -Encoding utf8
$jsonLines = $metadata | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 5 }
[System.IO.File]::WriteAllLines($metadataJsonl, $jsonLines, $utf8NoBom)

[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'full.txt'), $fullSplit, $utf8NoBom)
[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'curated.txt'), $curatedSplit, $utf8NoBom)
[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'ip-review.txt'), $ipReviewSplit, $utf8NoBom)

[pscustomobject]@{
    source_images = $catalog.Count
    transparent_images = $metadata.Count
    rgb_training_images = $metadata.Count
    curated_images = $curatedSplit.Count
    ip_review_images = $ipReviewSplit.Count
    preserved_below_1024 = @($metadata | Where-Object quality_flag -ne 'ok').Count
    output = $outputRootFull
} | Format-List
