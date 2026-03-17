import React from "react";

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" as const };

const withIcon = (
  fn: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode,
) => {
  const IconComponent = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...iconProps} {...props}>
      {fn(props)}
    </svg>
  );
  IconComponent.displayName = "Icon";
  return IconComponent;
};

export const IconSearch = withIcon(() => (
  <>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
    <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2"/>
  </>
));

export const IconOverview = withIcon(() => (
  <>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
  </>
));

export const IconLive = withIcon(() => (
  <>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
  </>
));

export const IconShield = withIcon(() => (
  <>
    <path
      d="M12 3L6 5v6c0 3.5 2.4 6.2 6 7 3.6-.8 6-3.5 6-7V5l-6-2z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 8v6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </>
));

export const IconPolicies = withIcon(() => (
  <>
      <path d="M7 2h10v6l-5 4-5-4V2z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M7 12v6h10v-6" stroke="currentColor" strokeWidth="2" fill="none"/>
  </>
));

export const IconAnalytics = withIcon(() => (
  <>
      <path d="M3 17v-4h4v4H3zm6 0v-8h4v8H9zm6 0V7h4v10h-4z" stroke="currentColor" strokeWidth="2" fill="none"/>
  </>
));

export const IconHistory = withIcon(() => (
  <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none"/>
  </>
));

export const IconAgents = withIcon(() => (
  <>
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="17" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 19v-1a2 2 0 0 0-2-2" stroke="currentColor" strokeWidth="2" fill="none"/>
  </>
));

export const IconTraining = withIcon(() => (
  <>
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
  </>
));

export const IconSettings = withIcon(() => (
  <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2"/>
  </>
));
