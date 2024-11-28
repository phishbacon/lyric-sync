<script lang="ts">
  import { fade } from "svelte/transition";
  import { CircleX } from "lucide-svelte";
  import type { Writable } from "svelte/store";

  export let label: string;
  export let placeholder: string;
  export let field: string;
  export let type: "text" | "number" = "text";
  export let errors: Writable<Record<string, string[]>>;
  export let inputFocused: Writable<Record<string, boolean>>;
  export let updateForm: (field: string, value: string | number) => void;

  $: value = type === "number" ?
    (e: Event) => updateForm(field, Number((e.target as HTMLInputElement).value)) :
    (e: Event) => updateForm(field, (e.target as HTMLInputElement).value)
</script>

<label class="label">
  <p>{label}</p>
  <div class="input-group input-group-divider grid-cols-[1fr_auto]">
    <input
      {type} 
      {placeholder} 
      class="form-input {$errors[field] && $inputFocused[field] ? 'input-error' : ''}" on:input={value}/>
    {#if $errors[field] && $inputFocused[field]}
      <!-- svelte-ignore a11y_missing_attribute -->
      <a transition:fade title="{$errors[field][0]}"><CircleX /></a> 
    {/if}
  </div>
</label>