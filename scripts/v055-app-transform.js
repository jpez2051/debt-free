function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.5 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV055(source){let code=source
return code}
