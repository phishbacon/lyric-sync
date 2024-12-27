<script lang="ts">
  import type { AddServerFormValues, ClassIconAndTitle } from "$lib/types";

  import { PlexAuthTokenURL } from "$lib/external-links";
  import { CircleCheck, CircleX, Info } from "lucide-svelte";
  import { fade } from "svelte/transition";

  const { label, placeholder, field, type = "text", errors, inputFocused, updateForm, info }: {
    label: string;
    placeholder: string;
    field: keyof AddServerFormValues;
    type?: "text" | "number";
    errors: string[] | undefined;
    inputFocused: boolean;
    info: string;
    updateForm: (field: keyof AddServerFormValues, value: string | number) => void;
  } = $props();

  const value = $derived(type === "number"
    ? (e: Event) => updateForm(field, Number((e.target as HTMLInputElement).value))
    : (e: Event) => updateForm(field, (e.target as HTMLInputElement).value),
  );
  // #d41976
  const inputClassIconAndTitle: ClassIconAndTitle = $derived.by(() => {
    if (inputFocused) {
      if (errors) {
        return {
          class: "input-error",
          icon: CircleX,
          title: errors[0],
          color: "#d41976",
        };
      }
      return {
        class: "input-success",
        icon: CircleCheck,
        color: "#00ff00",
      };
    }
    return {
      class: "border border-primary-500",
      icon: Info,
      title: info,
    };
  });
</script>

<label class="label">
  <span class="label-text">{label}</span>
  <div class="input-group grid-cols-[auto_1fr_auto]">
    <input
      name={field}
      type="text"
      {placeholder}
      class="input {inputClassIconAndTitle.class}"
      oninput={value} />
    {#if true}
      {@const Icon = inputClassIconAndTitle.icon}
      {#key inputClassIconAndTitle.icon}
        {#if field === "xPlexToken"}
          <a
            href={PlexAuthTokenURL}
            target="_blank"
            in:fade
            title={inputClassIconAndTitle.title}>
            <Icon color={inputClassIconAndTitle.color} />
          </a>
        {:else}
          <!-- svelte-ignore a11y_missing_attribute -->
          <a
            in:fade
            title={inputClassIconAndTitle.title}>
            <Icon color={inputClassIconAndTitle.color} />
          </a>
        {/if}
      {/key}
    {/if}
  </div>
</label>

<style>
  a {
    display: flex;
    justify-content: end;
    align-items: center;
    margin-right: .75rem;
  }
</style>
