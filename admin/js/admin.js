import { supabase, isConfigured } from '../../js/config.js'
import { money, escapeHtml, assetUrl, icons, toast, configNotice } from '../../js/store.js'

export { supabase, isConfigured, money, escapeHtml, assetUrl, icons, toast }

const NAV = [
  { href: 'index.html', page: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { href: 'orders.html', page: 'orders', label: 'Orders', icon: 'box' },
  { href: 'products.html', page: 'products', label: 'Products', icon: 'tag' },
  { href: 'product-form.html', page: 'product-form', label: 'Add product', icon: 'plus' },
  { href: 'categories.html', page: 'categories', label: 'Categories', icon: 'grid' },
  { href: 'customers.html', page: 'customers', label: 'Customers', icon: 'users' },
  { href: 'settings.html', page: 'settings', label: 'Settings', icon: 'settings' }
]

export async function initAdmin(page, title) {
  configNotice()

  if (!isConfigured) {
    document.querySelector('.admin-content').innerHTML =
      `<div class="empty"><div class="empty-icon">${icons.settings}</div>
       <h3>Supabase is not configured</h3>
       <p>Add your project URL and anon key in <code>js/config.js</code>, then run <code>supabase/schema.sql</code>.</p></div>`
    return null
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) {
    location.href = 'login.html'
    return null
  }

  const { data: admin } = await supabase.from('admin_users').select('*').eq('id', session.user.id).maybeSingle()
  if (!admin) {
    await supabase.auth.signOut()
    location.href = 'login.html?error=not_authorized'
    return null
  }

  renderShell(page, title, session.user.email, admin)
  return { session, admin }
}

function renderShell(page, title, email, admin) {
  const sidebar = document.getElementById('sidebar')
  const topbar = document.getElementById('topbar')

  sidebar.innerHTML = `
    <a class="logo" href="../index.html">LOGA<span>GET</span><em>.PK</em></a>
    <div class="side-label">Store</div>
    ${NAV.map(
      (item) => `<a class="side-link ${item.page === page ? 'active' : ''}" href="${item.href}">
        ${icons[item.icon]}<span>${item.label}</span>
        ${item.page === 'orders' ? '<span class="pill" data-new-orders hidden>0</span>' : ''}
      </a>`
    ).join('')}
    <div class="side-foot">
      <div class="side-user">${escapeHtml(email)}<br><span style="color:var(--accent)">${escapeHtml(admin.role)}</span></div>
      <a class="side-link" href="../index.html">${icons.box}<span>View storefront</span></a>
      <button class="side-link" type="button" data-logout style="width:100%;border:0;background:none;font-family:inherit;cursor:pointer">${icons.logout}<span>Sign out</span></button>
    </div>`

  topbar.innerHTML = `
    <button class="icon-btn admin-burger" type="button" data-burger aria-label="Menu">${icons.menu}</button>
    <h1>${escapeHtml(title)}</h1>
    <div class="spacer"></div>
    <a class="btn btn-ghost btn-sm" href="../index.html">View store</a>`

  topbar.querySelector('[data-burger]').onclick = () =>
    document.getElementById('admin-layout').classList.toggle('nav-open')

  sidebar.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => document.getElementById('admin-layout').classList.remove('nav-open'))
  )

  sidebar.querySelector('[data-logout]').onclick = async () => {
    await supabase.auth.signOut()
    location.href = 'login.html'
  }

  supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
    .then(({ count }) => {
      const pill = sidebar.querySelector('[data-new-orders]')
      if (pill && count) {
        pill.textContent = count
        pill.hidden = false
      }
    })
}

export function statusBadge(status) {
  return `<span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>`
}

export function formatDate(value, withTime = true) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

export function confirmDialog(message, confirmLabel = 'Yes, continue') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-head"><h3>Are you sure?</h3></div>
        <div class="modal-body"><p style="margin:0">${escapeHtml(message)}</p></div>
        <div class="modal-foot">
          <button class="btn btn-ghost btn-sm" type="button" data-cancel>Cancel</button>
          <button class="btn btn-danger btn-sm" type="button" data-ok>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`
    const close = (value) => {
      overlay.remove()
      resolve(value)
    }
    overlay.querySelector('[data-cancel]').onclick = () => close(false)
    overlay.querySelector('[data-ok]').onclick = () => close(true)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false)
    })
    document.body.appendChild(overlay)
  })
}

export function openModal(html) {
  closeModal()
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.id = 'admin-modal'
  overlay.innerHTML = html
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal()
  })
  overlay.querySelectorAll('[data-close]').forEach((btn) => (btn.onclick = closeModal))
  document.body.appendChild(overlay)
  return overlay
}

export function closeModal() {
  document.getElementById('admin-modal')?.remove()
}

export function skeletonRows(count = 6) {
  return Array.from({ length: count })
    .map(() => `<tr><td colspan="8"><div class="sk" style="height:24px"></div></td></tr>`)
    .join('')
}

export function emptyRow(cols, title, subtitle = '') {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:44px">
    <div class="empty" style="padding:0"><div class="empty-icon">${icons.box}</div>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div></td></tr>`
}

export async function requireAdmin(page, title) {
  const ctx = await initAdmin(page, title)
  if (!ctx) throw new Error('unauthorized')
  return ctx
}
