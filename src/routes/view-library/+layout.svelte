<script lang="ts">
  import { getContext, onMount, type Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();
  const redirectOnMount: () => void
    = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount();
  });
</script>

<!-- Content -->
{@render children()}
