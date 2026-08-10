import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import logoG8 from '../assets/logog8.png';

const sections = [
  {
    title: 'Account access',
    items: [
      'Use the account provisioned by a Gener8 administrator. Public self-registration is disabled.',
      'Your account only shows projects and inventory scopes assigned to you.',
      'Project access can be Read Only or Edit. Read Only users can view inventory but cannot change it.',
      'Users cannot grant themselves additional projects, roles, or permissions.',
    ],
  },
  {
    title: 'Finding inventory',
    items: [
      'Open Projects and select an authorized project. If your account has only one project, use that project as your working scope.',
      'Search inventory using the item, part number, lot, or other available filters.',
      'Status labels include text as well as color so low stock, hold, release, and other states remain understandable.',
    ],
  },
  {
    title: 'Scanning',
    items: [
      'Open Scan from an authorized inventory workflow.',
      'Allow camera access when the browser requests permission.',
      'Center the barcode or QR code in the scanner view and wait for the item or location to resolve.',
      'If a code does not resolve, verify the code is readable and that your account has access to its project.',
    ],
  },
  {
    title: 'Inventory changes',
    items: [
      'Edit access is required for inventory changes such as transfers, quantity adjustments, repacking, or status changes.',
      'Read Only accounts do not receive write controls and the API rejects write requests even if a request is manually submitted.',
      'Administrative functions such as creating clients, changing user access, master inventory, and user management are reserved for Administrators.',
    ],
  },
  {
    title: 'Receiving',
    items: [
      'Receiving is available to Administrators and Inventory Staff for projects where the account has Edit access.',
      'Select the correct project before extracting or recording a receiving document.',
      'Review the extracted information before creating a receipt and confirm the intended receiving location.',
    ],
  },
  {
    title: 'Roles and permissions',
    items: [
      'Administrator: system-wide access, client and user administration, permission management, and inventory operations.',
      'Inventory Staff: operational inventory and receiving work for assigned projects; cannot administer users or clients.',
      'Project User: project visibility with Read Only or Edit access assigned separately for each project.',
      'External Viewer: read-only partner access to specifically assigned projects; unrelated clients remain invisible.',
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <a href="#help-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900">
        Skip to help content
      </a>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
            <img src={logoG8} alt="" className="h-8 w-8" />
            <span className="font-semibold text-blue-400">Gener8 <span className="text-white">Inventory</span></span>
          </Link>
          <Button as={Link} to="/login" variant="primary" size="sm">Sign In</Button>
        </div>
      </header>

      <main id="help-main" className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Help & User Guide</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Using Gener8 Inventory</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            This guide covers account access, project visibility, scanning, receiving, and the permission model used throughout the application.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-300">
                {section.items.map((item) => <li key={item} className="leading-7">{item}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Something not working?</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-300">
            Use the problem report form to describe what you were doing, what happened, and what you expected. Basic browser diagnostics are included automatically.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/report-problem" variant="primary" size="lg">Report a Problem</Button>
            <Button as={Link} to="/" variant="secondary" size="lg">Back to Home</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
