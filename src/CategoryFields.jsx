import { CATEGORY_GROUPS, categorySelection, categorySubcategories } from './lib/categories.js'

export default function CategoryFields({category,subcategory,onChange}){
  const selected=categorySelection({category,subcategory}),standard=categorySubcategories(selected.category),subcategories=standard.includes(selected.subcategory)?standard:[selected.subcategory,...standard]
  const changeCategory=next=>onChange(next,categorySubcategories(next)[0])
  return <div className="category-fields"><label>Main category<select value={selected.category} onChange={event=>changeCategory(event.target.value)}>{CATEGORY_GROUPS.map(group=><option key={group.name}>{group.name}</option>)}</select></label><label>Subcategory<select value={selected.subcategory} onChange={event=>onChange(selected.category,event.target.value)}>{subcategories.map(item=><option key={item}>{item}</option>)}</select></label></div>
}
