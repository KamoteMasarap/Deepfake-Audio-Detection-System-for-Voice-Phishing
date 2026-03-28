import React, { useEffect, useRef, useState } from "react";
import "../Stylesheets/Upload.css";
import humanSpectro from "../assets/Humanspectro.jpg";
import aiSpectro from "../assets/AIspectro.jpg";

const Upload = () => {
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const objectUrlRef = useRef("");

  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [progress, setProgress] = useState(0);
  const [humanPercent, setHumanPercent] = useState(85);
  const [aiPercent, setAiPercent] = useState(15);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [spectrogramReady, setSpectrogramReady] = useState(false);

  // Server integration states
  const [serverSpectrogram, setServerSpectrogram] = useState("");
  const [modelBreakdown, setModelBreakdown] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const analyzeAudio = async (file) => {
    setStatus("loading");
    setProgress(0);
    setShowAnalysis(false);
    setShowDropdown(false);

    let current = 0;
    const interval = setInterval(() => {
      current += (100 - current) * 0.1;
      setProgress(Math.min(current, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");
      const data = await response.json();

      console.log("RECEIVED FROM PYTHON:", data);

      setServerSpectrogram(data.spectrogram);
      setModelBreakdown(data.breakdown);
      setAudioFeatures(data.features);

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        if (data.verdict === "REAL") {
          setHumanPercent(Math.round(data.confidence));
          setAiPercent(100 - Math.round(data.confidence));
        } else {
          setAiPercent(Math.round(data.confidence));
          setHumanPercent(100 - Math.round(data.confidence));
        }
        setStatus("done");
      }, 350);
    } catch (error) {
      console.error("API Error:", error);
      clearInterval(interval);
      setStatus("idle");
      alert("Failed to analyze audio. Make sure the Python server is running!");
    }
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const width = Math.max(1, canvas.clientWidth || 1200);
    const height = Math.max(1, canvas.clientHeight || 130);

    canvas.width = width;
    canvas.height = height;

    return { canvas, width, height };
  };

  const drawFallbackCanvas = () => {
    const sized = sizeCanvas();
    if (!sized) return;

    const { canvas, width, height } = sized;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const base = ctx.createLinearGradient(0, 0, width, 0);
    base.addColorStop(0, "#11004a");
    base.addColorStop(0.33, "#4d0064");
    base.addColorStop(0.66, "#6c063f");
    base.addColorStop(1, "#1b0054");

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const blobs = [
      { x: width * 0.1, y: height * 0.4, r: height * 0.35, c: "rgba(69, 18, 199, 0.7)" },
      { x: width * 0.28, y: height * 0.72, r: height * 0.32, c: "rgba(202, 28, 152, 0.65)" },
      { x: width * 0.52, y: height * 0.24, r: height * 0.28, c: "rgba(255, 88, 24, 0.8)" },
      { x: width * 0.72, y: height * 0.76, r: height * 0.24, c: "rgba(255, 196, 0, 0.72)" },
    ];

    blobs.forEach((blob) => {
      const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      g.addColorStop(0, blob.c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    });

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = 0; x < width; x += 12) {
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < width; x += 180) {
      ctx.fillRect(x, 0, 1, height);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setAudioFile(file);
    setAudioUrl(url);
    setIsPlaying(false);
    setIsMuted(false);
    setCurrentTime(0);
    setDuration(0);

    setSpectrogramReady(false);
    setServerSpectrogram("");
    setModelBreakdown(null);
    setAudioFeatures(null);

    analyzeAudio(file);

    requestAnimationFrame(() => {
      drawFallbackCanvas();
      setSpectrogramReady(true);
    });
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleBrowse = () => inputRef.current?.click();

  const updateProgressLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (!audio.paused && !audio.ended) {
      animationRef.current = requestAnimationFrame(updateProgressLoop);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
      updateProgressLoop();
    } catch (error) {
      console.error("Audio playback failed:", error);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(e.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const getDynamicAnalysisRows = () => {
    if (!audioFeatures) return [];

    return [
      {
        feature: "Pitch Variation",
        description: "Measures natural fluctuations in voice pitch",
        result: `${audioFeatures.pitch_std.toFixed(2)} Hz std dev`,
        interpretation: audioFeatures.pitch_std > 15 ? "High Variation (Likely Human)" : "Low Variation (Possible AI)",
        interpretationClass: audioFeatures.pitch_std > 15 ? "good" : "bad",
      },
      {
        feature: "Speech Rhythm",
        description: "Estimated words/beats per minute",
        result: `${audioFeatures.tempo.toFixed(0)} BPM`,
        interpretation: (audioFeatures.tempo > 70 && audioFeatures.tempo < 170) ? "Natural Speaking Pace" : "Irregular Pace",
        interpretationClass: (audioFeatures.tempo > 70 && audioFeatures.tempo < 170) ? "good" : "bad",
      },
      {
        feature: "Audio Cleanliness",
        description: "Measures spectral flatness and artificial silence",
        result: `Flatness: ${audioFeatures.flatness.toFixed(4)}`,
        interpretation: audioFeatures.flatness < 0.05 ? "Tonal (Human Speech)" : "Noisy/Flat (Possible Artifacts)",
        interpretationClass: audioFeatures.flatness < 0.05 ? "good" : "bad",
      },
      {
         feature: "Background Noise",
         description: "Zero Crossing Rate (ZCR) activity",
         result: `ZCR: ${audioFeatures.zcr.toFixed(3)}`,
         interpretation: audioFeatures.zcr > 0.02 ? "Natural Ambient Noise" : "Unnaturally Clean",
         interpretationClass: audioFeatures.zcr > 0.02 ? "good" : "bad",
      },
      {
         feature: "Vocal Tract Variance",
         description: "MFCC Variance measuring dynamic mouth/throat shape",
         result: `MFCC Var: ${audioFeatures.mfcc_var ? audioFeatures.mfcc_var.toFixed(1) : 'N/A'}`,
         interpretation: (audioFeatures.mfcc_var && audioFeatures.mfcc_var > 150) ? "Dynamic Shape (Human)" : "Static Shape (AI Model)",
         interpretationClass: (audioFeatures.mfcc_var && audioFeatures.mfcc_var > 150) ? "good" : "bad",
      },
      {
         feature: "High-Frequency Profile",
         description: "Spectral Roll-off measuring audio cutoff/hiss",
         result: `Roll-off: ${audioFeatures.rolloff ? audioFeatures.rolloff.toFixed(0) : 'N/A'} Hz`,
         interpretation: (audioFeatures.rolloff && audioFeatures.rolloff > 2000) ? "Natural Spectrum" : "Muffled/Cutoff (AI Artifact)",
         interpretationClass: (audioFeatures.rolloff && audioFeatures.rolloff > 2000) ? "good" : "bad",
      },
      {
         feature: "Syllable Attack",
         description: "Onset Envelope Variance measuring emphasis",
         result: `Onset Var: ${audioFeatures.onset_var ? audioFeatures.onset_var.toFixed(2) : 'N/A'}`,
         interpretation: (audioFeatures.onset_var && audioFeatures.onset_var > 0.5) ? "Variable Emphasis (Human)" : "Robotic Uniformity",
         interpretationClass: (audioFeatures.onset_var && audioFeatures.onset_var > 0.5) ? "good" : "bad",
      }
    ];
  };

  const dynamicRows = getDynamicAnalysisRows();
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <section className="upload">
      <div className="upload__panel">
        <h2 className="upload__title">Upload an Audio File to Analyze</h2>
        <p className="upload__subtitle">Check if the audio is generated by AI or real human.</p>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg"
          className="upload__input"
          onChange={handleInputChange}
        />

        {!audioFile ? (
          <div className="upload__box">
            <p className="upload__text">Drag your audio file here or</p>
            <button
              className="upload__button upload__button--primary"
              onClick={handleBrowse}
              type="button"
            >
              Browse File
            </button>
            <p className="upload__formats">Supported format: MP3, WAV - Size: 50MB</p>
          </div>
        ) : (
          <div className="upload__resultWrap">
            <div className="upload__preview">
              <div className="upload__waveform">
                {serverSpectrogram ? (
                  <img
                    src={serverSpectrogram}
                    className="upload__spectrogramCanvas"
                    alt="AI Spectrogram"
                    style={{ width: "100%", height: "100%", objectFit: "fill" }}
                  />
                ) : (
                  <canvas ref={canvasRef} className="upload__spectrogramCanvas" />
                )}
              </div>

              <div className="upload__audioBar">
                <button type="button" className="upload__playButton" onClick={togglePlay}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="22" height="22">
                      <path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="22" height="22">
                      <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button type="button" className="upload__volumeButton" onClick={toggleMute}>
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M14 3.23v17.54c0 .42-.5.65-.82.38L7.8 16H4c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h3.8l5.38-5.15c.32-.27.82-.04.82.38M19.78 8.81a1 1 0 0 0-1.41 0L17 10.17l-1.37-1.36a1 1 0 1 0-1.41 1.41L15.59 11.6l-1.37 1.37a1 1 0 1 0 1.41 1.41L17 13l1.37 1.38a1 1 0 0 0 1.41-1.41l-1.37-1.37l1.37-1.38a1 1 0 0 0 0-1.41" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M14 3.23v17.54c0 .42-.5.65-.82.38L7.8 16H4c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h3.8l5.38-5.15c.32-.27.82-.04.82.38M16.5 8.5a1 1 0 0 0 0 1.41A3 3 0 0 1 17.38 12a3 3 0 0 1-.88 2.09a1 1 0 1 0 1.41 1.42A5 5 0 0 0 19.38 12a5 5 0 0 0-1.47-3.5a1 1 0 0 0-1.41 0" />
                    </svg>
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="upload__seek"
                  style={{
                    background: `linear-gradient(to right, #0b5ca8 0%, #0b5ca8 ${progressPercent}%, #2f3a45 ${progressPercent}%, #2f3a45 100%)`,
                  }}
                />

                <div className="upload__duration">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <audio
                  ref={audioRef}
                  className="upload__audioElement"
                  src={audioUrl}
                  muted={isMuted}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onVolumeChange={() => setIsMuted(audioRef.current?.muted || false)}
                />
              </div>
            </div>

            {status === "loading" && (
              <div className="upload__loadingArea">
                <div className="upload__spinner"></div>
                <p className="upload__loadingText">Analyzing Audio... Please wait</p>
                <div className="upload__progressTrack">
                  <div className="upload__progressFill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {status === "done" && (
              <div className="upload__analysisPlateau">
                
                {/* === FLOW STEP 1: INITIAL AI ANALYSIS === */}
                {/* === DATA WATERFALL START === */}
                {modelBreakdown && (
                  <div className="upload__modelGridWrap" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    
                    {/* LAYER 1: RAW NEURAL NETWORKS */}
                    <div className="upload__modelGrid" style={{ marginBottom: "0px", marginTop: "0px" }}>
                      <div className="upload__modelCard">
                        <h4>12k Super Model</h4>
                        <div className={`upload__modelVerdict upload__modelVerdict--${modelBreakdown.super.verdict.toLowerCase()}`}>
                          {modelBreakdown.super.verdict} ({modelBreakdown.super.confidence}%)
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', fontWeight: '500' }}>
                          {modelBreakdown.super.verdict === 'REAL' ? 'FAKE' : 'REAL'}: {(100 - modelBreakdown.super.confidence).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="upload__modelCard upload__modelCard--super">
                        <h4>ResNet-18 (Base)</h4>
                        <div className={`upload__modelVerdict upload__modelVerdict--${modelBreakdown.resnet.verdict.toLowerCase()}`}>
                          {modelBreakdown.resnet.verdict} ({modelBreakdown.resnet.confidence}%)
                        </div>
                        {/* Highlight the FAKE probability since it's the mathematical base for our Acoustic Engine */}
                        <div style={{ fontSize: '14px', color: '#ff384c', marginTop: '6px', fontWeight: '600', background: 'rgba(255, 56, 76, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                          FAKE: {modelBreakdown.resnet.verdict === 'FAKE' ? modelBreakdown.resnet.confidence : (100 - modelBreakdown.resnet.confidence).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* LAYER 2: ACOUSTIC PHYSICS REFINEMENT (THE MATH) */}
                    {modelBreakdown.acoustics && modelBreakdown.acoustics.modifier_percent !== 0 && (
                      <div style={{ padding: "16px 20px", background: "#0a1022", border: `1px solid ${modelBreakdown.acoustics.modifier_percent > 0 ? 'rgba(255, 56, 76, 0.35)' : 'rgba(53, 209, 13, 0.35)'}`, borderRadius: "8px", display: "flex", alignItems: "center", justifyItems: "center", gap: "20px", animation: "fadeUp 0.45s ease" }}>
                        
                        {/* Status Icon */}
                        <div style={{ flexShrink: 0, color: modelBreakdown.acoustics.modifier_percent > 0 ? "#ff384c" : "#35d10d" }}>
                          {modelBreakdown.acoustics.modifier_percent > 0 ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                          )}
                        </div>

                        {/* Academically Safe Text */}
                        <div style={{ flexGrow: 1, textAlign: "left" }}>
                          <h4 style={{ margin: "0 0 4px 0", color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Signal Processing Analysis</h4>
                          <div style={{ color: modelBreakdown.acoustics.modifier_percent > 0 ? "#ff384c" : "#35d10d", fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                            {modelBreakdown.acoustics.modifier_percent > 0 ? "Synthetic Traits Detected" : "Biological Traits Verified"}
                          </div>
                          <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", lineHeight: "1.4" }}>
                            {modelBreakdown.acoustics.modifier_percent > 0 
                              ? "Acoustic metrics indicate abnormally rigid pitch patterns and artificial signal cleanliness." 
                              : "Acoustic metrics confirm natural pitch fluctuations and normal ambient signal variance."}
                          </div>
                        </div>

                        {/* The Traceable Math Receipt */}
                        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "13px", color: "#cbd5e1", textAlign: "right", minWidth: "160px" }}>
                          <div style={{ marginBottom: "4px" }}>[AI Base : {modelBreakdown.resnet.verdict === 'FAKE' ? modelBreakdown.resnet.confidence : (100 - modelBreakdown.resnet.confidence).toFixed(1)}%]</div>
                          <div style={{ marginBottom: "6px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>[DSP Adj : {modelBreakdown.acoustics.modifier_percent > 0 ? '+' : ''}{modelBreakdown.acoustics.modifier_percent}%]</div>
                          <div style={{ fontWeight: "700", fontSize: "14px", color: modelBreakdown.acoustics.modifier_percent > 0 ? "#ff384c" : "#35d10d" }}>
                            = Final AI: {aiPercent}%
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
                {/* === DATA WATERFALL END === */}

                {/* === FLOW STEP 3: FINAL VERDICT === */}
                <div className="upload__cards" style={{ marginTop: 0 }}>
                  <div className="upload__card upload__card--human">
                    <div className="upload__cardIcon">
                      <svg width="72" height="72" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M5 7h2v10H5zm-4 3h2v4H1zm8-8h2v18H9zm4 2h2v18h-2zm4 3h2v10h-2zm4 3h2v4h-2z" />
                      </svg>
                    </div>
                    <div className="upload__cardContent">
                      <h3>Real Human Voice</h3>
                      <div className="upload__cardPercent">{humanPercent}%</div>
                      <p>Final System Verdict</p>
                    </div>
                  </div>

                  <div className="upload__card upload__card--ai">
                    <div className="upload__cardIcon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 512 512">
                        <path fill="currentColor" d="M512 310.829v-73.154c-3.616-38.626-31.154-38.29-73.143-36.576v146.306c67.411 7.006 70.837-19.505 73.143-36.576M73.143 347.405V201.1C31.153 199.386 3.616 199.05 0 237.676v73.154c2.306 17.07 5.732 43.582 73.143 36.576m-54.857 91.442h475.428V512H18.286zM328.32 73.08c-11.526-94.655-130.877-100.188-144.64 0zM21.482 32.86c9.852-18.592 36.27-19.676 47.438-1.947c9.628 15.282 1.753 34.795-14.068 40.43l.005 111.467H36.571V71.394C21.558 66.182 13.321 48.26 21.482 32.86m325.947 195.67c0 21.04-22.93 34.26-41.174 23.74c-18.245-10.519-18.245-36.96 0-47.48s41.174 2.7 41.174 23.74m-169.174 23.74c18.244 10.52 41.174-2.7 41.174-23.74s-22.93-34.26-41.174-23.74c-18.245 10.52-18.245 36.96 0 47.48m242.316-87.749V420.56H91.43V164.522c0-40.399 32.75-73.153 73.142-73.153H347.43c40.393 0 73.142 32.754 73.142 73.153M169.091 268.1c30.408 17.532 68.623-4.502 68.623-39.568s-38.215-57.1-68.623-39.567s-30.407 61.602 0 79.135m178.338 61.018H164.57v36.577h182.86zm18.285-100.586c0-35.065-38.215-57.1-68.623-39.567s-30.407 61.602 0 79.135c30.408 17.532 68.623-4.502 68.623-39.568" />
                      </svg>
                    </div>
                    <div className="upload__cardContent">
                      <h3>AI-Generated</h3>
                      <div className="upload__cardPercent">{aiPercent}%</div>
                      <p>Final System Verdict</p>
                    </div>
                  </div>
                </div>

                <div className="upload__finalBar">
                  <div className="upload__finalBarHuman" style={{ width: `${humanPercent}%` }}>
                    {humanPercent}% Human
                  </div>
                  <div className="upload__finalBarAi" style={{ width: `${aiPercent}%` }}>
                    {aiPercent}% AI
                  </div>
                </div>

                {showAnalysis && (
                  <>
                    <div className="upload__divider">
                      <span>Dynamic Analysis</span>
                    </div>

                    <div className="upload__tableWrap">
                      <table className="upload__table">
                        <thead>
                          <tr>
                            <th>Feature Analyzed</th>
                            <th>Description</th>
                            <th>Result</th>
                            <th>Interpretation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicRows.map((row) => (
                            <tr key={row.feature}>
                              <td>{row.feature}</td>
                              <td>{row.description}</td>
                              <td>{row.result}</td>
                              <td className={`upload__tableInterpretation upload__tableInterpretation--${row.interpretationClass}`}>
                                {row.interpretation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="upload__dropdown">
                      <button
                        type="button"
                        className={`upload__dropdownHeader ${showDropdown ? "upload__dropdownHeader--open" : ""}`}
                        onClick={() => setShowDropdown((prev) => !prev)}
                      >
                        <div className="upload__dropdownLeft">
                          <span className="upload__dropdownMenuIcon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M4 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m0 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m1 5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2z" />
                            </svg>
                          </span>
                          <span>Human VS AI Generated</span>
                        </div>

                        <span className={`upload__dropdownArrow ${showDropdown ? "upload__dropdownArrow--open" : ""}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="none" stroke="currentColor" strokeWidth="2" d="m2 8.35l10.173 9.823L21.997 8" />
                          </svg>
                        </span>
                      </button>

                      {showDropdown && (
                        <div className="upload__dropdownBody">
                          <div className="upload__compareImages">
                            <div className="upload__compareBox">
                              <img src={humanSpectro} alt="Human spectrogram" className="upload__miniWaveform" />
                            </div>
                            <div className="upload__vsCircle">VS</div>
                            <div className="upload__compareBox">
                              <img src={aiSpectro} alt="AI spectrogram" className="upload__miniWaveform" />
                            </div>
                          </div>

                          <div className="upload__compareGrid">
                            <div className="upload__compareColumn">
                              <div className="upload__compareItem upload__compareItem--human">
                                <span className="upload__compareIcon">✓</span>
                                <span className="upload__compareTitle">Tone Irregularity</span>
                                <span className="upload__compareDesc">Natural shifts in tone and emphasis</span>
                              </div>
                              <div className="upload__compareItem upload__compareItem--human">
                                <span className="upload__compareIcon">✓</span>
                                <span className="upload__compareTitle">Breathing Patterns</span>
                                <span className="upload__compareDesc">Subtle breaths and pauses are present</span>
                              </div>
                              <div className="upload__compareItem upload__compareItem--human">
                                <span className="upload__compareIcon">✓</span>
                                <span className="upload__compareTitle">Ambient Interference</span>
                                <span className="upload__compareDesc">Small environmental sounds may appear</span>
                              </div>
                            </div>

                            <div className="upload__compareColumn">
                              <div className="upload__compareItem upload__compareItem--ai">
                                <span className="upload__compareIcon">✕</span>
                                <span className="upload__compareTitle">Pitch Consistency</span>
                                <span className="upload__compareDesc">Often stiff or overly consistent pitch</span>
                              </div>
                              <div className="upload__compareItem upload__compareItem--ai">
                                <span className="upload__compareIcon">✕</span>
                                <span className="upload__compareTitle">Speech Timing</span>
                                <span className="upload__compareDesc">Robotic timing with fewer natural pauses</span>
                              </div>
                              <div className="upload__compareItem upload__compareItem--ai">
                                <span className="upload__compareIcon">✕</span>
                                <span className="upload__compareTitle">Audio Cleanliness</span>
                                <span className="upload__compareDesc">Usually very clean and lacks natural noise</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="upload__actions">
                  <button className="upload__button upload__button--primary" onClick={handleBrowse} type="button">
                    Upload Another
                  </button>
                  <button className="upload__button upload__button--ghost" onClick={() => setShowAnalysis((prev) => !prev)} type="button">
                    {showAnalysis ? "Hide Analysis" : "View Analysis"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Upload;