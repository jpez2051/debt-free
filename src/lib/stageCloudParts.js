// Timestamped parts enable retention. v0.12 owners may still have json-only rules.
export async function stageCloudParts(parts,{read,write,createdAt}){
  const entries=[...parts]
  async function missing(group){const pending=[];for(const [id,json] of group){const existing=await read(id);if(existing){if(existing.json!==json)throw Error('A cloud storage part failed verification.')}else pending.push([id,json])}return pending}
  for(let i=0;i<entries.length;i+=40){
    const pending=await missing(entries.slice(i,i+40));if(!pending.length)continue
    try{await write(new Map(pending.map(([id,json])=>[id,{json,createdAt:createdAt()}])))}
    catch(error){if(error.code!=='permission-denied')throw error;const retry=await missing(pending);if(retry.length)await write(new Map(retry.map(([id,json])=>[id,{json}])))}
  }
}
