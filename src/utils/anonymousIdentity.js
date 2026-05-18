const USER_ID_KEY = 'anonymous_chat_user_id'
const USER_NAME_KEY = 'anonymous_chat_user_name'
const NAME_PREFIXES = ['Anonymous', 'Guest', 'User']

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function makeName() {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)]
  const number = Math.floor(10 + Math.random() * 990)
  return `${prefix}-${number}`
}

export function getAnonymousIdentity() {
  let id = localStorage.getItem(USER_ID_KEY)
  let name = localStorage.getItem(USER_NAME_KEY)

  if (!id) {
    id = makeId()
    localStorage.setItem(USER_ID_KEY, id)
  }

  if (!name) {
    name = makeName()
    localStorage.setItem(USER_NAME_KEY, name)
  }

  return { id, name }
}
