import { supabase, isConfigured } from './config.js'
import {
  mountChrome, qs, money, escapeHtml, assetUrl, toast, deliveryEstimate, icons
} from './store.js'

mountChrome('shop')

document.getElementById('print-btn').addEventListener('click', () => window.print())

function normalize(order) {
  const items = (order.items || []).map((item) => ({
    name: item.name || item.product_name,
    variant_name: item.variant_name || '',
    price: Number(item.price ?? item.unit_price ?? 0),
    qty: Number(item.qty ?? item.quantity ?? 1),
    line_total: Number(item.line_total || 0),
    image: item.image || ''
  }))
  return {
    order_number: order.order_number,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount ?? order.discount_amount ?? 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    coupon_code: order.coupon_code || null,
    notes: order.notes || '',
    estimate: order.estimate || deliveryEstimate(),
    customer: order.customer || {},
    items
  }
}

function render(raw) {
  const order = normalize(raw)
  document.title = `${order.order_number} — LOGADGET.PK`
  document.getElementById('cust-name').textContent = order.customer.full_name || 'customer'
  document.getElementById('order-number').textContent = order.order_number
  document.getElementById('order-estimate').textContent = `Estimated delivery: ${order.estimate}`

  const itemsEl = document.getElementById('order-items')
  if (order.items.length) {
    itemsEl.innerHTML = order.items
      .map(
        (item) => `<div class="cart-item" style="grid-template-columns:64px 1fr auto">
          <div class="thumb" style="width:64px;height:64px"><img src="${assetUrl(item.image)}" alt="${escapeHtml(item.name)}"></div>
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            ${item.variant_name ? `<div class="variant small">${escapeHtml(item.variant_name)}</div>` : ''}
            <div class="unit">${money(item.price)} × ${item.qty}</div>
          </div>
          <div class="line-total">${money(item.price * item.qty)}</div>
        </div>`
      )
      .join('')
  } else {
    itemsEl.textContent = 'Call us with your order number for the item list.'
  }

  document.getElementById('c-subtotal').textContent = money(order.subtotal)
  document.getElementById('c-shipping').textContent = order.shipping === 0 ? 'Free' : money(order.shipping)
  document.getElementById('c-total').textContent = money(order.total)
  const discountRow = document.getElementById('c-discount-row')
  discountRow.hidden = !(order.discount > 0)
  document.getElementById('c-discount').textContent = '- ' + money(order.discount)

  const c = order.customer
  document.getElementById('c-address').textContent = [c.address, c.city, c.province, c.postal_code].filter(Boolean).join(', ') || '—'
  document.getElementById('c-contact').textContent = [c.full_name, c.phone].filter(Boolean).join(' · ') || '—'

  if (order.notes) {
    document.getElementById('c-notes-wrap').hidden = false
    document.getElementById('c-notes').textContent = order.notes
  }
}

async function init() {
  const orderNumber = qs('o') || ''
  const local = sessionStorage.getItem('lg_last_order')
  let order = null

  if (local) {
    try {
      const parsed = JSON.parse(local)
      if (parsed.order_number === orderNumber) order = parsed
    } catch { order = null }
  }

  if (order) {
    render(order)
    bindWhatsApp(order)
    return
  }

  if (!orderNumber) {
    document.getElementById('order-items').textContent = 'No order to show.'
    return
  }

  document.getElementById('order-number').textContent = orderNumber

  if (!isConfigured) {
    document.getElementById('order-items').textContent = 'Connect Supabase to look up this order.'
    return
  }

  const phone = sessionStorage.getItem('lg_last_phone') || ''
  const { data, error } = await supabase.rpc('get_order', {
    p_order_number: orderNumber,
    p_phone: phone
  })

  if (error || !data) {
    document.getElementById('order-number').textContent = orderNumber
    document.getElementById('order-items').textContent =
      'Your order is saved. Save this order number — call or WhatsApp us for details.'
    document.getElementById('c-address').textContent = '—'
    document.getElementById('c-contact').textContent = '—'
    bindWhatsApp({ order_number: orderNumber, customer: {} })
    return
  }

  render(data)
  bindWhatsApp(data)
}

function bindWhatsApp(order) {
  const link = document.getElementById('wa-btn')
  const settings = JSON.parse(localStorage.getItem('lg_settings') || '{}')
  if (!settings.whatsapp) {
    link.hidden = true
    return
  }
  const message = `Hello LOGADGET.PK, my order number is ${order.order_number || ''}`
  link.href = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(message)
}

init()
