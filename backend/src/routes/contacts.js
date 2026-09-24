// routes/contacts.js - simple address book so voice commands can resolve
// "call my wife" etc. to a real phone number.
import { Router } from 'express';
import { listContacts, addContact, removeContact } from '../services/contactsService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await listContacts());
});

router.post('/', async (req, res) => {
  try {
    const contact = await addContact(req.body || {});
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const remaining = await removeContact(req.params.id);
  res.json(remaining);
});

export default router;
