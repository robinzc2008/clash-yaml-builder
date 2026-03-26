$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [System.Drawing.Rectangle]$Rectangle,
    [int]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $arc = New-Object System.Drawing.Rectangle($Rectangle.Location, [System.Drawing.Size]::new($diameter, $diameter))

  $path.AddArc($arc, 180, 90)
  $arc.X = $Rectangle.Right - $diameter
  $path.AddArc($arc, 270, 90)
  $arc.Y = $Rectangle.Bottom - $diameter
  $path.AddArc($arc, 0, 90)
  $arc.X = $Rectangle.Left
  $path.AddArc($arc, 90, 90)
  $path.CloseFigure()

  return $path
}

function Draw-BrandMark {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$CanvasSize
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundRect = [System.Drawing.Rectangle]::new(14, 14, $CanvasSize - 28, $CanvasSize - 28)
  $path = New-RoundedRectanglePath -Rectangle $backgroundRect -Radius 40
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Point]::new(28, 20),
    [System.Drawing.Point]::new($CanvasSize - 24, $CanvasSize - 24),
    [System.Drawing.Color]::FromArgb(15, 39, 71),
    [System.Drawing.Color]::FromArgb(95, 179, 232)
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(15, 39, 71),
    [System.Drawing.Color]::FromArgb(27, 76, 135),
    [System.Drawing.Color]::FromArgb(95, 179, 232)
  )
  $blend.Positions = @(0.0, 0.52, 1.0)
  $gradient.InterpolationColors = $blend
  $Graphics.FillPath($gradient, $path)

  $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(46, 255, 255, 255), 2)
  $Graphics.DrawPath($shadowPen, $path)

  $routePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(247, 251, 255), 16)
  $routePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $routePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $routePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $Graphics.DrawLines($routePen, @(
      [System.Drawing.Point]::new(58, 54),
      [System.Drawing.Point]::new(96, 96),
      [System.Drawing.Point]::new(134, 54)
    ))
  $Graphics.DrawLine($routePen, [System.Drawing.Point]::new(96, 96), [System.Drawing.Point]::new(96, 140))

  $streamPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(142, 216, 255), 10)
  $streamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $streamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $curve = @(
    [System.Drawing.Point]::new(52, 132),
    [System.Drawing.Point]::new(72, 116),
    [System.Drawing.Point]::new(118, 116),
    [System.Drawing.Point]::new(140, 132)
  )
  $Graphics.DrawCurve($streamPen, $curve)

  $dotLight = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(223, 246, 255))
  $dotAccent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(142, 216, 255))
  $dotDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 53, 92))
  $Graphics.FillEllipse($dotLight, 42, 122, 20, 20)
  $Graphics.FillEllipse($dotAccent, 87, 102, 18, 18)
  $Graphics.FillEllipse($dotLight, 130, 122, 20, 20)
  $Graphics.FillRectangle($dotDark, 123, 119, 18, 18)

  $routePen.Dispose()
  $streamPen.Dispose()
  $shadowPen.Dispose()
  $dotLight.Dispose()
  $dotAccent.Dispose()
  $dotDark.Dispose()
  $gradient.Dispose()
  $path.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root "src-tauri\\icons"

if (-not (Test-Path $iconsDir)) {
  New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$bitmap = New-Object System.Drawing.Bitmap 192, 192
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
Draw-BrandMark -Graphics $graphics -CanvasSize 192

$pngPath = Join-Path $iconsDir "icon.png"
$icoPath = Join-Path $iconsDir "icon.ico"
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create($icoPath)
$icon.Save($stream)
$stream.Dispose()

$graphics.Dispose()
$bitmap.Dispose()
$icon.Dispose()
