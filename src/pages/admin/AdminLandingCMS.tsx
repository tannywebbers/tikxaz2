import { useState, useEffect } from "react";
import { 
  LayoutGrid, 
  Save,
  Loader2,
  Image,
  Type,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LandingContent {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  is_visible: boolean;
  sort_order: number;
}

export default function AdminLandingCMS() {
  const [sections, setSections] = useState<LandingContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching landing content:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load landing content." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSection = async (section: LandingContent) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({
          title: section.title,
          subtitle: section.subtitle,
          content: section.content,
          image_url: section.image_url,
          button_text: section.button_text,
          button_url: section.button_url,
          is_visible: section.is_visible,
        })
        .eq("id", section.id);

      if (error) throw error;

      toast({ title: "Saved", description: `${section.section_key} section updated.` });
      setEditingSection(null);
    } catch (error) {
      console.error("Error updating section:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update section." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (section: LandingContent) => {
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({ is_visible: !section.is_visible })
        .eq("id", section.id);

      if (error) throw error;

      setSections(prev =>
        prev.map(s => (s.id === section.id ? { ...s, is_visible: !s.is_visible } : s))
      );

      toast({ 
        title: "Updated", 
        description: `${section.section_key} is now ${!section.is_visible ? "visible" : "hidden"}.` 
      });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update visibility." });
    }
  };

  const updateLocalSection = (id: string, field: keyof LandingContent, value: any) => {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const getSectionIcon = (key: string) => {
    switch (key) {
      case "hero": return "🏠";
      case "features": return "✨";
      case "how_it_works": return "📋";
      case "stats": return "📊";
      case "cta": return "🚀";
      default: return "📄";
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
        <h1 className="text-2xl font-semibold text-neutral-100">Landing Page CMS</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Edit landing page content. Changes are reflected immediately.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map(section => (
          <Card 
            key={section.id} 
            className={`bg-neutral-900 border-neutral-800 ${!section.is_visible ? "opacity-60" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getSectionIcon(section.section_key)}</span>
                  <div>
                    <CardTitle className="text-neutral-100 capitalize">
                      {section.section_key.replace("_", " ")}
                    </CardTitle>
                    <CardDescription className="text-neutral-500">
                      {section.is_visible ? "Visible on landing page" : "Hidden from landing page"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(section)}
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    {section.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                    className="border-neutral-700"
                  >
                    {editingSection === section.id ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {editingSection === section.id && (
              <CardContent className="space-y-4 border-t border-neutral-800 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-neutral-400">Title</Label>
                    <Input
                      value={section.title || ""}
                      onChange={(e) => updateLocalSection(section.id, "title", e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                      placeholder="Section title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-neutral-400">Subtitle</Label>
                    <Input
                      value={section.subtitle || ""}
                      onChange={(e) => updateLocalSection(section.id, "subtitle", e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                      placeholder="Section subtitle"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-neutral-400">Content</Label>
                  <Textarea
                    value={section.content || ""}
                    onChange={(e) => updateLocalSection(section.id, "content", e.target.value)}
                    className="bg-neutral-800 border-neutral-700 min-h-[100px]"
                    placeholder="Section content..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-neutral-400">Image URL</Label>
                  <Input
                    value={section.image_url || ""}
                    onChange={(e) => updateLocalSection(section.id, "image_url", e.target.value)}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-neutral-400">Button Text</Label>
                    <Input
                      value={section.button_text || ""}
                      onChange={(e) => updateLocalSection(section.id, "button_text", e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                      placeholder="Get Started"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-neutral-400">Button URL</Label>
                    <Input
                      value={section.button_url || ""}
                      onChange={(e) => updateLocalSection(section.id, "button_url", e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                      placeholder="/register"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleUpdateSection(section)}
                    disabled={isSaving}
                    className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
