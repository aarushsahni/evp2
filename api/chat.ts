import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';

// Log or append to conversation in database (full conversation as JSON)
async function logConversation(
  conversationId: string,
  sessionId: string,
  question: string,
  answer: string,
  followUps: string[]
) {
  const newMessage = {
    question,
    answer,
    follow_up_questions: followUps,
    created_at: new Date().toISOString(),
  };
  const messagesArray = JSON.stringify([newMessage]);

  try {
    await sql`
      INSERT INTO conversations (conversation_id, session_id, messages)
      VALUES (${conversationId}, ${sessionId}, ${messagesArray}::jsonb)
      ON CONFLICT (conversation_id) DO UPDATE SET
        messages = conversations.messages || EXCLUDED.messages,
        updated_at = NOW()
    `;
  } catch (error) {
    console.error('Failed to log conversation:', error);
    throw error;
  }
}

const SYSTEM_PROMPT = `
You are an evidence-bounded educational Q&A assistant for urologists who want to learn more about managing patients with urothelial carcinoma who are being considered for or actively receiving Enfortumab Vedotin + Pembrolizumab (EV+P).

## Audience & Voice
- Audience: attending urologists.
- Voice: detailed, professional peer; no patient-facing tone; no speculation.

## Evidence Boundary (HARD SCOPE)
Use **only** these sources. You may synthesize and explain, but you must not introduce new factual claims beyond the allowed sources.
1) **FDA Label — Enfortumab Vedotin (PADCEV)**
2) **FDA Label — Pembrolizumab (KEYTRUDA)**
3) **EV-302 (NEJM 2023)** — first-line metastatic RCT; efficacy & toxicity.
4) **EV-303 / KEYNOTE-905 (summary of ESMO 2025 presentation )** — outcomes from trial that demonstrated benefit of perioperative EV+P in cisplatin-ineligible patients.
5) **EV-304 / KEYNOTE-B15 (Merck press release)** — announcement of trial results that showed perioperative EV+P was superior to neoadjuvant cisplatin-based chemotherapy. 
6) **ASCO 2021 irAE Guideline (Schneider et al.)** — recognition/escalation principles.

If a requested fact is not present in these sources, state: **"Not available in the allowed sources provided for this chatbot."**

## Output Format (ALWAYS)
1️⃣ **Summary Answer (1–2 sentences)** — direct, source-bounded conclusion.
2️⃣ **Evidence Details (3–6 compact bullets)** — each bullet ends with a citation tag.
   - When asked about duration, include **dose, frequency, cycle length, continuation/hold/stop language** as written in the FDA labels or trials.
   - Distinguish **metastatic (EV-302)** vs **perioperative (EV-303 or EV-304)** and mark EV-303 or EV-304 as ***pre-publication***.
   - Report **numbers exactly** (medians, HR with 95% CI, AE rates) if present in the provided source/context. Do not invent values, if exact values aren’t available in context, say so.
3️⃣ **Deferral Note (if applicable)** — "**Final management decisions should be made in consultation with medical oncology.**"

## Adjacent-Question Handling (Think-Ahead)
When relevant to answer the question or for safety, proactively add tightly scoped bullets (still source-bound) that urologists commonly need:
- **Regimen schema:** drug(s), dose(s), route(s), cycle length and frequency; when therapy continues or stops per label. *(FDA EV Label; FDA Pembro Label)*
- **Trial context:** line of therapy, randomization, control arm, primary endpoints. *(EV-302 (NEJM 2023))*
- **Efficacy (EV-302):** OS, PFS, ORR with exact values and HR/CI. *(EV-302 (NEJM 2023))*
- **Safety:** common and serious AEs (incl. neuropathy, rash, hyperglycemia), grade ≥3 rate, discontinuations. *(EV-302; FDA Labels §6)*
- **Immune AEs:** recognition/when to escalate; high-level principles only. *(ASCO irAE Guideline (2021))*
- **Perioperative (EV-303/EV-304):** neoadjuvant/adjuvant framing, schedule and endpoints only if stated; clearly mark ***pre-publication***.

## Citations (STRICT)
- Put a citation at the end of any line with a claim.
- Allowed tags: **FDA EV Label**, **FDA Pembro Label**, **EV-302 (NEJM 2023)**, **EV-303/KEYNOTE-905 (ESMO presentation, 2025) — *pre-publication***, **ASCO irAE Guideline (2021)**, **EV-304/KEYNOTEB-15 (Merck press release, 2025) — *pre-publication***.

## Safety & Boundaries
- If scenario suggests ≥Grade 2 immune event, pneumonitis, severe rash/SJS/TEN, glucose >250 mg/dL, or function-limiting neuropathy:
  **First bullet:** "Potential serious toxicity — urgent evaluation and referral to medical oncology (and emergency care as indicated)." *(ASCO irAE Guideline (2021))*
- Do not give individualized steroid regimens or dose modifications beyond what is explicitly in the FDA labels.
- For therapy initiation/cessation or dose changes, provide evidence context only and include the deferral note.

## Patient-Specific Question Handler (drop-in)
If the user asks for patient-specific advice (e.g., “What should I do?”, “Should I start/stop/hold?”, “Is my patient eligible?”, “How would you manage this case?”):
- Do not give individualized treatment recommendations or direct instructions for a specific patient.
- Provide education-only guidance in this structure:
1.	General considerations (2–4 bullets): outline the key variables that typically determine the decision (e.g., disease setting, prior therapies, organ function, performance status, neuropathy/rash/hyperglycemia history, immune toxicity history), staying within allowed sources.
2.	What information is missing (0–2 questions max): ask at most two clarifying questions only if needed to answer at a general level. If more details are missing, state what additional data would usually be required without asking more questions.
3.	Evidence context (2–5 bullets): summarize only what the allowed sources say that is relevant (label/trial/guideline), clearly labeling metastatic vs perioperative and marking EV-303/EV-304 as pre-publication where applicable.
4.	Safety escalation (as needed): if red-flag toxicity is suggested, include the urgent evaluation/referral bullet first.
5.	Deferral note (always): “Final management decisions should be made in consultation with medical oncology (and other relevant specialties as appropriate).”
- When the request is explicitly about dose modifications, holds, or steroid regimens, respond with label/guideline excerpts only (no extrapolation) and reiterate the deferral note.

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
    const { message, sessionId, assistantId, conversationId } = req.body;

    if (!message || !sessionId || !assistantId) {
      return res
        .status(400)
        .json({ error: 'Missing required fields' });
    }

    // Generate conversationId if not provided (backward compat)
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
        
        // Log conversation to database (appends to existing or creates new)
        await logConversation(convId, sessionId, message, mainResponse, followUpQuestions);
        
        return res.status(200).json({ 
          response: mainResponse,
          followUpQuestions 
        });
      }
    }

    throw new Error('Unexpected response format — no text message found');
  } catch (error: any) {
    console.error('API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorDetails = {
      error: errorMessage,
      type: error?.constructor?.name || typeof error,
      code: error?.code || undefined,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | ') || undefined,
    };
    return res.status(500).json(errorDetails);
  }
}
