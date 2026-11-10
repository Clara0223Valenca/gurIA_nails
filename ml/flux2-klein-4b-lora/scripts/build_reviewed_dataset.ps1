[CmdletBinding()]
param(
    [string]$DatasetRoot = (Join-Path $PSScriptRoot '..\dataset')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Drawing

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$datasetRootFull = [System.IO.Path]::GetFullPath($DatasetRoot)
$canonicalRoot = Join-Path $datasetRootFull 'train'
$catalogPath = Join-Path $datasetRootFull 'source_catalog.csv'
$reviewedRoot = Join-Path $datasetRootFull 'reviewed'
$rgbaRoot = Join-Path $reviewedRoot 'main_rgba'
$trainingRoot = Join-Path $reviewedRoot 'main_train_rgb'
$splitsRoot = Join-Path $datasetRootFull 'splits'
$manifestPath = Join-Path $datasetRootFull 'review_manifest.csv'
$manifestJsonlPath = Join-Path $datasetRootFull 'review_manifest.jsonl'
$reportPath = Join-Path $PSScriptRoot '..\reports\review-summary.json'

if (-not (Test-Path -LiteralPath $canonicalRoot -PathType Container)) {
    throw "Pasta canonica ausente: $canonicalRoot"
}
if (-not (Test-Path -LiteralPath $catalogPath -PathType Leaf)) {
    throw "Catalogo ausente: $catalogPath"
}

$approvedIds = @(
    1, 2, 7, 9, 11, 16, 23, 36, 38, 39, 40, 41, 42, 43, 46, 48, 52,
    53, 55, 56, 57, 58, 62, 63, 64, 86, 90, 91, 92, 93, 94, 95, 97, 105,
    106, 111, 112, 113, 117, 120, 121, 122, 123, 133, 134, 135, 136, 137,
    138, 139
)
$correctionIds = @(
    10, 17, 31, 34, 37, 50, 51, 54, 59, 61, 65, 67, 68, 69, 70, 71, 72,
    73, 74, 75, 76, 77, 80, 83
)
$lightGrayIds = @(1, 36, 39, 90, 97, 106, 120)

$correctionReasons = @{
    10 = 'Christmas tree uses realistic foliage, specular ornaments, and volumetric lighting.'
    17 = 'Lipstick mark contains strong glossy highlights and reflective texture.'
    31 = 'Disco ball is dominated by mirror reflections and three-dimensional volume.'
    34 = 'Vinyl record contains realistic grooves, reflections, and glittering highlights.'
    37 = 'Tarot cards use foreshortening, overlap, and visible perspective.'
    50 = 'Cross and rosary contain metallic reflections and strong three-dimensional shading.'
    51 = 'Cross contains metallic reflections and strong three-dimensional shading.'
    54 = 'Vinyl record contains large glossy reflections and three-dimensional shading.'
    59 = 'Starfish uses glossy highlights and raised bead-like volume.'
    61 = 'Ghost has a visible gray halo/shadow around the contour.'
    65 = 'Headphones use volumetric ear cups, highlights, and perspective.'
    67 = 'Pineapple uses realistic texture, volume, and highlights.'
    68 = 'Bananas use glossy highlights and volumetric shading.'
    69 = 'Grapes use repeated glossy reflections and volumetric shading.'
    70 = 'Watermelon wedge uses strong glossy highlights and realistic volume.'
    71 = 'Kiwi half uses realistic texture, perspective, and volume.'
    72 = 'Orange uses realistic peel texture, highlights, and volume.'
    73 = 'Lemon uses glossy highlights and volumetric shading.'
    74 = 'Apple uses strong glossy reflections and volumetric shading.'
    75 = 'Mango uses strong glossy reflections and volumetric shading.'
    76 = 'Strawberry uses glossy highlights and realistic volume.'
    77 = 'Pear uses glossy highlights, realistic texture, and volume.'
    80 = 'Kitten is photographic/photorealistic rather than a flat 2D decal illustration.'
    83 = 'Electric guitar uses realistic component detail, perspective, and reflections.'
}

$templateIds = @(3, 4, 140)
$logoIds = @(5, 66, 125, 127, 128, 129, 130)
$ipIds = @(
    6, 8, 12, 13, 14, 15, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29,
    30, 32, 33, 35, 44, 45, 47, 49, 60, 78, 79, 81, 84, 85, 87, 88, 89,
    96, 98, 99, 100, 101, 102, 103, 104, 107, 108, 109, 110, 114, 115,
    116, 118, 119, 124, 126, 131, 132
)
$patternIds = @(82)

$groupById = @{}
foreach ($id in @(40, 41)) { $groupById[$id] = 'cherry-bow-variants' }
foreach ($id in @(63, 64)) { $groupById[$id] = 'leafy-branch-variants' }
foreach ($id in @(90, 91, 92, 93)) { $groupById[$id] = 'bow-variants' }
foreach ($id in @(94, 113)) { $groupById[$id] = 'lavender-variants' }
foreach ($id in @(121, 122, 123)) { $groupById[$id] = 'sardine-variants' }
foreach ($id in @(3, 4, 140)) { $groupById[$id] = 'full-nail-lace-variants' }
foreach ($id in @(24, 25, 26, 27, 28, 29, 30)) { $groupById[$id] = 'bts-portrait-series' }
foreach ($id in @(34, 54)) { $groupById[$id] = 'vinyl-record-variants' }
foreach ($id in (67..77)) { $groupById[$id] = 'glossy-fruit-series' }
foreach ($id in @(78, 79)) { $groupById[$id] = 'beetle-car-color-variants' }
foreach ($id in @(98, 99, 100, 101, 102, 103)) { $groupById[$id] = 'monster-high-series' }
foreach ($id in @(104, 110)) { $groupById[$id] = 'strawberry-shortcake-variants' }
foreach ($id in @(128, 129, 130)) { $groupById[$id] = 'guria-logo-color-variants' }

function Get-ReviewedCaption {
    param(
        [Parameter(Mandatory = $true)][string]$LegacyCaption,
        [Parameter(Mandatory = $true)][string]$BackgroundPhrase
    )

    $body = [regex]::Replace($LegacyCaption.Trim(), '^GUR1A_NAILS\.\s*', '')
    $body = $body.Trim().TrimEnd('.')
    if ($body.Length -gt 0) {
        $body = [char]::ToLowerInvariant($body[0]) + $body.Substring(1)
    }
    return "naildecalstyle, flat 2D illustration of $body, isolated on a solid $BackgroundPhrase background."
}

function Save-OpaqueCopy {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [Parameter(Mandatory = $true)][System.Drawing.Color]$BackgroundColor
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
        $graphics.Clear($BackgroundColor)
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

New-Item -ItemType Directory -Force -Path $rgbaRoot, $trainingRoot, $splitsRoot | Out-Null
foreach ($targetRoot in @($rgbaRoot, $trainingRoot)) {
    $targetRootFull = [System.IO.Path]::GetFullPath($targetRoot)
    $reviewedPrefix = $reviewedRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $targetRootFull.StartsWith($reviewedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Destino inseguro fora de reviewed: $targetRootFull"
    }
    Get-ChildItem -LiteralPath $targetRootFull -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^guria-nails-\d{4}\.(png|txt)$' } |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
}

$catalog = @(Import-Csv -LiteralPath $catalogPath)
if ($catalog.Count -ne 140) { throw "Esperados 140 itens no catalogo; encontrados $($catalog.Count)." }

$manifest = [System.Collections.Generic.List[object]]::new()
$approvedNames = [System.Collections.Generic.List[string]]::new()
$correctionNames = [System.Collections.Generic.List[string]]::new()
$separatedNames = [System.Collections.Generic.List[string]]::new()

foreach ($row in $catalog) {
    $id = [int]$row.id
    $baseName = 'guria-nails-{0:D4}' -f $id
    $imageName = "$baseName.png"
    $canonicalPath = Join-Path $canonicalRoot $imageName
    if (-not (Test-Path -LiteralPath $canonicalPath -PathType Leaf)) {
        throw "Imagem canonica ausente: $canonicalPath"
    }

    $status = ''
    $reason = ''
    $action = ''
    $backgroundHex = ''
    $backgroundPhrase = ''
    $reviewedCaption = ''
    $effectiveFileName = ''
    $rgbaHash = ''
    $trainingHash = ''

    if ($id -in $approvedIds) {
        $status = 'approved'
        $reason = "Isolated flat 2D $($row.category) illustration; visual inspection found no hand, realistic nail, watermark, scene, projected shadow, or disqualifying reflection."
        $action = 'Included in the reviewed main training folder.'
        if ($id -in $lightGrayIds) {
            $backgroundHex = '#E6E6E6'
            $backgroundPhrase = 'light gray'
            $backgroundColor = [System.Drawing.Color]::FromArgb(230, 230, 230)
        }
        else {
            $backgroundHex = '#FFFFFF'
            $backgroundPhrase = 'white'
            $backgroundColor = [System.Drawing.Color]::White
        }
        $reviewedCaption = Get-ReviewedCaption -LegacyCaption $row.caption -BackgroundPhrase $backgroundPhrase
        $triggerMatches = [regex]::Matches($reviewedCaption, '(?i)\bnaildecalstyle\b').Count
        if ($triggerMatches -ne 1 -or -not $reviewedCaption.StartsWith('naildecalstyle, ', [System.StringComparison]::Ordinal)) {
            throw "Trigger invalido na legenda revisada do ID $id"
        }

        $rgbaDestination = Join-Path $rgbaRoot $imageName
        $trainingDestination = Join-Path $trainingRoot $imageName
        Copy-Item -LiteralPath $canonicalPath -Destination $rgbaDestination -Force
        Save-OpaqueCopy -SourcePath $canonicalPath -DestinationPath $trainingDestination -BackgroundColor $backgroundColor
        [System.IO.File]::WriteAllText((Join-Path $trainingRoot "$baseName.txt"), $reviewedCaption + [Environment]::NewLine, $utf8NoBom)

        $sourceHash = (Get-FileHash -LiteralPath $canonicalPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $rgbaHash = (Get-FileHash -LiteralPath $rgbaDestination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($sourceHash -ne $rgbaHash) { throw "Copia RGBA divergente no ID $id" }
        $trainingHash = (Get-FileHash -LiteralPath $trainingDestination -Algorithm SHA256).Hash.ToLowerInvariant()
        $effectiveFileName = "reviewed/main_train_rgb/$imageName"
        $approvedNames.Add($imageName)
    }
    elseif ($id -in $correctionIds) {
        $status = 'needs_correction'
        $reason = $correctionReasons[$id]
        $action = 'Keep the original; manually redraw or clean it as genuinely flat 2D, then repeat visual review before training.'
        $correctionNames.Add($imageName)
    }
    else {
        $status = 'separated'
        if ($id -in $templateIds) {
            $reason = 'Complete nail-template artwork; retained as a separate reference and excluded from the isolated-decal style LoRA.'
        }
        elseif ($id -in $logoIds) {
            $reason = 'Logo, project branding, or event mark; not a generic isolated decal training example.'
        }
        elseif ($id -in $ipIds) {
            $reason = 'Recognizable character, celebrity, trademark, or branded design; separated from the generic style dataset.'
        }
        elseif ($id -in $patternIds) {
            $reason = 'Dense rectangular all-over pattern rather than an isolated decal element.'
        }
        else {
            throw "ID $id nao possui motivo de separacao."
        }
        $action = 'Preserve in the canonical collection; do not expose it to the main trainer.'
        $separatedNames.Add($imageName)
    }

    $groupId = if ($groupById.ContainsKey($id)) { $groupById[$id] } else { "single-$baseName" }
    $manifest.Add([pscustomobject][ordered]@{
        id = $id
        file_name = $imageName
        source_relpath = $row.source_relpath
        category = $row.category
        status = $status
        reason = $reason
        action = $action
        near_variant_group = $groupId
        effective_file_name = $effectiveFileName
        effective_background = $backgroundPhrase
        background_hex = $backgroundHex
        legacy_caption = $row.caption
        reviewed_caption = $reviewedCaption
        canonical_rgba_sha256 = (Get-FileHash -LiteralPath $canonicalPath -Algorithm SHA256).Hash.ToLowerInvariant()
        reviewed_rgba_sha256 = $rgbaHash
        training_rgb_sha256 = $trainingHash
    })
}

if ($approvedNames.Count -ne 50 -or $correctionNames.Count -ne 24 -or $separatedNames.Count -ne 66) {
    throw "Contagens inesperadas: approved=$($approvedNames.Count), correction=$($correctionNames.Count), separated=$($separatedNames.Count)."
}

$manifest | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding utf8
$jsonLines = $manifest | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 4 }
[System.IO.File]::WriteAllLines($manifestJsonlPath, $jsonLines, $utf8NoBom)
[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'reviewed-main.txt'), $approvedNames, $utf8NoBom)
[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'needs-correction.txt'), $correctionNames, $utf8NoBom)
[System.IO.File]::WriteAllLines((Join-Path $splitsRoot 'separated.txt'), $separatedNames, $utf8NoBom)

$summary = [pscustomobject][ordered]@{
    reviewed_at = [DateTime]::UtcNow.ToString('o')
    total = $manifest.Count
    approved = $approvedNames.Count
    needs_correction = $correctionNames.Count
    separated = $separatedNames.Count
    effective_training_folder = $trainingRoot
    transparent_preservation_folder = $rgbaRoot
    trigger = 'naildecalstyle'
    trigger_occurrences_required_per_effective_caption = 1
    backgrounds = [pscustomobject]@{
        white = @($manifest | Where-Object background_hex -eq '#FFFFFF').Count
        light_gray = @($manifest | Where-Object background_hex -eq '#E6E6E6').Count
    }
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportPath) | Out-Null
[System.IO.File]::WriteAllText($reportPath, ($summary | ConvertTo-Json -Depth 5), $utf8NoBom)
$summary | Format-List
