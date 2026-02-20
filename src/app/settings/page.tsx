"use client";

import { useState, useEffect } from "react";
import type { SettingsPayload } from "@/app/api/settings/route";

type SettingsState = {
  profile: { displayName: string; email: string };
  notifications: { escalationAlerts: boolean; dailySummary: boolean };
  preferences: { riskThreshold: number; timezone: string; orgName: string };
};

const defaultState: SettingsState = {
  profile: { displayName: "Account", email: "you@company.com" },
  notifications: { escalationAlerts: true, dailySummary: true },
  preferences: { riskThreshold: 70, timezone: "America/New_York", orgName: "Acme Support" },
};

function mergePayload(state: SettingsState, payload: Partial<SettingsPayload>): SettingsState {
  return {
    profile: { ...state.profile, ...payload.profile },
    notifications: { ...state.notifications, ...payload.notifications },
    preferences: { ...state.preferences, ...payload.preferences },
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSettings(mergePayload(defaultState, data));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: settings.profile }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSettings(mergePayload(defaultState, data));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: settings.notifications }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSettings(mergePayload(defaultState, data));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: settings.preferences }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSettings(mergePayload(defaultState, data));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Enterprise configuration
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <p className="text-sm text-neutral-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enterprise configuration
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {saveSuccess && (
        <div
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Settings saved.
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">Profile</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Account display and contact
          </p>
          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Display name
              </span>
              <input
                type="text"
                value={settings.profile.displayName}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    profile: { ...s.profile, displayName: e.target.value },
                  }))
                }
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">Email</span>
              <input
                type="email"
                value={settings.profile.email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    profile: { ...s.profile, email: e.target.value },
                  }))
                }
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">
            Notifications
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Alerts and digests
          </p>
          <form onSubmit={handleSaveNotifications} className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.escalationAlerts}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: {
                      ...s.notifications,
                      escalationAlerts: e.target.checked,
                    },
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">
                  Escalation risk alerts
                </span>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Notify when a live session reaches high or critical risk
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.dailySummary}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: {
                      ...s.notifications,
                      dailySummary: e.target.checked,
                    },
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">
                  Daily summary
                </span>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Daily digest of risk analytics and call volume
                </p>
              </div>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save notifications"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">
            Preferences
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Thresholds and organization
          </p>
          <form onSubmit={handleSavePreferences} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Escalation risk threshold (%)
              </span>
              <p className="mt-0.5 text-xs text-neutral-500">
                Show warning when session risk exceeds this value (0–100)
              </p>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.preferences.riskThreshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    preferences: {
                      ...s.preferences,
                      riskThreshold: Number(e.target.value) || 70,
                    },
                  }))
                }
                className="mt-1.5 block w-full max-w-[120px] rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Organization name
              </span>
              <input
                type="text"
                value={settings.preferences.orgName}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    preferences: { ...s.preferences, orgName: e.target.value },
                  }))
                }
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Timezone
              </span>
              <select
                value={settings.preferences.timezone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    preferences: {
                      ...s.preferences,
                      timezone: e.target.value,
                    },
                  }))
                }
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="America/New_York">Eastern (America/New_York)</option>
                <option value="America/Chicago">Central (America/Chicago)</option>
                <option value="America/Denver">Mountain (America/Denver)</option>
                <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
