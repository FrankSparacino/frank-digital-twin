const fs = require('fs');

const workerCode = `export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);

    // INGESTION ROUTE
    if (url.pathname === "/api/ingest" && request.method === "POST") {
      try {
        const { id, title, category, content } = await request.json();
        if (!id || !title || !content) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        const embeddingRes = await env.AI.run("@cf/baai/bge-small-en-v1.5", { text: [content] });
        const vector = embeddingRes.data[0];
        if (!vector) throw new Error("Failed to generate embedding");

        await env.VECTORIZE.insert([
          { id: id, values: vector, metadata: { title, category: category || "general" } },
        ]);

        await env.DB.prepare(
          "INSERT OR REPLACE INTO documents (id, title, category, content) VALUES (?, ?, ?, ?)"
        ).bind(id, title, category || "general", content).run();

        return new Response(JSON.stringify({ success: true, id, title }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // CHAT ROUTE
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { query } = await request.json();
        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query" }), { status: 400 });
        }

        const embeddingRes = await env.AI.run("@cf/baai/bge-small-en-v1.5", { text: [query] });
        const userVector = embeddingRes.data[0];

        const vectorMatches = await env.VECTORIZE.query(userVector, { topK: 3 });

        let contextText = "";
        if (vectorMatches.matches && vectorMatches.matches.length > 0) {
          const docIds = vectorMatches.matches.map((m) => m.id);
          const placeholders = docIds.map(() => "?").join(",");

          const sql = "SELECT id, title, content FROM documents WHERE id IN (" + placeholders + ")";
          const { results } = await env.DB.prepare(sql).bind(...docIds).all();

          contextText = results.map((d) => "[" + d.title + "]: " + d.content).join("\n\n");
        }

        const systemPrompt = "You are Frank's Digital Twin. Answer user questions accurately using the provided context. If the answer isn't in the context, respond based on your knowledge base while staying in character.";
        const fullPrompt = contextText ? "Context:\n" + contextText + "\n\nUser Question: " + query : query;

        const aiRes = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullPrompt },
          ],
        });

        const reply = aiRes.response;

        const logId = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO chat_logs (id, user_query, response) VALUES (?, ?, ?)"
        ).bind(logId, query, reply).run();

        return new Response(JSON.stringify({ response: reply, contextUsed: !!contextText }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    return new Response("Frank's Digital Twin API is running!", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};`;

fs.writeFileSync('src/index.js', workerCode);
console.log('src/index.js updated successfully!');
