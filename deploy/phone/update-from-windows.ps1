# ProEd: update the phone's start/stop scripts over USB and restart the server.
# Run in PowerShell with the phone plugged in:
#   irm "https://raw.githubusercontent.com/jlironbahar-svg/Pro-ed/HEAD/deploy/phone/update-from-windows.ps1?v=9" | iex
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = 'jlironbahar-svg/Pro-ed'
$Adb = Join-Path $env:LOCALAPPDATA 'ProEd\platform-tools\adb.exe'
$Bin = '/data/data/com.termux/files/usr/bin'
$Home_ = '/data/data/com.termux/files/home'
if (-not (Test-Path $Adb)) { Write-Host 'ADB not found: run setup-from-windows.ps1 first.' -ForegroundColor Red; return }
if (((& $Adb get-state 2>$null) -join '').Trim() -ne 'device') { Write-Host 'Phone not detected: plug it in and unlock it.' -ForegroundColor Red; return }

Write-Host '== Why the server stopped (last lines of its log):' -ForegroundColor Cyan
& $Adb shell "run-as com.termux sh -c 'tail -n 25 $Home_/proed/server.log'"

Write-Host '== Installing the new start/stop scripts' -ForegroundColor Cyan
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
foreach ($name in 'start', 'stop') {
  try { $s = (Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/HEAD/deploy/phone/$name.sh?t=$ts" -ErrorAction Stop).Content }
  catch { Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red; return }
  $b = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(($s -replace "`r", '')))
  & $Adb shell "run-as com.termux sh -c 'echo $b | $Bin/base64 -d > $Bin/proed-$name && chmod 700 $Bin/proed-$name && cp $Bin/proed-$name $Home_/proed/$name.sh && echo proed-$name updated'"
}

Write-Host '== Restarting ProEd on the phone' -ForegroundColor Cyan
& $Adb shell input keyevent 224 | Out-Null
& $Adb shell am start -n com.termux/.app.TermuxActivity | Out-Null
Start-Sleep -Seconds 2
& $Adb shell input text 'proed-start' | Out-Null
& $Adb shell input keyevent 66 | Out-Null
$domain = ((& $Adb shell "run-as com.termux sh -c 'cat $Home_/proed/ngrok.env'") -join '') -replace '^.*NGROK_DOMAIN=', '' -replace '\s', ''
$online = $false
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$domain/healthz" -Headers @{ 'ngrok-skip-browser-warning' = '1' } -TimeoutSec 10
    if ($r.Content.Contains('"ok":true')) { $online = $true; break }
  } catch { }
}
if ($online) { Write-Host "Online: https://$domain (it now restarts by itself if it stops)" -ForegroundColor Green }
else { Write-Host "Not reachable yet. Send a photo of this window and of the phone screen to Claude." -ForegroundColor Yellow }
