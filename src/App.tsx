import React, { useState, useRef, useEffect, useCallback } from 'react';

// TypeScript declaration for Wake Lock API
interface WakeLockSentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import TuneIcon from '@mui/icons-material/Tune';
import TimerIcon from '@mui/icons-material/Timer';
import UpdateIcon from '@mui/icons-material/Update';

type Subdivision = number;

type BeatPattern = {
  [key in Subdivision]?: boolean[];
};

type SoundSettings = {
  frequency: number;
  gain: number;
  filterType?: string;
  filterFrequency?: number;
  filterQ?: number;
  attack?: number;
  decay?: number;
  waveform?: OscillatorType;
  soundType?: string;
};

type SavedSettings = {
  id: string;
  name: string;
  bpm: number;
  beatsPerMeasure: number;
  subdivision: number;
  advancedPattern: BeatPattern;
  subdivisionSounds: SubdivisionSounds;
  customSubdivisions: Subdivision[];
  speedPercentage?: number;
};

const SOUND_PRESETS = {
  'Piano': { 
    frequency: 440, 
    gain: 1.5, 
    filterType: 'lowpass', 
    filterFrequency: 1500, 
    filterQ: 0.5,
    attack: 0.002,
    decay: 0.1,
    waveform: 'sine',
    soundType: 'Piano'
  },
  'Wood Block': { 
    frequency: 180, 
    gain: 1.5, 
    filterType: 'bandpass', 
    filterFrequency: 600, 
    filterQ: 2.5,
    attack: 0.005,
    decay: 0.15,
    waveform: 'triangle',
    soundType: 'Wood Block'
  },
  'Click': { 
    frequency: 800, 
    gain: 1.5, 
    filterType: 'lowpass', 
    filterFrequency: 1200, 
    filterQ: 2,
    attack: 0.001,
    decay: 0.05,
    waveform: 'square',
    soundType: 'Click'
  },
  'Woodpecker': {
    frequency: 300,
    gain: 1.5,
    filterType: 'bandpass',
    filterFrequency: 800,
    filterQ: 3,
    attack: 0.001,
    decay: 0.05,
    waveform: 'triangle',
    soundType: 'Woodpecker'
  },
  'Bird': {
    frequency: 2000,
    gain: 1.5,
    filterType: 'bandpass',
    filterFrequency: 3000,
    filterQ: 6,
    attack: 0.0005,
    decay: 0.02,
    waveform: 'sine',
    soundType: 'Bird'
  },
  'Custom': { 
    frequency: 440, 
    gain: 0.5, 
    filterType: 'none', 
    filterFrequency: 1000, 
    filterQ: 1,
    attack: 0.002,
    decay: 0.1,
    waveform: 'sine',
    soundType: 'Custom'
  }
};

const TAGLINES = [
  "Keep your rhythm perfect",
  "Stay in sync",
  "Rhythm is life",
  "Don't skip a beat",
  "Beat it like a pro",
  "Keep the beat alive"
];

type SubdivisionSounds = {
  [key in Subdivision]?: SoundSettings;
};

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(() => {
    const savedBpm = localStorage.getItem('bpm');
    return savedBpm ? parseInt(savedBpm) : 120;
  });
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [tempBpm, setTempBpm] = useState('120');
  const bpmInputRef = useRef<HTMLInputElement>(null);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(() => {
    const savedBeats = localStorage.getItem('beatsPerMeasure');
    return savedBeats ? parseInt(savedBeats) : 4;
  });
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [subdivision, setSubdivision] = useState<Subdivision>(() => {
    const savedSubdivision = localStorage.getItem('subdivision');
    return savedSubdivision ? parseInt(savedSubdivision) : 1;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [customSubdivisions, setCustomSubdivisions] = useState<Subdivision[]>(() => {
    // Try to load custom subdivisions from localStorage
    const savedSubdivisions = localStorage.getItem('customSubdivisions');
    if (savedSubdivisions) {
      try {
        return JSON.parse(savedSubdivisions);
      } catch (e) {
        console.error('Failed to parse saved subdivisions:', e);
      }
    }
    // Default subdivisions if nothing is saved
    return [1, 2];
  });
  const [advancedPattern, setAdvancedPattern] = useState<BeatPattern>(() => {
    // Try to load the pattern from localStorage
    const savedPattern = localStorage.getItem('soundPattern');
    if (savedPattern) {
      try {
        return JSON.parse(savedPattern);
      } catch (e) {
        console.error('Failed to parse saved pattern:', e);
      }
    }
    // Default pattern if nothing is saved
    return {
      0: Array(beatsPerMeasure * subdivision).fill(true),  // Main beat row
      1: Array(beatsPerMeasure * subdivision).fill(true),  // First division row
      2: Array(beatsPerMeasure * subdivision).fill(false), // Second division row
    };
  });
  const [globalVolume, setGlobalVolume] = useState(() => {
    const saved = localStorage.getItem('globalVolume');
    return saved ? parseFloat(saved) : 2.0; // Default to 50% volume (2.0 gain = 50% on slider)
  });
  const [speedPercentage, setSpeedPercentage] = useState(() => {
    const saved = localStorage.getItem('speedPercentage');
    return saved ? parseInt(saved) : 100; // Default to 100% (normal speed)
  });
  
  const [subdivisionSounds, setSubdivisionSounds] = useState<SubdivisionSounds>(() => {
    // Try to load sound settings from localStorage first
    const savedSettings = localStorage.getItem('soundSettings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
        console.error('Failed to parse saved sound settings:', e);
      }
    }
    
    // Default sound settings if nothing is saved
    return {
      0: { frequency: 1000, gain: 1.0, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' }, // Main beat sound
      1: { frequency: 800, gain: 1.0, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' },  // First division row sound
      2: { frequency: 600, gain: 1.0, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' },  // Second division row sound
    };
  });
  const audioContext = useRef<AudioContext | null>(null);
  const masterGainNode = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tagline, setTagline] = useState(() => {
    const randomIndex = Math.floor(Math.random() * TAGLINES.length);
    return TAGLINES[randomIndex];
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [editingSettingsId, setEditingSettingsId] = useState<string | null>(null);
  const [savedSettings, setSavedSettings] = useState<SavedSettings[]>(() => {
    const saved = localStorage.getItem('savedSettings');
    return saved ? JSON.parse(saved) : [];
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    audioContext.current = new AudioContext();
    masterGainNode.current = audioContext.current.createGain();
    masterGainNode.current.connect(audioContext.current.destination);
    masterGainNode.current.gain.value = globalVolume;
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('bpm', bpm.toString());
  }, [bpm]);

  const playClick = useCallback((subdivisionValue: Subdivision) => {
    const currentSettings = subdivisionSounds[subdivisionValue];
    
    if (!audioContext.current) {
      return;
    }

    const soundSettings = currentSettings || { 
      frequency: 440, 
      gain: 0.3,
      filterType: 'none',
      filterFrequency: 1000,
      filterQ: 1,
      attack: 0.01,
      decay: 0.2,
      waveform: 'sine'
    };
    
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    const filter = audioContext.current.createBiquadFilter();

    // Set oscillator type
    oscillator.type = soundSettings.waveform || 'sine';
    oscillator.frequency.value = soundSettings.frequency;

    // Set up gain envelope
    gainNode.gain.setValueAtTime(0, audioContext.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      soundSettings.gain,
      audioContext.current.currentTime + (soundSettings.attack || 0.01)
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      audioContext.current.currentTime + (soundSettings.attack || 0.01) + (soundSettings.decay || 0.2)
    );

    // Apply filter settings
    if (soundSettings.filterType && soundSettings.filterType !== 'none') {
      filter.type = soundSettings.filterType as BiquadFilterType;
      filter.frequency.value = soundSettings.filterFrequency || 1000;
      filter.Q.value = soundSettings.filterQ || 1;
    }

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGainNode.current!);

    oscillator.start();
    oscillator.stop(audioContext.current.currentTime + (soundSettings.attack || 0.01) + (soundSettings.decay || 0.2));
  }, [subdivisionSounds]);

  useEffect(() => {
    if (isPlaying) {
      // Reset beat and subdivision counters when starting
      setCurrentBeat(0);
      setCurrentSubdivision(0);
      
      const intervalTime = (60 / bpm / subdivision) * 1000 / (speedPercentage / 100);
      let currentIndex = 0;
      
      const tick = () => {
        // Get the pattern array
        const pattern = advancedPattern[1] || [];
        const pattern2 = advancedPattern[2] || [];
        const mainBeatPattern = advancedPattern[0] || [];
        
        // Check if the current square is selected
        const isSelected = pattern[currentIndex];
        const isSelected2 = pattern2[currentIndex];
        const isMainBeatSelected = mainBeatPattern[currentIndex];
        const isMainBeat = currentIndex % subdivision === 0;
        
        // Update visual indicators first
        setCurrentBeat(Math.floor(currentIndex / subdivision));
        setCurrentSubdivision(currentIndex % subdivision);
        
        // Then play sounds if selected - only the lowest selected row should play
        if (isSelected2) {
          // Play the second pattern sound (lowest row)
          playClick(2);
        } else if (isSelected) {
          // Play first division sound (middle row)
          playClick(1);
        } else if (isMainBeatSelected) {
          // Play main beat sound (top row)
          playClick(0);
        }

        // Move to next square for the next tick
        currentIndex = (currentIndex + 1) % (beatsPerMeasure * subdivision);
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
  }, [isPlaying, bpm, beatsPerMeasure, subdivision, advancedPattern, subdivisionSounds, speedPercentage]);

  const adjustTempo = (amount: number) => {
    setBpm((prev) => Math.min(Math.max(prev + amount, 40), 220));
  };

  const adjustSubdivision = (increase: boolean) => {
    setSubdivision((prev) => {
      const newValue = increase ? Math.min(prev + 1, 8) : Math.max(prev - 1, 1);
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
      // Play sound if the beat is being turned on
      if (newPattern[subdivisionValue]?.[index]) {
        playClick(subdivisionValue);
      }
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
      [newSubdivision]: Array(subdivision * beatsPerMeasure).fill(false), // Keep new subdivision row off
    }));
    setSubdivisionSounds((prev) => ({
      ...prev,
      [newSubdivision]: { 
        frequency: 440 - (newSubdivision * 50), 
        gain: 0.3,
        filterType: 'none',
        filterFrequency: 1000,
        filterQ: 1
      } as SoundSettings,
    }));
  };

  const updateSoundSettings = useCallback((subdivisionValue: Subdivision, type: keyof SoundSettings, value: any) => {
    setSubdivisionSounds((prev) => {
      const newSettings = {
        ...prev,
        [subdivisionValue]: {
          ...prev[subdivisionValue],
          [type]: value,
        } as SoundSettings,
      };
      
      // Play the sound with the updated settings
      if (audioContext.current) {
        const sound = newSettings[subdivisionValue];
        if (sound) {
          const oscillator = audioContext.current.createOscillator();
          const gainNode = audioContext.current.createGain();
          const filter = audioContext.current.createBiquadFilter();

          oscillator.type = (sound.waveform || 'sine') as OscillatorType;
          oscillator.frequency.value = sound.frequency;

          gainNode.gain.setValueAtTime(0, audioContext.current.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            sound.gain, // Use the actual gain value
            audioContext.current.currentTime + (sound.attack || 0.01)
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            audioContext.current.currentTime + (sound.attack || 0.01) + (sound.decay || 0.2)
          );

          if (sound.filterType && sound.filterType !== 'none') {
            filter.type = sound.filterType as BiquadFilterType;
            filter.frequency.value = sound.filterFrequency || 1000;
            filter.Q.value = sound.filterQ || 1;
          }

          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(masterGainNode.current!);

          oscillator.start();
          oscillator.stop(audioContext.current.currentTime + (sound.attack || 0.01) + (sound.decay || 0.2));
        }
      }
      
      return newSettings;
    });
  }, [subdivisionSounds]);

  const handleSoundTypeChange = useCallback((subdivisionValue: Subdivision, soundType: string) => {
    const preset = SOUND_PRESETS[soundType as keyof typeof SOUND_PRESETS];
    if (preset) {
      // Get the current sound settings to preserve the volume
      const currentSound = subdivisionSounds[subdivisionValue];
      const currentGain = currentSound?.gain || 0.3;
      
      const newSettings = {
        ...preset,
        gain: currentGain, // Keep the current volume setting
        soundType
      } as SoundSettings;
      
      setSubdivisionSounds((prev) => ({
        ...prev,
        [subdivisionValue]: newSettings
      }));
      
      // Play the sound using the preset settings but with the preserved volume
      if (audioContext.current) {
        const oscillator = audioContext.current.createOscillator();
        const gainNode = audioContext.current.createGain();
        const filter = audioContext.current.createBiquadFilter();

        oscillator.type = (preset.waveform || 'sine') as OscillatorType;
        oscillator.frequency.value = preset.frequency;

        gainNode.gain.setValueAtTime(0, audioContext.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          currentGain, // Use the preserved volume
          audioContext.current.currentTime + (preset.attack || 0.01)
        );
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.current.currentTime + (preset.attack || 0.01) + (preset.decay || 0.2)
        );

        if (preset.filterType && preset.filterType !== 'none') {
          filter.type = preset.filterType as BiquadFilterType;
          filter.frequency.value = preset.filterFrequency || 1000;
          filter.Q.value = preset.filterQ || 1;
        }

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGainNode.current!);

        oscillator.start();
        oscillator.stop(audioContext.current.currentTime + (preset.attack || 0.01) + (preset.decay || 0.2));
      }
      
      // Save to localStorage
      const updatedSounds = {
        ...subdivisionSounds,
        [subdivisionValue]: newSettings
      };
      localStorage.setItem('soundSettings', JSON.stringify(updatedSounds));
    }
  }, [subdivisionSounds]);

  useEffect(() => {
    // Update pattern when beatsPerMeasure or subdivision changes
    setAdvancedPattern((prev) => {
      const newPattern: BeatPattern = {};
      [0, ...customSubdivisions].forEach((sub) => {
        // Each row should have the same number of columns as beatsPerMeasure * subdivision
        newPattern[sub] = Array(beatsPerMeasure * subdivision).fill(sub === 0);  // Only initialize main beat row as selected
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

  const handleBpmClick = () => {
    console.log('Starting BPM edit, current BPM:', bpm);
    setIsEditingBpm(true);
    setTempBpm(bpm.toString());
    setTimeout(() => {
      bpmInputRef.current?.focus();
      bpmInputRef.current?.select();
    }, 0);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('BPM input changed:', value);
    // Allow any number input
    if (value === '' || !isNaN(parseInt(value))) {
      setTempBpm(value);
    }
  };

  const handleBpmBlur = () => {
    const newBpm = parseInt(tempBpm);
    console.log('BPM blur event:', { newBpm, tempBpm, currentBpm: bpm });
    if (!isNaN(newBpm)) {
      console.log('Setting new BPM:', newBpm);
      setBpm(newBpm);
      setTempBpm(newBpm.toString());
    } else {
      console.log('Invalid BPM, reverting to:', bpm);
      setTempBpm(bpm.toString());
    }
    setIsEditingBpm(false);
  };

  const handleBpmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newBpm = parseInt(tempBpm);
      console.log('BPM Enter key:', { newBpm, tempBpm, currentBpm: bpm });
      if (!isNaN(newBpm)) {
        console.log('Setting new BPM:', newBpm);
        setBpm(newBpm);
        setTempBpm(newBpm.toString());
      } else {
        console.log('Invalid BPM, reverting to:', bpm);
        setTempBpm(bpm.toString());
      }
      setIsEditingBpm(false);
    } else if (e.key === 'Escape') {
      console.log('BPM Escape key, reverting to:', bpm);
      setTempBpm(bpm.toString());
      setIsEditingBpm(false);
    }
  };

  // Add keyboard event listener for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only toggle play/stop if not editing BPM and not in sound settings and not in save settings dialog
      if (e.code === 'Space' && !isEditingBpm && !showSoundSettings && !showSaveDialog) {
        e.preventDefault(); // Prevent page scrolling
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingBpm, showSoundSettings, showSaveDialog]);

  // Save pattern to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('soundPattern', JSON.stringify(advancedPattern));
  }, [advancedPattern]);

  // Save sound settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('soundSettings', JSON.stringify(subdivisionSounds));
  }, [subdivisionSounds]);

  // Save custom subdivisions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customSubdivisions', JSON.stringify(customSubdivisions));
  }, [customSubdivisions]);

  // Save subdivision to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('subdivision', subdivision.toString());
  }, [subdivision]);

  // Save beatsPerMeasure to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('beatsPerMeasure', beatsPerMeasure.toString());
  }, [beatsPerMeasure]);

  // Save globalVolume to localStorage whenever it changes and update master gain
  useEffect(() => {
    localStorage.setItem('globalVolume', globalVolume.toString());
    
    // Update master gain node if it exists
    if (masterGainNode.current) {
      masterGainNode.current.gain.setValueAtTime(
        masterGainNode.current.gain.value,
        audioContext.current?.currentTime || 0
      );
      masterGainNode.current.gain.linearRampToValueAtTime(
        globalVolume,
        (audioContext.current?.currentTime || 0) + 0.01
      );
    }
  }, [globalVolume]);

  // Save speedPercentage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('speedPercentage', speedPercentage.toString());
  }, [speedPercentage]);


  // Add a function to clear corrupted localStorage data
  const clearCorruptedLocalStorage = useCallback(() => {
    console.log('Clearing corrupted localStorage data');
    localStorage.removeItem('soundPattern');
    localStorage.removeItem('soundSettings');
    localStorage.removeItem('bpm');
    localStorage.removeItem('customSubdivisions');
    localStorage.removeItem('subdivision');
    
    // Reset state to defaults
    setAdvancedPattern({
      0: Array(beatsPerMeasure * subdivision).fill(true),  // Main beat row
      1: Array(beatsPerMeasure * subdivision).fill(true),  // First division row
      2: Array(beatsPerMeasure * subdivision).fill(false), // Second division row
    });
    
    setSubdivisionSounds({
      0: { frequency: 1000, gain: 0.5, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' }, // Main beat sound
      1: { frequency: 800, gain: 0.4, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' },  // First division row sound
      2: { frequency: 600, gain: 0.3, filterType: 'none', filterFrequency: 1000, filterQ: 1, soundType: 'Click' },  // Second division row sound
    });
    
    setCustomSubdivisions([1, 2]);
    setBpm(120);
    setSubdivision(1);
  }, [beatsPerMeasure, subdivision]);

  // Add a useEffect to check if localStorage data is corrupted
  useEffect(() => {
    // Check if soundSettings is corrupted
    const checkSoundSettings = () => {
      try {
        const savedSettings = localStorage.getItem('soundSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          // Check if the parsed settings have the required properties
          for (const key in parsedSettings) {
            if (!parsedSettings[key].frequency || !parsedSettings[key].gain) {
              console.error('Sound settings are corrupted');
              return true;
            }
            // Check if filter properties exist, if not add them
            if (!parsedSettings[key].filterType) {
              parsedSettings[key].filterType = 'none';
              parsedSettings[key].filterFrequency = 1000;
              parsedSettings[key].filterQ = 1;
              console.log('Added missing filter properties to sound settings');
            }
          }
          // Save the updated settings
          localStorage.setItem('soundSettings', JSON.stringify(parsedSettings));
        }
        return false;
      } catch (e) {
        console.error('Failed to parse sound settings:', e);
        return true;
      }
    };

    // Check if soundPattern is corrupted
    const checkSoundPattern = () => {
      try {
        const savedPattern = localStorage.getItem('soundPattern');
        if (savedPattern) {
          const parsedPattern = JSON.parse(savedPattern);
          // Check if the parsed pattern has the required properties
          for (const key in parsedPattern) {
            if (!Array.isArray(parsedPattern[key])) {
              console.error('Sound pattern is corrupted');
              return true;
            }
          }
        }
        return false;
      } catch (e) {
        console.error('Failed to parse sound pattern:', e);
        return true;
      }
    };

    // If either is corrupted, clear the localStorage data
    if (checkSoundSettings() || checkSoundPattern()) {
      clearCorruptedLocalStorage();
    }
  }, [clearCorruptedLocalStorage]);

  // Function to convert frequency to note name
  const getNoteName = (frequency: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440; // A4 is 440Hz
    const c0 = a4 * Math.pow(2, -4.75); // C0 is the lowest C
    const halfStepsBelowMiddleC = Math.round(12 * Math.log2(frequency/c0));
    const octave = Math.floor(halfStepsBelowMiddleC / 12);
    const noteIndex = halfStepsBelowMiddleC % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  // Function to get frequency label with note name
  const getFrequencyLabel = (value: number): string => {
    return `${value}Hz (${getNoteName(value)})`;
  };


  // Add useEffect to handle the timer
  useEffect(() => {
    if (isPlaying) {
      if (timeoutMinutes) {
        // Countdown timer
        setCountdownTime(timeoutMinutes * 60 * 1000);
        timerIntervalRef.current = setInterval(() => {
          setCountdownTime(prev => {
            if (prev && prev > 1000) {
              return prev - 1000;
            } else {
              // Timer reached zero, stop the metronome
              setIsPlaying(false);
              setCountdownTime(null);
              setTimeoutMinutes(null);
              return null;
            }
          });
        }, 1000);
      } else {
        // Elapsed timer (fallback)
        startTimeRef.current = Date.now() - elapsedTime;
        timerIntervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setElapsedTime(Date.now() - startTimeRef.current);
          }
        }, 1000);
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setCountdownTime(null);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPlaying, elapsedTime, timeoutMinutes]);

  // Manage wake lock based on playing state
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Wake Lock functions to prevent screen timeout
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const nav = navigator as any;
        wakeLockRef.current = await nav.wakeLock.request('screen');
        setWakeLockActive(true);
        console.log('Screen wake lock activated');
        
        wakeLockRef.current?.addEventListener('release', () => {
          setWakeLockActive(false);
          console.log('Screen wake lock released');
        });
      }
    } catch (err) {
      console.log('Wake lock request failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        console.log('Screen wake lock manually released');
      } catch (err) {
        console.log('Wake lock release failed:', err);
      }
    }
  };

  const resetUIState = () => {
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentSubdivision(0);
    setShowSoundSettings(false);
    setShowAdvanced(false);
    setShowSaveDialog(false);
    setSettingsName('');
    setEditingSettingsId(null);
    setElapsedTime(0);
  };

  const saveCurrentSettings = () => {
    // Create a deep copy of the advancedPattern to ensure it's properly saved
    const patternCopy: BeatPattern = {};
    Object.keys(advancedPattern).forEach(key => {
      const subdivision = parseInt(key);
      patternCopy[subdivision] = [...(advancedPattern[subdivision] || [])];
    });

    const newSettings: SavedSettings = {
      id: editingSettingsId || crypto.randomUUID(),
      name: settingsName,
      bpm,
      beatsPerMeasure,
      subdivision,
      advancedPattern: patternCopy,
      subdivisionSounds: { ...subdivisionSounds },
      customSubdivisions: [...customSubdivisions],
      speedPercentage
    };

    setSavedSettings(prev => {
      const newSettingsList = editingSettingsId
        ? prev.map(s => s.id === editingSettingsId ? newSettings : s)
        : [...prev, newSettings];
      localStorage.setItem('savedSettings', JSON.stringify(newSettingsList));
      return newSettingsList;
    });

    setShowSaveDialog(false);
    setSettingsName('');
    setEditingSettingsId(null);
  };

  const updateSettings = (settings: SavedSettings) => {
    // Create a deep copy of the current settings
    const patternCopy: BeatPattern = {};
    Object.keys(advancedPattern).forEach(key => {
      const subdivision = parseInt(key);
      patternCopy[subdivision] = [...(advancedPattern[subdivision] || [])];
    });

    const updatedSettings: SavedSettings = {
      ...settings,  // Keep the same ID and name
      bpm,
      beatsPerMeasure,
      subdivision,
      advancedPattern: patternCopy,
      subdivisionSounds: { ...subdivisionSounds },
      customSubdivisions: [...customSubdivisions],
      speedPercentage
    };

    setSavedSettings(prev => {
      const newSettings = prev.map(s => s.id === settings.id ? updatedSettings : s);
      localStorage.setItem('savedSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const loadSettings = (settings: SavedSettings) => {
    // Reset all UI state
    resetUIState();
    
    // Load the saved settings
    setBpm(settings.bpm);
    setBeatsPerMeasure(settings.beatsPerMeasure);
    setSubdivision(settings.subdivision);
    
    // Create a deep copy of the pattern to ensure it's properly loaded
    const patternCopy: BeatPattern = {};
    Object.keys(settings.advancedPattern).forEach(key => {
      const subdivision = parseInt(key);
      patternCopy[subdivision] = [...(settings.advancedPattern[subdivision] || [])];
    });
    setAdvancedPattern(patternCopy);
    
    setSubdivisionSounds({ ...settings.subdivisionSounds });
    setCustomSubdivisions([...settings.customSubdivisions]);
    
    // Load speed percentage if it exists, otherwise keep current value
    if (settings.speedPercentage !== undefined) {
      setSpeedPercentage(settings.speedPercentage);
    }

    // Set the editing ID to indicate we're editing an existing setting
    setEditingSettingsId(settings.id);
    setSettingsName(settings.name);
    
    // Start the metronome after loading settings
    setIsPlaying(true);
  };

  const deleteSettings = (id: string) => {
    setSavedSettings(prev => {
      const newSettings = prev.filter(s => s.id !== id);
      localStorage.setItem('savedSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-8 shadow-xl">
          <div className="flex justify-end -mt-2 -mr-2 mb-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(true);
                  setSettingsName('');
                  setEditingSettingsId(null);
                }}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                title="Save"
              >
                <AddCircleIcon fontSize="small" />
              </button>
              <button
                onClick={() => {
                  setShowSoundSettings(!showSoundSettings);
                  setShowAdvanced(false);
                }}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                title="Settings"
              >
                {showSoundSettings ? <CloseIcon fontSize="small" /> : <SettingsIcon fontSize="small" />}
              </button>
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Rhythm Weaver</h1>
            <p className="text-blue-200">{tagline}</p>
          </div>

          {showSaveDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {editingSettingsId ? 'Edit Settings' : 'Save Settings'}
                  </h3>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      placeholder="Enter settings name"
                      className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20"
                    />
                  </div>

                  {savedSettings.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <h4 className="text-white/70 text-sm">Saved Settings</h4>
                      {savedSettings.map((settings) => (
                        <div
                          key={settings.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <span className="text-white">{settings.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadSettings(settings)}
                              className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white"
                              title="Load settings"
                            >
                              <PlayArrowIcon fontSize="small" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingSettingsId(settings.id);
                                setSettingsName(settings.name);
                                setShowSaveDialog(true);
                              }}
                              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 transition-colors text-white"
                              title="Save current settings"
                            >
                              <UpdateIcon fontSize="small" />
                            </button>
                            <button
                              onClick={() => deleteSettings(settings.id)}
                              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors text-white"
                              title="Delete settings"
                            >
                              <CloseIcon fontSize="small" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowSaveDialog(false);
                        setSettingsName('');
                        setEditingSettingsId(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCurrentSettings}
                      disabled={!settingsName.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showSoundSettings ? (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => adjustTempo(-1)}
                    className="custom-button rounded-full"
                  >
                    <RemoveIcon fontSize="small" />
                  </button>
                  {isEditingBpm ? (
                    <input
                      ref={bpmInputRef}
                      type="number"
                      value={tempBpm}
                      onChange={handleBpmChange}
                      onBlur={handleBpmBlur}
                      onKeyDown={handleBpmKeyDown}
                      className="custom-input"
                    />
                  ) : (
                    <div
                      onClick={handleBpmClick}
                      className="text-6xl font-bold text-white tabular-nums w-32 text-center cursor-pointer hover:text-primary-light transition-colors"
                    >
                      {bpm}
                    </div>
                  )}
                  <button
                    onClick={() => adjustTempo(1)}
                    className="custom-button rounded-full"
                  >
                    <AddIcon fontSize="small" />
                  </button>
                </div>
                <div className="text-blue-200">BPM</div>
              </div>

              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="flex gap-2">
                  {Array.from({ length: beatsPerMeasure }).map((_, beatIndex) => (
                    <div key={`beat-${beatIndex}`} className="flex flex-col gap-1">
                      <div
                        className={`w-8 h-8 rounded-full transition-colors ${
                          beatIndex === currentBeat
                            ? 'bg-blue-400'
                            : 'bg-white/20'
                        }`}
                      />
                      {subdivision > 1 && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: subdivision - 1 }).map((_, subIndex) => (
                            <div
                              key={`sub-${beatIndex}-${subIndex}`}
                              className={`w-3 h-3 rounded-full transition-colors ${
                                beatIndex === currentBeat &&
                                subIndex + 1 === currentSubdivision
                                  ? 'bg-blue-400/70'
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

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <button
                    onClick={() => setBeatsPerMeasure((prev) => Math.max(prev - 1, 2))}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <RemoveIcon fontSize="small" />
                  </button>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{beatsPerMeasure}</div>
                    <div className="text-blue-200 text-sm">Beats</div>
                  </div>
                  <button
                    onClick={() => setBeatsPerMeasure((prev) => Math.min(prev + 1, 12))}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <AddIcon fontSize="small" />
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <button
                    onClick={() => adjustSubdivision(false)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <KeyboardArrowDownIcon fontSize="small" />
                  </button>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{subdivision}</div>
                    <div className="text-blue-200 text-sm" title='clicks per beat'>CPB</div>
                  </div>
                  <button
                    onClick={() => adjustSubdivision(true)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <KeyboardArrowUpIcon fontSize="small" />
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <button
                    onClick={() => setSpeedPercentage((prev) => Math.max(prev - 5, 5))}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <RemoveIcon fontSize="small" />
                  </button>
                  <div className="text-center relative group">
                    <div className="text-2xl font-bold text-white">{speedPercentage}%</div>
                    <div className="text-blue-200 text-sm">Speed</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 rounded-lg shadow-xl text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {Math.round(bpm * (speedPercentage / 100))} BPM
                    </div>
                  </div>
                  <button
                    onClick={() => setSpeedPercentage((prev) => Math.min(prev + 5, 200))}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  >
                    <AddIcon fontSize="small" />
                  </button>
                </div>
              </div>
              
              <div className="mb-8 w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Sound Pattern</h2>
                </div>
                <div className="space-y-2 w-full">
                  {[0, ...customSubdivisions].map((sub) => {
                    const sound = subdivisionSounds[sub] || { frequency: 440, gain: 0.3 };
                    return (
                      <div key={sub} className="flex items-center gap-2 w-full">
                        <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${beatsPerMeasure * subdivision}, 1fr)` }}>
                          {Array.from({ length: beatsPerMeasure * subdivision }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => toggleBeat(sub, i)}
                              className={`h-6 transition-colors ${
                                advancedPattern[sub]?.[i]
                                  ? sub === 0 
                                    ? 'bg-blue-400 hover:bg-blue-500' 
                                    : sub === 1
                                      ? 'bg-amber-600 hover:bg-amber-700'
                                      : 'bg-[#F44336] hover:bg-[#D32F2F]'
                                  : 'bg-white/20 hover:bg-white/30'
                              } ${sub === 0 && i % subdivision === 0 ? 'border-l-2 border-blue-400' : ''}`}
                              title={`${advancedPattern[sub]?.[i] ? `Sound ${sub} on` : 'No sound'} at square ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Sound Settings</h2>
              </div>
              
              {/* Global Volume Control */}
              <div className="p-4 rounded-xl bg-white/5 mb-4">
                <label className="text-blue-200 text-sm mb-2 block">
                  Volume: {Math.round((globalVolume / 4.0) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(globalVolume / 4.0) * 100}
                  onChange={(e) => setGlobalVolume((Number(e.target.value) / 100) * 4.0)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        const sound = subdivisionSounds[0] || { frequency: 440, gain: 0.3 };
                        playClick(0);
                      }}
                      className="p-2 rounded-lg bg-blue-400 hover:bg-blue-500 transition-colors text-white"
                    >
                      <GraphicEqIcon fontSize="small" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Sound Type
                      </label>
                      <select
                        value={subdivisionSounds[0]?.soundType || 'Click'}
                        onChange={(e) => handleSoundTypeChange(0, e.target.value)}
                        className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20 mb-4"
                      >
                        {Object.keys(SOUND_PRESETS).map((preset) => (
                          <option key={preset} value={preset}>{preset}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Frequency: {getFrequencyLabel(subdivisionSounds[0]?.frequency || 0)}
                      </label>
                      <input
                        type="range"
                        min="220"
                        max="1760"
                        value={subdivisionSounds[0]?.frequency}
                        onChange={(e) => updateSoundSettings(0, 'frequency', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Filter Type
                      </label>
                      <select
                        value={subdivisionSounds[0]?.filterType || 'none'}
                        onChange={(e) => updateSoundSettings(0, 'filterType', e.target.value as any)}
                        className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20"
                      >
                        <option value="none">None</option>
                        <option value="lowpass">Low Pass</option>
                        <option value="highpass">High Pass</option>
                        <option value="bandpass">Band Pass</option>
                      </select>
                    </div>
                    {subdivisionSounds[0]?.filterType !== 'none' && (
                      <>
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Filter Frequency: {subdivisionSounds[0]?.filterFrequency || 1000}Hz
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="8000"
                            step="1"
                            value={subdivisionSounds[0]?.filterFrequency}
                            onChange={(e) => updateSoundSettings(0, 'filterFrequency', Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-xs text-blue-200/70 mt-1">
                            {subdivisionSounds[0]?.filterType === 'lowpass' && 'Higher values allow more high frequencies'}
                            {subdivisionSounds[0]?.filterType === 'highpass' && 'Higher values cut more low frequencies'}
                            {subdivisionSounds[0]?.filterType === 'bandpass' && 'Center frequency of the band'}
                          </div>
                        </div>
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Filter Q: {(subdivisionSounds[0]?.filterQ || 1).toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={subdivisionSounds[0]?.filterQ}
                            onChange={(e) => updateSoundSettings(0, 'filterQ', Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Waveform
                      </label>
                      <select
                        value={subdivisionSounds[0]?.waveform || 'sine'}
                        onChange={(e) => updateSoundSettings(0, 'waveform', e.target.value as OscillatorType)}
                        className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20"
                      >
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Attack: {(subdivisionSounds[0]?.attack || 0.01).toFixed(3)}s
                      </label>
                      <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={subdivisionSounds[0]?.attack || 0.01}
                        onChange={(e) => updateSoundSettings(0, 'attack', Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-blue-200/70 mt-1">
                        Time for the sound to reach full volume
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-blue-200 text-sm mb-1 block">
                        Decay: {(subdivisionSounds[0]?.decay || 0.2).toFixed(3)}s
                      </label>
                      <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={subdivisionSounds[0]?.decay || 0.2}
                        onChange={(e) => updateSoundSettings(0, 'decay', Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-blue-200/70 mt-1">
                        Time for the sound to fade out
                      </div>
                    </div>
                  </div>
                </div>

                {customSubdivisions.map((sub) => {
                  const sound = subdivisionSounds[sub] || { frequency: 440, gain: 0.3 };
                  return (
                    <div key={sub} className="p-4 rounded-xl bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            const sound = subdivisionSounds[sub] || { frequency: 440, gain: 0.3 };
                            playClick(sub);
                          }}
                          className={`p-2 rounded-lg transition-colors text-white ${
                            sub === 1 
                              ? 'bg-amber-600 hover:bg-amber-700' 
                              : 'bg-[#F44336] hover:bg-[#D32F2F]'
                          }`}
                        >
                          <GraphicEqIcon fontSize="small" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Sound Type
                          </label>
                          <select
                            value={sound.soundType || 'Click'}
                            onChange={(e) => handleSoundTypeChange(sub, e.target.value)}
                            className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20 mb-4"
                          >
                            {Object.keys(SOUND_PRESETS).map((preset) => (
                              <option key={preset} value={preset}>{preset}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Frequency: {getFrequencyLabel(sound.frequency)}
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
                          <label className="text-blue-200 text-sm mb-1 block">
                            Filter Type
                          </label>
                          <select
                            value={sound.filterType || 'none'}
                            onChange={(e) => updateSoundSettings(sub, 'filterType', e.target.value as any)}
                            className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20"
                          >
                            <option value="none">None</option>
                            <option value="lowpass">Low Pass</option>
                            <option value="highpass">High Pass</option>
                            <option value="bandpass">Band Pass</option>
                          </select>
                        </div>
                        {sound.filterType !== 'none' && (
                          <>
                            <div>
                              <label className="text-blue-200 text-sm mb-1 block">
                                Filter Frequency: {sound.filterFrequency || 1000}Hz
                              </label>
                              <input
                                type="range"
                                min="20"
                                max="8000"
                                step="1"
                                value={sound.filterFrequency}
                                onChange={(e) => updateSoundSettings(sub, 'filterFrequency', Number(e.target.value))}
                                className="w-full"
                              />
                              <div className="text-xs text-blue-200/70 mt-1">
                                {sound.filterType === 'lowpass' && 'Higher values allow more high frequencies'}
                                {sound.filterType === 'highpass' && 'Higher values cut more low frequencies'}
                                {sound.filterType === 'bandpass' && 'Center frequency of the band'}
                              </div>
                            </div>
                            <div>
                              <label className="text-blue-200 text-sm mb-1 block">
                                Filter Q: {(sound.filterQ || 1).toFixed(1)}
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={sound.filterQ}
                                onChange={(e) => updateSoundSettings(sub, 'filterQ', Number(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          </>
                        )}
                        
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Waveform
                          </label>
                          <select
                            value={sound.waveform || 'sine'}
                            onChange={(e) => updateSoundSettings(sub, 'waveform', e.target.value as OscillatorType)}
                            className="w-full bg-white/10 text-white rounded-lg p-2 border border-white/20"
                          >
                            <option value="sine">Sine</option>
                            <option value="square">Square</option>
                            <option value="sawtooth">Sawtooth</option>
                            <option value="triangle">Triangle</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Attack: {(sound.attack || 0.01).toFixed(3)}s
                          </label>
                          <input
                            type="range"
                            min="0.001"
                            max="0.1"
                            step="0.001"
                            value={sound.attack || 0.01}
                            onChange={(e) => updateSoundSettings(sub, 'attack', Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-xs text-blue-200/70 mt-1">
                            Time for the sound to reach full volume
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-blue-200 text-sm mb-1 block">
                            Decay: {(sound.decay || 0.2).toFixed(3)}s
                          </label>
                          <input
                            type="range"
                            min="0.01"
                            max="0.5"
                            step="0.01"
                            value={sound.decay || 0.2}
                            onChange={(e) => updateSoundSettings(sub, 'decay', Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-xs text-blue-200/70 mt-1">
                            Time for the sound to fade out
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!showSoundSettings && (
            <div className="relative">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isPlaying ? (
                  <>
                    <PauseIcon fontSize="small" /> Stop
                  </>
                ) : (
                  <>
                    <PlayArrowIcon fontSize="small" /> Start
                  </>
                )}
              </button>
              
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 text-sm">
                {countdownTime !== null ? formatTime(countdownTime) : formatTime(elapsedTime)}
              </div>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTimeout(!showTimeout);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                    title="Set timer"
                  >
                    <TimerIcon fontSize="small" />
                  </button>
                  
                  {showTimeout && (
                    <div 
                      className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-lg shadow-xl p-2 min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => {
                            setTimeoutMinutes(mins);
                            setShowTimeout(false);
                          }}
                          className={`block w-full text-left px-3 py-1 rounded hover:bg-white/10 text-white ${
                            timeoutMinutes === mins ? 'bg-white/20' : ''
                          }`}
                        >
                          {mins} min
                        </button>
                      ))}
                      {timeoutMinutes && (
                        <button
                          onClick={() => {
                            setTimeoutMinutes(null);
                            setShowTimeout(false);
                          }}
                          className="block w-full text-left px-3 py-1 rounded hover:bg-white/10 text-red-400"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;