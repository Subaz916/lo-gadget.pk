import { supabase, isConfigured } from './config.js'
import { mountChrome, qs, money, escapeHtml, deliveryEstimate, fetchSettings, toast } from './store.js'

mountChrome('track')

const form = document.getElementById('track-form')
const orderInput = document.getElementById('track-order')
const phoneInput = document.getElementById('track-phone')
const errorBox = document.getElementById('track-error')
const trackBtn = document.getElementById('track-btn')
const result = document.getElementById('track-result')
const shareBlock = document.getElementById('tr-share')
const linkInput = document.getElementById('tr-link')
const copyBtn = document.getElementById('tr-copy')
const shareWa = document.getElementById('tr-share-wa')

const STEPS = [
  { key: 'new', label: 'Order placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' }
]

const BADGES = {
  new: ['var(--muted)', 'Order placed'],
  confirmed: ['var(--accent)', 'Confirmed'],
  shipped: ['#ffd166', 'Shipped'],
  delivered: ['var(--accent)', 'Delivered'],
  cancelled: ['var(--danger)', 'Cancelled']
}

function showError(message) {
  errorBox.hidden = false
  errorBox.className = 'notice error'
  errorBox.textContent = message
}

function statusPill(status) {
  const [color, label] = BADGES[status] || ['var(--muted)', status]
  return `<span style="display:inline-block;padding:5px 14px;border-radius:99px;border:1px solid ${color};color:${color};font-weight:700;font-size:13px">${escapeHtml(label)}</span>`
}

function timeline(status) {
  const index = STEPS.findIndex((step) => step.key === status)
  if (status === 'cancelled') {
    return `<div class="notice error" style="margin-top:10px">This order was cancelled. Contact us on WhatsApp for details.</div>`
  }
  return `<div class="tr-steps">
    ${STEPS.map((step, i) => {
      const done = status === 'delivered' ? true : i <= index
      const current = i === index
      const color = done ? 'var(--accent)' : 'var(--surface-3)'
      return `<div class="tr-step">
        <div class="dot" style="background:${done ? 'var(--accent)' : 'var(--surface-2)'};color:${done ? '#0a0b0f' : 'var(--muted)'};border-color:${color}">${done ? '✓' : i + 1}</div>
        <div class="bar" style="background:${color}"></div>
        <div class="lbl" style="${current ? 'color:var(--text);font-weight:700' : ''}">${step.label}</div>
      </div>`
    }).join('')}
  </div>`
}

function render(raw) {
  const order = {
    order_number: raw.order_number,
    status: raw.status,
    subtotal: Number(raw.subtotal || 0),
    discount: Number(raw.discount_amount || 0),
    shipping: Number(raw.shipping || 0),
    total: Number(raw.total || 0),
    coupon_code: raw.coupon_code || null,
    notes: raw.notes || '',
    created_at: raw.created_at || '',
    customer: raw.customer || {},
    items: (raw.items || []).map((item) => ({
      name: item.product_name,
      variant_name: item.variant_name || '',
      price: Number(item.unit_price || 0),
      qty: Number(item.quantity || 1),
      line_total: Number(item.line_total || 0)
    }))
  }

  document.title = `${order.order_number} — LOGADGET.PK`
  document.getElementById('tr-number').textContent = order.order_number
  document.getElementById('tr-badge').innerHTML = statusPill(order.status)
  document.getElementById('tr-timeline').innerHTML = timeline(order.status)
  document.getElementById('tr-placed').textContent = order.created_at
    ? `Placed on ${new Date(order.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Estimated delivery: ${deliveryEstimate()}`
    : `Estimated delivery: ${deliveryEstimate()}`

  const itemsEl = document.getElementById('tr-items')
  itemsEl.innerHTML = order.items.length
    ? order.items
        .map(
          (item) => `<div class="cart-item" style="grid-template-columns:1fr auto">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              ${item.variant_name ? `<div class="variant small">${escapeHtml(item.variant_name)}</div>` : ''}
              <div class="unit">${money(item.price)} × ${item.qty}</div>
            </div>
            <div class="line-total">${money(item.line_total)}</div>
          </div>`
        )
        .join('')
    : 'Call us with your order number for the item list.'

  document.getElementById('tr-subtotal').textContent = money(order.subtotal)
  document.getElementById('tr-shipping').textContent = order.shipping === 0 ? 'Free' : money(order.shipping)
  document.getElementById('tr-total').textContent = money(order.total)
  const discountRow = document.getElementById('tr-discount-row')
  discountRow.hidden = !(order.discount > 0)
  document.getElementById('tr-discount').textContent = '- ' + money(order.discount)

  const c = order.customer
  document.getElementById('tr-address').textContent =
    [c.address, c.city, c.province].filter(Boolean).join(', ') || '—'
  document.getElementById('tr-contact').textContent =
    [c.full_name, c.phone].filter(Boolean).join(' · ') || '—'

  const notesWrap = document.getElementById('tr-notes-wrap')
  notesWrap.hidden = !order.notes
  document.getElementById('tr-notes').textContent = order.notes || ''

  const waBtn = document.getElementById('tr-wa')
  fetchSettings().then((settings) => {
    if (settings.whatsapp) {
      const message = `Hello LOGADGET.PK, I am checking my order ${order.order_number}`
      waBtn.href = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(message)
      waBtn.hidden = false
    }
  })

  const shareUrl = `${location.origin}${location.pathname}?o=${encodeURIComponent(order.order_number)}&p=${encodeURIComponent(phoneInput.value.trim())}`
  linkInput.value = shareUrl
  shareWa.href = 'https://wa.me/?text=' + encodeURIComponent(`Track your LOGADGET.PK order ${order.order_number}:\n${shareUrl}`)
  shareBlock.hidden = false

  result.hidden = false
  result.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function track() {
  const orderNumber = orderInput.value.trim()
  const phone = phoneInput.value.trim()

  errorBox.hidden = true
  if (!orderNumber || !phone) {
    showError('Enter both your order number and phone number.')
    return
  }

  if (!isConfigured) {
    showError('Connect Supabase to look up orders.')
    return
  }

  trackBtn.disabled = true
  trackBtn.textContent = 'Looking up order...'

  const { data, error } = await supabase.rpc('get_order', {
    p_order_number: orderNumber,
    p_phone: phone
  })

  trackBtn.disabled = false
  trackBtn.textContent = 'Track order'

  if (error) {
    showError(error.message || 'Could not look up this order. Please try again.')
    return
  }
  if (!data || !data.order_number) {
    showError('No order found. Check the order number and phone number you used when ordering.')
    return
  }

  sessionStorage.setItem('lg_last_phone', phone)
  render(data)
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  track()
})

linkInput.addEventListener('click', () => linkInput.select())

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(linkInput.value)
  } catch {
    linkInput.select()
    document.execCommand('copy')
  }
  toast('Tracking link copied', 'ok')
})

const presetOrder = qs('o')
const presetPhone = qs('p')
if (presetOrder) orderInput.value = presetOrder
if (presetPhone) {
  phoneInput.value = presetPhone
} else {
  const lastPhone = sessionStorage.getItem('lg_last_phone')
  if (lastPhone) phoneInput.value = lastPhone
}
if (presetOrder && phoneInput.value) track()
