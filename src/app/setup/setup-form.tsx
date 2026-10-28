"use client";

import { Loader2, Plug, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveServer, startPlexAuth, testServerConnection } from "./actions";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

type AuthState = "idle" | "waiting" | "done";

export function SetupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [clientIdentifier, setClientIdentifier] = useState("");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testedOk, setTestedOk] = useState(false);

  const pollAbortRef = useRef<AbortController | null>(null);
  const snapshotRef = useRef({ name, baseUrl });
  snapshotRef.current = { name, baseUrl };

  useEffect(() => () => pollAbortRef.current?.abort(), []);

  async function handleAuthenticate() {
    setMessage("");
    const result = await startPlexAuth();
    if (!result.success) {
      setMessage(result.message);
      return;
    }
    setClientIdentifier(result.clientIdentifier);
    setAuthState("waiting");
    window.open(result.authUrl, "_blank", "noopener");

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const controller = new AbortController();
    pollAbortRef.current = controller;

    while (Date.now() < deadline && !controller.signal.aborted) {
      const params = new URLSearchParams({
        pinId: String(result.pinId),
        pinCode: result.pinCode,
        clientIdentifier: result.clientIdentifier,
      });

      try {
        const response = await fetch(`/api/plex/pin/poll?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json() as { authenticated: boolean; token?: string };
        if (data.authenticated && data.token) {
          setToken(data.token);
          setAuthState("done");
          setMessage("Plex authentication complete");
          return;
        }
      }
      catch {
        // AbortError on unmount — silently stop polling.
        return;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (!controller.signal.aborted) {
      setAuthState("idle");
      setMessage("Plex authentication timed out");
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestedOk(false);
    setMessage("");
    const result = await testServerConnection({
      baseUrl,
      token,
      clientIdentifier,
    });
    setMessage(result.message);
    setTestedOk(result.success);
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const formData = new FormData();
    formData.set("name", name);
    formData.set("baseUrl", baseUrl);
    formData.set("xPlexToken", token);
    formData.set("clientIdentifier", clientIdentifier);
    const result = await saveServer(formData);
    setMessage(result.message);
    setSaving(false);
    if (result.success) {
      router.push("/setup/select-library");
    }
  }

  const canTest = baseUrl !== "" && token !== "" && !testing;
  const canSave = testedOk && name !== "" && !saving;
  const busy = testing || saving || authState === "waiting";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Set up Lyric-Sync</h1>
        <p className="text-sm text-muted">
          Connect your Plex server to start syncing lyrics.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Server name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Plex Server"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Server URL</span>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="http://192.168.1.10:32400"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="block text-xs text-muted">
            Full URL including scheme and port
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium">Plex account</span>
          {authState === "done"
            ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  Authenticated
                </div>
              )
            : (
                <button
                  type="button"
                  onClick={handleAuthenticate}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-border disabled:opacity-50"
                >
                  {authState === "waiting"
                    ? <Loader2 className="size-4 animate-spin" />
                    : <Plug className="size-4" />}
                  Authenticate with Plex
                </button>
              )}
          <span className="block text-xs text-muted">
            Opens plex.tv in a new tab — approve access there
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={!canTest}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-border disabled:opacity-50"
          >
            {testing && <Loader2 className="size-4 animate-spin" />}
            Test connection
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Save className="size-4" />
            Save server
          </button>
        </div>

        {message !== "" && (
          <p className="text-sm text-muted">{message}</p>
        )}
      </div>
    </div>
  );
}
