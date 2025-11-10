import { formatTime } from '@/lib/utils';

interface TimerProps {
  timeRemaining: number;
}

export function Timer({ timeRemaining }: TimerProps) {
  const isTimeLow = timeRemaining < 300000; // Less than 5 minutes

  return (
    <div className={`text-lg font-mono font-semibold ${isTimeLow ? 'text-red-400' : 'text-white'}`}>
      {formatTime(timeRemaining)}
    </div>
  );
}

