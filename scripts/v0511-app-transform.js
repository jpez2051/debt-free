function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.11 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV0511(source){return replaceOrThrow(source,"const VERSION='0.5.10'","const VERSION='0.5.11'",'version')}
