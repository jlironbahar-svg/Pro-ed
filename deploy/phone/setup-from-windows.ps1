# ProEd: set up the ProEd server on an old Android phone, from a Windows PC, over USB (ADB).
#
# Run in PowerShell (Windows key, type "powershell", Enter), then paste:
#   irm https://raw.githubusercontent.com/jlironbahar-svg/Pro-ed/HEAD/deploy/phone/setup-from-windows.ps1 | iex
#
# What it does: downloads ADB, installs Termux on the phone, installs and configures ProEd
# (deploy/phone/install.sh), shows your admin password and 2FA key, starts the server and checks it.
# Before: on the phone, enable Developer options > USB debugging, then plug it into the PC.

# 'Continue': ADB writes normal messages to stderr, which 'Stop' would turn into fatal errors in Windows PowerShell 5.1.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'jlironbahar-svg/Pro-ed'
# ?t= avoids GitHub serving a cached older copy right after an update.
$InstallUrl = "https://raw.githubusercontent.com/$Repo/HEAD/deploy/phone/install.sh?t=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$Work = Join-Path $env:LOCALAPPDATA 'ProEd'
$Home_ = '/data/data/com.termux/files/home'
$TermuxBin = '/data/data/com.termux/files/usr/bin'
New-Item -ItemType Directory -Force -Path $Work | Out-Null

function Step($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host ''; Write-Host $text -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
function Download($url, $file) {
  try { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file -ErrorAction Stop }
  catch { Fail "Download failed ($url): $($_.Exception.Message)" }
}

# 1. ADB (Android platform-tools)
Step '1/8 ADB'
$Adb = Join-Path $Work 'platform-tools\adb.exe'
if (-not (Test-Path $Adb)) {
  Write-Host 'Downloading Android platform-tools...'
  $zip = Join-Path $Work 'platform-tools.zip'
  Download 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' $zip
  try { Expand-Archive -Path $zip -DestinationPath $Work -Force -ErrorAction Stop } catch { Fail "Could not unzip ADB: $($_.Exception.Message)" }
  Remove-Item $zip
}
& $Adb start-server 2>$null | Out-Null

# 2. Phone
Step '2/8 Phone'
Write-Host 'Plug in the phone, unlock it, and tap "Allow" (Always allow) on the USB debugging question.'
$waited = 0
while ($true) {
  $state = ((& $Adb get-state 2>$null) -join '').Trim()
  if ($state -eq 'device') { break }
  if ($waited -eq 30) { Write-Host 'No phone yet. Check the cable, USB debugging, and the "Allow" question on the phone.' -ForegroundColor Yellow }
  if ($waited -eq 90) { Write-Host 'Still nothing. You may need the Google USB driver: https://developer.android.com/studio/run/win-usb' -ForegroundColor Yellow }
  Start-Sleep -Seconds 2; $waited += 2
  if ($waited -ge 300) { Fail 'The phone was not detected.' }
}
$abi = ((& $Adb shell getprop ro.product.cpu.abi) -join '').Trim()
$model = ((& $Adb shell getprop ro.product.model) -join '').Trim()
$android = ((& $Adb shell getprop ro.build.version.release) -join '').Trim()
Write-Host "Found: $model, Android $android, $abi"

# 3. ngrok details
Step '3/8 ngrok'
Write-Host 'From https://dashboard.ngrok.com (free account):'
$Token = (Read-Host 'Paste your ngrok authtoken').Trim()
$Domain = (Read-Host 'Type your ngrok domain (for example proed-xyz.ngrok-free.app)').Trim()
$Domain = ($Domain -replace '^https?://', '' -replace '/.*$', '').ToLower()
if ($Token -notmatch '^[A-Za-z0-9_\-]{20,}$') { Fail 'That authtoken does not look right.' }
if ($Domain -notmatch '^[a-z0-9.\-]+$') { Fail 'That domain does not look right.' }

# 4. Termux (GitHub build: it allows "run-as", which lets this script check progress)
Step '4/8 Termux'
$check = (& $Adb shell run-as com.termux id 2>&1) -join ' '
if ($check -match 'not debuggable') {
  Write-Host 'Termux is installed from the Play Store or F-Droid. This script needs the GitHub version.' -ForegroundColor Yellow
  $answer = Read-Host 'Uninstall the current Termux (its files are deleted) and install the GitHub version? (y/n)'
  if ($answer -ne 'y') { Fail 'Stopped. Uninstall Termux yourself, then run this again.' }
  & $Adb uninstall com.termux | Out-Null
  $check = 'unknown package'
}
if ($check -match 'unknown package|is unknown|not found') {
  Write-Host 'Downloading Termux...'
  try { $release = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/termux/termux-app/releases/latest' -ErrorAction Stop }
  catch { Fail "Could not reach GitHub: $($_.Exception.Message)" }
  $asset = $release.assets | Where-Object { $_.name -like "*github-debug_$abi.apk" } | Select-Object -First 1
  if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -like '*github-debug_universal.apk' } | Select-Object -First 1 }
  if (-not $asset) { Fail 'Could not find a Termux download for this phone.' }
  $apk = Join-Path $Work 'termux.apk'
  Download $asset.browser_download_url $apk
  Write-Host 'Installing Termux on the phone...'
  $res = (& $Adb install -r $apk 2>&1) -join ' '
  if ($res -notmatch 'Success') { Fail "Termux could not be installed: $res" }
}

# 5. Phone settings: no battery limits for Termux, screen on while charging
Step '5/8 Phone settings'
& $Adb shell dumpsys deviceidle whitelist +com.termux | Out-Null
& $Adb shell settings put global stay_on_while_plugged_in 7 | Out-Null
Write-Host 'Termux is excluded from battery saving; the screen stays on while charging.'

# 6. First start of Termux (it installs its base files, about 1 minute)
Step '6/8 Starting Termux'
& $Adb shell input keyevent 224 | Out-Null
& $Adb shell am start -n com.termux/.app.TermuxActivity | Out-Null
$waited = 0
while ($true) {
  $ready = (& $Adb shell "run-as com.termux sh -c 'test -x $TermuxBin/bash && test -x $TermuxBin/base64 && echo yes'" 2>$null) -join ''
  if ($ready -match 'yes') { break }
  Start-Sleep -Seconds 3; $waited += 3
  if ($waited -ge 300) { Fail 'Termux did not finish its first start. Open Termux on the phone, wait, then run this again.' }
}
Start-Sleep -Seconds 5
Write-Host 'Termux is ready.'

# 7. Install ProEd in Termux (the script runs on the phone screen)
Step '7/8 Installing ProEd on the phone (5 to 15 minutes, watch the phone screen)'
$go = @"
export NGROK_TOKEN='$Token'
export NGROK_DOMAIN='$Domain'
export PROED_SAVE_SETUP=1
export DEBIAN_FRONTEND=noninteractive
rm -f ~/proed-status
# Upgrade all Termux packages first with apt-get (pkg needs curl, which a partial upgrade breaks).
mkdir -p "`$PREFIX/etc/apt/apt.conf.d"
printf 'Dpkg::Options { "--force-confdef"; "--force-confold"; };\n' > "`$PREFIX/etc/apt/apt.conf.d/99proed"
if apt-get update && apt-get -y full-upgrade && curl -fsSL "$InstallUrl" -o ~/proed-install.sh && bash ~/proed-install.sh; then echo ok > ~/proed-status; else echo failed > ~/proed-status; fi
rm -f ~/proed-go.sh ~/proed-install.sh
"@
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(($go -replace "`r", '')))
& $Adb shell "run-as com.termux sh -c 'echo $b64 | $TermuxBin/base64 -d > $Home_/proed-go.sh'" | Out-Null
& $Adb shell am start -n com.termux/.app.TermuxActivity | Out-Null
Start-Sleep -Seconds 2
& $Adb shell input text 'bash%sproed-go.sh' | Out-Null
& $Adb shell input keyevent 66 | Out-Null
$waited = 0
while ($true) {
  $status = ((& $Adb shell "run-as com.termux sh -c 'cat $Home_/proed-status 2>/dev/null'" 2>$null) -join '').Trim()
  if ($status -eq 'ok') { break }
  if ($status -eq 'failed') { Fail 'The installation failed. Read the error on the phone screen and send a photo of it to Claude.' }
  Start-Sleep -Seconds 10; $waited += 10
  if ($waited % 60 -eq 0) { Write-Host "  still installing... ($([int]($waited / 60)) min)" }
  if ($waited -ge 2400) { Fail 'The installation is taking too long. Look at the phone screen.' }
}
Write-Host 'ProEd is installed.' -ForegroundColor Green

# Admin password and 2FA key (read once, then deleted from the phone)
$out = & $Adb shell "run-as com.termux sh -c 'cat $Home_/proed/setup-output.txt 2>/dev/null; rm -f $Home_/proed/setup-output.txt'"
$password = ($out | Select-String -Pattern 'Password:' | Select-Object -First 1)
$key = ($out | Select-String -Pattern 'enter this key by hand' | Select-Object -First 1)

# 8. Start the server and check it from the internet
Step '8/8 Starting ProEd'
& $Adb shell input text 'proed-start' | Out-Null
& $Adb shell input keyevent 66 | Out-Null
$online = $false
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/healthz" -Headers @{ 'ngrok-skip-browser-warning' = '1' } -TimeoutSec 10
    if ($r.Content -match ([regex]::Escape(ok:true))) { $online = $true; break }
  } catch { }
}

Write-Host ''
Write-Host '==================== ProEd ====================' -ForegroundColor Cyan
if ($online) { Write-Host "Online: https://$Domain" -ForegroundColor Green } else { Write-Host "Not reachable yet. On the phone, type proed-start in Termux. Address: https://$Domain" -ForegroundColor Yellow }
Write-Host "iPhone (Safari, Share > Add to Home Screen): https://$Domain"
Write-Host "Admin in a browser: https://$Domain/console/"
if ($password) {
  Write-Host ''
  Write-Host 'Admin account (write this down now, it is not shown again):' -ForegroundColor Yellow
  Write-Host "  $($password.Line.Trim())"
  if ($key) { Write-Host "  2FA: add it in Google Authenticator with 'Enter a setup key': $($key.Line.Trim() -replace '^.*by hand:\s*', '')" }
} else {
  Write-Host 'Admin account: already created earlier (password unchanged).'
}
Write-Host ''
Write-Host "Last step: send this address to Claude so the APKs connect to your phone: https://$Domain" -ForegroundColor Cyan
Write-Host 'Keep the phone charging and on Wi-Fi. After a restart, open Termux and type: proed-start'
Read-Host 'Press Enter to close'
