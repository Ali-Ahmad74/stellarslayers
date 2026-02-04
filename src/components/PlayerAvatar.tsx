import { cn } from '@/lib/utils';
interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
export function PlayerAvatar({
  name,
  photoUrl,
  size = 'md',
  className
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-28 h-28 text-4xl'
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  if (photoUrl) {
    return (
      <img 
        src={photoUrl} 
        alt={name} 
        loading="lazy"
        decoding="async"
        className={cn(
          'rounded-full object-cover ring-2 ring-white/20 aspect-square',
          sizeClasses[size], 
          className
        )} 
        style={{ imageRendering: 'auto' }}
      />
    );
  }
  return <div className={cn("rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 font-bold text-white ring-2 ring-white/20 backdrop-blur-sm border-2 border-solid items-center justify-center flex flex-row gap-0 mx-0 my-0 px-0", sizeClasses[size], className)}>
      {getInitials(name)}
    </div>;
}