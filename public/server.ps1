param([switch]$NoBrowser)

# ------------------------------------------------------------
#  Minimaler lokaler Webserver fuer die CARS-Kfz-Simulation.
#  Nutzt nur eingebautes Windows-PowerShell - keine Installation.
#  Zum Beenden einfach dieses Fenster schliessen.
#
#  Verbindungen werden PARALLEL bedient (Runspace-Pool). Das ist
#  noetig, weil Browser mehrere Verbindungen gleichzeitig oeffnen -
#  Firefox auch spekulative, die zunaechst nichts senden. Ein
#  sequentieller Server blockiert daran (Read-Timeout pro Socket)
#  und die Seite bleibt weiss.
# ------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootFull = [System.IO.Path]::GetFullPath($root)

$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8';
  '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.gif'='image/gif'; '.webp'='image/webp'; '.avif'='image/avif';
  '.ico'='image/x-icon'; '.webmanifest'='application/manifest+json';
  '.wasm'='application/wasm'; '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json';
  '.mp4'='video/mp4'; '.webm'='video/webm'; '.mp3'='audio/mpeg'; '.wav'='audio/wav';
  '.ogg'='audio/ogg'; '.m4a'='audio/mp4';
  '.hdr'='application/octet-stream'; '.bin'='application/octet-stream';
  '.ktx2'='application/octet-stream'; '.drc'='application/octet-stream';
  '.ttf'='font/ttf'; '.otf'='font/otf'; '.woff'='font/woff'; '.woff2'='font/woff2';
  '.map'='application/json'; '.txt'='text/plain; charset=utf-8'
}

# --- freien Port suchen (8080..8099) ---
$listener = $null
$port = 0
for ($p = 8080; $p -le 8099; $p++) {
  try {
    $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
    $l.Start()
    $listener = $l; $port = $p; break
  } catch { }
}
if ($null -eq $listener) {
  Write-Host "Kein freier Port gefunden (8080-8099 belegt)." -ForegroundColor Red
  Read-Host "Zum Schliessen Enter druecken"
  exit 1
}

$url = "http://localhost:$port/"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   CARS - Kfz-Simulation laeuft" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Adresse:  $url"
Write-Host ""
Write-Host "   >> Der Browser oeffnet sich automatisch."
Write-Host "   >> Zum BEENDEN einfach dieses Fenster schliessen."
Write-Host ""

# --- Handler: bedient genau eine Verbindung ---
$handler = {
  param($client, $rootFull, $mime)

  $stream = $null
  try {
    $client.NoDelay = $true
    $stream = $client.GetStream()
    $stream.ReadTimeout  = 5000
    $stream.WriteTimeout = 120000
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)

    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrEmpty($requestLine)) { return }

    # Header lesen - nur Range wird ausgewertet
    $rangeStart = $null; $rangeEnd = $null
    while ($true) {
      $h = $reader.ReadLine()
      if ($null -eq $h -or $h -eq '') { break }
      if ($h -match '^\s*Range\s*:\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$') {
        if ($matches[1] -ne '') { $rangeStart = [int64]$matches[1] }
        if ($matches[2] -ne '') { $rangeEnd   = [int64]$matches[2] }
      }
    }

    $parts  = $requestLine.Split(' ')
    $method = $parts[0].ToUpper()
    $path   = $parts[1]

    $qi = $path.IndexOf('?'); if ($qi -ge 0) { $path = $path.Substring(0, $qi) }
    $path = [System.Uri]::UnescapeDataString($path)
    if ($path -eq '/') { $path = '/index.html' }

    $rel  = $path.TrimStart('/').Replace('/', '\')
    $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))

    if ($method -ne 'GET' -and $method -ne 'HEAD') {
      $body = [System.Text.Encoding]::UTF8.GetBytes("405 Method Not Allowed")
      $head = "HTTP/1.1 405 Method Not Allowed`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($body, 0, $body.Length)
      $stream.Flush(); return
    }

    if ((-not $full.StartsWith($rootFull)) -or (-not (Test-Path $full -PathType Leaf))) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($body, 0, $body.Length)
      $stream.Flush(); return
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $ct  = $mime[$ext]; if ($null -eq $ct) { $ct = 'application/octet-stream' }

    $fs = [System.IO.File]::Open($full, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
    try {
      $total  = $fs.Length
      $status = '200 OK'
      $start  = [int64]0
      $end    = $total - 1

      if ($null -ne $rangeStart -or $null -ne $rangeEnd) {
        if ($null -eq $rangeStart) {
          # "bytes=-N" -> die letzten N Bytes
          $start = [Math]::Max([int64]0, $total - $rangeEnd)
          $end   = $total - 1
        } else {
          $start = $rangeStart
          if ($null -ne $rangeEnd) { $end = [Math]::Min($rangeEnd, $total - 1) }
        }
        if ($start -le $end -and $start -lt $total) { $status = '206 Partial Content' }
        else { $start = [int64]0; $end = $total - 1 }
      }

      $len = $end - $start + 1

      $head = "HTTP/1.1 $status`r`n" +
              "Content-Type: $ct`r`n" +
              "Content-Length: $len`r`n" +
              "Accept-Ranges: bytes`r`n" +
              "Cache-Control: no-cache`r`n" +
              "Connection: close`r`n"
      if ($status -eq '206 Partial Content') {
        $head += "Content-Range: bytes $start-$end/$total`r`n"
      }
      $head += "`r`n"

      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length)

      if ($method -eq 'GET') {
        $fs.Position = $start
        $buf = New-Object byte[] 262144
        $remaining = $len
        while ($remaining -gt 0) {
          $toRead = [int][Math]::Min([int64]$buf.Length, $remaining)
          $n = $fs.Read($buf, 0, $toRead)
          if ($n -le 0) { break }
          $stream.Write($buf, 0, $n)
          $remaining -= $n
        }
      }
      $stream.Flush()
    } finally {
      $fs.Dispose()
    }
  } catch {
    # einzelne fehlerhafte/abgebrochene Verbindung ignorieren
  } finally {
    try { if ($null -ne $stream) { $stream.Dispose() } } catch { }
    try { $client.Close() } catch { }
  }
}

# --- Runspace-Pool: mehrere Verbindungen gleichzeitig bedienen ---
$pool = [RunspaceFactory]::CreateRunspacePool(1, 32)
$pool.Open()
$jobs = New-Object System.Collections.ArrayList

if (-not $NoBrowser) { Start-Process $url }

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    $ps = [PowerShell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($handler).AddArgument($client).AddArgument($rootFull).AddArgument($mime)
    $async = $ps.BeginInvoke()
    [void]$jobs.Add([pscustomobject]@{ PS = $ps; Async = $async })

    # fertige Jobs aufraeumen
    if ($jobs.Count -gt 16) {
      for ($i = $jobs.Count - 1; $i -ge 0; $i--) {
        if ($jobs[$i].Async.IsCompleted) {
          try { [void]$jobs[$i].PS.EndInvoke($jobs[$i].Async) } catch { }
          try { $jobs[$i].PS.Dispose() } catch { }
          $jobs.RemoveAt($i)
        }
      }
    }
  }
} finally {
  try { $listener.Stop() } catch { }
  try { $pool.Close() } catch { }
}
