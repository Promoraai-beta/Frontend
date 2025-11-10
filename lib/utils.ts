import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':
      return 'text-green-400';
    case 'Medium':
      return 'text-yellow-400';
    case 'Hard':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export function getDifficultyBgColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':
      return 'bg-green-900/30 text-green-400';
    case 'Medium':
      return 'bg-yellow-900/30 text-yellow-400';
    case 'Hard':
      return 'bg-red-900/30 text-red-400';
    default:
      return 'bg-gray-900/30 text-gray-400';
  }
}
