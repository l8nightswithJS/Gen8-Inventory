import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import logoG8 from '../assets/logog8.png';

const collaborationFeatures = [
  {
    title: 'Project-specific access',
    description:
      'Users see only the projects and inventory they are authorized to access.',
  },
  {
    title: 'Live inventory visibility',
    description:
      'View current quantities, lots, status, and material availability in one place.',
  },
  {
    title: 'Controlled permissions',
    description:
      'View or manage inventory according to the access assigned to your account.',
  },
];

const audiences = [
  {
    title: 'Gener8 Teams',
    description:
      'Receive, track, transfer, and manage inventory across authorized projects.',
  },
  {
    title: 'Project Managers',
    description:
      'Monitor project inventory and material availability without unnecessary administrative access.',
  },
  {
    title: 'Authorized Partners',
    description:
      'Securely view current inventory information for the projects shared with you.',
  },
];

function ProductPreview() {
  const rows = [
    ['Component A', '480', 'Available'],
    ['Component B', '260', 'Available'],
    ['Material C', '120', 'Low stock'],
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
        <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <span className="ml-2 text-xs font-medium text-slate-400">
            Gener8 Inventory
          </span>
        </div>

        <div className="p-3 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Inventory overview
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                Authorized projects
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              Live
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ['2,480', 'In stock'],
              ['12', 'Active lots'],
              ['4', 'Projects'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="text-lg font-bold text-white sm:text-xl">
                  {value}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-300">
              Recent inventory
            </div>
            {rows.map(([item, qty, status]) => (
              <div
                key={item}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
              >
                <span className="text-xs font-medium text-slate-200 sm:text-sm">
                  {item}
                </span>
                <span className="text-xs font-semibold text-white sm:text-sm">
                  {qty}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    status === 'Low stock'
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'bg-emerald-400/10 text-emerald-300'
                  }`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -left-2 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-xl sm:-left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Access
        </p>
        <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
          Project Alpha · Full access
        </p>
        <p className="mt-1 text-xs text-slate-400">Project Beta · Read only</p>
      </div>

      <div className="absolute -right-2 -top-5 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 shadow-xl backdrop-blur sm:-right-6">
        <p className="text-xs font-semibold text-blue-200">Controlled access</p>
        <p className="mt-1 text-[10px] text-slate-400">
          Project-specific permissions
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900"
      >
        Skip to main content
      </a>

      <header className="border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Gener8 Inventory home"
          >
            <img src={logoG8} alt="" className="h-8 w-8" />
            <div className="font-semibold text-lg text-blue-400 sm:text-xl">
              Gener8 <span className="text-white">Inventory</span>
            </div>
          </Link>

          <nav aria-label="Public navigation" className="flex items-center gap-2 sm:gap-6">
            <a
              href="#security"
              className="hidden rounded-md text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 sm:inline"
            >
              Security
            </a>
            <Link
              to="/help"
              className="hidden rounded-md text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 sm:inline"
            >
              Help
            </Link>
            <Button as={Link} to="/login" variant="primary" size="sm">
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/70">
          <div className="absolute inset-0 opacity-40" aria-hidden="true">
            <div className="absolute -left-28 top-20 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div className="max-w-2xl text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-400">
                Gener8 Inventory
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Inventory visibility.{' '}
                <span className="text-blue-400">Built around your projects.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300 lg:mx-0">
                Secure access to current inventory, material status, lots, and
                availability across authorized Gener8 projects.
              </p>

              <div className="mt-9 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center lg:justify-start">
                <Button
                  as={Link}
                  to="/login"
                  variant="primary"
                  size="lg"
                  className="min-h-12 px-8"
                >
                  Sign In
                </Button>
                <Link
                  to="/help"
                  className="inline-flex min-h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Need access? Contact your Gener8 representative
                </Link>
              </div>
            </div>

            <div className="px-3 pb-8 pt-5 sm:px-8 lg:px-0 lg:pb-0">
              <ProductPreview />
              <p className="sr-only">
                Fictional example interface showing inventory totals, lot counts,
                project access levels, and inventory status.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16 text-slate-900 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Secure collaboration
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                The right inventory view for the right user.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Gener8 Inventory provides useful project visibility without exposing
                unrelated customer or administrative data.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {collaborationFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
                  Flexible by role
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  One platform. Different responsibilities.
                </h2>
                <p className="mt-4 max-w-xl leading-7 text-slate-400">
                  The experience adapts to assigned access, from operational
                  inventory work to read-only project visibility.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {audiences.map((audience) => (
                  <article
                    key={audience.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <h3 className="font-bold text-white">{audience.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {audience.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
              Controlled access
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your projects. Your access.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
              Access is assigned by Gener8 administrators so users can work with
              or view only the inventory scopes authorized for their account.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {['Role-based access', 'Project isolation', 'Read-only partner access'].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-slate-200"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="bg-blue-600 py-12">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-5 text-center sm:px-6 md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ready to access Gener8 Inventory?
              </h2>
              <p className="mt-1 text-blue-100">
                Sign in with your provisioned account or contact Gener8 for access assistance.
              </p>
            </div>
            <Button
              as={Link}
              to="/login"
              variant="secondary"
              size="lg"
              className="min-h-12 bg-white text-blue-700 hover:bg-blue-50"
            >
              Sign In
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <p className="text-sm text-slate-500">
            © {year} Gener8 Inventory. Authorized access only.
          </p>
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-5 text-sm">
            <Link to="/help" className="text-slate-400 hover:text-white">
              Help & Support
            </Link>
            <Link to="/report-problem" className="text-slate-400 hover:text-white">
              Report a Problem
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-white">
              Sign In
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
