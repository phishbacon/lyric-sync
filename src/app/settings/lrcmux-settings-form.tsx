"use client";

import { Loader2, RotateCcw, Save, TestTube2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { LrcmuxSettings, SourceId } from "@/lib/server/settings/lrcmux";

import { saveLrcmuxSettings, testLrcmuxConnection, type SettingsResult } from "./actions";

interface SourceOption { id: SourceId; label: string }

export function LrcmuxSettingsForm({
  initial,
  defaults,
  sources,
}: {
  initial: LrcmuxSettings;
  defaults: LrcmuxSettings;
  sources: SourceOption[];
}) {
  const [values, setValues] = useState<LrcmuxSettings>(initial);
  const [savedValues, setSavedValues] = useState<LrcmuxSettings>(initial);
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [available, setAvailable] = useState<string[] | null>(null);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const changed = JSON.stringify(values) !== JSON.stringify(savedValues);

  function update(next: LrcmuxSettings) {
    setValues(next);
    setResult(null);
    setAvailable(null);
  }

  function save() {
    startSave(async () => {
      const saved = await saveLrcmuxSettings(values);
      setResult(saved);
      if (saved.success) {
        setSavedValues(values);
      }
    });
  }

  function test() {
    startTest(async () => {
      const connection = await testLrcmuxConnection(values.baseUrl);
      setResult(connection);
      setAvailable(connection.sources ?? null);
    });
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-surface p-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Lyrics · LrcMux</h2>
        <p className="text-xs text-muted">
          LrcMux searches enabled sources and chooses the best result. Source ranking
          is managed by LrcMux. Settings apply to future sync jobs.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="lrcmux-base-url" className="block text-sm font-medium">LrcMux API URL</label>
        <input
          id="lrcmux-base-url"
          type="url"
          value={values.baseUrl}
          onChange={event => update({ ...values, baseUrl: event.target.value })}
          className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="https://api.lrcmux.dev"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Sources</legend>
        <p className="text-xs text-muted">
          Enable at least one. Availability varies by instance; Test connection
          checks which sources this server currently supports.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sources.map(source => (
            <label key={source.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.enabledSources.includes(source.id)}
                onChange={event => update({
                  ...values,
                  enabledSources: event.target.checked
                    ? sources.filter(item => item.id === source.id
                      || values.enabledSources.includes(item.id)).map(item => item.id)
                    : values.enabledSources.filter(id => id !== source.id),
                })}
                className="accent-accent"
              />
              {source.label}
              {available !== null && (
                <span className={`text-xs ${available.includes(source.id) ? "text-green-400" : "text-muted"}`}>
                  {available.includes(source.id) ? "available" : "unavailable"}
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={values.preferSynced}
          onChange={event => update({ ...values, preferSynced: event.target.checked })}
          className="mt-1 accent-accent"
        />
        <span>
          <span className="block font-medium">Prefer synchronized lyrics</span>
          <span className="block text-xs text-muted">
            When enabled, prefer word timing, then line timing, then plain text.
            Otherwise save plain text even when timed lyrics are available.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || testing || !changed || values.enabledSources.length === 0}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={test}
          disabled={testing || saving}
          className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
          Test connection
        </button>
        <button
          type="button"
          onClick={() => update(defaults)}
          disabled={saving || testing}
          className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Restore defaults
        </button>
      </div>
      {values.enabledSources.length === 0 && (
        <p role="alert" className="text-sm text-red-400">Enable at least one source.</p>
      )}
      {result && (
        <p role="status" className={`text-sm ${result.success ? "text-green-400" : "text-red-400"}`}>
          {result.message}
        </p>
      )}
      <p className="text-xs text-muted">
        Restoring defaults requires Save changes. Saved lyrics stay on disk;
        previous “No lyrics found” results can be retried in the next sync batch.
      </p>
    </section>
  );
}
