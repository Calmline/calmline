import type { ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[#120D06]">
      {children}
    </h1>
  );
}
