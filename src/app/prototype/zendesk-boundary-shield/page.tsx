import type { Metadata } from "next";
import { ZendeskBoundaryShieldSimulator } from "./Simulator";

export const metadata: Metadata = {
  title: "Zendesk Boundary Shield prototype",
  description: "Synthetic Boundary Shield simulation for a future Zendesk Support sidebar. Talk audio is not connected.",
};

export default function ZendeskBoundaryShieldPage() {
  return <ZendeskBoundaryShieldSimulator />;
}
