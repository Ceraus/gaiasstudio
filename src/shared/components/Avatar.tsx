interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white ${className}`}>
      {initials}
    </div>
  );
}
