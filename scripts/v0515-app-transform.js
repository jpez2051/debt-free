function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.15 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV0515(source){return replaceOrThrow(source,"const VERSION='0.5.14'","const VERSION='0.5.15'",'version')}
