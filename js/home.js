import { supabase, isConfigured } from './config.js'
import {
  mountChrome, productCard, skeletonCards, emptyState, icons, escapeHtml,
  fetchSettings, bindQuickAdd, siteUrl, money
} from './store.js'

mountChrome('home')

document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = icons[el.dataset.icon] || ''
})

const categoriesEl = document.getElementById('categories')
const featuredEl = document.getElementById('featured')
const latestEl = document.getElementById('latest')

async function loadCategories() {
  if (!isConfigured) {
    categoriesEl.innerHTML = emptyState('Connect Supabase to load categories', 'Run supabase/schema.sql and add your keys in js/config.js.')
    return
  }
  const { data, error } = await supabase.from('categories').select('*, products(count)').order('sort_order').order('name')
  if (error) {
    categoriesEl.innerHTML = emptyState('Could not load categories', error.message)
    return
  }
  if (!data?.length) {
    categoriesEl.innerHTML = emptyState('No categories yet', 'Add categories from the admin panel.')
    return
  }
  categoriesEl.innerHTML = data
    .map(
      (cat) => `<a class="cat-card" href="${siteUrl('products.html')}?cat=${encodeURIComponent(cat.slug)}">
        <div class="cat-icon">${icons.tag}</div>
        <h3>${escapeHtml(cat.name)}</h3>
        <p>${escapeHtml(cat.description || '')}</p>
        <p class="small" style="margin-top:10px;color:var(--accent);font-weight:700">${cat.products?.[0]?.count ?? 0} products</p>
      </a>`
    )
    .join('')
}

async function loadProducts(target, options) {
  target.innerHTML = skeletonCards(4)
  if (!isConfigured) {
    target.innerHTML = emptyState('Connect Supabase to load products', 'Add your project keys in js/config.js to see the catalogue.')
    return
  }
  let query = supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(id, url, sort_order, is_primary), product_variants(id)')
    .eq('is_active', true)
    .order(options.column, { ascending: options.ascending })
    .limit(options.limit)
  if (options.featured) query = query.eq('is_featured', true)
  const { data, error } = await query
  if (error) {
    target.innerHTML = emptyState('Could not load products', error.message)
    return
  }
  if (!data?.length) {
    target.innerHTML = emptyState('No products yet', 'Your catalogue is empty. Add products from the admin panel.')
    return
  }
  target.innerHTML = data.map(productCard).join('')
}

async function loadHero() {
  const tag = document.querySelector('[data-hero-tag]')
  if (!isConfigured) return
  const { data } = await supabase
    .from('products')
    .select('id, name, price, is_featured')
    .eq('is_active', true)
    .eq('is_featured', true)
    .limit(1)
    .maybeSingle()
  if (!data) return
  tag.hidden = false
  tag.href = siteUrl('product.html') + '?id=' + data.id
  tag.querySelector('[data-hero-name]').textContent = data.name
  tag.querySelector('[data-hero-price]').textContent = 'From ' + money(data.price)
}

async function loadStat() {
  if (!isConfigured) return
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
  if (count != null) document.querySelector('[data-stat="products"]').textContent = count + '+'
}

loadCategories()
loadProducts(featuredEl, { column: 'created_at', ascending: false, limit: 8, featured: true })
loadHero()
loadStat()
fetchSettings().then((settings) => {
  if (settings.whatsapp) document.getElementById('wa-cta').href = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '')
})
bindQuickAdd()
