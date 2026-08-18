# Creates the Google Play upload key for MEE - run this ONCE.
#
# Adapted from the DadGlass script, which has already been through a real Play
# submission. Every warning in here is one that cost somebody an afternoon.
#
# KEEP THIS FILE PURE ASCII. Windows PowerShell 5.1 reads a .ps1 with no BOM
# using the system ANSI codepage, so a UTF-8 em dash arrives as three bytes -
# one of which is a double quote - and the script dies with a baffling
# "Unexpected token ')'" a hundred lines further down.
#
#   powershell -ExecutionPolicy Bypass -File scripts\make-keystore.ps1
#
# It generates android\mee-release.jks and writes android\key.properties (both
# git-ignored) so that `gradlew bundleRelease` can sign the app bundle.
#
# You type the password; it is never written to your shell history and never
# leaves this machine. If the file already exists the script refuses to touch
# it - overwriting a key Play has already seen is unrecoverable.

$ErrorActionPreference = "Stop"

$root      = Split-Path -Parent $PSScriptRoot
$storePath = Join-Path $root "android\mee-release.jks"
$propsPath = Join-Path $root "android\key.properties"
$alias     = "mee"

Write-Host ""
Write-Host "  MEE - upload key for Google Play" -ForegroundColor Cyan
Write-Host "  --------------------------------" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path (Join-Path $root "android"))) {
    Write-Host "  There is no android\ directory yet." -ForegroundColor Red
    Write-Host "  Run this first:  npx cap add android"
    exit 1
}

# --- refuse to clobber an existing key -------------------------------------
if (Test-Path $storePath) {
    Write-Host "  A key already exists at:" -ForegroundColor Yellow
    Write-Host "    $storePath"
    Write-Host ""
    Write-Host "  Nothing was changed. If you truly want a new key, move the old"
    Write-Host "  one somewhere safe first - but note that once an app has been"
    Write-Host "  published, only the ORIGINAL key can ever update it."
    exit 1
}

# --- locate keytool --------------------------------------------------------
# Android Studio bundles its own JRE in jbr\. Prefer it: it is the JDK Gradle
# will use anyway, so the key is made by the same Java that will read it.
$candidates = @(
    "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe",
    "${env:ProgramFiles(x86)}\Android\Android Studio\jbr\bin\keytool.exe",
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe",
    "$env:JAVA_HOME\bin\keytool.exe"
)
$keytool = $null
foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { $keytool = $c; break }
}
if (-not $keytool) {
    $cmd = Get-Command keytool -ErrorAction SilentlyContinue
    if ($cmd) { $keytool = $cmd.Source }
}
if (-not $keytool) {
    Write-Host "  Could not find keytool. Is Android Studio installed?" -ForegroundColor Red
    exit 1
}
Write-Host "  Using: $keytool" -ForegroundColor DarkGray
Write-Host ""

# --- who the certificate belongs to ----------------------------------------
Write-Host "  These go into the certificate. They are not shown in the Play"
Write-Host "  listing - press Enter to accept the suggestion in brackets."
Write-Host ""
$name = Read-Host "  Your name [Iulian-Teodor Voicila]"
if ([string]::IsNullOrWhiteSpace($name)) { $name = "Iulian-Teodor Voicila" }
$country = Read-Host "  Country code, 2 letters [RO]"
if ([string]::IsNullOrWhiteSpace($country)) { $country = "RO" }
$dname = "CN=$name, OU=MEE, O=MEE, C=$country"

# --- the password ----------------------------------------------------------
Write-Host ""
Write-Host "  Now choose a password (at least 6 characters)." -ForegroundColor Yellow
Write-Host "  WRITE IT DOWN somewhere safe before you continue."
Write-Host ""

$pw = $null
while ($true) {
    $p1 = Read-Host "  Password" -AsSecureString
    $p2 = Read-Host "  Password again" -AsSecureString

    $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1)
    $s1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1)
    $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2)
    $s2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2)

    if ($s1 -ne $s2) { Write-Host "  They do not match. Try again." -ForegroundColor Red; continue }
    if ($s1.Length -lt 6) { Write-Host "  Too short - Java requires at least 6 characters." -ForegroundColor Red; continue }
    $pw = $s1
    break
}

# --- generate --------------------------------------------------------------
Write-Host ""
Write-Host "  Generating key..." -ForegroundColor Cyan

# -validity 10000 days (~27 years). Google requires the key to stay valid well
# past 2033, so anything shorter would be rejected at upload.
& $keytool -genkeypair -v `
    -keystore $storePath `
    -alias $alias `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storetype PKCS12 `
    -dname $dname `
    -storepass $pw -keypass $pw

if ($LASTEXITCODE -ne 0) {
    Write-Host "  keytool failed (exit $LASTEXITCODE). Nothing was written." -ForegroundColor Red
    exit 1
}

# --- prove the key is usable before writing anything else ------------------
& $keytool -list -keystore $storePath -alias $alias -storepass $pw | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  The key was written but could not be read back." -ForegroundColor Red
    exit 1
}

# --- hand the passwords to Gradle ------------------------------------------
# Written with Set-Content -Encoding ascii: Java's Properties loader reads
# ISO-8859-1, and a UTF-8 BOM here would corrupt the first key name.
#
# A backslash starts an escape sequence in a .properties VALUE, so a password
# containing one would silently load wrong and the build would fail with a
# baffling "keystore password was incorrect". Double it. (The store path is
# written with forward slashes for the same reason.)
$pwEscaped = $pw -replace '\', '\'
$storeForProps = $storePath -replace '\', '/'

$propsLines = @(
    "# Generated by scripts/make-keystore.ps1 - DO NOT COMMIT (git-ignored).",
    "# Losing this file's passwords means a Play upload-key reset and days of",
    "# waiting, at a moment when you probably need to publish quickly.",
    "storeFile=$storeForProps",
    "storePassword=$pwEscaped",
    "keyAlias=$alias",
    "keyPassword=$pwEscaped"
)
Set-Content -Path $propsPath -Value $propsLines -Encoding ascii

$pw = $null
$pwEscaped = $null
[GC]::Collect()

$check = Get-Content $propsPath | Where-Object { $_ -match '^storeFile=.+' }
if (-not $check) {
    Write-Host "  key.properties was written without a store path." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
Write-Host ""
Write-Host "    key      $storePath"
Write-Host "    settings $propsPath"
Write-Host ""
Write-Host "  BACK BOTH FILES UP NOW, in two separate places." -ForegroundColor Yellow
Write-Host "  With Play App Signing this is your UPLOAD key, so a loss is"
Write-Host "  recoverable - but only through a reset that takes days."
Write-Host ""
