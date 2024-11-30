<script lang="ts">
  import { insertServerSchema } from "$lib/schema";
  import type { ServerConfigFormState, ServerConfigInputState, ServerConfigValidationErrors, TestButtonClassAndDisabled } from "$lib/types";
  import AddServerInput from "$lib/components/AddServerInput.svelte";

  // Form state
  let hasFormUpdated: boolean = $state(false);

  let form: ServerConfigFormState = $state({
    serverName: "",
    hostname: "",
    port: 0,
    xPlexToken: "",
  });

  let inputFocused: ServerConfigInputState = $state({
    serverName: false,
    hostname: false,
    port: false,
    xPlexToken: false,
  });

  let errors: ServerConfigValidationErrors = $derived.by(() => {
    // Validate the form
    const validate =  insertServerSchema.safeParse(form);
    return validate.success ? {} : validate.error.flatten().fieldErrors;
  });

  // Test button state
  let testState = $state({
    testPerformed: false,
    testSuccessful: false,
  });

  let testButtonClassAndDisabled: TestButtonClassAndDisabled = $derived.by(() => {
    if (testState.testPerformed) {
      if (testState.testSuccessful) {
        return {
          class: "variant-filled-success",
          disabled: true,
        }
      } else {
        if (hasFormUpdated) {
          return {
            class: "variant-filled-error",
            disabled: false,
          }
        } else {
          return {
            class: "variant-filled-error",
            disabled: true,
          }
        }
      }
    } else if (Object.keys(errors).length !== 0 || !hasFormUpdated) {
      return {
        disabled: true,
      }
    } else {
      return {
        disabled: false,
      }
    }
  });

  // Update form and validate
  function updateForm(field: keyof ServerConfigFormState, value: string | number): void {
    hasFormUpdated = true;
    form = {
      ...form,
      [field]: value,
    };

    inputFocused = {
      ...inputFocused,
      [field]: true,
    };
  }

  // Ensure our server can talk to the server defined by the user entered information
  async function testServer() {
    testState.testPerformed = true;
    const response = await fetch(`/add-server/test-connection?hostname=${encodeURI(form.hostname)}&port=${form.port}&X-Plex-Token=${form.xPlexToken}`);
    const res = await response.json();
    testState.testSuccessful = res.connection;
    // Set hasFormUpdated to false, so on failure, the test button is disabled until input is modified
    hasFormUpdated = false;
  }

  // Send config to the db
  async function addServer() {
    const response = await fetch("/add-server", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const res = await response.json();
    console.log(res);
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
        {errors}
        {inputFocused}
        {updateForm}
        className="header"
        info="The URL of your plex server. Maybe localhost?"
      />
      
      <AddServerInput
        label="Port"
        placeholder="Port"
        field="port"
        type="number"
        {errors}
        {inputFocused}
        {updateForm}
        info="Typically 32400"
      />
      
      <AddServerInput
        label="X-Plex-Token"
        placeholder="X-Plex-Token"
        field="xPlexToken"
        {errors}
        {inputFocused}
        {updateForm}
        info="Click me to find out where to find this"
      />
      
      <AddServerInput
        label="Server Name"
        placeholder="Something memorable"
        field="serverName"
        {errors}
        {inputFocused}
        {updateForm}
        info="A memorable name for this server configuration. We may support more in the future"
      />
      </form>

      <div class="btn-group">
        <button 
          disabled={testButtonClassAndDisabled.disabled}
          onclick={testServer}
          class={testButtonClassAndDisabled.class}
        >
          Test
        </button>
        <button
          disabled={!(testState.testSuccessful && !hasFormUpdated)}
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
