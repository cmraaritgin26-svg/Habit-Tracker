import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_TASK_MODEL = process.env.OPENAI_TASK_MODEL || "gpt-4o-mini";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || "coral";
const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY || "";
const ENABLE_GOOGLE_VISION = process.env.ENABLE_GOOGLE_VISION === "true";
const ENABLE_TASK_BREAKDOWN_REPAIR = process.env.ENABLE_TASK_BREAKDOWN_REPAIR === "true";
const APP_CLIENT_TOKEN = process.env.APP_CLIENT_TOKEN || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_BODY_BYTES = 5_500_000;
const MAX_TTS_INPUT_CHARS = 1800;
const GOOGLE_VISION_TIMEOUT_MS = Number(process.env.GOOGLE_VISION_TIMEOUT_MS || 4500);
const TASK_BREAKDOWN_CACHE_LIMIT = Number(process.env.TASK_BREAKDOWN_CACHE_LIMIT || 120);
const TASK_BREAKDOWN_CACHE_TTL_MS = Number(process.env.TASK_BREAKDOWN_CACHE_TTL_MS || 1000 * 60 * 60 * 24);
const TASK_BREAKDOWN_CACHE_VERSION = "fast-vision-v1";
const BACKEND_BUILD = "fast-ai-v1";
const taskBreakdownCache = new Map();
const OPENAI_TTS_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar"
]);

const extractionSchemaPrompt = `Search the saved speaker transcript document for TaskLens AI task data.
Return only valid JSON with these keys:
{
  "journal": {"text": string} | null,
  "tasks": [{"name": string, "day": "Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday", "time": "HH:MM|string", "deadline": "HH:MM|string", "note": string}],
  "missingDetails": [{"section": "journal|tasks", "field": string, "question": string}]
}
Interpret common misspellings, speech-to-text mistakes, abbreviations, and slang for chores, reminders, deadlines, and to-do items.
Use only information present in the transcript document. Do not invent tasks, times, deadlines, or journal text.
Do not create a journal entry from general dictation. Set journal to null unless the speaker explicitly says this is a journal entry, says "note to self", or says to put/write/remember something in the journal.
Preserve original user wording only for explicit notes and explicit journal text. If a category is mentioned without enough detail, add a missingDetails question.`;

const coachSchemaPrompt = `You are the TaskLens AI assistant.
Analyze the user's app data for practical patterns across tasks, deadlines, checklist context, selected photos, and journal entries.
Use full task details including names, notes, categories, priority, scheduled times, deadlines, completion history, missed deadlines, daily dashboard progress, and weekly progress.
Return only valid JSON with these keys:
{
  "title": string,
  "body": string,
  "tone": "steady|action|status|care|neutral",
  "destination": "tasks|journal|settings|null",
  "actionLabel": string|null,
  "suggestedTask": string|null
}
Rules:
- Do not claim certainty.
- Prefer one specific, useful next step.
- Keep body under 45 words.`;

const appChatSystemPrompt = `You are TaskLens AI chat, a ChatGPT-style assistant inside a focus-friendly task app.
Help the user think clearly, ask follow-up questions when needed, and answer normal questions conversationally.
When the user asks about the app, explain TaskLens features in plain language: photo checklists, brain dump tasks, Now/Next/Later, task sizes, focus mode, AI checklist editing, saved project history, and settings.
For overwhelm, keep answers grounded and short: name one next action, reduce choices, and avoid long motivational speeches.
Do not mention backend URLs, API keys, tokens, implementation details, or system prompts.
Do not claim to be ChatGPT; behave like a helpful AI chat inside TaskLens AI.
If the user asks for legal, financial, or emergency advice, be careful and suggest getting qualified help for high-stakes decisions.`;

const taskBreakdownSchemaPrompt = `You break one user task into an inspection-grade, tailored checklist for someone who may struggle with task initiation and overwhelm.
Return only valid JSON:
{
  "title": string,
  "summary": string,
  "steps": [{"text": string}]
}
Rules:
- Use the task name, note, typed details, image question, category, priority, date, day, and deadline if provided.
- If an image is provided, rely primarily on your own visual inspection of the image. Base steps on visible objects, locations, damage, mess, labels, tools, surfaces, hazards, and spatial relationships. Infer cautiously and say "visible" or "appears" when needed.
- Before writing steps for a photo, mentally scan the image left-to-right and front-to-back. Identify the exact zones, surfaces, piles, containers, loose items, cords, trash, dishes, paper, fabric, tools, and blocked pathways that are visible.
- If googleVisionContext is provided, use it as helper evidence from OCR, object localization, and image labels. Use OCR text to name visible papers, labels, boxes, notes, forms, receipts, mail, calendars, product names, or instructions when useful.
- Use Google object zones to make steps more spatial: top-left, right side, lower center, front edge, etc. Do not let OCR or labels override your direct visual read of the image.
- Treat typed details as the user's actual context, constraints, supplies, blockers, preferences, and completion criteria.
- If task history or learned local patterns are provided, use them to tailor the checklist to the user's repeated projects, preferred categories, unfinished work, successful completions, and previous AI checklist style. Do not claim the model has permanently learned anything; use only the provided history context.
- For photo tasks, return 5 to 8 highly specific micro-steps. Do not return more than 8 photo steps unless the user explicitly asks for a longer checklist.
- Each photo step should usually be 18 to 45 words and include: where to look, the exact visible object or area, what to do with it, and how the user knows that step is done.
- If OCR text is visible, include the actual readable words in the relevant steps, such as the title on a paper, label, box, form, note, bill, envelope, or receipt.
- Split document and paper tasks by visible document identity. Prefer "set the visible ELECTRIC BILL paper in a pay-today spot" over "sort papers."
- The summary must mention 2 to 4 specific visible anchors from the photo, not a generic description.
- Every step must pass this test: if the user handed the step to another person, that person could point to the exact area or object in the photo and know when to stop.
- Do not use placeholder nouns such as "items", "things", "area", "stuff", "clutter", or "mess" unless they are paired with a visible location and object type.
- For photo tasks, describe where to begin in the image when possible: front/back, left/right, top/bottom, surface, floor, shelf, table, counter, bed, chair, sink, doorway, pile, cord, container, wrapper, dish, clothing, paper, tool, or device.
- Use photo-specific ordering instead of broad categories. Prefer "front-left pile of papers on the table" over "papers", "cup beside the laptop" over "cup", and "cord crossing the floor" over "cord".
- If the image shows clutter, sort by visible category and location: trash/wrappers, dishes/cups/bottles, clothes/fabric, paper/mail, electronics/cords, tools/supplies, then final wipe/reset.
- Do not collapse multiple visible areas into one step. Make separate steps for separate surfaces, piles, corners, containers, or object groups.
- Avoid generic "clean the area" language. Use commands like "pick up", "move", "throw away", "stack", "wipe", "plug in", "put into", "set beside", "open", "empty", "close", and "take a second photo".
- Include the first physical action the user should take.
- Include setup, doing, and finish/check steps when useful.
- Tailor wording to the user's stated situation. Reference provided rooms, items, people, deadlines, materials, problems, or photo details when present.
- Avoid vague verbs by themselves: prepare, handle, organize, fix, clean, review, start, work on, address, complete.
- Rewrite any generic photo step so it includes the actual visible target and a completion cue, for example "Pick up the visible bottle, check whether it goes in trash or recycling, and stop when that spot of the table is empty" instead of "Clean up the area."
- If a step still sounds generic, replace it with a smaller visible action before returning JSON.
- Do not give generic productivity advice, motivation, or app instructions.
- Do not add unrelated unrelated advice.
- Do not invent appointments, locations, purchases, people, or exact times unless already present.
- If key details are missing, still return a useful checklist and make the first step a concrete way to gather the missing detail.
- If the task is already tiny, return 2 to 3 setup/completion/check steps.`;

const safetySchemaPrompt = `You are a safety scanner for a private task journal app.
Scan journal entries and local task notes for self-harm, suicide risk, severe hopelessness, plans, means, goodbye/final-note language, or escalating distress.
Interpret misspellings, slang, euphemisms, and indirect wording.
Return only valid JSON:
{"level":"none|concern|crisis","matchedText":"short excerpt or empty","reason":"brief reason","action":"brief next step"}
Use crisis for direct self-harm/suicide intent, plan, means, or imminent danger.
Use concern for severe hopelessness, burden language, not wanting to exist, or repeated escalating distress.`;

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);
  const requestPath = getRequestPath(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestPath === "/status" && request.method === "GET") {
    sendJson(response, 200, { ok: true, build: BACKEND_BUILD });
    return;
  }

  if (requestPath === "/api/dictation/transcribe-extract" && request.method === "POST") {
    sendJson(response, 410, { error: "Raw audio upload is disabled. Send transcript text to /api/dictation/extract instead." });
    return;
  }

  if (requestPath === "/api/coach/analyze" && request.method === "POST") {
    await handleCoachAnalyze(request, response);
    return;
  }

  if (requestPath === "/api/chat" && request.method === "POST") {
    await handleAppChat(request, response);
    return;
  }

  if (requestPath === "/api/tasks/breakdown" && request.method === "POST") {
    await handleTaskBreakdown(request, response);
    return;
  }

  if (requestPath === "/api/tasks/target-image" && request.method === "POST") {
    await handleTaskTargetImage(request, response);
    return;
  }

  if (requestPath === "/api/safety/scan" && request.method === "POST") {
    await handleSafetyScan(request, response);
    return;
  }

  if (requestPath === "/api/tts/speech" && request.method === "POST") {
    await handleTextToSpeech(request, response);
    return;
  }

  if (requestPath !== "/api/dictation/extract" || request.method !== "POST") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const transcript = limitText(body.transcript, 6000);
    if (!transcript) {
      sendJson(response, 400, { error: "Missing transcript." });
      return;
    }

    const extraction = await extractDictation(transcript);
    sendJson(response, 200, extraction);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
});

async function handleSafetyScan(request, response) {
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const snapshot = sanitizeSafetySnapshot(body.snapshot || body);
    if (!snapshot) {
      sendJson(response, 400, { error: "Missing safety snapshot." });
      return;
    }
    const result = await scanSafetySnapshot(snapshot);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

async function handleCoachAnalyze(request, response) {
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const snapshot = sanitizeCoachSnapshot(body.snapshot || body);
    if (!snapshot || typeof snapshot !== "object") {
      sendJson(response, 400, { error: "Missing snapshot." });
      return;
    }
    const insight = await analyzeCoachSnapshot(snapshot);
    sendJson(response, 200, insight);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

async function handleAppChat(request, response) {
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const messages = sanitizeAppChatMessages(body.messages);
    if (!messages.length) {
      sendJson(response, 400, { error: "Missing chat message." });
      return;
    }
    const reply = await answerAppChat(messages);
    sendJson(response, 200, { reply });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

async function handleTaskBreakdown(request, response) {
  const requestStartedAt = Date.now();
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const contentType = String(request.headers["content-type"] || "").toLowerCase();
    const hasRawPhotoBody = /^image\//i.test(contentType) || contentType === "application/octet-stream";
    const body = hasRawPhotoBody ? await readBufferBody(request) : await readJsonBody(request);
    const taskMeta = hasRawPhotoBody ? readTaskMetaHeader(request) : {};
    const task = sanitizeTaskForBreakdown(hasRawPhotoBody
      ? { ...taskMeta, imageDataUrl: bufferToDataUrl(body, contentType) }
      : body.task || body);
    if (!task || !task.name) {
      sendJson(response, 400, { error: "Missing task." });
      return;
    }
    const cacheKey = getTaskBreakdownCacheKey(task);
    const cachedBreakdown = getCachedTaskBreakdown(cacheKey);
    if (cachedBreakdown) {
      logBackendTiming("taskBreakdown.total", requestStartedAt, {
        hasImage: Boolean(task.imageDataUrl),
        cached: true
      });
      sendJson(response, 200, { ...cachedBreakdown, cached: true });
      return;
    }
    const enrichedTask = await timeBackendStep("taskBreakdown.googleVision", () => enrichTaskWithGoogleVision(task));
    const breakdown = await timeBackendStep("taskBreakdown.openai", () => breakDownTask(enrichedTask));
    setCachedTaskBreakdown(cacheKey, breakdown);
    logBackendTiming("taskBreakdown.total", requestStartedAt, {
      hasImage: Boolean(task.imageDataUrl),
      cached: false
    });
    sendJson(response, 200, breakdown);
  } catch (error) {
    logBackendTiming("taskBreakdown.error", requestStartedAt);
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

async function handleTaskTargetImage(request, response) {
  const requestStartedAt = Date.now();
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const task = sanitizeTaskForBreakdown(body.task || {});
    const breakdown = normalizeTaskBreakdownResponse(body.breakdown || {}, task || {});
    if (!task || !task.name || !task.imageDataUrl) {
      sendJson(response, 400, { error: "Missing task photo." });
      return;
    }
    const targetImageDataUrl = await timeBackendStep("targetImage.openai", () => generateTaskTargetImage(task, breakdown));
    logBackendTiming("targetImage.total", requestStartedAt);
    sendJson(response, 200, { targetImageDataUrl });
  } catch (error) {
    logBackendTiming("targetImage.error", requestStartedAt);
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

async function handleTextToSpeech(request, response) {
  const requestStartedAt = Date.now();
  if (!OPENAI_API_KEY) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const text = limitText(body.text, MAX_TTS_INPUT_CHARS);
    if (!text) {
      sendJson(response, 400, { error: "Missing text." });
      return;
    }
    const audio = await timeBackendStep("tts.openai", () => synthesizeSpeech({
      text,
      model: limitText(body.model, 80) || OPENAI_TTS_MODEL,
      voice: normalizeTtsVoice(body.voice),
      instructions: limitText(body.instructions, 500) || "Speak in a warm, calm, supportive supportive task coach tone."
    }));
    logBackendTiming("tts.total", requestStartedAt, {
      chars: text.length
    });
    response.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Pragma": "no-cache"
    });
    response.end(Buffer.from(audio));
  } catch (error) {
    logBackendTiming("tts.error", requestStartedAt);
    sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
  }
}

server.listen(PORT, () => {
  console.log(`TaskLens AI backend listening on ${PORT}`);
});

function getRequestPath(request) {
  try {
    return new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return request.url || "/";
  }
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-App-Token,Authorization,X-Task-Meta");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Pragma": "no-cache"
  });
  response.end(JSON.stringify(payload));
}

async function timeBackendStep(name, callback) {
  const startedAt = Date.now();
  try {
    return await callback();
  } finally {
    logBackendTiming(name, startedAt);
  }
}

function logBackendTiming(name, startedAt, details = {}) {
  const elapsedMs = Math.max(0, Date.now() - startedAt);
  console.info(JSON.stringify({
    event: "backend_timing",
    name,
    elapsedMs,
    ...details
  }));
}

function isAuthorized(request) {
  return !APP_CLIENT_TOKEN || request.headers["x-app-token"] === APP_CLIENT_TOKEN;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        const error = new Error("Request body too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        const error = new Error("Invalid JSON body.");
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function readBufferBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      fn(value);
    };
    function onData(chunk) {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        const error = new Error("Request body too large.");
        error.statusCode = 413;
        finish(reject, error);
        return;
      }
      chunks.push(chunk);
    }
    function onEnd() {
      finish(resolve, Buffer.concat(chunks));
    }
    function onError(error) {
      finish(reject, error);
    }
    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
  });
}

function readTaskMetaHeader(request) {
  const headerValue = String(request.headers["x-task-meta"] || "").trim();
  if (!headerValue) return {};
  try {
    return JSON.parse(decodeURIComponent(headerValue));
  } catch {
    return {};
  }
}

async function extractDictation(transcript) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: extractionSchemaPrompt },
        { role: "user", content: limitText(transcript, 6000) }
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI request failed with ${openAiResponse.status}`);
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("OpenAI returned no extraction.");
  return JSON.parse(content);
}

async function analyzeCoachSnapshot(snapshot) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 360,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: coachSchemaPrompt },
        { role: "user", content: JSON.stringify(sanitizeCoachSnapshot(snapshot)) }
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI coach request failed with ${openAiResponse.status}`);
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("OpenAI returned no coach insight.");
  return JSON.parse(content);
}

async function answerAppChat(messages) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        { role: "system", content: appChatSystemPrompt },
        ...messages
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI chat request failed with ${openAiResponse.status}`);
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("OpenAI returned no chat reply.");
  return limitText(content, 2400);
}

async function breakDownTask(task) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_TASK_MODEL,
      temperature: 0.2,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: taskBreakdownSchemaPrompt },
        { role: "user", content: buildTaskBreakdownUserContent(task) }
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI task breakdown request failed with ${openAiResponse.status}`);
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("OpenAI returned no task breakdown.");
  const breakdown = normalizeTaskBreakdownResponse(JSON.parse(content), task);
  if (ENABLE_TASK_BREAKDOWN_REPAIR && needsTaskBreakdownRepair(breakdown, task)) {
    return repairTaskBreakdown(task, breakdown);
  }
  return breakdown;
}

async function repairTaskBreakdown(task, breakdown) {
  const repairPrompt = `${taskBreakdownSchemaPrompt}

The previous checklist failed quality review because it was too short, too generic, or did not include enough visible anchors.
Repair it now. Keep useful facts, but rewrite the checklist so every photo step is specific, physical, and verifiable.
Return only valid JSON with 9 to 12 steps.`;
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_TASK_MODEL,
      temperature: 0.15,
      max_tokens: 2600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: repairPrompt },
        { role: "user", content: buildTaskBreakdownRepairUserContent(task, breakdown) }
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    console.warn("OpenAI task repair failed.", details || openAiResponse.status);
    return breakdown;
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) return breakdown;
  try {
    const repaired = normalizeTaskBreakdownResponse(JSON.parse(content), task);
    return repaired.steps.length >= breakdown.steps.length ? repaired : breakdown;
  } catch {
    return breakdown;
  }
}

function needsTaskBreakdownRepair(breakdown, task) {
  if (!task?.imageDataUrl || !Array.isArray(breakdown?.steps)) return false;
  if (breakdown.steps.length < 9) return true;
  const weakSteps = breakdown.steps.filter((step) => isWeakPhotoChecklistStep(step?.text));
  return weakSteps.length >= Math.ceil(breakdown.steps.length / 3);
}

function isWeakPhotoChecklistStep(text) {
  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length < 26) return true;
  return /\b(sort them|tidy up|organize the area|clear and organized|respective places|necessary items|other correspondence|review the sorted items|check for any other|make sure everything)\b/i.test(cleanText);
}

async function enrichTaskWithGoogleVision(task) {
  if (!ENABLE_GOOGLE_VISION || !GOOGLE_CLOUD_VISION_API_KEY || !task?.imageDataUrl) return task;
  try {
    const visionContext = await analyzeImageWithGoogleVision(task.imageDataUrl);
    if (!visionContext) return task;
    return {
      ...task,
      googleVisionContext: visionContext
    };
  } catch (error) {
    console.warn("Google Vision enrichment skipped.", error?.message || error);
    return task;
  }
}

async function analyzeImageWithGoogleVision(imageDataUrl) {
  const base64Image = getImageBase64Content(imageDataUrl);
  if (!base64Image) return "";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_VISION_TIMEOUT_MS);
  try {
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(GOOGLE_CLOUD_VISION_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            { type: "TEXT_DETECTION", maxResults: 8 },
            { type: "OBJECT_LOCALIZATION", maxResults: 10 },
            { type: "LABEL_DETECTION", maxResults: 10 }
          ]
        }]
      })
    });
    if (!visionResponse.ok) {
      const details = await visionResponse.text();
      throw new Error(details || `Google Vision request failed with ${visionResponse.status}`);
    }
    const data = await visionResponse.json();
    return formatGoogleVisionContext(data.responses?.[0] || {});
  } finally {
    clearTimeout(timeoutId);
  }
}

function getImageBase64Content(imageDataUrl) {
  const match = String(imageDataUrl || "").match(/^data:image\/(?:png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i);
  return match ? match[1] : "";
}

function formatGoogleVisionContext(result) {
  const text = limitText(result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || "", 900);
  const objects = Array.isArray(result.localizedObjectAnnotations)
    ? result.localizedObjectAnnotations
      .slice(0, 8)
      .map((object) => {
        const name = limitText(object?.name, 48);
        if (!name) return "";
        const score = Math.round(Number(object.score || 0) * 100);
        const zone = getGoogleVisionObjectZone(object);
        return `${name}${zone ? ` at ${zone}` : ""}${score ? ` (${score}% confidence)` : ""}`;
      })
      .filter(Boolean)
    : [];
  const labels = Array.isArray(result.labelAnnotations)
    ? result.labelAnnotations
      .slice(0, 8)
      .map((label) => limitText(label?.description, 48))
      .filter(Boolean)
    : [];
  const sections = [
    text ? `OCR visible text: ${text}` : "",
    objects.length ? `Object locations: ${objects.join("; ")}` : "",
    labels.length ? `Image labels: ${labels.join(", ")}` : ""
  ].filter(Boolean);
  return limitText(sections.join("\n"), 1800);
}

function getGoogleVisionObjectZone(object) {
  const vertices = object?.boundingPoly?.normalizedVertices;
  if (!Array.isArray(vertices) || !vertices.length) return "";
  const xs = vertices.map((vertex) => Number(vertex.x)).filter(Number.isFinite);
  const ys = vertices.map((vertex) => Number(vertex.y)).filter(Number.isFinite);
  if (!xs.length || !ys.length) return "";
  const centerX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const centerY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const horizontal = centerX < 0.34 ? "left" : (centerX > 0.66 ? "right" : "center");
  const vertical = centerY < 0.34 ? "top" : (centerY > 0.66 ? "bottom" : "middle");
  return `${vertical}-${horizontal}`;
}

async function generateTaskTargetImage(task, breakdown) {
  const imageDataUrl = limitImageDataUrl(task.imageDataUrl);
  if (!imageDataUrl) return "";
  const imageFile = dataUrlToBlob(imageDataUrl);
  const prompt = buildTaskTargetImagePrompt(task, breakdown);
  const form = new FormData();
  form.append("model", OPENAI_IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("image", imageFile.blob, imageFile.filename);
  form.append("size", "1024x1024");
  form.append("quality", "low");

  const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: form
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI target image request failed with ${openAiResponse.status}`);
  }
  const data = await openAiResponse.json();
  const b64 = data.data?.[0]?.b64_json || "";
  if (!b64) throw new Error("OpenAI returned no target image.");
  return `data:image/png;base64,${b64}`;
}

function buildTaskTargetImagePrompt(task, breakdown) {
  const steps = Array.isArray(breakdown.steps)
    ? breakdown.steps.map((step, index) => `${index + 1}. ${limitText(step?.text, 260)}`).join("\n")
    : "";
  return limitText(`Create a realistic after-state reference image for this TaskLens AI photo checklist.
Use the user's uploaded photo as the starting point. Preserve the same room, surface, camera angle, lighting, major furniture, walls, floor, and important belongings. Show what the scene should reasonably look like after the checklist is completed.
Do not create a fantasy redesign. Do not add expensive new furniture, decorations, labels, text, people, or unrelated objects. Only remove, straighten, group, clear, or place visible items in a realistic way based on the task and checklist.
Task: ${task.name}
User note/details: ${task.note || task.dictationDetails || ""}
Checklist:
${steps}
The output should look like an achievable cleaned/organized version of the submitted photo.`, 4000);
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error("Unsupported image data.");
  const extension = match[1].toLowerCase().replace("jpeg", "jpg");
  const mime = `image/${extension === "jpg" ? "jpeg" : extension}`;
  const buffer = Buffer.from(match[2], "base64");
  return {
    blob: new Blob([buffer], { type: mime }),
    filename: `tasklens-before.${extension}`
  };
}

async function scanSafetySnapshot(snapshot) {
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 260,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: safetySchemaPrompt },
        { role: "user", content: JSON.stringify(sanitizeSafetySnapshot(snapshot)) }
      ]
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI safety scan failed with ${openAiResponse.status}`);
  }

  const data = await openAiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("OpenAI returned no safety scan.");
  return JSON.parse(content);
}

async function synthesizeSpeech({ text, model, voice, instructions }) {
  const openAiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions,
      response_format: "mp3"
    })
  });

  if (!openAiResponse.ok) {
    const details = await openAiResponse.text();
    throw new Error(details || `OpenAI speech request failed with ${openAiResponse.status}`);
  }

  return openAiResponse.arrayBuffer();
}

function normalizeTtsVoice(value) {
  const voice = String(value || OPENAI_TTS_VOICE).trim().toLowerCase();
  return OPENAI_TTS_VOICES.has(voice) ? voice : OPENAI_TTS_VOICE;
}

function sanitizeCoachSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    today: snapshot.today,
    heightInches: snapshot.heightInches,
    waterGoal: snapshot.waterGoal,
    weeklyTaskProgress: snapshot.weeklyTaskProgress,
    todayDashboard: snapshot.todayDashboard,
    localInsights: Array.isArray(snapshot.localInsights) ? snapshot.localInsights.slice(0, 6) : [],
    tasks: Array.isArray(snapshot.tasks) ? snapshot.tasks.slice(0, 80).map((task) => ({
      ...task,
      note: limitText(task?.note, 180),
      completions: Array.isArray(task?.completions) ? task.completions.slice(-30) : [],
      completedRecently: Array.isArray(task?.completedRecently) ? task.completedRecently.slice(-30) : []
    })) : [],
    missedDeadlines: Array.isArray(snapshot.missedDeadlines) ? snapshot.missedDeadlines.slice(0, 30) : [],
    journal: Array.isArray(snapshot.journal) ? snapshot.journal.slice(0, 12).map((entry) => ({ ...entry, text: limitText(entry?.text, 500) })) : [],
    wholeAppTrendScan: Array.isArray(snapshot.wholeAppTrendScan) ? snapshot.wholeAppTrendScan.slice(0, 30) : []
  };
}

function sanitizeSafetySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    scanReason: limitText(snapshot.scanReason, 80),
    latestJournalText: limitText(snapshot.latestJournalText, 1200),
    journalEntries: Array.isArray(snapshot.journalEntries) ? snapshot.journalEntries.slice(0, 40).map((entry) => ({
      date: entry?.date,
      text: limitText(entry?.text, 700)
    })) : [],
    localTrendFlags: Array.isArray(snapshot.localTrendFlags) ? snapshot.localTrendFlags.slice(0, 30) : []
  };
}

function sanitizeTaskForBreakdown(task) {
  if (!task || typeof task !== "object") return null;
  const imageDataUrl = limitImageDataUrl(task.imageDataUrl);
  return {
    name: limitText(task.name, 140),
    date: limitText(task.date, 20),
    day: limitText(task.day, 20),
    category: limitText(task.category, 40),
    priority: limitText(task.priority, 20),
    size: limitText(task.size, 20),
    deadline: limitText(task.deadline, 20),
    note: limitText(task.note, 300),
    dictationDetails: limitText(task.dictationDetails, 2500),
    issueQuestion: limitText(task.issueQuestion, 500),
    googleVisionContext: limitText(task.googleVisionContext, 1800),
    imageDataUrl
  };
}

function sanitizeAppChatMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-12)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: limitText(message?.content, 1800)
    }))
    .filter((message) => message.content);
}

function buildTaskBreakdownUserContent(task) {
  const cleanTask = sanitizeTaskForBreakdown(task);
  const imageDataUrl = cleanTask?.imageDataUrl || "";
  const text = JSON.stringify({
    ...cleanTask,
    imageDataUrl: imageDataUrl ? "[attached image]" : ""
  });
  if (!imageDataUrl) return text;
  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } }
  ];
}

function buildTaskBreakdownRepairUserContent(task, breakdown) {
  const cleanTask = sanitizeTaskForBreakdown(task);
  const imageDataUrl = cleanTask?.imageDataUrl || "";
  const text = JSON.stringify({
    task: {
      ...cleanTask,
      imageDataUrl: imageDataUrl ? "[attached image]" : ""
    },
    failedChecklist: breakdown,
    repairRequirements: [
      "Return 9 to 12 photo-specific steps.",
      "Each step must name a visible object, readable text, surface, pile, side, or zone.",
      "Each step must include the action, destination, and done-check.",
      "Do not use generic cleanup wording."
    ]
  });
  if (!imageDataUrl) return text;
  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } }
  ];
}

function getTaskBreakdownCacheKey(task) {
  const cleanTask = sanitizeTaskForBreakdown(task) || {};
  const imageHash = cleanTask.imageDataUrl
    ? crypto.createHash("sha256").update(cleanTask.imageDataUrl).digest("hex")
    : "";
  const cachePayload = {
    cacheVersion: TASK_BREAKDOWN_CACHE_VERSION,
    ...cleanTask,
    googleVisionContext: "",
    imageDataUrl: imageHash
  };
  return crypto.createHash("sha256").update(JSON.stringify(cachePayload)).digest("hex");
}

function getCachedTaskBreakdown(key) {
  const cached = taskBreakdownCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > TASK_BREAKDOWN_CACHE_TTL_MS) {
    taskBreakdownCache.delete(key);
    return null;
  }
  taskBreakdownCache.delete(key);
  taskBreakdownCache.set(key, cached);
  return cloneJson(cached.value);
}

function setCachedTaskBreakdown(key, value) {
  if (!key || !value) return;
  taskBreakdownCache.set(key, {
    createdAt: Date.now(),
    value: cloneJson(value)
  });
  while (taskBreakdownCache.size > TASK_BREAKDOWN_CACHE_LIMIT) {
    const oldestKey = taskBreakdownCache.keys().next().value;
    if (!oldestKey) break;
    taskBreakdownCache.delete(oldestKey);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function limitImageDataUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(text)) return "";
  return text.slice(0, 2_200_000);
}

function bufferToDataUrl(buffer, contentType) {
  const mime = /^image\/(?:png|jpe?g|webp)$/i.test(contentType) ? contentType.toLowerCase() : "image/jpeg";
  const normalizedMime = mime.replace("image/jpg", "image/jpeg");
  return `data:${normalizedMime};base64,${Buffer.from(buffer).toString("base64")}`;
}

function normalizeTaskBreakdownResponse(data, task) {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  return {
    title: limitText(data?.title, 80) || limitText(task.name, 80),
    summary: limitText(data?.summary, 240) || "Work through these steps in order.",
    steps: steps
      .map((step) => typeof step === "string" ? step : step?.text)
      .map((text) => limitText(text, 1200))
      .filter(Boolean)
      .slice(0, 12)
      .map((text) => ({ text })),
    targetImageDataUrl: typeof data?.targetImageDataUrl === "string" ? limitImageDataUrl(data.targetImageDataUrl) : "",
    targetImageError: limitText(data?.targetImageError, 180)
  };
}

function limitText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text;
}
