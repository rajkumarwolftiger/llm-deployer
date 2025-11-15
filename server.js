import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs-extra";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const WORK_BASE = "./workdir";
await fs.ensureDir(WORK_BASE);

/* ------------------- Helper ------------------- */
async function getLatestWorkdir() {
  const dirs = await fs.readdir(WORK_BASE);
  const sorted = dirs
    .map(d => ({ d, time: fs.statSync(`${WORK_BASE}/${d}`).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
  return sorted.length ? `${WORK_BASE}/${sorted[0].d}` : null;
}

/* ------------------- GET /api-endpoint ------------------- */
app.get("/api-endpoint", async (req, res) => {
  const latestDir = await getLatestWorkdir();
  let deployUrl = null;

  if (latestDir) {
    const deployFile = `${latestDir}/deploy_url.txt`;
    if (await fs.pathExists(deployFile)) {
      deployUrl = (await fs.readFile(deployFile, "utf8")).trim();
    }
  }

  const exampleUrl = `http://localhost:${process.env.PORT || 3000}/api-endpoint`;

  res.send(`
    <html>
      <head>
        <title>LLM Deploy API</title>
        <style>
          body { font-family: sans-serif; text-align: center; margin-top: 50px; }
          a { color: blue; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .url-box { margin-top: 30px; font-size: 18px; }
          code, pre { background: #f5f5f5; padding: 4px 8px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>🚀 LLM Deployment API</h1>
        <p>POST requests should be sent to:</p>
        <code>${exampleUrl}</code>
        <br><br>
        <p>Example curl:</p>
        <pre>curl -X POST ${exampleUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","secret":"my-sec-123","task":"DemoApp","brief":"Make a sample static web app"}'</pre>

        ${deployUrl ? `<div class="url-box">🌍 Latest Deployment: <a href="${deployUrl}" target="_blank">${deployUrl}</a></div>` : `<p>No deployment yet.</p>`}
      </body>
    </html>
  `);
});

/* ------------------- POST /api-endpoint ------------------- */
app.post("/api-endpoint", async (req, res) => {
  try {
    const { email, secret, task, round, nonce, brief, attachments } = req.body;

    if (!secret || secret !== process.env.EXPECTED_SECRET) {
      return res.status(403).json({ error: "Invalid secret" });
    }

    const runId = `${task.replace(/[^a-z0-9\-]/gi, "-")}-${Date.now()}`;
    const workdir = `${WORK_BASE}/${runId}`;
    await fs.ensureDir(workdir);

    const statusUrl = `http://localhost:${process.env.PORT || 3000}/status/${runId}`;
    res.status(200).json({
      ok: true,
      message: "Deployment started...",
      status_page: statusUrl,
    });

    // Async deployment
    (async () => {
      try {
        // Save attachments if any
        if (Array.isArray(attachments)) {
          for (const att of attachments) {
            const name = att.name || `file-${uuidv4()}`;
            const m = (att.url || "").match(/^data:[^;]+;base64,(.+)$/);
            if (m && m[1]) {
              const buf = Buffer.from(m[1], "base64");
              await fs.writeFile(`${workdir}/${name}`, buf);
            }
          }
        }

        /* ------------------- AI Scaffold Generation ------------------- */
        let generatedFiles = null;
        try {
          console.log("[ai] Generating app using AIPipe...");

          const prompt = `
You are a web app generator.
Based on the following brief, generate a minimal static web app.
Return a JSON object where each key is a filename (like "index.html", "style.css", "script.js")
and each value is its file content.

Brief: ${brief}
`;

          const aiResp = await axios.post(
            process.env.AIPIPE_ENDPOINT || "https://aipipe.org/openrouter/v1/chat/completions",
            {
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a helpful web app generator that outputs valid JSON code files." },
                { role: "user", content: prompt }
              ],
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.AIPIPE_KEY}`,
              },
              timeout: 60000,
            }
          );

          const messageContent = aiResp.data?.choices?.[0]?.message?.content?.trim();
          try {
            generatedFiles = JSON.parse(messageContent);
          } catch (err) {
            console.warn("[ai warning] Model output not valid JSON, writing raw index.html instead.");
            await fs.writeFile(`${workdir}/index.html`, messageContent, "utf8");
            generatedFiles = null;
          }
        } catch (e) {
          console.warn("[ai error] AIPipe call failed:", e.message || e);
        }

        // Write generated files or fallback
        if (generatedFiles && typeof generatedFiles === "object") {
          console.log("[ai] Writing generated files to workdir...");
          for (const [fname, content] of Object.entries(generatedFiles)) {
            await fs.writeFile(`${workdir}/${fname}`, content, "utf8");
          }
        } else {
          console.log("[ai] Fallback: creating placeholder HTML");
          const indexHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${task}</title></head><body><h1>${task}</h1><div id="content">Placeholder content. Brief: ${brief}</div></body></html>`;
          await fs.writeFile(`${workdir}/index.html`, indexHtml, "utf8");
        }

        // Always write README and LICENSE
        await fs.writeFile(`${workdir}/README.md`, `# ${task}\n\nGenerated by LLM Deploy API.\n`, "utf8");
        await fs.writeFile(`${workdir}/LICENSE`, `MIT License\n\nCopyright (c) ${new Date().getFullYear()}`, "utf8");

        // Run deploy script
        const child = spawn("bash", ["./scripts/create_and_publish.sh", workdir, task], { env: process.env });
        child.stdout.on("data", (data) => console.log(`[deploy] ${data}`));
        child.stderr.on("data", (data) => console.error(`[deploy error] ${data}`));

      } catch (err) {
        console.error("Error processing deployment:", err);
      }
    })();

  } catch (err) {
    console.error("Main handler error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------- GET /status/:runId ------------------- */
app.get("/status/:runId", async (req, res) => {
  const { runId } = req.params;
  const workdir = `${WORK_BASE}/${runId}`;
  const deployFile = `${workdir}/deploy_url.txt`;

  if (!(await fs.pathExists(workdir))) {
    return res.status(404).send(`<h2>No record found for run ID: ${runId}</h2>`);
  }

  // Auto-refresh until deploy_url.txt exists
  if (!(await fs.pathExists(deployFile))) {
    return res.send(`
      <html>
        <head>
          <title>Deployment Status - ${runId}</title>
          <meta http-equiv="refresh" content="5">
        </head>
        <body style="font-family: sans-serif; text-align: center; margin-top: 60px;">
          <h2>🚧 Deployment for <b>${runId}</b> is in progress...</h2>
          <p>Refreshing every 5 seconds...</p>
        </body>
      </html>
    `);
  }

  const deployUrl = (await fs.readFile(deployFile, "utf8")).trim();

  res.send(`
    <html>
      <head><title>Deployment Status - ${runId}</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 60px;">
        <h1>✅ Deployment Complete</h1>
        <p>App <b>${runId}</b> successfully deployed!</p>
        <p>🌍 <a href="${deployUrl}" target="_blank">${deployUrl}</a></p>
      </body>
    </html>
  `);
});

/* ------------------- Start Server ------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API listening on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT}/api-endpoint`);
});