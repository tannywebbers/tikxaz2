import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify with Lovable AI
async function verifyWithLovableAI(content: any[], verificationPrompt: string) {
  console.log("Verifying with Lovable AI...");

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: verificationPrompt },
        ...content.filter(c => c.type === "image_url")
      ]
    }
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      model: "google/gemini-2.5-flash",
      messages, 
      max_tokens: 1024 
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please contact support.");
    }
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error(`AI verification error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Generate a unique comment for a user based on video description
async function generateUniqueComment(
  videoDescription: string, 
  keywords: string[] | null,
  userId: string
): Promise<string> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) {
    return generateDeterministicComment(videoDescription, keywords, userId);
  }

  const prompt = `Generate a short, authentic TikTok comment (1-2 sentences, max 100 characters) for this video:
  
Video Description: "${videoDescription}"
${keywords?.length ? `Keywords to consider: ${keywords.join(", ")}` : ""}

Requirements:
- Sound natural and human-like
- Be positive and engaging
- No emojis or hashtags
- Unique and specific to the content
- Between 20-80 characters

Respond with ONLY the comment text, nothing else.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      }),
    });

    if (!response.ok) {
      return generateDeterministicComment(videoDescription, keywords, userId);
    }

    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content?.trim();
    return comment || generateDeterministicComment(videoDescription, keywords, userId);
  } catch {
    return generateDeterministicComment(videoDescription, keywords, userId);
  }
}

// Fallback deterministic comment generation
function generateDeterministicComment(
  videoDescription: string,
  keywords: string[] | null,
  userId: string
): string {
  const commentTemplates = [
    "This is exactly what I needed to see today!",
    "Love this content, keep it up!",
    "So inspiring, thank you for sharing!",
    "This made my day, great work!",
    "Amazing content, can't stop watching!",
    "This is fire, definitely sharing!",
    "Perfectly captured the vibe!",
    "You always deliver quality content!",
    "This hit different, love it!",
    "Needed to see this, great timing!",
  ];
  
  const hash = userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const index = Math.abs(hash) % commentTemplates.length;
  return commentTemplates[index];
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const requestBody = await req.json();
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Handle comment generation request
    if (requestBody.action === "generate_comment") {
      const { adId, userId } = requestBody;
      
      // Check if comment already generated
      const { data: existingComment } = await supabase
        .from("generated_comments")
        .select("comment_text")
        .eq("ad_id", adId)
        .eq("user_id", userId)
        .single();
      
      if (existingComment) {
        return new Response(
          JSON.stringify({ comment: existingComment.comment_text }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Get ad details
      const { data: ad } = await supabase
        .from("ads")
        .select("video_description, comment_keywords")
        .eq("id", adId)
        .single();
      
      const comment = await generateUniqueComment(
        ad?.video_description || "TikTok video",
        ad?.comment_keywords,
        userId
      );
      
      // Store the generated comment
      await supabase
        .from("generated_comments")
        .insert({
          ad_id: adId,
          user_id: userId,
          comment_text: comment
        });
      
      return new Response(
        JSON.stringify({ comment }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Main screenshot verification flow
    const { adId, userId, taskType, tiktokName, tiktokUsername, screenshots, expectedComment, advertiserDisplayName } = requestBody;

    console.log("Verifying task:", { adId, taskType, tiktokName, tiktokUsername, expectedComment, advertiserDisplayName, screenshotCount: screenshots?.length });

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
          status: "rejected"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing APPROVED submission for same ad (not just any submission)
    const { data: existingApproved } = await supabase
      .from("task_submissions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("ad_id", adId)
      .eq("status", "approved")
      .single();
    
    if (existingApproved) {
      return new Response(
        JSON.stringify({ 
          approved: false, 
          reason: "You have already completed this task",
          status: "rejected"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any previous rejected submissions so user can retry
    await supabase
      .from("task_submissions")
      .delete()
      .eq("user_id", userId)
      .eq("ad_id", adId)
      .eq("status", "rejected");

    // Fetch admin-configured prompt for this task type
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_content, confidence_threshold")
      .eq("task_type", taskType)
      .eq("is_active", true)
      .single();

    const confidenceThreshold = promptData?.confidence_threshold || 70;
    const displayName = tiktokName || tiktokUsername;

    // Get advertiser's display name if not provided
    let advertiserName = advertiserDisplayName;
    if (!advertiserName) {
      const { data: ad } = await supabase
        .from("ads")
        .select("creator_id")
        .eq("id", adId)
        .single();
      
      if (ad?.creator_id) {
        const { data: advertiserProfile } = await supabase
          .from("profiles")
          .select("tiktok_name, tiktok_username")
          .eq("user_id", ad.creator_id)
          .single();
        
        advertiserName = advertiserProfile?.tiktok_name || advertiserProfile?.tiktok_username || null;
      }
    }

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
    const customPrompt = promptData?.prompt_content || "";

    // Build verification prompt with advertiser name check
    let verificationPrompt = "";

    if (taskType === "comment") {
      verificationPrompt = `You are a TikTok screenshot verification AI. Your job is to verify that a specific comment was posted on a SPECIFIC video.

TASK: Verify COMMENT action
USER'S TIKTOK DISPLAY NAME: "${displayName}"
USER'S TIKTOK USERNAME: "@${tiktokUsername}"
EXPECTED COMMENT TEXT: "${expectedComment || 'Any comment from this user'}"
${advertiserName ? `ADVERTISER'S DISPLAY NAME: "${advertiserName}" - This name MUST appear somewhere in the screenshot (as the video creator/poster)` : ''}

${customPrompt}

CRITICAL VERIFICATION STEPS:
1. ${advertiserName ? `FIRST: Verify that the screenshot shows content from "${advertiserName}" - look for their name as the video poster/creator` : 'Identify the video being commented on'}
2. Look for the comment section in the screenshot
3. Find a comment posted by "${displayName}" OR "@${tiktokUsername}"
4. If expected comment is provided, check if the text matches or is very similar to: "${expectedComment}"

${advertiserName ? `
ANTI-FRAUD CHECK:
- The advertiser's name "${advertiserName}" MUST be visible in the screenshot as the content creator
- If you cannot find "${advertiserName}" in the screenshot, REJECT with reason "Wrong video - advertiser name not found"
` : ''}

MATCHING RULES FOR COMMENTS:
- Exact match = 100% confidence
- Minor differences (capitalization, punctuation, small typos) = 90% confidence
- Same meaning but different wording = 70% confidence
- No match found = 0% confidence

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected, null if approved",
  "detected_actions": {
    "liked": false,
    "saved": false,
    "commented": true/false,
    "followed": false
  },
  "found_username": "the username found in comments or null",
  "found_comment_text": "the exact comment text found or null",
  "comment_match_percentage": 0-100,
  "advertiser_name_found": true/false,
  "fraud_indicators": []
}`;
    } else if (taskType === "like") {
      verificationPrompt = `You are a TikTok screenshot verification AI.

TASK: Verify LIKE action on a SPECIFIC video
${advertiserName ? `ADVERTISER'S DISPLAY NAME: "${advertiserName}" - This name MUST appear somewhere in the screenshot as the video creator` : ''}

${customPrompt}

CRITICAL VERIFICATION STEPS:
1. ${advertiserName ? `FIRST: Verify that the screenshot shows content from "${advertiserName}" - their name must be visible as the video poster/creator` : 'Identify the video'}
2. Check that the heart/like icon is RED or PINK (filled state)
3. A white or outlined heart means NOT liked

${advertiserName ? `
ANTI-FRAUD CHECK:
- The advertiser's name "${advertiserName}" MUST be visible in the screenshot
- If you cannot find "${advertiserName}" as the video creator, REJECT with reason "Wrong video - advertiser name not found"
` : ''}

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected, null if approved",
  "detected_actions": {
    "liked": true/false,
    "saved": false,
    "commented": false,
    "followed": false
  },
  "heart_color": "red" | "white" | "unknown",
  "advertiser_name_found": true/false,
  "fraud_indicators": []
}`;
    } else if (taskType === "save") {
      verificationPrompt = `You are a TikTok screenshot verification AI.

TASK: Verify SAVE action on a SPECIFIC video
${advertiserName ? `ADVERTISER'S DISPLAY NAME: "${advertiserName}" - This name MUST appear somewhere in the screenshot as the video creator` : ''}

${customPrompt}

CRITICAL VERIFICATION STEPS:
1. ${advertiserName ? `FIRST: Verify that the screenshot shows content from "${advertiserName}" - their name must be visible as the video poster/creator` : 'Identify the video'}
2. Check that the bookmark/save icon is YELLOW or GOLD (filled state)
3. A white or outlined bookmark means NOT saved

${advertiserName ? `
ANTI-FRAUD CHECK:
- The advertiser's name "${advertiserName}" MUST be visible in the screenshot
- If you cannot find "${advertiserName}" as the video creator, REJECT with reason "Wrong video - advertiser name not found"
` : ''}

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected, null if approved",
  "detected_actions": {
    "liked": false,
    "saved": true/false,
    "commented": false,
    "followed": false
  },
  "bookmark_color": "yellow" | "white" | "unknown",
  "advertiser_name_found": true/false,
  "fraud_indicators": []
}`;
    } else {
      // Combo tasks
      verificationPrompt = `You are a TikTok screenshot verification AI.

TASK: Verify ${taskType.toUpperCase()} action(s) on a SPECIFIC video
REQUIRED ACTIONS: ${actionsToVerify.join(", ")}
USER'S TIKTOK NAME: "${displayName}"
${advertiserName ? `ADVERTISER'S DISPLAY NAME: "${advertiserName}" - This name MUST appear in the screenshots as the video/profile creator` : ''}

${customPrompt}

CRITICAL VERIFICATION STEPS:
1. ${advertiserName ? `FIRST: Verify that at least one screenshot shows content from "${advertiserName}"` : 'Identify the content'}

VERIFICATION CRITERIA:
${actionsToVerify.includes("liked") ? "- LIKE: Heart icon MUST be RED/PINK (filled)" : ""}
${actionsToVerify.includes("saved") ? "- SAVE: Bookmark icon MUST be YELLOW/GOLD (filled)" : ""}
${actionsToVerify.includes("commented") ? `- COMMENT: Find a comment from "${displayName}"${expectedComment ? `. Expected: "${expectedComment}"` : ""}` : ""}
${actionsToVerify.includes("followed") ? '- FOLLOW: Button must show "Following" state' : ""}

${advertiserName ? `
ANTI-FRAUD CHECK:
- The advertiser's name "${advertiserName}" MUST be visible in at least one screenshot
- If you cannot find "${advertiserName}", REJECT with reason "Wrong video/profile - advertiser name not found"
` : ''}

Check all provided screenshots for these actions.

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected, null if approved",
  "detected_actions": {
    "liked": true/false,
    "saved": true/false,
    "commented": true/false,
    "followed": true/false
  },
  "advertiser_name_found": true/false,
  "fraud_indicators": []
}`;
    }

    // Prepare image content
    const content: any[] = [];
    const maxScreenshots = taskType === "combo_large" ? 4 : 3;
    for (const screenshot of screenshots.slice(0, maxScreenshots)) {
      content.push({ type: "image_url", image_url: { url: screenshot } });
    }

    // Use Lovable AI for verification
    let aiContent: string | undefined;

    try {
      aiContent = await verifyWithLovableAI(content, verificationPrompt);
      console.log("AI response:", aiContent);
    } catch (aiError) {
      console.error("Lovable AI error:", aiError);
      // If AI fails, flag for manual review
      await supabase
        .from("task_submissions")
        .insert({
          ad_id: adId,
          user_id: userId,
          screenshot_urls: screenshots,
          status: "needs_review",
          ai_analysis: {
            error: aiError instanceof Error ? aiError.message : "AI verification failed",
            verified_at: new Date().toISOString(),
            task_type: taskType,
          },
          points_awarded: null,
        });

      return new Response(
        JSON.stringify({ 
          approved: false, 
          reason: "Verification temporarily unavailable. Submitted for manual review.",
          status: "needs_review"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let verificationResult: any;
    try {
      const jsonMatch = aiContent?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      verificationResult = { 
        status: "manual_review", 
        confidence_score: 0, 
        failed_reason: "Unable to parse AI response",
        detected_actions: { liked: false, saved: false, commented: false, followed: false }
      };
    }

    console.log("Parsed verification result:", verificationResult);

    // CRITICAL: Check if advertiser name was found (anti-fraud)
    if (advertiserName && verificationResult.advertiser_name_found === false) {
      verificationResult.status = "rejected";
      verificationResult.failed_reason = `Screenshot does not show content from "${advertiserName}". Please ensure you're performing the task on the correct video.`;
      verificationResult.confidence_score = 0;
    }

    // For comment tasks, apply stricter matching
    if (taskType === "comment" && expectedComment && verificationResult.advertiser_name_found !== false) {
      const foundComment = verificationResult.found_comment_text;
      const matchPercentage = verificationResult.comment_match_percentage || 0;
      
      // If AI found a comment, do additional string matching
      if (foundComment) {
        const expectedNormalized = expectedComment.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const foundNormalized = foundComment.toLowerCase().trim().replace(/[^\w\s]/g, '');
        
        // Check if they're similar enough
        const isSimilar = expectedNormalized.includes(foundNormalized.substring(0, 20)) || 
                          foundNormalized.includes(expectedNormalized.substring(0, 20)) ||
                          matchPercentage >= 70;
        
        if (isSimilar) {
          verificationResult.detected_actions.commented = true;
          verificationResult.confidence_score = Math.max(verificationResult.confidence_score || 0, 85);
          verificationResult.status = "approved";
        }
      }
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
      verificationResult.failed_reason = `Could not verify: ${failedActions.join(", ")}. Please ensure your screenshot clearly shows the completed action.`;
    }

    // Determine approval based on status and confidence
    const isApproved = verificationResult.status === "approved" && 
                       verificationResult.confidence_score >= confidenceThreshold &&
                       allActionsPassed;
    
    const needsReview = verificationResult.status === "manual_review" || 
      (verificationResult.confidence_score >= 50 && verificationResult.confidence_score < confidenceThreshold);

    verificationResult.provider = "lovable_ai";
    verificationResult.approved = isApproved;
    verificationResult.confidence = verificationResult.confidence_score;

    // Store submission
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
          expected_comment: expectedComment,
          advertiser_name: advertiserName,
        },
        points_awarded: null,
      });

    // If approved, update points and notify user
    if (isApproved) {
      const { data: adData } = await supabase.from("ads").select("points_per_task, completed_count").eq("id", adId).single();
      const pointsToAward = adData?.points_per_task || 10;

      const { data: profile } = await supabase.from("profiles").select("tik_points").eq("user_id", userId).single();
      if (profile) {
        await supabase.from("profiles").update({ tik_points: profile.tik_points + pointsToAward }).eq("user_id", userId);
      }

      await supabase.from("task_submissions").update({ points_awarded: pointsToAward }).eq("ad_id", adId).eq("user_id", userId);

      if (adData) {
        await supabase.from("ads").update({ completed_count: (adData.completed_count || 0) + 1 }).eq("id", adId);
      }

      await supabase.from("transactions").insert({
        user_id: userId,
        amount: pointsToAward,
        type: "earn",
        description: `Completed ${taskType} task`,
        reference_id: adId,
      });

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "task_approved",
        title: "Task Approved! 🎉",
        message: `Your ${taskType} task was approved! You earned ${pointsToAward} TikPoints.`,
        reference_id: adId,
      });

      verificationResult.pointsAwarded = pointsToAward;
    } else if (submissionStatus === "rejected") {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "task_rejected",
        title: "Task Not Approved",
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
}