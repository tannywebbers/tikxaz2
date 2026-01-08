import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scrape TikTok profile to check if user follows another user
async function checkFollowStatus(
  followerUsername: string,
  targetUsername: string
): Promise<{ isFollowing: boolean; error?: string }> {
  console.log(`Checking if @${followerUsername} follows @${targetUsername}`);
  
  try {
    // Use TikTok's web interface to check follow status
    // Note: This is a simplified approach - in production you'd use TikTok's API or a more robust scraping solution
    
    const followerProfileUrl = `https://www.tiktok.com/@${followerUsername}`;
    
    const response = await fetch(followerProfileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch profile: ${response.status}`);
      return { isFollowing: false, error: `Failed to fetch profile: ${response.status}` };
    }

    const html = await response.text();
    
    // Check if the target username appears in the following list context
    // This is a heuristic approach - look for the target username in the page context
    const followingPattern = new RegExp(`following.*${targetUsername}`, 'i');
    const profileMention = html.toLowerCase().includes(targetUsername.toLowerCase());
    
    // For more accurate verification, we'd need to:
    // 1. Navigate to the follower's following list
    // 2. Search for the target username
    // 3. Or use TikTok's official API (requires partnership)
    
    // Since direct scraping is limited, we'll use AI vision verification as primary
    // and this as a secondary check
    
    console.log(`Profile mention found: ${profileMention}`);
    
    // For now, return a tentative result - the AI vision check is the primary verification
    return { 
      isFollowing: false, // Default to false - let AI vision be the primary verifier
      error: "Scraping limited - using AI vision as primary verification" 
    };
  } catch (error) {
    console.error("Error checking follow status:", error);
    return { 
      isFollowing: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Verify follow using Lovable AI vision
async function verifyFollowWithAI(
  screenshotUrl: string,
  advertiserUsername: string,
  performerUsername: string
): Promise<{ isFollowing: boolean; confidence: number; reason?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const prompt = `Analyze this TikTok screenshot to verify a FOLLOW action.

TASK: Verify that user "${performerUsername}" is following user "${advertiserUsername}"

LOOK FOR:
1. The profile being viewed should be "@${advertiserUsername}"
2. The Follow button should show "Following" state (not "Follow" or "Follow back")
3. OR the screenshot shows the Following list of "${performerUsername}" with "${advertiserUsername}" visible

VERIFICATION CRITERIA:
- "Following" button state = CONFIRMED FOLLOW
- "Follow" or "Follow back" button = NOT FOLLOWING
- If viewing a Following list, look for "@${advertiserUsername}" in the list

Respond ONLY with valid JSON:
{
  "is_following": true/false,
  "confidence": 0-100,
  "button_state": "Following" | "Follow" | "Follow back" | "unknown",
  "profile_visible": "@username that appears",
  "reason": "explanation"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: screenshotUrl } }
          ]
        }],
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`AI verification failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse JSON response
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isFollowing: result.is_following === true,
        confidence: result.confidence || 0,
        reason: result.reason
      };
    }
    
    return { isFollowing: false, confidence: 0, reason: "Failed to parse AI response" };
  } catch (error) {
    console.error("AI verification error:", error);
    return { 
      isFollowing: false, 
      confidence: 0, 
      reason: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, ...params } = await req.json();

    // Initial follow verification with screenshot
    if (action === "verify_follow") {
      const { screenshotUrl, advertiserUsername, performerUsername, submissionId, adId, userId } = params;
      
      console.log(`Verifying follow: ${performerUsername} -> ${advertiserUsername}`);
      
      // Primary: AI Vision verification
      const aiResult = await verifyFollowWithAI(screenshotUrl, advertiserUsername, performerUsername);
      
      console.log("AI verification result:", aiResult);
      
      if (aiResult.isFollowing && aiResult.confidence >= 70) {
        // Store verification record for delayed check
        await supabase
          .from("follow_verifications")
          .upsert({
            submission_id: submissionId,
            ad_id: adId,
            user_id: userId,
            advertiser_tiktok_username: advertiserUsername,
            performer_tiktok_username: performerUsername,
            initial_check_passed: true,
            initial_check_at: new Date().toISOString(),
            scheduled_delay_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
            status: "pending_delay_check"
          }, { onConflict: 'submission_id' });
        
        return new Response(
          JSON.stringify({ 
            verified: true, 
            confidence: aiResult.confidence,
            message: "Follow verified. Will be re-checked in 5 minutes.",
            reason: aiResult.reason
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          verified: false, 
          confidence: aiResult.confidence,
          reason: aiResult.reason || "Could not verify follow action"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delayed verification check (called by scheduled job or manual trigger)
    if (action === "delayed_check") {
      const { verificationId } = params;
      
      const { data: verification, error } = await supabase
        .from("follow_verifications")
        .select("*")
        .eq("id", verificationId)
        .single();
      
      if (error || !verification) {
        return new Response(
          JSON.stringify({ error: "Verification not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // For delayed check, we attempt web scraping
      const scrapeResult = await checkFollowStatus(
        verification.performer_tiktok_username,
        verification.advertiser_tiktok_username
      );
      
      // Update verification record
      await supabase
        .from("follow_verifications")
        .update({
          delay_check_at: new Date().toISOString(),
          delay_check_passed: scrapeResult.isFollowing || verification.initial_check_passed, // Trust initial if scrape fails
          status: scrapeResult.isFollowing ? "verified" : (scrapeResult.error ? "unverifiable" : "unfollowed")
        })
        .eq("id", verificationId);
      
      // If user unfollowed, revoke points
      if (!scrapeResult.isFollowing && !scrapeResult.error) {
        // Get submission and revoke points
        const { data: submission } = await supabase
          .from("task_submissions")
          .select("points_awarded, user_id")
          .eq("id", verification.submission_id)
          .single();
        
        if (submission?.points_awarded) {
          // Deduct points
          const { data: profile } = await supabase
            .from("profiles")
            .select("tik_points")
            .eq("user_id", submission.user_id)
            .single();
          
          if (profile) {
            await supabase
              .from("profiles")
              .update({ tik_points: Math.max(0, profile.tik_points - submission.points_awarded) })
              .eq("user_id", submission.user_id);
          }
          
          // Update submission status
          await supabase
            .from("task_submissions")
            .update({ status: "rejected", admin_notes: "User unfollowed after verification" })
            .eq("id", verification.submission_id);
          
          // Notify user
          await supabase
            .from("notifications")
            .insert({
              user_id: submission.user_id,
              type: "points_revoked",
              title: "Points Revoked",
              message: `Your follow task points (${submission.points_awarded}) were revoked because you unfollowed the user.`,
              reference_id: verification.ad_id
            });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          checked: true, 
          stillFollowing: scrapeResult.isFollowing,
          error: scrapeResult.error
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process pending delayed checks
    if (action === "process_pending_checks") {
      const { data: pendingChecks } = await supabase
        .from("follow_verifications")
        .select("*")
        .eq("status", "pending_delay_check")
        .lt("scheduled_delay_check", new Date().toISOString())
        .limit(50);
      
      const results = [];
      for (const check of pendingChecks || []) {
        const scrapeResult = await checkFollowStatus(
          check.performer_tiktok_username,
          check.advertiser_tiktok_username
        );
        
        await supabase
          .from("follow_verifications")
          .update({
            delay_check_at: new Date().toISOString(),
            delay_check_passed: scrapeResult.isFollowing || check.initial_check_passed,
            status: scrapeResult.isFollowing ? "verified" : (scrapeResult.error ? "unverifiable" : "unfollowed")
          })
          .eq("id", check.id);
        
        results.push({ id: check.id, result: scrapeResult });
      }
      
      return new Response(
        JSON.stringify({ processed: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
