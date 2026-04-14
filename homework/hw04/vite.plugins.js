// This vite plugin appends the proxy server for the production build.
// Not a great idea for production, but OK for now:

export function appendProxyUrl(proxyUrl) {
    return {
        name: "append-proxy-url",
        enforce: "post", // Run after Vite’s default plugins
        generateBundle(options, bundle) {
            for (const file in bundle) {
                if (bundle[file].type === "chunk") {
                    // Modify each JavaScript chunk
                    let code = bundle[file].code;
                    code = code.replace(/(["'`])\/api\//g, `$1${proxyUrl}/`);

                    // Update the bundle with modified code
                    bundle[file].code = code;
                }
            }
        },
    };
}
