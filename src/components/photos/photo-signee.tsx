import Image from 'next/image';

/**
 * Portrait depuis une URL signée Supabase (expire ~1 h).
 *
 * `unoptimized` : l'optimiseur Next ne peut pas mettre en cache ces liens
 * temporaires. On garde tout de même les attributs de taille et le lazy load.
 */
export function PhotoSignee({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes ?? '100vw'}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 80}
      height={height ?? 80}
      unoptimized
      className={className}
      priority={priority}
    />
  );
}
