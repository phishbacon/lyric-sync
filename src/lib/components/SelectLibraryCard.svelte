<script lang="ts">
  import type { Directory, inferredSelectServerSchema } from "$lib/types";

  const { directory, serverConfiguration }: { directory: Directory; serverConfiguration: inferredSelectServerSchema | undefined } = $props();
  const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
</script>

<div
  class="card preset-filled-surface-100-900 border-[1px] border-surface-200-800 card-hover divide-surface-200-800 divide-y"
>
  <!-- {/* Header */} -->
  <header>
    <img src={baseURL + directory.composite + plexAuthToken} alt="Library Artwork" />
  </header>
  <!-- {/* Article */} -->
  <article class="space-y-4 p-4">
    <div>
      <h4 class="h4">{directory.title}</h4>
    </div>
  </article>
  <!-- {/* Footer */} -->
  <footer class="flex items-center justify-between gap-4 p-4">
    <small class="opacity-60">{directory.Location[0].path}</small>
  </footer>
</div>

<style>
  img {
    border-radius: .3rem;
  }
</style>
