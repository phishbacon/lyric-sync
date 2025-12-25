<script lang="ts">

  import type { ImageConfig } from "$lib/types";

  import { Progress } from "@skeletonlabs/skeleton-svelte";
  import place_holder from "$lib/assets/place_holder.png";
  import { getImageSrc } from "$lib/image-utils";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  import LazyLoading from "./LazyLoading.svelte";

  const {
    imageConfig,
    alt,
    imgClasses = "",
    loadingClasses = "",
    size,
    meterStroke,
    trackStroke,
    lazy = true,
  } = $props<{
    imageConfig: ImageConfig;
    alt: string;
    imgClasses?: string;
    loadingClasses?: string;
    size: string;
    meterStroke: string;
    trackStroke: string;
    lazy?: boolean;
  }>();
  // svelte-ignore state_referenced_locally
  let src: string = $state(getImageSrc(imageConfig));
  let renderComponent: boolean = $state(false);
  let loading: boolean = $state(true);
  let timeout: number | undefined;

  function imageLoaded(): void {
    loading = false;
    clearTimeout(timeout);
  }

  function imageFailed() {
    src = place_holder;
    loading = false;
    clearTimeout(timeout);
  }

  onMount(() => {
    if (!lazy) {
      timeout = window.setTimeout(() => {
        imageFailed();
      }, 10000);
    }
  });

  $effect(() => {
    if (window && renderComponent) {
      timeout = window.setTimeout(() => {
        imageFailed();
      }, 10000);
    }
  });
</script>

{#if lazy}
  <LazyLoading bind:renderComponent={renderComponent}>
    {#snippet content()}
      {#key loading}
        <img
          src={src}
          {alt}
          class={imgClasses}
          class:hidden={loading}
          in:fade
          onload={imageLoaded}
          onerror={imageFailed}
        />
        <div class:hidden={!loading} class={loadingClasses} in:fade>
          <Progress class="items-center w-fit" value={null}>
            <Progress.Circle class={size}>
              <Progress.CircleTrack class={trackStroke} />
              <Progress.CircleRange class={meterStroke} />
            </Progress.Circle>
          </Progress>
        </div>
      {/key}
    {/snippet}
  </LazyLoading>
{:else}
  {#key loading}
    <img
      src={src}
      {alt}
      class={imgClasses}
      class:hidden={loading}
      in:fade
      onload={imageLoaded}
      onerror={imageFailed}
    />
    <div class:hidden={!loading} class={loadingClasses} in:fade>
      <Progress class="items-center w-fit" value={null}>
        <Progress.Circle class={size}>
          <Progress.CircleTrack class={trackStroke} />
          <Progress.CircleRange class={meterStroke} />
        </Progress.Circle>
      </Progress>
    </div>
  {/key}
{/if}
