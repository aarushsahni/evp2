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
        CREATE TABLE IF NOT EXISTS qa_logs (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          follow_up_questions TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      return res.status(200).json({ message: 'Table initialized successfully' });
    } catch (error) {
      console.error('Failed to initialize table:', error);
      return res.status(500).json({ error: 'Failed to initialize table' });
    }
  }

  // GET - Retrieve all Q&A logs (no limit)
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM qa_logs 
        ORDER BY created_at DESC
      `;
      return res.status(200).json({ logs: rows });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return res.status(200).json({ 
        logs: [], 
        message: 'No logs yet. Initialize the table by visiting /api/qa-logs?init=true&secret=YOUR_SECRET' 
      });
    }
  }

  // DELETE - Clear all logs (optional, for cleanup)
  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM qa_logs`;
      return res.status(200).json({ message: 'All logs cleared' });
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return res.status(500).json({ error: 'Failed to clear logs' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
