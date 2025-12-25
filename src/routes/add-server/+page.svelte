<script lang="ts">
  import type { AddServerButtonsState, AddServerFormState, AddServerFormValues, AddServerValidationErrors, TestConnectionResponse } from "$lib/types";
  import type { ZodSafeParseResult } from "zod";

  import { goto } from "$app/navigation";
  import AddServerInput from "$lib/components/AddServerInput.svelte";
  import { insertServerSchema } from "$lib/schema";
  import { toaster } from "$lib/toaster";

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
    const validate: ZodSafeParseResult<AddServerFormValues> = insertServerSchema.safeParse(addServerFormState.formValues);
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
    const response: Response = await fetch("/add-server/test-connection", {
      method: "POST",
      body: JSON.stringify(addServerFormState.formValues),
    });
    const res: TestConnectionResponse = await response.json();
    testState.testSuccessful = res.connection;
    if (res.connection) {
      toaster.create({
        title: "Connection Success",
        description: res.message,
        type: "success",
      });
    }
    else {
      toaster.create({
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

<div class="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-surface-50-900 to-surface-100-800">
  <div class="w-full max-w-lg">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="h1 mb-3 text-surface-900-100">Add Plex Server</h1>
      <p class="text-surface-600-400 text-lg">
        Configure your Plex server connection to get started
      </p>
    </div>

    <!-- Form Card -->
    <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-8 shadow-xl">
      <form class="space-y-6">
        <!-- Server Name -->
        <AddServerInput
          label="Server Name"
          placeholder="My Plex Server"
          field="serverName"
          errors={formValidationErrors.serverName}
          inputFocused={addServerFormState.inputFocused.serverName}
          {updateForm}
          info="A memorable name for this server configuration"
        />

        <!-- Hostname -->
        <AddServerInput
          label="Hostname"
          placeholder="localhost"
          field="hostname"
          errors={formValidationErrors.hostname}
          inputFocused={addServerFormState.inputFocused.hostname}
          {updateForm}
          info="The URL of your Plex server (e.g., localhost, 192.168.1.100)"
        />

        <!-- Port -->
        <AddServerInput
          label="Port"
          placeholder="32400"
          field="port"
          errors={formValidationErrors.port}
          inputFocused={addServerFormState.inputFocused.port}
          {updateForm}
          info="Plex server port (typically 32400)"
        />

        <!-- X-Plex-Token -->
        <AddServerInput
          label="X-Plex-Token"
          placeholder="Your Plex token"
          field="xPlexToken"
          errors={formValidationErrors.xPlexToken}
          inputFocused={addServerFormState.inputFocused.xPlexToken}
          {updateForm}
          info="Click the info icon to learn how to get your Plex token"
        />

        <!-- Action Buttons -->
        <div class="flex gap-4 pt-6">
          <button
            type="button"
            disabled={buttonsState.testButton.disabled}
            onclick={testServer}
            class="btn flex-1 {buttonsState.testButton.class}"
          >
            {#if testState.testInProgress}
              <span class="loading loading-spinner loading-sm"></span>
              Testing...
            {:else if testState.testPerformed && testState.testSuccessful}
              ✓ Connected
            {:else if testState.testPerformed && !testState.testSuccessful}
              ✗ Failed
            {:else}
              Test Connection
            {/if}
          </button>

          <button
            type="button"
            disabled={buttonsState.submitButton.disabled}
            onclick={addServer}
            class="btn preset-filled-primary-500 flex-1"
          >
            Add Server
          </button>
        </div>
      </form>
    </div>

    <!-- Help Text -->
    <div class="text-center mt-6 text-sm text-surface-600-400">
      <p>
        Need help? Check
        <a href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
           target="_blank"
           rel="noopener noreferrer"
           class="text-primary-500 hover:text-primary-600 underline decoration-primary-400 hover:decoration-primary-500 transition-colors duration-200 font-medium">
          Plex documentation
        </a>
        on how to get your Plex token.
      </p>
    </div>
  </div>
</div>
