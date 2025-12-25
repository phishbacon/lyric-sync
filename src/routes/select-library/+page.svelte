<script lang="ts">
  import type {
    InferredSelectLibrarySchema,
    SelectLibraryResponse,
  } from "$lib/types";

  import { goto } from "$app/navigation";
  import SelectLibraryCard from "$lib/components/SelectLibraryCard.svelte";
  import { toaster } from "$lib/toaster";

  import type { LayoutServerData } from "../$types";

  const { data }: { data: LayoutServerData } = $props();
  // this is so the components are rerendered everytime their values change
  const libraryState: Array<InferredSelectLibrarySchema> = $state(
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    data.libraries,
  );

  // Update currentLibrary to true on clicked library and set all others to false
  function updateSelected(uuid: string): void {
    libraryState.forEach((library) => {
      if (library.uuid === uuid) {
        library.currentLibrary = true;
      }
      else {
        library.currentLibrary = false;
      }
    });
    // set data.libraries to whatever we have in libraryState
    data.libraries = libraryState;
  }

  // Update all currentLibrary values in db
  async function selectLibrary() {
    const response: Response = await fetch("/select-library", {
      method: "POST",
      body: JSON.stringify(libraryState),
    });

    const res: SelectLibraryResponse = await response.json();
    if (res.selected) {
      await fetch("/api/get-latest-plex-data");
      goto("/view-library", { invalidateAll: true });
      toaster.create({
        title: "Library Selected",
        description: res.message,
        type: "success",
      });
    }
    else {
      toaster.create({
        title: "Library Selection Error",
        description: res.message,
        type: "error",
      });
    }
  }
</script>

<div class="min-h-screen bg-linear-to-br from-surface-50-900 to-surface-100-800">
  <div class="container mx-auto p-4 py-16">
    <div class="w-full max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="h1 mb-6 text-surface-900-100">Select Library</h1>
        <p class="text-surface-600-400 text-lg">
          Choose which Plex library you'd like to sync lyrics for
        </p>
      </div>

      <!-- Library Cards Container -->
      <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-6 md:p-8 shadow-xl">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {#each libraryState as library}
            <div class="flex justify-center">
              <SelectLibraryCard
                {library}
                serverConfiguration={data.serverConfiguration}
                {updateSelected}
              />
            </div>
          {/each}
        </div>

        <!-- Action Button -->
        <div class="flex justify-center pt-8 md:pt-10">
          <button
            type="button"
            class="btn preset-filled-primary-500 px-8 py-3 text-lg"
            onclick={selectLibrary}
          >
            Select Library
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
