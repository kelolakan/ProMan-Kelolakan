import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Lazy initialize Gemini client safely
  let ai: GoogleGenAI | null = null;
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route for AI Project Analytics
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY in the Secrets panel." });
      }

      const { projectData, monthlySummaryRequest } = req.body;

      const prompt = `You are a professional Project Management Consultant. Analyze the following project, task, and team performance metrics to generate a comprehensive monthly analytical report.
      
      Project Data:
      ${JSON.stringify(projectData, null, 2)}
      
      Manager's request:
      ${monthlySummaryRequest || "Provide a detailed analysis on project completion rate, task distribution, bottle necks, time tracking logs, and a 3-step action plan to improve productivity."}
      
      Format your response beautifully in Markdown. Use bold headings, bullet points, comparison tables, and clearly structured sections:
      1. Executive Summary
      2. Performance Metrics & Bottlenecks
      3. S-Curve & Timeline Status Evaluation
      4. Productivity & Poin Performa analysis
      5. Actionable Recommendations (Next 30 Days)
      
      Respond in Indonesian language since the manager is Indonesian.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini analyze route error:", error);
      res.status(500).json({ error: error.message || "An error occurred during Gemini project analysis." });
    }
  });

  // Serve static assets or use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
