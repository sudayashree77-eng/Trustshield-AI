import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  ShieldAlert, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Menu,
  MessageSquare,
  PlusCircle,
  Settings,
  ShieldCheck,
  BrainCircuit,
  Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { analyzeMedia, ChatMessage, fileToBase64, DEFAULT_SYSTEM_INSTRUCTION } from './lib/gemini';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Welcome to **TrustShield AI**. Upload an image or video, and I will analyze it for signs of digital manipulation, face swapping, or AI generation.',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ mimeType: string; data: string; url: string; file: File }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    
    // Process files
    const processedFiles = await Promise.all(
      newFiles.map(async (file) => {
        try {
          const base64Data = await fileToBase64(file);
          return { ...base64Data, file };
        } catch (error) {
          console.error("Error processing file:", error);
          return null;
        }
      })
    );

    const validFiles = processedFiles.filter(Boolean) as typeof attachments;
    setAttachments((prev) => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      attachments: attachments.map(a => ({ mimeType: a.mimeType, data: a.data, url: a.url })),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Pass history excluding the welcome message if it's the only one, or just pass all
      const historyToPass = messages.filter(m => m.id !== 'welcome');
      
      const responseText = await analyzeMedia(
        historyToPass,
        userMessage.text,
        userMessage.attachments || [],
        systemPrompt
      );

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: '⚠️ **Error:** Failed to analyze the media. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div 
        className={cn(
          "flex-shrink-0 bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "w-64" : "w-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-cyan-500" />
          <span className="font-semibold tracking-tight">TrustShield AI</span>
        </div>
        
        <div className="p-3">
          <button className="w-full flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-md transition-colors text-sm font-medium">
            <PlusCircle className="w-4 h-4" />
            New Analysis
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2 mt-2">Recent</div>
          <button className="w-full flex items-center gap-2 hover:bg-zinc-800/50 text-zinc-300 px-3 py-2 rounded-md transition-colors text-sm text-left">
            <MessageSquare className="w-4 h-4 text-zinc-500" />
            <span className="truncate">Political Speech Video</span>
          </button>
          <button className="w-full flex items-center gap-2 hover:bg-zinc-800/50 text-zinc-300 px-3 py-2 rounded-md transition-colors text-sm text-left">
            <MessageSquare className="w-4 h-4 text-zinc-500" />
            <span className="truncate">Suspicious Profile Pic</span>
          </button>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm w-full"
          >
            <BrainCircuit className="w-4 h-4" />
            AI Training / Tuning
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-cyan-500" />
                <h2 className="font-semibold text-zinc-100">AI Training Directives</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-zinc-400 mb-4">
                Customize the system instructions to train the AI on specific forensic tasks. 
                You can instruct it to focus on specific types of deepfakes (e.g., audio sync, lighting anomalies, or specific generative models).
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">System Prompt</label>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_INSTRUCTION)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Reset to Default
              </button>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <header className="h-14 flex-shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center px-4 justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-medium text-zinc-200">Forensic Analysis Session</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Active
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-4 max-w-4xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === 'user' ? "bg-zinc-800" : "bg-cyan-950 border border-cyan-800 text-cyan-400"
              )}>
                {msg.role === 'user' ? <span className="text-xs font-medium">U</span> : <ShieldAlert className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className={cn(
                "flex flex-col gap-2 max-w-[80%]",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 max-w-xs">
                        <img src={att.url} alt="Attachment" className="w-full h-auto object-contain max-h-64" />
                        {att.mimeType.startsWith('video/') && (
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                            Video Frame
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Bubble */}
                {msg.text && (
                  <div className={cn(
                    "px-4 py-3 rounded-2xl",
                    msg.role === 'user' 
                      ? "bg-zinc-800 text-zinc-100 rounded-tr-sm" 
                      : "bg-transparent text-zinc-300 w-full"
                  )}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 text-zinc-400 font-mono text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                Analyzing media artifacts...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          <div className="max-w-4xl mx-auto">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((att, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden border border-zinc-700 bg-zinc-800 w-16 h-16">
                    <img src={att.url} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeAttachment(index)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="relative flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition-all">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*"
                multiple
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                title="Attach image or video"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about an image or video..."
                className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none resize-none focus:outline-none text-zinc-100 placeholder:text-zinc-500 py-2"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />

              <button 
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">
                AI analysis is probabilistic. Always verify critical findings with human forensic experts.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
