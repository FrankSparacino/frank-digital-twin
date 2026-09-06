export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const intros = [
      "Hi, I'm Frank's digital twin. Ask me about my executive project controls experience, capital programs, or AI strategies.",
      "Hello! I'm Frank's digital twin. Feel free to ask about my background in executive project controls, capital programs, or AI integration strategies.",
      "Hi there, I'm Frank's digital twin. Let's talk about executive project controls, capital programs, or how AI is transforming operations.",
      "Greetings, I'm Frank's digital twin. Ask me anything regarding executive project controls, capital asset delivery, or AI-driven strategies."
    ];
    const randomIntro = intros[Math.floor(Math.random() * intros.length)];

    if (url.pathname === "/chat-ui") {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Frank's Digital Twin</title>
          <style>
            body {
              margin: 0;
              padding: 16px;
              background-color: transparent;
              font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
              color: #f3f4f6;
              display: flex;
              flex-direction: column;
              height: 100vh;
              box-sizing: border-box;
            }
            #frank-chat-messages {
              flex: 1;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 12px;
              padding-right: 4px;
            }
            .message {
              padding: 10px 14px;
              border-radius: 8px;
              font-size: 14px;
              line-height: 1.4;
              max-width: 85%;
              word-break: break-word;
            }
            .assistant {
              align-self: flex-start;
              background-color: #1f2937;
              border: 1px solid #374151;
              color: #f3f4f6;
            }
            .user {
              align-self: flex-end;
              background-color: #059669;
              color: white;
            }
            .loader {
              align-self: flex-start;
              color: #9ca3af;
              font-size: 13px;
              padding: 4px;
            }
            .input-area {
              display: flex;
              gap: 8px;
            }
            input {
              flex: 1;
              background-color: rgba(0, 0, 0, 0.3);
              border: 1px solid #374151;
              color: #f3f4f6;
              padding: 10px 12px;
              border-radius: 8px;
              font-size: 14px;
              outline: none;
            }
            input:focus {
              border-color: #059669;
            }
            button {
              background-color: #059669;
              color: white;
              border: none;
              padding: 10px 18px;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            button:hover {
              background-color: #047857;
            }
          </style>
        </head>
        <body>
          <div id="frank-chat-messages">
            <div class="message assistant">
              ${randomIntro}
            </div>
          </div>
          <div class="input-area">
            <input id="frank-user-input" type="text" placeholder="Type your question..." />
            <button id="frank-send-btn">Send</button>
          </div>

          <script>
            const inputEl = document.getElementById("frank-user-input");
            const sendBtn = document.getElementById("frank-send-btn");
            const chatBox = document.getElementById("frank-chat-messages");

            async function sendMessage() {
              const query = inputEl.value.trim();
              if (!query) return;

              chatBox.innerHTML += \`<div class="message user">\${escapeHtml(query)}</div>\`;
              chatBox.scrollTop = chatBox.scrollHeight;
              inputEl.value = "";

              const loaderId = "loader-" + Date.now();
              chatBox.innerHTML += \`<div id="\${loaderId}" class="loader">Frank is thinking...</div>\`;
              chatBox.scrollTop = chatBox.scrollHeight;

              try {
                const res = await fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ query })
                });
                const data = await res.json();
                const reply = data.response || data.error || "No response received.";

                document.getElementById(loaderId)?.remove();

                chatBox.innerHTML += \`<div class="message assistant">\${escapeHtml(reply)}</div>\`;
                chatBox.scrollTop = chatBox.scrollHeight;
              } catch (err) {
                document.getElementById(loaderId)?.remove();
                chatBox.innerHTML += \`<div class="loader" style="color: #ef4444;">Connection error. Please try again.</div>\`;
                chatBox.scrollTop = chatBox.scrollHeight;
              }
            }

            function escapeHtml(text) {
              return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            sendBtn.addEventListener("click", sendMessage);
            inputEl.addEventListener("keydown", (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            });
          </script>
        </body>
        </html>
      `;

      return new Response(htmlContent, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const query = body.query;

        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const embeddings = await env.AI.run("@cf/baai/bge-small-en-v1.5", { text: query });
        const vectorValues = embeddings.data[0];

        const vectorSearch = await env.VECTORIZE.query(vectorValues, { topK: 3 });
        const matches = vectorSearch.matches || [];

        let context = "";
        if (matches.length > 0) {
          const ids = matches.map((m) => m.id);
          const placeholders = ids.map(() => "?").join(",");
          const { results } = await env.DB.prepare(
            `SELECT id, title, content FROM documents WHERE id IN (${placeholders})`
          ).bind(...ids).all();

          context = results.map((doc) => `${doc.title}: ${doc.content}`).join("\n\n");
        }

      	const systemPrompt = `You are Frank, an expert in project controls and engineering operations.
	Core Capabilities & Approach: You are hands-on. You personally develop Work Process Maps, eliminate non-value-added (NVA) steps, and build custom low-code AI agents 	and Power Platform Apps to implement solution sets. You don't just manage others—you directly build and execute process optimizations and custom technical solutions.

	Use the following relevant contextual knowledge to answer the query accurately:
	${context}

	Respond directly to the user's prompt. Never use a scripted introduction, never state that you are a digital twin, and avoid meta-commentary. Answer concisely, 	professionally, and directly in first-person as Frank.`;

        const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
          ]
        });

        return new Response(JSON.stringify({ response: aiResponse.response }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/ingest" && request.method === "POST") {
      try {
        const doc = await request.json();
        const { id, title, category, content } = doc;

        if (!id || !title || !content) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        await env.DB.prepare(
          "INSERT OR REPLACE INTO documents (id, title, category, content) VALUES (?, ?, ?, ?)"
        ).bind(id, title, category || "general", content).run();

        const embeddings = await env.AI.run("@cf/baai/bge-small-en-v1.5", { text: content });
        const values = embeddings.data[0];

        await env.VECTORIZE.upsert([
          { id, values, metadata: { title, category: category || "general" } }
        ]);

        return new Response(JSON.stringify({ success: true, id, title }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Frank Digital Twin API Online", {
      headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" }
    });
  }
};