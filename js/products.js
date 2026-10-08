import { supabase, isConfigured } from './config.js'
import {
  mountChrome, productCard, skeletonCards, emptyState, qs, escapeHtml, bindQuickAdd
} from './store.js'

mountChrome('shop')

const grid = document.getElementById('grid')
const search = document.getElementById('search')
const sort = document.getElementById('sort')
const inStock = document.getElementById('in-stock')
const chipsEl = document.getElementById('cat-chips')
const countEl = document.getElementById('result-count')
const clearBtn = document.getElementById('clear-filters')
const titleEl = document.getElementById('page-title')
const subEl = document.getElementById('page-sub')

const state = {
  q: qs('q', '') || '',
  cat: qs('cat', '') || '',
  sort: qs('sort', '') || 'new',
  featured: qs('featured') === '1',
  stock: false
}

search.value = state.q
sort.value = ['new', 'price-asc', 'price-desc', 'name', 'featured'].includes(state.sort) ? state.sort : 'new'

let categories = []
let debounceTimer

function syncUrl() {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.cat) params.set('cat', state.cat)
  if (state.sort !== 'new') params.set('sort', state.sort)
  if (state.featured) params.set('featured', '1')
  const query = params.toString()
  history.replaceState(null, '', location.pathname + (query ? '?' + query : ''))
}

function hasFilters() {
  return Boolean(state.q || state.cat || state.stock || state.featured)
}

function renderChips() {
  const all = [{ slug: '', name: 'All' }, ...categories]
  chipsEl.innerHTML = all
    .map(
      (cat) => `<button type="button" class="chip ${state.cat === cat.slug ? 'active' : ''}" data-cat="${escapeHtml(cat.slug)}">${escapeHtml(cat.name)}</button>`
    )
    .join('')
  if (state.featured) {
    chipsEl.innerHTML += '<button type="button" class="chip active" data-cat="__featured">Featured</button>'
  }
}

function applyHeading() {
  if (state.featured) {
    titleEl.textContent = 'Featured products'
    subEl.textContent = 'Our team picks of the store.'
    return
  }
  const cat = categories.find((c) => c.slug === state.cat)
  if (state.q) {
    titleEl.textContent = `Results for "${state.q}"`
    subEl.textContent = 'Products matching your search.'
  } else if (cat) {
    titleEl.textContent = cat.name
    subEl.textContent = cat.description || `All products in ${cat.name}.`
  } else {
    titleEl.textContent = 'All products'
    subEl.textContent = 'Browse the full LOGADGET.PK catalogue.'
  }
}

async function loadCategories() {
  if (!isConfigured) return
  const { data } = await supabase.from('categories').select('*').order('sort_order').order('name')
  categories = data || []
  renderChips()
}

async function loadProducts() {
  clearBtn.hidden = !hasFilters()
  applyHeading()
  syncUrl()

  if (!isConfigured) {
    grid.innerHTML = emptyState('Connect Supabase to load products', 'Add your project URL and anon key in js/config.js.')
    countEl.textContent = 'Not connected'
    return
  }

  grid.innerHTML = skeletonCards(8)
  countEl.textContent = 'Loading products...'

  let query = supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(id, url, sort_order, is_primary), product_variants(id)')
    .eq('is_active', true)

  if (state.featured) query = query.eq('is_featured', true)

  if (state.cat) {
    const cat = categories.find((c) => c.slug === state.cat)
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (state.stock) query = query.gt('stock', 0)

  const clean = state.q.replace(/[(),%_]/g, ' ').trim()
  if (clean) query = query.or(`name.ilike.%${clean}%,description.ilike.%${clean}%,brand.ilike.%${clean}%,sku.ilike.%${clean}%`)

  if (state.sort === 'price-asc') query = query.order('price', { ascending: true })
  else if (state.sort === 'price-desc') query = query.order('price', { ascending: false })
  else if (state.sort === 'name') query = query.order('name', { ascending: true })
  else if (state.sort === 'featured') query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data, error } = await query.limit(60)

  if (error) {
    grid.innerHTML = emptyState('Something went wrong', error.message)
    countEl.textContent = 'Error loading products'
    return
  }

  if (!data?.length) {
    grid.innerHTML = emptyState(
      'No products found',
      'Try a different keyword or clear the filters.',
      '<button class="btn btn-ghost" type="button" id="empty-clear">Clear filters</button>'
    )
    document.getElementById('empty-clear')?.addEventListener('click', resetFilters)
    countEl.textContent = '0 products'
    return
  }

  grid.innerHTML = data.map(productCard).join('')
  countEl.textContent = `${data.length} product${data.length === 1 ? '' : 's'}${state.q ? ` for "${state.q}"` : ''}`
}

function resetFilters() {
  state.q = ''
  state.cat = ''
  state.stock = false
  state.featured = false
  state.sort = 'new'
  search.value = ''
  sort.value = 'new'
  inStock.checked = false
  renderChips()
  loadProducts()
}

search.addEventListener('input', () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    state.q = search.value.trim()
    loadProducts()
  }, 320)
})

sort.addEventListener('change', () => {
  state.sort = sort.value
  loadProducts()
})

inStock.addEventListener('change', () => {
  state.stock = inStock.checked
  loadProducts()
})

chipsEl.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-cat]')
  if (!chip) return
  if (chip.dataset.cat === '__featured') {
    state.featured = false
  } else {
    state.cat = chip.dataset.cat
    state.featured = false
  }
  renderChips()
  loadProducts()
})

clearBtn.addEventListener('click', resetFilters)

bindQuickAdd()
loadCategories().then(loadProducts)
