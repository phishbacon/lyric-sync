"use client";

import { Check, Loader2, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { SettingsResult } from "./actions";

import { refetchLibrary, renameServer, testSavedConnection } from "./actions";

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 60_000;

/** The two onboarding actions, passed in so this page owns no Plex auth. */
interface AuthActions {
  startAuth: () => Promise<
    | {
      success: true;
      authUrl: string;
      clientIdentifier: string;
      pinId: number;
      pinCode: string;
    }
    | { success: false; message: string }
  >;
  updateToken: (input: {
    token: string;
    clientIdentifier: string;
  }) => Promise<SettingsResult>;
}

export function SettingsForm({
  server,
  activeLibrary,
  startAuth,
  updateToken,
}: {
  server: { name: string; baseUrl: string };
  activeLibrary: { title: string; path: string } | null;
  startAuth: AuthActions["startAuth"];
  updateToken: AuthActions["updateToken"];
}) {
  const router = useRouter();

  // Connection test.
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<SettingsResult | null>(null);

  // Rename.
  const [name, setName] = useState(server.name);
  const [renaming, startRename] = useTransition();
  const [renameResult, setRenameResult] = useState<SettingsResult | null>(null);

  // Re-auth (plex.tv PIN OAuth — mirrors the setup flow).
  const [authing, startAuthFlow] = useTransition();
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authDone, setAuthDone] = useState(false);
  const [fallbackAuthUrl, setFallbackAuthUrl] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  // Refetch.
  const [refetching, startRefetch] = useTransition();
  const [refetchResult, setRefetchResult] = useState<SettingsResult | null>(null);

  useEffect(() => () => pollAbortRef.current?.abort(), []);

  function handleTest() {
    startTest(async () => {
      setTestResult(await testSavedConnection());
    });
  }

  function handleRename() {
    startRename(async () => {
      const result = await renameServer(name);
      setRenameResult(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleReauth() {
    startAuthFlow(async () => {
      // Reserve the popup synchronously, before the first await, so the
      // browser doesn't block it as a non-user-gesture popup.
      const popup = window.open("about:blank", "_blank");
      setAuthMessage(null);
      setAuthDone(false);
      setFallbackAuthUrl(null);

      const pin = await startAuth();
      if (!pin.success) {
        setAuthMessage(pin.message);
        return;
      }
      if (popup) {
        popup.location.href = pin.authUrl;
      } else {
        setFallbackAuthUrl(pin.authUrl);
      }

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      const controller = new AbortController();
      pollAbortRef.current = controller;

      while (Date.now() < deadline && !controller.signal.aborted) {
        const params = new URLSearchParams({
          pinId: String(pin.pinId),
          pinCode: pin.pinCode,
          clientIdentifier: pin.clientIdentifier,
        });
        const response = await fetch(`/api/plex/pin/poll?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json() as {
          authenticated: boolean;
          token?: string;
        };
        if (data.authenticated && data.token) {
          const saved = await updateToken({
            token: data.token,
            clientIdentifier: pin.clientIdentifier,
          });
          setAuthMessage(saved.message);
          setAuthDone(saved.success);
          router.refresh();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      setAuthMessage("Plex authentication timed out");
    });
  }

  function handleRefetch() {
    startRefetch(async () => {
      setRefetchResult(await refetchLibrary());
      router.refresh();
    });
  }

  const nameChanged = name.trim() !== server.name && name.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Connection */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-muted" />
            Connection
          </h2>
          <p className="text-xs text-muted">
            {server.name}
            {" — "}
            {server.baseUrl}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-border disabled:opacity-50"
          >
            {testing && <Loader2 className="size-4 animate-spin" />}
            Test connection
          </button>
          {testResult && (
            <p
              className={
                `text-sm ${testResult.success ? "text-green-400" : "text-red-400"}`
              }
            >
              {testResult.message}
            </p>
          )}
        </div>
      </section>

      {/* Rename */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Server name</h2>
          <p className="text-xs text-muted">
            A display label for this Plex server.
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={event => {
              setName(event.target.value);
              setRenameResult(null);
            }}
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRename}
              disabled={renaming || !nameChanged}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-border disabled:opacity-50"
            >
              {renaming && <Loader2 className="size-4 animate-spin" />}
              Rename
            </button>
            {renameResult && (
              <p
                className={
                  `text-sm ${renameResult.success ?
                    "text-green-400"
                    : "text-red-400"}`
                }
              >
                {renameResult.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Re-authenticate */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-muted" />
            Authentication
          </h2>
          <p className="text-xs text-muted">
            If Plex access has expired, re-authenticate via plex.tv. The token
            is stored server-side only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReauth}
            disabled={authing}
            className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {authing && <Loader2 className="size-4 animate-spin" />}
            Re-authenticate
          </button>
          {authDone && <Check className="size-4 text-green-400" />}
          {authMessage && (
            <p
              className={
                `text-sm ${authDone ? "text-green-400" : "text-red-400"}`
              }
            >
              {authMessage}
            </p>
          )}
        </div>
        {fallbackAuthUrl && (
          <p className="text-xs text-muted">
            Popup was blocked —
            {" "}
            <a
              href={fallbackAuthUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              open the Plex approval page
            </a>
            {" "}
            and approve access.
          </p>
        )}
      </section>

      {/* Refetch */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Library import</h2>
          <p className="text-xs text-muted">
            {activeLibrary === null ?
              "No active library selected."
              : `Active library: ${activeLibrary.title} — ${activeLibrary.path}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefetch}
            disabled={refetching || activeLibrary === null}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-border disabled:opacity-50"
          >
            {refetching && <Loader2 className="size-4 animate-spin" />}
            <RefreshCw className="size-4" />
            Re-fetch library
          </button>
          {refetchResult && (
            <p
              className={
                `text-sm ${refetchResult.success ?
                  "text-green-400"
                  : "text-red-400"}`
              }
            >
              {refetchResult.message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
