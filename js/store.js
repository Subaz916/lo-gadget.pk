import { supabase, isConfigured } from './config.js'

export const icons = {
  cart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5.5 5.5L20 7"/></svg>',
  truck: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  cod: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>',
  support: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a3 3 0 0 1-3 3h-3"/></svg>',
  box: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
  tag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2.5 2.5 0 0 0 0 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2.5 2.5 0 0 0 0-5z"/><path d="M14 5.5v13" stroke-dasharray="2 3"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c2.2.7 3.5 2.5 3.5 5.2"/></svg>',
  grid: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 1 1 6.98 3.86zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z"/></svg>'
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function money(amount) {
  const n = Number(amount || 0)
  return 'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n)
}

export function qs(name, fallback = null) {
  return new URLSearchParams(location.search).get(name) ?? fallback
}

export function discountPercent(price, compare) {
  if (!compare || compare <= price) return 0
  return Math.round(((compare - price) / compare) * 100)
}

export function assetUrl(url) {
  if (!url) return siteUrl('assets/ph-1.svg')
  if (/^(https?:|data:|blob:)/.test(url)) return url
  return siteUrl(url)
}

export function siteUrl(path) {
  const base = location.pathname.includes('/admin/') ? '../' : ''
  return base + path
}

export function primaryImage(product) {
  const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
  const chosen = images.find((img) => img.is_primary) || images[0]
  return assetUrl(chosen?.url)
}

export function productUrl(product) {
  return siteUrl('product.html') + '?id=' + encodeURIComponent(product.id)
}

let toastTimer
export function toast(message, type = 'info') {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.dataset.type = type
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800)
}

export function configNotice() {
  if (isConfigured || document.getElementById('config-notice')) return
  const el = document.createElement('div')
  el.id = 'config-notice'
  el.className = 'config-notice'
  el.innerHTML =
    'Supabase is not configured yet. Open <code>js/config.js</code> and add your project URL + anon key, then run <code>supabase/schema.sql</code> in the Supabase SQL editor. <button type="button" data-dismiss>Dismiss</button>'
  el.querySelector('[data-dismiss]').onclick = () => el.remove()
  document.body.appendChild(el)
}

export const CART_KEY = 'lg_cart'

export function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  updateCartBadge()
  window.dispatchEvent(new CustomEvent('cart:changed'))
}

export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0)
}

export function cartSubtotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0)
}

export function addToCart(item) {
  const cart = getCart()
  const key = item.product_id + ':' + (item.variant_id || '')
  const existing = cart.find((row) => row.key === key)
  const max = Number(item.stock ?? 100)
  if (existing) {
    existing.qty = Math.min(existing.qty + item.qty, max)
  } else {
    cart.push({ ...item, key, qty: Math.min(item.qty, max) })
  }
  saveCart(cart)
  return key
}

export function setCartQty(key, qty) {
  const cart = getCart()
  const row = cart.find((item) => item.key === key)
  if (!row) return
  row.qty = Math.max(1, Math.min(qty, Number(row.stock ?? 100)))
  saveCart(cart)
}

export function removeFromCart(key) {
  saveCart(getCart().filter((item) => item.key !== key))
}

export function clearCart() {
  saveCart([])
}

export function updateCartBadge() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = count
    el.hidden = count === 0
  })
}

let settingsCache = null

export async function fetchSettings(force = false) {
  if (settingsCache && !force) return settingsCache
  const local = localStorage.getItem('lg_settings')
  if (local && !force) {
    try { settingsCache = JSON.parse(local) } catch { settingsCache = null }
  }
  if (isConfigured) {
    const { data, error } = await supabase.from('store_settings').select('*').eq('id', true).single()
    if (!error && data) {
      settingsCache = data
      localStorage.setItem('lg_settings', JSON.stringify(data))
    }
  }
  return settingsCache || { store_name: 'LOGADGET.PK', announcement: '', whatsapp: '' }
}

let settingsChannel = null

export function applySettings(settings) {
  if (!settings) return
  const announcement = document.getElementById('announcement')
  const footer = document.getElementById('site-footer')

  if (announcement) {
    if (settings.announcement) {
      announcement.innerHTML = `<div class="container">${escapeHtml(settings.announcement)}</div>`
      announcement.hidden = false
    } else {
      announcement.hidden = true
    }
  }

  if (footer) {
    const phone = footer.querySelector('[data-settings-phone]')
    const wa = footer.querySelector('[data-settings-whatsapp]')
    const mail = footer.querySelector('[data-settings-email]')
    if (phone && settings.phone) { phone.textContent = settings.phone; phone.href = 'tel:' + settings.phone.replace(/\s/g, '') }
    if (wa && settings.whatsapp) { wa.href = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, ''); wa.textContent = settings.whatsapp }
    if (mail && settings.email) { mail.textContent = settings.email; mail.href = 'mailto:' + settings.email }
  }

  if (settings.whatsapp && !document.getElementById('wa-float')) {
    const link = document.createElement('a')
    link.id = 'wa-float'
    link.className = 'wa-float'
    link.href = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '')
    link.target = '_blank'
    link.rel = 'noopener'
    link.setAttribute('aria-label', 'Chat on WhatsApp')
    link.innerHTML = icons.whatsapp
    document.body.appendChild(link)
  }
}

export function subscribeSettings() {
  if (!isConfigured || settingsChannel) return
  settingsChannel = supabase
    .channel('lg-settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, (payload) => {
      const next = payload.new && payload.new.id !== undefined ? payload.new : payload.old
      if (!next) return
      settingsCache = next
      try { localStorage.setItem('lg_settings', JSON.stringify(next)) } catch {}
      applySettings(next)
      window.dispatchEvent(new CustomEvent('settings:changed', { detail: next }))
    })
    .subscribe()
}

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name')
  if (error) throw error
  return data || []
}

export function productCard(product) {
  const percent = discountPercent(product.price, product.compare_price)
  const hasOptions = (product.product_variants || []).length > 0
  const stock = Number(product.stock ?? 0)
  const action = hasOptions
    ? `<a class="btn btn-ghost btn-sm" href="${productUrl(product)}">Choose options</a>`
    : `<button class="btn btn-primary btn-sm" type="button" data-quick-add="${product.id}">Add to cart</button>`
  const stockLabel =
    stock <= 0
      ? '<span class="p-flag danger">Out of stock</span>'
      : stock <= 5
        ? `<span class="p-flag low">Only ${stock} left</span>`
        : ''
  return `
    <article class="p-card" data-product-card>
      <a class="p-media" href="${productUrl(product)}">
        <img src="${primaryImage(product)}" alt="${escapeHtml(product.name)}" loading="lazy">
        ${percent ? `<span class="p-flag sale">-${percent}%</span>` : ''}
        ${stockLabel}
      </a>
      <div class="p-body">
        <div class="p-meta">${escapeHtml(product.categories?.name || product.brand || '')}</div>
        <h3 class="p-name"><a href="${productUrl(product)}">${escapeHtml(product.name)}</a></h3>
        <div class="p-price">
          <span class="now">${money(product.price)}</span>
          ${product.compare_price ? `<span class="was">${money(product.compare_price)}</span>` : ''}
        </div>
        <div class="p-actions">${action}</div>
      </div>
    </article>`
}

export async function quickAdd(productId, source = document) {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, slug, price, stock, product_images(id, url, sort_order, is_primary), product_variants(id)')
    .eq('id', productId)
    .single()
  if (error || !product) return toast('Could not load product', 'error')
  if (product.product_variants?.length) {
    location.href = productUrl(product)
    return
  }
  if (product.stock <= 0) return toast('This item is out of stock', 'error')
  addToCart({
    product_id: product.id,
    variant_id: null,
    name: product.name,
    variant_name: '',
    price: Number(product.price),
    image: primaryImage(product),
    qty: 1,
    stock: Number(product.stock)
  })
  toast('Added to cart', 'ok')
  const btn = source.querySelector?.(`[data-quick-add="${productId}"]`)
  if (btn) {
    btn.textContent = 'Added'
    setTimeout(() => { btn.textContent = 'Add to cart' }, 1400)
  }
}

export function bindQuickAdd(root = document) {
  root.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-quick-add]')
    if (!btn) return
    event.preventDefault()
    quickAdd(btn.dataset.quickAdd, root)
  })
}

export function mountChrome(active = '') {
  const header = document.getElementById('site-header')
  const footer = document.getElementById('site-footer')

  if (header) {
    header.innerHTML = `
      <div class="promo-strip">Free shipping across Pakistan with code <b>FREESHIPPING250</b> — apply it at checkout</div>
      <div class="container head-inner">
        <button class="icon-btn" type="button" data-menu aria-label="Menu">${icons.menu}</button>
        <a class="logo" href="${siteUrl('index.html')}">LOGADGET.PK</a>
        <nav class="nav" data-nav>
          <a href="${siteUrl('index.html')}" ${active === 'home' ? 'class="active"' : ''}>Home</a>
          <a href="${siteUrl('products.html')}" ${active === 'shop' ? 'class="active"' : ''}>Shop</a>
          <a href="${siteUrl('products.html')}?sort=new" ${active === 'new' ? 'class="active"' : ''}>New arrivals</a>
          <a href="${siteUrl('products.html')}?featured=1" ${active === 'featured' ? 'class="active"' : ''}>Featured</a>
          <a href="${siteUrl('track.html')}" ${active === 'track' ? 'class="active"' : ''}>Track order</a>
        </nav>
        <form class="head-search" data-search>
          ${icons.search}
          <input type="search" name="q" placeholder="Search gadgets..." aria-label="Search products">
        </form>
        <div class="head-actions">
          <a class="icon-btn cart-btn" href="${siteUrl('cart.html')}" aria-label="Cart">
            ${icons.cart}<span class="cart-count" data-cart-count hidden>0</span>
          </a>
        </div>
      </div>`

    header.querySelector('[data-menu]').onclick = () => header.classList.toggle('menu-open')
    header.querySelector('[data-search]').onsubmit = (event) => {
      event.preventDefault()
      const q = new FormData(event.currentTarget).get('q')
      location.href = siteUrl('products.html') + (q ? '?q=' + encodeURIComponent(q) : '')
    }
    const params = new URLSearchParams(location.search)
    const searchInput = header.querySelector('[data-search] input')
    if (searchInput && params.get('q')) searchInput.value = params.get('q')
  }

  if (footer) {
    footer.innerHTML = `
      <div class="container foot-grid">
        <div>
          <a class="logo" href="${siteUrl('index.html')}">LOGADGET.PK</a>
          <p class="foot-text">Genuine gadgets, honest prices and cash on delivery anywhere in Pakistan.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="${siteUrl('products.html')}">All products</a>
          <a href="${siteUrl('products.html')}?featured=1">Featured</a>
          <a href="${siteUrl('products.html')}?sort=new">New arrivals</a>
        </div>
        <div>
          <h4>Help</h4>
          <a href="${siteUrl('track.html')}">Track your order</a>
          <a href="${siteUrl('cart.html')}">Your cart</a>
          <a href="${siteUrl('checkout.html')}">Checkout</a>
          <a href="${siteUrl('admin-subhan-daraz90.html')}">Admin panel</a>
        </div>
        <div>
          <h4>Contact</h4>
          <a data-settings-phone href="tel:">Phone</a>
          <a data-settings-whatsapp href="#" target="_blank" rel="noopener">WhatsApp</a>
          <a data-settings-email href="mailto:">Email</a>
        </div>
      </div>
      <div class="container foot-bottom">
        <span>&copy; ${new Date().getFullYear()} LOGADGET.PK — All rights reserved</span>
        <span class="foot-pay">${icons.cod} Cash on Delivery available</span>
      </div>`
  }

  updateCartBadge()
  bindQuickAdd()
  configNotice()

  fetchSettings().then(applySettings)
  subscribeSettings()
}

export function skeletonCards(count = 8) {
  return Array.from({ length: count })
    .map(
      () => `<article class="p-card skeleton-card"><div class="sk sk-media"></div>
        <div class="p-body"><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-price"></div></div></article>`
    )
    .join('')
}

export function emptyState(title, subtitle = '', action = '') {
  return `<div class="empty"><div class="empty-icon">${icons.box}</div>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p>${action}</div>`
}

export function deliveryEstimate() {
  const date = new Date()
  date.setDate(date.getDate() + 3)
  const date2 = new Date()
  date2.setDate(date2.getDate() + 5)
  const fmt = (d) => d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${fmt(date)} – ${fmt(date2)}`
}
