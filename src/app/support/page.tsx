import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { getServerLanguage } from '@/lib/i18n/server';
import { standalonePages } from '@/lib/i18n/standalone-pages';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerLanguage();
  const copy = standalonePages[language].support;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${copy.eyebrow} — Routyne`,
    description: copy.intro,
    alternates: {
      canonical: '/support',
    },
  };
}

export default async function SupportPage() {
  const language = await getServerLanguage();
  const copy = standalonePages[language];

  return (
    <LegalPage
      eyebrow={copy.support.eyebrow}
      title={copy.support.title}
      intro={copy.support.intro}
      sections={copy.support.sections}
      labels={copy.legalLabels}
    />
  );
}
