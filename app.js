// Mini Quiz (no tooling) — sound + effects
(() => {
  const $ = s => document.querySelector(s);
  const dataset = JSON.parse($('#data').textContent);

  // Elements
  const barEl = $('#bar');
  const totalEl = $('#total');
  const countEl = $('#count');
  const questionEl = $('#question');
  const choicesEl = $('#choices');
  const cardEl = $('#card');
  const startScreen = $('#start');
  const categoryList = $('#category-list');
  const beginBtn = $('#begin');
  const startInfo = $('#start-info');
  const shuffleToggle = $('#shuffle');
  const shuffleState = $('#shuffle-state');
  const questionCountInput = $('#question-count');
  const timerEl = $('#timer');
  const skipBtn = $('#skip');
  const bestEl = $('#best');
  const soundToggle = $('#sound');
  const soundIcon = $('#sound-icon');
  const resultCard = $('#result');
  const resultEmojiEl = $('#result-emoji');
  const resultTitleEl = $('#result-title');
  const resultPercentEl = $('#result-percent');
  const resultDetailEl = $('#result-detail');
  const resultNoteEl = $('#result-note');
  const playAgainBtn = $('#play-again');
  const backToCategoriesBtn = $('#to-categories');

  let questions = [];
  let selectedCategory = null;
  let activeCategory = '';
  let total = 0;
  let i = 0, score = 0, timer = 20, tHandle = null;

  totalEl.textContent = 0;
  countEl.textContent = 0;

  function updateShuffleIndicator() {
    if (shuffleState) shuffleState.textContent = shuffleToggle.checked ? 'Açık' : 'Kapalı';
  }
  shuffleToggle.addEventListener('change', updateShuffleIndicator);
  updateShuffleIndicator();

  // THEME
  const root = document.documentElement;
  const themeToggle = $('#theme');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') root.classList.add('light');
  themeToggle.checked = savedTheme === 'light';
  themeToggle.addEventListener('change', () => {
    root.classList.toggle('light', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'light' : 'dark');
  });

  // SOUND
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundOn = localStorage.getItem('sound') !== 'off';
  function ensureContext() {
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume();
    }
    return audioCtx;
  }
  function tone(freq=440, dur=0.12, type='sine', vol=0.04) {
    if (!soundOn) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = vol;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur);
  }
  const sCorrect = () => {
    tone(660, .1, 'sine', .06);
    setTimeout(() => tone(880, .12, 'sine', .05), 90);
  };
  const sWrong = () => {
    tone(220, .16, 'sawtooth', .06);
    setTimeout(() => tone(180, .14, 'square', .04), 100);
  };
  const sTick = () => tone(1200, .03, 'square', .025);

  function updateSoundToggle() {
    soundToggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundToggle.setAttribute('aria-label', soundOn ? 'Sesi kapat' : 'Sesi aç');
    soundIcon.textContent = soundOn ? '🔊' : '🔇';
  }
  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    localStorage.setItem('sound', soundOn ? 'on' : 'off');
    if (!soundOn && audioCtx && typeof audioCtx.suspend === 'function') {
      audioCtx.suspend();
    }
    updateSoundToggle();
  });
  updateSoundToggle();

  // BEST SCORES
  const bestCache = {};
  const bestKey = category => `best-${category}`;
  function getBest(category) {
    if (!category) return null;
    if (bestCache.hasOwnProperty(category)) return bestCache[category];
    const raw = localStorage.getItem(bestKey(category));
    if (!raw) {
      bestCache[category] = null;
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.correct === 'number' && typeof parsed.total === 'number') {
        bestCache[category] = parsed;
        return parsed;
      }
    } catch {}
    bestCache[category] = null;
    return null;
  }
  function setBest(category, correct, totalCount) {
    if (!category) return;
    const value = { correct, total: totalCount };
    bestCache[category] = value;
    localStorage.setItem(bestKey(category), JSON.stringify(value));
  }
  function formatBest(category) {
    const best = getBest(category);
    if (!best) return 'En iyi: -';
    return `En iyi: ${best.correct}/${best.total}`;
  }
  function updateBestBadge(category) {
    bestEl.textContent = formatBest(category);
  }
  function isBetterScore(correct, totalCount, prev) {
    if (!prev) return true;
    const currentPercent = totalCount ? correct / totalCount : 0;
    const prevPercent = prev.total ? prev.correct / prev.total : 0;
    if (currentPercent > prevPercent) return true;
    if (currentPercent < prevPercent) return false;
    if (correct > prev.correct) return true;
    if (correct < prev.correct) return false;
    if (totalCount > prev.total) return true;
    return false;
  }
  updateBestBadge(null);

  // CONFETTI
  const canvas = $('#confetti');
  const c = canvas.getContext('2d');
  function fit() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', fit); fit();
  function confettiBurst(x = innerWidth/2, y = innerHeight/2) {
    const parts = Array.from({ length: 120 }).map(() => ({
      x,
      y,
      r: Math.random()*2+1,
      a: Math.random()*Math.PI*2,
      v: Math.random()*4+2,
      life: 60+Math.random()*40
    }));
    let frame = 0;
    function step() {
      c.clearRect(0,0,canvas.width,canvas.height);
      parts.forEach(p => {
        p.x += Math.cos(p.a)*p.v;
        p.y += Math.sin(p.a)*p.v + 0.3;
        p.v *= 0.98;
        p.life--;
        c.beginPath();
        c.arc(p.x,p.y,p.r,0,Math.PI*2);
        c.fillStyle = `hsl(${(p.x+p.y)%360}, 80%, 60%)`;
        c.fill();
      });
      if (frame++ < 80) requestAnimationFrame(step);
      else c.clearRect(0,0,canvas.width,canvas.height);
    }
    step();
  }

  // START SCREEN
  const categoryButtons = [];
  Object.entries(dataset).forEach(([name, list]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice category-choice';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      selectedCategory = name;
      beginBtn.disabled = false;
      categoryButtons.forEach(b => b.classList.toggle('selected', b === btn));
      const best = getBest(name);
      const bestText = best ? ` En iyi skorun: ${best.correct}/${best.total}.` : '';
      startInfo.textContent = `${name} kategorisinde ${list.length} soru seni bekliyor.${bestText}`;
      updateBestBadge(name);

      const currentValue = parseInt(questionCountInput.value, 10);
      const sanitized = Number.isFinite(currentValue) && currentValue > 0
        ? Math.min(currentValue, list.length)
        : Math.min(10, list.length);
      questionCountInput.value = sanitized;
      questionCountInput.setAttribute('max', list.length);
    });
    categoryList.appendChild(btn);
    categoryButtons.push(btn);
  });

  function resetStartScreen() {
    selectedCategory = null;
    beginBtn.disabled = true;
    categoryButtons.forEach(b => b.classList.remove('selected'));
    startInfo.textContent = 'Bir kategori seç ve başla!';
    updateBestBadge(null);
  }

  beginBtn.addEventListener('click', () => {
    if (!selectedCategory) return;
    startQuiz(selectedCategory);
  });

  function openStartScreen() {
    stopTimer();
    questions = [];
    activeCategory = '';
    score = 0;
    total = 0;
    i = 0;
    timer = 20;
    totalEl.textContent = 0;
    countEl.textContent = 0;
    barEl.style.width = '0%';
    timerEl.textContent = timer;
    choicesEl.innerHTML = '';
    questionEl.textContent = 'Hazırsan kategorini seç!';
    cardEl.classList.add('hidden');
    resultCard.classList.add('hidden');
    resultCard.classList.remove('fade-in');
    startScreen.classList.remove('hidden');
    resetStartScreen();
  }

  function startQuiz(category) {
    activeCategory = category;
    const pool = dataset[category] ? dataset[category].slice() : [];
    const shouldShuffle = !!shuffleToggle.checked;

    if (pool.length) questionCountInput.setAttribute('max', pool.length);
    else questionCountInput.removeAttribute('max');

    let desiredCount = parseInt(questionCountInput.value, 10);
    if (!Number.isFinite(desiredCount) || desiredCount <= 0) {
      desiredCount = pool.length;
    }
    desiredCount = Math.min(pool.length, desiredCount);
    if (pool.length && desiredCount <= 0) {
      desiredCount = pool.length;
    }

    const ordered = shouldShuffle ? shuffle(pool) : pool;
    questions = ordered.slice(0, desiredCount);
    questionCountInput.value = questions.length;

    total = questions.length;
    score = 0;
    i = 0;
    timer = 20;
    totalEl.textContent = total;
    countEl.textContent = 0;
    barEl.style.width = '0%';
    timerEl.textContent = timer;

    startScreen.classList.add('hidden');
    resultCard.classList.add('hidden');
    resultCard.classList.remove('fade-in');
    cardEl.classList.remove('hidden');
    updateBestBadge(category);

    if (!questions.length) {
      questionEl.textContent = 'Bu kategoride soru bulunamadı.';
      choicesEl.innerHTML = '';
      return;
    }
    render();
  }

  // STATE
  function shuffle(a){ return [...a].sort(() => Math.random() - 0.5); }

  function render() {
    if (!questions.length) return;
    const q = questions[i];
    questionEl.textContent = q.q;
    countEl.textContent = i+1;
    barEl.style.width = ((i)/total*100) + '%';

    const box = choicesEl;
    box.innerHTML = '';
    shuffle(q.a).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.textContent = opt;
      btn.onclick = () => pick(opt, q.c);
      box.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    stopTimer();
    timer = 20;
    timerEl.textContent = timer;
    tHandle = setInterval(() => {
      timer--;
      timerEl.textContent = timer;
      sTick();
      if (timer <= 0) {
        stopTimer();
        wrongTimeout();
      }
    }, 1000);
  }
  function stopTimer(){ if (tHandle) clearInterval(tHandle); tHandle = null; }

  function wrongTimeout() {
    const q = questions[i];
    markAnswers(null, q.c);
    next();
  }

  function markAnswers(picked, correct) {
    choicesEl.querySelectorAll('.choice').forEach(el => {
      if (el.textContent === correct) el.classList.add('correct');
      else if (picked && el.textContent === picked) el.classList.add('wrong');
      el.disabled = true;
    });
  }

  function pick(val, correct) {
    stopTimer();
    const good = val === correct;
    if (good) {
      score++;
      sCorrect();
      confettiBurst(innerWidth*0.8, innerHeight*0.2);
    } else {
      sWrong();
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 320);
    }
    markAnswers(val, correct);
    setTimeout(next, 700);
  }

  function next() {
    i++;
    if (i < total) render();
    else finish();
  }

  function finish() {
    stopTimer();
    barEl.style.width = '100%';
    countEl.textContent = total;
    const percent = total ? Math.round((score/total)*100) : 0;
    const previousBest = getBest(activeCategory);
    const isRecord = isBetterScore(score, total, previousBest);
    if (isRecord) setBest(activeCategory, score, total);
    updateBestBadge(activeCategory);

    const emoji = percent >= 80 ? '🏆' : (percent >= 50 ? '🎯' : '💪');
    const headline = percent >= 80 ? 'Muhteşem!' : (percent >= 50 ? 'Güzel iş!' : 'Biraz daha!');
    resultEmojiEl.textContent = emoji;
    resultTitleEl.textContent = isRecord ? `${headline} Yeni rekor!` : headline;
    resultPercentEl.textContent = percent;
    resultDetailEl.textContent = `Skorun: ${score}/${total} (${percent}%)`;
    const bestNow = getBest(activeCategory);
    if (isRecord) resultNoteEl.textContent = 'Yeni en iyi skorunu belirledin!';
    else if (bestNow) resultNoteEl.textContent = `En iyi skorun: ${bestNow.correct}/${bestNow.total}`;
    else resultNoteEl.textContent = 'Yeni rekor için tekrar dene!';

    choicesEl.innerHTML = '';
    cardEl.classList.add('hidden');
    resultCard.classList.remove('hidden');
    resultCard.classList.remove('fade-in');
    void resultCard.offsetWidth;
    resultCard.classList.add('fade-in');
  }

  // UI
  $('#restart').onclick = () => { openStartScreen(); };
  skipBtn.addEventListener('click', () => {
    if (!questions.length || i >= total) return;
    sWrong();
    next();
  });
  $('#share').onclick = async () => {
    const label = activeCategory ? ` (${activeCategory})` : '';
    const totalLabel = total || '?';
    const text = `Mini Quiz skor${label}: ${score}/${totalLabel} — dene: (bu sayfayı paylaş)`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { navigator.clipboard.writeText(text); alert('Skor panoya kopyalandı.'); }
  };
  playAgainBtn.addEventListener('click', () => {
    if (activeCategory) startQuiz(activeCategory);
    else openStartScreen();
  });
  backToCategoriesBtn.addEventListener('click', () => {
    openStartScreen();
  });

  // Keyboard shortcuts
  const choiceKeyMap = {
    Digit1: 0, Numpad1: 0,
    Digit2: 1, Numpad2: 1,
    Digit3: 2, Numpad3: 2,
    Digit4: 3, Numpad4: 3
  };

  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!startScreen.classList.contains('hidden')) return;

    const activeEl = document.activeElement;
    const activeTag = activeEl && activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea') return;
    const activeButton = activeTag === 'button' ? activeEl : null;

    if (!cardEl.classList.contains('hidden')) {
      if (!questions.length || i >= total) return;
      const mappedIndex = choiceKeyMap[event.code];
      if (typeof mappedIndex === 'number') {
        const buttons = Array.from(choicesEl.querySelectorAll('.choice'));
        if (mappedIndex < buttons.length) {
          const targetBtn = buttons[mappedIndex];
          if (targetBtn && !targetBtn.disabled) {
            targetBtn.click();
            event.preventDefault();
          }
        }
        return;
      }
      if (event.key === 'Enter') {
        if (activeButton) return;
        event.preventDefault();
        skipBtn.click();
      }
      return;
    }

    if (!resultCard.classList.contains('hidden') && event.key === 'Enter') {
      if (activeButton) return;
      event.preventDefault();
      playAgainBtn.click();
    }
  });

  resetStartScreen();
})();
