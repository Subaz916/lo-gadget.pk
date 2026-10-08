import { supabase, isConfigured } from './config.js'
import {
  mountChrome, qs, money, escapeHtml, discountPercent, assetUrl, icons,
  addToCart, toast, productCard, emptyState, deliveryEstimate, productUrl, bindQuickAdd
} from './store.js'

mountChrome('shop')

const loader = document.getElementById('loader')
const view = document.getElementById('product-view')
const notFound = document.getElementById('not-found')

let product = null
let images = []
let variantGroups = []
let selection = {}
let lastGroup = ''
let qtyInput = document.getElementById('qty')

document.getElementById('qty-minus').innerHTML = icons.minus
document.getElementById('qty-plus').innerHTML = icons.plus

function currentVariant() {
  const values = Object.values(selection)
  if (!values.length) return null
  const exact = product.product_variants.find((v) => v.value === selection[lastGroup])
  if (exact) return exact
  return product.product_variants.find((v) => values.includes(v.value)) || null
}

function availableStock() {
  const variant = currentVariant()
  return variant ? Number(variant.stock) : Number(product.stock)
}

function currentPrice() {
  const variant = currentVariant()
  return Number(product.price) + (variant ? Number(variant.price_adjustment) : 0)
}

function clampQty() {
  const max = Math.max(1, Math.min(99, availableStock()))
  qtyInput.max = max
  qtyInput.value = Math.min(Math.max(1, parseInt(qtyInput.value || '1', 10)), max)
  return Number(qtyInput.value)
}

function renderPrice() {
  const price = currentPrice()
  const percent = discountPercent(price, product.compare_price)
  document.getElementById('pd-price').textContent = money(price)
  const compare = document.getElementById('pd-compare')
  const off = document.getElementById('pd-off')
  compare.hidden = !product.compare_price
  off.hidden = !percent
  if (product.compare_price) compare.textContent = money(product.compare_price)
  if (percent) off.textContent = `-${percent}% off`
}

function renderBadges() {
  const stock = availableStock()
  const stockBadge = stock <= 0
    ? '<span class="badge-pill danger">Out of stock</span>'
    : stock <= 5
      ? `<span class="badge-pill warn">Only ${stock} left in stock</span>`
      : `<span class="badge-pill ok">In stock — ${stock} available</span>`

  document.getElementById('pd-badges').innerHTML = `
    ${stockBadge}
    <span class="badge-pill">${icons.cod} Cash on delivery</span>
    <span class="badge-pill">${icons.truck} Delivery ${deliveryEstimate()}</span>
    <span class="badge-pill">${icons.shield} 7-day replacement warranty</span>`
}

function renderOptions() {
  const el = document.getElementById('option-groups')
  if (!variantGroups.length) {
    el.innerHTML = ''
    return
  }
  el.innerHTML = variantGroups
    .map((group) => {
      const active = selection[group.name]
      const options = group.variants
        .map(
          (v) => `<button type="button" class="option ${active === v.value ? 'active' : ''}" data-group="${escapeHtml(group.name)}" data-value="${escapeHtml(v.value)}" ${v.stock <= 0 && active !== v.value ? 'disabled' : ''}>
            ${escapeHtml(v.value)}${Number(v.price_adjustment) > 0 ? ` (+${money(v.price_adjustment)})` : ''}
          </button>`
        )
        .join('')
      return `<div class="option-group"><h4>Choose <b>${escapeHtml(group.name.toLowerCase())}</b></h4><div class="option-list">${options}</div></div>`
    })
    .join('')
}

function renderGallery() {
  const main = document.getElementById('main-image')
  const thumbs = document.getElementById('thumbs')
  main.src = images[0] ? assetUrl(images[0].url) : assetUrl('')
  main.alt = product.name
  if (images.length <= 1) {
    thumbs.innerHTML = ''
    return
  }
  thumbs.innerHTML = images
    .map(
      (img, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-thumb="${index}">
        <img src="${assetUrl(img.url)}" alt="${escapeHtml(img.alt || product.name)}">
      </button>`
    )
    .join('')
}

function renderStockLine() {
  const stock = availableStock()
  const addBtn = document.getElementById('add-btn')
  const buyBtn = document.getElementById('buy-btn')
  addBtn.disabled = stock <= 0
  buyBtn.disabled = stock <= 0
  addBtn.textContent = stock <= 0 ? 'Out of stock' : 'Add to cart'
  clampQty()
}

function buildPayload() {
  const variant = currentVariant()
  return {
    product_id: product.id,
    variant_id: variant ? variant.id : null,
    name: product.name,
    variant_name: variant ? `${variant.name}: ${variant.value}` : '',
    price: currentPrice(),
    image: images[0]?.url || '',
    qty: clampQty(),
    stock: availableStock()
  }
}

function addToCartFlow(goCheckout) {
  if (availableStock() <= 0) return toast('This item is out of stock', 'error')
  for (const group of variantGroups) {
    if (!selection[group.name]) return toast(`Please choose a ${group.name.toLowerCase()}`, 'error')
  }
  addToCart(buildPayload())
  toast('Added to cart', 'ok')
  if (goCheckout) location.href = 'checkout.html'
}

async function loadRelated() {
  if (!product.category_id) return
  const el = document.getElementById('related')
  const { data } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(id, url, sort_order, is_primary), product_variants(id)')
    .eq('is_active', true)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .limit(4)
  if (!data?.length) {
    el.innerHTML = ''
    el.previousElementSibling?.classList.add('hidden')
    return
  }
  el.innerHTML = data.map(productCard).join('')
  bindQuickAdd(el)
}

async function loadProduct() {
  const id = qs('id')
  const slug = qs('slug')

  if (!isConfigured) {
    loader.classList.add('hidden')
    view.hidden = false
    document.getElementById('not-found').hidden = false
    document.querySelector('#not-found p').textContent = 'Add your Supabase keys in js/config.js to load products.'
    return
  }

  let query = supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(*), product_variants(*)')
    .eq('is_active', true)

  const { data, error } = id
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('slug', slug || '').maybeSingle()

  if (error || !data) {
    loader.classList.add('hidden')
    notFound.hidden = false
    return
  }

  product = data
  images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
  product.product_variants = [...(product.product_variants || [])].filter((v) => v.is_active)

  const grouped = {}
  for (const variant of product.product_variants) {
    grouped[variant.name] = grouped[variant.name] || []
    grouped[variant.name].push(variant)
  }
  variantGroups = Object.entries(grouped).map(([name, variants]) => ({ name, variants }))
  selection = {}
  lastGroup = ''
  for (const group of variantGroups) {
    const first = group.variants.find((v) => v.stock > 0) || group.variants[0]
    if (first) {
      selection[group.name] = first.value
      lastGroup = group.name
    }
  }

  document.title = `${product.name} — LOGADGET.PK`
  document.getElementById('pd-meta').textContent = [product.brand, product.categories?.name].filter(Boolean).join(' · ')
  document.getElementById('pd-title').textContent = product.name
  document.getElementById('pd-desc').textContent = product.description || product.short_description || ''
  document.getElementById('pd-tags').innerHTML = (product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')

  document.getElementById('breadcrumb').innerHTML = `
    <a href="index.html">Home</a><span>/</span>
    <a href="products.html">Shop</a><span>/</span>
    ${product.categories ? `<a href="products.html?cat=${encodeURIComponent(product.categories.slug)}">${escapeHtml(product.categories.name)}</a><span>/</span>` : ''}
    <strong style="color:var(--text)">${escapeHtml(product.name)}</strong>`

  renderGallery()
  renderOptions()
  renderPrice()
  renderBadges()
  renderStockLine()

  loader.classList.add('hidden')
  view.hidden = false
  loadRelated()
}

document.getElementById('thumbs').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-thumb]')
  if (!btn) return
  const index = Number(btn.dataset.thumb)
  document.getElementById('main-image').src = assetUrl(images[index].url)
  document.querySelectorAll('[data-thumb]').forEach((el) => el.classList.toggle('active', el === btn))
})

document.getElementById('option-groups').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-group]')
  if (!btn) return
  selection[btn.dataset.group] = btn.dataset.value
  lastGroup = btn.dataset.group
  renderOptions()
  renderPrice()
  renderBadges()
  renderStockLine()
})

document.getElementById('qty-minus').addEventListener('click', () => {
  qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1)
})
document.getElementById('qty-plus').addEventListener('click', () => {
  qtyInput.value = clampQty() + 1 <= Number(qtyInput.max) ? clampQty() + 1 : clampQty()
})
qtyInput.addEventListener('change', clampQty)

document.getElementById('add-btn').addEventListener('click', () => addToCartFlow(false))
document.getElementById('buy-btn').addEventListener('click', () => addToCartFlow(true))

loadProduct()
