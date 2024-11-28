<script lang="ts">
  import { fade } from "svelte/transition";
  import { CircleX } from "lucide-svelte";
  import type { ServerConfigFormState, ServerConfigInputState, ServerConfigValidationErrors } from "$lib/types";

  let { label, placeholder, field, type = "text", errors, inputFocused, className = "", updateForm }: {
    label: string,
    placeholder: string,
    field: keyof ServerConfigFormState,
    type?: "text" | "number",
    errors: ServerConfigValidationErrors,
    inputFocused: ServerConfigInputState,
    className?: string,
    updateForm: (field: keyof ServerConfigFormState, value: string | number) => void,
  } = $props();

  let value = $derived(type === "number" ?
    (e: Event) => updateForm(field, Number((e.target as HTMLInputElement).value)) :
    (e: Event) => updateForm(field, (e.target as HTMLInputElement).value)
  );
</script>

<label class="label {className}">
  <p>{label}</p>
  <div class="input-group input-group-divider grid-cols-[1fr_auto]">
    <input
      type="text" 
      {placeholder} 
      class="form-input {errors[field] && inputFocused[field] ? 'input-error' : ''}" oninput={value}/>
    {#if errors[field] && inputFocused[field]}
      <!-- svelte-ignore a11y_missing_attribute -->
      <a transition:fade title="{errors[field][0]}"><CircleX /></a> 
    {/if}
  </div>
</label>

<style>
  label:not(.header) > p {
    margin-top: 1rem;
  }
</style>