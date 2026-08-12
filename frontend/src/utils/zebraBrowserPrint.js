const DEFAULT_BROWSER_PRINT_SCRIPT =
  process.env.REACT_APP_ZEBRA_BROWSER_PRINT_JS_URL ||
  '/vendor/zebra/BrowserPrint-3.1.250.min.js';

let loadingPromise = null;

function normalizeError(error, fallback) {
  if (!error) return new Error(fallback);
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(error?.message || fallback);
}

export function loadBrowserPrint() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Zebra printing is only available in a browser.'));
  }

  if (window.BrowserPrint) return Promise.resolve(window.BrowserPrint);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-zebra-browser-print]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.BrowserPrint) resolve(window.BrowserPrint);
        else reject(new Error('Zebra Browser Print library loaded but BrowserPrint was not found.'));
      });
      existing.addEventListener('error', () => {
        reject(new Error('Zebra Browser Print JavaScript library could not be loaded.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = DEFAULT_BROWSER_PRINT_SCRIPT;
    script.async = true;
    script.dataset.zebraBrowserPrint = 'true';
    script.onload = () => {
      if (window.BrowserPrint) resolve(window.BrowserPrint);
      else reject(new Error('Zebra Browser Print library loaded but BrowserPrint was not found.'));
    };
    script.onerror = () => {
      loadingPromise = null;
      reject(
        new Error(
          'Zebra Browser Print JavaScript library is not installed in this app. Add the official Zebra Browser Print JavaScript library or configure REACT_APP_ZEBRA_BROWSER_PRINT_JS_URL.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export async function discoverPrinters() {
  const BrowserPrint = await loadBrowserPrint();

  const defaultPrinterPromise = new Promise((resolve) => {
    BrowserPrint.getDefaultDevice(
      'printer',
      (device) => resolve(device || null),
      () => resolve(null),
    );
  });

  const printersPromise = new Promise((resolve, reject) => {
    BrowserPrint.getLocalDevices(
      (devices) => resolve(Array.isArray(devices) ? devices : []),
      (error) => reject(normalizeError(error, 'Unable to discover local Zebra printers.')),
      'printer',
    );
  });

  const [defaultPrinter, printers] = await Promise.all([
    defaultPrinterPromise,
    printersPromise,
  ]);

  const unique = [];
  const seen = new Set();
  [defaultPrinter, ...printers].filter(Boolean).forEach((printer) => {
    const key = printer.uid || `${printer.connection || ''}:${printer.name || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(printer);
  });

  return { defaultPrinter, printers: unique };
}

export function sendZpl(printer, zpl) {
  if (!printer) return Promise.reject(new Error('No Zebra printer is selected.'));
  if (!zpl) return Promise.reject(new Error('There is no label data to print.'));

  return new Promise((resolve, reject) => {
    printer.send(
      zpl,
      () => resolve(),
      (error) => reject(normalizeError(error, 'The Zebra printer rejected the print job.')),
    );
  });
}

export function printerKey(printer) {
  return printer?.uid || `${printer?.connection || ''}:${printer?.name || ''}`;
}

export function printerLabel(printer) {
  if (!printer) return 'Unknown printer';
  const connection = printer.connection ? ` · ${String(printer.connection).toUpperCase()}` : '';
  return `${printer.name || printer.uid || 'Zebra Printer'}${connection}`;
}
