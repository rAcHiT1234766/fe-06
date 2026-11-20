// The host's bundler replaces this at build time, the same convention React relies on. Declaring it
// here keeps the browser source independent of Node's types.
declare const process: { env: { NODE_ENV?: string } };

/** Whether this is a production build, which leaves out the warnings meant for developers. */
export const isProduction = () => process.env.NODE_ENV === 'production';
