import React, { useRef, useEffect } from 'react';
import { WordBoundary, SynthesisState } from '../types/azure';
import { getLanguageFromVoice, getPresetsForLanguage } from '../utils/languagePresets';
import { buildPersonalVoiceSsml } from '../lib/personalVoice/personalVoiceClient';
import { PersonalVoiceModel } from '../types/personalVoice';

interface PersonalVoiceInfo {
  isPersonalVoice: boolean;
  speakerProfileId?: string;
  locale?: string;
  model?: PersonalVoiceModel;
}

interface TextInputProps {
  text: string;
  onTextChange: (text: string) => void;
  wordBoundaries: WordBoundary[];
  currentWordIndex: number;
  selectedVoice: string;
  state: SynthesisState;
  personalVoiceInfo?: PersonalVoiceInfo;
  selectedPresetLanguage: string;
  onPresetLanguageChange: (language: string) => void;
  ssmlMode: boolean;
  onSsmlModeChange: (enabled: boolean) => void;
  ssmlText: string;
  onSsmlTextChange: (ssml: string) => void;
}

export function TextInput({
  text,
  onTextChange,
  wordBoundaries,
  currentWordIndex,
  selectedVoice,
  state,
  personalVoiceInfo,
  selectedPresetLanguage,
  onPresetLanguageChange,
  ssmlMode,
  onSsmlModeChange,
  ssmlText,
  onSsmlTextChange,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  // Get current language from selected voice
  const currentLanguage = getLanguageFromVoice(selectedVoice);

  // Use selected preset language, or default to voice's language
  const presetLanguage = selectedPresetLanguage || currentLanguage;
  const currentPresets = getPresetsForLanguage(presetLanguage);

  const handlePresetSelect = (presetKey: string) => {
    const preset = currentPresets[presetKey as keyof typeof currentPresets];
    if (preset) {
      onTextChange(preset);
      onSsmlModeChange(false); // Reset to plain text view when loading preset
    }
  };

  const isPlaying = state === 'synthesizing' || state === 'playing';

  // Sync scroll position between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Auto-scroll to keep current word visible
  useEffect(() => {
    if (currentWordIndex >= 0 && currentWordIndex < wordBoundaries.length) {
      const boundary = wordBoundaries[currentWordIndex];
      if (textareaRef.current && highlightRef.current) {
        const textarea = textareaRef.current;

        // Create a temporary element to measure the exact position of the word
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = window.getComputedStyle(textarea).cssText;
        measureDiv.style.position = 'absolute';
        measureDiv.style.visibility = 'hidden';
        measureDiv.style.height = 'auto';
        measureDiv.style.width = `${textarea.clientWidth - 24}px`; // Account for padding (12px * 2)
        measureDiv.style.whiteSpace = 'pre-wrap';
        measureDiv.style.wordWrap = 'break-word';
        measureDiv.style.font = window.getComputedStyle(textarea).font;
        measureDiv.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
        measureDiv.style.padding = '0';

        document.body.appendChild(measureDiv);

        // Get text up to the word boundary
        const textBeforeWord = text.substring(0, boundary.offset);
        measureDiv.textContent = textBeforeWord;
        const wordTopPosition = measureDiv.scrollHeight;

        // Get text including the word
        const textIncludingWord = text.substring(0, boundary.offset + boundary.length);
        measureDiv.textContent = textIncludingWord;
        const wordBottomPosition = measureDiv.scrollHeight;

        document.body.removeChild(measureDiv);

        // Get current scroll position and viewport dimensions
        const scrollTop = textarea.scrollTop;
        const viewportHeight = textarea.clientHeight;
        const viewportBottom = scrollTop + viewportHeight;

        const padding = 50; // Pixels of padding around the word

        // Check if word is above the viewport
        if (wordTopPosition < scrollTop + padding) {
          // Scroll up to show the word with padding from top
          textarea.scrollTop = Math.max(0, wordTopPosition - padding);
        }
        // Check if word is below the viewport
        else if (wordBottomPosition > viewportBottom - padding) {
          // Scroll down to show the word with padding from bottom
          textarea.scrollTop = wordBottomPosition - viewportHeight + padding;
        }
        // Word is already visible - no scroll needed

        // Sync highlight overlay scroll
        highlightRef.current.scrollTop = textarea.scrollTop;
        highlightRef.current.scrollLeft = textarea.scrollLeft;
      }
    }
  }, [currentWordIndex, wordBoundaries, text]);

  // Create highlighted text
  const getHighlightedText = () => {
    if (currentWordIndex < 0 || currentWordIndex >= wordBoundaries.length) {
      return text;
    }

    const boundary = wordBoundaries[currentWordIndex];
    const before = text.substring(0, boundary.offset);
    const highlighted = text.substring(boundary.offset, boundary.offset + boundary.length);
    const after = text.substring(boundary.offset + boundary.length);

    return (
      <>
        {before}
        <span className="bg-yellow-300 font-semibold">{highlighted}</span>
        {after}
      </>
    );
  };

  // Simple language detection based on character ranges
  const detectLanguageFromText = (text: string): string | null => {
    if (!text.trim()) return null;

    // Count characters in different scripts
    const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf]/g; // Chinese
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/g; // Hiragana + Katakana
    const koreanPattern = /[\uac00-\ud7af\u1100-\u11ff]/g; // Korean
    const arabicPattern = /[\u0600-\u06ff]/g; // Arabic
    const hebrewPattern = /[\u0590-\u05ff]/g; // Hebrew
    const cyrillicPattern = /[\u0400-\u04ff]/g; // Cyrillic (Russian, etc.)
    const thaiPattern = /[\u0e00-\u0e7f]/g; // Thai

    const cjkCount = (text.match(cjkPattern) || []).length;
    const japaneseCount = (text.match(japanesePattern) || []).length;
    const koreanCount = (text.match(koreanPattern) || []).length;
    const arabicCount = (text.match(arabicPattern) || []).length;
    const hebrewCount = (text.match(hebrewPattern) || []).length;
    const cyrillicCount = (text.match(cyrillicPattern) || []).length;
    const thaiCount = (text.match(thaiPattern) || []).length;

    // If significant presence of non-Latin characters, detect language
    const threshold = 5;

    if (japaneseCount > threshold) return 'ja-JP';
    if (koreanCount > threshold) return 'ko-KR';
    if (cjkCount > threshold) return 'zh-CN'; // Default to simplified Chinese
    if (arabicCount > threshold) return 'ar-SA';
    if (hebrewCount > threshold) return 'he-IL';
    if (cyrillicCount > threshold) return 'ru-RU';
    if (thaiCount > threshold) return 'th-TH';

    return null;
  };

  const isHDVoice = selectedVoice?.includes('DragonHD') && !personalVoiceInfo?.isPersonalVoice;

  // Generate SSML from plain text
  const generateSSML = (enhancePronunciation = false) => {
    // Use preset language selection, or detect from text, or fall back to voice language
    const detectedLanguage = detectLanguageFromText(text);
    const ssmlLocale = selectedPresetLanguage || detectedLanguage || currentLanguage || 'en-US';

    // Check if this is a personal voice
    if (personalVoiceInfo?.isPersonalVoice && personalVoiceInfo?.speakerProfileId) {
      return buildPersonalVoiceSsml(
        text,
        personalVoiceInfo.speakerProfileId,
        ssmlLocale,
        personalVoiceInfo.model || 'DragonLatestNeural'
      );
    }

    const voiceParameters = enhancePronunciation && isHDVoice
      ? ' parameters="enhancePronunciation=true"'
      : '';

    // Regular voice SSML
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ssmlLocale}">
  <voice name="${selectedVoice}"${voiceParameters}>
    ${text}
  </voice>
</speak>`;
  };

  const handleEnhancePronunciation = () => {
    onSsmlTextChange(generateSSML(true));
    onSsmlModeChange(true);
  };

  const displayText = ssmlMode ? ssmlText : text;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Text to Synthesize</h2>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          <span>
            {charCount} char{charCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Preset selector */}
      <div className="mb-3 grid grid-cols-[200px_1fr] gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preset Language
          </label>
          <select
            value={selectedPresetLanguage}
            onChange={(e) => onPresetLanguageChange(e.target.value)}
            disabled={isPlaying}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Voice Language ({currentLanguage})</option>
            <option value="ar-EG">Arabic (Egypt)</option>
            <option value="ar-SA">Arabic (Saudi Arabia)</option>
            <option value="bg-BG">Bulgarian</option>
            <option value="ca-ES">Catalan</option>
            <option value="cs-CZ">Czech</option>
            <option value="cy-GB">Welsh</option>
            <option value="da-DK">Danish</option>
            <option value="de-DE">German</option>
            <option value="el-GR">Greek</option>
            <option value="en-AU">English (Australia)</option>
            <option value="en-CA">English (Canada)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-IN">English (India)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Spanish (Spain)</option>
            <option value="es-MX">Spanish (Mexico)</option>
            <option value="et-EE">Estonian</option>
            <option value="fi-FI">Finnish</option>
            <option value="fr-CA">French (Canada)</option>
            <option value="fr-FR">French (France)</option>
            <option value="he-IL">Hebrew</option>
            <option value="hi-IN">Hindi</option>
            <option value="hr-HR">Croatian</option>
            <option value="hu-HU">Hungarian</option>
            <option value="id-ID">Indonesian</option>
            <option value="it-IT">Italian</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
            <option value="lt-LT">Lithuanian</option>
            <option value="lv-LV">Latvian</option>
            <option value="nb-NO">Norwegian</option>
            <option value="nl-NL">Dutch</option>
            <option value="pl-PL">Polish</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="pt-PT">Portuguese (Portugal)</option>
            <option value="ro-RO">Romanian</option>
            <option value="ru-RU">Russian</option>
            <option value="sk-SK">Slovak</option>
            <option value="sl-SI">Slovenian</option>
            <option value="sr-RS">Serbian</option>
            <option value="sv-SE">Swedish</option>
            <option value="th-TH">Thai</option>
            <option value="tr-TR">Turkish</option>
            <option value="uk-UA">Ukrainian</option>
            <option value="vi-VN">Vietnamese</option>
            <option value="zh-CN">Chinese (Mandarin)</option>
            <option value="zh-TW">Chinese (Taiwan)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Load Preset Text
          </label>
          <select
            onChange={(e) => handlePresetSelect(e.target.value)}
            disabled={isPlaying}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            defaultValue=""
          >
            <option value="">-- Select a preset --</option>
            <option value="podcast">Podcast</option>
            <option value="education">Education/Learning</option>
            <option value="instructions">Instructions/Guidance</option>
            <option value="story">Story/Narrative</option>
            <option value="ads">Advertisement</option>
            <option value="news">News Report</option>
            <option value="promotional">Promotional/Marketing</option>
            <option value="vlog">Vlog/Social Media</option>
            <option value="business">Business/Professional</option>
            <option value="callcenter">Call Center/Customer Care</option>
            <option value="standup">Stand-up Comedy</option>
            <option value="enthusiastic">Enthusiastic/Excited</option>
            <option value="casual">Casual Conversation</option>
            <option value="hesitant">Hesitant/Uncertain</option>
            <option value="explainer">Explainer Video</option>
          </select>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Highlighted overlay */}
        {currentWordIndex >= 0 && (
          <div
            ref={highlightRef}
            className="absolute inset-0 px-3 py-2 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-base leading-6 text-transparent"
            style={{ zIndex: 1 }}
          >
            {getHighlightedText()}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={(e) => {
            if (ssmlMode) {
              onSsmlTextChange(e.target.value);
            } else {
              onTextChange(e.target.value);
            }
          }}
          onScroll={handleScroll}
          placeholder={ssmlMode ? "Edit SSML markup here..." : "Enter text here to convert to speech..."}
          className="w-full h-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-base leading-6"
          style={{ position: 'relative', zIndex: 2, background: ssmlMode ? '#f0f7ff' : 'transparent' }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            if (!ssmlMode) {
              // Switching to SSML mode: generate SSML from current plain text
              onSsmlTextChange(generateSSML());
            }
            onSsmlModeChange(!ssmlMode);
          }}
          disabled={!text && !ssmlMode}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ssmlMode ? 'Show Plain Text' : 'Edit SSML'}
        </button>
        {ssmlMode && (
          <button
            onClick={() => onSsmlTextChange(generateSSML())}
            disabled={!text}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Regenerate SSML
          </button>
        )}
        {isHDVoice && (
          <button
            onClick={handleEnhancePronunciation}
            disabled={!text}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate SSML with enhancePronunciation=true for HD voices"
          >
            Enhance Pronunciation
          </button>
        )}
        <button
          onClick={() => onTextChange('')}
          disabled={!text}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Text
        </button>
      </div>
    </div>
  );
}
