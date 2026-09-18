// capabilities/index.js
// Registers every capability the app currently knows about.
// TO ADD A NEW CAPABILITY LATER: write a new file like search.js/email.js,
// import it here, and add one line to registerAllCapabilities(). Nothing
// else in the app needs to change.

import { registerCapability } from './registry.js';
import { searchCapability } from './search.js';
import { emailCapability } from './email.js';
import { calendarCapability } from './calendar.js';
import { documentsCapability } from './documents.js';
import { callsCapability } from './calls.js';
import { textsCapability } from './texts.js';

export function registerAllCapabilities() {
  registerCapability(searchCapability);
  registerCapability(emailCapability);
  registerCapability(calendarCapability);
  registerCapability(documentsCapability);
  registerCapability(callsCapability);
  registerCapability(textsCapability);
}
