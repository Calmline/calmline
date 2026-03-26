import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0F1C2B] to-[#0B1623] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-white/[0.1] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] md:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`mb-3 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={className}>{children}</div>;
}
