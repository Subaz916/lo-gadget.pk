import {
  requireAdmin, supabase, money, escapeHtml, formatDate, statusBadge, icons, emptyRow
} from './admin.js'

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled']

function statCard(icon, value, label, sub = '') {
  return `<div class="stat-card">
    <div class="s-icon">${icons[icon]}</div>
    <div class="s-value">${value}</div>
    <div class="s-label">${label}</div>
    ${sub ? `<div class="s-sub">${sub}</div>` : ''}
  </div>`
}

async function load() {
  const [{ data: orders, error: ordersError }, productsResult, customersResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, customers(full_name)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('products').select('id, name, stock, is_active').order('stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true })
  ])

  if (ordersError) {
    document.getElementById('recent-orders').innerHTML = emptyRow(5, 'Could not load orders', ordersError.message)
    return
  }

  const list = orders || []
  const products = productsResult.data || []
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  let revenue = 0
  for (const order of list) {
    counts[order.status] = (counts[order.status] || 0) + 1
    if (order.status !== 'cancelled') revenue += Number(order.total)
  }

  document.getElementById('stats').innerHTML = [
    statCard('box', counts.new || 0, 'New orders', 'Awaiting confirmation'),
    statCard('tag', list.filter((o) => o.status === 'shipped').length, 'Orders shipped', 'On the way'),
    statCard('cod', money(revenue), 'Gross revenue', 'Excluding cancelled'),
    statCard('users', customersResult.count ?? 0, 'Customers', `${products.length} products in catalogue`)
  ].join('')

  const max = Math.max(1, ...STATUSES.map((s) => counts[s]))
  document.getElementById('status-bars').innerHTML = STATUSES.map(
    (status) => `<div class="bar-row">
      <span style="text-transform:capitalize">${status}</span>
      <div class="bar-track"><div class="bar-fill ${status}" style="width:${(counts[status] / max) * 100}%"></div></div>
      <b style="text-align:right">${counts[status]}</b>
    </div>`
  ).join('')

  const low = products.filter((p) => Number(p.stock) <= 5).slice(0, 7)
  document.getElementById('low-stock').innerHTML = low.length
    ? low
        .map(
          (p) => `<div class="summary-row" style="padding:9px 0;border-bottom:1px solid var(--line)">
            <span>${escapeHtml(p.name)}</span>
            <b class="${p.stock <= 0 ? '' : ''}" style="color:${p.stock <= 0 ? 'var(--danger)' : 'var(--warn)'}">${p.stock} left</b>
          </div>`
        )
        .join('')
    : '<p class="muted small" style="margin:0">All products have healthy stock levels.</p>'

  const recent = list.slice(0, 8)
  document.getElementById('recent-orders').innerHTML = recent.length
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

const ctx = await requireAdmin('dashboard', 'Dashboard')
if (ctx) load()
