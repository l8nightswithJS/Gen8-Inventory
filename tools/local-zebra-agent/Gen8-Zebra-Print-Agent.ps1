param(
  [int]$Port = 31991,
  [string]$PrinterName = $env:GEN8_ZEBRA_PRINTER
)

$ErrorActionPreference = 'Stop'
$AgentVersion = '1.0.0'
$Prefix = "http://127.0.0.1:$Port/"

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class Gen8RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private class DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern int StartDocPrinter(IntPtr hPrinter, int level, [In] DOC_INFO_1 di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int count, out int written);

    public static void SendUtf8(string printerName, string data)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(data ?? String.Empty);
        IntPtr printer = IntPtr.Zero;
        IntPtr unmanaged = IntPtr.Zero;
        bool docStarted = false;
        bool pageStarted = false;

        try
        {
            if (!OpenPrinter(printerName, out printer, IntPtr.Zero))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Unable to open printer: " + printerName);

            var doc = new DOC_INFO_1 {
                pDocName = "Gen8 Inventory Zebra Label",
                pOutputFile = null,
                pDataType = "RAW"
            };

            if (StartDocPrinter(printer, 1, doc) == 0)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Unable to start RAW print document.");
            docStarted = true;

            if (!StartPagePrinter(printer))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Unable to start printer page.");
            pageStarted = true;

            unmanaged = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, unmanaged, bytes.Length);
            int written;
            if (!WritePrinter(printer, unmanaged, bytes.Length, out written))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Windows could not write the ZPL print job.");
            if (written != bytes.Length)
                throw new InvalidOperationException("Windows accepted only part of the ZPL print job.");
        }
        finally
        {
            if (unmanaged != IntPtr.Zero) Marshal.FreeCoTaskMem(unmanaged);
            if (printer != IntPtr.Zero)
            {
                if (pageStarted) EndPagePrinter(printer);
                if (docStarted) EndDocPrinter(printer);
                ClosePrinter(printer);
            }
        }
    }
}
'@

$DefaultOrigins = @(
  'https://test-g8.biz',
  'https://www.test-g8.biz',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
)
$ExtraOrigins = @()
if ($env:GEN8_ALLOWED_ORIGINS) {
  $ExtraOrigins = $env:GEN8_ALLOWED_ORIGINS.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}
$AllowedOrigins = @($DefaultOrigins + $ExtraOrigins | Select-Object -Unique)

function Get-InstalledPrinters {
  try {
    return @(Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline, PrinterStatus)
  }
  catch {
    return @(Get-Printer | Select-Object Name, @{Name='Default';Expression={$false}}, WorkOffline, PrinterStatus)
  }
}

function Resolve-PrinterName {
  param([string]$Requested)
  $printers = Get-InstalledPrinters
  if ($Requested) {
    $match = $printers | Where-Object { $_.Name -eq $Requested } | Select-Object -First 1
    if (-not $match) { throw "Configured Zebra printer '$Requested' is not installed in Windows." }
    return $match.Name
  }

  $zebra = @($printers | Where-Object { $_.Name -match '(?i)zebra|zdesigner' })
  if ($zebra.Count -eq 0) {
    throw 'No installed Zebra printer was found in Windows. Install the Zebra printer/driver first.'
  }
  $defaultZebra = $zebra | Where-Object { $_.Default } | Select-Object -First 1
  if ($defaultZebra) { return $defaultZebra.Name }
  return $zebra[0].Name
}

function Origin-IsAllowed {
  param([string]$Origin)
  if (-not $Origin) { return $true }
  return $AllowedOrigins -contains $Origin
}

function Set-ResponseHeaders {
  param($Response, [string]$Origin)
  if ($Origin -and (Origin-IsAllowed $Origin)) {
    $Response.Headers['Access-Control-Allow-Origin'] = $Origin
    $Response.Headers['Vary'] = 'Origin'
  }
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
  $Response.Headers['Access-Control-Allow-Private-Network'] = 'true'
  $Response.Headers['Cache-Control'] = 'no-store'
}

function Write-JsonResponse {
  param($Context, [int]$StatusCode, $Body)
  $json = $Body | ConvertTo-Json -Depth 8 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = 'application/json; charset=utf-8'
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.OutputStream.Close()
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
Write-Host "Gen8 Zebra Print Agent $AgentVersion listening on $Prefix"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $origin = $request.Headers['Origin']
    Set-ResponseHeaders $context.Response $origin

    if (-not (Origin-IsAllowed $origin)) {
      Write-JsonResponse $context 403 @{ ok = $false; message = 'This website origin is not allowed to use the local print agent.' }
      continue
    }

    if ($request.HttpMethod -eq 'OPTIONS') {
      $context.Response.StatusCode = 204
      $context.Response.OutputStream.Close()
      continue
    }

    try {
      $path = $request.Url.AbsolutePath.TrimEnd('/')
      if (-not $path) { $path = '/' }

      if ($request.HttpMethod -eq 'GET' -and $path -eq '/health') {
        $resolved = Resolve-PrinterName $PrinterName
        Write-JsonResponse $context 200 @{
          ok = $true
          agent_version = $AgentVersion
          printer_name = $resolved
          mode = 'windows_raw_spooler'
        }
        continue
      }

      if ($request.HttpMethod -eq 'GET' -and $path -eq '/printers') {
        Write-JsonResponse $context 200 @{
          ok = $true
          printers = @(Get-InstalledPrinters)
        }
        continue
      }

      if ($request.HttpMethod -eq 'POST' -and $path -eq '/print') {
        $reader = [System.IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
        $rawBody = $reader.ReadToEnd()
        $reader.Dispose()
        if ($rawBody.Length -gt 12000000) { throw 'Print job is too large.' }
        $payload = $rawBody | ConvertFrom-Json
        $zpl = [string]$payload.zpl
        if ([string]::IsNullOrWhiteSpace($zpl) -or -not $zpl.Contains('^XA')) {
          throw 'A valid ZPL print job is required.'
        }
        $resolved = Resolve-PrinterName $PrinterName
        [Gen8RawPrinter]::SendUtf8($resolved, $zpl)
        Write-JsonResponse $context 200 @{
          ok = $true
          printer_name = $resolved
          bytes = [System.Text.Encoding]::UTF8.GetByteCount($zpl)
        }
        continue
      }

      Write-JsonResponse $context 404 @{ ok = $false; message = 'Endpoint not found.' }
    }
    catch {
      Write-JsonResponse $context 500 @{ ok = $false; message = $_.Exception.Message }
    }
  }
}
finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
