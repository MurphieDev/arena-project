import { cn } from '../../../lib/utils';

interface AvatarProps {
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
}

export function Avatar({ name, online, size = 'md' }: AvatarProps) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm font-bold' };
  
  return (
    <div className="relative shrink-0">
      <div className={cn('rounded-full flex items-center justify-center font-black text-white', sizes[size], color)}>
        {name[0].toUpperCase()}
      </div>
      {online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-black" />
      )}
    </div>
  );
}
