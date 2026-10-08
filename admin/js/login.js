import { supabase, isConfigured } from '../../js/config.js'

const form = document.getElementById('login-form')
const errorBox = document.getElementById('error-box')
const button = document.getElementById('login-btn')

function showError(message) {
  errorBox.hidden = false
  errorBox.textContent = message
}

const params = new URLSearchParams(location.search)
if (params.get('error') === 'not_authorized') {
  showError('This account does not have admin access.')
}

if (isConfigured) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'index.html'
  })
} else {
  showError('Supabase is not configured. Add your keys in js/config.js first.')
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (!isConfigured) return

  errorBox.hidden = true
  button.disabled = true
  button.textContent = 'Signing in...'

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    showError(error.message)
    button.disabled = false
    button.textContent = 'Sign in'
    return
  }

  const { data: admin } = await supabase.from('admin_users').select('id').eq('id', data.user.id).maybeSingle()

  if (!admin) {
    await supabase.auth.signOut()
    showError('This account is not authorised for the admin panel.')
    button.disabled = false
    button.textContent = 'Sign in'
    return
  }

  location.href = 'index.html'
})
