function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.17 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV0517(source){return replaceOrThrow(source,"const VERSION='0.5.16'","const VERSION='0.5.17'",'version')}
