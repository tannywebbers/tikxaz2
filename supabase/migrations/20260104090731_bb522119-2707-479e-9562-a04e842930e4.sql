-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_approved', 'task_rejected', 'task_completed', 'points_earned', 'points_spent', 'admin_credit', 'admin_debit', 'announcement', 'feature_update', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications" 
ON public.notifications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert notifications (for edge functions)
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Add animal avatars array for random assignment
-- Store some default animal avatar URLs that can be used
INSERT INTO public.platform_settings (key, value) 
VALUES ('animal_avatars', '["🦊", "🐼", "🦁", "🐯", "🐻", "🐨", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦆", "🦅", "🦉", "🐺", "🐗", "🐴", "🦄", "🐝", "🦋", "🐌", "🐢", "🐍", "🦎", "🦖", "🐙", "🦀", "🐠", "🐬", "🦈", "🐳"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;