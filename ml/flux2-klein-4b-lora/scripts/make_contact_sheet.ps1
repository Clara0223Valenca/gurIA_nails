[CmdletBinding()]
param(
    [string]$DatasetRoot = (Join-Path $PSScriptRoot '..\dataset'),
    [string]$InputSubdirectory = 'train',
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\reports\contact-sheet.jpg')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Drawing

$trainRoot = Join-Path ([System.IO.Path]::GetFullPath($DatasetRoot)) $InputSubdirectory
$files = @(Get-ChildItem -LiteralPath $trainRoot -File -Filter '*.png' | Sort-Object Name)
if ($files.Count -eq 0) { throw "Nenhuma imagem em $trainRoot" }

$columns = 10
$cellWidth = 170
$cellHeight = 190
$thumbSize = 150
$rows = [int][Math]::Ceiling($files.Count / [double]$columns)
$sheet = [System.Drawing.Bitmap]::new(
    $columns * $cellWidth,
    $rows * $cellHeight,
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$font = [System.Drawing.Font]::new('Segoe UI', 8)
$borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::Gainsboro, 1)

try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($index = 0; $index -lt $files.Count; $index++) {
        $column = $index % $columns
        $row = [int][Math]::Floor($index / $columns)
        $x = $column * $cellWidth
        $y = $row * $cellHeight
        $graphics.DrawRectangle($borderPen, $x, $y, $cellWidth - 1, $cellHeight - 1)

        $checkerSize = 15
        for ($checkerY = 0; $checkerY -lt $thumbSize; $checkerY += $checkerSize) {
            for ($checkerX = 0; $checkerX -lt $thumbSize; $checkerX += $checkerSize) {
                $checkerBrush = if (((($checkerX / $checkerSize) + ($checkerY / $checkerSize)) % 2) -eq 0) {
                    [System.Drawing.Brushes]::White
                }
                else {
                    [System.Drawing.Brushes]::Gainsboro
                }
                $graphics.FillRectangle(
                    $checkerBrush,
                    $x + 10 + $checkerX,
                    $y + 6 + $checkerY,
                    [Math]::Min($checkerSize, $thumbSize - $checkerX),
                    [Math]::Min($checkerSize, $thumbSize - $checkerY)
                )
            }
        }

        $image = $null
        try {
            $image = [System.Drawing.Image]::FromFile($files[$index].FullName)
            $scale = [Math]::Min($thumbSize / $image.Width, $thumbSize / $image.Height)
            $drawWidth = [int]($image.Width * $scale)
            $drawHeight = [int]($image.Height * $scale)
            $drawX = $x + 10 + [int](($thumbSize - $drawWidth) / 2)
            $drawY = $y + 6 + [int](($thumbSize - $drawHeight) / 2)
            $graphics.DrawImage($image, $drawX, $drawY, $drawWidth, $drawHeight)
        }
        finally {
            if ($null -ne $image) { $image.Dispose() }
        }

        $idMatch = [regex]::Match($files[$index].BaseName, '(\d+)$')
        $label = if ($idMatch.Success) { $idMatch.Groups[1].Value } else { '{0:D3}' -f ($index + 1) }
        $graphics.DrawString($label, $font, [System.Drawing.Brushes]::Black, $x + 8, $y + 162)
    }

    $outputFull = [System.IO.Path]::GetFullPath($OutputPath)
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputFull) | Out-Null
    $sheet.Save($outputFull, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    Write-Output $outputFull
}
finally {
    $borderPen.Dispose()
    $font.Dispose()
    $graphics.Dispose()
    $sheet.Dispose()
}
