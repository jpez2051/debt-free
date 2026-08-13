function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.6 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV056(source){return replaceOrThrow(source,"const VERSION='0.5.5'","const VERSION='0.5.6'",'version')}
