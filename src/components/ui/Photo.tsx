import { photoUrl, type PhotoData } from "@/content/photos";

interface PhotoProps {
  photo: PhotoData;
  /** Attribut `sizes` : largeur réellement occupée à l'écran, pour que le navigateur choisisse la bonne variante. */
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/** Image responsive pré-optimisée (WebP 480 / 960 / 1600) avec aperçu flouté, chargement différé hors première vue. */
export function Photo({ photo, sizes, priority = false, className = "", imgClassName = "", alt }: PhotoProps) {
  const widths = [...photo.widths].sort((a, b) => a - b);
  const srcSet = widths.map((w) => `${photoUrl(photo, w)} ${w}w`).join(", ");
  const fallback = widths.find((w) => w >= 960) ?? widths[widths.length - 1];
  return (
    <span
      className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} block overflow-hidden bg-lavender ${className}`}
      style={photo.lqip ? { backgroundImage: `url(${photo.lqip})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- variantes WebP pré-générées, srcset manuel */}
      <img
        src={photoUrl(photo, fallback)}
        srcSet={srcSet}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={alt ?? photo.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        style={photo.focus ? { objectPosition: photo.focus } : undefined}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
      />
    </span>
  );
}
