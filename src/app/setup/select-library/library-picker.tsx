"use client";

import { Check, Loader2, Music2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchLibraries, selectLibrary } from "./actions";

interface PlexLibrary {
  uuid: string;
  title: string;
  path: string;
  image: string | null;
}

export function LibraryPicker() {
  const router = useRouter();
  const [libraryList, setLibraryList] = useState<PlexLibrary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFetch() {
    setLoading(true);
    setMessage("");
    const result = await fetchLibraries();
    if (result.success) {
      setLibraryList(result.libraries);
    } else {
      setMessage(result.message);
    }
    setLoading(false);
  }

  async function handleSelect() {
    const library = libraryList?.find(l => l.uuid === selected);
    if (!library) {
      return;
    }
    setSelecting(true);
    setMessage("");
    const result = await selectLibrary(library);
    setMessage(result.message);
    setSelecting(false);
    if (result.success) {
      router.push("/library");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Select a music library</h1>
        <p className="text-sm text-muted">
          Choose which Plex music library Lyric-Sync should work with.
        </p>
      </div>

      {libraryList === null
        ? (
          <button
            type="button"
            onClick={handleFetch}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Load libraries from Plex
          </button>
        )
        : (
          <div className="space-y-4">
            <div className="space-y-2">
              {libraryList.map(library => (
                <button
                  key={library.uuid}
                  type="button"
                  onClick={() => setSelected(library.uuid)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selected === library.uuid
                      ? "border-accent bg-surface-raised"
                      : "border-border bg-surface hover:bg-surface-raised"
                  }`}
                >
                  <Music2 className="size-5 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{library.title}</div>
                    <div className="truncate text-xs text-muted">{library.path}</div>
                  </div>
                  {selected === library.uuid && (
                    <Check className="size-4 text-accent" />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSelect}
              disabled={!selected || selecting}
              className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
            >
              {selecting && <Loader2 className="size-4 animate-spin" />}
              Use this library
            </button>
          </div>
        )}

      {message !== "" && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
