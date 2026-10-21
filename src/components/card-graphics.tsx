export function CmpLogo({
  className,
  alt = "CMP",
  src,
}: {
  className?: string;
  alt?: string;
  src?: string | null;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || "/logo-cmp.png"} alt={alt} className={className} />
  );
}

export function LibraryLogo({
  className,
  primary = "#0C5A35",
  accent = "#C9A227",
}: {
  className?: string;
  primary?: string;
  accent?: string;
}) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <path
        d="M40 6.5c.4 0 .8.2 1 .5l5.2 7.4c.3.4.3 1 0 1.4L40 23.2l-6.2-7.4c-.3-.4-.3-1 0-1.4L39 7c.2-.3.6-.5 1-.5z"
        fill={accent}
      />
      <path
        d="M40 4.2c1.2 0 1.2 1.8 0 1.8s-1.2-1.8 0-1.8z"
        fill={accent}
      />
      <rect x="37.2" y="22" width="5.6" height="26" rx="1.2" fill={primary} />
      <path
        d="M34 32h12v2.2H34zM35.2 36.4h9.6v1.6H35.2z"
        fill={accent}
      />
      <path
        d="M28 47.5c0-1.2.8-2.2 2-2.5 3.2-.8 6.4-1.2 10-1.2s6.8.4 10 1.2c1.2.3 2 1.3 2 2.5V52H28v-4.5z"
        fill={primary}
      />
      <path
        d="M12 52c8.5-6.5 16-8 28-8s19.5 1.5 28 8v18.5c-9-7-18-9.5-28-9.5s-19 2.5-28 9.5V52z"
        fill={primary}
      />
      <path
        d="M14.5 54.2c7.5-5.4 14.2-6.7 25.5-6.7 11.3 0 18 1.3 25.5 6.7v13.2c-8-6.2-16.2-8.2-25.5-8.2s-17.5 2-25.5 8.2V54.2z"
        fill={accent}
        opacity="0.95"
      />
      <path d="M40 46.5v24" stroke={primary} strokeWidth="2.2" />
      <circle cx="40" cy="14.5" r="2.1" fill={primary} />
    </svg>
  );
}

export function MosqueSkyline({ className, color = "#083820" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 260 70" className={className} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g fill={color}>
        <rect x="178" y="28" width="5" height="34" />
        <rect x="176.5" y="24" width="8" height="5" rx="1" />
        <path d="M180.5 8 l3.2 14 h-6.4z" />
        <circle cx="180.5" cy="7" r="2.1" />
        <rect x="198" y="22" width="7" height="40" />
        <rect x="196" y="18" width="11" height="5" rx="1" />
        <path d="M201.5 4 l4 14 h-8z" />
        <path d="M201.5 2.2c1.6 0 1.6 2.4 0 2.4s-1.6-2.4 0-2.4z" />
        <path d="M214 38a16 10 0 0 1 32 0v24H214z" />
        <rect x="226" y="18" width="6" height="20" />
        <rect x="224.2" y="14" width="9.6" height="5" rx="1" />
        <path d="M229 4 l3.4 10 h-6.8z" />
        <path d="M152 42a18 12 0 0 1 36 0v20h-36z" />
        <rect x="166" y="26" width="5" height="18" />
        <path d="M168.5 16 l2.8 10 h-5.6z" />
        <path d="M236 44a10 8 0 0 1 20 0v18h-20z" />
        <rect x="244" y="30" width="4" height="16" />
        <path d="M246 22 l2.2 8 h-4.4z" />
      </g>
    </svg>
  );
}

export function BookMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v14.2L8.8 15.4a1 1 0 0 0-.8 0L5 17.2V5.5zM12 3h5.5A2.5 2.5 0 0 1 20 5.5v11.7l-3.2-1.8a1 1 0 0 0-.8 0L12 17.2V3z"
      />
    </svg>
  );
}

export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 100" className={className} aria-hidden="true">
      <rect width="80" height="100" fill="#d9d9d9" />
      <circle cx="40" cy="38" r="16" fill="#9aa0a6" />
      <path d="M12 92c4-22 16-32 28-32s24 10 28 32" fill="#9aa0a6" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12zm0 2c-4 0-8 2-8 5v1.5h16V19c0-3-4-5-8-5z"
      />
    </svg>
  );
}

export function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4a2 2 0 0 1 2 2v3H3V8a2 2 0 0 1 2-2h4zm2-.8h2V5h-2v.2zM3 13h8v1.2a1 1 0 0 0 2 0V13h8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"
      />
    </svg>
  );
}

export function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.2 3.5h3.1c.4 0 .8.3.9.7l.7 2.6a1 1 0 0 1-.3 1l-1.5 1.2a12.5 12.5 0 0 0 5.6 5.6l1.2-1.5a1 1 0 0 1 1-.3l2.6.7c.4.1.7.5.7.9v3.1a1 1 0 0 1-1.1 1A16.5 16.5 0 0 1 6.2 4.6a1 1 0 0 1 1-1.1z"
      />
    </svg>
  );
}

export function IconCard() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9zM5 9h14v2H5V9zm1 5h6v1.5H6V14z"
      />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 3.5h1.5V5h5V3.5H16V5h2.5A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H8V3.5zM6 9v9h12V9H6z"
      />
    </svg>
  );
}

export function IconScan() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 3h8a3 3 0 0 1 3 3v2h-1.6V6A1.4 1.4 0 0 0 16 4.6H8A1.4 1.4 0 0 0 6.6 6v2H5V6a3 3 0 0 1 3-3zm11 8.2H5v1.6h14v-1.6zM6.6 16v2A1.4 1.4 0 0 0 8 19.4h8a1.4 1.4 0 0 0 1.4-1.4v-2H19v2a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2h1.6z"
      />
    </svg>
  );
}
