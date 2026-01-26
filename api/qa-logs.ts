import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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

  // GET - Retrieve all Q&A logs
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM qa_logs 
        ORDER BY created_at DESC 
        LIMIT 100
      `;
      return res.status(200).json({ logs: rows });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // If table doesn't exist, return empty with instructions
      return res.status(200).json({ 
        logs: [], 
        message: 'No logs yet. Initialize the table by visiting /api/qa-logs?init=true' 
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
