// GuardianDrive backend entrypoint
import { createApp } from './app.js';

const PORT = process.env.PORT || 8788;
const app = createApp();

app.listen(PORT, () => {
  console.log(`GuardianDrive backend running at http://localhost:${PORT}`);
});
