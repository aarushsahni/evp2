import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';

// Function to log Q&A to database
async function logQA(sessionId: string, question: string, answer: string, followUps: string[]) {
  try {
    await sql`
      INSERT INTO qa_logs (session_id, question, answer, follow_up_questions, created_at)
      VALUES (${sessionId}, ${question}, ${answer}, ${JSON.stringify(followUps)}, NOW())
    `;
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to log Q&A:', error);
  }
}

const SYSTEM_PROMPT = `
You are a CLINICAL SUPPORT ASSISTANT for urologists managing patients who may receive or have received Enfortumab Vedotin + Pembrolizumab (EVP) for urothelial carcinoma.

## Audience & Voice
- Audience: attending urologists.
- Voice: detailed, professional peer; no patient-facing tone; no speculation.

## Evidence Boundary (HARD SCOPE)
Use **only** these sources. Do not derive, generalize, or cite anything else.
1) **FDA Label — Enfortumab Vedotin (PADCEV)**
2) **FDA Label — Pembrolizumab (KEYTRUDA)**
3) **EV-302 (NEJM 2023)** — first-line metastatic RCT; efficacy & toxicity.
4) **EV-303 / KEYNOTE-905 (Merck press release, 2025)** — *pre-publication* perioperative; use only explicit statements (schedule, endpoints, topline outcomes).
5) **ASCO 2021 irAE Guideline (Schneider et al.)** — recognition/escalation principles.

If a requested fact is not present in these sources, state: **"Data not yet reported in the available literature."**

## Output Format (ALWAYS)
1️⃣ **Summary Answer (1–2 sentences)** — direct, source-bounded conclusion.
2️⃣ **Evidence Details (3–6 compact bullets)** — each bullet ends with a citation tag.
   - When asked about duration, include **dose, frequency, cycle length, continuation/hold/stop language** as written in the FDA labels or trials.
   - Distinguish **metastatic (EV-302)** vs **perioperative (EV-303)** and mark EV-303 as **— *pre-publication***.
   - Report **numbers exactly** (medians, HR with 95% CI, AE rates).
3️⃣ **Deferral Note (if applicable)** — "**Final management decisions should be made in consultation with medical oncology.**"

## Adjacent-Question Handling (Think-Ahead)
When relevant, proactively add tightly scoped bullets (still source-bound) that urologists commonly need:
- **Regimen schema:** drug(s), dose(s), route(s), cycle length and frequency; when therapy continues or stops per label. *(FDA EV Label §…; FDA Pembro Label §…)*
- **Trial context:** line of therapy, randomization, control arm, primary endpoints. *(EV-302 (NEJM 2023))*
- **Efficacy (EV-302):** OS, PFS, ORR with exact values and HR/CI. *(EV-302 (NEJM 2023))*
- **Safety:** common and serious AEs (incl. neuropathy, rash, hyperglycemia), grade ≥3 rate, discontinuations. *(EV-302; FDA Labels §6)*
- **Immune AEs:** recognition/when to escalate; high-level principles only. *(ASCO irAE Guideline (2021))*
- **Perioperative (EV-303):** neoadjuvant/adjuvant framing, schedule and endpoints only if stated; clearly mark **— *pre-publication***.
  If surgery timing is not stated, say it explicitly. *(EV-303/KEYNOTE-905 press release, 2025 — *pre-publication*)*

## Citations (STRICT)
- Put a citation at the end of any line with a claim.
- Allowed tags: **FDA EV Label §<section>**, **FDA Pembro Label §<section>**, **EV-302 (NEJM 2023)**, **EV-303/KEYNOTE-905 (Merck press release, 2025) — *pre-publication***, **ASCO irAE Guideline (2021)**.

## Safety & Boundaries
- If scenario suggests ≥Grade 2 immune event, pneumonitis, severe rash/SJS/TEN, glucose >250 mg/dL, or function-limiting neuropathy:
  **First bullet:** "Potential serious toxicity — urgent evaluation and referral to medical oncology (and emergency care as indicated)." *(ASCO irAE Guideline (2021))*
- Do not give individualized steroid regimens or dose modifications beyond what is explicitly in the FDA labels.
- For therapy initiation/cessation or dose changes, provide evidence context only and include the deferral note.

## Style Rules
- Compact bullets; no conversational filler.
- Use exact numbers/wording when quoting; if quoting verbatim, use quotation marks.
- Clearly label metastatic vs perioperative data.
- If not reported, state it plainly.
`;

interface ThreadState {
  [key: string]: string;
}

const threadStates: ThreadState = {};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId, assistantId } = req.body;

    if (!message || !sessionId || !assistantId) {
      return res
        .status(400)
        .json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'OpenAI API key not configured' });
    }

    const client = new OpenAI({ apiKey });

    let threadId = threadStates[sessionId];

    if (!threadId) {
      const thread = await client.beta.threads.create();
      threadId = thread.id;
      threadStates[sessionId] = threadId;
    }

    await client.beta.threads.messages.create(threadId, {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    });

    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: SYSTEM_PROMPT,
    });

    let runStatus = await client.beta.threads.runs.retrieve(run.id, {
      thread_id: threadId,
    });

    while (runStatus.status !== 'completed') {
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        const errorMessage =
          runStatus.last_error?.message ||
          `Run ended with status: ${runStatus.status}`;
        throw new Error(errorMessage);
      }
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await client.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
    }

    const messages = await client.beta.threads.messages.list(threadId);

    const assistantMessage = messages.data.find(
      (m) => m.role === 'assistant' && m.run_id === run.id
    ) || messages.data.find((m) => m.role === 'assistant');

    if (assistantMessage) {
      const parts: string[] = [];

      for (const item of assistantMessage.content) {
        if (item.type === 'text' && item.text?.value) {
          let value = item.text.value.trim();
          
          // Process annotations to replace citation markers with actual source names
          if (item.text.annotations && item.text.annotations.length > 0) {
            // Build a map of file IDs to file names
            const fileNameCache: { [key: string]: string } = {};
            
            // Sort annotations by start_index descending to replace from end to start
            // This prevents index shifting issues when replacing
            const sortedAnnotations = [...item.text.annotations].sort(
              (a, b) => (b.start_index || 0) - (a.start_index || 0)
            );
            
            for (const annotation of sortedAnnotations) {
              if (annotation.type === 'file_citation' && annotation.file_citation) {
                const fileId = annotation.file_citation.file_id;
                let fileName = fileNameCache[fileId];
                
                // Fetch file name if not cached
                if (!fileName && fileId) {
                  try {
                    const file = await client.files.retrieve(fileId);
                    fileName = file.filename || 'Unknown Source';
                    // Remove file extension for cleaner display
                    fileName = fileName.replace(/\.[^/.]+$/, '');
                    fileNameCache[fileId] = fileName;
                  } catch {
                    fileName = 'Source';
                  }
                }
                
                // Replace the citation marker with the actual source name
                if (annotation.text && fileName) {
                  value = value.replace(
                    annotation.text,
                    `【${fileName}】`
                  );
                }
              }
            }
          }
          
          if (value) {
            parts.push(value);
          }
        }
      }

      if (parts.length > 0) {
        const mainResponse = parts.join('\n\n');
        
        // Generate contextual follow-up questions
        let followUpQuestions: string[] = [];
        try {
          const followUpCompletion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are helping a urologist explore clinical questions about Enfortumab Vedotin + Pembrolizumab (EVP) therapy for urothelial carcinoma.

Based on the user's question and the assistant's response, generate exactly 3 brief follow-up questions that a urologist might naturally ask next. 

Rules:
- Questions should be clinically relevant and build on the current topic
- Keep questions concise (under 15 words each)
- Focus on practical clinical concerns: dosing, toxicity management, patient selection, monitoring
- Return ONLY the 3 questions, one per line, no numbering or bullets`
              },
              {
                role: 'user',
                content: `User asked: "${message}"\n\nAssistant responded with information about: ${mainResponse.substring(0, 500)}...`
              }
            ],
            max_tokens: 200,
            temperature: 0.7,
          });
          
          const followUpText = followUpCompletion.choices[0]?.message?.content || '';
          followUpQuestions = followUpText
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0 && q.length < 100)
            .slice(0, 3);
        } catch (followUpError) {
          console.error('Failed to generate follow-up questions:', followUpError);
          // Continue without follow-up questions
        }
        
        // Log Q&A to database (non-blocking)
        logQA(sessionId, message, mainResponse, followUpQuestions);
        
        return res.status(200).json({ 
          response: mainResponse,
          followUpQuestions 
        });
      }
    }

    throw new Error('Unexpected response format — no text message found');
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}
