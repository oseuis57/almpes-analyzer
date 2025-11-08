// Worker: Analiza imágenes con Workers AI (Llama 3.2 Vision)
function cors(env) {
  return {
    // pon tu dominio real de Pages:
    "Access-Control-Allow-Origin": "https://oseuis57.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return new Response("", { headers: cors(env) });

    if (request.method !== "POST")
      return new Response("Use POST /analyze", { status: 405, headers: cors(env) });

    const url = new URL(request.url);
    if (url.pathname !== "/analyze")
      return new Response("Not found", { status: 404, headers: cors(env) });

    try {
      const form = await request.formData();
      const file = form.get("image");
      if (!file || typeof file === "string")
        return json({ error: "Falta el archivo 'image'" }, env, 400);

      const prompt = (form.get("prompt") || "Analiza la imagen y describe hallazgos clave.").toString();

      // a) Convertir a base64 data URL
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const mime = file.type || "image/png";
      const dataUrl = `data:${mime};base64,${b64}`;

      // b) Llamada a Workers AI - modelo de visión
      // doc: llama-3.2-11b-vision-instruct
      const result = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
        messages: [
          { role: "system", content: "Eres un analista ambiental conciso y claro." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 300
      });

      const text = result?.response ?? "Sin respuesta de texto.";
      return json({ analysis: text }, env);
    } catch (e) {
      return json({ error: "Error procesando solicitud", detail: String(e) }, env, 500);
    }
  },
};
