import * as React from "react";

import logoLazone from "@/assets/logo-lazone.png";

export type AppLogoProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "onError"
> & {
  /** Defaults to bundled logo asset. */
  src?: string;
  /** Defaults to public fallback path (works well in native builds). */
  fallbackSrc?: string;
  /** Defaults to "LaZone". */
  alt?: string;
  onError?: React.ImgHTMLAttributes<HTMLImageElement>["onError"];
};

export function AppLogo({
  src,
  fallbackSrc = `${import.meta.env.BASE_URL}images/logo-lazone.png`,
  alt = "LaZone",
  onError,
  loading = "eager",
  decoding = "async",
  ...props
}: AppLogoProps) {
  const [currentSrc, setCurrentSrc] = React.useState<string>(src ?? logoLazone);

  React.useEffect(() => {
    setCurrentSrc(src ?? logoLazone);
  }, [src]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        onError?.(e);
      }}
    />
  );
}
