import type { Viewport } from 'next';
import type { ReactNode } from 'react';

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
