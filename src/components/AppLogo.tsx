import * as React from "react";

import logoLazone from "@/assets/logo-lazone.png";

export type AppLogoProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt"
> & {
  /** Defaults to "LaZone". */
  alt?: string;
};

export function AppLogo({
  alt = "LaZone",
  loading = "eager",
  decoding = "async",
  style,
  ...props
}: AppLogoProps) {
  // Priority: public path (works best for PWA/native), fallback to bundled asset
  const publicPath = `${import.meta.env.BASE_URL}images/logo-lazone.png`;
  const [currentSrc, setCurrentSrc] = React.useState<string>(publicPath);
  const [hasTriedFallback, setHasTriedFallback] = React.useState(false);

  const { className, ...rest } = props;

  return (
    <img
      {...rest}
      className={["object-contain shrink-0 align-middle", className]
        .filter(Boolean)
        .join(" ")}
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      style={{
        minWidth: 24,
        minHeight: 24,
        ...style,
      }}
      onError={() => {
        // If public path fails, try bundled asset once
        if (!hasTriedFallback && currentSrc === publicPath) {
          console.warn("[AppLogo] Public path failed, trying bundled asset");
          setCurrentSrc(logoLazone);
          setHasTriedFallback(true);
        }
      }}
    />
  );
}
