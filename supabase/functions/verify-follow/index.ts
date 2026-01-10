import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use AI to check if follower follows target by analyzing profile page HTML
async function checkFollowWithAI(
  followerUsername: string,
  targetUsername: string
): Promise<{ isFollowing: boolean; confidence: number; reason: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // First, fetch the follower's profile page to get their following list
  console.log(`Fetching profile for @${followerUsername}...`);
  
  const profileUrl = `https://www.tiktok.com/@${followerUsername}`;
  
  try {
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch profile: ${response.status}`);
      return { 
        isFollowing: false, 
        confidence: 0, 
        reason: `Could not access @${followerUsername}'s profile. It may be private.` 
      };
    }

    const html = await response.text();
    
    // Look for JSON data that TikTok embeds
    const scriptMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i);
    
    if (scriptMatch) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const jsonString = JSON.stringify(jsonData);
        
        // Check if target username appears in the data
        const targetLower = targetUsername.toLowerCase().replace('@', '');
        const containsTarget = jsonString.toLowerCase().includes(targetLower);
        
        console.log(`Profile data fetched. Target @${targetUsername} found in data: ${containsTarget}`);
        
        // Use AI to analyze the data
        const aiPrompt = `Analyze this TikTok profile data to determine if user "@${followerUsername}" follows "@${targetUsername}".

Profile page HTML data preview (first 5000 chars):
${jsonString.substring(0, 5000)}

TASK: Determine if there's evidence that @${followerUsername} follows @${targetUsername}

Look for:
1. Following list data
2. Mutual relationship indicators
3. Any mention of @${targetUsername} in the following context

Respond ONLY with valid JSON:
{
  "is_following": true/false,
  "confidence": 0-100,
  "evidence": "what you found that indicates follow/no follow",
  "reason": "explanation"
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: aiPrompt }],
            max_tokens: 500
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
              isFollowing: result.is_following === true,
              confidence: result.confidence || 0,
              reason: result.reason || "AI analysis complete"
            };
          }
        }
      } catch (e) {
        console.error("Error parsing profile data:", e);
      }
    }

    // Fallback: Try to fetch the target's followers page
    console.log(`Checking @${targetUsername}'s followers...`);
    
    const targetProfileUrl = `https://www.tiktok.com/@${targetUsername}`;
    const targetResponse = await fetch(targetProfileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (targetResponse.ok) {
      const targetHtml = await targetResponse.text();
      const followerLower = followerUsername.toLowerCase().replace('@', '');
      
      // Check if follower appears in the target's page data
      if (targetHtml.toLowerCase().includes(followerLower)) {
        console.log(`Found @${followerUsername} mentioned on @${targetUsername}'s profile`);
        return {
          isFollowing: true,
          confidence: 75,
          reason: `Found reference to @${followerUsername} on @${targetUsername}'s profile`
        };
      }
    }

    // Cannot determine with high confidence
    return {
      isFollowing: false,
      confidence: 30,
      reason: "Could not verify follow status from public profile data. TikTok may be blocking scraping attempts."
    };
    
  } catch (error) {
    console.error("Scraping error:", error);
    return {
      isFollowing: false,
      confidence: 0,
      reason: error instanceof Error ? error.message : "Failed to check profile"
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

    // Primary: Check follow status by scraping profiles
    if (action === "verify_follow_scrape") {
      const { adId, userId, advertiserUsername, performerUsername } = params;
      
      console.log(`Verifying follow: @${performerUsername} -> @${advertiserUsername}`);
      
      // Check if user already submitted for this task
      const { data: existingSubmission } = await supabase
        .from("task_submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("ad_id", adId)
        .single();
      
      if (existingSubmission) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            reason: "You have already submitted for this task" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Get ad details
      const { data: ad } = await supabase
        .from("ads")
        .select("points_per_task, completed_count, required_completions")
        .eq("id", adId)
        .single();
      
      if (!ad) {
        return new Response(
          JSON.stringify({ verified: false, reason: "Task not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if task is still available
      if (ad.completed_count >= ad.required_completions) {
        return new Response(
          JSON.stringify({ verified: false, reason: "This task is no longer available" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Actually verify the follow using AI + scraping
      const checkResult = await checkFollowWithAI(performerUsername, advertiserUsername);
      
      console.log("Follow check result:", checkResult);
      
      // Only approve if we have reasonable confidence
      if (checkResult.isFollowing && checkResult.confidence >= 50) {
        // Create submission record
        const { data: submission, error: submissionError } = await supabase
          .from("task_submissions")
          .insert({
            ad_id: adId,
            user_id: userId,
            screenshot_urls: [],
            status: "approved",
            points_awarded: ad.points_per_task,
            ai_analysis: {
              method: "profile_scrape_ai",
              result: checkResult,
              verified_at: new Date().toISOString(),
              note: "Verified via profile analysis"
            }
          })
          .select()
          .single();
        
        if (submissionError) throw submissionError;
        
        // Store follow verification for delayed re-check
        await supabase
          .from("follow_verifications")
          .insert({
            submission_id: submission.id,
            ad_id: adId,
            user_id: userId,
            advertiser_tiktok_username: advertiserUsername,
            performer_tiktok_username: performerUsername,
            initial_check_passed: true,
            initial_check_at: new Date().toISOString(),
            scheduled_delay_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            status: "pending_delay_check"
          });
        
        // Award points
        const { data: profile } = await supabase
          .from("profiles")
          .select("tik_points")
          .eq("user_id", userId)
          .single();
        
        if (profile) {
          await supabase
            .from("profiles")
            .update({ tik_points: profile.tik_points + ad.points_per_task })
            .eq("user_id", userId);
        }
        
        // Update ad completion count
        await supabase
          .from("ads")
          .update({ completed_count: ad.completed_count + 1 })
          .eq("id", adId);
        
        // Create transaction record
        await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            amount: ad.points_per_task,
            type: "task_reward",
            description: "Follow task completed",
            reference_id: submission.id
          });
        
        // Create notification
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "task_approved",
            title: "Task Approved!",
            message: `Your follow task was approved! +${ad.points_per_task} TikPoints. Will be re-verified in 5 minutes.`,
            reference_id: adId
          });
        
        return new Response(
          JSON.stringify({ 
            verified: true, 
            points: ad.points_per_task,
            confidence: checkResult.confidence,
            message: `Follow verified! You earned ${ad.points_per_task} TikPoints. A re-check will occur in 5 minutes to ensure you remain following.`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // If confidence is low but not zero, mark for manual review
      if (checkResult.confidence >= 30 && checkResult.confidence < 50) {
        await supabase
          .from("task_submissions")
          .insert({
            ad_id: adId,
            user_id: userId,
            screenshot_urls: [],
            status: "needs_review",
            ai_analysis: {
              method: "profile_scrape_ai",
              result: checkResult,
              verified_at: new Date().toISOString(),
              note: "Low confidence, needs manual review"
            }
          });
        
        return new Response(
          JSON.stringify({ 
            verified: false, 
            reason: `Could not automatically verify follow. Your submission has been sent for manual review. Reason: ${checkResult.reason}`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          verified: false, 
          confidence: checkResult.confidence,
          reason: checkResult.reason || "Could not verify that you follow this user. Please make sure you're following them and your profile is public."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delayed verification check (called by scheduled job or admin)
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
      
      const checkResult = await checkFollowWithAI(
        verification.performer_tiktok_username,
        verification.advertiser_tiktok_username
      );
      
      // Update verification record
      await supabase
        .from("follow_verifications")
        .update({
          delay_check_at: new Date().toISOString(),
          delay_check_passed: checkResult.isFollowing,
          status: checkResult.isFollowing ? "verified" : (checkResult.confidence < 30 ? "unverifiable" : "unfollowed")
        })
        .eq("id", verificationId);
      
      // If user unfollowed, revoke points
      if (!checkResult.isFollowing && checkResult.confidence >= 50) {
        const { data: submission } = await supabase
          .from("task_submissions")
          .select("points_awarded, user_id")
          .eq("id", verification.submission_id)
          .single();
        
        if (submission?.points_awarded) {
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
          
          await supabase
            .from("task_submissions")
            .update({ status: "rejected", admin_notes: "User unfollowed after verification" })
            .eq("id", verification.submission_id);
          
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
          stillFollowing: checkResult.isFollowing,
          confidence: checkResult.confidence,
          reason: checkResult.reason
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process all pending delayed checks
    if (action === "process_pending_checks") {
      const { data: pendingChecks } = await supabase
        .from("follow_verifications")
        .select("*")
        .eq("status", "pending_delay_check")
        .lt("scheduled_delay_check", new Date().toISOString())
        .limit(10);

      if (!pendingChecks || pendingChecks.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let processed = 0;
      for (const check of pendingChecks) {
        try {
          const checkResult = await checkFollowWithAI(
            check.performer_tiktok_username,
            check.advertiser_tiktok_username
          );

          await supabase
            .from("follow_verifications")
            .update({
              delay_check_at: new Date().toISOString(),
              delay_check_passed: checkResult.isFollowing,
              status: checkResult.isFollowing ? "verified" : "unfollowed"
            })
            .eq("id", check.id);

          // Handle unfollow
          if (!checkResult.isFollowing && checkResult.confidence >= 50) {
            const { data: submission } = await supabase
              .from("task_submissions")
              .select("points_awarded, user_id")
              .eq("id", check.submission_id)
              .single();

            if (submission?.points_awarded) {
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

              await supabase
                .from("task_submissions")
                .update({ status: "rejected", admin_notes: "User unfollowed after delayed check" })
                .eq("id", check.submission_id);

              await supabase
                .from("notifications")
                .insert({
                  user_id: submission.user_id,
                  type: "points_revoked",
                  title: "Points Revoked",
                  message: `Your follow task points were revoked because you unfollowed the user.`,
                  reference_id: check.ad_id
                });
            }
          }

          processed++;
        } catch (e) {
          console.error(`Error processing check ${check.id}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ processed }),
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
      JSON.stringify({ 
        verified: false, 
        error: error instanceof Error ? error.message : "Verification failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
