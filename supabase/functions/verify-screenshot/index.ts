import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyWithGemini(content: any[], verificationPrompt: string, apiKey: string) {
  console.log("Attempting verification with Gemini...");
  
  const parts: any[] = [{ text: verificationPrompt }];
  
  for (const item of content) {
    if (item.type === "image_url") {
      const imageUrl = item.image_url.url;
      if (imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.split(",")[1];
        const mimeType = imageUrl.match(/data:([^;]+);/)?.[1] || "image/jpeg";
        parts.push({
          inline_data: { mime_type: mimeType, data: base64Data }
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
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
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
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function testApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say 'OK'" }] }],
            generationConfig: { maxOutputTokens: 10 }
          }),
        }
      );
      return response.ok;
    } else if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Say 'OK'" }],
          max_tokens: 10
        }),
      });
      return response.ok;
    }
    return false;
  } catch (error) {
    console.error("API key test error:", error);
    return false;
  }
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

    const requestBody = await req.json();
    
    // Handle API key test requests
    if (requestBody.test) {
      const provider = requestBody.provider;
      const apiKey = provider === "gemini" ? GEMINI_API_KEY : OPENAI_API_KEY;
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "API key not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const isValid = await testApiKey(provider, apiKey);
      return new Response(
        JSON.stringify({ success: isValid, error: isValid ? null : "Invalid API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      throw new Error("No AI API keys configured.");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { adId, userId, taskType, tiktokName, tiktokUsername, screenshots } = requestBody;

    console.log("Verifying task:", { adId, taskType, tiktokName, screenshotCount: screenshots?.length });

    if (!screenshots || screenshots.length === 0) {
      return new Response(
        JSON.stringify({ approved: false, reason: "No screenshots provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate/reused screenshots
    const { data: existingSubmissions } = await supabase
      .from("task_submissions")
      .select("screenshot_urls")
      .eq("user_id", userId)
      .neq("ad_id", adId);
    
    const usedScreenshots = new Set(
      existingSubmissions?.flatMap(s => s.screenshot_urls || []) || []
    );
    
    const reusedScreenshot = screenshots.find((s: string) => usedScreenshots.has(s));
    if (reusedScreenshot) {
      return new Response(
        JSON.stringify({ 
          approved: false, 
          reason: "Screenshot has been used in a previous submission",
          status: "rejected",
          detected_actions: { liked: false, saved: false, commented: false, followed: false }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing submission for same ad
    const { data: existingForAd } = await supabase
      .from("task_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("ad_id", adId)
      .single();
    
    if (existingForAd) {
      return new Response(
        JSON.stringify({ 
          approved: false, 
          reason: "You have already submitted for this task",
          status: "rejected"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin-configured prompt for this task type
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_content, confidence_threshold")
      .eq("task_type", taskType)
      .eq("is_active", true)
      .single();

    const confidenceThreshold = promptData?.confidence_threshold || 70;
    const displayName = tiktokName || tiktokUsername;

    // Determine required actions based on task type
    const requiredActions: Record<string, string[]> = {
      like: ["liked"],
      comment: ["commented"],
      save: ["saved"],
      follow: ["followed"],
      combo_mini: ["liked", "commented", "saved"],
      combo_large: ["liked", "commented", "saved", "followed"]
    };

    const actionsToVerify = requiredActions[taskType] || ["liked"];

    // Build comprehensive verification prompt
    const customPrompt = promptData?.prompt_content || "";
    
    const verificationPrompt = `You are an expert TikTok task verification AI. Analyze the provided screenshot(s) with extreme precision.

TASK TYPE: ${taskType.toUpperCase()}
USER'S TIKTOK DISPLAY NAME: "${displayName}"
REQUIRED ACTIONS TO VERIFY: ${actionsToVerify.join(", ")}

${customPrompt}

VERIFICATION RULES:
1. LIKE - Look for a RED/PINK filled heart icon (not outline). The heart must be solid colored, not just an outline.
2. SAVE - Look for a YELLOW/GOLD filled bookmark icon. It must be filled, not an outline.
3. FOLLOW - Look for "Following" button state or a checkmark next to follow. NOT "Follow" or "Follow back".
4. COMMENT - Look for a comment from EXACTLY the user "${displayName}". The name must match exactly as displayed. Check the comments section.

ANTI-FRAUD CHECKS:
- Verify the TikTok UI appears authentic (correct layout, colors, fonts)
- Check that all screenshots appear to be from the same TikTok post (consistent content)
- Look for any signs of image manipulation or editing
- Verify the user's display name in comments matches "${displayName}" exactly

FOR COMBO TASKS (${taskType}):
- ALL required actions must be verified for approval
- If ANY action fails, the entire task should be rejected
- Each action must be clearly visible in the screenshots

Respond ONLY with valid JSON in this exact format:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "detailed reason if rejected or needs review, null if approved",
  "detected_actions": {
    "liked": true/false,
    "saved": true/false,
    "commented": true/false,
    "followed": true/false
  },
  "matched_username": true/false,
  "fraud_indicators": ["list any suspicious elements found, empty array if none"]
}`;

    // Prepare image content
    const content: any[] = [];
    const maxScreenshots = taskType === "combo_large" ? 4 : 3;
    for (const screenshot of screenshots.slice(0, maxScreenshots)) {
      content.push({ type: "image_url", image_url: { url: screenshot } });
    }

    // Try Gemini first, fallback to OpenAI
    let aiContent: string | undefined;
    let usedProvider = "";

    if (GEMINI_API_KEY) {
      try {
        aiContent = await verifyWithGemini(content, verificationPrompt, GEMINI_API_KEY);
        usedProvider = "gemini";
      } catch (geminiError) {
        console.error("Gemini failed:", geminiError);
        if (OPENAI_API_KEY) {
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
    let verificationResult: any;
    try {
      const jsonMatch = aiContent?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      verificationResult = { 
        status: "manual_review", 
        confidence_score: 0, 
        failed_reason: "Unable to parse AI response",
        detected_actions: { liked: false, saved: false, commented: false, followed: false }
      };
    }

    // Validate all required actions passed
    const allActionsPassed = actionsToVerify.every(
      action => verificationResult.detected_actions?.[action] === true
    );

    // Override status if required actions didn't pass
    if (!allActionsPassed && verificationResult.status === "approved") {
      verificationResult.status = "rejected";
      const failedActions = actionsToVerify.filter(
        action => verificationResult.detected_actions?.[action] !== true
      );
      verificationResult.failed_reason = `Failed to verify: ${failedActions.join(", ")}`;
    }

    // Determine approval based on status and confidence
    const isApproved = verificationResult.status === "approved" && 
                       verificationResult.confidence_score >= confidenceThreshold &&
                       allActionsPassed;
    
    const needsReview = verificationResult.status === "manual_review" || 
      (verificationResult.confidence_score >= 50 && verificationResult.confidence_score < confidenceThreshold);

    verificationResult.provider = usedProvider;
    verificationResult.approved = isApproved;
    verificationResult.confidence = verificationResult.confidence_score;

    // Store submission with AI decision log
    const submissionStatus = isApproved ? "approved" : (needsReview ? "needs_review" : "rejected");
    
    await supabase
      .from("task_submissions")
      .insert({
        ad_id: adId,
        user_id: userId,
        screenshot_urls: screenshots,
        status: submissionStatus,
        ai_analysis: {
          ...verificationResult,
          verified_at: new Date().toISOString(),
          task_type: taskType,
          required_actions: actionsToVerify,
        },
        points_awarded: null,
      });

    // If approved, update points and notify user
    if (isApproved) {
      const { data: adData } = await supabase.from("ads").select("points_per_task").eq("id", adId).single();
      const pointsToAward = adData?.points_per_task || 10;

      const { data: profile } = await supabase.from("profiles").select("tik_points").eq("user_id", userId).single();
      if (profile) {
        await supabase.from("profiles").update({ tik_points: profile.tik_points + pointsToAward }).eq("user_id", userId);
      }

      await supabase.from("task_submissions").update({ points_awarded: pointsToAward, status: "approved" }).eq("ad_id", adId).eq("user_id", userId);

      const { data: currentAd } = await supabase.from("ads").select("completed_count").eq("id", adId).single();
      if (currentAd) {
        await supabase.from("ads").update({ completed_count: currentAd.completed_count + 1 }).eq("id", adId);
      }

      await supabase.from("transactions").insert({
        user_id: userId,
        amount: pointsToAward,
        type: "earn",
        description: `Completed ${taskType} task`,
        reference_id: adId,
      });

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "task_approved",
        title: "Task Approved! 🎉",
        message: `Your ${taskType} task was approved! You earned ${pointsToAward} TikPoints.`,
        reference_id: adId,
      });

      verificationResult.pointsAwarded = pointsToAward;
    } else if (submissionStatus === "rejected") {
      // Notify user of rejection
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "task_rejected",
        title: "Task Rejected",
        message: `Your ${taskType} task was not approved. Reason: ${verificationResult.failed_reason || "Verification failed"}`,
        reference_id: adId,
      });
    }

    return new Response(JSON.stringify(verificationResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ approved: false, reason: error instanceof Error ? error.message : "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});