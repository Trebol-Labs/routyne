'use client';

import { Button } from '@/components/ui/button';

interface StepFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function StepFooter({
  onBack,
  onNext,
  nextLabel,
  backLabel,
  nextDisabled,
  onSkip,
  skipLabel,
}: StepFooterProps) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <Button
        variant="glass-primary"
        size="xl"
        onClick={onNext}
        disabled={nextDisabled}
        className="w-full"
      >
        {nextLabel}
      </Button>
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        {onSkip ? (
          <Button variant="ghost" onClick={onSkip} className="text-white/40 hover:text-white/70">
            {skipLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
