// capabilities/index.js
// Registers every capability the app currently knows about.
// TO ADD A NEW CAPABILITY LATER: write a new file like search.js/email.js,
// import it here, and add one line to registerAllCapabilities(). Nothing
// else in the app needs to change.

import { registerCapability } from './registry.js';
import { searchCapability } from './search.js';
import { mapsCapability } from './maps.js';
import { emailCapability } from './email.js';
import { calendarCapability } from './calendar.js';
import { documentsCapability } from './documents.js';
import { callsCapability } from './calls.js';
import { textsCapability } from './texts.js';
import { smsCapability } from './sms.js';
import { whatsappCapability } from './whatsapp.js';
import { secondaryEmailCapability } from './secondaryEmail.js';

export function registerAllCapabilities() {
  registerCapability(searchCapability);
  registerCapability(mapsCapability);
  registerCapability(emailCapability);
  registerCapability(calendarCapability);
  registerCapability(documentsCapability);
  registerCapability(callsCapability);
  registerCapability(textsCapability);
  registerCapability(smsCapability);
  registerCapability(whatsappCapability);
  registerCapability(secondaryEmailCapability);
}
