import { DEMO_USERS } from '../data/demoUsers';

const USERS_KEY = 'labware-demo-users-v2';
const SESSION_KEY = 'labware-demo-session-v2';
const ITERATIONS = 150000;

try {
  localStorage.removeItem('labware-demo-password');
} catch {
  // Local storage may be unavailable; the legacy value is never used by this service.
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value) {
  return new Uint8Array(value.match(/.{1,2}/g).map(byte => Number.parseInt(byte, 16)));
}

function getStoredUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: ITERATIONS }, key, 256);
  return bytesToHex(bits);
}

function safeUser(user) {
  return Object.fromEntries(Object.entries(user).filter(([key]) => key !== 'passwordHash' && key !== 'salt'));
}

function findUser(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return [...DEMO_USERS, ...getStoredUsers()].find(user => user.email.toLowerCase() === normalized);
}

export function getSessionUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session?.userId) return null;
    const user = [...DEMO_USERS, ...getStoredUsers()].find(candidate => candidate.id === session.userId);
    return user ? safeUser(user) : null;
  } catch {
    return null;
  }
}

export async function signIn(email, password) {
  const user = findUser(email);
  if (!user || await hashPassword(String(password || ''), user.salt) !== user.passwordHash) {
    throw new Error('E-mail ou senha incorretos.');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return safeUser(user);
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (findUser(normalizedEmail)) throw new Error('Este e-mail já está cadastrado.');
  if (String(password || '').length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  const user = {
    id: `client-${crypto.randomUUID()}`,
    name: String(name || '').trim(),
    email: normalizedEmail,
    role: 'client',
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  const users = getStoredUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return safeUser(user);
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
