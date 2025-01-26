<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  let rootElement: HTMLElement;
  let renderComponent: boolean = false;

  const createIntersectionObserver = () => {
    return new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          renderComponent = true;
        }
      }
    });
  };

  onMount(() => {
    if (rootElement) {
      createIntersectionObserver().observe(rootElement);
    }
  });
</script>

<div bind:this={rootElement}>
  {#if renderComponent}
    <div transition:fade>
      <slot></slot>
    </div>
  {/if}
</div>
