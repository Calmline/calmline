import { NextResponse } from "next/server";

export type AgentPerformance = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "available" | "busy" | "offline";
  callsHandled: number;
  avgEscalationRisk: number;
  deEscalationRate: number;
  lastActiveAt: string;
};

const MOCK_AGENTS: AgentPerformance[] = [
  {
    id: "1",
    name: "Jordan Smith",
    email: "jordan.smith@company.com",
    role: "Support Lead",
    status: "available",
    callsHandled: 142,
    avgEscalationRisk: 18,
    deEscalationRate: 94,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Sam Rivera",
    email: "sam.rivera@company.com",
    role: "Support Agent",
    status: "busy",
    callsHandled: 89,
    avgEscalationRisk: 24,
    deEscalationRate: 91,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Alex Chen",
    email: "alex.chen@company.com",
    role: "Support Agent",
    status: "available",
    callsHandled: 67,
    avgEscalationRisk: 22,
    deEscalationRate: 88,
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

/**
 * GET /api/agents
 * Returns agent list with performance metrics. Uses mock data when database is not connected.
 */
export async function GET() {
  try {
    const dbConnected =
      typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

    if (!dbConnected) {
      return NextResponse.json({
        agents: MOCK_AGENTS,
        source: "mock",
      });
    }

    // TODO: when DB is connected, fetch agents and metrics from database
    return NextResponse.json({
      agents: MOCK_AGENTS,
      source: "mock",
    });
  } catch (err) {
    console.error("GET /api/agents error:", err);
    return NextResponse.json(
      { error: "Failed to load agents", agents: [] },
      { status: 500 }
    );
  }
}
