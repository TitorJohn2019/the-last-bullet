/* ============================================================
   APP.JS — Auth + i18n + Dynamic Chapter Loader
   "Yağmurda Kalan Tek Kurşun"
   ============================================================ */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  const CONFIG = {
    totalChapters: 30,
    availableChapters: 2,
    chaptersPath: './chapters',
    defaultChapter: 1,
    defaultLang: 'tr',
    supportedLangs: ['tr', 'en', 'ru'],
    validPasscodes: ['TurkSaw', 'Asklepios', 'Alparslan'],
    sessionKey: 'chaos_auth',
    langKey: 'chaos_lang',
    scrollTopOnNav: true,
  };

  // ── i18n Dictionary ────────────────────────────────────────
  const I18N = {
    tr: {
      // Gatekeeper
      gatekeeperSubtitle: 'Bu hikâyeye erişim için şifreyi girin.',
      gatekeeperPlaceholder: 'Şifre giriniz...',
      gatekeeperBtn: 'GİRİŞ',
      gatekeeperError: 'Geçersiz şifre.',
      gatekeeperFooter: '© 2026 · KAOS HİKAYELERİ',
      // Header
      brandTitle: 'Yağmurda Kalan <span>Tek Kurşun</span>',
      // Sidebar
      sidebarLabel: 'Seri Hikaye',
      sidebarStoryTitle: 'Yağmurda Kalan Tek Kurşun',
      sidebarFooter: '© 2026 · Kaos Hikayeleri',
      // Navigation
      prevChapter: 'Önceki Bölüm',
      nextChapter: 'Sonraki Bölüm',
      // Chapter rendering
      chapterLabel: 'Bölüm',
      comingSoon: 'Yakında...',
      // Loading / Error
      loading: 'Yükleniyor...',
      errorTitle: 'Bölüm Bulunamadı',
      errorMessage: 'henüz yayınlanmamış veya bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
      // Footer
      footer: '© 2026 · <span>Kaos Hikayeleri</span> · Tüm Hakları Saklıdır',
      // Page title template
      pageTitle: 'Bölüm {id}: {title} | Yağmurda Kalan Tek Kurşun',
    },
    en: {
      gatekeeperSubtitle: 'Enter the passcode to access this story.',
      gatekeeperPlaceholder: 'Enter passcode...',
      gatekeeperBtn: 'ENTER',
      gatekeeperError: 'Invalid passcode.',
      gatekeeperFooter: '© 2026 · CHAOS STORIES',
      brandTitle: 'The Last Bullet <span>in the Rain</span>',
      sidebarLabel: 'Serial Story',
      sidebarStoryTitle: 'The Last Bullet in the Rain',
      sidebarFooter: '© 2026 · Chaos Stories',
      prevChapter: 'Previous Chapter',
      nextChapter: 'Next Chapter',
      chapterLabel: 'Chapter',
      comingSoon: 'Coming Soon...',
      loading: 'Loading...',
      errorTitle: 'Chapter Not Found',
      errorMessage: 'has not been published yet or an error occurred. Please try again later.',
      footer: '© 2026 · <span>Chaos Stories</span> · All Rights Reserved',
      pageTitle: 'Chapter {id}: {title} | The Last Bullet in the Rain',
    },
    ru: {
      gatekeeperSubtitle: 'Введите пароль для доступа к этой истории.',
      gatekeeperPlaceholder: 'Введите пароль...',
      gatekeeperBtn: 'ВОЙТИ',
      gatekeeperError: 'Неверный пароль.',
      gatekeeperFooter: '© 2026 · ИСТОРИИ ХАОСА',
      brandTitle: 'Последняя Пуля <span>Под Дождём</span>',
      sidebarLabel: 'Серийная История',
      sidebarStoryTitle: 'Последняя Пуля Под Дождём',
      sidebarFooter: '© 2026 · Истории Хаоса',
      prevChapter: 'Предыдущая Глава',
      nextChapter: 'Следующая Глава',
      chapterLabel: 'Глава',
      comingSoon: 'Скоро...',
      loading: 'Загрузка...',
      errorTitle: 'Глава Не Найдена',
      errorMessage: 'ещё не опубликована или произошла ошибка. Попробуйте позже.',
      footer: '© 2026 · <span>Истории Хаоса</span> · Все Права Защищены',
      pageTitle: 'Глава {id}: {title} | Последняя Пуля Под Дождём',
    },
  };

  // Chapter titles per language
  const CHAPTER_TITLES = {
    tr: { 1: 'Geçmişin Gölgeleri ve Neon Işıkları', 2: 'Kuklacının İpleri ve Kara Maske' },
    en: { 1: 'Shadows of the Past and Neon Lights', 2: 'Strings of the Puppeteer and the Black Mask' },
    ru: { 1: 'Тени прошлого и неоновые огни', 2: 'Нити Кукловода и Чёрная Маска' },
  };

  // ── State ──────────────────────────────────────────────────
  let currentChapter = CONFIG.defaultChapter;
  let currentLang = CONFIG.defaultLang;
  let isLoading = false;
  let isAuthenticated = false;

  // ── DOM References ─────────────────────────────────────────
  // Filled after DOMContentLoaded
  let dom = {};

  // ── Helpers ────────────────────────────────────────────────
  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.tr[key] || key;
  }

  function getChapterTitle(chapter) {
    const titles = CHAPTER_TITLES[currentLang] || CHAPTER_TITLES.tr;
    return titles[chapter] || t('comingSoon');
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ══════════════════════════════════════════════════════════
  //  AUTHENTICATION
  // ══════════════════════════════════════════════════════════
  function checkAuth() {
    return sessionStorage.getItem(CONFIG.sessionKey) === 'true';
  }

  function setAuth() {
    sessionStorage.setItem(CONFIG.sessionKey, 'true');
  }

  function initGatekeeper() {
    if (checkAuth()) {
      unlockApp();
      return;
    }

    // Show gatekeeper
    dom.gatekeeper.style.display = '';
    dom.appShell.style.display = 'none';

    // Focus input
    setTimeout(() => dom.gatekeeperInput.focus(), 300);

    // Form submit
    dom.gatekeeperForm.addEventListener('submit', handleLogin);

    // Login-screen language buttons
    dom.gatekeeper.querySelectorAll('.gatekeeper__lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        switchLanguage(lang);

        // Update active state
        dom.gatekeeper.querySelectorAll('.gatekeeper__lang-btn').forEach((b) =>
          b.classList.toggle('active', b.dataset.lang === lang)
        );
      });
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    const value = dom.gatekeeperInput.value.trim();

    if (CONFIG.validPasscodes.includes(value)) {
      setAuth();
      dom.gatekeeperError.classList.remove('visible');
      dom.gatekeeper.classList.add('fade-out');

      setTimeout(() => {
        unlockApp();
      }, 600);
    } else {
      // Show error + shake
      dom.gatekeeperError.classList.add('visible');
      dom.gatekeeperInputWrapper.classList.add('shake');
      dom.gatekeeperInput.value = '';
      dom.gatekeeperInput.focus();

      setTimeout(() => {
        dom.gatekeeperInputWrapper.classList.remove('shake');
      }, 500);
    }
  }

  function unlockApp() {
    dom.gatekeeper.style.display = 'none';
    dom.appShell.style.display = '';
    initApp();
  }

  // ══════════════════════════════════════════════════════════
  //  LANGUAGE SYSTEM
  // ══════════════════════════════════════════════════════════
  function loadSavedLanguage() {
    const saved = localStorage.getItem(CONFIG.langKey);
    if (saved && CONFIG.supportedLangs.includes(saved)) {
      currentLang = saved;
    }
  }

  function switchLanguage(lang) {
    if (!CONFIG.supportedLangs.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(CONFIG.langKey, lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang === 'tr' ? 'tr' : lang === 'ru' ? 'ru' : 'en';

    // Update gatekeeper texts (if visible)
    updateGatekeeperTexts();

    // Update all app UI texts
    updateAllUITexts();

    // Update language switcher active states (both gatekeeper + header)
    updateLangSwitcherStates();

    // If app is unlocked and chapter is loaded, reload chapter in new language
    if (isAuthenticated && currentChapter) {
      rebuildChapterList();
      loadChapter(currentChapter);
    }
  }

  function updateGatekeeperTexts() {
    const subtitle = document.getElementById('gatekeeper-subtitle');
    const input = document.getElementById('gatekeeper-input');
    const btnText = document.getElementById('gatekeeper-btn-text');
    const error = document.getElementById('gatekeeper-error');

    if (subtitle) subtitle.textContent = t('gatekeeperSubtitle');
    if (input) input.placeholder = t('gatekeeperPlaceholder');
    if (btnText) btnText.textContent = t('gatekeeperBtn');
    if (error) error.textContent = t('gatekeeperError');
  }

  function updateAllUITexts() {
    // Header brand
    if (dom.headerBrandTitle) dom.headerBrandTitle.innerHTML = t('brandTitle');

    // Sidebar
    if (dom.sidebarLabel) dom.sidebarLabel.textContent = t('sidebarLabel');
    if (dom.sidebarStoryTitle) dom.sidebarStoryTitle.textContent = t('sidebarStoryTitle');
    if (dom.sidebarFooterText) dom.sidebarFooterText.textContent = t('sidebarFooter');

    // Nav buttons
    if (dom.navPrevText) dom.navPrevText.textContent = t('prevChapter');
    if (dom.navNextText) dom.navNextText.textContent = t('nextChapter');

    // Footer
    if (dom.siteFooterText) dom.siteFooterText.innerHTML = t('footer');

    // Lang switcher current label
    if (dom.langCurrent) dom.langCurrent.textContent = currentLang.toUpperCase();

    // Header indicator
    updateHeaderIndicator();
  }

  function updateLangSwitcherStates() {
    // Header dropdown
    document.querySelectorAll('.lang-switcher__option').forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.lang === currentLang);
    });

    // Gatekeeper buttons
    document.querySelectorAll('.gatekeeper__lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  APP INITIALIZATION
  // ══════════════════════════════════════════════════════════
  function initApp() {
    isAuthenticated = true;

    // Cache DOM elements for the app shell
    dom.readingArea = document.getElementById('reading-area');
    dom.chapterList = document.getElementById('chapter-list');
    dom.sidebar = document.getElementById('sidebar');
    dom.sidebarOverlay = document.getElementById('sidebar-overlay');
    dom.menuToggle = document.getElementById('menu-toggle');
    dom.prevBtn = document.getElementById('nav-prev');
    dom.nextBtn = document.getElementById('nav-next');
    dom.headerIndicator = document.getElementById('header-chapter-indicator');
    dom.headerBrandTitle = document.getElementById('header-brand-title');
    dom.sidebarLabel = document.getElementById('sidebar-label');
    dom.sidebarStoryTitle = document.getElementById('sidebar-story-title');
    dom.sidebarFooterText = document.getElementById('sidebar-footer-text');
    dom.navPrevText = document.getElementById('nav-prev-text');
    dom.navNextText = document.getElementById('nav-next-text');
    dom.siteFooterText = document.getElementById('site-footer-text');
    dom.langCurrent = document.getElementById('lang-current');
    dom.langToggle = document.getElementById('lang-toggle');
    dom.langDropdown = document.getElementById('lang-dropdown');

    buildChapterList();
    bindEvents();
    updateAllUITexts();
    loadChapterFromHash();
  }

  // ── Build Sidebar Chapter List ─────────────────────────────
  function buildChapterList() {
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= CONFIG.totalChapters; i++) {
      const li = document.createElement('li');
      li.className = 'sidebar__chapter-item';

      const link = document.createElement('a');
      link.className = 'sidebar__chapter-link';
      link.dataset.chapter = i;

      const num = document.createElement('span');
      num.className = 'sidebar__chapter-num';
      num.textContent = String(i).padStart(2, '0');

      const title = document.createElement('span');
      const chapterTitle = getChapterTitle(i);

      if (i > CONFIG.availableChapters) {
        link.classList.add('locked');
        title.textContent = `${t('chapterLabel')} ${i}`;
      } else {
        link.href = `#chapter-${i}`;
        title.textContent = chapterTitle;
      }

      link.appendChild(num);
      link.appendChild(title);
      li.appendChild(link);
      fragment.appendChild(li);
    }

    dom.chapterList.innerHTML = '';
    dom.chapterList.appendChild(fragment);
  }

  function rebuildChapterList() {
    buildChapterList();
    updateSidebarActive();
  }

  // ── Event Bindings ─────────────────────────────────────────
  function bindEvents() {
    // Menu toggle
    dom.menuToggle.addEventListener('click', toggleSidebar);
    dom.sidebarOverlay.addEventListener('click', closeSidebar);

    // Chapter links (delegated)
    dom.chapterList.addEventListener('click', (e) => {
      const link = e.target.closest('.sidebar__chapter-link');
      if (!link || link.classList.contains('locked')) return;
      e.preventDefault();
      const chapter = parseInt(link.dataset.chapter, 10);
      navigateToChapter(chapter);
      closeSidebar();
    });

    // Nav buttons
    dom.prevBtn.addEventListener('click', () => navigateToChapter(currentChapter - 1));
    dom.nextBtn.addEventListener('click', () => navigateToChapter(currentChapter + 1));

    // Hash change
    window.addEventListener('hashchange', loadChapterFromHash);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Don't intercept when typing in an input
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft' && currentChapter > 1) {
        navigateToChapter(currentChapter - 1);
      } else if (e.key === 'ArrowRight' && currentChapter < CONFIG.availableChapters) {
        navigateToChapter(currentChapter + 1);
      } else if (e.key === 'Escape') {
        closeSidebar();
        closeLangDropdown();
      }
    });

    // Language switcher toggle
    dom.langToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.langDropdown.classList.toggle('open');
    });

    // Language options
    dom.langDropdown.querySelectorAll('.lang-switcher__option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const lang = opt.dataset.lang;
        switchLanguage(lang);
        closeLangDropdown();
      });
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lang-switcher')) {
        closeLangDropdown();
      }
    });
  }

  function closeLangDropdown() {
    if (dom.langDropdown) dom.langDropdown.classList.remove('open');
  }

  // ── Sidebar Control ────────────────────────────────────────
  function toggleSidebar() {
    dom.sidebar.classList.toggle('active');
    dom.sidebarOverlay.classList.toggle('active');
    dom.menuToggle.classList.toggle('active');
    document.body.style.overflow = dom.sidebar.classList.contains('active') ? 'hidden' : '';
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('active');
    dom.sidebarOverlay.classList.remove('active');
    dom.menuToggle.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ── Navigation ─────────────────────────────────────────────
  function navigateToChapter(chapter) {
    if (chapter < 1 || chapter > CONFIG.availableChapters || isLoading) return;
    window.location.hash = `chapter-${chapter}`;
  }

  function loadChapterFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/^#chapter-(\d+)$/);
    let chapter = match ? parseInt(match[1], 10) : CONFIG.defaultChapter;

    chapter = Math.max(1, Math.min(chapter, CONFIG.availableChapters));

    if (!match) {
      window.location.hash = `chapter-${chapter}`;
      return;
    }

    loadChapter(chapter);
  }

  // ── Chapter Loading (language-aware) ───────────────────────
  async function loadChapter(chapter) {
    if (isLoading) return;
    isLoading = true;
    currentChapter = chapter;

    dom.readingArea.classList.add('fade-out');
    await delay(250);

    showLoading();
    updateNavState();
    updateSidebarActive();
    updateHeaderIndicator();

    try {
      // Fetch from language-specific path: ./chapters/{lang}/chapter-{n}.json
      const url = `${CONFIG.chaptersPath}/${currentLang}/chapter-${chapter}.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      renderChapter(data);
    } catch (error) {
      console.error('Chapter load failed:', error);
      showError(chapter);
    } finally {
      isLoading = false;
      if (CONFIG.scrollTopOnNav) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  // ── Render Chapter ─────────────────────────────────────────
  function renderChapter(data) {
    const html = [];

    // Chapter header
    html.push(`
      <div class="chapter-header">
        <span class="chapter-number">${t('chapterLabel')} ${data.id}</span>
        <h1 class="chapter-title">${data.title}</h1>
      </div>
    `);

    // Sections
    data.sections.forEach((section, sIndex) => {
      html.push(`<section class="story-section">`);

      if (section.location) {
        html.push(`<div class="location-tag">${section.location}</div>`);
      }

      section.paragraphs.forEach((para) => {
        if (para.type === 'dialogue') {
          const variant = para.variant === 'intense' ? ' intense' : '';
          html.push(`<div class="story-dialogue${variant}">${para.text}</div>`);
        } else {
          html.push(`<p class="story-paragraph">${para.text}</p>`);
        }
      });

      html.push(`</section>`);

      if (sIndex < data.sections.length - 1) {
        html.push(`<div class="section-divider">• • •</div>`);
      }
    });

    dom.readingArea.innerHTML = html.join('');
    dom.readingArea.classList.remove('fade-out');
    dom.readingArea.classList.add('fade-in');

    setTimeout(() => dom.readingArea.classList.remove('fade-in'), 600);

    // Update page title with i18n template
    document.title = t('pageTitle')
      .replace('{id}', data.id)
      .replace('{title}', data.title);
  }

  // ── UI State Updates ───────────────────────────────────────
  function updateNavState() {
    if (currentChapter <= 1) {
      dom.prevBtn.classList.add('disabled');
      dom.prevBtn.setAttribute('disabled', 'true');
    } else {
      dom.prevBtn.classList.remove('disabled');
      dom.prevBtn.removeAttribute('disabled');
    }

    if (currentChapter >= CONFIG.availableChapters) {
      dom.nextBtn.classList.add('disabled');
      dom.nextBtn.setAttribute('disabled', 'true');
    } else {
      dom.nextBtn.classList.remove('disabled');
      dom.nextBtn.removeAttribute('disabled');
    }
  }

  function updateSidebarActive() {
    if (!dom.chapterList) return;
    const links = dom.chapterList.querySelectorAll('.sidebar__chapter-link');
    links.forEach((link) => {
      const ch = parseInt(link.dataset.chapter, 10);
      link.classList.toggle('active', ch === currentChapter);
    });
  }

  function updateHeaderIndicator() {
    if (!dom.headerIndicator) return;
    const title = getChapterTitle(currentChapter);
    dom.headerIndicator.textContent = `${String(currentChapter).padStart(2, '0')} — ${title}`;
  }

  // ── Loading & Error States ─────────────────────────────────
  function showLoading() {
    dom.readingArea.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">${t('loading')}</span>
      </div>
    `;
  }

  function showError(chapter) {
    dom.readingArea.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠</div>
        <h2 class="error-title">${t('errorTitle')}</h2>
        <p class="error-message">
          ${t('chapterLabel')} ${chapter} ${t('errorMessage')}
        </p>
      </div>
    `;
    dom.readingArea.classList.remove('fade-out');
    dom.readingArea.classList.add('fade-in');
  }

  // ══════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════
  function boot() {
    // Cache gatekeeper DOM elements
    dom.gatekeeper = document.getElementById('gatekeeper');
    dom.appShell = document.getElementById('app-shell');
    dom.gatekeeperForm = document.getElementById('gatekeeper-form');
    dom.gatekeeperInput = document.getElementById('gatekeeper-input');
    dom.gatekeeperInputWrapper = document.getElementById('gatekeeper-input-wrapper');
    dom.gatekeeperError = document.getElementById('gatekeeper-error');

    // Load saved language preference before anything renders
    loadSavedLanguage();

    // Apply language to gatekeeper immediately
    updateGatekeeperTexts();
    updateLangSwitcherStates();

    // Start authentication flow
    initGatekeeper();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
