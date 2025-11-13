export async function POST(req) {
    console.log("🔥 /api/score hit"); // ✅ should appear in Next.js terminal
    try {
      const body = await req.json();
      console.log("➡️ sending to Flask:", body);
      const r = await fetch("http://127.0.0.1:5000/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON response from Flask:", text);
        throw new Error("Invalid JSON from backend");
      }
  
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: e.message || "score_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  