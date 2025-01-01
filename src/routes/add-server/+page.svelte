<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";
  import type { AddServerButtonsState, AddServerFormState, AddServerFormValues, AddServerValidationErrors, TestConnectionResponse } from "$lib/types";
  import type { SafeParseReturnType } from "zod";

  import { goto } from "$app/navigation";
  import AddServerInput from "$lib/components/AddServerInput.svelte";
  import { insertServerSchema } from "$lib/schema";
  import { getContext } from "svelte";

  export const toast: ToastContext = getContext("toast");

  // Form state
  const addServerFormState: AddServerFormState = $state({
    formValues: {
      serverName: "",
      hostname: "",
      port: 0,
      xPlexToken: "",
    },
    inputFocused: {
      serverName: false,
      hostname: false,
      port: false,
      xPlexToken: false,
    },
    formUpdated: false,
  });

  const formValidationErrors: AddServerValidationErrors = $derived.by(() => {
    // Validate the form
    const validate: SafeParseReturnType<AddServerFormValues, AddServerFormValues> = insertServerSchema.safeParse(addServerFormState.formValues);
    return validate.success ? {} : validate.error.flatten().fieldErrors;
  });

  // Test button state
  const testState: Record<string, boolean> = $state({
    testPerformed: false,
    testSuccessful: false,
    testInProgress: false,
  });

  const buttonsState: AddServerButtonsState = $derived.by(() => {
    const baseButtonsState: AddServerButtonsState = {
      testButton: {
        class: "preset-outlined-primary-500",
        disabled: true,
      },
      submitButton: {
        disabled: true,
      },
    };

    if (testState.testPerformed && !testState.testInProgress) {
      if (testState.testSuccessful) {
        // if we have a successful test and the form hasn't been
        // updated since then disable the test button and enabel the submit button
        if (!addServerFormState.formUpdated) {
          baseButtonsState.testButton = {
            class: "preset-filled-success-500",
            disabled: true,
          };
          baseButtonsState.submitButton.disabled = false;
        }
        else { // we ahve a successful test but the form was updated
          // enable the test button and disable the submit button
          baseButtonsState.testButton = {
            class: "preset-filled-success-500",
            disabled: false,
          };
          baseButtonsState.submitButton.disabled = true;
        }
      }
      else { // Our test failed
        // If the form has been updated, enable the test button
        // so we can test again
        if (addServerFormState.formUpdated) {
          baseButtonsState.testButton = {
            class: "preset-filled-error-500",
            disabled: false,
          };
        }
        else { // The form hasn't been updated so disable the test button
          baseButtonsState.testButton = {
            class: "preset-filled-error-500",
            disabled: true,
          };
        }
      }
    }
    else if (Object.keys(formValidationErrors).length !== 0 || !addServerFormState.formUpdated || testState.testInProgress) {
    // We haven't performed the test yet, but there are validation errors or we're in the process of testing the connection
    // or the form hasn't been interacted with disable the test button
    }
    else {
      baseButtonsState.testButton.disabled = false;
    }

    return baseButtonsState;
  });

  // Update form and validate
  function updateForm(field: keyof AddServerFormValues, value: string | number): void {
    addServerFormState.formUpdated = true;
    addServerFormState.formValues = {
      ...addServerFormState.formValues,
      [field]: value,
    };

    addServerFormState.inputFocused = {
      ...addServerFormState.inputFocused,
      [field]: true,
    };
  }

  // Ensure our server can talk to the server defined by the user entered information
  async function testServer() {
    testState.testPerformed = true;
    testState.testInProgress = true;
    const response: Response = await fetch(`/add-server/test-connection?hostname=${encodeURI(addServerFormState.formValues.hostname)}&port=${addServerFormState.formValues.port}&X-Plex-Token=${addServerFormState.formValues.xPlexToken}`);
    const res: TestConnectionResponse = await response.json();
    testState.testSuccessful = res.connection;
    if (res.connection) {
      toast.create({
        title: "Connection Success",
        description: res.message,
        type: "success",
      });
    }
    else {
      toast.create({
        title: "Connection Error",
        description: res.message,
        type: "error",
      });
    }
    testState.testInProgress = false;
    // Set formUpdated to false, so the test button is disabled until input is modified
    addServerFormState.formUpdated = false;
  }

  // Send config to the db
  async function addServer() {
    const response: Response = await fetch("/add-server", {
      method: "POST",
      body: JSON.stringify(addServerFormState.formValues),
    });

    if (response.ok) {
      goto("/select-library", { invalidateAll: true });
    }
  }
</script>

<div class="p-24 container h-full mx-auto flex justify-center items-center">
  <form class="card border-[1px] border-surface-200-800 preset-filled-surface-100-900 w-full max-w-md space-y-4 p-4">
    <fieldset class="space-y-4">
      <AddServerInput
        label="Host"
        placeholder="Hostname"
        field="hostname"
        errors={formValidationErrors.hostname}
        inputFocused={addServerFormState.inputFocused.hostname}
        {updateForm}
        info="The URL of your plex server. Maybe localhost?"
      />

      <AddServerInput
        label="Port"
        placeholder="Port"
        field="port"
        type="number"
        errors={formValidationErrors.port}
        inputFocused={addServerFormState.inputFocused.port}
        {updateForm}
        info="Typically 32400"
      />

      <AddServerInput
        label="X-Plex-Token"
        placeholder="X-Plex-Token"
        field="xPlexToken"
        errors={formValidationErrors.xPlexToken}
        inputFocused={addServerFormState.inputFocused.xPlexToken}
        {updateForm}
        info="Click me to find out where to find this"
      />

      <AddServerInput
        label="Server Name"
        placeholder="Something memorable"
        field="serverName"
        errors={formValidationErrors.serverName}
        inputFocused={addServerFormState.inputFocused.serverName}
        {updateForm}
        info="A memorable name for this server configuration. We may support more in the future"
      />
    </fieldset>

    <fieldset class="flex justify-end">
      <button
        type="button"
        disabled={buttonsState.testButton.disabled}
        onclick={testServer}
        class="btn {buttonsState.testButton.class}"
      >
        Test
      </button>
      <button
        type="button"
        disabled={buttonsState.submitButton.disabled}
        onclick={addServer}
        class="btn margin-left preset-outlined-primary-500"
      >
        Submit
      </button>
    </fieldset>
  </form>
</div>

<style>
  .btn-group {
    margin-top: 2rem;
    float: right;
  }
  .margin-left {
    margin-left: 0.5rem;
  }
</style>
