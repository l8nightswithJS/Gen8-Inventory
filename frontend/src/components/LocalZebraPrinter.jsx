import { useEffect, useMemo, useState } from 'react';
import { FiPrinter, FiRefreshCw } from 'react-icons/fi';
import api from '../utils/axiosConfig';
import Button from './ui/Button';
import {
  discoverPrinters,
  printerKey,
  printerLabel,
  sendZpl,
} from '../utils/zebraBrowserPrint';

const STORAGE_KEY = 'gen8.zebra.printer.uid';

export default function LocalZebraPrinter({ clientId, selectedIds = [], totalItems = 0 }) {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinterKey, setSelectedPrinterKey] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Connect a Zebra printer on this workstation.');
  const [printing, setPrinting] = useState(false);

  const selectedPrinter = useMemo(
    () => printers.find((printer) => printerKey(printer) === selectedPrinterKey) || null,
    [printers, selectedPrinterKey],
  );

  const connect = async () => {
    setStatus('connecting');
    setMessage('Looking for local Zebra printers...');

    try {
      const { defaultPrinter, printers: found } = await discoverPrinters();
      setPrinters(found);

      if (!found.length) {
        setSelectedPrinterKey('');
        setStatus('error');
        setMessage(
          'No local Zebra printer was found. Make sure Zebra Browser Print is installed and running, then reconnect.',
        );
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      const savedPrinter = found.find((printer) => printerKey(printer) === saved);
      const nextPrinter = savedPrinter || defaultPrinter || found[0];
      const nextKey = printerKey(nextPrinter);
      setSelectedPrinterKey(nextKey);
      localStorage.setItem(STORAGE_KEY, nextKey);
      setStatus('ready');
      setMessage(`Ready: ${printerLabel(nextPrinter)}`);
    } catch (error) {
      setPrinters([]);
      setSelectedPrinterKey('');
      setStatus('error');
      setMessage(error?.message || 'Unable to connect to Zebra Browser Print.');
    }
  };

  useEffect(() => {
    connect();
    // Connect once when the client page opens. The user can explicitly reconnect later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrinterChange = (event) => {
    const key = event.target.value;
    setSelectedPrinterKey(key);
    localStorage.setItem(STORAGE_KEY, key);
    const printer = printers.find((entry) => printerKey(entry) === key);
    if (printer) {
      setStatus('ready');
      setMessage(`Ready: ${printerLabel(printer)}`);
    }
  };

  const printPayload = async (endpoint, body) => {
    if (!selectedPrinter) {
      setStatus('error');
      setMessage('Select or reconnect a Zebra printer before printing.');
      return;
    }

    setPrinting(true);
    setStatus('printing');
    setMessage('Preparing labels...');

    try {
      const { data } = await api.post(endpoint, body);
      if (!data?.zpl || !data?.count) {
        setStatus('error');
        setMessage(data?.message || 'No labels were available to print.');
        return;
      }

      setMessage(`Sending ${data.count} label${data.count === 1 ? '' : 's'} to ${printerLabel(selectedPrinter)}...`);
      await sendZpl(selectedPrinter, data.zpl);
      setStatus('ready');
      setMessage(
        `Sent ${data.count} label${data.count === 1 ? '' : 's'} to ${printerLabel(selectedPrinter)}.`,
      );
    } catch (error) {
      setStatus('error');
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'The local Zebra print job failed.',
      );
    } finally {
      setPrinting(false);
    }
  };

  const printSelected = () =>
    printPayload('/api/labels/zpl/selected', { item_ids: selectedIds });

  const printAll = () =>
    printPayload('/api/labels/zpl/all', { client_id: clientId });

  const statusClass =
    status === 'ready'
      ? 'text-emerald-700 dark:text-emerald-400'
      : status === 'error'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-slate-600 dark:text-slate-400';

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <FiPrinter />
            Local Zebra Printer
          </div>
          <p className={`mt-1 text-sm ${statusClass}`}>{message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {printers.length > 0 && (
            <select
              value={selectedPrinterKey}
              onChange={handlePrinterChange}
              disabled={printing}
              className="h-10 max-w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Local Zebra printer"
            >
              {printers.map((printer) => (
                <option key={printerKey(printer)} value={printerKey(printer)}>
                  {printerLabel(printer)}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={connect}
            variant="secondary"
            title="Reconnect Zebra printer"
            disabled={printing || status === 'connecting'}
          >
            <FiRefreshCw className="sm:mr-2" />
            <span className="hidden sm:inline">Reconnect</span>
          </Button>

          <Button
            onClick={printSelected}
            variant="secondary"
            disabled={printing || !selectedPrinter || selectedIds.length === 0}
            title="Print selected inventory labels"
          >
            <FiPrinter className="sm:mr-2" />
            Print Selected ({selectedIds.length})
          </Button>

          <Button
            onClick={printAll}
            disabled={printing || !selectedPrinter || totalItems === 0}
            title="Print one label for every item in this client inventory"
          >
            <FiPrinter className="sm:mr-2" />
            Print All ({totalItems})
          </Button>
        </div>
      </div>
    </div>
  );
}
