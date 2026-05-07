import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { getServerLanguage } from '@/lib/i18n/server';
import { standalonePages } from '@/lib/i18n/standalone-pages';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerLanguage();
  const copy = standalonePages[language].terms;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${copy.eyebrow} — Routyne`,
    description: copy.intro,
    alternates: {
      canonical: '/terms',
    },
  };
}

export default async function TermsPage() {
  const language = await getServerLanguage();
  const copy = standalonePages[language];

  return (
    <LegalPage
      eyebrow={copy.terms.eyebrow}
      title={copy.terms.title}
      intro={copy.terms.intro}
      sections={copy.terms.sections}
      labels={copy.legalLabels}
    />
  );
}
