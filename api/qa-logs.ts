import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// Set this in your Vercel environment variables (Settings > Environment Variables)
// Add a variable called QA_LOGS_SECRET with a strong random string
function isAuthorized(req: VercelRequest): boolean {
  const secret = process.env.QA_LOGS_SECRET;
  if (!secret) return false;

  // Check for secret in query param or Authorization header
  const querySecret = req.query.secret as string;
  const headerSecret = req.headers.authorization?.replace('Bearer ', '');

  return querySecret === secret || headerSecret === secret;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // All requests to this endpoint require authentication
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Initialize table on first request or GET with ?init=true
  if (req.method === 'GET' && req.query.init === 'true') {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          conversation_id VARCHAR(255) UNIQUE NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          messages JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      return res.status(200).json({ message: 'Table initialized successfully' });
    } catch (error) {
      console.error('Failed to initialize table:', error);
      return res.status(500).json({ error: 'Failed to initialize table' });
    }
  }

  // GET - Retrieve all conversations (full Q&A as JSON)
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, conversation_id, session_id, messages, created_at, updated_at
        FROM conversations 
        ORDER BY updated_at DESC
      `;
      return res.status(200).json({ conversations: rows });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      return res.status(200).json({ 
        conversations: [], 
        message: 'No data yet. Initialize by visiting /api/qa-logs?init=true&secret=YOUR_SECRET' 
      });
    }
  }

  // DELETE - Clear all conversations
  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM conversations`;
      return res.status(200).json({ message: 'All conversations cleared' });
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      return res.status(500).json({ error: 'Failed to clear conversations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
