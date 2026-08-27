export function transformAppV092(code) {
  if(!code.includes("const VERSION='0.9.1'"))throw new Error('v0.9.2 release anchor missing')
  return code.replace("const VERSION='0.9.1'","const VERSION='0.9.2'")
}
