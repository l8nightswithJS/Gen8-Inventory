# Gen8 Zebra Local Print Agent

This helper keeps Zebra printing local to the Windows workstation that is physically connected to the printer. The cloud Inventory service only generates ZPL; it does not connect to the printer and does not require `ZEBRA_HOST` or `ZEBRA_PORT`.

## Windows workstation setup

1. Install the Zebra printer and its Windows driver normally and confirm a Windows test page / Zebra test print works.
2. Copy this `tools/local-zebra-agent` folder to the Zebra workstation.
3. Open **PowerShell as Administrator** in that folder.
4. Run:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\Install-Gen8-Zebra-Print-Agent.ps1
   ```

5. If more than one Zebra printer is installed, select the printer when prompted.
6. The installer creates a scheduled task named **Gen8 Zebra Print Agent** and starts it immediately.
7. Verify locally in a browser or PowerShell:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:31991/health
   ```

The response should show `ok: true` and the installed Zebra printer name.

## Application flow

The web application requests label ZPL from the Inventory API, then posts that ZPL to `http://127.0.0.1:31991/print`. The local agent writes the ZPL to the selected Windows printer using the Windows RAW spooler. This supports a Zebra connected by USB or any other connection already installed as a Windows printer.

## Security

The agent listens only on the loopback address (`127.0.0.1`), not on the LAN. By default it accepts browser requests from `https://test-g8.biz` and local development origins. Additional application origins can be added with the `GEN8_ALLOWED_ORIGINS` environment variable as a comma-separated list before the agent starts.

## Troubleshooting

- `Local Zebra printing is not available`: confirm the scheduled task is running and `/health` responds.
- `No installed Zebra printer was found`: install the Zebra Windows driver and rerun the installer.
- Wrong Zebra selected: rerun the installer and choose the correct printer.
- Print job reaches Windows but the label is wrong: confirm the printer is configured for ZPL and the correct label size/media is loaded.
