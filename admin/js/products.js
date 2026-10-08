import {
  requireAdmin, supabase, money, escapeHtml, assetUrl, icons, toast,
  confirmDialog, emptyRow, statusBadge
} from './admin.js'

const rowsEl = document.getElementById('rows')
const searchEl = document.getElementById('search')
const catEl = document.getElementById('filter-cat')
const statusEl = document.getElementById('filter-status')
const countEl = document.getElementById('row-count')

let products = []
let categories = []
let timer

async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name')
  categories = data || []
  catEl.innerHTML = '<option value="">All categories</option>' +
    categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')
}

async function loadProducts() {
  rowsEl.innerHTML = `<tr><td colspan="6"><div class="sk" style="height:60px"></div></td></tr>`

  let query = supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(url, sort_order, is_primary)')
    .order('created_at', { ascending: false })

  const term = searchEl.value.trim().replace(/[(),%_]/g, ' ')
  if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`)
  if (catEl.value) query = query.eq('category_id', catEl.value)
  if (statusEl.value === 'active') query = query.eq('is_active', true)
  if (statusEl.value === 'inactive') query = query.eq('is_active', false)
  if (statusEl.value === 'low') query = query.lte('stock', 5)

  const { data, error } = await query.limit(200)

  if (error) {
    rowsEl.innerHTML = emptyRow(6, 'Could not load products', error.message)
    return
  }

  products = data || []
  render()
}

function render() {
  countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`

  if (!products.length) {
    rowsEl.innerHTML = emptyRow(6, 'No products found', 'Add your first product to the catalogue.')
    return
  }

  rowsEl.innerHTML = products
    .map((product) => {
      const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
      const image = images.find((img) => img.is_primary) || images[0]
      const stockClass = product.stock <= 0 ? 'color:var(--danger)' : product.stock <= 5 ? 'color:var(--warn)' : ''
      return `<tr data-id="${product.id}">
        <td>
          <div class="cell-flex">
            <div class="thumb-sm"><img src="${assetUrl(image?.url)}" alt=""></div>
            <div>
              <div class="cell-main">${escapeHtml(product.name)}</div>
              <div class="cell-sub">${escapeHtml(product.brand || product.sku || '')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(product.categories?.name || '—')}</td>
        <td class="num">
          <div class="cell-main">${money(product.price)}</div>
          ${product.compare_price ? `<div class="cell-sub" style="text-decoration:line-through">${money(product.compare_price)}</div>` : ''}
        </td>
        <td class="num cell-main" style="${stockClass}">${product.stock}</td>
        <td><button type="button" class="status ${product.is_active ? 'active' : 'inactive'}" data-toggle style="cursor:pointer;border:1px solid currentColor">${product.is_active ? 'active' : 'inactive'}</button></td>
        <td>
          <div class="row-actions">
            <a class="btn btn-ghost btn-sm" href="product-form.html?id=${product.id}">Edit</a>
            <button class="btn btn-danger btn-sm" type="button" data-delete>${icons.trash}</button>
          </div>
        </td>
      </tr>`
    })
    .join('')
}

async function deleteProduct(id) {
  const product = products.find((p) => p.id === id)
  const ok = await confirmDialog(`Delete "${product?.name}"? This also removes its images and variants.`, 'Delete product')
  if (!ok) return

  const { data: images } = await supabase.from('product_images').select('url').eq('product_id', id)
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return toast(error.message, 'error')

  await Promise.all(
    (images || []).map((image) => {
      const match = image.url.match(/product-images\/(.+)$/)
      if (!match) return null
      return supabase.storage.from('product-images').remove([match[1]])
    })
  )

  toast('Product deleted', 'ok')
  loadProducts()
}

rowsEl.addEventListener('click', async (event) => {
  const row = event.target.closest('[data-id]')
  if (!row) return
  const id = row.dataset.id

  if (event.target.closest('[data-delete]')) {
    deleteProduct(id)
    return
  }

  if (event.target.closest('[data-toggle]')) {
    const product = products.find((p) => p.id === id)
    const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', id)
    if (error) return toast(error.message, 'error')
    toast(product.is_active ? 'Product hidden' : 'Product published', 'ok')
    loadProducts()
  }
})

searchEl.addEventListener('input', () => {
  clearTimeout(timer)
  timer = setTimeout(loadProducts, 300)
})
catEl.addEventListener('change', loadProducts)
statusEl.addEventListener('change', loadProducts)

const ctx = await requireAdmin('products', 'Products')
if (ctx) {
  await loadCategories()
  loadProducts()
}
