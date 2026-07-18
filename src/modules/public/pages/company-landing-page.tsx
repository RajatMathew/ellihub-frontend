import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileText,
  FolderKanban,
  Link2,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { useSession } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import { CompanyProductPreview } from '@/modules/public/components/company-product-preview';
import {
  PublicContainer,
  PublicFooter,
  PublicPageShell,
} from '@/modules/public/components/public-page-shell';

const capabilityGroups = [
  {
    title: 'Project control',
    description:
      'Track project details, contract value, schedule, budget position, documents, and team context from one workspace.',
    icon: FolderKanban,
  },
  {
    title: 'Procurement flow',
    description:
      'Manage RFQs, purchase orders, sub change orders, vendor commitments, and linked project records without losing context.',
    icon: ReceiptText,
  },
  {
    title: 'Financial documents',
    description:
      'Keep invoices, prime change orders, contract files, and supporting attachments organized around the project record.',
    icon: FileText,
  },
  {
    title: 'Directory and HR',
    description:
      'Maintain vendor, general contractor, contact, employee, department, and time off information used across operations.',
    icon: Users,
  },
];

const overviewItems = [
  'Central project list with status and year views',
  'Prime contract overview with budget, schedule, team, and documents',
  'Vendor workflows for RFQs, purchase orders, invoices, and sub change orders',
  'Company records for vendors, general contractors, contacts, employees, and files',
];

export function CompanyLandingPage() {
  const { data } = useSession();
  const isSignedIn = Boolean(data?.session);
  const primaryPath = isSignedIn ? '/app' : '/sign-in';
  const primaryLabel = isSignedIn ? 'Go to platform' : 'Sign in';

  return (
    <PublicPageShell>
      <Helmet>
        <title>ElliHub | Construction Project Finance Workspace</title>
        <meta
          name="description"
          content="ElliHub brings construction project finance, procurement, documents, directory data, HR context, and integrations into one operating workspace."
        />
      </Helmet>

      <main>
        <section className="border-b bg-muted/40">
          <PublicContainer className="grid min-h-svh gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-16 xl:gap-16">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                <Building2 className="size-4 text-primary" />
                Construction ERP and project finance
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-normal text-foreground lg:text-5xl">
                  ElliHub
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
                  ElliHub helps construction teams organize project records, procurement, contract
                  documents, vendor workflows, invoices, and operational data in a focused internal
                  workspace.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to={primaryPath}>
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="mailto:support@ellihub.com">Contact support</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Built for active project teams that need financial detail, documents, and field
                context to stay connected.
              </p>
            </div>

            <CompanyProductPreview />
          </PublicContainer>
        </section>

        <PublicContainer className="grid gap-8 py-12 lg:grid-cols-[0.7fr_1fr] xl:gap-14">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-normal">Overview</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This public page gives a high-level summary of the platform. The full application is
              available only to authorized users.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {overviewItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border bg-card p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-6">{item}</p>
              </div>
            ))}
          </div>
        </PublicContainer>

        <section className="border-y bg-muted/30">
          <PublicContainer className="grid gap-3 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {capabilityGroups.map((item) => (
              <article key={item.title} className="rounded-lg border bg-background p-4">
                <item.icon className="mb-3 size-5 text-primary" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </PublicContainer>
        </section>

        <PublicContainer className="grid gap-6 py-12 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <BriefcaseBusiness className="mb-4 size-6 text-primary" />
            <h2 className="text-xl font-semibold">For project teams</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              ElliHub is designed for repeated operational work: reviewing budgets, issuing
              procurement documents, checking invoices, and keeping project records current.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <Link2 className="mb-4 size-6 text-primary" />
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Integrations connect ElliHub with external systems when authorized by the customer.
              QuickBooks Online is supported for selected payment transaction workflows.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <ShieldCheck className="mb-4 size-6 text-primary" />
            <h2 className="text-xl font-semibold">Access control</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The application is private by default. Customer data and workflow pages require sign
              in, while policy pages remain public for review.
            </p>
          </div>
        </PublicContainer>
      </main>

      <PublicFooter />
    </PublicPageShell>
  );
}
