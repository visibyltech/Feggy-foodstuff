import { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';

interface FoodImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className = '' }: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-orange-50 text-green-800 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShoppingBasket className="w-8 h-8 text-orange-600 mb-2" />
        <span className="text-xs font-medium text-center text-slate-700 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
