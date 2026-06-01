import { GoogleGenAI, Type } from "@google/genai";
import { 
  Camera, 
  ChevronRight, 
  Flame, 
  Heart, 
  Home,
  Loader2, 
  Maximize2, 
  Moon, 
  RefreshCcw, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Zap 
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { cn } from "./lib/utils";

/**
 * CONFIGURATION & TYPES
 */
export type Emotion = 'happy' | 'sad' | 'angry' | 'neutral';

export interface MoodData {
  emotion: Emotion;
  quote: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
  description: string;
}

const MOOD_CONFIGS: Record<Emotion, MoodData> = {
  happy: {
    emotion: 'happy',
    description: 'Radiating positivity and joy. Your interface is now bright and energetic.',
    quote: "The most wasted of all days is one without laughter.",
    colors: {
      primary: 'from-amber-400',
      secondary: 'to-orange-500',
      accent: 'bg-amber-400',
      glow: 'rgba(251, 191, 36, 0.4)',
    },
  },
  sad: {
    emotion: 'sad',
    description: 'Calm and reflective. The interface has transitioned to a soothing, deep atmosphere.',
    quote: "The morning will come, it has no choice.",
    colors: {
      primary: 'from-blue-600',
      secondary: 'to-indigo-950',
      accent: 'bg-blue-400',
      glow: 'rgba(59, 130, 246, 0.4)',
    },
  },
  angry: {
    emotion: 'angry',
    description: 'Intense energy detected. We\'ve activated a grounded, calm-breathing theme.',
    quote: "Inhale peace, exhale tension. Power is found in composure.",
    colors: {
      primary: 'from-red-600',
      secondary: 'to-zinc-950',
      accent: 'bg-red-500',
      glow: 'rgba(239, 68, 68, 0.4)',
    },
  },
  neutral: {
    emotion: 'neutral',
    description: 'Balanced and focused. Entering a minimal, futuristic cyber-state.',
    quote: "Stay focused. Stay curious. The future is yours to build.",
    colors: {
      primary: 'from-cyan-500',
      secondary: 'to-black',
      accent: 'bg-cyan-500',
      glow: 'rgba(6, 182, 212, 0.4)',
    },
  },
};

/**
 * AI SERVICE
 */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function detectEmotion(imageData: string): Promise<{ emotion: Emotion; quote: string }> {
  // Remove data:image/jpeg;base64, prefix
  const base64Data = imageData.split(',')[1];
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        {
          text: "Analyze the facial expression of the person in this image. Categorize the emotion into exactly one of these labels: 'happy', 'sad', 'angry', or 'neutral'. Also provide a short, modern motivational quote fitting this mood. Respond in JSON format.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING, enum: ['happy', 'sad', 'angry', 'neutral'] },
          quote: { type: Type.STRING },
        },
        required: ["emotion", "quote"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { emotion: 'neutral', quote: "Eyes on the prize." };
  }
}

/**
 * BACKGROUND PARTICLES COMPONENT
 */
const Background = ({ mood }: { mood: MoodData }) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dynamic Gradient Background */}
      <motion.div 
        animate={{ 
          background: `radial-gradient(circle at 50% 50%, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)` 
        }}
        className={cn(
          "absolute inset-0 transition-colors duration-1000 bg-gradient-to-br",
          mood.colors.primary,
          mood.colors.secondary
        )}
      />
      
      {/* Animated Glowing Orbs */}
      <div className="absolute inset-0 opacity-40">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [Math.random() * 100 - 50 + "%", Math.random() * 100 - 50 + "%"],
              y: [Math.random() * 100 - 50 + "%", Math.random() * 100 - 50 + "%"],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className={cn(
              "absolute w-96 h-96 rounded-full blur-[100px]",
              mood.colors.accent
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]"></div>
    </div>
  );
};

/**
 * MAIN APPLICATION
 */
export default function App() {
  const [mood, setMood] = useState<MoodData>(MOOD_CONFIGS.neutral);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupState, setSignupState] = useState<'form' | 'sending' | 'success'>('form');
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [welcomeNote, setWelcomeNote] = useState("");
  const webcamRef = useRef<Webcam>(null);

  const handleSignup = useCallback(async () => {
    if (!signupEmail) return;
    setSignupState('sending');
    
    // Generate a random temporary password
    const pwd = Math.random().toString(36).slice(-8).toUpperCase();
    setGeneratedPassword(pwd);

    let finalNote = "Welcome to the future of emotion-aware computing.";

    // AI generated welcome note
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ text: `Create a very short, futuristic, and positive welcome note for a new user joining 'MoodSync AI'. The user's email is ${signupEmail}. Make it feel personal and high-tech.` }] },
      });
      finalNote = response.text || finalNote;
      setWelcomeNote(finalNote);
    } catch (e) {
      setWelcomeNote(finalNote);
    }

    // Simulate validation and transmission delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    setSignupState('success');
  }, [signupEmail]);

  const handleLogin = useCallback(async () => {
    if (!loginEmail) return;
    setIsLoggingIn(true);
    
    // Simulate biometric/network authentication
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setUser({ email: loginEmail });
    setIsLoggingIn(false);
    setActiveTab(null);
  }, [loginEmail]);

  const startDemo = useCallback(() => {
    setIsDemoPlaying(true);
    setShowWebcam(false);
    const emotions: Emotion[] = ['happy', 'sad', 'angry', 'neutral'];
    let index = 0;
    
    const interval = setInterval(() => {
      setMood(MOOD_CONFIGS[emotions[index]]);
      index = (index + 1) % emotions.length;
    }, 2500);

    setTimeout(() => {
      clearInterval(interval);
      setIsDemoPlaying(false);
    }, 10000);
  }, []);

  const handleDetect = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setIsDetecting(true);
    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        const result = await detectEmotion(screenshot);
        setMood(MOOD_CONFIGS[result.emotion] || MOOD_CONFIGS.neutral);
      }
    } catch (error) {
      console.error("Detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return (
    <div className="relative min-h-screen font-sans selection:bg-white/30 selection:text-white">
      <Background mood={mood} />

      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-8 md:px-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className={cn("p-2 rounded-lg transition-all duration-500", mood.colors.accent)}>
            <Zap className="w-6 h-6 text-black fill-current" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">MoodSync AI</span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex items-center gap-8 text-sm font-medium"
        >
          <button onClick={() => setActiveTab('technology')} className="relative group opacity-60 hover:opacity-100 hover:text-white transition-all cursor-pointer">
            Technology
            <span className="absolute -top-1 -right-2 w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button onClick={() => setActiveTab('cases')} className="relative group opacity-60 hover:opacity-100 hover:text-white transition-all cursor-pointer">
            Case Studies
            <span className="absolute -top-3 -right-4 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] scale-0 group-hover:scale-100 transition-transform">NEW</span>
          </button>
          <button onClick={() => setActiveTab('network')} className="relative group opacity-60 hover:opacity-100 hover:text-white transition-all cursor-pointer">
            Network
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity font-mono text-cyan-400">14K ONLINE</span>
          </button>
          <button 
            onClick={() => setActiveTab('login')} 
            className="group px-5 py-2 glass rounded-full hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2"
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              user ? "bg-green-400" : "bg-white/40 group-hover:bg-cyan-400"
            )} />
            {user ? user.email.split('@')[0] : "Login"}
          </button>
        </motion.div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center max-w-5xl mx-auto">
        
        {/* Landing Content */}
        <AnimatePresence mode="wait">
          {!showWebcam ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-mono text-white/60">
                <ShieldCheck className="w-3 h-3" />
                <span>Next-Gen Facial Synthesis v2.4</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight leading-[0.9]">
                Interface that <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40">Feels Your Energy.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed italic">
                {mood.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => setShowWebcam(true)}
                  className="group relative px-8 py-4 bg-white text-black font-semibold rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center gap-2">
                    Start Mood Sync <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
                <button 
                  onClick={startDemo}
                  disabled={isDemoPlaying}
                  className={cn(
                    "px-8 py-4 glass rounded-2xl font-medium transition-all flex items-center gap-2",
                    isDemoPlaying ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
                  )}
                >
                  {isDemoPlaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    "View Demo"
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="interface"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col lg:grid lg:grid-cols-2 gap-8 items-start"
            >
              {/* Webcam Card */}
              <div className="w-full space-y-4">
                <div className="relative group rounded-[2.5rem] overflow-hidden glass p-3 ring-1 ring-white/20 neon-shadow-neutral transition-shadow duration-500"
                     style={{ boxShadow: `0 0 50px -10px ${mood.colors.glow}` }}>
                  <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-mono tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live Interface
                  </div>
                  
                  <div className="aspect-video relative rounded-[2rem] overflow-hidden bg-black/40">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }}
                      className="w-full h-full object-cover"
                      mirrored={true}
                      imageSmoothing={true}
                      screenshotQuality={1}
                      forceScreenshotSourceSize={true}
                      disablePictureInPicture={true}
                      onUserMedia={() => {}}
                      onUserMediaError={() => {}}
                    />
                    
                    {/* Scanner Effect */}
                    <AnimatePresence>
                      {isDetecting && (
                        <motion.div 
                          initial={{ top: 0 }}
                          animate={{ top: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-10 shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={isDetecting}
                    onClick={handleDetect}
                    className={cn(
                      "flex-1 relative flex items-center justify-center gap-3 px-8 py-5 rounded-3xl font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                      mood.colors.accent,
                      "text-black"
                    )}
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyzing Bio-Data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Detect My Mood
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowWebcam(false)}
                    className="p-5 glass rounded-3xl hover:bg-white/10 transition-colors"
                  >
                    <RefreshCcw className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Data Panel */}
              <div className="w-full h-full flex flex-col gap-6">
                <motion.div 
                  layout
                  className="glass-dark p-8 rounded-[2.5rem] flex-1 flex flex-col justify-between items-start text-left"
                >
                  <div className="space-y-6 w-full">
                    <div className="flex items-center justify-between">
                      <div className="px-4 py-1.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">Emotion Matrix</div>
                      <Maximize2 className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer" />
                    </div>

                    <div className="space-y-4">
                      <motion.h2 
                        key={mood.emotion}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-6xl font-display font-bold capitalize"
                      >
                        {mood.emotion}
                      </motion.h2>
                      <p className="text-white/50 leading-relaxed max-w-sm">
                        {mood.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Intensity', value: 'High', icon: Flame },
                        { label: 'Clarity', value: '98.2%', icon: Sun },
                        { label: 'Sync', value: 'Active', icon: Moon },
                        { label: 'Stability', value: 'Normal', icon: Heart },
                      ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                          <stat.icon className="w-5 h-5 opacity-40" />
                          <div>
                            <div className="text-[10px] uppercase opacity-40 font-bold">{stat.label}</div>
                            <div className="text-sm font-semibold">{stat.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <motion.div 
                    key={mood.quote}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-6 rounded-3xl bg-white/5 border-l-4 w-full"
                    style={{ borderLeftColor: mood.colors.accent.replace('bg-', '') }}
                  >
                    <p className="text-lg font-display italic text-white/80 leading-snug">
                      {mood.quote}
                    </p>
                  </motion.div>
                </motion.div>
                
                <button 
                  onClick={() => setShowWebcam(false)}
                  className="w-full py-4 bg-white text-black rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)]"
                >
                  <Home className="w-5 h-5" />
                  Return Home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Professional Footer */}
      <footer className="relative z-10 w-full pt-16 pb-12 border-t border-white/5 mt-12 bg-black/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-sm font-semibold font-mono tracking-wider opacity-70">
            Copyrights @2026 created by Akshaya S MCA
          </div>
        </div>
      </footer>

      {/* Modals Interface */}
      <AnimatePresence>
        {activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 bg-black/60 backdrop-blur-md"
            onClick={() => setActiveTab(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-dark w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[3rem] p-8 md:p-14 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveTab(null)}
                className="absolute top-8 right-8 p-3 rounded-full hover:bg-white/10 px-6 font-mono text-xs tracking-widest border border-white/10"
              >
                ESC_EXIT
              </button>

              {activeTab === 'technology' && (
                <div className="space-y-12">
                   <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-display font-bold">The Bio-Sync Stack</h2>
                    <p className="text-white/40 max-w-xl">Revolutionizing human-computer interaction through biological feedback loops.</p>
                   </div>
                   
                   <div className="grid md:grid-cols-3 gap-8">
                     {[ 
                       { title: 'Neural Map v4', desc: 'Real-time mapping of 142 facial micro-expressions.', color: 'bg-cyan-500' },
                       { title: 'CSS Synthesis', desc: 'Dynamic style injection based on physiological state.', color: 'bg-purple-500' },
                       { title: 'LLM Context', desc: 'Gemini-powered semantic analysis of user motivation.', color: 'bg-amber-500' },
                     ].map((item, i) => (
                       <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-4 hover:bg-white/10 transition-colors">
                         <div className={cn("w-12 h-1 rounded-full", item.color)} />
                         <h3 className="text-xl font-bold">{item.title}</h3>
                         <p className="text-sm text-white/50">{item.desc}</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeTab === 'cases' && (
                <div className="space-y-12">
                   <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-display font-bold">Case Studies</h2>
                    <p className="text-white/40">How MoodSync is being deployed across the digital frontier.</p>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="group glass p-8 rounded-[2rem] hover:border-white/20 transition-all">
                        <div className="text-xs font-mono text-white/30 mb-4">001 / EDUCATION</div>
                        <h3 className="text-2xl font-bold mb-4">Adaptive Learning Flow</h3>
                        <p className="text-white/50 text-sm leading-relaxed">
                          By detecting user frustration, the platform automatically de-escalates difficulty or triggers a calming meditation break, increasing retention by 42%.
                        </p>
                      </div>
                      <div className="group glass p-8 rounded-[2rem] hover:border-white/20 transition-all">
                        <div className="text-xs font-mono text-white/30 mb-4">002 / WORKFORCE</div>
                        <h3 className="text-2xl font-bold mb-4">Burnout Prevention</h3>
                        <p className="text-white/50 text-sm leading-relaxed">
                          Corporate hubs integrated MoodSync to adjust environmental lighting and cooling based on team stress levels detected in real-time.
                        </p>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'network' && (
                <div className="space-y-12 py-8 flex flex-col items-center text-center">
                   <div className="relative">
                     <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border border-cyan-500/30 flex items-center justify-center animate-pulse">
                       <Zap className="w-12 h-12 text-cyan-400" />
                     </div>
                     <div className="absolute inset-0 w-32 h-32 md:w-48 md:h-48 rounded-full border-t-2 border-cyan-400 animate-spin opacity-50" />
                   </div>

                   <div className="space-y-4">
                    <h2 className="text-4xl font-display font-bold">Global Node Status</h2>
                    <p className="text-white/40 tracking-widest font-mono text-xs uppercase">Network Connectivity: 99.98% / Nodes Active: 14,204</p>
                   </div>
                   
                   <div className="w-full max-w-sm h-1 bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: "0%" }}
                       animate={{ width: "76%" }}
                       className="h-full bg-cyan-400"
                     />
                   </div>
                </div>
              )}

              {activeTab === 'login' && (
                <div className="max-w-md mx-auto space-y-10">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-display font-bold">Welcome to the Singularity</h2>
                    <p className="text-white/40 text-sm">Secure biometric access to your personal cloud.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase ml-2">Bio-Token / Email</label>
                      <input 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full glass p-5 rounded-3xl bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" 
                        placeholder="hello@sync.ai" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase ml-2">Neural Signature / Pass</label>
                      <input className="w-full glass p-5 rounded-3xl bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" type="password" placeholder="••••••••" />
                    </div>
                    <button 
                      onClick={handleLogin}
                      disabled={isLoggingIn || !loginEmail}
                      className="w-full py-5 rounded-3xl bg-white text-black font-bold hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying Biosig...
                        </>
                      ) : (
                        "Access Interface"
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <button 
                      onClick={() => {
                        setActiveTab('signup');
                        setSignupState('form');
                        setSignupEmail("");
                      }}
                      className="text-xs text-white/30 hover:text-white transition-colors"
                    >
                      New Identity? Request Invitation
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'signup' && (
                <div className="max-w-xl mx-auto space-y-10">
                  <AnimatePresence mode="wait">
                    {signupState === 'form' && (
                      <motion.div 
                        key="signup-form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                      >
                        <div className="text-center space-y-2">
                          <h2 className="text-3xl font-display font-bold">Request Neural Access</h2>
                          <p className="text-white/40 text-sm">Join the closed beta of emotion-adaptive computing.</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase ml-2">Preferred Bio-ID (Email)</label>
                            <input 
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                              className="w-full glass p-5 rounded-3xl bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-mono" 
                              placeholder="identity@network.ai" 
                            />
                          </div>
                          <button 
                            onClick={handleSignup}
                            disabled={!signupEmail}
                            className="w-full py-5 rounded-3xl bg-white text-black font-bold hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-50"
                          >
                            Initiaize Invitaton
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {signupState === 'sending' && (
                      <motion.div 
                        key="signup-sending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 space-y-6"
                      >
                        <div className="relative">
                          <Loader2 className="w-16 h-16 animate-spin text-cyan-400" />
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-bold">Transmitting Invitation</h3>
                          <p className="text-white/40 text-sm font-mono animate-pulse">ENCRYPTING_BIO_NODES...</p>
                        </div>
                      </motion.div>
                    )}

                    {signupState === 'success' && (
                      <motion.div 
                        key="signup-success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-10"
                      >
                        <div className="p-8 rounded-[2.5rem] bg-cyan-400/10 border border-cyan-400/20 text-center space-y-6">
                          <div className="w-16 h-16 bg-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                            <ShieldCheck className="w-8 h-8 text-black" />
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-cyan-400">Invitation Transmitted!</h3>
                            <div className="prose prose-invert text-white/70 italic leading-relaxed font-display text-lg">
                              "{welcomeNote}"
                            </div>
                          </div>
                        </div>

                        <div className="glass p-8 rounded-3xl space-y-6">
                          <div className="space-y-2 text-center">
                            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Your Temporary Neural Key</p>
                            <div className="text-4xl font-mono font-bold tracking-[0.3em] text-white">
                              {generatedPassword}
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                            <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                            <p className="text-xs text-white/40 leading-relaxed">
                              We've simulated sending this invitation to <span className="text-white font-semibold">{signupEmail}</span>. 
                              Use the temporary key above to access your interface for the first time.
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setLoginEmail(signupEmail);
                            setActiveTab('login');
                          }}
                          className="w-full py-5 rounded-3xl bg-white text-black font-bold hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Proceed to Login
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
