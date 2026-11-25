# Real install and update scenarios, meant for a disposable Windows machine: it removes any installed Rondo.
$ErrorActionPreference = 'Stop'
$published110 = (Resolve-Path 'old/Rondo-Setup-1.1.0.exe').Path
$published111 = (Resolve-Path 'old/Rondo-Setup-1.1.1.exe').Path
$new112 = (Resolve-Path 'out112/Rondo-Setup-1.1.2.exe').Path
$new110 = (Resolve-Path 'out110/Rondo-Setup-1.1.0.exe').Path

$dir = "$env:LOCALAPPDATA\Programs\rondo"
$exe = "$dir\Rondo.exe"
$link = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Rondo.lnk"
$marker = "$env:APPDATA\rondo\marker.txt"
$results = @()

function Stop-Rondo { Get-Process Rondo -ErrorAction Ignore | Stop-Process -Force -ErrorAction Ignore; Start-Sleep 2 }
function Get-Version { if (Test-Path $exe) { (Get-Item $exe).VersionInfo.ProductVersion -replace '\.0$', '' } else { 'none' } }
function Install-Rondo($setup) { Start-Process $setup '/S' -Wait }
function Reset-Rondo {
    Stop-Rondo
    if (Test-Path "$dir\Uninstall Rondo.exe") { Start-Process "$dir\Uninstall Rondo.exe" '/S /currentuser' -Wait; Start-Sleep 8 }
    Remove-Item $dir, "$env:APPDATA\rondo", "$env:LOCALAPPDATA\rondo-updater", $link -Recurse -Force -ErrorAction Ignore
}
function Wait-Setup { while (Get-Process | Where-Object { $_.Name -like 'Rondo-Setup*' -or $_.Name -like 'old-uninstaller*' }) { Start-Sleep 1 } }
function Add-Result($name, $want, $mustHaveLink) {
    $got = Get-Version
    $hasLink = Test-Path $link
    $data = Test-Path $marker
    $ok = ($got -eq $want) -and $data -and ($hasLink -or -not $mustHaveLink)
    $script:results += [pscustomobject]@{ Scenario = $name; Version = "$got (want $want)"; StartMenu = $hasLink; Data = $data; Result = $(if ($ok) { 'ok' } else { 'FAIL' }) }
}
function Initialize-Rondo($setup) {
    Reset-Rondo
    Install-Rondo $setup
    New-Item -ItemType Directory "$env:APPDATA\rondo" -Force | Out-Null
    'kept' | Set-Content $marker
    if (-not (Test-Path $link)) { throw "No Start menu entry after a first install of $setup" }
}

# Published updater on an app that is closed, then reopened while the installer works.
# 1.1.0 -> 1.1.1 reproduces the published behaviour: its Start menu entry is reported, not required.
$cases = @(
    @{ From = $published110; To = $published111; Want = '1.1.1'; Guard = $false; Name = '1.1.0 -> 1.1.1 published' },
    @{ From = $published110; To = $new112; Want = '1.1.2'; Guard = $true; Name = '1.1.0 -> 1.1.2 new' },
    @{ From = $published111; To = $new112; Want = '1.1.2'; Guard = $true; Name = '1.1.1 -> 1.1.2 new' }
)
foreach ($case in $cases) {
    foreach ($delay in @(-1, 300, 1000, 2500, 5000)) {
        Initialize-Rondo $case.From
        $setup = Start-Process $case.To '--updated /S' -PassThru
        if ($delay -ge 0) {
            Start-Sleep -Milliseconds $delay
            if (Test-Path $exe) { try { Start-Process $exe } catch { Write-Host "reopen refused: $_" } }
        }
        if (-not $setup.WaitForExit(120000)) { Write-Host 'installer still running after 120 s'; $setup.Kill() }
        Wait-Setup
        Stop-Rondo
        $when = if ($delay -lt 0) { 'closed' } else { "reopened after $delay ms" }
        Add-Result "$($case.Name), $when" $case.Want $case.Guard
    }
}

# The new updater end to end: the new code numbered 1.1.0 must find, download and install the published 1.1.1.
Initialize-Rondo $new110
$log = "$env:TEMP\rondo.log"
for ($launch = 1; $launch -le 3 -and (Get-Version) -ne '1.1.1'; $launch++) {
    Write-Host "launch $launch"
    Start-Process $exe -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    for ($i = 0; $i -lt 60 -and (Get-Version) -ne '1.1.1'; $i++) { Start-Sleep 2 }
    Get-Content $log, "$log.err" -ErrorAction Ignore | Select-Object -Last 5
    if ((Get-Version) -ne '1.1.1') { Stop-Rondo }
}
Wait-Setup
Start-Sleep 10
$reopened = [bool](Get-Process Rondo -ErrorAction Ignore)
Add-Result "updater end to end (launches: $($launch - 1), reopened: $reopened)" '1.1.1' $false
if (-not $reopened) { $results[-1].Result = 'FAIL' }

$results | Format-Table -AutoSize -Wrap | Out-String -Width 200 | Write-Host
if ($results.Result -contains 'FAIL') { exit 1 }
