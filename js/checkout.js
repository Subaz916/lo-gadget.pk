import { supabase, isConfigured } from './config.js'
import {
  mountChrome, getCart, cartSubtotal, money, escapeHtml, assetUrl, fetchSettings,
  toast, siteUrl, clearCart, deliveryEstimate
} from './store.js'

mountChrome('shop')

const form = document.getElementById('checkout-form')
const itemsEl = document.getElementById('summary-items')
const errorBox = document.getElementById('form-error')
const placeBtn = document.getElementById('place-btn')
const couponInput = document.getElementById('coupon')
const couponMsg = document.getElementById('coupon-msg')
const fsPrompt = document.getElementById('fs-prompt')
const fsApply = document.getElementById('fs-apply')

let settings = {}
let coupon = null
let placing = false

const cart = getCart()
if (!cart.length) {
  toast('Your cart is empty', 'error')
  location.href = siteUrl('cart.html')
}

function totals() {
  const subtotal = cartSubtotal()
  const freeShipping = coupon && String(coupon.code).toUpperCase() === 'FREESHIPPING250'
  let discount = 0
  if (coupon && !freeShipping) {
    discount = coupon.type === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal)
  }
  discount = Math.min(discount, subtotal)
  const shipping = freeShipping ? 0 : 250
  return { subtotal, discount, shipping, total: subtotal - discount + shipping }
}

function renderSummary() {
  itemsEl.innerHTML = cart
    .map(
      (item) => `<div class="summary-row">
        <span>${escapeHtml(item.name)}${item.variant_name ? ` <span class="small" style="color:var(--accent)">(${escapeHtml(item.variant_name)})</span>` : ''} × ${item.qty}</span>
        <b>${money(item.price * item.qty)}</b>
      </div>`
    )
    .join('')

  const t = totals()
  document.getElementById('sum-subtotal').textContent = money(t.subtotal)
  document.getElementById('sum-shipping').textContent = t.shipping === 0 ? 'Free' : money(t.shipping)
  document.getElementById('sum-total').textContent = money(t.total)
  const row = document.getElementById('row-discount')
  row.hidden = t.discount <= 0
  document.getElementById('sum-discount').textContent = '- ' + money(t.discount)
}

function setError(name, message) {
  const field = document.getElementById(name)
  const error = document.querySelector(`[data-error-for="${name}"]`)
  if (field) field.classList.toggle('invalid', Boolean(message))
  if (error) error.textContent = message || ''
}

function validPhone(value) {
  return /^(?:\+92|0092|92|0)?3\d{9}$/.test(value.replace(/[\s-]/g, ''))
}

function validate(data) {
  const errors = {}
  if (data.full_name.trim().length < 3) errors.full_name = 'Please enter your full name'
  if (!validPhone(data.phone)) errors.phone = 'Enter a valid mobile number, e.g. 0300 1234567'
  if (data.address.trim().length < 8) errors.address = 'Please enter your complete address'
  if (!data.city.trim()) errors.city = 'City is required'
  if (!data.province) errors.province = 'Province is required'
  ;['full_name', 'phone', 'address', 'city', 'province'].forEach((name) => setError(name, errors[name]))
  return Object.keys(errors).length === 0
}

function showError(message) {
  errorBox.hidden = false
  errorBox.className = 'notice error'
  errorBox.textContent = message
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function applyCoupon(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!code) return false
  if (!isConfigured) {
    toast('Connect Supabase first', 'error')
    return false
  }

  const { data, error } = await supabase.rpc('get_coupon', { p_code: code })

  if (error || !data?.length) {
    coupon = null
    couponMsg.textContent = 'Invalid or expired coupon code'
    couponMsg.style.color = 'var(--danger)'
    if (code === 'FREESHIPPING250') fsPrompt.hidden = true
    renderSummary()
    return false
  }

  coupon = data[0]
  const subtotal = cartSubtotal()
  if (subtotal < Number(coupon.min_order)) {
    const minOrder = Number(coupon.min_order)
    coupon = null
    couponMsg.textContent = `This coupon needs a minimum order of ${money(minOrder)}`
    couponMsg.style.color = 'var(--danger)'
    renderSummary()
    return false
  }

  const freeShipping = String(coupon.code).toUpperCase() === 'FREESHIPPING250'
  couponMsg.style.color = 'var(--ok)'
  couponMsg.innerHTML =
    (freeShipping
      ? `${escapeHtml(coupon.code)} applied — <b style="color:var(--accent)">shipping is now FREE</b>`
      : `Coupon ${escapeHtml(coupon.code)} applied successfully`) +
    ` <button class="btn btn-ghost btn-sm" type="button" id="coupon-remove" style="padding:2px 10px;font-size:12px;margin-left:6px">Remove</button>`
  fsPrompt.hidden = true
  renderSummary()
  return true
}

document.getElementById('coupon-btn').addEventListener('click', () => {
  applyCoupon(couponInput.value)
})

fsApply.addEventListener('click', () => {
  couponInput.value = 'FREESHIPPING250'
  applyCoupon('FREESHIPPING250')
})

couponMsg.addEventListener('click', (event) => {
  if (!event.target.closest('#coupon-remove')) return
  coupon = null
  couponInput.value = ''
  couponMsg.textContent = ''
  fsPrompt.hidden = false
  renderSummary()
})

const pendingCoupon = localStorage.getItem('lg_apply_coupon')
if (pendingCoupon) {
  localStorage.removeItem('lg_apply_coupon')
  couponInput.value = pendingCoupon
  applyCoupon(pendingCoupon)
} else {
  fsPrompt.hidden = false
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  errorBox.hidden = true

  const formData = new FormData(form)
  const customer = {
    full_name: String(formData.get('full_name') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    whatsapp: String(formData.get('whatsapp') || '').trim() || String(formData.get('phone') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    city: String(formData.get('city') || '').trim(),
    province: String(formData.get('province') || '').trim(),
    postal_code: String(formData.get('postal_code') || '').trim()
  }
  const notes = String(formData.get('notes') || '').trim()

  if (!validate(customer)) {
    showError('Please fix the highlighted fields and try again.')
    document.querySelector('.invalid')?.focus()
    return
  }

  if (!getCart().length) {
    showError('Your cart is empty.')
    return
  }

  if (!isConfigured) {
    showError('Supabase is not configured. Add your keys in js/config.js first.')
    return
  }

  placeBtn.disabled = true
  placeBtn.textContent = 'Placing order...'
  placing = true

  try {
    const { data, error } = await supabase.rpc('place_order', {
      p_customer: customer,
      p_items: getCart().map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.qty
      })),
      p_coupon_code: coupon ? coupon.code : null,
      p_notes: notes || null
    })

    if (error) throw new Error(error.message)

    sessionStorage.setItem(      'lg_last_order',
      JSON.stringify({
        order_number: data.order_number,
        subtotal: data.subtotal,
        discount: data.discount,
        shipping: data.shipping,
        total: data.total,
        coupon_code: coupon ? coupon.code : null,
        notes,
        created_at: data.created_at,
        estimate: deliveryEstimate(),
        customer,
        items: getCart().map((item) => ({
          name: item.name,
          variant_name: item.variant_name,
          price: item.price,
          qty: item.qty,
          image: item.image
        }))
      })
    )
    sessionStorage.setItem('lg_last_phone', customer.phone)
    clearCart()
    location.href = siteUrl('confirmation.html') + '?o=' + encodeURIComponent(data.order_number)
  } catch (err) {
    showError(err.message || 'Could not place your order. Please try again.')
    toast('Order failed', 'error')
    placing = false
    placeBtn.disabled = settings.allow_cod === false
    placeBtn.textContent = 'Confirm order — Cash on Delivery'
  }
})

function applyCod() {
  if (settings.allow_cod === false) {
    showError('Cash on Delivery is currently disabled. Please contact the store.')
    placeBtn.disabled = true
  } else if (!placing) {
    errorBox.hidden = true
    placeBtn.disabled = false
  }
}

fetchSettings(true).then((loaded) => {
  settings = loaded || {}
  applyCod()
  renderSummary()
})

window.addEventListener('settings:changed', (event) => {
  settings = event.detail || {}
  applyCod()
  renderSummary()
})

renderSummary()

