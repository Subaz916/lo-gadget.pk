import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'
import { icons, money, escapeHtml, assetUrl, toast, configNotice } from './store.js'
import {
  statusBadge, formatDate, confirmDialog, openModal, closeModal,
  skeletonRows, emptyRow
} from '../admin/js/admin.js'

const ADMIN_KEY = 'subhan-daraz90'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-admin-key': ADMIN_KEY } }
})

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled']

const TITLES = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  'product-form': 'Add product',
  categories: 'Categories',
  coupons: 'Coupons',
  customers: 'Customers',
  settings: 'Settings'
}

const NAV = [
  { section: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { section: 'orders', label: 'Orders', icon: 'box', pill: true },
  { section: 'products', label: 'Products', icon: 'tag' },
  { section: 'product-form', label: 'Add product', icon: 'plus' },
  { section: 'categories', label: 'Categories', icon: 'grid' },
  { section: 'coupons', label: 'Coupons', icon: 'ticket' },
  { section: 'customers', label: 'Customers', icon: 'users' },
  { section: 'settings', label: 'Settings', icon: 'settings' }
]

const content = document.getElementById('content')
let renderToken = 0

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function statCard(icon, value, label, sub = '') {
  return `<div class="stat-card">
    <div class="s-icon">${icons[icon]}</div>
    <div class="s-value">${value}</div>
    <div class="s-label">${escapeHtml(label)}</div>
    ${sub ? `<div class="s-sub">${escapeHtml(sub)}</div>` : ''}
  </div>`
}

function searchBox(id, placeholder) {
  return `<div class="grow search-box">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
    <input class="input" id="${id}" type="search" placeholder="${escapeHtml(placeholder)}">
  </div>`
}

function twoCol(min = 300) {
  return `display:grid;grid-template-columns:repeat(auto-fit,minmax(${min}px,1fr));gap:20px;align-items:start`
}

function renderShell() {
  const sidebar = document.getElementById('sidebar')
  const topbar = document.getElementById('topbar')

  sidebar.innerHTML = `
    <a class="logo" href="index.html">LOGADGET.PK</a>
    <div class="side-label">Control panel</div>
    ${NAV.map(
      (item) => `<a class="side-link" data-section="${item.section}" href="#/${item.section}">
        ${icons[item.icon]}<span>${item.label}</span>
        ${item.pill ? '<span class="pill" data-new-orders hidden>0</span>' : ''}
      </a>`
    ).join('')}
    <div class="side-foot">
      <div class="side-user">Direct access<br><span style="color:var(--accent)">no login required</span></div>
      <a class="side-link" href="index.html">${icons.box}<span>View storefront</span></a>
    </div>`

  topbar.innerHTML = `
    <button class="icon-btn admin-burger" type="button" data-burger aria-label="Menu">${icons.menu}</button>
    <h1>Dashboard</h1>
    <div class="spacer"></div>
    <a class="btn btn-ghost btn-sm" href="index.html">View store</a>`

  topbar.querySelector('[data-burger]').onclick = () =>
    document.getElementById('admin-layout').classList.toggle('nav-open')

  sidebar.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => document.getElementById('admin-layout').classList.remove('nav-open'))
  )
}

async function refreshPill() {
  const { count } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new')
  const pill = document.querySelector('[data-new-orders]')
  if (!pill) return
  const value = count || 0
  pill.hidden = value === 0
  pill.textContent = value
}

async function render() {
  const token = ++renderToken
  const raw = location.hash.replace(/^#\/?/, '')
  const [path, query] = raw.split('?')
  const section = TITLES[path] ? path : 'dashboard'
  const params = new URLSearchParams(query || '')

  document.querySelectorAll('[data-section]').forEach((link) => {
    link.classList.toggle('active', link.dataset.section === section)
  })

  const title = section === 'product-form' && params.get('id') ? 'Edit product' : TITLES[section]
  document.querySelector('#topbar h1').textContent = title
  document.title = `${title} — LOGADGET.PK Admin`

  const page = document.createElement('div')
  content.innerHTML = ''
  content.appendChild(page)

  try {
    await VIEWS[section](params, page)
  } catch (err) {
    if (token === renderToken) {
      page.innerHTML = `<div class="notice error">${escapeHtml(err.message || 'Could not load this page.')}</div>`
    }
  }
}

async function viewDashboard(params, page) {
  page.innerHTML = `
    <div class="stat-grid" id="stats">
      ${Array.from({ length: 4 })
        .map(() => '<div class="stat-card"><div class="sk" style="height:90px"></div></div>')
        .join('')}
    </div>
    <div style="${twoCol(320)};margin-bottom:22px">
      <div class="panel">
        <div class="panel-head"><h3>Orders by status</h3></div>
        <div class="bar-list" id="status-bars"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Low stock alerts</h3><a class="btn btn-ghost btn-sm" href="#/products">Manage</a></div>
        <div id="low-stock"></div>
      </div>
    </div>
    <div class="panel-head"><h2>Recent orders</h2><a class="btn btn-ghost btn-sm" href="#/orders">View all</a></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th class="num">Total</th></tr></thead>
        <tbody id="recent-orders"><tr><td colspan="5"><div class="sk" style="height:40px"></div></td></tr></tbody>
      </table>
    </div>`

  const [ordersResult, productsResult, customersResult] = await Promise.all([
    db
      .from('orders')
      .select('id, order_number, status, total, created_at, customers(full_name, phone, whatsapp, city, address)')
      .order('created_at', { ascending: false })
      .limit(500),
    db.from('products').select('id, name, stock, is_active').order('stock'),
    db.from('customers').select('id', { count: 'exact', head: true })
  ])

  if (ordersResult.error) {
    page.innerHTML = `<div class="notice error">${escapeHtml(ordersResult.error.message)}</div>`
    return
  }

  const list = ordersResult.data || []
  const products = productsResult.data || []
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  let revenue = 0
  for (const order of list) {
    counts[order.status] = (counts[order.status] || 0) + 1
    if (order.status !== 'cancelled') revenue += Number(order.total)
  }

  page.querySelector('#stats').innerHTML = [
    statCard('box', counts.new || 0, 'New orders', 'Awaiting confirmation'),
    statCard('tag', counts.shipped || 0, 'Orders shipped', 'On the way'),
    statCard('cod', money(revenue), 'Gross revenue', 'Excluding cancelled'),
    statCard('users', customersResult.count ?? 0, 'Customers', `${products.length} products in catalogue`)
  ].join('')

  const max = Math.max(1, ...STATUSES.map((status) => counts[status]))
  page.querySelector('#status-bars').innerHTML = STATUSES.map(
    (status) => `<div class="bar-row">
      <span style="text-transform:capitalize">${status}</span>
      <div class="bar-track"><div class="bar-fill ${status}" style="width:${(counts[status] / max) * 100}%"></div></div>
      <b style="text-align:right">${counts[status]}</b>
    </div>`
  ).join('')

  const low = products.filter((product) => Number(product.stock) <= 5).slice(0, 7)
  page.querySelector('#low-stock').innerHTML = low.length
    ? low
        .map(
          (product) => `<div class="summary-row" style="padding:9px 0;border-bottom:1px solid var(--line)">
            <span>${escapeHtml(product.name)}</span>
            <b style="color:${product.stock <= 0 ? 'var(--danger)' : 'var(--warn)'}">${product.stock} left</b>
          </div>`
        )
        .join('')
    : '<p class="muted small" style="margin:0">All products have healthy stock levels.</p>'

  const recent = list.slice(0, 8)
  page.querySelector('#recent-orders').innerHTML = recent.length
    ? recent
        .map(
          (order) => `<tr>
            <td class="cell-main">${escapeHtml(order.order_number)}</td>
            <td>${escapeHtml(order.customers?.full_name || '—')}</td>
            <td class="cell-sub">${formatDate(order.created_at)}</td>
            <td>${statusBadge(order.status)}</td>
            <td class="num cell-main">${money(order.total)}</td>
          </tr>`
        )
        .join('')
    : emptyRow(5, 'No orders yet', 'New orders from the store will appear here.')
}

async function adjustStock(order, direction) {
  const { data: items } = await db
    .from('order_items')
    .select('product_id, variant_id, quantity')
    .eq('order_id', order.id)

  for (const item of items || []) {
    if (item.product_id) {
      const { data: product } = await db.from('products').select('stock').eq('id', item.product_id).maybeSingle()
      if (product) {
        const next = Number(product.stock) + direction * item.quantity
        await db.from('products').update({ stock: Math.max(0, next) }).eq('id', item.product_id)
      }
    }
    if (item.variant_id) {
      const { data: variant } = await db.from('product_variants').select('stock').eq('id', item.variant_id).maybeSingle()
      if (variant) {
        const next = Number(variant.stock) + direction * item.quantity
        await db.from('product_variants').update({ stock: Math.max(0, next) }).eq('id', item.variant_id)
      }
    }
  }
}

async function setOrderStatus(order, status, onChanged) {
  if (status === order.status) return
  const ok = await confirmDialog(`Mark ${order.order_number} as ${status}?`, 'Update status')
  if (!ok) return

  const { error } = await db.from('orders').update({ status }).eq('id', order.id)
  if (error) return toast(error.message, 'error')

  if (status === 'cancelled') await adjustStock(order, 1)
  else if (order.status === 'cancelled') await adjustStock(order, -1)

  order.status = status
  toast(`Order marked ${status}`, 'ok')
  closeModal()
  if (onChanged) await onChanged()
  refreshPill()
}

const STATUS_URDU = {
  new: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
}

function waLink(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '92' + digits.slice(1)
  else if (digits.startsWith('3')) digits = '92' + digits
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(message)
}

function urduOrderMessage(order, customer, items) {
  const name = customer.full_name ? `${customer.full_name} صاحب` : 'مشتری صاحب'
  const itemLines = (items || []).map(
    (item) => `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} × ${item.quantity}`
  )
  const total = Number(order.total || 0).toLocaleString('en-US')
  const status = STATUS_URDU[order.status] || order.status
  const lines = [
    `السلام علیکم محترم *${name}*,`,
    '',
    `آپ کا آرڈر *#${order.order_number}* موصول ہو گیا ہے۔`,
    '',
    `*آرڈر کی تفصیل:*`,
    ...itemLines,
    `• قیمت: *${total} روپے*`,
    `• ادائیگی: *Cash on Delivery (COD)*`,
    `• اسٹیٹس: *${status}*`,
    `• متوقع ڈیلیوری: *3 سے 5 دن*`,
    '',
    `براہِ کرم اپنا آرڈر کنفرم کرنے کے لیے صرف *"CONFIRM"* لکھ کر اس میسج کا جواب دیں۔`,
    '',
    `آپ کے جواب کے بعد آپ کا آرڈر ڈیلیوری کے لیے بھیج دیا جائے گا۔`,
    '',
    `شکریہ!`,
    `*LOGADGET.PK*`
  ]
  return lines.map((line) => (line ? '\u200F' + line : line)).join('\n')
}

async function openOrder(order, onChanged) {
  const { data: items, error } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at')

  if (error) return toast(error.message, 'error')

  const customer = order.customers || {}
  const overlay = openModal(`
    <div class="modal" style="max-width:680px">
      <div class="modal-head">
        <h3 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${escapeHtml(order.order_number)} ${statusBadge(order.status)}</h3>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="grid-2" style="gap:16px;margin-bottom:18px">
          <div>
            <div class="small muted">Customer</div>
            <b>${escapeHtml(customer.full_name || '—')}</b>
            <div class="small">${escapeHtml(customer.phone || '')} · ${escapeHtml(customer.city || '')}</div>
            <div class="small muted">${escapeHtml(customer.address || '')}</div>
            <a class="btn btn-primary btn-sm" id="order-wa" href="#" target="_blank" rel="noopener" style="margin-top:10px" hidden>WhatsApp customer (اردو)</a>
          </div>
          <div>
            <div class="small muted">Placed</div>
            <b>${formatDate(order.created_at)}</b>
            <div class="small">Payment: Cash on Delivery</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data" style="min-width:0">
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th></tr></thead>
            <tbody>
              ${(items || [])
                .map(
                  (item) => `<tr>
                    <td class="cell-main">${escapeHtml(item.product_name)}
                      ${item.variant_name ? `<div class="cell-sub">${escapeHtml(item.variant_name)}</div>` : ''}
                    </td>
                    <td class="num">${item.quantity}</td>
                    <td class="num cell-main">${money(item.line_total)}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:16px;text-align:right;font-size:14.5px;line-height:1.9">
          <div>Subtotal: ${money(order.subtotal)}</div>
          ${
            Number(order.discount_amount) > 0
              ? `<div>Discount: −${money(order.discount_amount)}${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ''}</div>`
              : ''
          }
          <div>Shipping: ${Number(order.shipping) > 0 ? money(order.shipping) : 'Free'}</div>
          <div style="font-size:1.1rem;font-weight:800">Total: ${money(order.total)}</div>
        </div>

        ${order.notes ? `<p class="small" style="margin-top:14px">Note: ${escapeHtml(order.notes)}</p>` : ''}

        <div style="margin-top:20px">
          <div class="small muted" style="margin-bottom:8px">Update status</div>
          <div class="tabs" style="margin:0">
            ${STATUSES.map(
              (status) => `<button type="button" class="btn btn-sm ${status === order.status ? 'btn-primary' : 'btn-ghost'}" data-set-status="${status}">${status}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`)

  overlay.querySelectorAll('[data-set-status]').forEach((btn) => {
    btn.onclick = () => setOrderStatus(order, btn.dataset.setStatus, onChanged)
  })

  const waBtn = overlay.querySelector('#order-wa')
  const waPhone = customer.whatsapp || customer.phone
  if (waPhone) {
    waBtn.href = waLink(waPhone, urduOrderMessage(order, customer, items || []))
    waBtn.hidden = false
  }
}

async function viewOrders(params, page) {
  page.innerHTML = `
    <div class="panel-head"><h2 style="margin:0">Orders</h2></div>
    <div class="tabs" id="order-tabs">
      ${['all', ...STATUSES]
        .map(
          (status) =>
            `<button class="btn btn-sm ${status === 'all' ? 'btn-primary' : 'btn-ghost'}" type="button" data-status="${status}">${status === 'all' ? 'All' : status}</button>`
        )
        .join('')}
    </div>
    <div class="toolbar-admin">${searchBox('order-search', 'Search order number, customer or phone...')}</div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th class="num">Total</th><th>Status</th><th></th></tr></thead>
        <tbody id="order-rows">${skeletonRows(6)}</tbody>
      </table>
    </div>
    <p class="small muted" id="order-count" style="margin-top:12px"></p>`

  const rowsEl = page.querySelector('#order-rows')
  const countEl = page.querySelector('#order-count')
  let list = []
  let activeStatus = 'all'
  let term = ''
  let timer

  function draw() {
    let rows = list
    if (activeStatus !== 'all') rows = rows.filter((order) => order.status === activeStatus)
    const q = term.toLowerCase()
    if (q) {
      rows = rows.filter((order) =>
        `${order.order_number} ${order.customers?.full_name || ''} ${order.customers?.phone || ''}`
          .toLowerCase()
          .includes(q)
      )
    }
    countEl.textContent = `${rows.length} order${rows.length === 1 ? '' : 's'}`
    rowsEl.innerHTML = rows.length
      ? rows
          .map(
            (order) => `<tr data-id="${order.id}">
              <td class="cell-main">${escapeHtml(order.order_number)}</td>
              <td><div class="cell-main">${escapeHtml(order.customers?.full_name || '—')}</div>
                <div class="cell-sub">${escapeHtml(order.customers?.phone || '')}</div></td>
              <td class="cell-sub">${formatDate(order.created_at)}</td>
              <td class="num cell-main">${money(order.total)}</td>
              <td>${statusBadge(order.status)}</td>
              <td><div class="row-actions"><button class="btn btn-ghost btn-sm" type="button" data-view>View</button></div></td>
            </tr>`
          )
          .join('')
      : emptyRow(6, 'No orders found', 'New orders from the store will appear here.')
  }

  async function load() {
    rowsEl.innerHTML = skeletonRows(6)
    const { data, error } = await db
      .from('orders')
      .select('*, customers(full_name, phone, whatsapp, city, address)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      rowsEl.innerHTML = emptyRow(6, 'Could not load orders', error.message)
      return
    }
    list = data || []
    draw()
  }

  page.querySelector('#order-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-status]')
    if (!btn) return
    activeStatus = btn.dataset.status
    page.querySelectorAll('#order-tabs .btn').forEach((tab) => {
      tab.classList.toggle('btn-primary', tab === btn)
      tab.classList.toggle('btn-ghost', tab !== btn)
    })
    draw()
  })

  page.querySelector('#order-search').addEventListener('input', (event) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      term = event.target.value.trim()
      draw()
    }, 300)
  })

  rowsEl.addEventListener('click', (event) => {
    const row = event.target.closest('[data-id]')
    if (!row || !event.target.closest('[data-view]')) return
    const order = list.find((item) => item.id === row.dataset.id)
    if (order) openOrder(order, load)
  })

  await load()
}

async function viewProducts(params, page) {
  page.innerHTML = `
    <div class="panel-head">
      <h2 style="margin:0">Products</h2>
      <a class="btn btn-primary btn-sm" href="#/product-form">+ Add product</a>
    </div>
    <div class="toolbar-admin">
      ${searchBox('product-search', 'Search products by name, brand or SKU...')}
      <select class="select" id="filter-cat" style="width:auto;min-width:170px"><option value="">All categories</option></select>
      <select class="select" id="filter-status" style="width:auto;min-width:140px">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="low">Low stock</option>
      </select>
    </div>
    <div class="toolbar-admin" id="bulk-bar" hidden>
      <b id="bulk-count" class="small">0 selected</b>
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="btn btn-danger btn-sm" type="button" id="bulk-delete">${icons.trash} Delete selected</button>
        <button class="btn btn-ghost btn-sm" type="button" id="bulk-clear">Clear selection</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th style="width:40px"><input type="checkbox" id="select-all" aria-label="Select all products"></th>
          <th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th></th>
        </tr></thead>
        <tbody id="rows">${skeletonRows(7)}</tbody>
      </table>
    </div>
    <p class="small muted" id="row-count" style="margin-top:12px"></p>`

  const rowsEl = page.querySelector('#rows')
  const searchEl = page.querySelector('#product-search')
  const catEl = page.querySelector('#filter-cat')
  const statusEl = page.querySelector('#filter-status')
  const countEl = page.querySelector('#row-count')
  const bulkBar = page.querySelector('#bulk-bar')
  const bulkCount = page.querySelector('#bulk-count')
  const selectAll = page.querySelector('#select-all')
  const selected = new Set()
  let products = []
  let timer

  async function loadCategories() {
    const { data } = await db.from('categories').select('*').order('name')
    catEl.innerHTML =
      '<option value="">All categories</option>' +
      (data || [])
        .map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`)
        .join('')
  }

  function render() {
    countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`

    if (!products.length) {
      rowsEl.innerHTML = emptyRow(7, 'No products found', 'Add your first product to the catalogue.')
      syncBulk()
      return
    }

    rowsEl.innerHTML = products
      .map((product) => {
        const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
        const image = images.find((img) => img.is_primary) || images[0]
        const stockStyle =
          product.stock <= 0 ? 'color:var(--danger)' : product.stock <= 5 ? 'color:var(--warn)' : ''
        return `<tr data-id="${product.id}">
          <td><input type="checkbox" data-select value="${product.id}" ${selected.has(product.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(product.name)}" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer"></td>
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
            ${
              product.compare_price
                ? `<div class="cell-sub" style="text-decoration:line-through">${money(product.compare_price)}</div>`
                : ''
            }
          </td>
          <td class="num cell-main" style="${stockStyle}">${product.stock}</td>
          <td><button type="button" class="status ${product.is_active ? 'active' : 'inactive'}" data-toggle style="cursor:pointer;border:1px solid currentColor">${product.is_active ? 'active' : 'inactive'}</button></td>
          <td>
            <div class="row-actions">
              <a class="btn btn-ghost btn-sm" href="#/product-form?id=${product.id}">Edit</a>
              <button class="btn btn-danger btn-sm" type="button" data-delete>${icons.trash}</button>
            </div>
          </td>
        </tr>`
      })
      .join('')
  }

  function syncBulk() {
    bulkBar.hidden = selected.size === 0
    bulkCount.textContent = `${selected.size} selected`
    const boxes = [...rowsEl.querySelectorAll('[data-select]')]
    selectAll.checked = boxes.length > 0 && boxes.every((box) => selected.has(box.value))
    selectAll.indeterminate = selected.size > 0 && !selectAll.checked
  }

  async function loadProducts() {
    rowsEl.innerHTML = `<tr><td colspan="7"><div class="sk" style="height:60px"></div></td></tr>`

    let query = db
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
      rowsEl.innerHTML = emptyRow(7, 'Could not load products', error.message)
      return
    }

    selected.clear()
    products = data || []
    render()
    syncBulk()
  }

  async function deleteProduct(id) {
    const product = products.find((item) => item.id === id)
    const ok = await confirmDialog(
      `Delete "${product?.name}"? This also removes its images and variants.`,
      'Delete product'
    )
    if (!ok) return

    const { data: images } = await db.from('product_images').select('url').eq('product_id', id)
    const { error } = await db.from('products').delete().eq('id', id)
    if (error) return toast(error.message, 'error')

    await Promise.all(
      (images || []).map((image) => {
        const match = image.url.match(/product-images\/(.+)$/)
        if (!match) return null
        return db.storage.from('product-images').remove([match[1]])
      })
    )

    toast('Product deleted', 'ok')
    loadProducts()
  }

  async function deleteSelected() {
    const ids = [...selected]
    if (!ids.length) return
    const ok = await confirmDialog(
      `Delete ${ids.length} product${ids.length === 1 ? '' : 's'}? This also removes their images and variants.`,
      'Delete selected'
    )
    if (!ok) return

    const { data: images } = await db.from('product_images').select('url').in('product_id', ids)
    const { error } = await db.from('products').delete().in('id', ids)
    if (error) return toast(error.message, 'error')

    await Promise.all(
      (images || []).map((image) => {
        const match = image.url.match(/product-images\/(.+)$/)
        if (!match) return null
        return db.storage.from('product-images').remove([match[1]])
      })
    )

    toast(`${ids.length} product${ids.length === 1 ? '' : 's'} deleted`, 'ok')
    loadProducts()
  }

  selectAll.addEventListener('change', () => {
    rowsEl.querySelectorAll('[data-select]').forEach((box) => {
      if (selectAll.checked) selected.add(box.value)
      else selected.delete(box.value)
      box.checked = selectAll.checked
    })
    syncBulk()
  })

  rowsEl.addEventListener('change', (event) => {
    const box = event.target.closest('[data-select]')
    if (!box) return
    if (box.checked) selected.add(box.value)
    else selected.delete(box.value)
    syncBulk()
  })

  page.querySelector('#bulk-delete').addEventListener('click', deleteSelected)
  page.querySelector('#bulk-clear').addEventListener('click', () => {
    selected.clear()
    rowsEl.querySelectorAll('[data-select]').forEach((box) => { box.checked = false })
    syncBulk()
  })

  rowsEl.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-id]')
    if (!row) return
    const id = row.dataset.id

    if (event.target.closest('[data-delete]')) {
      deleteProduct(id)
      return
    }

    if (event.target.closest('[data-toggle]')) {
      const product = products.find((item) => item.id === id)
      const { error } = await db.from('products').update({ is_active: !product.is_active }).eq('id', id)
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

  await loadCategories()
  await loadProducts()
}

async function viewProductForm(params, page) {
  const productId = params.get('id')
  const isEdit = Boolean(productId)
  let categories = []
  let images = []
  let variants = []
  const originalImageIds = new Set()
  const originalVariantIds = new Set()
  let slugTouched = false

  page.innerHTML = `
    <div class="panel-head">
      <h2 style="margin:0">${isEdit ? 'Edit product' : 'Add product'}</h2>
      <a class="btn btn-ghost btn-sm" href="#/products">← Back to products</a>
    </div>
    <form id="product-form">
      <div style="${twoCol(340)}">
        <div>
          <div class="panel">
            <h3>Basic information</h3>
            <div class="grid-2">
              <div class="field span-2">
                <label for="name">Product name *</label>
                <input class="input" id="name" type="text" placeholder="e.g. LogaPods Pro Wireless Earbuds" required>
              </div>
              <div class="field">
                <label for="slug">URL slug *</label>
                <input class="input" id="slug" type="text" placeholder="logapods-pro">
              </div>
              <div class="field">
                <label for="brand">Brand</label>
                <input class="input" id="brand" type="text" placeholder="e.g. Logadget">
              </div>
              <div class="field">
                <label for="category">Category</label>
                <select class="select" id="category"><option value="">Uncategorised</option></select>
              </div>
              <div class="field">
                <label for="sku">SKU</label>
                <input class="input" id="sku" type="text" placeholder="LG-AUD-001">
              </div>
            </div>
          </div>

          <div class="panel">
            <h3>Images</h3>
            <div class="drop-zone" id="drop-zone">
              Click or drop images here to upload<br>
              <span class="small">PNG, JPG or WEBP — up to 5MB each</span>
            </div>
            <input type="file" id="file-input" accept="image/*" multiple hidden>
            <div class="toolbar-admin" style="margin:12px 0 0">
              <div class="grow"><input class="input" id="image-url" type="text" placeholder="Paste image URL (https://... or assets/ph-1.svg)"></div>
              <button class="btn btn-ghost btn-sm" type="button" id="add-image-url">Add URL</button>
            </div>
            <p class="small muted" style="margin:8px 0 0">If the browser upload is blocked, paste an image URL instead.</p>
            <div class="image-grid" id="image-grid" style="margin-top:14px"></div>
          </div>

          <div class="panel">
            <h3>Variants / options</h3>
            <p class="small muted" style="margin-top:-8px">Options like colour or size. Leave empty for a single-version product.</p>
            <div id="variant-rows"></div>
            <button class="btn btn-ghost btn-sm" type="button" id="add-variant">+ Add option</button>
          </div>
        </div>

        <div>
          <div class="panel">
            <h3>Pricing &amp; stock</h3>
            <div class="grid-2">
              <div class="field">
                <label for="price">Price (Rs) *</label>
                <input class="input" id="price" type="number" min="0" step="1" placeholder="6499" required>
              </div>
              <div class="field">
                <label for="compare_price">Compare at price (Rs)</label>
                <input class="input" id="compare_price" type="number" min="0" step="1" placeholder="8999">
                <span class="hint">Shown struck through</span>
              </div>
              <div class="field span-2">
                <label for="stock">Stock quantity *</label>
                <input class="input" id="stock" type="number" min="0" step="1" value="0" required>
              </div>
            </div>
          </div>

          <div class="panel">
            <h3>Description</h3>
            <div class="field">
              <label for="short_description">Short description</label>
              <input class="input" id="short_description" type="text" placeholder="One line summary">
            </div>
            <div class="field">
              <label for="description">Full description</label>
              <textarea class="textarea" id="description" placeholder="Features, specs, what is in the box..."></textarea>
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="tags">Tags</label>
              <input class="input" id="tags" type="text" placeholder="earbuds, anc, bluetooth">
              <span class="hint">Comma separated, used for search</span>
            </div>
          </div>

          <div class="panel">
            <h3>Visibility</h3>
            <label class="switch-wrap" style="margin-bottom:12px">
              <input type="checkbox" id="is_active" checked> Active (visible in store)
            </label>
            <label class="switch-wrap">
              <input type="checkbox" id="is_featured"> Featured on home page
            </label>
          </div>

          <div id="form-error" hidden></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="save-btn">Save product</button>
        </div>
      </div>
    </form>`

  const $ = (selector) => page.querySelector(selector)
  const form = $('#product-form')
  const errorBox = $('#form-error')
  const saveBtn = $('#save-btn')
  const nameInput = $('#name')
  const slugInput = $('#slug')

  function showError(message) {
    errorBox.hidden = false
    errorBox.className = 'notice error'
    errorBox.textContent = message
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function renderImages() {
    const grid = $('#image-grid')
    if (!images.length) {
      grid.innerHTML = '<p class="small muted" style="grid-column:1/-1;margin:0">No images yet.</p>'
      return
    }
    grid.innerHTML = images
      .map(
        (image, index) => `<div class="image-tile" data-index="${index}">
          <img src="${image.file ? URL.createObjectURL(image.file) : assetUrl(image.url)}" alt="">
          ${image.is_primary ? '<span class="primary-dot">Primary</span>' : ''}
          <div class="tile-opts">
            <button type="button" data-move="-1" ${index === 0 ? 'disabled' : ''}>←</button>
            <button type="button" data-move="1" ${index === images.length - 1 ? 'disabled' : ''}>→</button>
            <button type="button" data-primary>Star</button>
            <button type="button" data-remove-img>✕</button>
          </div>
        </div>`
      )
      .join('')
  }

  function renderVariants() {
    const wrap = $('#variant-rows')
    if (!variants.length) {
      wrap.innerHTML = '<p class="small muted" style="margin:0 0 10px">No options added.</p>'
      return
    }
    wrap.innerHTML = variants
      .map(
        (variant, index) => `<div class="variant-row" data-index="${index}">
          <input class="input" data-field="name" placeholder="Option name (Colour)" value="${escapeHtml(variant.name)}">
          <input class="input" data-field="value" placeholder="Value (Black)" value="${escapeHtml(variant.value)}">
          <input class="input" data-field="price_adjustment" type="number" step="1" placeholder="Price ±" value="${variant.price_adjustment}">
          <input class="input" data-field="stock" type="number" min="0" step="1" placeholder="Stock" value="${variant.stock}">
          <button class="btn btn-danger btn-sm" type="button" data-remove-variant>✕</button>
        </div>`
      )
      .join('')
  }

  async function loadCategories() {
    const { data } = await db.from('categories').select('*').order('name')
    categories = data || []
    $('#category').innerHTML =
      '<option value="">Uncategorised</option>' +
      categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')
  }

  async function loadProduct() {
    const { data: product, error } = await db.from('products').select('*').eq('id', productId).maybeSingle()

    if (error || !product) {
      showError('Product not found.')
      saveBtn.disabled = true
      return
    }

    nameInput.value = product.name || ''
    slugInput.value = product.slug || ''
    $('#brand').value = product.brand || ''
    $('#category').value = product.category_id || ''
    $('#sku').value = product.sku || ''
    $('#price').value = product.price ?? ''
    $('#compare_price').value = product.compare_price ?? ''
    $('#stock').value = product.stock ?? 0
    $('#short_description').value = product.short_description || ''
    $('#description').value = product.description || ''
    $('#tags').value = (product.tags || []).join(', ')
    $('#is_active').checked = product.is_active
    $('#is_featured').checked = product.is_featured
    slugTouched = true

    const [{ data: productImages }, { data: productVariants }] = await Promise.all([
      db.from('product_images').select('*').eq('product_id', productId).order('sort_order'),
      db.from('product_variants').select('*').eq('product_id', productId)
    ])

    images = productImages || []
    images.forEach((image) => originalImageIds.add(image.id))
    if (images.length && !images.some((image) => image.is_primary)) images[0].is_primary = true

    variants = (productVariants || []).map((variant) => ({
      ...variant,
      price_adjustment: Number(variant.price_adjustment),
      stock: Number(variant.stock)
    }))
    variants.forEach((variant) => originalVariantIds.add(variant.id))

    renderImages()
    renderVariants()
  }

  async function uploadFile(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error } = await db.storage.from('product-images').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = db.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  function handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) {
        toast(`${file.name} is larger than 5MB`, 'error')
        continue
      }
      images.push({ file, is_primary: images.length === 0, sort_order: images.length })
    }
    renderImages()
  }

  async function saveImages(targetId) {
    const removedIds = [...originalImageIds].filter((id) => !images.some((image) => image.id === id))
    if (removedIds.length) {
      const { data: removed } = await db.from('product_images').select('url').in('id', removedIds)
      const { error } = await db.from('product_images').delete().in('id', removedIds)
      if (error) throw error
      await Promise.all(
        (removed || []).map((image) => {
          const match = image.url.match(/product-images\/(.+)$/)
          return match ? db.storage.from('product-images').remove([match[1]]) : null
        })
      )
    }

    for (const image of images) {
      if (image.file) {
        image.url = await uploadFile(image.file)
        delete image.file
      }
    }

    images.forEach((image, index) => (image.sort_order = index))

    const newImages = images.filter((image) => !image.id)
    const existingImages = images.filter((image) => image.id)

    if (newImages.length) {
      const rows = newImages.map((image) => ({
        product_id: targetId,
        url: image.url,
        alt: nameInput.value,
        sort_order: image.sort_order,
        is_primary: Boolean(image.is_primary)
      }))
      const { error } = await db.from('product_images').insert(rows)
      if (error) throw error
    }

    for (const image of existingImages) {
      const { error } = await db
        .from('product_images')
        .update({ sort_order: image.sort_order, is_primary: Boolean(image.is_primary), url: image.url })
        .eq('id', image.id)
      if (error) throw error
    }
  }

  async function saveVariants(targetId) {
    const cleaned = variants
      .filter((variant) => variant.name.trim() && variant.value.trim())
      .map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        product_id: targetId,
        name: variant.name.trim(),
        value: variant.value.trim(),
        price_adjustment: Number(variant.price_adjustment || 0),
        stock: Number(variant.stock || 0),
        is_active: true
      }))

    const removedIds = [...originalVariantIds].filter(
      (id) => !cleaned.some((variant) => variant.id === id)
    )
    if (removedIds.length) {
      const { error } = await db.from('product_variants').delete().in('id', removedIds)
      if (error) throw error
    }

    for (const variant of cleaned.filter((item) => item.id)) {
      const { id, ...rest } = variant
      const { error } = await db.from('product_variants').update(rest).eq('id', id)
      if (error) throw error
    }

    const toInsert = cleaned.filter((item) => !item.id)
    if (toInsert.length) {
      const { error } = await db.from('product_variants').insert(toInsert)
      if (error) throw error
    }
  }

  const dropZone = $('#drop-zone')
  const fileInput = $('#file-input')

  dropZone.addEventListener('click', () => fileInput.click())
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropZone.classList.add('over')
  })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'))
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropZone.classList.remove('over')
    handleFiles(event.dataTransfer.files)
  })
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files)
    fileInput.value = ''
  })

  $('#add-image-url').addEventListener('click', () => {
    const input = $('#image-url')
    const url = input.value.trim()
    if (!url) return
    images.push({ url, is_primary: images.length === 0, sort_order: images.length })
    input.value = ''
    renderImages()
  })

  $('#image-url').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    $('#add-image-url').click()
  })

  $('#image-grid').addEventListener('click', (event) => {
    const tile = event.target.closest('[data-index]')
    if (!tile) return
    const index = Number(tile.dataset.index)

    if (event.target.closest('[data-remove-img]')) {
      images.splice(index, 1)
      images.forEach((image, i) => (image.sort_order = i))
      if (images.length && !images.some((image) => image.is_primary)) images[0].is_primary = true
      renderImages()
      return
    }
    if (event.target.closest('[data-primary]')) {
      images.forEach((image, i) => (image.is_primary = i === index))
      renderImages()
      return
    }
    const move = event.target.closest('[data-move]')
    if (move) {
      const target = index + Number(move.dataset.move)
      if (target < 0 || target >= images.length) return
      ;[images[index], images[target]] = [images[target], images[index]]
      images.forEach((image, i) => (image.sort_order = i))
      renderImages()
    }
  })

  $('#add-variant').addEventListener('click', () => {
    variants.push({ name: '', value: '', price_adjustment: 0, stock: 0 })
    renderVariants()
  })

  $('#variant-rows').addEventListener('input', (event) => {
    const row = event.target.closest('[data-index]')
    if (!row || !event.target.dataset.field) return
    const field = event.target.dataset.field
    const value = event.target.value
    variants[Number(row.dataset.index)][field] =
      field === 'name' || field === 'value' ? value : Number(value || 0)
  })

  $('#variant-rows').addEventListener('click', (event) => {
    const row = event.target.closest('[data-index]')
    if (!row || !event.target.closest('[data-remove-variant]')) return
    variants.splice(Number(row.dataset.index), 1)
    renderVariants()
  })

  nameInput.addEventListener('input', () => {
    if (!slugTouched && !isEdit) slugInput.value = slugify(nameInput.value)
  })
  slugInput.addEventListener('input', () => {
    slugTouched = true
    slugInput.value = slugify(slugInput.value)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorBox.hidden = true

    const name = nameInput.value.trim()
    const slug = slugify(slugInput.value || name)
    const price = Number($('#price').value)
    const comparePrice = Number($('#compare_price').value)
    const stock = Number($('#stock').value)

    if (name.length < 3) return showError('Product name must be at least 3 characters.')
    if (!slug) return showError('URL slug is required.')
    if (!Number.isFinite(price) || price < 0) return showError('Enter a valid price.')
    if (comparePrice && comparePrice < price)
      return showError('Compare price cannot be lower than the selling price.')
    if (!Number.isFinite(stock) || stock < 0) return showError('Stock must be zero or more.')

    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'

    try {
      const payload = {
        name,
        slug,
        brand: $('#brand').value.trim() || null,
        category_id: $('#category').value || null,
        sku: $('#sku').value.trim() || null,
        price,
        compare_price: comparePrice || null,
        stock: Math.round(stock),
        short_description: $('#short_description').value.trim() || null,
        description: $('#description').value.trim() || null,
        tags: $('#tags')
          .value.split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_active: $('#is_active').checked,
        is_featured: $('#is_featured').checked
      }

      let savedId = productId
      if (isEdit) {
        const { error } = await db.from('products').update(payload).eq('id', productId)
        if (error) throw error
      } else {
        const { data, error } = await db.from('products').insert(payload).select('id').single()
        if (error) throw error
        savedId = data.id
      }

      await saveImages(savedId)
      await saveVariants(savedId)

      toast(isEdit ? 'Product updated' : 'Product created', 'ok')
      location.hash = '#/products'
    } catch (err) {
      showError(err.message || 'Could not save the product.')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save product'
    }
  })

  await loadCategories()
  if (isEdit) await loadProduct()
  renderImages()
  renderVariants()
}

async function viewCategories(params, page) {
  page.innerHTML = `
    <div class="panel-head"><h2 style="margin:0">Categories</h2></div>
    <div style="${twoCol(320)}">
      <div class="panel">
        <h3 id="cat-title">Add category</h3>
        <form id="cat-form">
          <div class="field">
            <label for="cat-name">Name *</label>
            <input class="input" id="cat-name" type="text" placeholder="Audio" required>
          </div>
          <div class="field">
            <label for="cat-slug">Slug *</label>
            <input class="input" id="cat-slug" type="text" placeholder="audio">
            <span class="hint">Used in URLs. Leave empty to generate from the name.</span>
          </div>
          <div class="field">
            <label for="cat-desc">Description</label>
            <textarea class="textarea" id="cat-desc" placeholder="Earbuds, headphones and speakers"></textarea>
          </div>
          <div class="field">
            <label for="cat-sort">Sort order</label>
            <input class="input" id="cat-sort" type="number" step="1" value="0">
          </div>
          <div class="row-actions" style="justify-content:flex-start">
            <button class="btn btn-primary btn-sm" type="submit">Save category</button>
            <button class="btn btn-ghost btn-sm" type="button" id="cat-cancel" hidden>Cancel</button>
          </div>
        </form>
      </div>
      <div class="table-wrap">
        <table class="data" style="min-width:0">
          <thead><tr><th>Category</th><th class="num">Products</th><th></th></tr></thead>
          <tbody id="cat-rows">${skeletonRows(4)}</tbody>
        </table>
      </div>
    </div>`

  const rowsEl = page.querySelector('#cat-rows')
  const form = page.querySelector('#cat-form')
  let editId = null

  function resetForm() {
    editId = null
    form.reset()
    page.querySelector('#cat-title').textContent = 'Add category'
    page.querySelector('#cat-cancel').hidden = true
  }

  async function load() {
    const { data, error } = await db
      .from('categories')
      .select('*, products(id)')
      .order('sort_order')
      .order('name')
    if (error) {
      rowsEl.innerHTML = emptyRow(3, 'Could not load categories', error.message)
      return
    }
    const categories = data || []
    rowsEl.innerHTML = categories.length
      ? categories
          .map(
            (cat) => `<tr data-id="${cat.id}">
              <td><div class="cell-main">${escapeHtml(cat.name)}</div>
                <div class="cell-sub">${escapeHtml(cat.description || cat.slug)}</div></td>
              <td class="num">${(cat.products || []).length}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" type="button" data-edit>Edit</button>
                  <button class="btn btn-danger btn-sm" type="button" data-delete>${icons.trash}</button>
                </div>
              </td>
            </tr>`
          )
          .join('')
      : emptyRow(3, 'No categories yet', 'Add your first category.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = page.querySelector('#cat-name').value.trim()
    const slug = slugify(page.querySelector('#cat-slug').value || name)
    if (name.length < 2) return toast('Category name is too short', 'error')
    if (!slug) return toast('Slug is required', 'error')

    const payload = {
      name,
      slug,
      description: page.querySelector('#cat-desc').value.trim() || null,
      sort_order: Number(page.querySelector('#cat-sort').value || 0)
    }

    const { error } = editId
      ? await db.from('categories').update(payload).eq('id', editId)
      : await db.from('categories').insert(payload)

    if (error) return toast(error.message, 'error')
    toast(editId ? 'Category updated' : 'Category created', 'ok')
    resetForm()
    await load()
  })

  page.querySelector('#cat-cancel').addEventListener('click', resetForm)

  rowsEl.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-id]')
    if (!row) return
    const id = row.dataset.id

    if (event.target.closest('[data-edit]')) {
      const { data: cat, error } = await db.from('categories').select('*').eq('id', id).maybeSingle()
      if (error || !cat) return toast(error?.message || 'Category not found', 'error')
      editId = id
      page.querySelector('#cat-name').value = cat.name || ''
      page.querySelector('#cat-slug').value = cat.slug || ''
      page.querySelector('#cat-desc').value = cat.description || ''
      page.querySelector('#cat-sort').value = cat.sort_order ?? 0
      page.querySelector('#cat-title').textContent = 'Edit category'
      page.querySelector('#cat-cancel').hidden = false
      page.querySelector('#cat-name').focus()
      return
    }

    if (event.target.closest('[data-delete]')) {
      const { data: cat } = await db.from('categories').select('name').eq('id', id).maybeSingle()
      const ok = await confirmDialog(
        `Delete "${cat?.name || 'this category'}"? Products in it become uncategorised.`,
        'Delete category'
      )
      if (!ok) return
      const { error } = await db.from('categories').delete().eq('id', id)
      if (error) return toast(error.message, 'error')
      toast('Category deleted', 'ok')
      if (editId === id) resetForm()
      await load()
    }
  })

  await load()
}

function couponSchedule(coupon) {
  const now = Date.now()
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return 'starts ' + formatDate(coupon.starts_at, false)
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return 'expired ' + formatDate(coupon.ends_at, false)
  if (coupon.ends_at) return 'ends ' + formatDate(coupon.ends_at, false)
  if (coupon.starts_at) return 'started ' + formatDate(coupon.starts_at, false)
  return coupon.is_active ? '' : 'paused'
}

function toInputValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromInputValue(value) {
  return value ? new Date(value).toISOString() : null
}

async function viewCoupons(params, page) {
  page.innerHTML = `
    <div class="panel-head"><h2 style="margin:0">Coupons</h2></div>
    <div style="${twoCol(340)}">
      <div class="panel">
        <h3 id="coupon-title">Add coupon</h3>
        <form id="coupon-form">
          <div class="field">
            <label for="coupon-code">Code *</label>
            <input class="input" id="coupon-code" type="text" placeholder="WELCOME10" maxlength="30" autocomplete="off" required>
            <span class="hint">Customers type this code at checkout.</span>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="coupon-type">Discount type *</label>
              <select class="select" id="coupon-type">
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount (Rs)</option>
              </select>
            </div>
            <div class="field">
              <label for="coupon-value">Value *</label>
              <input class="input" id="coupon-value" type="number" min="0.01" step="0.01" placeholder="10" required>
            </div>
          </div>
          <div class="field">
            <label for="coupon-min">Minimum order (Rs)</label>
            <input class="input" id="coupon-min" type="number" min="0" step="1" value="0">
            <span class="hint">Set 0 to allow any cart total.</span>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="coupon-start">Starts</label>
              <input class="input" id="coupon-start" type="datetime-local">
            </div>
            <div class="field">
              <label for="coupon-end">Ends</label>
              <input class="input" id="coupon-end" type="datetime-local">
            </div>
          </div>
          <div class="field">
            <label for="coupon-limit">Usage limit</label>
            <input class="input" id="coupon-limit" type="number" min="1" step="1" placeholder="Unlimited">
          </div>
          <label class="switch-wrap"><input type="checkbox" id="coupon-active" checked> Coupon active</label>
          <div class="row-actions" style="justify-content:flex-start;margin-top:14px">
            <button class="btn btn-primary btn-sm" type="submit">Save coupon</button>
            <button class="btn btn-ghost btn-sm" type="button" id="coupon-cancel" hidden>Cancel</button>
          </div>
        </form>
      </div>
      <div class="table-wrap">
        <table class="data" style="min-width:0">
          <thead><tr><th>Code</th><th>Discount</th><th class="num">Min order</th><th class="num">Used</th><th>Status</th><th></th></tr></thead>
          <tbody id="coupon-rows">${skeletonRows(4)}</tbody>
        </table>
      </div>
    </div>`

  const rowsEl = page.querySelector('#coupon-rows')
  const form = page.querySelector('#coupon-form')
  const codeInput = page.querySelector('#coupon-code')
  let editId = null
  let coupons = []

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  })

  function resetForm() {
    editId = null
    form.reset()
    page.querySelector('#coupon-min').value = '0'
    page.querySelector('#coupon-active').checked = true
    page.querySelector('#coupon-title').textContent = 'Add coupon'
    page.querySelector('#coupon-cancel').hidden = true
  }

  async function load() {
    const { data, error } = await db.from('discounts').select('*').order('created_at', { ascending: false })
    if (error) {
      rowsEl.innerHTML = emptyRow(6, 'Could not load coupons', error.message)
      return
    }
    coupons = data || []
    rowsEl.innerHTML = coupons.length
      ? coupons
          .map(
            (coupon) => `<tr data-id="${coupon.id}">
              <td><div class="cell-main">${escapeHtml(coupon.code)}</div>
                <div class="cell-sub">${escapeHtml(couponSchedule(coupon))}</div></td>
              <td class="cell-main">${coupon.type === 'percent' ? `${Number(coupon.value)}% off` : `${money(coupon.value)} off`}</td>
              <td class="num">${Number(coupon.min_order) > 0 ? money(coupon.min_order) : 'Any'}</td>
              <td class="num">${coupon.used_count}${coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ' / ∞'}</td>
              <td><button type="button" class="status ${coupon.is_active ? 'active' : 'inactive'}" data-toggle style="cursor:pointer;border:1px solid currentColor">${coupon.is_active ? 'active' : 'inactive'}</button></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" type="button" data-edit>Edit</button>
                  <button class="btn btn-danger btn-sm" type="button" data-delete>${icons.trash}</button>
                </div>
              </td>
            </tr>`
          )
          .join('')
      : emptyRow(6, 'No coupons yet', 'Create a discount code customers can use at checkout.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const code = codeInput.value.trim().toUpperCase()
    const type = page.querySelector('#coupon-type').value
    const value = Number(page.querySelector('#coupon-value').value)
    const minOrder = Number(page.querySelector('#coupon-min').value || 0)
    const starts = fromInputValue(page.querySelector('#coupon-start').value)
    const ends = fromInputValue(page.querySelector('#coupon-end').value)
    const limitRaw = page.querySelector('#coupon-limit').value.trim()
    const limit = limitRaw ? Number(limitRaw) : null
    const isActive = page.querySelector('#coupon-active').checked

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast('Code must be 3-30 letters, numbers, dashes or underscores', 'error')
    if (!Number.isFinite(value) || value <= 0) return toast('Discount value must be more than 0', 'error')
    if (type === 'percent' && value > 100) return toast('Percent discount cannot be over 100', 'error')
    if (!Number.isFinite(minOrder) || minOrder < 0) return toast('Minimum order must be 0 or more', 'error')
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return toast('Usage limit must be 1 or more', 'error')
    if (starts && ends && new Date(ends).getTime() <= new Date(starts).getTime()) return toast('End date must be after start date', 'error')

    const payload = {
      code,
      type,
      value,
      min_order: minOrder,
      is_active: isActive,
      starts_at: starts,
      ends_at: ends,
      usage_limit: limit
    }

    const { error } = editId
      ? await db.from('discounts').update(payload).eq('id', editId)
      : await db.from('discounts').insert(payload)

    if (error) {
      if (error.code === '23505' || /discounts_code_key|duplicate key/i.test(error.message || ''))
        return toast('That coupon code already exists', 'error')
      return toast(error.message, 'error')
    }
    toast(editId ? 'Coupon updated' : 'Coupon created', 'ok')
    resetForm()
    await load()
  })

  page.querySelector('#coupon-cancel').addEventListener('click', resetForm)

  rowsEl.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-id]')
    if (!row) return
    const id = row.dataset.id

    if (event.target.closest('[data-edit]')) {
      const { data: coupon, error } = await db.from('discounts').select('*').eq('id', id).maybeSingle()
      if (error || !coupon) return toast(error?.message || 'Coupon not found', 'error')
      editId = id
      codeInput.value = coupon.code || ''
      page.querySelector('#coupon-type').value = coupon.type || 'percent'
      page.querySelector('#coupon-value').value = Number(coupon.value)
      page.querySelector('#coupon-min').value = Number(coupon.min_order)
      page.querySelector('#coupon-start').value = toInputValue(coupon.starts_at)
      page.querySelector('#coupon-end').value = toInputValue(coupon.ends_at)
      page.querySelector('#coupon-limit').value = coupon.usage_limit ?? ''
      page.querySelector('#coupon-active').checked = Boolean(coupon.is_active)
      page.querySelector('#coupon-title').textContent = 'Edit coupon'
      page.querySelector('#coupon-cancel').hidden = false
      codeInput.focus()
      return
    }

    if (event.target.closest('[data-toggle]')) {
      const coupon = coupons.find((item) => item.id === id)
      if (!coupon) return
      const { error } = await db.from('discounts').update({ is_active: !coupon.is_active }).eq('id', id)
      if (error) return toast(error.message, 'error')
      toast(coupon.is_active ? 'Coupon paused' : 'Coupon activated', 'ok')
      await load()
      return
    }

    if (event.target.closest('[data-delete]')) {
      const coupon = coupons.find((item) => item.id === id)
      const ok = await confirmDialog(
        `Delete coupon "${coupon?.code || ''}"? Customers using it at checkout will get an error.`,
        'Delete coupon'
      )
      if (!ok) return
      const { error } = await db.from('discounts').delete().eq('id', id)
      if (error) return toast(error.message, 'error')
      toast('Coupon deleted', 'ok')
      if (editId === id) resetForm()
      await load()
    }
  })

  await load()
}

async function viewCustomers(params, page) {
  page.innerHTML = `
    <div class="panel-head"><h2 style="margin:0">Customers</h2></div>
    <div class="toolbar-admin">${searchBox('customer-search', 'Search by name, phone or city...')}</div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Customer</th><th>City</th><th class="num">Orders</th><th class="num">Spent</th><th>Joined</th></tr></thead>
        <tbody id="customer-rows">${skeletonRows(6)}</tbody>
      </table>
    </div>
    <p class="small muted" id="customer-count" style="margin-top:12px"></p>`

  const rowsEl = page.querySelector('#customer-rows')
  const countEl = page.querySelector('#customer-count')
  let list = []
  let term = ''
  let timer

  function draw() {
    const q = term.toLowerCase()
    const rows = q
      ? list.filter((customer) =>
          `${customer.full_name} ${customer.phone} ${customer.city}`.toLowerCase().includes(q)
        )
      : list
    countEl.textContent = `${rows.length} customer${rows.length === 1 ? '' : 's'}`
    rowsEl.innerHTML = rows.length
      ? rows
          .map((customer) => {
            const orders = customer.orders || []
            const spent = orders
              .filter((order) => order.status !== 'cancelled')
              .reduce((sum, order) => sum + Number(order.total), 0)
            return `<tr>
              <td><div class="cell-main">${escapeHtml(customer.full_name)}</div>
                <div class="cell-sub">${escapeHtml(customer.phone)}${customer.whatsapp ? ' · WA ' + escapeHtml(customer.whatsapp) : ''}</div></td>
              <td>${escapeHtml(customer.city)}<div class="cell-sub">${escapeHtml(customer.province)}</div></td>
              <td class="num">${orders.length}</td>
              <td class="num cell-main">${money(spent)}</td>
              <td class="cell-sub">${formatDate(customer.created_at, false)}</td>
            </tr>`
          })
          .join('')
      : emptyRow(5, 'No customers yet', 'Customers appear here after their first order.')
  }

  async function load() {
    rowsEl.innerHTML = skeletonRows(6)
    const { data, error } = await db
      .from('customers')
      .select('*, orders(id, total, status, created_at)')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      rowsEl.innerHTML = emptyRow(5, 'Could not load customers', error.message)
      return
    }
    list = data || []
    draw()
  }

  page.querySelector('#customer-search').addEventListener('input', (event) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      term = event.target.value.trim()
      draw()
    }, 300)
  })

  await load()
}

async function viewSettings(params, page) {
  page.innerHTML = `
    <div class="panel-head"><h2 style="margin:0">Store settings</h2></div>
    <form id="settings-form">
      <div style="${twoCol(330)}">
        <div class="panel">
          <h3>Store identity</h3>
          <div class="field">
            <label for="store_name">Store name *</label>
            <input class="input" id="store_name" type="text" placeholder="LOGADGET.PK">
          </div>
          <div class="field">
            <label for="tagline">Tagline</label>
            <input class="input" id="tagline" type="text" placeholder="Gadgets that keep up with you">
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="announcement">Announcement bar</label>
            <textarea class="textarea" id="announcement" placeholder="Free delivery on orders above Rs 5,000"></textarea>
          </div>
        </div>

        <div class="panel">
          <h3>Contact</h3>
          <div class="grid-2">
            <div class="field">
              <label for="phone">Phone</label>
              <input class="input" id="phone" type="text" placeholder="+92 300 0000000">
            </div>
            <div class="field">
              <label for="whatsapp">WhatsApp</label>
              <input class="input" id="whatsapp" type="text" placeholder="+92 300 0000000">
            </div>
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input class="input" id="email" type="email" placeholder="hello@logadget.pk">
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="address">Address</label>
            <input class="input" id="address" type="text" placeholder="Karachi, Pakistan">
          </div>
        </div>

        <div class="panel">
          <h3>Checkout</h3>
          <label class="switch-wrap"><input type="checkbox" id="allow_cod"> Allow Cash on Delivery</label>
          <p class="small muted" style="margin:10px 0 0">Shipping is fixed at Rs 250. Customers get free shipping by applying the code FREESHIPPING250 at checkout.</p>
        </div>
      </div>

      <div id="settings-error" hidden style="margin-top:18px"></div>
      <div style="margin-top:18px">
        <button class="btn btn-primary btn-lg" type="submit" id="settings-save">Save settings</button>
      </div>
    </form>`

  const $ = (selector) => page.querySelector(selector)
  const errorBox = $('#settings-error')

  function showError(message) {
    errorBox.hidden = false
    errorBox.className = 'notice error'
    errorBox.textContent = message
  }

  const { data: settings, error } = await db.from('store_settings').select('*').eq('id', true).maybeSingle()
  if (error) throw new Error(error.message)

  const current = settings || {}
  $('#store_name').value = current.store_name || ''
  $('#tagline').value = current.tagline || ''
  $('#announcement').value = current.announcement || ''
  $('#phone').value = current.phone || ''
  $('#whatsapp').value = current.whatsapp || ''
  $('#email').value = current.email || ''
  $('#address').value = current.address || ''
  $('#allow_cod').checked = Boolean(current.allow_cod)

  $('#settings-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    errorBox.hidden = true

    const storeName = $('#store_name').value.trim()

    if (!storeName) return showError('Store name is required.')

    const saveBtn = $('#settings-save')
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'

    const { error: saveError } = await db.from('store_settings').upsert({
      id: true,
      store_name: storeName,
      tagline: $('#tagline').value.trim(),
      announcement: $('#announcement').value.trim(),
      phone: $('#phone').value.trim(),
      whatsapp: $('#whatsapp').value.trim(),
      email: $('#email').value.trim(),
      address: $('#address').value.trim(),
      allow_cod: $('#allow_cod').checked
    })

    saveBtn.disabled = false
    saveBtn.textContent = 'Save settings'

    if (saveError) return showError(saveError.message)
    toast('Settings saved', 'ok')
  })
}

const VIEWS = {
  dashboard: viewDashboard,
  orders: viewOrders,
  products: viewProducts,
  'product-form': viewProductForm,
  categories: viewCategories,
  coupons: viewCoupons,
  customers: viewCustomers,
  settings: viewSettings
}

async function boot() {
  configNotice()
  renderShell()

  if (!isConfigured) {
    content.innerHTML = `<div class="empty">
      <div class="empty-icon">${icons.settings}</div>
      <h3>Supabase is not configured</h3>
      <p>Add your project URL and anon key in <code>js/config.js</code>, then run <code>supabase/schema.sql</code>.</p>
    </div>`
    return
  }

  const { data: allowed, error: pingError } = await db.rpc('admin_ping')
  if (pingError || allowed !== true) {
    content.innerHTML = `<div class="notice error">
      Admin access check failed. Re-run <code>supabase/schema.sql</code> in the Supabase SQL editor,
      then make sure <code>ADMIN_KEY</code> in <code>js/admin-subhan.js</code> matches the key inside
      <code>can_admin()</code> in the schema.
      ${pingError ? `<br><span class="small">${escapeHtml(pingError.message)}</span>` : ''}
    </div>`
    return
  }

  window.addEventListener('hashchange', render)
  refreshPill()
  await render()
}

boot()
