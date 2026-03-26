import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
] as const;

async function tryGemini(prompt: string, apiKey: string) {
  for (const model of GEMINI_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        return {
          image_base64: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
          model_used: model,
        };
      }
      return null; // got response but no image
    }

    const status = response.status;
    const text = await response.text();
    console.error(`Gemini [${model}]: ${status}`, text);

    if (status === 429) throw { type: "quota", status, text };
    if (status === 404 || status === 410) continue;
    throw { type: "error", status, text };
  }
  throw { type: "no_model" };
}

async function tryLovableGateway(prompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Lovable Gateway error:", res.status, errText);
    return null;
  }

  const data = await res.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (imageUrl) {
    return { image_base64: imageUrl, model_used: "lovable-gateway" };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") throw new Error("No prompt provided");

    const fullPrompt = `Generate a professional appetizing food photo of ${prompt}. Restaurant menu style, clean plating, realistic lighting, premium food photography, no text, no watermark, no collage.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const result = await tryGemini(fullPrompt, GEMINI_API_KEY);
        if (result) {
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e: any) {
        if (e?.type !== "quota") {
          console.error("Gemini failed:", e);
        } else {
          console.log("Gemini quota exhausted, falling back to Lovable Gateway...");
        }
      }
    }

    // Fallback to Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const result = await tryLovableGateway(fullPrompt, LOVABLE_API_KEY);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      error: "Image generation failed. Gemini quota exhausted and no fallback available. Please enable billing on your Google AI project or try again later.",
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-menu-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
