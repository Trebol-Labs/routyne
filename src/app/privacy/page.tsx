import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { getServerLanguage } from '@/lib/i18n/server';
import { standalonePages } from '@/lib/i18n/standalone-pages';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerLanguage();
  const copy = standalonePages[language].privacy;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${copy.eyebrow} — Routyne`,
    description: copy.intro,
    alternates: {
      canonical: '/privacy',
    },
  };
}

export default async function PrivacyPage() {
  const language = await getServerLanguage();
  const copy = standalonePages[language];

  return (
    <LegalPage
      eyebrow={copy.privacy.eyebrow}
      title={copy.privacy.title}
      intro={copy.privacy.intro}
      sections={copy.privacy.sections}
      labels={copy.legalLabels}
    />
  );
}
