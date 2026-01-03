import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Edit, 
  Save,
  Loader2,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIPrompt {
  id: string;
  task_type: string;
  prompt_name: string;
  prompt_content: string;
  is_active: boolean;
  confidence_threshold: number;
  created_at: string;
  updated_at: string;
}

const taskTypeColors: Record<string, string> = {
  like: "bg-red-500/10 text-red-400 border-red-500/20",
  comment: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  save: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  follow: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  combo_mini: "bg-gradient-to-r from-red-500/10 via-blue-500/10 to-yellow-500/10 text-neutral-100 border-neutral-500/20",
  combo_large: "bg-gradient-to-r from-red-500/10 via-blue-500/10 via-yellow-500/10 to-purple-500/10 text-neutral-100 border-neutral-500/20",
};

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .order("task_type");

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load prompts." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (prompt: AIPrompt) => {
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({ is_active: !prompt.is_active })
        .eq("id", prompt.id);

      if (error) throw error;

      setPrompts(prev =>
        prev.map(p => (p.id === prompt.id ? { ...p, is_active: !p.is_active } : p))
      );

      toast({ title: "Updated", description: `Prompt ${!prompt.is_active ? "activated" : "deactivated"}.` });
    } catch (error) {
      console.error("Error toggling prompt:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update prompt." });
    }
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({
          prompt_name: editingPrompt.prompt_name,
          prompt_content: editingPrompt.prompt_content,
          confidence_threshold: editingPrompt.confidence_threshold,
        })
        .eq("id", editingPrompt.id);

      if (error) throw error;

      setPrompts(prev =>
        prev.map(p => (p.id === editingPrompt.id ? editingPrompt : p))
      );
      setEditingPrompt(null);

      toast({ title: "Saved", description: "Prompt updated successfully." });
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save prompt." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-100">AI Verification Prompts</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure prompts for each task type verification</p>
      </div>

      <div className="grid gap-4">
        {prompts.map(prompt => (
          <div
            key={prompt.id}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${taskTypeColors[prompt.task_type] || "bg-neutral-800"}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-100">{prompt.prompt_name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize ${taskTypeColors[prompt.task_type] || "bg-neutral-700"}`}>
                      {prompt.task_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{prompt.prompt_content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                    <span>Confidence: {prompt.confidence_threshold}%</span>
                    <span>Updated: {new Date(prompt.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={prompt.is_active}
                    onCheckedChange={() => handleToggleActive(prompt)}
                  />
                  {prompt.is_active ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPrompt(prompt)}
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Edit Prompt</DialogTitle>
          </DialogHeader>

          {editingPrompt && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-neutral-300">Prompt Name</Label>
                <Input
                  value={editingPrompt.prompt_name}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_name: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-neutral-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-neutral-300">Task Type</Label>
                <div className={`px-3 py-2 rounded-lg border capitalize ${taskTypeColors[editingPrompt.task_type] || "bg-neutral-800 border-neutral-700"}`}>
                  {editingPrompt.task_type.replace("_", " ")}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-neutral-300">Prompt Content</Label>
                <Textarea
                  value={editingPrompt.prompt_content}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_content: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-neutral-100 min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-neutral-500">
                  This prompt will be sent to the AI for verification. Be specific about what to look for.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-neutral-300">Confidence Threshold: {editingPrompt.confidence_threshold}%</Label>
                <Slider
                  value={[editingPrompt.confidence_threshold]}
                  onValueChange={([value]) => setEditingPrompt({ ...editingPrompt, confidence_threshold: value })}
                  min={50}
                  max={100}
                  step={5}
                  className="py-2"
                />
                <p className="text-xs text-neutral-500">
                  Submissions below this threshold will be flagged for manual review.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPrompt(null)}
              className="border-neutral-700 text-neutral-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={isSaving}
              className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
