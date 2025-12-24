<script lang="ts">
  import { type Snippet } from "svelte";
  import { fade } from "svelte/transition";

  let {
    renderComponent = $bindable(false),
    content,
  } = $props<{
    renderComponent?: boolean;
    content: Snippet;
  }>();

  let rootElement: HTMLElement;

  $effect(() => {
    if (!rootElement) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          renderComponent = true;
        }
      }
    });

    observer.observe(rootElement);

    return () => observer.disconnect();
  });
</script>

<div bind:this={rootElement}>
  {#if renderComponent}
    <div transition:fade>
      {@render content()}
    </div>
  {/if}
</div>
