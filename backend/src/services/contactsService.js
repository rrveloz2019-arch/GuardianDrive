// contactsService.js
// A small local address book so spoken commands like "call my wife" or
// "text John" can be resolved to a real phone number. Stored in
// data/contacts.json (same pattern as commandMappingService.js).
//
// This is intentionally simple - no device contacts sync, no external API.
// You add contacts once in the dashboard (name + any aliases + phone
// number), and voice commands match against name/aliases.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/contacts.json');

async function readContacts() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeContacts(contacts) {
  await writeFile(DATA_FILE, JSON.stringify(contacts, null, 2), 'utf-8');
}

export async function listContacts() {
  return readContacts();
}

export async function addContact({ name, aliases, phone }) {
  if (!name) throw new Error('name is required');
  if (!phone) throw new Error('phone is required');
  const contacts = await readContacts();
  const contact = {
    id: randomUUID(),
    name,
    // aliases let "my wife", "the boss", etc. resolve to a real contact -
    // free-text, lowercased on match.
    aliases: Array.isArray(aliases) ? aliases : (aliases ? [aliases] : []),
    phone,
  };
  contacts.push(contact);
  await writeContacts(contacts);
  return contact;
}

export async function removeContact(id) {
  const contacts = await readContacts();
  const next = contacts.filter((c) => c.id !== id);
  await writeContacts(next);
  return next;
}

// Resolve a spoken reference ("my wife", "john", "Maria Lopez") to a
// contact. Matches on name or any alias, case-insensitive, substring-
// tolerant in either direction so "call john" matches a contact named
// "John Smith" and "call my wife" matches an alias "my wife".
export async function resolveContact(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const contacts = await readContacts();

  // Exact match first (name or alias)
  let match = contacts.find(
    (c) => c.name.toLowerCase() === q || c.aliases.some((a) => a.toLowerCase() === q)
  );
  if (match) return match;

  // Substring match as a fallback
  match = contacts.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      q.includes(c.name.toLowerCase()) ||
      c.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
  );
  return match || null;
}
