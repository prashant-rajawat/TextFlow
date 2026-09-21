import React, { useState, useEffect, useRef } from 'react';
import { TextInput } from '../components/TextInput';
import { LanguageSelector } from '../components/LanguageSelector';
import { VoiceSelector } from '../components/VoiceSelector';
import { VoiceSettings } from '../components/VoiceSettings';
import { GenerateButton } from '../components/GenerateButton';
import { AudioPlayer } from '../components/AudioPlayer';
import { ErrorMessage } from '../components/ErrorMessage';
import { DocumentUpload } from '../components/DocumentUpload';
import { FileInfoCard } from '../components/FileInfoCard';
import { TruncateConfirmModal } from '../components/TruncateConfirmModal';
import { AITextEnhancement } from '../components/AITextEnhancement';
import { AIEnhanceReviewModal } from '../components/AIEnhanceReviewModal';
import { SUPPORTED_LANGUAGES, MOCK_VOICES, getVoices, generateSpeech, revokeAudioObjectUrl } from '../services/ttsService';
import { extractTextFromFile } from '../services/fileService';
import { enhanceTextWithAI } from '../services/aiService';
import { fetchUserUsage } from '../services/usageService';
import { ApplicationError, AudioResult, AppState, Voice, VoiceSettingsState, ExtractedDocInfo } from '../types/tts';
import { AIEnhanceOperation, AIEnhanceReviewData } from '../types/ai';
import { TodayUsage } from '../types/usage';
import { AlertCircle, Gauge } from 'lucide-react';

export const Home: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-US-female-1');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsState>({
    speed: 1.0,
    pitch: 0,
    volume: 100,
    style: 'default',
  });
  
  const [appState, setAppState] = useState<AppState>('idle');
  const [error, setError] = useState<ApplicationError | null>(null);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [historyDebug, setHistoryDebug] = useState<{
    authenticatedUser: boolean;
    userId: string;
    audioBlobReceived: boolean;
    audioBlobSize: number;
    historyId: string;
    indexedDbSave: 'SUCCESS' | 'FAILED';
    supabaseInsert: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isDailyQuotaLocked, setIsDailyQuotaLocked] = useState<boolean>(false);

  // App Usage Tracking State
  const [todayUsage, setTodayUsage] = useState<TodayUsage | null>(null);

  // File Upload State
  const [uploadedFileInfo, setUploadedFileInfo] = useState<ExtractedDocInfo | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [pendingTruncateDoc, setPendingTruncateDoc] = useState<{
    text: string;
    info: ExtractedDocInfo;
  } | null>(null);

  // AI Text Enhancement State
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [activeEnhanceOperation, setActiveEnhanceOperation] = useState<AIEnhanceOperation | null>(null);
  const [aiReviewData, setAiReviewData] = useState<AIEnhanceReviewData | null>(null);

  const activeObjectUrlRef = useRef<string | null>(null);
  const isGeneratingRef = useRef<boolean>(false);
  const isProcessingFileRef = useRef<boolean>(false);
  const isEnhancingRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh user usage data helper
  const refreshUsage = async () => {
    try {
      const data = await fetchUserUsage();
      if (data && data.today) {
        setTodayUsage(data.today);
      }
    } catch {
      // Non-blocking usage fetch
    }
  };

  // Initial usage fetch
  useEffect(() => {
    refreshUsage();
  }, []);

  // Clean up object URL and cooldown timer on component unmount
  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        revokeAudioObjectUrl(activeObjectUrlRef.current);
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // Cooldown countdown interval runner
  useEffect(() => {
    if (cooldownSeconds > 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldownSeconds > 0]);

  const startCooldown = (seconds: number) => {
    const duration = Math.max(1, Math.round(seconds));
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setCooldownSeconds(duration);
  };

  // Handle language change: immediately select first valid voice for the new language
  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    const existingVoicesForLang = voices.filter((v) => v.language === newLanguage);
    if (existingVoicesForLang.length > 0) {
      setSelectedVoiceId(existingVoicesForLang[0].id);
    } else {
      const fallbackForLang = MOCK_VOICES.filter((v) => v.language === newLanguage);
      if (fallbackForLang.length > 0) {
        setSelectedVoiceId(fallbackForLang[0].id);
      }
    }
  };

  // Fetch available voices dynamically from backend API whenever language changes
  useEffect(() => {
    let isMounted = true;
    async function loadVoices() {
      try {
        const fetchedVoices = await getVoices(selectedLanguage);
        if (isMounted) {
          setVoices(fetchedVoices);
          if (fetchedVoices.length > 0) {
            const match = fetchedVoices.find((v) => v.id === selectedVoiceId && v.language === selectedLanguage);
            if (!match) {
              setSelectedVoiceId(fetchedVoices[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading voices:', err);
      }
    }

    loadVoices();
    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  // Clear validation errors and quota lock when user edits text
  const handleTextChange = (newText: string) => {
    setText(newText);
    if (error && error.type === 'validation') {
      setError(null);
    }
    if (isDailyQuotaLocked) {
      setIsDailyQuotaLocked(false);
    }
  };

  // Handle File Selection and Text Extraction
  const handleFileSelected = async (file: File) => {
    if (isProcessingFileRef.current || isProcessingFile || isGeneratingRef.current || appState === 'loading') {
      return;
    }

    isProcessingFileRef.current = true;
    setIsProcessingFile(true);
    setError(null);

    try {
      const extracted = await extractTextFromFile(file);

      if (extracted.characterCount > 5000) {
        setPendingTruncateDoc({
          text: extracted.text,
          info: extracted,
        });
      } else {
        setText(extracted.text);
        setUploadedFileInfo(extracted);
      }
    } catch (err: any) {
      setError({
        type: err.type || 'api',
        code: err.code,
        message: err.message || "We couldn't process this document. Please try another file.",
        details: err.details,
        statusCode: err.statusCode,
      });
    } finally {
      isProcessingFileRef.current = false;
      setIsProcessingFile(false);
    }
  };

  const handleConfirmTruncate = () => {
    if (!pendingTruncateDoc) return;
    const truncatedText = pendingTruncateDoc.text.slice(0, 5000);
    const updatedWords = truncatedText.trim() ? truncatedText.trim().split(/\s+/).filter(Boolean).length : 0;
    
    setText(truncatedText);
    setUploadedFileInfo({
      ...pendingTruncateDoc.info,
      characterCount: 5000,
      wordCount: updatedWords,
      isTruncated: true,
    });
    setPendingTruncateDoc(null);
    setError(null);
  };

  const handleCancelTruncate = () => {
    setPendingTruncateDoc(null);
  };

  const handleRemoveFile = () => {
    setUploadedFileInfo(null);
  };

  const validateInput = (): boolean => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError({
        type: 'validation',
        message: 'Please enter some text before generating speech.',
      });
      setAppState('error');
      return false;
    }

    if (text.length > 5000) {
      setError({
        type: 'validation',
        message: 'Your text exceeds the maximum limit of 5,000 characters.',
        details: `Current length is ${text.length} characters. Please shorten your text.`,
      });
      setAppState('error');
      return false;
    }

    setError(null);
    return true;
  };

  const currentVoiceObj = voices.find((v) => v.id === selectedVoiceId) || MOCK_VOICES.find((v) => v.id === selectedVoiceId);

  // Check if AI limit reached
  const isAILimitReached = Boolean(todayUsage && todayUsage.aiGenerations !== undefined && todayUsage.aiEnhancements >= todayUsage.aiLimit);
  const isTTSLimitReached = Boolean(todayUsage && todayUsage.ttsGenerations >= todayUsage.ttsLimit);

  // AI Text Enhancement Handlers
  const handleEnhance = async (operation: AIEnhanceOperation) => {
    if (isEnhancingRef.current || isEnhancing || appState === 'loading' || isProcessingFile) {
      return;
    }

    if (isAILimitReached) {
      setError({
        type: 'api',
        code: 'AI_DAILY_LIMIT_REACHED',
        message: 'You have reached your daily TextFlow AI enhancement limit. Please try again tomorrow.',
      });
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setError({
        type: 'validation',
        code: 'AI_INVALID_REQUEST',
        message: 'Please enter some text before enhancing.',
      });
      return;
    }

    if (text.length > 5000) {
      setError({
        type: 'validation',
        code: 'AI_INVALID_REQUEST',
        message: 'Your text exceeds the maximum limit of 5,000 characters.',
        details: `Current length is ${text.length} characters. Please shorten your text before enhancing.`,
      });
      return;
    }

    isEnhancingRef.current = true;
    setIsEnhancing(true);
    setActiveEnhanceOperation(operation);
    setError(null);

    try {
      const res = await enhanceTextWithAI(trimmed, operation, selectedLanguage);
      if (!res.success || typeof res.enhancedText !== 'string') {
        throw new Error('Failed to enhance text.');
      }

      const enhanced = res.enhancedText;
      const origWords = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      const enhWords = enhanced.trim() ? enhanced.trim().split(/\s+/).filter(Boolean).length : 0;

      setAiReviewData({
        operation,
        originalText: text,
        enhancedText: enhanced,
        originalCharCount: text.length,
        enhancedCharCount: enhanced.length,
        originalWordCount: origWords,
        enhancedWordCount: enhWords,
      });

      // Update usage after successful AI enhancement
      refreshUsage();
    } catch (err: any) {
      const errorCode = err.code || 'AI_PROVIDER_ERROR';
      if (errorCode === 'AI_DAILY_LIMIT_REACHED') {
        refreshUsage();
      }
      setError({
        type: err.type || 'api',
        code: errorCode,
        message: err.message || 'AI enhancement is temporarily unavailable. Please try again later.',
        details: err.details,
        statusCode: err.statusCode,
        retryAfter: err.retryAfter,
      });
    } finally {
      setIsEnhancing(false);
      setActiveEnhanceOperation(null);
      isEnhancingRef.current = false;
    }
  };

  const handleApplyEnhancedText = () => {
    if (!aiReviewData) return;
    const newText = aiReviewData.enhancedText;
    setText(newText);

    if (newText.length > 5000) {
      setError({
        type: 'validation',
        code: 'TEXT_TOO_LONG',
        message: 'The enhanced text exceeds the 5,000-character limit. Please shorten it before generating speech.',
        details: `Current length is ${newText.length} characters. Maximum allowed is 5,000.`,
      });
    } else if (error && error.type === 'validation') {
      setError(null);
    }

    setAiReviewData(null);
  };

  const handleDiscardEnhancedText = () => {
    setAiReviewData(null);
  };

  const handleGenerate = async () => {
    if (isGeneratingRef.current || appState === 'loading' || cooldownSeconds > 0 || isDailyQuotaLocked || isEnhancing) {
      return;
    }

    if (isTTSLimitReached) {
      setError({
        type: 'api',
        code: 'TTS_DAILY_LIMIT_REACHED',
        message: 'You have reached your daily TextFlow TTS limit. Please try again tomorrow.',
      });
      return;
    }

    if (!validateInput()) return;

    isGeneratingRef.current = true;
    setAppState('loading');
    setError(null);

    try {
      const currentLanguageObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
      const voiceObj = currentVoiceObj;

      const styleToSend = voiceObj?.capabilities?.style && voiceSettings.style && voiceSettings.style !== 'default'
        ? voiceSettings.style
        : undefined;

      const response = await generateSpeech({
        text: text.trim(),
        language: selectedLanguage,
        voiceId: selectedVoiceId,
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        style: styleToSend,
      });

      if (!response.success || !response.audioUrl) {
        throw new Error('Failed to generate valid speech audio');
      }

      if (activeObjectUrlRef.current) {
        revokeAudioObjectUrl(activeObjectUrlRef.current);
      }
      activeObjectUrlRef.current = response.audioUrl || null;

      const snippet = text.trim().slice(0, 60) + (text.length > 60 ? '...' : '');

      setAudioResult({
        audioUrl: response.audioUrl || '',
        audioStoragePath: response.audioStoragePath,
        isSecurelyStored: response.isSecurelyStored,
        durationSeconds: response.durationSeconds,
        textSnippet: snippet,
        languageName: currentLanguageObj?.name || selectedLanguage,
        voiceName: voiceObj?.name || 'Standard Voice',
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        style: styleToSend,
        createdAt: new Date(),
      });

      setHistoryDebug(response.debugInfo || null);

      setAppState('success');
      startCooldown(5);
      // Refresh user usage after generation
      refreshUsage();
    } catch (err: any) {
      setAudioResult(null);
      const errorCode = err.code;

      if (errorCode === 'TTS_DAILY_LIMIT_REACHED') {
        refreshUsage();
      } else if (errorCode === 'TTS_DAILY_QUOTA_EXCEEDED') {
        setIsDailyQuotaLocked(true);
      } else if (err.retryAfter && err.retryAfter > 0) {
        startCooldown(err.retryAfter);
      } else if (errorCode === 'TTS_RATE_LIMITED' || errorCode === 'TTS_REQUEST_THROTTLED') {
        startCooldown(5);
      }

      setError({
        type: err.type || 'api',
        code: errorCode,
        message: err.message || 'An error occurred while generating speech.',
        details: err.details,
        statusCode: err.statusCode,
        retryAfter: err.retryAfter,
      });
      setAppState('error');
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const isButtonDisabled =
    appState === 'loading' ||
    isEnhancing ||
    text.trim().length === 0 ||
    text.length > 5000 ||
    cooldownSeconds > 0 ||
    isDailyQuotaLocked ||
    isTTSLimitReached;

  return (
    <div id="home" className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
      {/* Primary Application Workspace Card */}
      <div className="bg-white border border-[#DDEBDD] rounded-2xl shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#DDEBDD]">
          <div>
            <h2 className="text-xl font-bold text-[#17301D]">
              Speech Studio
            </h2>
            <p className="text-xs text-[#65756A] mt-0.5">
              Enter your script, configure voice parameters, and synthesize natural audio.
            </p>
          </div>

          {todayUsage && (
            <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#F7FBF7] border border-[#DDEBDD] text-xs">
              <Gauge className="w-3.5 h-3.5 text-[#58B957]" />
              <span className="font-semibold text-[#17301D]">
                TTS: {todayUsage.ttsGenerations}/{todayUsage.ttsLimit}
              </span>
              <span className="text-[#8A978E]">·</span>
              <span className="font-semibold text-[#17301D]">
                AI: {todayUsage.aiEnhancements}/{todayUsage.aiLimit}
              </span>
            </div>
          )}
        </div>

        {/* Limit Warning Banners in Studio */}
        {isTTSLimitReached ? (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              You have reached your daily TextFlow TTS limit ({todayUsage?.ttsLimit}/{todayUsage?.ttsLimit}). Resets tomorrow.
            </span>
          </div>
        ) : todayUsage && todayUsage.ttsGenerations >= Math.floor(todayUsage.ttsLimit * 0.8) ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You've used {todayUsage.ttsGenerations} of {todayUsage.ttsLimit} daily TTS generations ({todayUsage.ttsRemaining} remaining).
            </span>
          </div>
        ) : null}

        {/* Document Upload Zone */}
        <DocumentUpload
          onFileSelected={handleFileSelected}
          isProcessing={isProcessingFile}
          disabled={appState === 'loading' || isEnhancing}
        />

        {/* Uploaded File Info Card */}
        {uploadedFileInfo && (
          <FileInfoCard
            fileInfo={uploadedFileInfo}
            onRemove={handleRemoveFile}
            disabled={appState === 'loading' || isProcessingFile || isEnhancing}
          />
        )}

        {/* Text Input Component */}
        <TextInput
          value={text}
          onChange={handleTextChange}
          maxLength={5000}
          disabled={appState === 'loading' || isProcessingFile || isEnhancing}
          error={error?.type === 'validation' ? error.message : null}
        />

        {/* AI Text Enhancement Actions */}
        <AITextEnhancement
          onEnhance={handleEnhance}
          isEnhancing={isEnhancing}
          activeOperation={activeEnhanceOperation}
          disabled={appState === 'loading' || isProcessingFile || isAILimitReached}
          hasText={text.trim().length > 0}
          isOverLimit={text.length > 5000}
        />

        {/* Validation or API Error Banner */}
        <ErrorMessage
          error={error}
          onDismiss={() => {
            setError(null);
            if (isDailyQuotaLocked) setIsDailyQuotaLocked(false);
          }}
        />

        {/* Controls Grid: Language & Voice Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            disabled={appState === 'loading' || isEnhancing}
          />

          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceChange={setSelectedVoiceId}
            voices={voices}
            disabled={appState === 'loading' || isEnhancing}
          />
        </div>

        {/* Voice Customization Settings */}
        <VoiceSettings
          settings={voiceSettings}
          onChange={setVoiceSettings}
          selectedVoice={currentVoiceObj}
          disabled={appState === 'loading' || isEnhancing}
        />

        {/* Generate Button Container */}
        <div className="pt-2 flex justify-center sm:justify-end">
          <GenerateButton
            onClick={handleGenerate}
            isLoading={appState === 'loading'}
            disabled={isButtonDisabled}
            cooldownSeconds={cooldownSeconds}
          />
        </div>
      </div>

      {/* Generated Audio Section */}
      <AudioPlayer result={audioResult} isLoading={appState === 'loading'} />

      {/* Studio Temporary Debug Panel (Available via ?debug=true for diagnostics) */}
      {typeof window !== 'undefined' && window.location.search.includes('debug=true') && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              🛠️ Studio Generation & Persistence Debug Panel
            </span>
            <span className="text-slate-400 text-[11px]">
              {historyDebug ? 'Last Generation Recorded' : 'Ready / No Generation Yet'}
            </span>
          </div>
          {historyDebug ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <p className="text-slate-400 font-semibold">Authentication State:</p>
                <p>Authenticated: <span className={historyDebug.authenticatedUser ? 'text-emerald-400' : 'text-amber-400'}>{String(historyDebug.authenticatedUser)}</span></p>
                <p className="truncate">User ID: <span className="text-slate-300">{historyDebug.userId}</span></p>
              </div>
              <div className="space-y-1 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <p className="text-slate-400 font-semibold">Audio Blob Details:</p>
                <p>Received: <span className={historyDebug.audioBlobReceived ? 'text-emerald-400' : 'text-rose-400'}>{String(historyDebug.audioBlobReceived)}</span></p>
                <p>Size: <span className="text-cyan-400">{historyDebug.audioBlobSize} bytes</span></p>
              </div>
              <div className="space-y-1 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <p className="text-slate-400 font-semibold">IndexedDB Write Status:</p>
                <p>Status: <span className={historyDebug.indexedDbSave === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{historyDebug.indexedDbSave}</span></p>
                <p className="truncate">History ID: <span className="text-slate-300">{historyDebug.historyId}</span></p>
              </div>
              <div className="space-y-1 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <p className="text-slate-400 font-semibold">Supabase Write Status:</p>
                <p>Status: <span className={
                  historyDebug.supabaseInsert === 'SUCCESS' ? 'text-emerald-400 font-bold' :
                  historyDebug.supabaseInsert === 'SKIPPED' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'
                }>{historyDebug.supabaseInsert}</span></p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic py-2">
              Generate speech above to inspect authenticated user state, audio Blob presence/size, and success status for IndexedDB & Supabase writes.
            </p>
          )}
        </div>
      )}

      {/* AI Enhancement Review Modal */}
      {aiReviewData && (
        <AIEnhanceReviewModal
          reviewData={aiReviewData}
          onApply={handleApplyEnhancedText}
          onDiscard={handleDiscardEnhancedText}
        />
      )}

      {/* Truncate Confirmation Modal for Documents > 5000 Characters */}
      {pendingTruncateDoc && (
        <TruncateConfirmModal
          isOpen={Boolean(pendingTruncateDoc)}
          fileName={pendingTruncateDoc.info.fileName}
          totalCharacters={pendingTruncateDoc.info.characterCount}
          onConfirm={handleConfirmTruncate}
          onCancel={handleCancelTruncate}
        />
      )}
    </div>
  );
};
