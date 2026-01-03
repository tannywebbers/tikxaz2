-- Add new task types: follow, combo_mini, combo_large
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'follow';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'combo_mini';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'combo_large';

-- Add tiktok_name column to profiles (display name, different from username)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_name TEXT;

-- Create table for AI provider configuration
CREATE TABLE IF NOT EXISTS public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  api_key_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider)
);

-- Create table for AI verification prompts (per task type)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL UNIQUE,
  prompt_name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  confidence_threshold INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_config (admin only)
CREATE POLICY "Admins can manage AI config" ON public.ai_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view AI config" ON public.ai_config
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for ai_prompts (admin only for write, read allowed for edge functions)
CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active prompts" ON public.ai_prompts
  FOR SELECT USING (is_active = true);

-- Insert default AI prompts for each task type
INSERT INTO public.ai_prompts (task_type, prompt_name, prompt_content, confidence_threshold) VALUES
('like', 'Like Verification', 'Analyze the screenshot to verify a TikTok like action. Look for:
- The heart icon must be RED/filled (not white/outline)
- The interface must be recognizable as TikTok
- If the heart is clearly red, approve. If white or unclear, reject.', 75),

('comment', 'Comment Verification', 'Analyze the screenshot to verify a TikTok comment. Look for:
- The comment section must be visible
- Find a comment containing or from the exact TikTok display name provided
- The name must match exactly (case-insensitive)
- Verify the comment is on the correct post', 75),

('save', 'Save Verification', 'Analyze the screenshot to verify a TikTok save/bookmark action. Look for:
- The bookmark icon must be YELLOW/filled (not white/outline)
- The interface must be recognizable as TikTok
- If the bookmark is clearly yellow, approve. If white or unclear, reject.', 75),

('follow', 'Follow Verification', 'Analyze the screenshot to verify a TikTok follow action. Look for:
- The follow button should show "Following" or be in followed state
- The interface must be recognizable as TikTok
- Look for visual indicators that the user is following the account', 75),

('combo_mini', 'Combo Mini Verification', 'Analyze the screenshots to verify Combo Mini (Like + Comment + Save). Check ALL of the following:
- LIKE: Heart icon must be RED/filled
- COMMENT: Find a comment with the exact TikTok display name provided
- SAVE: Bookmark icon must be YELLOW/filled
ALL three actions must be verified for approval. If any one fails, reject the entire submission.', 80),

('combo_large', 'Combo Large Verification', 'Analyze the screenshots to verify Combo Large (Like + Comment + Save + Follow). Check ALL of the following:
- LIKE: Heart icon must be RED/filled  
- COMMENT: Find a comment with the exact TikTok display name provided
- SAVE: Bookmark icon must be YELLOW/filled
- FOLLOW: Follow button must show "Following" state
ALL four actions must be verified for approval. If any one fails, reject the entire submission.', 85)
ON CONFLICT (task_type) DO NOTHING;

-- Insert default AI config
INSERT INTO public.ai_config (provider, is_enabled, is_default, api_key_set) VALUES
('gemini', true, true, false),
('openai', false, false, false)
ON CONFLICT (provider) DO NOTHING;

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();