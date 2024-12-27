<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";
  import type { SelectLibraryResponse } from "$lib/types";

  import { invalidateAll } from "$app/navigation";
  import SelectLibraryCard from "$lib/components/SelectLibraryCard.svelte";
  import { getContext } from "svelte";

  import type { LayoutServerData } from "../$types";

  export const toast: ToastContext = getContext("toast");

  const { data }: { data: LayoutServerData } = $props();
  // this is so the components are rerendered everytime their values change
  const libraryState = $state(data.libraries);

  // Update currentLibrary to true on clicked library and set all others to false
  function updateSelected(uuid: string): void {
    libraryState.forEach((library) => {
      if (library.uuid === uuid) {
        data.currentLibrary = library;
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
    const response = await fetch("/select-library", {
      method: "POST",
      body: JSON.stringify(libraryState),
    });

    const res: SelectLibraryResponse = await response.json();
    if (res.selected) {
      invalidateAll();
      toast.create({
        title: "Library Selected",
        description: res.message,
        type: "success",
      });
    }
    else {
      toast.create({
        title: "Library Selection Error",
        description: res.message,
        type: "error",
      });
    }
  }
</script>
<div class="space-y-10 flex flex-col items-center">
  <h2 class="h2 text-center">Select Library</h2>
  <div class="grid grid-cols-2 space-x-1 space-y-3">
    {#each libraryState as library}
      <SelectLibraryCard {library} serverConfiguration={data.serverConfiguration} {updateSelected} />
    {/each}
  </div>
  <button type="button" class="btn preset-filled" onclick={selectLibrary}>Submit</button>
</div>
