export const MAX_DESCRIPTION_LENGTH=500
export function expenseDescription(value){
 if(value===undefined||value===null)return ''
 if(typeof value!=='string'||value.length>MAX_DESCRIPTION_LENGTH)throw Error('Describe the expense using no more than 500 characters.')
 return value.trim()
}
