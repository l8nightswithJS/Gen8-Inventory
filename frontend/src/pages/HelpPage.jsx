import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import logoG8 from '../assets/logog8.png';

const helpTopics = [
  {
    title: 'Signing in',
    body: 'Use the account provisioned for you by a Gener8 administrator. Public self-registration is not available.',
  },
  {
    title: 'Access to projects',
    body: 'Your account only displays the projects and inventory scopes assigned to you. Access may be read-only or include inventory actions depending on your role.',
  },
  {
    title: 'Camera and scanning',
    body: 'When using barcode or QR scanning on a supported mobile device, allow camera access when your browser requests permission.',
  },
  {
    title: 'Need additional access?',
    body: 'Contact your Gener8 representative or an application administrator. Users cannot grant themselves additional project access.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <img src={logoG8} alt="" className="h-8 w-8" />
            <span className="font-semibold text-blue-400">
              Gener8 <span className="text-white">Inventory</span>
            </span>
          </Link>
          <Button as={Link} to="/login" variant="primary" size="sm">
            Sign In
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
            Help & Support
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            How can we help?
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Find quick guidance for access, sign-in, and scanning. The full
            role-specific user guide is available inside the application after
            sign-in.
          </p>
        </div>

        <section aria-labelledby="help-topics" className="mt-12">
          <h2 id="help-topics" className="text-2xl font-bold">
            Quick help
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {helpTopics.map((topic) => (
              <article
                key={topic.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <h3 className="text-lg font-bold">{topic.title}</h3>
                <p className="mt-2 leading-7 text-slate-400">{topic.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Still need help?</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-300">
            Report an application problem or send a support request. Include
            what you were trying to do and what happened so the issue can be
            investigated efficiently.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/report-problem" variant="primary" size="lg">
              Report a Problem
            </Button>
            <a
              href={`mailto:eddiejdev@gmail.com?subject=${encodeURIComponent(
                'Gener8 Inventory Support',
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Email Support
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
