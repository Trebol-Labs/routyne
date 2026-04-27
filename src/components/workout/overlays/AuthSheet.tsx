'use client';

import { AccountSheet } from './AccountSheet';

interface AuthSheetProps {
  onClose: () => void;
}

export function AuthSheet({ onClose }: AuthSheetProps) {
  return <AccountSheet onClose={onClose} initialSection="sync" />;
}
