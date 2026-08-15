(function(){

  /* ===================== SUPABASE ===================== */
  const SUPABASE_URL = "https://tiuxbtoxftzggkshrvjh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ctAd8E2_ws7pJC5LiyPA5A_twSbXyx2";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ===================== STATE ===================== */
  const state = {
    userName: "",
    activeType: null,
    store: {
      tasks:  [],
      goals:  [],
      skills: []
    }
  };

  const config = {
    tasks:  { title:"Daftar Tugas",           subtitle:"Ketik tugas baru lalu tekan Enter untuk menyimpannya",  placeholder:"Cari atau ketik tugas baru (contoh: membuat UI/UX untuk web my-goals)...", emptyWord:"tugas" },
    goals:  { title:"Hal yang Ingin Dicapai",  subtitle:"Ketik target baru lalu tekan Enter untuk menyimpannya", placeholder:"Cari atau ketik target baru (contoh: lulus dengan predikat cumlaude)...", emptyWord:"target" },
    skills: { title:"Hal yang Ingin Dikuasai", subtitle:"Ketik skill baru lalu tekan Enter untuk menyimpannya",  placeholder:"Cari atau ketik skill baru (contoh: bisa javascript)...", emptyWord:"skill" }
  };

  const quotes = [
    "Langkah kecil hari ini adalah jarak besar menuju tujuanmu.",
    "Konsisten itu lebih kuat daripada motivasi sesaat.",
    "Kamu tidak harus cepat, kamu hanya perlu terus melangkah.",
    "Setiap centang di daftar ini adalah bukti kamu bertumbuh.",
    "Fokus pada progres, bukan kesempurnaan."
  ];

  let uid = 1;
  const newId = () => "id-" + (uid++) + "-" + Date.now().toString(36);

  /* ===================== ELEMENTS ===================== */
  const screens = {
    welcome:   document.getElementById('screen-welcome'),
    dashboard: document.getElementById('screen-dashboard'),
    detail:    document.getElementById('screen-detail')
  };

  const el = {
    inputEmail: document.getElementById('input-email'),
    inputPassword: document.getElementById('input-password'),
    loginError: document.getElementById('login-error'),
    btnStart: document.getElementById('btn-start'),
    btnLogout: document.getElementById('btn-logout'),
    userAvatar: document.getElementById('user-avatar'),
    userNameDisplay: document.getElementById('user-name-display'),
    quoteText: document.getElementById('quote-text'),
    quoteDots: document.getElementById('quote-dots'),
    cards: document.querySelectorAll('.goal-card'),
    btnBack: document.getElementById('btn-back'),
    detailTitle: document.getElementById('detail-title'),
    detailSubtitle: document.getElementById('detail-subtitle'),
    itemInput: document.getElementById('item-input'),
    itemList: document.getElementById('item-list')
  };

  function showScreen(name){
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ===================== WELCOME FLOW ===================== */
  function initials(name){
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if(parts.length === 0) return "?";
    if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async function startApp(){
    const email = el.inputEmail.value.trim();
    const password = el.inputPassword.value;
    el.loginError.textContent = "";

    if(!email || !password){
      el.loginError.textContent = "Email dan password wajib diisi.";
      return;
    }

    el.btnStart.disabled = true;
    el.btnStart.textContent = "Memproses...";

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    el.btnStart.disabled = false;
    el.btnStart.textContent = "Masuk";

    if(error){
      el.loginError.textContent = "Email atau password salah.";
      return;
    }

    const name = email.split('@')[0];
    state.userName = name;
    el.userNameDisplay.textContent = name;
    el.userAvatar.textContent = initials(name);

    await loadAllData();
    showScreen('dashboard');
    renderDashboardStats();
    startQuoteRotation();
  }

  el.btnStart.addEventListener('click', startApp);
  el.inputPassword.addEventListener('keydown', e => { if(e.key === 'Enter') startApp(); });
  el.inputEmail.addEventListener('keydown', e => { if(e.key === 'Enter') startApp(); });

  el.btnLogout.addEventListener('click', async () => {
    await sb.auth.signOut();
    state.store.tasks = [];
    state.store.goals = [];
    state.store.skills = [];
    el.inputEmail.value = "";
    el.inputPassword.value = "";
    if(quoteTimer) clearInterval(quoteTimer);
    showScreen('welcome');
  });

  async function loadAllData(){
    const [tasksRes, goalsRes, skillsRes] = await Promise.all([
      sb.from('tasks').select('*').order('created_at', { ascending:false }),
      sb.from('goals').select('*').order('created_at', { ascending:false }),
      sb.from('skills').select('*').order('created_at', { ascending:false })
    ]);
    state.store.tasks  = tasksRes.data  || [];
    state.store.goals  = goalsRes.data  || [];
    state.store.skills = skillsRes.data || [];
  }

  /* Auto-resume session if still logged in (e.g. after a page refresh) */
  (async () => {
    const { data } = await sb.auth.getSession();
    if(data && data.session){
      const email = data.session.user.email;
      const name = email.split('@')[0];
      state.userName = name;
      el.userNameDisplay.textContent = name;
      el.userAvatar.textContent = initials(name);
      await loadAllData();
      showScreen('dashboard');
      renderDashboardStats();
      startQuoteRotation();
    }
  })();

  /* ===================== QUOTE ROTATION ===================== */
  let quoteIndex = 0;
  let quoteTimer = null;

  function buildQuoteDots(){
    el.quoteDots.innerHTML = quotes.map((_,i) =>
      `<span class="quote-dot ${i===0?'active':''}" data-i="${i}"></span>`
    ).join('');
  }

  function setQuote(i){
    el.quoteText.classList.remove('show');
    setTimeout(() => {
      el.quoteText.textContent = quotes[i];
      el.quoteText.classList.add('show');
    }, 260);
    [...el.quoteDots.children].forEach((d, idx) => d.classList.toggle('active', idx === i));
  }

  function startQuoteRotation(){
    buildQuoteDots();
    el.quoteText.textContent = quotes[0];
    if(quoteTimer) clearInterval(quoteTimer);
    quoteTimer = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      setQuote(quoteIndex);
    }, 7000);
  }

  /* ===================== DASHBOARD CARDS ===================== */
  el.cards.forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.type));
  });

  function computeStats(type){
    const list = state.store[type];
    const total = list.length;
    const done = list.filter(i => i.done).length;
    const pct = total === 0 ? 0 : Math.round((done/total)*100);
    return {total, done, pct};
  }

  function renderDashboardStats(){
    ['tasks','goals','skills'].forEach(type => {
      const {total, done, pct} = computeStats(type);
      document.getElementById('progress-'+type).style.width = pct + '%';
      document.getElementById('pct-'+type).textContent = pct + '%';
      document.getElementById('meta-'+type).textContent =
        total === 0 ? 'Belum ada item' : (done + ' dari ' + total + ' selesai');
    });
  }

  /* ===================== DETAIL VIEW ===================== */
  function openDetail(type){
    state.activeType = type;
    const cfg = config[type];
    el.detailTitle.textContent = cfg.title;
    el.detailSubtitle.textContent = cfg.subtitle;
    el.itemInput.placeholder = cfg.placeholder;
    el.itemInput.value = "";
    showScreen('detail');
    renderList("");
    setTimeout(() => el.itemInput.focus(), 250);
  }

  el.btnBack.addEventListener('click', () => {
    renderDashboardStats();
    showScreen('dashboard');
  });

  function renderList(filter){
    const type = state.activeType;
    const cfg = config[type];
    const list = state.store[type];
    const query = filter.trim().toLowerCase();
    const visible = query ? list.filter(i => i.text.toLowerCase().includes(query)) : list;

    if(visible.length === 0){
      if(list.length === 0){
        el.itemList.innerHTML = `<div class="item-empty">Belum ada ${cfg.emptyWord}. Ketik di kotak atas lalu tekan <b>Enter</b> untuk menambahkan.</div>`;
      } else {
        el.itemList.innerHTML = `<div class="item-empty">Tidak ditemukan. Tekan <b>Enter</b> untuk menambahkan "${escapeHtml(filter.trim())}" sebagai ${cfg.emptyWord} baru.</div>`;
      }
      return;
    }

    el.itemList.innerHTML = visible.map(item => `
      <div class="item-row ${item.done ? 'done' : ''}" data-id="${item.id}">
        <button class="item-check" data-action="toggle" aria-label="Tandai selesai">
          <svg viewBox="0 0 24 24"><polyline points="4 12 9 18 20 6"></polyline></svg>
        </button>
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button class="item-remove" data-action="remove" aria-label="Hapus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      </div>
    `).join('');
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  el.itemInput.addEventListener('input', e => renderList(e.target.value));

  el.itemInput.addEventListener('keydown', async e => {
    if(e.key !== 'Enter') return;
    const text = el.itemInput.value.trim();
    if(!text) return;
    const type = state.activeType;
    const exists = state.store[type].some(i => i.text.toLowerCase() === text.toLowerCase());
    if(!exists){
      el.itemInput.disabled = true;
      const { data, error } = await sb.from(type).insert({ text, done:false }).select().single();
      el.itemInput.disabled = false;
      if(error){
        el.itemList.innerHTML = `<div class="item-empty">Gagal menyimpan: ${escapeHtml(error.message)}</div>`;
        return;
      }
      state.store[type].unshift(data);
    }
    el.itemInput.value = "";
    renderList("");
  });

  el.itemList.addEventListener('click', async e => {
    const actionBtn = e.target.closest('[data-action]');
    if(!actionBtn) return;
    const row = actionBtn.closest('.item-row');
    const id = row.dataset.id;
    const type = state.activeType;
    const list = state.store[type];
    const idx = list.findIndex(i => String(i.id) === String(id));
    if(idx === -1) return;

    if(actionBtn.dataset.action === 'toggle'){
      const newDone = !list[idx].done;
      list[idx].done = newDone;
      renderList(el.itemInput.value);
      const { error } = await sb.from(type).update({ done:newDone }).eq('id', id);
      if(error){ list[idx].done = !newDone; renderList(el.itemInput.value); }
    } else if(actionBtn.dataset.action === 'remove'){
      const removed = list[idx];
      list.splice(idx, 1);
      renderList(el.itemInput.value);
      const { error } = await sb.from(type).delete().eq('id', id);
      if(error){ list.splice(idx, 0, removed); renderList(el.itemInput.value); }
    }
  });

  /* ===================== ANIMATED / INTERACTIVE BACKGROUND ===================== */
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  const blobs = [];
  const BLOB_COUNT = 6;
  const mouse = { x: 0, y: 0 };
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const palette = [
    'rgba(47,191,159,0.10)',
    'rgba(47,191,159,0.07)',
    'rgba(21,34,56,0.05)',
    'rgba(43,59,87,0.05)'
  ];

  for(let i=0;i<BLOB_COUNT;i++){
    blobs.push({
      x: Math.random()*W,
      y: Math.random()*H,
      r: 120 + Math.random()*180,
      vx: (Math.random()-0.5)*0.15,
      vy: (Math.random()-0.5)*0.15,
      color: palette[i % palette.length]
    });
  }

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  });

  function tick(){
    ctx.clearRect(0,0,W,H);
    blobs.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if(b.x < -b.r) b.x = W + b.r;
      if(b.x > W + b.r) b.x = -b.r;
      if(b.y < -b.r) b.y = H + b.r;
      if(b.y > H + b.r) b.y = -b.r;

      const dx = (mouse.x - b.x) * 0.0025;
      const dy = (mouse.y - b.y) * 0.0025;

      const grad = ctx.createRadialGradient(b.x+dx*20, b.y+dy*20, 0, b.x+dx*20, b.y+dy*20, b.r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x+dx*20, b.y+dy*20, b.r, 0, Math.PI*2);
      ctx.fill();
    });
    if(!prefersReducedMotion) requestAnimationFrame(tick);
  }
  tick();

})();
