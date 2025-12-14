import express, { Request, Response } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });
const storage = new Storage();

const BUCKET_NAME = 'video-searcher-uploads';

app.get('/', (_req: Request, res: Response) => {
  res.send('Video Searcher Backend is running!');
});

app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const { originalname, buffer } = req.file;
  const blob = storage.bucket(BUCKET_NAME).file(originalname);
  const blobStream = blob.createWriteStream();
  blobStream.end(buffer);
  blobStream.on('finish', () => {
    res.status(200).send({ message: 'Upload complete', gcsUri: `gs://${BUCKET_NAME}/${originalname}` });
  });
  blobStream.on('error', err => {
    res.status(500).send({ error: err.message });
  });
});

// Stub endpoint for Vertex AI video analysis
app.post('/analyze', express.json(), async (req: Request, res: Response) => {
  const { gcsUri, prompt } = req.body;
  if (!gcsUri || !prompt) {
    return res.status(400).json({ error: 'gcsUri and prompt are required' });
  }
  // TODO: Integrate with Vertex AI Video API here
  // For now, just return a mock response
  res.json({
    message: 'Analysis started',
    jobId: 'mock-job-id',
    gcsUri,
    prompt
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
