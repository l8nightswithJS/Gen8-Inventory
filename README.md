# Gener8 Inventory

Gener8 Inventory is a role-aware inventory platform for Gener8 teams, project managers, and authorized partners. The application provides client/project-scoped inventory visibility while keeping administrative and write privileges separate from read-only access.

## Deployment branch

The active Railway deployment is currently sourced from:

`recovery/p1-item-contracts`

Changes intended for the live test environment should be reviewed against this branch before deployment.

## Architecture

The application is split into independently deployed services behind a gateway:

- **Web** — React frontend.
- **Gateway** — public API entry point.
- **Auth** — authentication, user profiles, roles, and project assignments.
- **Client** — client/project records and inventory profile settings.
- **Inventory** — inventory, receiving, locations, movements, quality states, and warehouse workflows.
- **Barcode** — barcode/QR workflows.
- **Supabase** — PostgreSQL database, authentication, and client-logo storage.
- **Railway** — application hosting and service deployment.

## Access model

Authorization uses a global role plus a project-specific access level.

### Global roles

| Role | Purpose |
| --- | --- |
| `admin` | Full system administration and inventory access. |
| `inventory_staff` | Operational inventory/receiving work for assigned projects without user/client administration. |
| `project_user` | Internal project access with Read Only or Edit assigned independently per project. |
| `external_viewer` | Partner/customer access. Always read-only and limited to explicitly assigned projects. |

### Project access

Each user/project assignment is stored in `user_clients` with one of two levels:

- `read` — view authorized project inventory without changing records.
- `edit` — perform permitted inventory operations within that project.

No assignment means the project is not visible to that user. Unauthorized client names, logos, and records should not be exposed by the UI or API.

Administrators can manage roles and project assignments. Users cannot elevate their own role or grant themselves additional project access.

## User profiles

Application user profiles are stored in `public.users` and include:

- Email
- First name
- Last name
- Global role
- Approval state
- Project/client assignments

The authenticated session includes the stored first name so the dashboard can display a real personalized greeting such as `Welcome, Eddie`. The application does not derive a person's name from their email address.

## Public vs authenticated experience

### Public

The public landing experience is intentionally client-neutral. It must not expose real customer names, logos, part numbers, or inventory quantities. Public actions are limited to Sign In, Help, and problem reporting.

### Authenticated

The authenticated experience adapts to the user's role and assignments:

- Desktop uses a responsive project grid.
- Mobile uses horizontally scrollable project cards.
- Read-only users receive clear Read Only indicators.
- Administrators receive client/user configuration tools.
- External viewers with a single assigned project can be routed directly into that project.

## Help and support

User-facing instructions are available from **Help & User Guide** inside the application. The help experience recognizes an existing authenticated session and returns signed-in users to Projects rather than presenting another Sign In action.

**Report a Problem** prepares a support email and includes non-sensitive diagnostic context such as page URL, browser, screen size, and timestamp. Passwords and authentication tokens are not intentionally included.

## Accessibility target

The UI is being designed toward WCAG 2.2 AA, including:

- Keyboard-accessible navigation and controls.
- Visible focus states.
- Semantic headings and labels.
- Screen-reader labels for icon-only controls.
- Status information that is not communicated by color alone.
- Responsive reflow and touch-friendly controls.
- Clear loading, empty, error, and permission-denied states.

## Database migrations

Supabase schema changes are versioned under `supabase/migrations/`. Schema changes should be represented by a migration in the repository even when they have already been applied to the connected development database.

Recent authorization/profile additions include per-project `access_level` values and managed `first_name` / `last_name` user profile fields.

## Security principles

- Public self-registration is disabled.
- User and client administration is administrator-only.
- Project isolation is enforced server-side, not only by hiding UI controls.
- Read-only project assignments are enforced by API authorization middleware.
- Item-level access checks avoid revealing inventory records from unauthorized projects.
- Secrets and database credentials must be stored in deployment environment variables and never committed to source control.

Before external customer access is approved, complete an end-to-end authorization review using representative Administrator, Inventory Staff, Project User Read/Edit, and External Viewer accounts.

## Recommended release verification

For each deployment, verify at minimum:

1. Public landing page contains no real customer information.
2. Login succeeds and the authenticated profile name is returned correctly.
3. Administrators can see all authorized projects and administration tools.
4. Project users see only assigned projects and the correct Read/Edit state.
5. External viewers cannot see unrelated client names, logos, routes, or records.
6. Read-only users cannot mutate inventory through either the UI or direct API requests.
7. Help returns authenticated users to Projects.
8. Report a Problem opens the configured support flow without exposing credentials or tokens.

## Support

Application support and bug-report routing are configured through the frontend support email setting. For production use, prefer a Gener8-managed support address rather than a personal address when one is available.
