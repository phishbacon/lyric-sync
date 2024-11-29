<script lang="ts">
  import { fade } from "svelte/transition";
  import { CircleX, Info, SquareCheck, type Icon } from "lucide-svelte";
  import type { InpuClassIconAndTitle, ServerConfigFormState, ServerConfigInputState, ServerConfigValidationErrors } from "$lib/types";
  import { PlexAuthTokenURL } from "$lib/external-links";

  let { label, placeholder, field, type = "text", errors, inputFocused, className = "", updateForm, info }: {
    label: string,
    placeholder: string,
    field: keyof ServerConfigFormState,
    type?: "text" | "number",
    errors: ServerConfigValidationErrors,
    inputFocused: ServerConfigInputState,
    className?: string,
    info: string,
    updateForm: (field: keyof ServerConfigFormState, value: string | number) => void,
  } = $props();

  let value = $derived(type === "number" ?
    (e: Event) => updateForm(field, Number((e.target as HTMLInputElement).value)) :
    (e: Event) => updateForm(field, (e.target as HTMLInputElement).value)
  );

  let inputClassIconAndTitle: InpuClassIconAndTitle = $derived.by(() => {
    if (inputFocused[field]) {
      if (errors[field]) {
        return {
          class: "input-error",
          icon: CircleX,
          title: errors[field][0],
        };
      }
      return {
        class: "input-success",
        icon: SquareCheck,
      };
    }
    return {
      icon: Info,
      title: info
    };
  });
</script>

<label class="label {className}">
  <p>{label}</p>
  <div class="input-group input-group-divider grid-cols-[1fr_auto]">
    <input
      name="field"
      type="text" 
      {placeholder} 
      class="form-input {inputClassIconAndTitle.class}"
      oninput={value}/>
      {#if true}
        {@const Icon = inputClassIconAndTitle.icon}
        {#key inputClassIconAndTitle.icon}
          {#if field === "xPlexToken"}
            <a href="{PlexAuthTokenURL}" target="_blank" in:fade title="{inputClassIconAndTitle.title}"><Icon /></a> 
          {:else}
            <!-- svelte-ignore a11y_missing_attribute -->
            <a in:fade title="{inputClassIconAndTitle.title}"><Icon /></a> 
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