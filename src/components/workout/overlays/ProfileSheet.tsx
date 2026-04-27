'use client';

import { AccountSheet, type AccountSheetSection } from './AccountSheet';

interface ProfileSheetProps {
  onClose: () => void;
  onOpenSync?: () => void;
}

export function ProfileSheet({ onClose, onOpenSync }: ProfileSheetProps) {
  const initialSection: AccountSheetSection = onOpenSync ? 'sync' : 'profile';

  return <AccountSheet onClose={onClose} initialSection={initialSection} />;
}
