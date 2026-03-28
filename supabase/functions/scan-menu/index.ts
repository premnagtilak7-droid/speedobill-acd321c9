import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\[\{]/);
  const lastBracket = cleaned.lastIndexOf("]");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonEnd = Math.max(lastBracket, lastBrace);

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64 } = await req.json();
    if (!image_base64) throw new Error("No image provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const base64Data = image_base64.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract ALL menu items from this image. For each item, detect if there are multiple price variants (like Half, Full, Quarter, Piece, Plate, Small, Medium, Large, Regular).

Return ONLY a valid JSON array. Each object must have:
- "name": string (item name)
- "category": string (like "Main Course", "Starters", "Desserts", "Beverages", "Snacks", "Thali", "Rice", "Roti/Bread", etc.)
- "price": number (the base/default price in INR, use the first or lowest price)
- "price_variants": array of {"label": string, "price": number} if multiple sizes/variants exist, otherwise null

Example: [{"name":"Paneer Tikka","category":"Starters","price":180,"price_variants":[{"label":"Half","price":180},{"label":"Full","price":320}]}]

No markdown, no explanation, ONLY the JSON array.`,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Gemini API error: " + response.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini raw response length:", text.length);

    let parsed: any;
    try {
      parsed = extractJsonFromResponse(text);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw text:", text.substring(0, 500));
      return new Response(JSON.stringify({ error: "Could not parse menu items from AI response", raw: text.substring(0, 300) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawItems = Array.isArray(parsed) ? parsed : [parsed];
    const items = rawItems
      .filter((i: any) => i.name && (i.price || i.price_variants?.length))
      .map((i: any) => ({
        name: String(i.name).trim(),
        price: Number(i.price) || (i.price_variants?.[0]?.price || 0),
        category: String(i.category || "General").trim(),
        price_variants: Array.isArray(i.price_variants) && i.price_variants.length > 0
          ? i.price_variants.map((v: any) => ({ label: String(v.label), price: Number(v.price) }))
          : null,
      }));

    console.log("Parsed items count:", items.length);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-menu error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
