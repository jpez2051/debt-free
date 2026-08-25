function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.14 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV0514(source){return replaceOrThrow(source,"const VERSION='0.5.13'","const VERSION='0.5.14'",'version')}
