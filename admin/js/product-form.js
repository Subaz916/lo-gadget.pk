import {
  requireAdmin, supabase, assetUrl, escapeHtml, icons, toast, isConfigured
} from './admin.js'

const params = new URLSearchParams(location.search)
const productId = params.get('id')
const isEdit = Boolean(productId)

const form = document.getElementById('product-form')
const errorBox = document.getElementById('form-error')
const saveBtn = document.getElementById('save-btn')
const nameInput = document.getElementById('name')
const slugInput = document.getElementById('slug')

let categories = []
let images = []
let variants = []
let originalImageIds = new Set()
let originalVariantIds = new Set()
let slugTouched = false

document.getElementById('form-title').textContent = isEdit ? 'Edit product' : 'Add product'
document.title = `${isEdit ? 'Edit product' : 'Add product'} — LOGADGET.PK Admin`

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function showError(message) {
  errorBox.hidden = false
  errorBox.className = 'notice error'
  errorBox.textContent = message
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name')
  categories = data || []
  document.getElementById('category').innerHTML =
    '<option value="">Uncategorised</option>' +
    categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')
}

function renderImages() {
  const grid = document.getElementById('image-grid')
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
  const wrap = document.getElementById('variant-rows')
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

async function loadProduct() {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()

  if (error || !product) {
    showError('Product not found.')
    saveBtn.disabled = true
    return
  }

  document.getElementById('name').value = product.name || ''
  document.getElementById('slug').value = product.slug || ''
  document.getElementById('brand').value = product.brand || ''
  document.getElementById('category').value = product.category_id || ''
  document.getElementById('sku').value = product.sku || ''
  document.getElementById('price').value = product.price ?? ''
  document.getElementById('compare_price').value = product.compare_price ?? ''
  document.getElementById('stock').value = product.stock ?? 0
  document.getElementById('short_description').value = product.short_description || ''
  document.getElementById('description').value = product.description || ''
  document.getElementById('tags').value = (product.tags || []).join(', ')
  document.getElementById('is_active').checked = product.is_active
  document.getElementById('is_featured').checked = product.is_featured
  slugTouched = true

  const [{ data: productImages }, { data: productVariants }] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', productId).order('sort_order'),
    supabase.from('product_variants').select('*').eq('product_id', productId)
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
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
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

const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')

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

document.getElementById('image-grid').addEventListener('click', (event) => {
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
    const step = Number(move.dataset.move)
    const target = index + step
    if (target < 0 || target >= images.length) return
    ;[images[index], images[target]] = [images[target], images[index]]
    images.forEach((image, i) => (image.sort_order = i))
    renderImages()
  }
})

document.getElementById('add-variant').addEventListener('click', () => {
  variants.push({ name: '', value: '', price_adjustment: 0, stock: 0 })
  renderVariants()
})

document.getElementById('variant-rows').addEventListener('input', (event) => {
  const row = event.target.closest('[data-index]')
  if (!row || !event.target.dataset.field) return
  const field = event.target.dataset.field
  const value = event.target.value
  variants[Number(row.dataset.index)][field] =
    field === 'name' || field === 'value' ? value : Number(value || 0)
})

document.getElementById('variant-rows').addEventListener('click', (event) => {
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

async function saveImages(productId) {
  // Remove rows for images that were deleted from the form
  const removedIds = [...originalImageIds].filter((id) => !images.some((image) => image.id === id))
  if (removedIds.length) {
    await supabase.from('product_images').delete().in('id', removedIds)
    const { data } = await supabase.from('product_images').select('url').in('id', removedIds)
    await Promise.all(
      (data || []).map((image) => {
        const match = image.url.match(/product-images\/(.+)$/)
        return match ? supabase.storage.from('product-images').remove([match[1]]) : null
      })
    )
  }

  // Upload any new files and strip the local File references
  for (const image of images) {
    if (image.file) {
      image.url = await uploadFile(image.file)
      delete image.file
    }
  }

  // Re-embed sort_order = array index for every image
  images.forEach((image, index) => (image.sort_order = index))

  // Split into new and existing images
  const newImages = images.filter((image) => !image.id)
  const existingImages = images.filter((image) => image.id)

  // Insert rows for brand‑new images
  if (newImages.length) {
    const rows = newImages.map((image) => ({
      product_id: productId,
      url: image.url,
      alt: document.getElementById('name').value,
      sort_order: image.sort_order,
      is_primary: Boolean(image.is_primary)
    }))
    const { error } = await supabase.from('product_images').insert(rows)
    if (error) throw error
  }

  // Update rows that already existed in the database
  for (const image of existingImages) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: image.sort_order, is_primary: Boolean(image.is_primary), url: image.url })
      .eq('id', image.id)
    if (error) throw error
  }
}

async function saveVariants(productId) {
  const cleaned = variants
    .filter((variant) => variant.name.trim() && variant.value.trim())
    .map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      product_id: productId,
      name: variant.name.trim(),
      value: variant.value.trim(),
      price_adjustment: Number(variant.price_adjustment || 0),
      stock: Number(variant.stock || 0),
      is_active: true
    }))

  const removedIds = [...originalVariantIds].filter((id) => !cleaned.some((variant) => variant.id === id))
  if (removedIds.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', removedIds)
    if (error) throw error
  }

  const toUpdate = cleaned.filter((variant) => variant.id)
  for (const variant of toUpdate) {
    const { id, ...rest } = variant
    const { error } = await supabase.from('product_variants').update(rest).eq('id', id)
    if (error) throw error
  }

  const toInsert = cleaned.filter((variant) => !variant.id)
  if (toInsert.length) {
    const { error } = await supabase.from('product_variants').insert(toInsert)
    if (error) throw error
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  errorBox.hidden = true

  const name = nameInput.value.trim()
  const slug = slugify(slugInput.value || name)
  const price = Number(document.getElementById('price').value)
  const comparePrice = Number(document.getElementById('compare_price').value)
  const stock = Number(document.getElementById('stock').value)

  if (name.length < 3) return showError('Product name must be at least 3 characters.')
  if (!slug) return showError('URL slug is required.')
  if (!Number.isFinite(price) || price < 0) return showError('Enter a valid price.')
  if (comparePrice && comparePrice < price) return showError('Compare price cannot be lower than the selling price.')
  if (!Number.isFinite(stock) || stock < 0) return showError('Stock must be zero or more.')

  saveBtn.disabled = true
  saveBtn.textContent = 'Saving...'

  try {
    const payload = {
      name,
      slug,
      brand: document.getElementById('brand').value.trim() || null,
      category_id: document.getElementById('category').value || null,
      sku: document.getElementById('sku').value.trim() || null,
      price,
      compare_price: comparePrice || null,
      stock: Math.round(stock),
      short_description: document.getElementById('short_description').value.trim() || null,
      description: document.getElementById('description').value.trim() || null,
      tags: document.getElementById('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      is_active: document.getElementById('is_active').checked,
      is_featured: document.getElementById('is_featured').checked
    }

    let savedId = productId
    if (isEdit) {
      const { error } = await supabase.from('products').update(payload).eq('id', productId)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single()
      if (error) throw error
      savedId = data.id
    }

    await saveImages(savedId)
    await saveVariants(savedId)

    toast(isEdit ? 'Product updated' : 'Product created', 'ok')
    location.href = 'products.html'
  } catch (err) {
    showError(err.message || 'Could not save the product.')
    saveBtn.disabled = false
    saveBtn.textContent = 'Save product'
  }
})

const ctx = await requireAdmin('product-form', isEdit ? 'Edit product' : 'Add product')
if (ctx && isConfigured) {
  await loadCategories()
  if (isEdit) await loadProduct()
  renderImages()
  renderVariants()
} else if (ctx) {
  saveBtn.disabled = true
}
