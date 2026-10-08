import {
  mountChrome, getCart, setCartQty, removeFromCart, cartSubtotal, cartCount,
  money, escapeHtml, assetUrl, emptyState, icons, toast, siteUrl
} from './store.js'

mountChrome('shop')

const layout = document.getElementById('cart-layout')
const emptyEl = document.getElementById('cart-empty')
const itemsEl = document.getElementById('cart-items')
const fsBanner = document.getElementById('fs-banner')
const fsApply = document.getElementById('fs-apply')

function renderFsBanner(hasItems) {
  fsBanner.hidden = !hasItems
  const applied = localStorage.getItem('lg_apply_coupon') === 'FREESHIPPING250'
  fsApply.textContent = applied ? 'Applied ✓' : 'Apply code'
  fsApply.disabled = applied
}

fsApply.addEventListener('click', () => {
  localStorage.setItem('lg_apply_coupon', 'FREESHIPPING250')
  toast('Code saved — it will be applied at checkout', 'ok')
  renderFsBanner(true)
})

function render() {
  const cart = getCart()
  renderFsBanner(cart.length > 0)

  if (!cart.length) {
    layout.hidden = true
    emptyEl.hidden = false
    emptyEl.innerHTML = emptyState(
      'Your cart is empty',
      'Browse the store and add some gadgets.',
      `<a class="btn btn-primary" href="${siteUrl('products.html')}">Start shopping</a>`
    )
    return
  }

  emptyEl.hidden = true
  layout.hidden = false

  itemsEl.innerHTML = cart
    .map(
      (item) => `<div class="cart-item" data-key="${escapeHtml(item.key)}">
        <a class="thumb" href="${siteUrl('product.html')}?id=${encodeURIComponent(item.product_id)}">
          <img src="${assetUrl(item.image)}" alt="${escapeHtml(item.name)}">
        </a>
        <div>
          <h4><a href="${siteUrl('product.html')}?id=${encodeURIComponent(item.product_id)}">${escapeHtml(item.name)}</a></h4>
          ${item.variant_name ? `<div class="variant">${escapeHtml(item.variant_name)}</div>` : ''}
          <div class="unit">${money(item.price)} each</div>
        </div>
        <div class="cart-side">
          <div class="qty">
            <button type="button" data-dec aria-label="Decrease">${icons.minus}</button>
            <input type="number" value="${item.qty}" min="1" max="${item.stock}" data-qty aria-label="Quantity">
            <button type="button" data-inc aria-label="Increase">${icons.plus}</button>
          </div>
          <div class="line-total">${money(item.price * item.qty)}</div>
          <button class="btn btn-danger btn-sm" type="button" data-remove>${icons.trash} Remove</button>
        </div>
      </div>`
    )
    .join('')

  const subtotal = cartSubtotal()
  document.getElementById('sum-subtotal').textContent = money(subtotal)
  document.getElementById('sum-count').textContent = String(cartCount())
  document.getElementById('sum-total').textContent = money(subtotal)
}

itemsEl.addEventListener('click', (event) => {
  const row = event.target.closest('[data-key]')
  if (!row) return
  const key = row.dataset.key
  const item = getCart().find((row2) => row2.key === key)
  if (!item) return

  if (event.target.closest('[data-remove]')) {
    removeFromCart(key)
    toast('Item removed', 'ok')
    render()
    return
  }
  if (event.target.closest('[data-inc]')) {
    setCartQty(key, item.qty + 1)
    render()
    return
  }
  if (event.target.closest('[data-dec]')) {
    if (item.qty <= 1) {
      removeFromCart(key)
      toast('Item removed', 'ok')
    } else {
      setCartQty(key, item.qty - 1)
    }
    render()
  }
})

itemsEl.addEventListener('change', (event) => {
  const input = event.target.closest('[data-qty]')
  if (!input) return
  const row = input.closest('[data-key]')
  setCartQty(row.dataset.key, Number(input.value))
  render()
})

window.addEventListener('cart:changed', render)

render()
