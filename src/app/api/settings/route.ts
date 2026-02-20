import { NextResponse } from "next/server";

export type SettingsPayload = {
  profile?: { displayName?: string; email?: string };
  notifications?: {
    escalationAlerts?: boolean;
    dailySummary?: boolean;
  };
  preferences?: {
    riskThreshold?: number;
    timezone?: string;
    orgName?: string;
  };
};

const DEFAULT_SETTINGS: Required<SettingsPayload> = {
  profile: {
    displayName: "Account",
    email: "you@company.com",
  },
  notifications: {
    escalationAlerts: true,
    dailySummary: true,
  },
  preferences: {
    riskThreshold: 70,
    timezone: "America/New_York",
    orgName: "Acme Support",
  },
};

/**
 * GET /api/settings
 * Returns enterprise configuration. Uses mock data when database is not connected.
 */
export async function GET() {
  try {
    const dbConnected =
      typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

    if (!dbConnected) {
      return NextResponse.json({
        ...DEFAULT_SETTINGS,
        source: "mock",
      });
    }

    // TODO: when DB is connected, fetch settings from database
    return NextResponse.json({
      ...DEFAULT_SETTINGS,
      source: "mock",
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings
 * Updates enterprise configuration. Merges with existing; returns full settings. Uses mock when DB not connected.
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<SettingsPayload>;
    const dbConnected =
      typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

    const current = { ...DEFAULT_SETTINGS };

    if (body.profile) {
      current.profile = { ...current.profile, ...body.profile };
    }
    if (body.notifications) {
      current.notifications = { ...current.notifications, ...body.notifications };
    }
    if (body.preferences) {
      current.preferences = { ...current.preferences, ...body.preferences };
    }

    if (current.preferences.riskThreshold != null) {
      current.preferences.riskThreshold = Math.max(
        0,
        Math.min(100, Number(current.preferences.riskThreshold) || 70)
      );
    }

    if (!dbConnected) {
      return NextResponse.json({
        ...current,
        source: "mock",
      });
    }

    // TODO: when DB is connected, persist and return saved settings
    return NextResponse.json({
      ...current,
      source: "mock",
    });
  } catch (err) {
    console.error("PATCH /api/settings error:", err);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
