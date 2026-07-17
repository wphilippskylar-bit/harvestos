import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Best-effort AI extraction of a soil test report photo/PDF into structured fields (pH, N-P-K,
// organic matter). Deliberately NOT authoritative — the frontend always shows these as normal
// editable form fields, exactly the way Phil framed the feature ("this can be manually edited as
// well in case the system fails to scan it properly"). Requires ANTHROPIC_API_KEY; if it's not
// configured, returns a clear "not set up yet" response rather than a confusing failure so the
// form can fall back to plain manual entry without breaking.

const EXTRACT_TOOL = {
  name: "record_soil_test_values",
  description: "Record the soil test values found in the image, using null for anything not present or not legible.",
  input_schema: {
    type: "object" as const,
    properties: {
      ph: { type: ["number", "null"], description: "Soil pH" },
      nitrogen_ppm: { type: ["number", "null"], description: "Nitrogen (N) in ppm" },
      phosphorus_ppm: { type: ["number", "null"], description: "Phosphorus (P) in ppm" },
      potassium_ppm: { type: ["number", "null"], description: "Potassium (K) in ppm" },
      organic_matter_pct: { type: ["number", "null"], description: "Organic matter, percent" },
      confidence_notes: { type: "string", description: "Anything ambiguous, unclear, or that needs a human double-check" },
    },
    required: ["ph", "nitrogen_ppm", "phosphorus_ppm", "potassium_ppm", "organic_matter_pct", "confidence_notes"],
  },
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI extraction isn't set up yet — enter the values manually below." },
      { status: 501 }
    );
  }

  const { imageBase64, mediaType } = await request.json();
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "record_soil_test_values" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: "This is a photo of a soil test report. Extract the pH, N-P-K (ppm), and organic matter percent. Use null for anything not shown." },
          ],
        },
      ],
    });

    const toolUse = message.content.find((block: any) => block.type === "tool_use") as any;
    if (!toolUse) return NextResponse.json({ error: "Could not read the photo — try entering values manually." }, { status: 422 });

    return NextResponse.json({ extracted: toolUse.input });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed — try entering values manually." },
      { status: 500 }
    );
  }
}
