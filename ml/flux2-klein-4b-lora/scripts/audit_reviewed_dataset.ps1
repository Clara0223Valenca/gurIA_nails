[CmdletBinding()]
param(
    [string]$DatasetRoot = '',
    [string]$SourceRoot = '',
    [string]$ReportDirectory = '',
    [int]$ExpectedCanonicalCount = 140,
    [int]$ExpectedReviewedCount = 50
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
Add-Type -AssemblyName System.Drawing
if ($PSVersionTable.PSEdition -eq 'Desktop') {
    # Windows PowerShell 5.1 compila contra o .NET Framework/GAC.
    $drawingReferences = @('System.Drawing')
}
else {
    # PowerShell 7+ usa System.Drawing.Common e, em alguns runtimes, tipos
    # encaminhados para duas assemblies privadas do Windows.
    $drawingDirectory = Split-Path -Parent ([System.Drawing.Image].Assembly.Location)
    $drawingReferences = @(
        [System.Drawing.Image].Assembly.Location,
        [System.Drawing.Color].Assembly.Location
    )
    foreach ($assemblyName in @('System.Private.Windows.Core.dll', 'System.Private.Windows.GdiPlus.dll')) {
        $assemblyPath = Join-Path $drawingDirectory $assemblyName
        if (Test-Path -LiteralPath $assemblyPath -PathType Leaf) {
            $drawingReferences += $assemblyPath
        }
    }
}

Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class GuriaImageAudit {
    public static string DetectFormat(string path) {
        byte[] b = new byte[12];
        using (FileStream f = File.OpenRead(path)) {
            int read = f.Read(b, 0, b.Length);
            if (read >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "png";
            if (read >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "jpeg";
            if (read >= 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) return "webp";
        }
        return "unknown";
    }

    public static ulong DifferenceHash(string path) {
        using (Image src = Image.FromFile(path))
        using (Bitmap small = new Bitmap(9, 8, PixelFormat.Format24bppRgb))
        using (Graphics g = Graphics.FromImage(small)) {
            g.Clear(Color.White);
            g.CompositingMode = CompositingMode.SourceOver;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.DrawImage(src, 0, 0, 9, 8);
            ulong hash = 0;
            int bit = 0;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 8; x++) {
                    Color a = small.GetPixel(x, y);
                    Color b = small.GetPixel(x + 1, y);
                    int ga = (299 * a.R + 587 * a.G + 114 * a.B) / 1000;
                    int gb = (299 * b.R + 587 * b.G + 114 * b.B) / 1000;
                    if (ga > gb) hash |= (1UL << bit);
                    bit++;
                }
            }
            return hash;
        }
    }

    public static int HammingDistance(ulong a, ulong b) {
        ulong x = a ^ b;
        int count = 0;
        while (x != 0) {
            x &= x - 1;
            count++;
        }
        return count;
    }

    public static int[] AlphaRange(string path) {
        using (Bitmap bitmap = new Bitmap(path)) {
            if (!Image.IsAlphaPixelFormat(bitmap.PixelFormat)) return new int[] { 255, 255 };
            Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            BitmapData data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int min = 255;
            int max = 0;
            try {
                int stride = Math.Abs(data.Stride);
                byte[] bytes = new byte[stride * bitmap.Height];
                System.Runtime.InteropServices.Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
                for (int y = 0; y < bitmap.Height; y++) {
                    int row = y * stride;
                    for (int x = 0; x < bitmap.Width; x++) {
                        int alpha = bytes[row + (x * 4) + 3];
                        if (alpha < min) min = alpha;
                        if (alpha > max) max = alpha;
                    }
                }
            }
            finally {
                bitmap.UnlockBits(data);
            }
            return new int[] { min, max };
        }
    }

    public static int[] CheckTransparentBackground(string rgbaPath, string rgbPath, int red, int green, int blue) {
        using (Bitmap rgba = new Bitmap(rgbaPath))
        using (Bitmap rgb = new Bitmap(rgbPath)) {
            int stepX = Math.Max(1, rgba.Width / 200);
            int stepY = Math.Max(1, rgba.Height / 200);
            int checkedPixels = 0;
            int mismatches = 0;
            for (int y = 0; y < rgba.Height; y += stepY) {
                for (int x = 0; x < rgba.Width; x += stepX) {
                    Color source = rgba.GetPixel(x, y);
                    if (source.A != 0) continue;
                    Color effective = rgb.GetPixel(x, y);
                    checkedPixels++;
                    if (effective.R != red || effective.G != green || effective.B != blue) mismatches++;
                }
            }
            return new int[] { checkedPixels, mismatches };
        }
    }
}
'@ -ReferencedAssemblies $drawingReferences

$datasetRootFull = [System.IO.Path]::GetFullPath($DatasetRoot)
$reportDirectoryFull = [System.IO.Path]::GetFullPath($ReportDirectory)
$canonicalRoot = Join-Path $datasetRootFull 'train'
$reviewedRgbaRoot = Join-Path $datasetRootFull 'reviewed\main_rgba'
$trainingRoot = Join-Path $datasetRootFull 'reviewed\main_train_rgb'
$manifestPath = Join-Path $datasetRootFull 'review_manifest.csv'
$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$inventory = [System.Collections.Generic.List[object]]::new()
$effectiveBackgroundsVerified = 0

foreach ($requiredPath in @($canonicalRoot, $reviewedRgbaRoot, $trainingRoot, $manifestPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) { $errors.Add("Caminho obrigatorio ausente: $requiredPath") }
}
if ($errors.Count -gt 0) { throw ($errors -join [Environment]::NewLine) }

$strictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
$manifest = @(Import-Csv -LiteralPath $manifestPath)
$canonicalImages = @(Get-ChildItem -LiteralPath $canonicalRoot -File -Filter '*.png' | Sort-Object Name)
$reviewedRgbaImages = @(Get-ChildItem -LiteralPath $reviewedRgbaRoot -File -Filter '*.png' | Sort-Object Name)
$trainingImages = @(Get-ChildItem -LiteralPath $trainingRoot -File -Filter '*.png' | Sort-Object Name)
$trainingCaptions = @(Get-ChildItem -LiteralPath $trainingRoot -File -Filter '*.txt' | Sort-Object Name)

if ($manifest.Count -ne $ExpectedCanonicalCount) { $errors.Add("Manifesto deveria ter $ExpectedCanonicalCount linhas; tem $($manifest.Count).") }
if ($canonicalImages.Count -ne $ExpectedCanonicalCount) { $errors.Add("Canonical deveria ter $ExpectedCanonicalCount PNGs; tem $($canonicalImages.Count).") }
if ($reviewedRgbaImages.Count -ne $ExpectedReviewedCount) { $errors.Add("main_rgba deveria ter $ExpectedReviewedCount PNGs; tem $($reviewedRgbaImages.Count).") }
if ($trainingImages.Count -ne $ExpectedReviewedCount) { $errors.Add("main_train_rgb deveria ter $ExpectedReviewedCount PNGs; tem $($trainingImages.Count).") }
if ($trainingCaptions.Count -ne $ExpectedReviewedCount) { $errors.Add("main_train_rgb deveria ter $ExpectedReviewedCount TXTs; tem $($trainingCaptions.Count).") }

$caseInsensitiveNames = @($trainingImages.Name + $trainingCaptions.Name | Group-Object { $_.ToLowerInvariant() } | Where-Object Count -gt 1)
if ($caseInsensitiveNames.Count -gt 0) { $errors.Add("Nomes conflitantes por caixa: $($caseInsensitiveNames.Name -join ', ')") }

$approvedRows = @($manifest | Where-Object status -eq 'approved')
foreach ($row in $approvedRows) {
    $imagePath = Join-Path $trainingRoot $row.file_name
    $captionPath = Join-Path $trainingRoot ([System.IO.Path]::ChangeExtension($row.file_name, '.txt'))
    $rgbaPath = Join-Path $reviewedRgbaRoot $row.file_name
    $canonicalPath = Join-Path $canonicalRoot $row.file_name

    foreach ($path in @($imagePath, $captionPath, $rgbaPath, $canonicalPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            $errors.Add("Par incompleto para $($row.file_name): $path")
        }
        elseif ((Get-Item -LiteralPath $path).Length -eq 0) {
            $errors.Add("Arquivo vazio: $path")
        }
    }
    if (-not (Test-Path -LiteralPath $imagePath -PathType Leaf) -or -not (Test-Path -LiteralPath $captionPath -PathType Leaf)) { continue }

    try { $caption = $strictUtf8.GetString([System.IO.File]::ReadAllBytes($captionPath)).Trim() }
    catch { $errors.Add("Legenda nao e UTF-8 valida: $captionPath"); continue }
    if ([string]::IsNullOrWhiteSpace($caption)) { $errors.Add("Legenda vazia: $captionPath") }
    $triggerCount = [regex]::Matches($caption, '(?i)\bnaildecalstyle\b').Count
    if ($triggerCount -ne 1) { $errors.Add("Trigger aparece $triggerCount vezes em $captionPath") }
    if (-not $caption.StartsWith('naildecalstyle, ', [System.StringComparison]::Ordinal)) { $errors.Add("Trigger nao esta no inicio: $captionPath") }
    if ($caption -ne $row.reviewed_caption) { $errors.Add("Legenda diverge do manifesto: $captionPath") }
    if ($row.effective_background -eq 'white' -and $caption -notmatch 'solid white background') { $errors.Add("Fundo branco nao descrito em $captionPath") }
    if ($row.effective_background -eq 'light gray' -and $caption -notmatch 'solid light gray background') { $errors.Add("Fundo cinza nao descrito em $captionPath") }

    $canonicalImage = $null
    $trainingImage = $null
    try {
        $canonicalImage = [System.Drawing.Image]::FromFile($canonicalPath)
        $trainingImage = [System.Drawing.Image]::FromFile($imagePath)
        if ($canonicalImage.Width -ne $trainingImage.Width -or $canonicalImage.Height -ne $trainingImage.Height) {
            $errors.Add("Dimensoes alteradas em $($row.file_name)")
        }
        if ([System.Drawing.Image]::IsAlphaPixelFormat($trainingImage.PixelFormat)) {
            $errors.Add("Imagem efetiva deveria ser RGB opaca: $imagePath")
        }
    }
    catch { $errors.Add("Falha ao abrir imagem efetiva $imagePath`: $($_.Exception.Message)") }
    finally {
        if ($null -ne $trainingImage) { $trainingImage.Dispose() }
        if ($null -ne $canonicalImage) { $canonicalImage.Dispose() }
    }

    if ([GuriaImageAudit]::DetectFormat($imagePath) -ne 'png') { $errors.Add("Assinatura nao PNG: $imagePath") }
    $backgroundRgb = if ($row.background_hex -eq '#E6E6E6') { @(230, 230, 230) } else { @(255, 255, 255) }
    $backgroundCheck = [GuriaImageAudit]::CheckTransparentBackground(
        $canonicalPath,
        $imagePath,
        $backgroundRgb[0],
        $backgroundRgb[1],
        $backgroundRgb[2]
    )
    if ($backgroundCheck[0] -eq 0) { $errors.Add("Nenhum pixel transparente amostrado em $($row.file_name)") }
    if ($backgroundCheck[1] -gt 0) { $errors.Add("Fundo efetivo diverge em $($backgroundCheck[1]) amostras de $($row.file_name)") }
    if ($backgroundCheck[0] -gt 0 -and $backgroundCheck[1] -eq 0) { $effectiveBackgroundsVerified++ }
    $canonicalHash = (Get-FileHash -LiteralPath $canonicalPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $rgbaHash = (Get-FileHash -LiteralPath $rgbaPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($canonicalHash -ne $rgbaHash) { $errors.Add("Copia RGBA nao preserva bytes: $($row.file_name)") }
}

$canonicalHashes = @{}
$hashByFile = @{}
$dHashByFile = @{}
foreach ($imageFile in $canonicalImages) {
    try {
        $image = [System.Drawing.Image]::FromFile($imageFile.FullName)
        try {
            $alpha = [GuriaImageAudit]::AlphaRange($imageFile.FullName)
            $format = [GuriaImageAudit]::DetectFormat($imageFile.FullName)
            $sha = (Get-FileHash -LiteralPath $imageFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            $dHash = [GuriaImageAudit]::DifferenceHash($imageFile.FullName)
            $hashByFile[$imageFile.Name] = $sha
            $dHashByFile[$imageFile.Name] = $dHash
            if (-not $canonicalHashes.ContainsKey($sha)) { $canonicalHashes[$sha] = [System.Collections.Generic.List[string]]::new() }
            $canonicalHashes[$sha].Add($imageFile.Name)
            $inventory.Add([pscustomobject][ordered]@{
                collection = 'canonical_rgba'
                file_name = $imageFile.Name
                bytes = $imageFile.Length
                detected_format = $format
                width = $image.Width
                height = $image.Height
                aspect_ratio = [Math]::Round($image.Width / [double]$image.Height, 5)
                pixel_format = $image.PixelFormat.ToString()
                alpha_min = $alpha[0]
                alpha_max = $alpha[1]
                has_real_transparency = ($alpha[0] -lt 255)
                sha256 = $sha
                dhash = ('{0:x16}' -f $dHash)
            })
            if ($format -ne 'png') { $errors.Add("Extensao PNG diverge da assinatura: $($imageFile.FullName)") }
            if ($alpha[0] -ge 255) { $errors.Add("PNG canonico sem transparencia real observada: $($imageFile.Name)") }
        }
        finally { $image.Dispose() }
    }
    catch { $errors.Add("Imagem corrompida ou ilegivel $($imageFile.FullName)`: $($_.Exception.Message)") }
}

$exactDuplicateGroups = @($canonicalHashes.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 })
foreach ($group in $exactDuplicateGroups) { $warnings.Add("Duplicata exata: $($group.Value -join ', ')") }

$nearCandidates = [System.Collections.Generic.List[object]]::new()
for ($i = 0; $i -lt $canonicalImages.Count; $i++) {
    for ($j = $i + 1; $j -lt $canonicalImages.Count; $j++) {
        $a = $canonicalImages[$i]
        $b = $canonicalImages[$j]
        $aInventory = $inventory[$i]
        $bInventory = $inventory[$j]
        $ratioDelta = [Math]::Abs([double]$aInventory.aspect_ratio - [double]$bInventory.aspect_ratio)
        if ($ratioDelta -gt 0.08) { continue }
        $distance = [GuriaImageAudit]::HammingDistance([uint64]$dHashByFile[$a.Name], [uint64]$dHashByFile[$b.Name])
        if ($distance -le 5) {
            $nearCandidates.Add([pscustomobject][ordered]@{
                file_a = $a.Name
                file_b = $b.Name
                dhash_distance = $distance
                aspect_ratio_delta = [Math]::Round($ratioDelta, 5)
                exact_duplicate = ($hashByFile[$a.Name] -eq $hashByFile[$b.Name])
            })
        }
    }
}

if (-not [string]::IsNullOrWhiteSpace($SourceRoot)) {
    $sourceRootFull = [System.IO.Path]::GetFullPath($SourceRoot)
    foreach ($row in $manifest) {
        $relative = $row.source_relpath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $path = [System.IO.Path]::GetFullPath((Join-Path $sourceRootFull $relative))
        $prefix = $sourceRootFull.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
        if (-not $path.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { $errors.Add("Origem fora da raiz: $path"); continue }
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $errors.Add("Origem ausente: $path"); continue }
        if ((Get-Item -LiteralPath $path).Length -eq 0) { $errors.Add("Origem vazia: $path"); continue }
        $detected = [GuriaImageAudit]::DetectFormat($path)
        $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
        $expected = if ($extension -eq '.png') { 'png' } elseif ($extension -in @('.jpg', '.jpeg')) { 'jpeg' } else { 'unknown' }
        if ($detected -ne $expected) { $errors.Add("Extensao diverge da assinatura: $path ($extension/$detected)") }
        try { $sourceImage = [System.Drawing.Image]::FromFile($path); $sourceImage.Dispose() }
        catch { $errors.Add("Origem corrompida: $path`: $($_.Exception.Message)") }
    }
}
else {
    $warnings.Add('SourceRoot nao informado; assinatura e abertura dos arquivos originais nao foram revalidadas nesta execucao.')
}

New-Item -ItemType Directory -Force -Path $reportDirectoryFull | Out-Null
$inventory | Export-Csv -LiteralPath (Join-Path $reportDirectoryFull 'technical-inventory.csv') -NoTypeInformation -Encoding utf8
$nearCandidates | Export-Csv -LiteralPath (Join-Path $reportDirectoryFull 'near-duplicate-candidates.csv') -NoTypeInformation -Encoding utf8

$dimensionGroups = @($inventory | Group-Object { "$($_.width)x$($_.height)" } | Sort-Object Count -Descending | Select-Object -First 12 | ForEach-Object { [pscustomobject]@{ dimensions = $_.Name; count = $_.Count } })
$pixelFormatGroups = @($inventory | Group-Object pixel_format | Sort-Object Count -Descending | ForEach-Object { [pscustomobject]@{ pixel_format = $_.Name; count = $_.Count } })
$report = [pscustomobject][ordered]@{
    status = if ($errors.Count -eq 0) { 'PASS' } else { 'FAIL' }
    checked_at = [DateTime]::UtcNow.ToString('o')
    canonical_images = $canonicalImages.Count
    reviewed_rgba_images = $reviewedRgbaImages.Count
    effective_training_images = $trainingImages.Count
    effective_training_captions = $trainingCaptions.Count
    approved_manifest_rows = $approvedRows.Count
    real_alpha_verified = @($inventory | Where-Object has_real_transparency).Count
    effective_backgrounds_verified = $effectiveBackgroundsVerified
    exact_duplicate_groups = $exactDuplicateGroups.Count
    near_duplicate_candidates = $nearCandidates.Count
    algorithm = '64-bit difference hash on white composite; Hamming <= 5 and aspect-ratio delta <= 0.08. Candidates require visual confirmation.'
    frequent_dimensions = $dimensionGroups
    pixel_formats = $pixelFormatGroups
    error_count = $errors.Count
    warning_count = $warnings.Count
    errors = @($errors)
    warnings = @($warnings)
}
$reportJson = $report | ConvertTo-Json -Depth 7
[System.IO.File]::WriteAllText((Join-Path $reportDirectoryFull 'technical-audit.json'), $reportJson, [System.Text.UTF8Encoding]::new($false))
$report | Format-List
if ($errors.Count -gt 0) { exit 1 }
