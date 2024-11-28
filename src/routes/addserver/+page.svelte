<script lang="ts">
  import { insertServerSchema } from "$lib/schema";
  import { writable, type Writable } from "svelte/store";
  import { z } from "zod";
  import { fade } from "svelte/transition";
  import { CircleX } from "lucide-svelte";
  import AddServerInput from "$lib/components/AddServerInput.svelte";

  // Form state
  type FormState = z.infer<typeof insertServerSchema>

  type ValidationErrors = Partial<Record<keyof FormState, string[]>>;

  type InputState = Record<keyof FormState, boolean>;

  let form: Writable<FormState> = writable({
    serverName: "",
    url: "",
    port: 0,
    token: "",
  });

  let inputFocused: Writable<InputState> = writable({
    serverName: false,
    url: false,
    port: false,
    token: false,
  });

  let errors: Writable<ValidationErrors> = writable({});

  // Update form and validate
  function updateForm(field: keyof FormState, value: string | number): void {
    form.update((currentFormState) => {
      const updatedFormState = { 
        ...currentFormState,
        [field]: value,
      };

      inputFocused.update((currentInputState) => {
        return {
          ...currentInputState,
          [field]: true,
        }
      });

      // Validate the form
      const result = insertServerSchema.safeParse(updatedFormState);
      errors.set(
        result.success ? {} : result.error.flatten().fieldErrors
      );

      return updatedFormState;
    });
  }
</script>

<div class="h-full flex justify-center items-center">
  <div class="space-y-10 flex">
    <div class="card p-4">

      <label class="label header">
        <p>Host</p>
        <div class="input-group input-group-divider grid-cols-[1fr_auto]">
          <input type="text" placeholder="Hostname" class="form-input {$errors.url && $inputFocused.url ? 'input-error' : ''}" on:input={(e) => updateForm("url", (e.target as HTMLInputElement).value)}/>
          {#if $errors.url && $inputFocused.url}
            <!-- svelte-ignore a11y_missing_attribute -->
            <a transition:fade title="{$errors.url[0]}"><CircleX /></a> 
          {/if}
        </div>
      </label>
      <label class="label">
        <p>Port</p>
        <div class="input-group input-group-divider grid-cols-[1fr_auto]">
          <input type="text" placeholder="Port" class="form-input {$errors.port && $inputFocused.port ? 'input-error' : ''}" on:input={(e) => updateForm("port", Number((e.target as HTMLInputElement).value))}/>
          {#if $errors.port && $inputFocused.port}
            <!-- svelte-ignore a11y_missing_attribute -->
            <a transition:fade title="{$errors.port[0]}"><CircleX /></a> 
          {/if}
        </div>
      </label>
      <label class="label">
        <p>X-Plex-Token</p>
        <div class="input-group input-group-divider grid-cols-[1fr_auto]">
          <input type="text" placeholder="X-Plex-Token" class="form-input {$errors.token && $inputFocused.token ? 'input-error' : ''}" on:input={(e) => updateForm("token", (e.target as HTMLInputElement).value)}/>
          {#if $errors.token && $inputFocused.token}
            <!-- svelte-ignore a11y_missing_attribute -->
            <a transition:fade title="{$errors.token[0]}"><CircleX /></a> 
          {/if}
        </div>
      </label>
      <label class="label">
        <p>Configuration Name</p>
        <div class="input-group input-group-divider grid-cols-[1fr_auto]">
          <input type="text" placeholder="Something memorable" class="form-input {$errors.serverName && $inputFocused.serverName ? 'input-error' : ''}" on:input={(e) => updateForm("serverName", (e.target as HTMLInputElement).value)}/>
          {#if $errors.serverName && $inputFocused.serverName}
            <!-- svelte-ignore a11y_missing_attribute -->
            <a transition:fade title="{$errors.serverName[0]}"><CircleX /></a> 
          {/if}
        </div>
      </label>
      <div class="btn-group variant-filled-primary">
        <button>Test</button>
        <button disabled>Submit</button>
      </div>
    </div>

  </div>
</div>

<style>
  .btn-group {
    margin-top: 2rem;
    float: right;
  }

  label:not(.header) > p {
    margin-top: 1rem;
  }
</style>