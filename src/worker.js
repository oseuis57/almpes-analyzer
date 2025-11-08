// Worker: análisis de imágenes con Workers AI (sin OpenAI, gratis con cuota CF)
function cors() {
  const origin = "https://oseuis57.github.io"; // tu GitHub Pages
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function j(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response("", { headers: cors() });
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/analyze") {
      return new Response("Use POST /analyze", { status: 405, headers: cors() });
    }

    try {
      const form = await req.formData();
      const file = form.get("image");
      if (!file || typeof file === "string") return j({ error: "Falta 'image'" }, 400);
      const prompt = (form.get("prompt") || "Analiza la imagen y resume hallazgos.").toString();

      // buffer binario para Workers AI (mejor que base64)
      const buf = await file.arrayBuffer();

      // Modelo vision de Workers AI (puedes cambiarlo por otro disponible)
      const MODEL = env.ANALYZER_MODEL || "@cf/llama-3.2-11b-vision-instruct";

      const aiRes = await env.AI.run(MODEL, {
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: buf },  // <- pasamos el binario
          ],
        }],
      });

      const text =
        aiRes?.response ??
        aiRes?.output_text ??
        aiRes?.result ??
        "Sin respuesta de texto.";

      return j({ analysis: text });
    } catch (e) {
      return j({ error: "Error procesando solicitud", detail: String(e) }, 500);
    }
  },
};
