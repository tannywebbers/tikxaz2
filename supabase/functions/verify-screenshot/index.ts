import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Prepare messages with images
    const content: any[] = [{ type: "text", text: verificationPrompt }];

    for (const screenshot of screenshots.slice(0, 3)) {
      if (screenshot.startsWith("data:image")) {
        content.push({
          type: "image_url",
          image_url: { url: screenshot },
        });
      } else {
        content.push({
          type: "image_url",
          image_url: { url: screenshot },
        });
      }
    }

    // Call Lovable AI with vision model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ approved: false, reason: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ approved: false, reason: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    console.log("AI response:", aiContent);

    // Parse AI response
    let verificationResult;
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
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
      // Don't throw, continue with response
    }

    // If approved, update points and ad
    if (verificationResult.approved) {
      // Get ad details for points
      const { data: adData } = await supabase
        .from("ads")
        .select("points_per_task")
        .eq("id", adId)
        .single();

      const pointsToAward = adData?.points_per_task || 10;

      // Update user points
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

      // Update submission with points
      await supabase
        .from("task_submissions")
        .update({ points_awarded: pointsToAward, status: "approved" })
        .eq("ad_id", adId)
        .eq("user_id", userId);

      // Increment ad completion count
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

      // Record transaction
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
