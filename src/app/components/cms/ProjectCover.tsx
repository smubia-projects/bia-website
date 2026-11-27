import Image from "next/image";
import { monoColors, monogram } from "./visuals";

interface Props {
  title: string;
  src?: string;
  /** CSS aspect-ratio, e.g. "16 / 10" */
  aspect?: string;
  monoSize?: number;
  sizes?: string;
  className?: string;
  radius?: number | string;
}

/** A project's cover image, or a coloured monogram tile when it has none. */
export default function ProjectCover({
  title,
  src,
  aspect = "16 / 10",
  monoSize = 36,
  sizes = "(max-width: 768px) 100vw, 320px",
  className,
  radius,
}: Props) {
  const [bg, fg] = monoColors(title);
  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        aspectRatio: aspect,
        background: bg,
        color: fg,
        overflow: "hidden",
        borderRadius: radius,
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 800,
        fontSize: monoSize,
      }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} style={{ objectFit: "cover" }} />
      ) : (
        <span aria-hidden="true">{monogram(title)}</span>
      )}
    </span>
  );
}
