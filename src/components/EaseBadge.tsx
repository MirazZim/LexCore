import { cn } from '@/lib/utils';
import { getEaseLabel } from '@/lib/mock-data';

export function EaseBadge({ difficulty, className }: { difficulty: number; className?: string }) {
  const label = getEaseLabel(difficulty);

  const colorClass =
    difficulty > 7
      ? 'bg-ease-struggling/20 text-ease-struggling border-ease-struggling/30'
      : difficulty >= 4
        ? 'bg-ease-learning/20 text-ease-learning border-ease-learning/30'
        : 'bg-ease-strong/20 text-ease-strong border-ease-strong/30';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
