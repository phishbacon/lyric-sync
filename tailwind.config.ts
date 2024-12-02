import type { Config } from "tailwindcss";

// 1. Import the Skeleton plugin
import { contentPath, skeleton } from "@skeletonlabs/skeleton/plugin";
import * as themes from "@skeletonlabs/skeleton/themes";
import forms from "@tailwindcss/forms";

export default {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    contentPath(import.meta.url, "svelte"),
  ],
  theme: {
    extend: {},
  },
  plugins: [
    forms,
    skeleton({
      // NOTE: each theme included will be added to your CSS bundle
      themes: [themes.wintry],
    }),
  ],
} satisfies Config;
