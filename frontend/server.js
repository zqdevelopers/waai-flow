import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes (SPA support)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5173;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
});
