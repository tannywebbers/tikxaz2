import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  User,
  Clock,
  ChevronLeft,
  RefreshCw,
  Circle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ChatSession {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  message_count?: number;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  message: string;
  is_from_user: boolean;
  created_at: string;
  moderator_id: string | null;
}

export default function AdminLiveChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id, selectedSession.user_id);
      subscribeToMessages(selectedSession.user_id);
    }
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Get all chat sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get profiles for user info
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, tiktok_username");

      // Get message counts per user
      const { data: messagesData } = await supabase
        .from("chat_messages")
        .select("user_id, is_read, is_from_user");

      const enrichedSessions = (sessionsData || []).map(session => {
        const profile = profilesData?.find(p => p.user_id === session.user_id);
        const userMessages = messagesData?.filter(m => m.user_id === session.user_id) || [];
        const messageCount = userMessages.filter(m => m.is_from_user).length;
        const unreadCount = userMessages.filter(m => m.is_from_user && !m.is_read).length;

        return {
          ...session,
          user_email: profile?.email || "Unknown",
          user_name: profile?.first_name 
            ? `${profile.first_name} ${profile.last_name || ""}`.trim()
            : profile?.tiktok_username || "User",
          message_count: messageCount,
          unread_count: unreadCount,
        };
      });

      setSessions(enrichedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load chats." });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_from_user", true);

    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const subscribeToMessages = (userId: string) => {
    const channel = supabase
      .channel(`admin-chat-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: selectedSession.user_id,
        message: newMessage.trim(),
        is_from_user: false,
        moderator_id: user.id,
      });

      if (error) throw error;

      setNewMessage("");
      
      // Update session updated_at
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedSession.id);

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    return d.toLocaleDateString();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-card rounded-xl border border-border overflow-hidden">
      {/* Sessions List */}
      <div className={`w-full md:w-96 border-r border-border flex flex-col ${selectedSession ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-white" />
              <span className="text-white">Live Chats</span>
            </h2>
            <Button variant="ghost" size="icon" onClick={fetchSessions} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 text-white ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No chat sessions found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedSession?.id === session.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white truncate">{session.user_name}</p>
                        {(session.unread_count ?? 0) > 0 && (
                          <Badge variant="default" className="text-xs">
                            {session.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{session.user_email}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>{session.message_count} messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Circle className={`w-2 h-2 ${session.status === "open" ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground"}`} />
                          <span className="text-xs text-muted-foreground capitalize">{session.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat View */}
      <div className={`flex-1 flex flex-col ${selectedSession ? "flex" : "hidden md:flex"}`}>
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedSession(null)}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{selectedSession.user_name}</p>
                <p className="text-sm text-muted-foreground">{selectedSession.user_email}</p>
              </div>
              <Badge variant={selectedSession.status === "open" ? "default" : "secondary"}>
                {selectedSession.status}
              </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const showDate = index === 0 || 
                    new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.is_from_user ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.is_from_user
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.is_from_user ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isSending || !newMessage.trim()}>
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-white">Select a chat</p>
              <p className="text-sm">Choose a conversation from the list to start responding</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
