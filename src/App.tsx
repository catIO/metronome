import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Plus, Minus, Settings2, ChevronDown, ChevronUp, X, PlusCircle, Volume2, AudioWaveform as Waveform } from 'lucide-react';

type Subdivision = number;

type BeatPattern = {
  [key in Subdivision]?: boolean[];
};

type SoundSettings = {
  frequency: number;
  gain: number;
};

type SubdivisionSounds = {
  [key in Subdivision]?: SoundSettings;
};

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [customSubdivisions, setCustomSubdivisions] = useState<Subdivision[]>([1]);
  const [advancedPattern, setAdvancedPattern] = useState<BeatPattern>({
    1: Array(beatsPerMeasure * subdivision).fill(true),  // Initialize with all squares selected
  });
  const [subdivisionSounds, setSubdivisionSounds] = useState<SubdivisionSounds>({
    1: { frequency: 1000, gain: 0.5 }, // Higher pitch for main beats
    2: { frequency: 500, gain: 0.3 },  // Lower pitch for subdivisions
  });
  const audioContext = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    audioContext.current = new AudioContext();
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  const playClick = (subdivisionValue: Subdivision) => {
    if (!audioContext.current) return;

    const soundSettings = subdivisionSounds[subdivisionValue] || { frequency: 440, gain: 0.3 };
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);

    oscillator.frequency.value = soundSettings.frequency;
    gainNode.gain.value = soundSettings.gain;

    oscillator.start();
    oscillator.stop(audioContext.current.currentTime + 0.1);
  };

  useEffect(() => {
    if (isPlaying) {
      const intervalTime = (60 / bpm / subdivision) * 1000;
      let currentIndex = 0;
      
      const tick = () => {
        // Get the pattern array
        const pattern = advancedPattern[1] || [];
        
        // Check if the current square is selected
        const isSelected = pattern[currentIndex];
        const isMainBeat = currentIndex % subdivision === 0;
        console.log(`Current square: ${currentIndex + 1}, Selected: ${isSelected}, Main beat: ${isMainBeat}`);
        
        if (isSelected) {
          // Play main beat sound or subdivision sound
          const soundType = isMainBeat ? 1 : 2;
          console.log(`Playing ${isMainBeat ? 'main' : 'subdivision'} sound at square ${currentIndex + 1}`);
          playClick(soundType);
        }

        // Move to next square
        currentIndex = (currentIndex + 1) % (beatsPerMeasure * subdivision);
        setCurrentBeat(Math.floor(currentIndex / subdivision));
        setCurrentSubdivision(currentIndex % subdivision);
        console.log(`Moving to square ${currentIndex + 1}`);
      };

      // Start immediately
      tick();
      
      // Set up the interval for subsequent ticks
      timerRef.current = window.setInterval(tick, intervalTime);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setCurrentBeat(0);
      setCurrentSubdivision(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, bpm, beatsPerMeasure, subdivision, advancedPattern, subdivisionSounds]);

  const adjustTempo = (amount: number) => {
    setBpm((prev) => Math.min(Math.max(prev + amount, 40), 220));
  };

  const adjustSubdivision = (increase: boolean) => {
    setSubdivision((prev) => {
      const newValue = increase ? Math.min(prev + 1, 4) : Math.max(prev - 1, 1);
      return newValue;
    });
  };

  const toggleBeat = (subdivisionValue: Subdivision, index: number) => {
    setAdvancedPattern((prev) => {
      const newPattern = {
        ...prev,
        [subdivisionValue]: prev[subdivisionValue]?.map((enabled, i) =>
          i === index ? !enabled : enabled
        ),
      };
      // Log the state of all squares in the row with sound information
      console.log(`Row ${subdivisionValue} state:`, newPattern[subdivisionValue]?.map(enabled => 
        enabled ? `on:sound ${subdivisionValue}` : 'off:no sound'
      ));
      return newPattern;
    });
  };

  const addNewSubdivision = () => {
    const newSubdivision = Math.max(...customSubdivisions) + 1;
    setCustomSubdivisions([...customSubdivisions, newSubdivision]);
    setAdvancedPattern((prev) => ({
      ...prev,
      [newSubdivision]: Array(subdivision * beatsPerMeasure).fill(false),
    }));
    setSubdivisionSounds((prev) => ({
      ...prev,
      [newSubdivision]: { frequency: 440 - (newSubdivision * 50), gain: 0.3 } as SoundSettings,
    }));
  };

  const updateSoundSettings = (subdivisionValue: Subdivision, type: keyof SoundSettings, value: number) => {
    setSubdivisionSounds((prev) => ({
      ...prev,
      [subdivisionValue]: {
        ...prev[subdivisionValue],
        [type]: value,
      } as SoundSettings,
    }));
  };

  useEffect(() => {
    // Update pattern when beatsPerMeasure or subdivision changes
    setAdvancedPattern((prev) => {
      const newPattern: BeatPattern = {};
      customSubdivisions.forEach((sub) => {
        // Each row should have the same number of columns as beatsPerMeasure * subdivision
        newPattern[sub] = Array(beatsPerMeasure * subdivision).fill(true);  // Initialize all squares as selected
        // Copy existing values if they exist
        if (prev[sub]) {
          prev[sub]?.forEach((value, index) => {
            if (index < newPattern[sub]!.length) {
              newPattern[sub]![index] = value;
            }
          });
        }
      });
      return newPattern;
    });
  }, [beatsPerMeasure, subdivision, customSubdivisions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Metronome</h1>
          <p className="text-indigo-200">Keep your rhythm perfect</p>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => {
              setShowSoundSettings(false);
              setShowAdvanced(!showAdvanced);
            }}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            {showAdvanced ? <X size={20} /> : <Settings2 size={20} />}
          </button>
          {showAdvanced && (
            <button
              onClick={() => setShowSoundSettings(!showSoundSettings)}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {showSoundSettings ? <X size={20} /> : <Volume2 size={20} />}
            </button>
          )}
        </div>

        {!showAdvanced ? (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => adjustTempo(-1)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <Minus size={24} />
                </button>
                <div className="text-6xl font-bold text-white tabular-nums w-32 text-center">
                  {bpm}
                </div>
                <button
                  onClick={() => adjustTempo(1)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="text-indigo-200">BPM</div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="flex gap-2">
                {Array.from({ length: beatsPerMeasure }).map((_, beatIndex) => (
                  <div key={`beat-${beatIndex}`} className="flex flex-col gap-1">
                    <div
                      className={`w-4 h-4 rounded-full transition-colors ${
                        beatIndex === currentBeat
                          ? 'bg-indigo-400'
                          : 'bg-white/20'
                      }`}
                    />
                    {subdivision > 1 && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: subdivision - 1 }).map((_, subIndex) => (
                          <div
                            key={`sub-${beatIndex}-${subIndex}`}
                            className={`w-1 h-1 rounded-full transition-colors ${
                              beatIndex === currentBeat &&
                              subIndex + 1 === currentSubdivision
                                ? 'bg-indigo-400/70'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                <button
                  onClick={() => setBeatsPerMeasure((prev) => Math.max(prev - 1, 2))}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <Minus size={20} />
                </button>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{beatsPerMeasure}</div>
                  <div className="text-indigo-200 text-sm">Beats</div>
                </div>
                <button
                  onClick={() => setBeatsPerMeasure((prev) => Math.min(prev + 1, 12))}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                <button
                  onClick={() => adjustSubdivision(false)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <ChevronDown size={20} />
                </button>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{subdivision}</div>
                  <div className="text-indigo-200 text-sm">Division</div>
                </div>
                <button
                  onClick={() => adjustSubdivision(true)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <ChevronUp size={20} />
                </button>
              </div>
            </div>
          </>
        ) : showSoundSettings ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Sound Settings</h2>
            <div className="space-y-4">
              {customSubdivisions.map((sub) => {
                const sound = subdivisionSounds[sub] || { frequency: 440, gain: 0.3 };
                return (
                  <div key={sub} className="p-4 rounded-xl bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Division {sub}</span>
                      <button
                        onClick={() => playClick(sub)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                      >
                        <Waveform size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-indigo-200 text-sm mb-1 block">
                          Frequency: {sound.frequency}Hz
                        </label>
                        <input
                          type="range"
                          min="220"
                          max="1760"
                          value={sound.frequency}
                          onChange={(e) => updateSoundSettings(sub, 'frequency', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-indigo-200 text-sm mb-1 block">
                          Volume: {Math.round(sound.gain * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sound.gain * 100}
                          onChange={(e) => updateSoundSettings(sub, 'gain', Number(e.target.value) / 100)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Sound Pattern</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8" />
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${beatsPerMeasure * subdivision}, 1fr)` }}>
                  {Array.from({ length: beatsPerMeasure * subdivision }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 ${i % subdivision === 0 ? 'bg-indigo-400' : 'bg-white/20'}`}
                    />
                  ))}
                </div>
              </div>
              {customSubdivisions.map((sub) => {
                const sound = subdivisionSounds[sub] || { frequency: 440, gain: 0.3 };
                return (
                  <div key={sub} className="flex items-center gap-2">
                    <div className="w-8" />
                    <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${beatsPerMeasure * subdivision}, 1fr)` }}>
                      {Array.from({ length: beatsPerMeasure * subdivision }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => toggleBeat(sub, i)}
                          className={`h-6 rounded transition-colors ${
                            advancedPattern[sub]?.[i]
                              ? 'bg-indigo-400 hover:bg-indigo-500'
                              : 'bg-white/20 hover:bg-white/30'
                          } ${i % subdivision === 0 ? 'border-l-2 border-indigo-400' : ''}`}
                          title={`${advancedPattern[sub]?.[i] ? `Sound ${sub} on` : 'No sound'} at square ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause size={24} /> Stop
            </>
          ) : (
            <>
              <Play size={24} /> Start
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;