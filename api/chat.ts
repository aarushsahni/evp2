import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

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
          const value = item.text.value.trim();
          if (value) {
            parts.push(value);
          }
        }
      }

      if (parts.length > 0) {
        return res.status(200).json({ response: parts.join('\n\n') });
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
