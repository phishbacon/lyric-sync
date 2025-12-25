<script lang="ts">
  import type { AddServerFormValues, ClassIconAndTitle } from "$lib/types";

  import { CircleCheck, CircleX, Info } from "@lucide/svelte";
  import { PlexAuthTokenURL } from "$lib/external-links";
  import { fade } from "svelte/transition";

  const {
    label,
    placeholder,
    field,
    errors,
    inputFocused,
    updateForm,
    info,
  }: {
    label: string;
    placeholder: string;
    field: keyof AddServerFormValues;
    errors: string[] | undefined;
    inputFocused: boolean;
    info: string;
    updateForm: (
      field: keyof AddServerFormValues,
      value: string | number,
    ) => void;
  } = $props();

  const value = $derived(
    field === "port"
      ? (e: Event) =>
        updateForm(field, Number((e.target as HTMLInputElement).value))
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

<div class="form-field">
  <label class="label" for={field}>
    <span class="label-text font-medium text-surface-700-300">{label}</span>
  </label>

  <div class="input-wrapper">
    <input
      id={field}
      name={field}
      type="text"
      {placeholder}
      class="input {inputClassIconAndTitle.class} transition-all duration-200"
      oninput={value}
    />

    <div class="icon-container">
      {#if field === "xPlexToken"}
        <a
          href={PlexAuthTokenURL}
          target="_blank"
          rel="noopener noreferrer"
          title={inputClassIconAndTitle.title}
          class="icon-link"
        >
          {#key inputClassIconAndTitle.icon}
            <div in:fade={{ duration: 200 }}>
              <inputClassIconAndTitle.icon color={inputClassIconAndTitle.color} />
            </div>
          {/key}
        </a>
      {:else}
        {#key inputClassIconAndTitle.icon}
          <div
            title={inputClassIconAndTitle.title}
            in:fade={{ duration: 200 }}
            class="icon-display"
          >
            <inputClassIconAndTitle.icon color={inputClassIconAndTitle.color} />
          </div>
        {/key}
      {/if}
    </div>
  </div>
</div>

<style>
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 3rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: var(--color-surface-50-900);
    border: 2px solid var(--color-surface-200-800);
    transition: all 0.2s ease;
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-500/10);
  }

  .input-error {
    border-color: var(--color-error-500);
    box-shadow: 0 0 0 3px var(--color-error-500/10);
  }

  .input-success {
    border-color: var(--color-success-500);
    box-shadow: 0 0 0 3px var(--color-success-500/10);
  }

  .icon-container {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
  }

  .icon-container :global(svg) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .icon-link {
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    text-decoration: none;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }

  .icon-link:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }

  .icon-display {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
