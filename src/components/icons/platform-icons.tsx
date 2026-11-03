import type { SVGProps } from "react";

// Minimal brand-mark glyphs for the platforms this app targets. lucide-react
// (the app's icon set) deliberately doesn't ship brand logos, so these are
// hand-drawn, single-color, 24x24-viewBox marks sized/styled the same way as
// lucide icons (inherit color via currentColor, take a className for sizing)
// so they drop into the same badge/button patterns everywhere else.

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.45 2H3.55A1.55 1.55 0 0 0 2 3.55v16.9A1.55 1.55 0 0 0 3.55 22h16.9A1.55 1.55 0 0 0 22 20.45V3.55A1.55 1.55 0 0 0 20.45 2ZM8.1 19H5.4V9.5h2.7Zm-1.35-10.8a1.56 1.56 0 1 1 0-3.13 1.56 1.56 0 0 1 0 3.13ZM19 19h-2.7v-4.6c0-1.1-.02-2.5-1.52-2.5-1.53 0-1.76 1.2-1.76 2.43V19h-2.7V9.5h2.6v1.3h.04a2.85 2.85 0 0 1 2.57-1.42c2.75 0 3.26 1.81 3.26 4.16Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-3.05-4.02h-3.06v14.28a2.59 2.59 0 1 1-2.59-2.59c.28 0 .55.04.8.12V10.4a5.72 5.72 0 1 0 4.94 5.67V9.53a7.31 7.31 0 0 0 4.05 1.22V7.7a4.28 4.28 0 0 1-1.09-1.88Z" />
    </svg>
  );
}
