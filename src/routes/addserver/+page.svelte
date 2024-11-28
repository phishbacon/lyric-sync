<script lang="ts">
  import { insertServerSchema } from "$lib/schema";
  import type { ServerConfigFormState, ServerConfigInputState, ServerConfigValidationErrors } from "$lib/types";
  import AddServerInput from "$lib/components/AddServerInput.svelte";

  // Form state
  let form: ServerConfigFormState = $state({
    serverName: "",
    url: "",
    port: 0,
    token: "",
  });

  let inputFocused: ServerConfigInputState = $state({
    serverName: false,
    url: false,
    port: false,
    token: false,
  });

  let errors: ServerConfigValidationErrors = $state({});

  // Update form and validate
  function updateForm(field: keyof ServerConfigFormState, value: string | number): void {
    form = {
      ...form,
      [field]: value,
    };

    inputFocused = {
      ...inputFocused,
      [field]: true,
    };
    // Validate the form
    const validate =  insertServerSchema.safeParse(form);
    errors = validate.success ? {} : validate.error.flatten().fieldErrors;
  }
</script>

<div class="h-full flex justify-center items-center">
  <div class="space-y-10 flex">
    <div class="card p-4">

      <AddServerInput
        label="Host"
        placeholder="Hostname"
        field="url"
        {errors}
        {inputFocused}
        {updateForm}
        className="header"
      />
      
      <AddServerInput
        label="Port"
        placeholder="Port"
        field="port"
        type="number"
        {errors}
        {inputFocused}
        {updateForm}
      />
      
      <AddServerInput
        label="X-Plex-Token"
        placeholder="X-Plex-Token"
        field="token"
        {errors}
        {inputFocused}
        {updateForm}
      />
      
      <AddServerInput
        label="Configuration Name"
        placeholder="Something memorable"
        field="serverName"
        {errors}
        {inputFocused}
        {updateForm}
      />

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
</style>
