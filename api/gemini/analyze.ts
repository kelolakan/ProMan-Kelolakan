import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.json({ error: "Method not allowed. Gunakan metode POST." });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.json({
        error:
          "Kunci GEMINI_API_KEY belum dikonfigurasikan di Environment Variables Vercel. Silakan tambahkan GEMINI_API_KEY di dashboard Vercel (Project Settings -> Environment Variables).",
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "exven-proman",
        },
      },
    });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { projectData, monthlySummaryRequest } = body;

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
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.statusCode = 200;
    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini analyze serverless error:", error);
    res.statusCode = 500;
    res.json({
      error: error.message || "Terjadi kesalahan saat memproses analitik Gemini AI.",
    });
  }
}
