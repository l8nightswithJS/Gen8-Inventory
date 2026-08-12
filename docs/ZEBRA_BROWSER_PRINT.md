# Local Zebra Browser Print

The inventory app supports workstation-local Zebra printing through Zebra Browser Print.

## Architecture

1. The inventory service builds the ZPL label payload.
2. The authenticated browser requests that ZPL through `/api/labels/zpl/all` or `/api/labels/zpl/selected`.
3. Zebra Browser Print discovers a Zebra connected to the workstation by USB or the local network.
4. The browser sends the ZPL to that local printer.

The Railway-hosted inventory service does not need direct access to the printer or the Gener8 LAN.

## Workstation requirements

Follow Zebra's Browser Print documentation and installer for the workstation operating system.

- Install Zebra Browser Print on the workstation.
- Connect or add the Zebra printer in Browser Print.
- Use a supported desktop browser.
- When Browser Print prompts to allow the hosted inventory application's origin/host, approve that host.

Official support/download page:

https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html

Official Browser Print demo documentation:

https://techdocs.zebra.com/link-os/latest/demos/browser-print/

## JavaScript library

The frontend expects Zebra's official Browser Print JavaScript library.

Default path:

`frontend/public/vendor/zebra/BrowserPrint-3.1.250.min.js`

Zebra distributes this JavaScript library from the Browser Print support/download page. The file is not copied into this repository automatically.

Alternatively, set the frontend environment variable below to a trusted URL under your control that hosts the official Zebra library:

`REACT_APP_ZEBRA_BROWSER_PRINT_JS_URL=https://your-host/BrowserPrint-3.1.250.min.js`

## App behavior

Users with the `admin` or `staff` role see a **Local Zebra Printer** panel on the client inventory page.

The panel:

- discovers the default and available local Zebra printers;
- remembers the selected printer on that workstation;
- allows reconnecting/discovery;
- prints checked inventory rows with **Print Selected**;
- prints one label for every item in the client with **Print All**.

Viewer/read-only users do not receive printing controls.

## Server-side fallback

The existing TCP 9100 server-print routes are retained as a fallback:

- `POST /api/labels/print/all`
- `POST /api/labels/print/selected`

Local Browser Print uses these ZPL-only routes instead:

- `POST /api/labels/zpl/all`
- `POST /api/labels/zpl/selected`
