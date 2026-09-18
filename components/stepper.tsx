'use client';

import { Check } from 'lucide-react';
import { BUILDER_STEP, BUILDER_STEP_META } from '@/lib/constants';
import type { BuilderStep } from '@/lib/types';

// Explicit order (not `Object.values(BUILDER_STEP_META)`) so the stepper's
// rendered order is guaranteed regardless of object key iteration semantics.
const STEP_ORDER: readonly BuilderStep[] = [
  BUILDER_STEP.PREPARE,
  BUILDER_STEP.REFINE,
  BUILDER_STEP.SAVE,
];

interface StepperProps {
  step: BuilderStep;
  maxReached: BuilderStep;
  onStepChange: (next: BuilderStep) => void;
}

/**
 * Three-step header for the builder. Linear gating: a step is only clickable
 * if its index is <= `maxReached`. Done steps render a check icon; the active
 * step gets the accent treatment; disabled steps are muted.
 *
 * Visuals mirror the handoff's `.stepper` styling (see `design_handoff_vibecrafter`),
 * driven by Phase 1's design tokens. The step-number shape comes from the
 * `--step-num-radius` token (rounded square in Studio, circle in Vinyl).
 */
export function Stepper({ step, maxReached, onStepChange }: StepperProps) {
  return (
    <div className="mb-7 flex items-center gap-2">
      {STEP_ORDER.map((index) => {
        const descriptor = BUILDER_STEP_META[index];
        const isReached = index <= maxReached;
        const isActive = index === step;
        const isDone = index < step;
        return (
          <div key={descriptor.title} className="flex flex-1 items-center gap-2">
            {index > 0 && (
              <span className="h-[1.5px] w-[22px] flex-shrink-0 bg-border" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => isReached && onStepChange(index)}
              disabled={!isReached}
              aria-current={isActive ? 'step' : undefined}
              className={`group flex flex-1 min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left transition-all ${
                isActive
                  ? 'border-primary bg-surface shadow-[0_0_0_3px_var(--ring)]'
                  : isDone
                    ? 'border-border bg-surface-2 hover:border-border-strong'
                    : isReached
                      ? 'border-border bg-surface hover:border-border-strong'
                      : 'cursor-not-allowed border-border bg-surface opacity-60'
              }`}
            >
              <span
                className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[var(--step-num-radius)] border font-mono text-[13px] font-bold transition-all ${
                  isActive
                    ? 'border-transparent bg-primary text-accent-contrast shadow-[var(--shadow-glow)]'
                    : isDone
                      ? 'border-transparent bg-accent-soft text-accent-strong'
                      : 'border-border bg-surface-2 text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="label-text block text-[11px] uppercase text-[color:var(--text-faint)]">
                  {descriptor.eyebrow}
                </span>
                <span className="block whitespace-nowrap text-[14.5px] font-semibold text-foreground">
                  {descriptor.title}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
