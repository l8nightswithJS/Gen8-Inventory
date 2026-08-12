$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  throw 'Run this installer from PowerShell as Administrator.'
}

$Port = 31991
$TaskName = 'Gen8 Zebra Print Agent'
$InstallDir = Join-Path $env:ProgramData 'Gen8Inventory\ZebraPrintAgent'
$SourceAgent = Join-Path $PSScriptRoot 'Gen8-Zebra-Print-Agent.ps1'
$TargetAgent = Join-Path $InstallDir 'Gen8-Zebra-Print-Agent.ps1'

if (-not (Test-Path $SourceAgent)) {
  throw "Missing $SourceAgent. Keep the installer and agent files in the same folder."
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path $SourceAgent -Destination $TargetAgent -Force

try {
  $printers = @(Get-CimInstance Win32_Printer | Sort-Object Name)
}
catch {
  $printers = @(Get-Printer | Sort-Object Name)
}

$zebraPrinters = @($printers | Where-Object { $_.Name -match '(?i)zebra|zdesigner' })
if ($zebraPrinters.Count -eq 0) {
  Write-Host ''
  Write-Host 'No Zebra printer was detected in Windows.' -ForegroundColor Yellow
  Write-Host 'Install the Zebra printer/driver, then run this installer again.'
  exit 1
}

Write-Host ''
Write-Host 'Detected Zebra printers:' -ForegroundColor Cyan
for ($index = 0; $index -lt $zebraPrinters.Count; $index += 1) {
  Write-Host "  [$($index + 1)] $($zebraPrinters[$index].Name)"
}

$selectedIndex = 0
if ($zebraPrinters.Count -gt 1) {
  $answer = Read-Host 'Choose the printer number'
  $number = 0
  if (-not [int]::TryParse($answer, [ref]$number) -or $number -lt 1 -or $number -gt $zebraPrinters.Count) {
    throw 'Invalid printer selection.'
  }
  $selectedIndex = $number - 1
}
$PrinterName = [string]$zebraPrinters[$selectedIndex].Name

$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$url = "http://127.0.0.1:$Port/"
& netsh http delete urlacl "url=$url" 2>$null | Out-Null
& netsh http add urlacl "url=$url" "user=$user" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Could not reserve the local print-agent URL.'
}

$escapedAgent = $TargetAgent.Replace('"', '\"')
$escapedPrinter = $PrinterName.Replace('"', '\"')
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$escapedAgent`" -Port $Port -PrinterName `"$escapedPrinter`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 2
try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 4
  Write-Host ''
  Write-Host 'Gen8 Zebra Print Agent installed successfully.' -ForegroundColor Green
  Write-Host "Printer: $($status.printer_name)"
  Write-Host "Local agent: http://127.0.0.1:$Port"
  Write-Host 'It will start automatically when you sign in to Windows.'
}
catch {
  Write-Host ''
  Write-Host 'The scheduled task was installed, but the health check did not respond yet.' -ForegroundColor Yellow
  Write-Host "Open Task Scheduler and start '$TaskName', or sign out/in, then retry."
}
