import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyWithGemini(content: any[], verificationPrompt: string, apiKey: string) {
  console.log("Attempting verification with Gemini...");
  
  // Build parts for Gemini
  const parts: any[] = [{ text: verificationPrompt }];
  
  for (const item of content) {
    if (item.type === "image_url") {
      const imageUrl = item.image_url.url;
      if (imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.split(",")[1];
        const mimeType = imageUrl.match(/data:([^;]+);/)?.[1] || "image/jpeg";
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      }
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function verifyWithOpenAI(content: any[], verificationPrompt: string, apiKey: string) {
  console.log("Attempting verification with OpenAI...");
  
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: verificationPrompt },
        ...content.filter(c => c.type === "image_url")
      ]
    }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      throw new Error("No AI API keys configured. Please add GEMINI_API_KEY or OPENAI_API_KEY.");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { adId, userId, taskType, tiktokUsername, screenshots } = await req.json();

    console.log("Verifying task:", { adId, taskType, tiktokUsername, screenshotCount: screenshots?.length });

    if (!screenshots || screenshots.length === 0) {
      return new Response(
        JSON.stringify({ approved: false, reason: "No screenshots provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build verification prompt based on task type
    let verificationPrompt = `You are a TikTok task verification AI. Analyze the provided screenshot(s) to verify task completion.

Task Type: ${taskType.toUpperCase()}
User's TikTok Username: @${tiktokUsername}

Verification Requirements:`;

    switch (taskType) {
      case "like":
        verificationPrompt += `
- Look for the heart icon in the TikTok interface
- The heart MUST be RED/filled (indicating the video is liked)
- A white/outline heart means NOT liked
- Verify this is a TikTok video interface`;
        break;

      case "save":
        verificationPrompt += `
- Look for the bookmark/save icon in the TikTok interface
- The bookmark MUST be YELLOW/filled (indicating the video is saved)
- A white/outline bookmark means NOT saved
- Verify this is a TikTok video interface`;
        break;

      case "comment":
        verificationPrompt += `
- Look for the comment section
- Find a comment that contains or is from the username: @${tiktokUsername}
- The username MUST match exactly
- Verify the comment is visible in the screenshot`;
        break;

      case "watch":
        verificationPrompt += `
- Verify this is a TikTok video interface
- Check if the video appears to be playing or has been played
- Look for any indication the video was viewed (progress bar, view count)`;
        break;
    }

    verificationPrompt += `

Respond with a JSON object containing:
{
  "approved": boolean,
  "confidence": number (0-100),
  "reason": string (brief explanation),
  "details": {
    "heartDetected": boolean (for like tasks),
    "heartColor": string (for like tasks),
    "bookmarkDetected": boolean (for save tasks),
    "bookmarkColor": string (for save tasks),
    "usernameFound": boolean (for comment tasks),
    "videoInterface": boolean
  }
}

Be strict but fair. If unsure, set approved to false and explain why.`;

    // Prepare image content
    const content: any[] = [];
    for (const screenshot of screenshots.slice(0, 3)) {
      content.push({
        type: "image_url",
        image_url: { url: screenshot },
      });
    }

    // Try Gemini first, fallback to OpenAI
    let aiContent: string | undefined;
    let usedProvider = "";

    if (GEMINI_API_KEY) {
      try {
        aiContent = await verifyWithGemini(content, verificationPrompt, GEMINI_API_KEY);
        usedProvider = "gemini";
        console.log("Gemini verification successful");
      } catch (geminiError) {
        console.error("Gemini failed:", geminiError);
        if (OPENAI_API_KEY) {
          console.log("Falling back to OpenAI...");
          aiContent = await verifyWithOpenAI(content, verificationPrompt, OPENAI_API_KEY);
          usedProvider = "openai";
        } else {
          throw geminiError;
        }
      }
    } else if (OPENAI_API_KEY) {
      aiContent = await verifyWithOpenAI(content, verificationPrompt, OPENAI_API_KEY);
      usedProvider = "openai";
    }

    console.log(`AI response (${usedProvider}):`, aiContent);

    // Parse AI response
    let verificationResult;
    try {
      const jsonMatch = aiContent?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      verificationResult = {
        approved: false,
        confidence: 0,
        reason: "Unable to analyze screenshots. Please try again.",
      };
    }

    verificationResult.provider = usedProvider;

    // Store submission in database
    const { error: insertError } = await supabase
      .from("task_submissions")
      .insert({
        ad_id: adId,
        user_id: userId,
        screenshot_urls: screenshots,
        status: verificationResult.approved ? "approved" : (verificationResult.confidence > 50 ? "needs_review" : "rejected"),
        ai_analysis: verificationResult,
        points_awarded: null,
      });

    if (insertError) {
      console.error("Error inserting submission:", insertError);
    }

    // If approved, update points and ad
    if (verificationResult.approved) {
      const { data: adData } = await supabase
        .from("ads")
        .select("points_per_task")
        .eq("id", adId)
        .single();

      const pointsToAward = adData?.points_per_task || 10;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tik_points")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ tik_points: profile.tik_points + pointsToAward })
          .eq("user_id", userId);
      }

      await supabase
        .from("task_submissions")
        .update({ points_awarded: pointsToAward, status: "approved" })
        .eq("ad_id", adId)
        .eq("user_id", userId);

      const { data: currentAd } = await supabase
        .from("ads")
        .select("completed_count")
        .eq("id", adId)
        .single();

      if (currentAd) {
        await supabase
          .from("ads")
          .update({ completed_count: currentAd.completed_count + 1 })
          .eq("id", adId);
      }

      await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount: pointsToAward,
          type: "earn",
          description: `Completed ${taskType} task`,
          reference_id: adId,
        });

      verificationResult.pointsAwarded = pointsToAward;
    }

    return new Response(
      JSON.stringify(verificationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ 
        approved: false, 
        reason: error instanceof Error ? error.message : "Verification failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
