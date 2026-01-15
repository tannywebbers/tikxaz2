import { useState, useEffect } from "react";
import { 
  LayoutGrid, 
  Save,
  Loader2,
  Image,
  Type,
  Eye,
  EyeOff,
  Edit2,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Gift,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [editingSection, setEditingSection] = useState<LandingContent | null>(null);
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

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({
          title: editingSection.title,
          subtitle: editingSection.subtitle,
          content: editingSection.content,
          image_url: editingSection.image_url,
          button_text: editingSection.button_text,
          button_url: editingSection.button_url,
          is_visible: editingSection.is_visible,
        })
        .eq("id", editingSection.id);

      if (error) throw error;

      setSections(prev => prev.map(s => s.id === editingSection.id ? editingSection : s));
      toast({ title: "Saved", description: `${editingSection.section_key} section updated.` });
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

  const updateEditingSection = (field: keyof LandingContent, value: any) => {
    if (editingSection) {
      setEditingSection({ ...editingSection, [field]: value });
    }
  };

  const getSectionIcon = (key: string) => {
    switch (key) {
      case "hero": return <Sparkles className="w-5 h-5" />;
      case "features": return <Zap className="w-5 h-5" />;
      case "how_it_works": return <TrendingUp className="w-5 h-5" />;
      case "stats": return <Users className="w-5 h-5" />;
      case "cta": return <Gift className="w-5 h-5" />;
      default: return <LayoutGrid className="w-5 h-5" />;
    }
  };

  // Render preview based on section type
  const renderSectionPreview = (section: LandingContent) => {
    switch (section.section_key) {
      case "hero":
        return (
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20 p-6 md:p-8">
            <div className="text-center max-w-lg mx-auto">
              {section.subtitle && (
                <Badge className="mb-3 bg-primary/20 text-primary border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {section.subtitle}
                </Badge>
              )}
              <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {section.title || "Hero Title"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {section.content || "Hero description goes here..."}
              </p>
              {section.button_text && (
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                  {section.button_text}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );
      
      case "features":
        return (
          <div className="rounded-xl bg-muted/30 p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">{section.title || "Features"}</h3>
              <p className="text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                  <div className="w-8 h-8 rounded-full bg-primary/20 mx-auto mb-2" />
                  <div className="h-2 w-16 bg-muted rounded mx-auto mb-1" />
                  <div className="h-2 w-12 bg-muted/50 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        );
      
      case "how_it_works":
        return (
          <div className="rounded-xl bg-muted/30 p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">{section.title || "How It Works"}</h3>
              <p className="text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
            <div className="flex justify-between items-center gap-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 mx-auto mb-2 flex items-center justify-center text-primary font-bold">
                    {i}
                  </div>
                  <div className="h-2 w-16 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        );
      
      case "stats":
        return (
          <div className="rounded-xl bg-muted/30 p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">{section.title || "Stats"}</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {["10K+", "50K+", "1M+", "99%"].map((stat, i) => (
                <div key={i}>
                  <div className="text-lg font-bold text-primary">{stat}</div>
                  <div className="text-xs text-muted-foreground">Metric</div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "cta":
        return (
          <div className="rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 p-6 text-center">
            <h3 className="text-xl font-bold mb-2">{section.title || "Call to Action"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
            {section.button_text && (
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                {section.button_text}
              </Button>
            )}
          </div>
        );
      
      default:
        return (
          <div className="rounded-xl bg-muted/30 p-6 text-center">
            <h3 className="text-lg font-bold">{section.title || section.section_key}</h3>
            <p className="text-sm text-muted-foreground">{section.content}</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Landing Page CMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visual editor for your landing page. Click on sections to edit.
        </p>
      </div>

      {/* Visual Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
          <CardDescription>
            Click the edit button on each section to modify it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(section => (
            <div 
              key={section.id} 
              className={`relative group ${!section.is_visible ? "opacity-40" : ""}`}
            >
              {/* Section Preview */}
              {renderSectionPreview(section)}
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-xl">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setEditingSection(section)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit {section.section_key.replace("_", " ")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleVisibility(section)}
                >
                  {section.is_visible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {section.is_visible ? "Hide" : "Show"}
                </Button>
              </div>
              
              {/* Section Label */}
              <div className="absolute top-2 left-2 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  {getSectionIcon(section.section_key)}
                  {section.section_key.replace("_", " ")}
                </Badge>
                {!section.is_visible && (
                  <Badge variant="outline" className="text-xs">Hidden</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {editingSection && getSectionIcon(editingSection.section_key)}
              Edit {editingSection?.section_key.replace("_", " ")} Section
            </DialogTitle>
            <DialogDescription>
              Make changes to this section. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          {editingSection && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editingSection.title || ""}
                    onChange={(e) => updateEditingSection("title", e.target.value)}
                    placeholder="Section title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={editingSection.subtitle || ""}
                    onChange={(e) => updateEditingSection("subtitle", e.target.value)}
                    placeholder="Section subtitle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editingSection.content || ""}
                  onChange={(e) => updateEditingSection("content", e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Section content..."
                />
              </div>

              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={editingSection.image_url || ""}
                  onChange={(e) => updateEditingSection("image_url", e.target.value)}
                  placeholder="https://..."
                />
                {editingSection.image_url && (
                  <img 
                    src={editingSection.image_url} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg mt-2"
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={editingSection.button_text || ""}
                    onChange={(e) => updateEditingSection("button_text", e.target.value)}
                    placeholder="Get Started"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button URL</Label>
                  <Input
                    value={editingSection.button_url || ""}
                    onChange={(e) => updateEditingSection("button_url", e.target.value)}
                    placeholder="/register"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSection.is_visible}
                    onCheckedChange={(checked) => updateEditingSection("is_visible", checked)}
                  />
                  <Label>Visible on landing page</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSection} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}