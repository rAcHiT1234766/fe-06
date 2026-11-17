import { defineMain } from '@storybook/react-vite/node';

export default defineMain({
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    // The package's own vite.config.ts is a library build; Storybook only needs the React plugin.
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  core: { disableTelemetry: true },
});
