<script lang="ts">
  import type { AddServerButtonsState, AddServerFormState, AddServerFormValues, AddServerValidationErrors, PlexPinApiResponse, PlexPollApiResponse, TestConnectionResponse } from "$lib/types";
  import type { ZodSafeParseResult } from "zod";

  import { goto } from "$app/navigation";
  import AddServerInput from "$lib/components/AddServerInput.svelte";
  import { insertServerSchema } from "$lib/schema";
  import { toaster } from "$lib/toaster";

  const AUTH_POLL_INTERVAL_MS = 1000;
  const AUTH_POLL_TIMEOUT_MS = 60000;

  // Form state
  const addServerFormState: AddServerFormState = $state({
    formValues: {
      serverName: "",
      hostname: "",
      port: 0,
      xPlexToken: "",
      clientIdentifier: "",
    },
    inputFocused: {
      serverName: false,
      hostname: false,
      port: false,
    },
    formUpdated: false,
  });

  // Plex auth state
  const authState: {
    authenticated: boolean;
    inProgress: boolean;
  } = $state({
    authenticated: false,
    inProgress: false,
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

    // Auth must be complete before testing
    if (!authState.authenticated) {
      return baseButtonsState;
    }

    if (testState.testPerformed && !testState.testInProgress) {
      if (testState.testSuccessful) {
        if (!addServerFormState.formUpdated) {
          baseButtonsState.testButton = {
            class: "preset-filled-success-500",
            disabled: true,
          };
          baseButtonsState.submitButton.disabled = false;
        }
        else {
          baseButtonsState.testButton = {
            class: "preset-filled-success-500",
            disabled: false,
          };
          baseButtonsState.submitButton.disabled = true;
        }
      }
      else {
        if (addServerFormState.formUpdated) {
          baseButtonsState.testButton = {
            class: "preset-filled-error-500",
            disabled: false,
          };
        }
        else {
          baseButtonsState.testButton = {
            class: "preset-filled-error-500",
            disabled: true,
          };
        }
      }
    }
    else if (
      Object.keys(formValidationErrors).length !== 0
      || !addServerFormState.formUpdated
      || testState.testInProgress
    ) {
    // Validation errors, untouched form, or test in progress -- keep test disabled
    }
    else {
      baseButtonsState.testButton.disabled = false;
    }

    return baseButtonsState;
  });

  // The server name/hostname/port fields need validation checks
  // but not xPlexToken or clientIdentifier since those come from OAuth
  const serverFieldsValid: boolean = $derived.by(() => {
    const errors = formValidationErrors;
    const hasServerNameError = !!errors.serverName;
    const hasHostnameError = !!errors.hostname;
    const hasPortError = !!errors.port;
    return !hasServerNameError && !hasHostnameError && !hasPortError && addServerFormState.formUpdated;
  });

  // Update form and validate
  function updateForm(field: keyof AddServerFormValues, value: string | number): void {
    addServerFormState.formUpdated = true;
    addServerFormState.formValues = {
      ...addServerFormState.formValues,
      [field]: value,
    };

    if (field in addServerFormState.inputFocused) {
      addServerFormState.inputFocused = {
        ...addServerFormState.inputFocused,
        [field]: true,
      };
    }
  }

  // Plex OAuth authentication flow
  async function authenticateWithPlex(): Promise<void> {
    authState.inProgress = true;
    authState.authenticated = false;

    try {
      // Step 1: Request a PIN from our API
      const pinResponse: Response = await fetch("/api/plex-auth/pin", {
        method: "POST",
      });

      if (!pinResponse.ok) {
        throw new Error("Failed to create Plex PIN");
      }

      const pinData: PlexPinApiResponse = await pinResponse.json();

      // Store the client identifier
      addServerFormState.formValues.clientIdentifier = pinData.clientId;

      // Step 2: Open Plex auth page in a new tab
      if (pinData.authUrl) {
        window.open(pinData.authUrl, "_blank");
      }

      // Step 3: Poll for authentication
      const token = await pollForToken(pinData.pinId, pinData.pinCode, pinData.clientId);

      if (token) {
        addServerFormState.formValues.xPlexToken = token;
        authState.authenticated = true;
        addServerFormState.formUpdated = true;
        toaster.create({
          title: "Authentication Successful",
          description: "You have been authenticated with Plex",
          type: "success",
        });
      }
      else {
        toaster.create({
          title: "Authentication Timed Out",
          description: "Please try again. You have 60 seconds to log in.",
          type: "error",
        });
      }
    }
    catch {
      toaster.create({
        title: "Authentication Error",
        description: "Failed to start Plex authentication",
        type: "error",
      });
    }
    finally {
      authState.inProgress = false;
    }
  }

  // Poll the server for the auth token
  async function pollForToken(pinId: number, pinCode: string, clientId: string): Promise<string | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < AUTH_POLL_TIMEOUT_MS) {
      const params = new URLSearchParams({
        pinId: String(pinId),
        pinCode,
        clientId,
      });

      const response: Response = await fetch(`/api/plex-auth/poll?${params.toString()}`);

      if (response.ok) {
        const data: PlexPollApiResponse = await response.json();
        if (data.authenticated && data.token) {
          return data.token;
        }
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, AUTH_POLL_INTERVAL_MS));
    }

    return null;
  }

  // Ensure our server can talk to the server defined by the user entered information
  async function testServer(): Promise<void> {
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
    addServerFormState.formUpdated = false;
  }

  // Send config to the db
  async function addServer(): Promise<void> {
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

        <!-- Plex Authentication -->
        <div class="form-field">
          <span class="label">
            <span class="label-text font-medium text-surface-700-300">Plex Authentication</span>
          </span>

          {#if authState.authenticated}
            <div class="flex items-center gap-3 p-3 rounded-lg border-2 border-success-500 bg-success-500/10">
              <span class="text-success-500 text-xl">&#10003;</span>
              <span class="text-success-500 font-medium">Authenticated with Plex</span>
            </div>
          {:else if authState.inProgress}
            <div class="flex items-center gap-3 p-3 rounded-lg border-2 border-warning-500 bg-warning-500/10">
              <div class="animate-spin h-5 w-5 border-2 border-warning-500 border-t-transparent rounded-full"></div>
              <span class="text-warning-500 font-medium">Waiting for authentication... Check your browser.</span>
            </div>
          {:else}
            <button
              type="button"
              disabled={!serverFieldsValid}
              onclick={authenticateWithPlex}
              class="btn preset-filled-primary-500 w-full"
            >
              Authenticate with Plex
            </button>
            {#if !serverFieldsValid}
              <p class="text-sm text-surface-500 mt-1">Fill in server details above first</p>
            {/if}
          {/if}
        </div>

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
              &#10003; Connected
            {:else if testState.testPerformed && !testState.testSuccessful}
              &#10007; Failed
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
  </div>
</div>
