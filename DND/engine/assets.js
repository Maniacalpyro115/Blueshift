(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  let musicContext = null;
  const soundBufferCache = new Map();
  const standaloneAudioMode = navigator.standalone === true;
  const standaloneVoices = standaloneAudioMode
    ? Array.from({ length: 12 }, () => {
      const voice = new Audio();
      voice.preload = "auto";
      return voice;
    })
    : [];
  const standaloneMusicTracks = new Set();
  let standaloneVoiceIndex = 0;
  let standaloneVoicesUnlocked = false;
  let audioPrimeStarted = false;
  let audioUnlocked = false;

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    img.ready = false;
    img.onload = () => (img.ready = true);
    img.onerror = () => (img.ready = false);
    return img;
  }

  function loadSound(src) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.3;
    audio._soulBattleSrc = src;
    preloadSound(audio);
    return audio;
  }

  function soundSource(sound) {
    if (!sound) return "";
    const src = sound._soulBattleSrc || sound.currentSrc || sound.src;
    if (typeof src !== "string" || !src) return "";
    try {
      return new URL(src, document.baseURI).href;
    } catch (_error) {
      return src;
    }
  }

  function preloadSound(sound) {
    const src = soundSource(sound);
    if (!src || typeof fetch !== "function") return Promise.resolve(null);

    let entry = soundBufferCache.get(src);
    if (!entry) {
      entry = { data: null, buffer: null, loading: null, decoding: null };
      entry.loading = fetch(src)
        .then((response) => {
          if (!response.ok) throw new Error(`Failed to load sound: ${response.status} ${src}`);
          return response.arrayBuffer();
        })
        .then((audioData) => {
          entry.data = audioData;
          return audioData;
        })
        .catch(() => null);
      soundBufferCache.set(src, entry);
    }

    sound._soulBattleBufferEntry = entry;
    return musicContext ? decodeSoundEntry(entry, musicContext) : entry.loading;
  }

  function decodeSoundEntry(entry, context) {
    if (entry.buffer) return Promise.resolve(entry.buffer);
    if (entry.decoding) return entry.decoding;

    entry.decoding = entry.loading
      .then((audioData) => {
        if (!audioData) return null;
        const decodeCopy = typeof audioData.slice === "function" ? audioData.slice(0) : audioData;
        return context.decodeAudioData(decodeCopy);
      })
      .then((buffer) => {
        entry.buffer = buffer;
        return buffer;
      })
      .catch(() => null);
    return entry.decoding;
  }

  function startBufferedSound(context, buffer, volume) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
  }

  function playHtmlSound(sound, volumeScale) {
    const useClone = volumeScale !== 1 || sound.paused === false;
    const voice = useClone && typeof sound.cloneNode === "function"
      ? sound.cloneNode(true)
      : sound;
    voice.volume = Math.max(0, Math.min(1, sound.volume * volumeScale));
    voice.currentTime = 0;
    const playResult = voice.play();
    playResult?.catch?.(() => {
      // Web Audio will take over once the browser has accepted the first gesture.
    });
  }

  function unlockStandaloneAudio() {
    if (!standaloneAudioMode) return false;

    if (!standaloneVoicesUnlocked) {
      const unlockSrc = new URL("sounds/snd_select.wav", document.baseURI).href;
      for (const voice of standaloneVoices) {
        voice.src = unlockSrc;
        voice.volume = 0;
        voice.currentTime = 0;
        voice.play()?.catch?.(() => {});
      }
      standaloneVoicesUnlocked = true;
    }

    for (const music of standaloneMusicTracks) {
      if (music.playRequested && music.htmlAudio?.paused) {
        music.htmlAudio.play()?.catch?.(() => {});
      }
    }
    audioUnlocked = true;
    return true;
  }

  function playStandaloneSound(sound, volume) {
    if (!standaloneVoices.length) {
      playHtmlSound(sound, volume / Math.max(0.0001, sound.volume));
      return;
    }

    const idleVoice = standaloneVoices.find((voice) => voice.paused || voice.ended);
    const voice = idleVoice || standaloneVoices[standaloneVoiceIndex++ % standaloneVoices.length];
    voice.src = soundSource(sound);
    voice.volume = volume;
    voice.currentTime = 0;
    voice.play()?.catch?.(() => {});
  }

  function unlockAudio() {
    if (standaloneAudioMode) return Promise.resolve(unlockStandaloneAudio());

    const context = getMusicContext();
    if (!context) return Promise.resolve(false);

    if (!audioPrimeStarted) {
      const silentBuffer = context.createBuffer(1, 1, context.sampleRate || 44100);
      const silentSource = context.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.connect(context.destination);
      silentSource.start(0);
      audioPrimeStarted = true;
    }

    const resume = context.state !== "running" ? context.resume() : Promise.resolve();
    return Promise.resolve(resume)
      .then(() => {
        if (context.state !== "running") return false;
        audioUnlocked = true;
        return Promise.all(
          [...soundBufferCache.values()].map((entry) => decodeSoundEntry(entry, context))
        ).then(() => true);
      })
      .catch(() => false);
  }

  function playSound(sound, volumeScale = 1) {
    if (!sound) return;

    const scale = Number.isFinite(volumeScale) ? Math.max(0, volumeScale) : 1;
    const volume = Math.max(0, Math.min(1, sound.volume * scale));
    const context = musicContext;
    const src = soundSource(sound);
    const entry = sound._soulBattleBufferEntry || soundBufferCache.get(src);
    window.dispatchEvent(new CustomEvent("soulbattle:sound-played", {
      detail: { src, volume }
    }));

    if (standaloneAudioMode) {
      playStandaloneSound(sound, volume);
      return;
    }

    if (context && entry?.buffer) {
      if (context.state === "running") {
        startBufferedSound(context, entry.buffer, volume);
      } else {
        unlockAudio().then((unlocked) => {
          if (unlocked) startBufferedSound(context, entry.buffer, volume);
          else playHtmlSound(sound, scale);
        });
      }
      return;
    }

    if (context && entry) decodeSoundEntry(entry, context);
    else preloadSound(sound);
    playHtmlSound(sound, scale);
  }

  function getMusicContext() {
    if (!musicContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      musicContext = new AudioContextClass();
    }

    return musicContext;
  }

  for (const eventName of ["pointerdown", "touchstart", "keydown"]) {
    document.addEventListener(eventName, unlockAudio, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && audioUnlocked) unlockAudio();
  });

  function createMusicTrack(config, fallbackSrc) {
    const data = config && typeof config === "object"
      ? config
      : { src: typeof config === "string" ? config : fallbackSrc };

    return {
      src: typeof data.src === "string" ? data.src : fallbackSrc,
      volume: Number.isFinite(data.volume) ? Math.max(0, Math.min(1, data.volume)) : 0.45,
      loopStart: Number.isFinite(data.loopStart) ? Math.max(0, data.loopStart) : null,
      loopEnd: Number.isFinite(data.loopEnd) ? Math.max(0, data.loopEnd) : null,
      bpm: Number.isFinite(data.bpm) ? Math.max(1, data.bpm) : null,
      buffer: null,
      loading: null,
      source: null,
      gain: null,
      playRequested: false,
      playToken: 0,
      startedAt: null,
      htmlAudio: null,
      htmlLoopCount: 0
    };
  }

  function getStandaloneMusicAudio(music) {
    if (music.htmlAudio) return music.htmlAudio;

    const audio = new Audio(music.src);
    const hasLoopPoints = Number.isFinite(music.loopStart) &&
      Number.isFinite(music.loopEnd) && music.loopEnd > music.loopStart;
    audio.preload = "auto";
    audio.volume = music.volume;
    audio.loop = !hasLoopPoints;
    audio.addEventListener("timeupdate", () => {
      if (!hasLoopPoints || audio.currentTime < music.loopEnd) return;
      music.htmlLoopCount++;
      audio.currentTime = music.loopStart;
      if (music.playRequested) audio.play()?.catch?.(() => {});
    });
    music.htmlAudio = audio;
    standaloneMusicTracks.add(music);
    return audio;
  }

  function loadMusicBuffer(music, context) {
    if (music.buffer) return Promise.resolve(music.buffer);
    if (music.loading) return music.loading;

    music.loading = fetch(music.src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load music: ${response.status} ${music.src}`);
        }

        return response.arrayBuffer();
      })
      .then((audioData) => context.decodeAudioData(audioData))
      .then((buffer) => {
        music.buffer = buffer;
        return buffer;
      })
      .catch((err) => {
        music.loading = null;
        console.warn("Music failed to load:", err);
        return null;
      });

    return music.loading;
  }

  function startMusicSource(music, context, token) {
    if (!music.playRequested || music.playToken !== token || music.source || !music.buffer) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const hasLoopPoints = Number.isFinite(music.loopStart) &&
      Number.isFinite(music.loopEnd) &&
      music.loopEnd > music.loopStart &&
      music.loopStart < music.buffer.duration;

    source.buffer = music.buffer;
    source.loop = true;

    if (hasLoopPoints) {
      source.loopStart = music.loopStart;
      source.loopEnd = Math.min(music.loopEnd, music.buffer.duration);
    }

    gain.gain.value = music.volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      if (music.source === source) {
        music.source = null;
        music.gain = null;
      }
    };

    music.source = source;
    music.gain = gain;
    music.startedAt = context.currentTime;
    source.start(0);
  }

  function getMusicPosition(music) {
    if (standaloneAudioMode && music?.htmlAudio) return music.htmlAudio.currentTime;
    if (!music || !music.source || !Number.isFinite(music.startedAt) || !musicContext) return null;

    const elapsed = Math.max(0, musicContext.currentTime - music.startedAt);
    const hasLoopPoints = Number.isFinite(music.loopStart) &&
      Number.isFinite(music.loopEnd) &&
      music.loopEnd > music.loopStart;

    if (!hasLoopPoints || elapsed < music.loopEnd) return elapsed;

    const loopLength = music.loopEnd - music.loopStart;
    return music.loopStart + ((elapsed - music.loopStart) % loopLength);
  }

  function getMusicElapsed(music) {
    if (standaloneAudioMode && music?.htmlAudio) {
      const currentTime = music.htmlAudio.currentTime;
      const hasLoopPoints = Number.isFinite(music.loopStart) &&
        Number.isFinite(music.loopEnd) && music.loopEnd > music.loopStart;
      if (!hasLoopPoints || music.htmlLoopCount === 0) return currentTime;
      return music.loopStart + music.htmlLoopCount * (music.loopEnd - music.loopStart) +
        Math.max(0, currentTime - music.loopStart);
    }
    if (!music || !music.source || !Number.isFinite(music.startedAt) || !musicContext) return null;
    return Math.max(0, musicContext.currentTime - music.startedAt);
  }

  function playMusic(music) {
    if (!music) return;

    if (standaloneAudioMode) {
      music.playRequested = true;
      music.playToken++;
      const audio = getStandaloneMusicAudio(music);
      audio.volume = music.volume;
      audio.play()?.catch?.(() => {});
      return;
    }

    const context = getMusicContext();
    if (!context) return;

    music.playRequested = true;
    const token = ++music.playToken;

    context.resume().catch((err) => {
      console.warn("Music context failed to resume:", err);
    });

    loadMusicBuffer(music, context).then((buffer) => {
      if (buffer) startMusicSource(music, context, token);
    });
  }

  function stopMusic(music) {
    if (!music) return;

    music.playRequested = false;
    music.playToken++;

    if (music.htmlAudio) {
      music.htmlAudio.pause();
      music.htmlAudio.currentTime = 0;
      music.htmlLoopCount = 0;
    }

    if (music.source) {
      music.source.onended = null;
      music.source.stop();
      music.source.disconnect();
      music.source = null;
      music.startedAt = null;
    }

    if (music.gain) {
      music.gain.disconnect();
      music.gain = null;
    }
  }

  function setMusicVolume(music, volume) {
    if (!music || !Number.isFinite(volume)) return;
    music.volume = Math.max(0, Math.min(1, volume));
    if (music.gain) music.gain.gain.value = music.volume;
    if (music.htmlAudio) music.htmlAudio.volume = music.volume;
  }

  function addSpriteMap(target, sprites) {
    if (!sprites || typeof sprites !== "object") return;

    for (const [key, src] of Object.entries(sprites)) {
      if (typeof key === "string" && typeof src === "string") {
        target[key] = loadImage(src);
      }
    }
  }

  function addAttackSprites(target, turns) {
    if (!Array.isArray(turns)) return;

    for (const turn of turns) {
      const attack = turn && typeof turn === "object" && turn.attack
        ? turn.attack
        : turn;

      if (attack && typeof attack === "object" && typeof attack.sprite === "string") {
        const isPath = attack.sprite.includes("/") || attack.sprite.includes("\\") || attack.sprite.includes(".");

        if (isPath) {
          target[`attackSprite:${attack.sprite}`] = loadImage(attack.sprite);
        }
      }
    }
  }

  function addEnemyAnimations(target, animations) {
    if (!animations || typeof animations !== "object") return;

    for (const [role, animation] of Object.entries(animations)) {
      if (!Array.isArray(animation?.frames)) continue;
      animation.frames.forEach((src, index) => {
        if (typeof src === "string") {
          target[`enemyAnimation:${role}:${index}`] = loadImage(src);
        }
      });
    }
  }

  function createAssets(enemyData) {
    const fallbackMusic = "sounds/linedance_battle.wav";
    const battleTheme = createMusicTrack(enemyData.music, fallbackMusic);
    const phase2Theme = enemyData.phase2?.music
      ? createMusicTrack(enemyData.phase2.music, fallbackMusic)
      : battleTheme;
    const sceneSprites = {};
    const enemySprites = {};
    const partySprites = {};
    const declaredSounds = { ...(enemyData.sounds || {}) };
    const declaredMusicTracks = enemyData.musicTracks && typeof enemyData.musicTracks === "object"
      ? enemyData.musicTracks
      : {};

    if (enemyData.sceneSprites && typeof enemyData.sceneSprites === "object") {
      for (const [key, src] of Object.entries(enemyData.sceneSprites)) {
        if (typeof key === "string" && typeof src === "string") {
          sceneSprites[key] = loadImage(src);
        }
      }
    }

    addSpriteMap(enemySprites, enemyData.sprites);
    addEnemyAnimations(enemySprites, enemyData.spriteAnimations);
    addAttackSprites(enemySprites, enemyData.turns);
    addAttackSprites(enemySprites, enemyData.attackPatterns);

    if (Array.isArray(enemyData.defaultAnimation?.frames)) {
      enemyData.defaultAnimation.frames.forEach((src, index) => {
        if (typeof src === "string") {
          enemySprites[`enemyDefaultAnimation:${index}`] = loadImage(src);
        }
      });
    }

    if (enemyData.phase2 && typeof enemyData.phase2 === "object") {
      addSpriteMap(enemySprites, enemyData.phase2.sprites);
      addEnemyAnimations(enemySprites, enemyData.phase2.spriteAnimations);
      addAttackSprites(enemySprites, enemyData.phase2.turns);
      addAttackSprites(enemySprites, enemyData.phase2.attackPatterns);
    }

    if (Array.isArray(window.PLAYER_DATA)) {
      for (const player of window.PLAYER_DATA) {
        if (!player || typeof player.name !== "string") continue;
        if (player.sounds && typeof player.sounds === "object") {
          Object.assign(declaredSounds, player.sounds);
        }

        if (player.sprites && typeof player.sprites === "object") {
          for (const [role, src] of Object.entries(player.sprites)) {
            if (typeof src === "string") {
              partySprites[`${player.name}:${role}`] = loadImage(src);

              const explicitAnimation = player.spriteAnimations?.[role];
              const legacyDefaultAnimation = role === "default" ? player.defaultAnimation : null;
              const configuredFrames = Array.isArray(explicitAnimation?.frames)
                ? explicitAnimation.frames
                : Array.isArray(legacyDefaultAnimation?.frames)
                  ? legacyDefaultAnimation.frames
                  : null;
              const slashIndex = src.lastIndexOf("/");
              const characterPath = slashIndex >= 0 ? src.slice(0, slashIndex) : "";
              const animationFrames = configuredFrames || Array.from({ length: 5 }, (_, index) => {
                const frame = String(index + 1).padStart(4, "0");
                return `${characterPath}/${role}/${role}_${frame}.png`;
              });

              animationFrames.forEach((frameSrc, index) => {
                if (typeof frameSrc === "string") {
                  partySprites[`${player.name}:${role}Animation:${index}`] = loadImage(frameSrc);
                }
              });
            }
          }
        } else if (typeof player.sprite === "string") {
          partySprites[`${player.name}:default`] = loadImage(player.sprite);
          partySprites[`${player.name}:down`] = loadImage(player.sprite);
          partySprites[`${player.name}:icon`] = loadImage(player.sprite);
        }
      }
    }

    return {
      sprites: {
        enemy: loadImage(enemyData.sprite),
        phase2Enemy: loadImage(enemyData.phase2?.sprite || enemyData.sprite),
        ultimateEnemy: loadImage(enemyData.ultimateSprite || enemyData.sprite),
        heart: loadImage("sprites/heart.png"),
        projectile: loadImage("sprites/projectile.png"),
        ...enemySprites,
        ...sceneSprites,
        ...partySprites,
      },
      sounds: {
        playerHurt: loadSound("sounds/snd_hurt1.wav"),
        attackLand: loadSound("sounds/snd_laz.wav"),
        vaporized: loadSound("sounds/snd_vaporized.wav"),
        bombsplosion: loadSound("sounds/snd_bombsplosion.wav"),
        break1: loadSound("sounds/snd_break1.wav"),
        break2: loadSound("sounds/snd_break2.wav"),
        shieldBlock: loadSound("sounds/snd_tempbell.wav"),
        graze: loadSound("sounds/snd_graze.wav"),
        itemUse: loadSound("sounds/snd_heal_c.wav"),
        statChange: loadSound("sounds/snd_shineselect.wav"),
        menuMove: loadSound("sounds/snd_select.wav"),
        menuSelect: loadSound("sounds/snd_select.wav"),
        determination: createMusicTrack("sounds/determination.mp3", "sounds/determination.mp3"),
        battleTheme,
        phase2Theme,
        ...Object.fromEntries(
          Object.entries(declaredSounds)
            .filter(([, src]) => typeof src === "string")
            .map(([key, src]) => [key, loadSound(src)])
        ),
        ...Object.fromEntries(
          Object.entries(declaredMusicTracks)
            .map(([key, config]) => [
              key,
              createMusicTrack(config, typeof config === "string" ? config : config?.src)
            ])
        )
      }
    };
  }

  window.SoulBattle.assets = {
    loadSound,
    preloadSound,
    unlockAudio,
    createAssets,
    playSound,
    playMusic,
    stopMusic,
    setMusicVolume,
    getMusicPosition,
    getMusicElapsed
  };
})();
