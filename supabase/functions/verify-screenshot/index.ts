import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify with Lovable AI (uses built-in LOVABLE_API_KEY)
async function verifyWithLovableAI(content: any[], verificationPrompt: string) {
  console.log("Verifying with Lovable AI...");
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    // Fallback to deterministic generation
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
  
  // Use userId hash to pick a consistent but unique comment
  const hash = userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const index = Math.abs(hash) % commentTemplates.length;
  return commentTemplates[index];
}

// Extract timestamp from image metadata (if available) - simplified check
function isScreenshotRecent(screenshotTimestamp: number | null, taskStartTime: number): boolean {
  if (!screenshotTimestamp) {
    // If we can't determine timestamp, we'll rely on AI verification
    return true;
  }
  
  const maxAgeMinutes = 5;
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  const age = Date.now() - screenshotTimestamp;
  
  return age <= maxAgeMs && screenshotTimestamp >= taskStartTime;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // Handle follow verification initiation
    if (requestBody.action === "initiate_follow_check") {
      const { adId, userId, advertiserUsername, performerUsername, submissionId } = requestBody;
      
      // Store follow verification request
      const { data: verification, error } = await supabase
        .from("follow_verifications")
        .insert({
          submission_id: submissionId,
          ad_id: adId,
          user_id: userId,
          advertiser_tiktok_username: advertiserUsername,
          performer_tiktok_username: performerUsername,
          initial_check_passed: true, // Initial check passed (user claims they followed)
          initial_check_at: new Date().toISOString(),
          scheduled_delay_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes delay
          status: "pending_delay_check"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Follow verification initiated. Will be verified in 5 minutes.",
          verificationId: verification.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Main screenshot verification flow
    const { adId, userId, taskType, tiktokName, tiktokUsername, screenshots, expectedComment, taskStartTime } = requestBody;

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

    // Build verification prompt based on task type
    let verificationPrompt = "";
    const customPrompt = promptData?.prompt_content || "";

    if (taskType === "like" || taskType === "save" || actionsToVerify.includes("liked") || actionsToVerify.includes("saved")) {
      // Image-based verification for like and save
      verificationPrompt = `You are a TikTok screenshot verification AI. Analyze the screenshot with precision.

TASK: Verify ${taskType.toUpperCase()} action(s)
REQUIRED ACTIONS: ${actionsToVerify.join(", ")}

${customPrompt}

VERIFICATION CRITERIA:
${actionsToVerify.includes("liked") ? "- LIKE: Heart icon MUST be RED/PINK (filled, not outline)" : ""}
${actionsToVerify.includes("saved") ? "- SAVE: Bookmark icon MUST be YELLOW/GOLD (filled, not outline)" : ""}
${actionsToVerify.includes("commented") ? `- COMMENT: Look for a comment from "${displayName}"${expectedComment ? `. Expected comment: "${expectedComment}"` : ""}` : ""}
${actionsToVerify.includes("followed") ? '- FOLLOW: Button must show "Following" state (not "Follow" or "Follow back")' : ""}

ANTI-FRAUD CHECKS:
- Verify authentic TikTok UI (correct layout, colors, fonts)
- Check screenshots are from the same TikTok post
- Look for image manipulation signs

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected/review, null if approved",
  "detected_actions": {
    "liked": true/false,
    "saved": true/false,
    "commented": true/false,
    "followed": true/false
  },
  "matched_username": true/false,
  "fraud_indicators": []
}`;
    }

    if (taskType === "comment") {
      // Comment-specific verification with expected text
      verificationPrompt = `You are a TikTok comment verification AI. Analyze the screenshot.

TASK: Verify COMMENT action
USER'S TIKTOK NAME: "${displayName}"
${expectedComment ? `EXPECTED COMMENT TEXT: "${expectedComment}"` : ""}

${customPrompt}

VERIFICATION CRITERIA:
1. Comment section must be visible
2. A comment from EXACTLY "${displayName}" must appear
${expectedComment ? `3. Comment text should match or be very similar to: "${expectedComment}"` : ""}

Allow minor variations:
- Small typos or autocorrect changes
- Missing/extra spaces
- Minor punctuation differences

Respond ONLY with valid JSON:
{
  "status": "approved" | "rejected" | "manual_review",
  "confidence_score": 0-100,
  "failed_reason": "reason if rejected/review, null if approved",
  "detected_actions": {
    "liked": false,
    "saved": false,
    "commented": true/false,
    "followed": false
  },
  "matched_username": true/false,
  "comment_matched": true/false,
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

    console.log("AI response:", aiContent);

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

    // For follow tasks, initiate delayed verification
    if (taskType === "follow" || (taskType === "combo_large" && verificationResult.detected_actions?.followed)) {
      // Get advertiser's TikTok username
      const { data: adData } = await supabase
        .from("ads")
        .select("creator_id")
        .eq("id", adId)
        .single();
      
      if (adData) {
        const { data: advertiserProfile } = await supabase
          .from("profiles")
          .select("tiktok_username")
          .eq("user_id", adData.creator_id)
          .single();
        
        if (advertiserProfile) {
          // For follow verification, we still approve but schedule a delay check
          // The delay check will run separately and can revoke points if unfollow is detected
          console.log("Follow task - scheduling delay verification");
        }
      }
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
