<script lang="ts">
  import type { AddServerButtonsState, AddServerFormState, AddServerFormValues, AddServerValidationErrors } from "$lib/types";

  import AddServerInput from "$lib/components/AddServerInput.svelte";
  import { insertServerSchema } from "$lib/schema";

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
    const validate = insertServerSchema.safeParse(addServerFormState.formValues);
    return validate.success ? {} : validate.error.flatten().fieldErrors;
  });

  // Test button state
  const testState = $state({
    testPerformed: false,
    testSuccessful: false,
  });

  const buttonsState: AddServerButtonsState = $derived.by(() => {
    const baseButtonsState: AddServerButtonsState = {
      testButton: {
        class: "",
        disabled: true,
      },
      submitButton: {
        disabled: true,
      },
    };

    if (testState.testPerformed) {
      if (testState.testSuccessful) {
        // if we have a successful test and the form hasn't been
        // updated since then disable the test button and enabel the submit button
        if (!addServerFormState.formUpdated) {
          baseButtonsState.testButton = {
            class: "variant-filled-success",
            disabled: true,
          };
          baseButtonsState.submitButton.disabled = false;
        }
        else { // we ahve a successful test but the form was updated
          // enable the test button and disable the submit button
          baseButtonsState.testButton = {
            class: "variant-filled-success",
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
            class: "variant-filled-error",
            disabled: false,
          };
        }
        else { // The form hasn't been updated so disable the test button
          baseButtonsState.testButton = {
            class: "variant-filled-error",
            disabled: true,
          };
        }
      }
    // We haven't performed the test yet, but there are validation errors or
    // the form just hasn't been interacted with disable the test button and submit button
    }
    else if (Object.keys(formValidationErrors).length !== 0 || !addServerFormState.formUpdated) {
    // We haven't performed the test yet, but there are no validation errors
    // and the form has been interacted with enable the test button
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
    const response = await fetch(`/add-server/test-connection?hostname=${encodeURI(addServerFormState.formValues.hostname)}&port=${addServerFormState.formValues.port}&X-Plex-Token=${addServerFormState.formValues.xPlexToken}`);
    const res = await response.json();
    testState.testSuccessful = res.connection;
    // Set formUpdated to false, so the test button is disabled until input is modified
    addServerFormState.formUpdated = false;
  }

  // Send config to the db
  async function addServer() {
    const response = await fetch("/add-server", {
      method: "POST",
      body: JSON.stringify(addServerFormState.formValues),
    });

    const _responseJSON = await response.json();
  }
</script>

<div class="h-full flex justify-center items-center">
  <div class="space-y-10 flex">
    <div class="card p-6">
      <form method="POST">

        <AddServerInput
          label="Host"
          placeholder="Hostname"
          field="hostname"
          errors={formValidationErrors.hostname}
          inputFocused={addServerFormState.inputFocused.hostname}
          {updateForm}
          className="header"
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
      </form>

      <div class="btn-group">
        <button
          disabled={buttonsState.testButton.disabled}
          onclick={testServer}
          class={buttonsState.testButton.class}
        >
          Test
        </button>
        <button
          disabled={buttonsState.submitButton.disabled}
          onclick={addServer}
        >
          Submit
        </button>
      </div>
    </div>

  </div>
</div>

<style>
  .btn-group {
    margin-top: 2rem;
    float: right;
  }
/*
  button.disabled {
    pointer-events: none;
  }
  button.variant-filled-error {
    pointer-events: none;
  } */
</style>
