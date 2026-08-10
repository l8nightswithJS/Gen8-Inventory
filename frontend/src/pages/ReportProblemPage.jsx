import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import logoG8 from '../assets/logog8.png';

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || 'eddiejdev@gmail.com';

export default function ReportProblemPage() {
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [expected, setExpected] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const diagnostics = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return [
      `Page: ${window.location.href}`,
      `Browser: ${window.navigator.userAgent}`,
      `Screen: ${window.screen?.width || 'unknown'} x ${window.screen?.height || 'unknown'}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const subject = `Gener8 Inventory Bug Report${summary ? ` - ${summary}` : ''}`;
    const body = [
      'GENER8 INVENTORY PROBLEM REPORT',
      '',
      `Summary: ${summary || 'Not provided'}`,
      '',
      'What happened:',
      details || 'Not provided',
      '',
      'What should have happened:',
      expected || 'Not provided',
      '',
      `Contact email: ${contactEmail || 'Not provided'}`,
      '',
      'Automatic diagnostic context:',
      diagnostics,
      '',
      'Please attach a screenshot if it would help explain the issue.',
    ].join('\n');

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const inputClasses = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
            <img src={logoG8} alt="" className="h-8 w-8" />
            <span className="font-semibold text-blue-400">Gener8 <span className="text-white">Inventory</span></span>
          </Link>
          <Link to="/help" className="rounded-md text-sm font-semibold text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">Help</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Support</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Report a problem</h1>
          <p className="mt-4 leading-7 text-slate-300">
            Describe what you were trying to do, what happened, and what you expected. Submitting opens your email app with the report addressed to Gener8 Inventory support.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div>
            <label htmlFor="summary" className="font-semibold text-slate-100">Short summary</label>
            <input id="summary" type="text" required maxLength={120} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Example: Transfer did not update the item location" className={inputClasses} />
          </div>

          <div className="mt-6">
            <label htmlFor="details" className="font-semibold text-slate-100">What were you trying to do, and what happened?</label>
            <textarea id="details" required rows={6} value={details} onChange={(e) => setDetails(e.target.value)} className={inputClasses} />
          </div>

          <div className="mt-6">
            <label htmlFor="expected" className="font-semibold text-slate-100">What should have happened?</label>
            <textarea id="expected" rows={4} value={expected} onChange={(e) => setExpected(e.target.value)} className={inputClasses} />
          </div>

          <div className="mt-6">
            <label htmlFor="contactEmail" className="font-semibold text-slate-100">Your email</label>
            <input id="contactEmail" type="email" autoComplete="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" className={inputClasses} />
          </div>

          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Diagnostic information included automatically</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Current page, browser information, screen size, and timestamp are included. Passwords and authentication tokens are not collected by this form.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" variant="primary" size="lg">Prepare Email Report</Button>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              Email support directly
            </a>
          </div>
        </form>
      </main>
    </div>
  );
}
