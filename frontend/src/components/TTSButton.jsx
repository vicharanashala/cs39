import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';

const USE_WIT = true; // flip to false to force browser SpeechSynthesis

// Wit.ai TTS — streams audio via the user's own API key stored in localStorage
const speakWithWit = (text, apiKey) => {
  return new Promise((resolve, reject) => {
    const utterance = encodeURIComponent(text);
    // Wit.ai TTS endpoint — voice parameter selects the voice model
    const url = `https://api.wit.ai/synthesize?q=${utterance}&voice=en-US`;

    const audio = new Audio();
    audio.src = url;
    audio.autoplay = true;

    audio.onended   = resolve;
    audio.onerror   = (e) => {
      // Fall back to browser TTS if Wit fails
      console.warn('[TTS] Wit.ai failed, falling back to SpeechSynthesis');
      speakWithBrowser(text).then(resolve).catch(reject);
    };

    // Wit.ai auth — Bearer token
    audio.setAttribute('crossorigin', 'anonymous');
    const realPlay = audio.play.bind(audio);

    // Inject Authorization header via a MediaElementAudioRequest (not standard,
    // so we use a direct fetch + AudioContext route instead)
    fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      mode: 'cors'
    })
      .then(resp => {
        if (!resp.ok) throw new Error('Wit.ai request failed');
        return resp.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        audio.src = blobUrl;
        audio.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('audio decode failed')); };
        realPlay().catch(reject);
      })
      .catch(reject);
  });
};

// Browser SpeechSynthesis fallback — always works, no API key needed
const speakWithBrowser = (text) => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) { reject(new Error('no SpeechSynthesis')); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    // Pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                      voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira')) ||
                      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onend   = resolve;
    utterance.onerror = reject;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

export const TTSButton = ({ text, className = '', size = 'md' }) => {
  const [speaking, setSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('WIT_API_KEY') || '');
  const abortRef = useRef(null);

  const sizeClasses = size === 'sm'
    ? 'w-7 h-7'
    : size === 'lg'
    ? 'w-10 h-10'
    : 'w-8 h-8';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const stop = () => {
    window.speechSynthesis?.cancel();
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setSpeaking(false);
  };

  const play = async () => {
    if (!text || !text.trim()) return;

    if (speaking) { stop(); return; }

    setSpeaking(true);
    const apiKey = localStorage.getItem('WIT_API_KEY');

    try {
      if (USE_WIT && apiKey) {
        await speakWithWit(text, apiKey);
      } else {
        await speakWithBrowser(text);
      }
    } catch (err) {
      console.warn('[TTS] Playback error:', err.message);
    } finally {
      setSpeaking(false);
    }
  };

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('WIT_API_KEY', trimmed);
      setShowSettings(false);
    } else {
      localStorage.removeItem('WIT_API_KEY');
      setShowSettings(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Settings gear — only shown when no API key is set */}
      {!localStorage.getItem('WIT_API_KEY') && !speaking && (
        <button
          onClick={() => setShowSettings(v => !v)}
          className={`${sizeClasses} rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-500 transition-colors`}
          title="TTS settings"
        >
          <Settings className={iconSize} />
        </button>
      )}

      {/* Main speak / stop button */}
      <button
        onClick={play}
        className={`${sizeClasses} rounded-lg flex items-center justify-center transition-all ${className} ${
          speaking
            ? 'bg-brand-500 text-white shadow-md'
            : 'bg-slate-100 dark:bg-brand-800 text-slate-500 hover:text-brand-500 dark:hover:text-brand-400'
        }`}
        title={speaking ? 'Stop' : 'Listen to this answer'}
      >
        {speaking ? (
          // Animated bars
          <span className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className="w-0.5 bg-white rounded-full animate-pulse"
                style={{
                  height: `${6 + i * 3}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </span>
        ) : (
          <Volume2 className={iconSize} />
        )}
      </button>

      {/* Settings popover */}
      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-xl shadow-lg z-50 p-4 space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Voice Settings</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter your <span className="font-bold text-slate-700 dark:text-slate-200">Wit.ai API key</span> to enable voice synthesis.
            Without it, the browser's built-in voice is used (no key needed).
          </p>
          <a
            href="https://wit.ai/apps"
            target="_blank"
            rel="noreferrer"
            className="block text-[11px] text-brand-500 font-bold hover:underline"
          >
            Get your key at wit.ai →
          </a>
          <input
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="Paste WIT_API_KEY here"
            className="w-full border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 rounded-lg px-3 py-2 text-xs outline-none"
          />
          <button
            onClick={saveApiKey}
            className="w-full py-2 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-1.5 text-slate-400 text-[11px] font-bold hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};