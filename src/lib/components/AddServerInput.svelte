<script lang="ts">
  import type { AddServerFormValues, InputClassIconAndTitle } from "$lib/types";

  import { PlexAuthTokenURL } from "$lib/external-links";
  import { CircleX, Info, SquareCheck } from "lucide-svelte";
  import { fade } from "svelte/transition";

  const { label, placeholder, field, type = "text", errors, inputFocused, className = "", updateForm, info }: {
    label: string;
    placeholder: string;
    field: keyof AddServerFormValues;
    type?: "text" | "number";
    errors: string[] | undefined;
    inputFocused: boolean;
    className?: string;
    info: string;
    updateForm: (field: keyof AddServerFormValues, value: string | number) => void;
  } = $props();

  const value = $derived(type === "number"
    ? (e: Event) => updateForm(field, Number((e.target as HTMLInputElement).value))
    : (e: Event) => updateForm(field, (e.target as HTMLInputElement).value),
  );

  const inputClassIconAndTitle: InputClassIconAndTitle = $derived.by(() => {
    if (inputFocused) {
      if (errors) {
        return {
          class: "input-error",
          icon: CircleX,
          title: errors[0],
        };
      }
      return {
        class: "input-success",
        icon: SquareCheck,
      };
    }
    return {
      icon: Info,
      title: info,
    };
  });
</script>

<label class="label {className}">
  <p>{label}</p>
  <div class="input-group input-group-divider grid-cols-[1fr_auto]">
    <input
      name={field}
      type="text"
      {placeholder}
      class="form-input {inputClassIconAndTitle.class}"
      oninput={value} />
    {#if true}
      {@const Icon = inputClassIconAndTitle.icon}
      {#key inputClassIconAndTitle.icon}
        {#if field === "xPlexToken"}
          <a href={PlexAuthTokenURL} target="_blank" in:fade title={inputClassIconAndTitle.title}><Icon /></a>
        {:else}
          <!-- svelte-ignore a11y_missing_attribute -->
          <a in:fade title={inputClassIconAndTitle.title}><Icon /></a>
        {/if}
      {/key}
    {/if}
  </div>
</label>

<style>
  label:not(.header) > p {
    margin-top: 1rem;
    width: 25rem;
  }
</style>
