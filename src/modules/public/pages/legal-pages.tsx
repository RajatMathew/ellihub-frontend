import { Helmet } from 'react-helmet-async';

import {
  PublicContainer,
  PublicFooter,
  PublicPageShell,
} from '@/modules/public/components/public-page-shell';
import { eulaSections, lastUpdated, privacySections, type LegalSection } from './legal-content';

type LegalPageProps = {
  title: string;
  description: string;
  sections: LegalSection[];
};

function LegalPage({ title, description, sections }: LegalPageProps) {
  return (
    <PublicPageShell>
      <Helmet>
        <title>{title} | ElliHub</title>
        <meta name="description" content={description} />
      </Helmet>

      <main>
        <section className="border-b bg-muted/40">
          <PublicContainer className="max-w-5xl space-y-4 py-10">
            <p className="text-sm font-medium text-primary">Last updated: {lastUpdated}</p>
            <h1 className="text-3xl font-semibold tracking-normal lg:text-4xl">{title}</h1>
            <p className="text-base leading-7 text-muted-foreground">{description}</p>
          </PublicContainer>
        </section>

        <PublicContainer className="max-w-5xl py-10">
          <div className="space-y-8">
            {sections.map((section) => (
              <article key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold tracking-normal">{section.title}</h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </PublicContainer>
      </main>

      <PublicFooter />
    </PublicPageShell>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How ElliHub handles customer, project, and integration data."
      sections={privacySections}
    />
  );
}

export function EndUserLicenseAgreementPage() {
  return (
    <LegalPage
      title="End User License Agreement"
      description="The terms that govern customer and authorized user access to ElliHub."
      sections={eulaSections}
    />
  );
}
