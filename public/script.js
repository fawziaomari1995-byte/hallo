const loginPanel = document.getElementById('loginPanel');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const appPanel = document.getElementById('appPanel');

const showFatalError = (message) => {
  const splash = document.getElementById('appSplash');
  if (!splash) return;
  splash.innerHTML = `
    <div class="splash-card">
      <div class="splash-logo">خطأ</div>
      <h1>حدث خطأ أثناء تحميل التطبيق</h1>
      <p>${message}</p>
      <p>حاول تحديث الصفحة أو أعد تشغيل المتصفح.</p>
    </div>
  `;
  splash.classList.remove('hidden');
};

window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error || event.message);
  showFatalError(event.error?.message || event.message || 'حدث خطأ غير معروف');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showFatalError(event.reason?.message || event.reason || 'Promise rejection غير معالجة');
});
const welcomeMessage = document.getElementById('welcomeMessage');
const roleMessage = document.getElementById('roleMessage');
const logoutButton = document.getElementById('logoutButton');
const eventsList = document.getElementById('eventsList');
const eventCount = document.getElementById('eventCount');
const eventForm = document.getElementById('eventForm');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const formTitle = document.querySelector('.panel-highlight h2');
const submitButton = document.getElementById('submitButton');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const mediaPreviewContainer = document.getElementById('mediaPreviewContainer');
const videoUrlInput = document.getElementById('videoUrl');
const adminPanel = document.getElementById('adminPanel');
const usersTableBody = document.getElementById('usersTableBody');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const createUserForm = document.getElementById('createUserForm');
const adminUsernameInput = document.getElementById('adminUsername');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const adminRoleSelect = document.getElementById('adminRole');
const adminActivateCheckbox = document.getElementById('adminActivate');
const createUserMessage = document.getElementById('createUserMessage');
const usersMessage = document.getElementById('usersMessage');
const registerPanel = document.getElementById('registerPanel');
const registerForm = document.getElementById('registerForm');
const regUsernameInput = document.getElementById('regUsername');
const regEmailInput = document.getElementById('regEmail');
const regPasswordInput = document.getElementById('regPassword');
const registerError = document.getElementById('registerError');
const resendPanel = document.getElementById('resendPanel');
const resendForm = document.getElementById('resendForm');
const resendEmailInput = document.getElementById('resendEmail');
const resendError = document.getElementById('resendError');
const forgotPanel = document.getElementById('forgotPanel');
const forgotForm = document.getElementById('forgotForm');
const forgotEmailInput = document.getElementById('forgotEmail');
const forgotError = document.getElementById('forgotError');
const showRegisterLink = document.getElementById('showRegisterLink');
const showLoginLink = document.getElementById('showLoginLink');
const showResendLink = document.getElementById('showResendLink');
const showLoginLink2 = document.getElementById('showLoginLink2');
const showForgotLink = document.getElementById('showForgotLink');
const showLoginLink3 = document.getElementById('showLoginLink3');
const installButton = document.getElementById('installButton');
let deferredInstallPrompt = null;

// Search and Filter Elements
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const categoryFilter = document.getElementById('categoryFilter');
const dateFilter = document.getElementById('dateFilter');
const districtFilter = document.getElementById('districtFilter');
const budgetFilter = document.getElementById('budgetFilter');
const attendanceFilter = document.getElementById('attendanceFilter');
const showArchived = document.getElementById('showArchived');
const weeklyEvents = document.getElementById('weeklyEvents');
const trendingEvents = document.getElementById('trendingEvents');

// Theme Elements
const themeToggle = document.getElementById('themeToggle');
const notificationToggle = document.getElementById('notificationToggle');
const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
const notificationModal = document.getElementById('notificationModal');
const enableNotificationsCheckbox = document.getElementById('enableNotifications');
const upcomingEventsNotificationsCheckbox = document.getElementById('upcomingEventsNotifications');
const newEventsNotificationsCheckbox = document.getElementById('newEventsNotifications');
const closeNotificationModalBtn = document.getElementById('closeNotificationModal');
const saveNotificationSettingsBtn = document.getElementById('saveNotificationSettings');
const cancelNotificationSettingsBtn = document.getElementById('cancelNotificationSettings');
const mapModal = document.getElementById('mapModal');
const geocodeBtn = document.getElementById('geocodeBtn');
const ticketModal = document.getElementById('ticketModal');
const ticketModalTitle = document.getElementById('ticketModalTitle');
const ticketEventInfo = document.getElementById('ticketEventInfo');
const isVirtualTicketCheckbox = document.getElementById('isVirtualTicket');
const streamDetails = document.getElementById('streamDetails');
const streamUrlInput = document.getElementById('streamUrlInput');
const seatMapContainer = document.getElementById('seatMapContainer');
const ticketPriceInput = document.getElementById('ticketPriceInput');
const reserveTicketBtn = document.getElementById('reserveTicketBtn');
const cancelTicketBtn = document.getElementById('cancelTicketBtn');
const closeTicketModal = document.getElementById('closeTicketModal');
const ticketResult = document.getElementById('ticketResult');

let currentTicketEvent = null;
let currentTicketSeatMap = null;
let selectedSeatInfo = { seatCategory: null, seatNumber: null };
let analyticsIntervalId = null;

const analyticsTicketsSold = document.getElementById('analyticsTicketsSold');
const analyticsRevenue = document.getElementById('analyticsRevenue');
const analyticsVirtualTickets = document.getElementById('analyticsVirtualTickets');
const analyticsSeatTickets = document.getElementById('analyticsSeatTickets');
const revenueTimelineChart = document.getElementById('revenueTimelineChart');
const ticketTypeChart = document.getElementById('ticketTypeChart');
const attendanceRatioChart = document.getElementById('attendanceRatioChart');
const topEventsList = document.getElementById('topEventsList');

// View Toggle Elements
const gridViewBtn = document.getElementById('gridViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn');
const calendarContainer = document.getElementById('calendarView');

// Calendar Elements
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const calendarTitle = document.getElementById('calendarTitle');
const calendarDays = document.getElementById('calendarDays');

// Mobile Navigation Elements
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

let editingId = null;
let currentRole = null;
let currentUser = null;
let authToken = null;
let map = null;
let marker = null;
let currentLatLng = null;
let currentView = 'grid'; // Default view is grid
let allEvents = []; // Store all events for filtering
let removedMediaIds = [];
let commentPageState = {};
let adminUsers = [];
let notificationsEnabled = false;
let upcomingEventsNotificationsEnabled = false;
let newEventsNotificationsEnabled = false;
let knownEventIds = new Set();
let notificationCheckIntervalId = null;

const attendanceStatusLabels = {
  attending: 'سأحضر',
  maybe: 'ربما',
  declined: 'غير مهتم'
};

const formatDate = (value) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

let ticketModalEventId = null;

const openTicketModal = async (eventId, defaultVirtual = false) => {
  ticketModalEventId = eventId;
  ticketResult.innerHTML = '';
  ticketModalTitle.textContent = 'حجز التذكرة';
  ticketEventInfo.textContent = 'جارٍ تحميل بيانات التذكرة...';
  selectedSeatInfo = { seatCategory: null, seatNumber: null };
  isVirtualTicketCheckbox.checked = defaultVirtual;
  streamUrlInput.value = '';
  seatMapContainer.innerHTML = 'جارٍ تحميل مخطط المقاعد...';
  ticketPriceInput.value = '';
  streamDetails.classList.toggle('hidden', !defaultVirtual);

  if (ticketModal) {
    ticketModal.classList.remove('hidden');
  }

  try {
    const response = await fetchWithAuth(`/api/events/${eventId}/seat-map`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل تحميل مخطط المقاعد');
    }
    const data = await response.json();
    currentTicketEvent = data.event;
    currentTicketSeatMap = data.seatMap;
    ticketEventInfo.textContent = `${currentTicketEvent.title} ${currentTicketEvent.isHybrid ? '(البث المباشر متاح)' : ''}`;
    streamUrlInput.value = currentTicketEvent.streamUrl || '';
    updateTicketModalInputs();
    renderSeatMap();
  } catch (err) {
    ticketEventInfo.textContent = '';
    ticketResult.innerHTML = `<p class="error-text">${err.message}</p>`;
    console.error(err);
  }
};

const closeTicketModalHandler = () => {
  if (ticketModal) {
    ticketModal.classList.add('hidden');
  }
  currentTicketEvent = null;
  currentTicketSeatMap = null;
  selectedSeatInfo = { seatCategory: null, seatNumber: null };
  ticketResult.innerHTML = '';
};

const updateTicketModalInputs = () => {
  const isVirtual = isVirtualTicketCheckbox.checked;
  streamDetails.classList.toggle('hidden', !isVirtual);
  seatMapContainer.classList.toggle('hidden', isVirtual);
  if (currentTicketEvent) {
    ticketPriceInput.value = isVirtual ? (currentTicketEvent.virtualPriceCents || 1500) : (currentTicketSeatMap?.categories?.[0]?.priceCents || 3000);
  }
};

const renderSeatMap = () => {
  if (!currentTicketSeatMap || !currentTicketSeatMap.categories) {
    seatMapContainer.innerHTML = '<p>لا يوجد مخطط مقاعد متاح حالياً.</p>';
    return;
  }

  seatMapContainer.innerHTML = currentTicketSeatMap.categories.map((category) => `
    <div class="seat-category">
      <h4>${category.label} — السعر ${category.priceCents} cents</h4>
      <div class="seat-grid">
        ${category.seats.map((seat) => `
          <button type="button" class="seat ${seat.reserved ? 'reserved' : ''} ${selectedSeatInfo.seatCategory === category.id && selectedSeatInfo.seatNumber === seat.number ? 'selected' : ''}" data-category="${category.id}" data-number="${seat.number}" ${seat.reserved ? 'disabled' : ''}>
            ${seat.number}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
};

const selectSeat = (categoryId, seatNumber) => {
  selectedSeatInfo = { seatCategory: categoryId, seatNumber };
  currentTicketSeatMap.categories.forEach((category) => {
    category.seats.forEach((seat) => {
      const button = seatMapContainer.querySelector(`button[data-category="${category.id}"][data-number="${seat.number}"]`);
      if (button) {
        button.classList.toggle('selected', category.id === categoryId && seat.number === seatNumber);
      }
    });
  });
  const category = currentTicketSeatMap.categories.find((item) => item.id === categoryId);
  ticketPriceInput.value = category ? category.priceCents : ticketPriceInput.value;
};

const reserveTicket = async () => {
  if (!currentTicketEvent) {
    return;
  }

  const isVirtual = isVirtualTicketCheckbox.checked;
  if (isVirtual && !currentTicketEvent.isHybrid) {
    ticketResult.innerHTML = '<p class="error-text">هذه الفعالية لا تدعم البث المباشر.</p>';
    return;
  }

  if (!isVirtual && (!selectedSeatInfo.seatCategory || !selectedSeatInfo.seatNumber)) {
    ticketResult.innerHTML = '<p class="error-text">اختر مقعداً قبل التأكيد.</p>';
    return;
  }

  try {
    const response = await fetchWithAuth(`/api/events/${ticketModalEventId}/tickets`, {
      method: 'POST',
      body: JSON.stringify({
        seatCategory: selectedSeatInfo.seatCategory,
        seatNumber: selectedSeatInfo.seatNumber,
        isVirtual,
        priceCents: Number(ticketPriceInput.value),
        email: currentUser || ''
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل حجز التذكرة');
    }

    ticketResult.innerHTML = `
      <p>تم حجز التذكرة بنجاح! رمز التذكرة: <strong>${data.ticketCode}</strong></p>
      <p><a href="${data.qrUrl}" target="_blank">عرض رمز QR</a> · <a href="${data.pdfUrl}" target="_blank">تحميل التذكرة بصيغة PDF</a></p>
    `;
    if (!isVirtual) {
      currentTicketSeatMap.categories.forEach((category) => {
        category.seats = category.seats.map((seat) => {
          if (category.id === selectedSeatInfo.seatCategory && seat.number === selectedSeatInfo.seatNumber) {
            return { ...seat, reserved: true };
          }
          return seat;
        });
      });
      renderSeatMap();
    }
  } catch (error) {
    ticketResult.innerHTML = `<p class="error-text">${error.message}</p>`;
    console.error(error);
  }
};

const saveSession = () => {
  localStorage.setItem('eventAppSession', JSON.stringify({ authToken, currentRole, currentUser }));
};

const formatCurrency = (cents) => {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('ar-EG').format(Number(value || 0));
};

const renderBarChart = (container, items) => {
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="muted-text">لا توجد بيانات كافية للعرض.</p>';
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value)) || 1;
  items.forEach((item) => {
    const percent = Math.round((item.value / maxValue) * 100);
    const chartBar = document.createElement('div');
    chartBar.className = 'chart-bar';
    chartBar.innerHTML = `
      <div class="chart-bar-label">
        <span>${escapeHtml(item.label)}</span>
        <span>${escapeHtml(item.subtitle)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width: ${percent}%;"></div></div>
    `;
    container.appendChild(chartBar);
  });
};

const renderTopEvents = (events) => {
  if (!topEventsList) return;
  topEventsList.innerHTML = '';
  if (!events || events.length === 0) {
    topEventsList.innerHTML = '<p class="muted-text">لا توجد فعاليات مباعة حالياً.</p>';
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('div');
    item.className = 'top-event-item';
    item.innerHTML = `
      <span>${escapeHtml(event.title)}</span>
      <span>${formatCurrency(event.revenueCents)}</span>
    `;
    topEventsList.appendChild(item);
  });
};

const renderAdminAnalytics = (data) => {
  if (analyticsTicketsSold) analyticsTicketsSold.textContent = formatNumber(data.totalTicketsSold);
  if (analyticsRevenue) analyticsRevenue.textContent = formatCurrency(data.totalRevenueCents);
  if (analyticsVirtualTickets) analyticsVirtualTickets.textContent = formatNumber(data.totalVirtualTickets);
  if (analyticsSeatTickets) analyticsSeatTickets.textContent = formatNumber(data.totalSeatTickets);

  renderBarChart(revenueTimelineChart, data.revenueTimeline.map((item) => ({
    label: item.day,
    value: item.revenueCents,
    subtitle: formatCurrency(item.revenueCents)
  })));

  renderBarChart(ticketTypeChart, data.ticketTypeBreakdown.map((item) => ({
    label: item.ticketType,
    value: item.count,
    subtitle: `${formatNumber(item.count)} تذاكر`
  })));

  renderBarChart(attendanceRatioChart, data.attendanceOverview.map((item) => ({
    label: item.status,
    value: item.count,
    subtitle: `${formatNumber(item.count)} حالة`
  })));

  renderTopEvents(data.topEvents);
};

const loadAnalytics = async () => {
  if (currentRole !== 'admin') return;

  try {
    const response = await fetchWithAuth('/api/admin/analytics');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل تحميل تحليلات المنظمين');
    }
    const data = await response.json();
    renderAdminAnalytics(data);
  } catch (error) {
    console.error('Analytics load failed:', error);
  }
};

const startAnalyticsPolling = () => {
  if (analyticsIntervalId) clearInterval(analyticsIntervalId);
  analyticsIntervalId = setInterval(loadAnalytics, 30000);
};

const stopAnalyticsPolling = () => {
  if (analyticsIntervalId) {
    clearInterval(analyticsIntervalId);
    analyticsIntervalId = null;
  }
};

const loadSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem('eventAppSession') || 'null');
    if (session?.authToken && session?.currentRole && session?.currentUser) {
      authToken = session.authToken;
      currentRole = session.currentRole;
      currentUser = session.currentUser;
      return true;
    }
  } catch (error) {
    console.error(error);
  }
  return false;
};

const clearSession = () => {
  authToken = null;
  currentRole = null;
  currentUser = null;
  localStorage.removeItem('eventAppSession');
};

// Theme functions
const getCurrentTheme = () => localStorage.getItem('theme') || 'light';
const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.title = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع المظلم';
};

const toggleTheme = () => {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
};

// Notification functions
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

const showNotification = (title, body, icon = '/favicon.ico') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
};

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }
};

const showInstallButton = () => {
  if (installButton) {
    installButton.classList.remove('hidden');
  }
};

const hideInstallButton = () => {
  if (installButton) {
    installButton.classList.add('hidden');
  }
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    deferredInstallPrompt = null;
    hideInstallButton();
  });
}

window.addEventListener('appinstalled', () => {
  console.log('PWA installed');
  hideInstallButton();
});

const checkUpcomingEvents = () => {
  if (!notificationsEnabled || !upcomingEventsNotificationsEnabled) return;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const upcomingEvents = allEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === tomorrow.toDateString();
  });

  upcomingEvents.forEach(event => {
    showNotification(
      'فعالية غداً!',
      `${event.title} - ${event.location}`,
      '/favicon.ico'
    );
  });
};

const checkNewEvents = async () => {
  if (!notificationsEnabled || !newEventsNotificationsEnabled || !authToken) return;
  try {
    const response = await fetchWithAuth('/api/events');
    if (!response.ok) return;

    const events = await response.json();
    const newEvents = events.filter(event => !knownEventIds.has(event.id));

    if (newEvents.length > 0) {
      newEvents.forEach(event => {
        showNotification('فعالية جديدة', `${event.title} - ${event.location}`, '/favicon.ico');
      });
      allEvents = events;
      knownEventIds = new Set(events.map(event => event.id));
      applyFilters();
      updateStatistics();
    }
  } catch (error) {
    console.error('حدث خطأ أثناء التحقق من الفعاليات الجديدة:', error);
  }
};

const startNotificationPolling = () => {
  if (notificationCheckIntervalId) {
    clearInterval(notificationCheckIntervalId);
  }
  notificationCheckIntervalId = setInterval(() => {
    if (upcomingEventsNotificationsEnabled) checkUpcomingEvents();
    if (newEventsNotificationsEnabled) checkNewEvents();
  }, 60 * 1000); // كل دقيقة
};

const stopNotificationPolling = () => {
  if (notificationCheckIntervalId) {
    clearInterval(notificationCheckIntervalId);
    notificationCheckIntervalId = null;
  }
};

// Notification Settings Functions
const openNotificationSettings = () => {
  // Load current settings
  enableNotificationsCheckbox.checked = notificationsEnabled;
  upcomingEventsNotificationsCheckbox.checked = upcomingEventsNotificationsEnabled;
  newEventsNotificationsCheckbox.checked = newEventsNotificationsEnabled;

  // Enable/disable sub-options based on main toggle
  upcomingEventsNotificationsCheckbox.disabled = !notificationsEnabled;
  newEventsNotificationsCheckbox.disabled = !notificationsEnabled;

  notificationModal.classList.remove('hidden');
};

const closeNotificationSettings = () => {
  notificationModal.classList.add('hidden');
};

const saveNotificationSettings = async () => {
  const newNotificationsEnabled = enableNotificationsCheckbox.checked;
  const newUpcomingEnabled = upcomingEventsNotificationsCheckbox.checked;
  const newEventsEnabled = newEventsNotificationsCheckbox.checked;

  // If enabling notifications, request permission
  if (newNotificationsEnabled && !notificationsEnabled) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      alert('يجب السماح بالإشعارات لتفعيل هذه الميزة.');
      return;
    }
  }

  // Update settings
  notificationsEnabled = newNotificationsEnabled;
  upcomingEventsNotificationsEnabled = newUpcomingEnabled;
  newEventsNotificationsEnabled = newEventsEnabled;

  // Save to localStorage
  localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  localStorage.setItem('upcomingEventsNotificationsEnabled', upcomingEventsNotificationsEnabled.toString());
  localStorage.setItem('newEventsNotificationsEnabled', newEventsNotificationsEnabled.toString());

  // Update UI
  notificationSettingsBtn.textContent = notificationsEnabled ? '🔔⚙️' : '🔕⚙️';
  notificationSettingsBtn.title = notificationsEnabled ? 'إعدادات الإشعارات (مفعل)' : 'إعدادات الإشعارات (معطل)';

  // Start/stop polling based on settings
  if (notificationsEnabled && (upcomingEventsNotificationsEnabled || newEventsNotificationsEnabled)) {
    startNotificationPolling();
    if (allEvents.length > 0) {
      if (upcomingEventsNotificationsEnabled) checkUpcomingEvents();
      if (newEventsNotificationsEnabled) checkNewEvents();
    }
  } else {
    stopNotificationPolling();
  }

  closeNotificationSettings();
  alert('تم حفظ إعدادات الإشعارات!');
};

const loadNotificationSettings = () => {
  notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
  upcomingEventsNotificationsEnabled = localStorage.getItem('upcomingEventsNotificationsEnabled') === 'true';
  newEventsNotificationsEnabled = localStorage.getItem('newEventsNotificationsEnabled') === 'true';

  // Set default values if not set
  if (localStorage.getItem('upcomingEventsNotificationsEnabled') === null) {
    upcomingEventsNotificationsEnabled = true;
  }
  if (localStorage.getItem('newEventsNotificationsEnabled') === null) {
    newEventsNotificationsEnabled = true;
  }
};

// Mobile Navigation Functions
const toggleMobileMenu = () => {
  const isOpen = mobileNav.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
};

const openMobileMenu = () => {
  mobileNav.classList.add('open');
  mobileMenuToggle.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

const closeMobileMenu = () => {
  mobileNav.classList.remove('open');
  mobileMenuToggle.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
};

const navigateToPanel = (panelId) => {
  // Close mobile menu
  closeMobileMenu();

  // Show the requested panel
  switch (panelId) {
    case 'loginPanel':
      showLogin();
      break;
    case 'registerPanel':
      showRegister();
      break;
    case 'resendPanel':
      showResendActivation();
      break;
    case 'forgotPanel':
      showForgotPassword();
      break;
  }

  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Detect if device is mobile
const isMobileDevice = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Optimize for mobile performance
const optimizeForMobile = () => {
  if (isMobileDevice()) {
    // Disable hover effects on touch devices
    document.documentElement.style.setProperty('--hover-supported', 'none');

    // Add touch-friendly class
    document.body.classList.add('touch-device');

    // Optimize images for mobile
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }
};

const toggleNotifications = async () => {
  if (!notificationsEnabled) {
    const granted = await requestNotificationPermission();
    if (granted) {
      notificationsEnabled = true;
      upcomingEventsNotificationsEnabled = true;
      newEventsNotificationsEnabled = true;
      notificationSettingsBtn.textContent = '🔔⚙️';
      notificationSettingsBtn.title = 'إعدادات الإشعارات (مفعل)';
      localStorage.setItem('notificationsEnabled', 'true');
      localStorage.setItem('upcomingEventsNotificationsEnabled', 'true');
      localStorage.setItem('newEventsNotificationsEnabled', 'true');

      // Check for upcoming events immediately
      if (allEvents.length > 0) {
        checkUpcomingEvents();
        checkNewEvents();
      }

      // Set up polling for upcoming and new events
      startNotificationPolling();
    } else {
      alert('يجب السماح بالتنبيهات لتفعيل هذه الميزة.');
    }
  } else {
    notificationsEnabled = false;
    upcomingEventsNotificationsEnabled = false;
    newEventsNotificationsEnabled = false;
    notificationSettingsBtn.textContent = '🔕⚙️';
    notificationSettingsBtn.title = 'إعدادات الإشعارات (معطل)';
    localStorage.setItem('notificationsEnabled', 'false');
    localStorage.setItem('upcomingEventsNotificationsEnabled', 'false');
    localStorage.setItem('newEventsNotificationsEnabled', 'false');
    stopNotificationPolling();
  }
};

// View switching functions
const switchToGridView = () => {
  currentView = 'grid';
  eventsList.classList.remove('hidden');
  calendarContainer.classList.add('hidden');
  gridViewBtn.classList.add('active');
  calendarViewBtn.classList.remove('active');
  applyFilters();
};

const switchToCalendarView = () => {
  currentView = 'calendar';
  eventsList.classList.add('hidden');
  calendarContainer.classList.remove('hidden');
  gridViewBtn.classList.remove('active');
  calendarViewBtn.classList.add('active');
  renderCalendar();
};

// Calendar functions
const renderCalendar = () => {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // Update title
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  calendarTitle.textContent = `${monthNames[month]} ${year}`;

  // Get first day of month and last day
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  // Clear previous days
  calendarDays.innerHTML = '';

  // Generate calendar days
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';

    const dayNumber = currentDate.getDate();
    const isCurrentMonth = currentDate.getMonth() === month;
    const isToday = currentDate.toDateString() === new Date().toDateString();

    if (!isCurrentMonth) {
      dayDiv.classList.add('other-month');
    }
    if (isToday) {
      dayDiv.classList.add('today');
    }

    dayDiv.innerHTML = `<div class="calendar-day-number">${dayNumber}</div>`;

    // Add events for this day
    const dayEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    dayEvents.forEach(event => {
      const eventDiv = document.createElement('div');
      eventDiv.className = 'calendar-event';
      eventDiv.textContent = event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title;
      eventDiv.title = event.title;
      eventDiv.addEventListener('click', () => {
        // Switch to grid view and filter to show this event
        switchToGridView();
        searchInput.value = event.title;
        applyFilters();
      });
      dayDiv.appendChild(eventDiv);
    });

    calendarDays.appendChild(dayDiv);
    currentDate.setDate(currentDate.getDate() + 1);
  }
};

const changeMonth = (delta) => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
};

// Statistics functions
const updateStatistics = () => {
  if (currentRole !== 'admin') return;

  const totalEvents = allEvents.length;
  const upcomingEvents = allEvents.filter(event => new Date(event.date) >= new Date()).length;
  const totalAttendees = allEvents.reduce((sum, event) => sum + (event.attendingCount || 0), 0);
  const avgAttendees = totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0;

  document.getElementById('totalEvents').textContent = totalEvents;
  document.getElementById('upcomingEvents').textContent = upcomingEvents;
  document.getElementById('totalAttendees').textContent = totalAttendees;
  document.getElementById('avgAttendees').textContent = avgAttendees;
};

const renderUsersTable = (users) => {
  adminUsers = users;
  if (!users || users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">لا يوجد مستخدمين للعرض.</td></tr>';
    return;
  }

  usersTableBody.innerHTML = users.map((user) => `
    <tr>
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.role)}</td>
      <td>${user.isActivated ? 'مفعل' : 'غير مفعل'}</td>
      <td class="users-actions-cell">
        <button type="button" class="button small secondary" data-id="${user.id}" data-action="toggle-activation">${user.isActivated ? 'تعطيل' : 'تفعيل'}</button>
        ${!user.isActivated ? `<button type="button" class="button small secondary" data-id="${user.id}" data-action="resend-activation">إعادة إرسال التفعيل</button>` : ''}
        <button type="button" class="button small secondary" data-id="${user.id}" data-action="toggle-role">${user.role === 'admin' ? 'خفض صلاحية' : 'جعل مدير'}</button>
        <button type="button" class="button small delete-btn" data-id="${user.id}" data-action="delete-user">حذف</button>
      </td>
    </tr>
  `).join('');
};

const loadUsers = async () => {
  if (!usersTableBody) return;
  usersMessage.textContent = '';
  usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">جارٍ تحميل المستخدمين...</td></tr>';
  try {
    const response = await fetchWithAuth('/api/admin/users');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل تحميل المستخدمين');
    }
    const users = await response.json();
    renderUsersTable(users);
  } catch (error) {
    usersMessage.textContent = error.message;
    usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">تعذر تحميل المستخدمين.</td></tr>';
    console.error(error);
  }
};

const updateUser = async (userId, updates) => {
  const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'فشل تحديث المستخدم');
  }
  return response.json();
};

const deleteUser = async (userId) => {
  const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'فشل حذف المستخدم');
  }
  return response.json();
};

const createUser = async (userData) => {
  const response = await fetchWithAuth('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'فشل إنشاء المستخدم');
  }
  return response.json();
};

const resetCreateUserForm = () => {
  createUserForm.reset();
  adminRoleSelect.value = 'normal';
  adminActivateCheckbox.checked = true;
  createUserMessage.textContent = '';
};

const handleCreateUser = async (event) => {
  event.preventDefault();
  createUserMessage.textContent = '';

  const username = adminUsernameInput.value.trim();
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();
  const role = adminRoleSelect.value;
  const isActivated = adminActivateCheckbox.checked;

  if (!username || !email || !password) {
    createUserMessage.textContent = 'يرجى ملء الحقول المطلوبة.';
    return;
  }
  if (password.length < 6) {
    createUserMessage.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
    return;
  }

  try {
    await createUser({ username, email, password, role, isActivated });
    resetCreateUserForm();
    await loadUsers();
    createUserMessage.textContent = isActivated
      ? 'تم إنشاء المستخدم بنجاح.'
      : 'تم إنشاء المستخدم بنجاح. تم إرسال رابط التفعيل إلى البريد.';
  } catch (error) {
    createUserMessage.textContent = error.message;
    console.error(error);
  }
};

const handleUsersAction = async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const userId = button.dataset.id;
  const action = button.dataset.action;
  if (!userId || !action) return;

  try {
    if (action === 'toggle-activation') {
      const user = adminUsers.find((item) => item.id.toString() === userId.toString());
      if (!user) throw new Error('المستخدم غير موجود');
      await updateUser(userId, { isActivated: !user.isActivated });
      await loadUsers();
    }

    if (action === 'toggle-role') {
      const user = adminUsers.find((item) => item.id.toString() === userId.toString());
      if (!user) throw new Error('المستخدم غير موجود');
      await updateUser(userId, { role: user.role === 'admin' ? 'normal' : 'admin' });
      await loadUsers();
    }

    if (action === 'resend-activation') {
      await fetchWithAuth(`/api/admin/users/${userId}/resend-activation`, { method: 'POST' });
      await loadUsers();
      usersMessage.textContent = 'تم إرسال رابط التفعيل للمستخدم.';
      return;
    }

    if (action === 'delete-user') {
      const confirmed = confirm('هل تريد حذف هذا الحساب؟');
      if (!confirmed) return;
      await deleteUser(userId);
      await loadUsers();
    }
  } catch (error) {
    usersMessage.textContent = error.message;
    console.error(error);
  }
};

const showLogin = () => {
  loginPanel.classList.remove('hidden');
  registerPanel.classList.add('hidden');
  resendPanel.classList.add('hidden');
  forgotPanel.classList.add('hidden');
  appPanel.classList.add('hidden');
  loginError.textContent = '';
  registerError.textContent = '';
  resendError.textContent = '';
  forgotError.textContent = '';
  loginForm.reset();
  registerForm.reset();
  resendForm.reset();
  forgotForm.reset();
};

const showRegister = () => {
  loginPanel.classList.add('hidden');
  registerPanel.classList.remove('hidden');
  resendPanel.classList.add('hidden');
  forgotPanel.classList.add('hidden');
  appPanel.classList.add('hidden');
  loginError.textContent = '';
  registerError.textContent = '';
  resendError.textContent = '';
  forgotError.textContent = '';
  loginForm.reset();
  registerForm.reset();
  resendForm.reset();
  forgotForm.reset();
};

const showForgotPassword = () => {
  loginPanel.classList.add('hidden');
  registerPanel.classList.add('hidden');
  resendPanel.classList.add('hidden');
  forgotPanel.classList.remove('hidden');
  appPanel.classList.add('hidden');
  loginError.textContent = '';
  registerError.textContent = '';
  resendError.textContent = '';
  forgotError.textContent = '';
  loginForm.reset();
  registerForm.reset();
  resendForm.reset();
  forgotForm.reset();
};

const showResendActivation = () => {
  loginPanel.classList.add('hidden');
  registerPanel.classList.add('hidden');
  resendPanel.classList.remove('hidden');
  forgotPanel.classList.add('hidden');
  appPanel.classList.add('hidden');
  loginError.textContent = '';
  registerError.textContent = '';
  resendError.textContent = '';
  forgotError.textContent = '';
  loginForm.reset();
  registerForm.reset();
  resendForm.reset();
  forgotForm.reset();
};

const showApp = () => {
  loginPanel.classList.add('hidden');
  registerPanel.classList.add('hidden');
  appPanel.classList.remove('hidden');
  welcomeMessage.textContent = `مرحباً ${currentUser}`;
  roleMessage.textContent = currentRole === 'admin' ? 'أنت مدير ولديك صلاحية إدارة الفعاليات والمستخدمين.' : 'أنت مستخدم عادي ويمكنك حضور الفعاليات.';
  if (currentRole === 'admin') {
    adminPanel.classList.remove('hidden');
    loadUsers();
    loadAnalytics();
    startAnalyticsPolling();
  } else {
    adminPanel.classList.add('hidden');
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };

  const body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    showLogin();
    throw new Error('الرجاء تسجيل الدخول مرة أخرى.');
  }
  return response;
};

// Map functions
const initMap = () => {
  if (!map) {
    map = L.map('map').setView([32.6167, 36.1033], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([32.6167, 36.1033], { draggable: true }).addTo(map);

    marker.on('dragend', (event) => {
      const position = event.target.getLatLng();
      currentLatLng = { lat: position.lat, lng: position.lng };
      latitudeInput.value = position.lat.toFixed(6);
      longitudeInput.value = position.lng.toFixed(6);
    });

    map.on('click', (event) => {
      const position = event.latlng;
      marker.setLatLng(position);
      currentLatLng = { lat: position.lat, lng: position.lng };
      latitudeInput.value = position.lat.toFixed(6);
      longitudeInput.value = position.lng.toFixed(6);
    });
  }
};

const searchAddress = async () => {
  const address = eventForm.location.value.trim();
  if (!address) {
    return;
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const results = await response.json();

    if (results.length > 0) {
      const location = results[0];
      currentLatLng = { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
      latitudeInput.value = currentLatLng.lat.toFixed(6);
      longitudeInput.value = currentLatLng.lng.toFixed(6);
      if (map && marker) {
        map.setView([currentLatLng.lat, currentLatLng.lng], 14);
        marker.setLatLng([currentLatLng.lat, currentLatLng.lng]);
      }
    } else {
      alert('لم يتم العثور على الموقع. حاول عنوانًا آخر.');
    }
  } catch (error) {
    console.error('بحث العنوان فشل:', error);
    alert('حدث خطأ عند البحث عن الموقع. جرب مرة أخرى.');
  }
};

const openMapModal = async () => {
  mapModal.classList.remove('hidden');
  initMap();

  // Adjust map size for mobile
  const isMobile = window.innerWidth <= 768;
  const mapHeight = isMobile ? '300px' : '400px';
  document.getElementById('map').style.height = mapHeight;

  const lat = parseFloat(latitudeInput.value) || 32.6167;
  const lng = parseFloat(longitudeInput.value) || 36.1033;
  const zoom = isMobile ? 11 : 13; // Lower zoom on mobile for better overview

  const position = [lat, lng];
  map.setView(position, zoom);
  marker.setLatLng(position);
  currentLatLng = { lat, lng };

  const address = eventForm.location.value.trim();
  if (address) {
    await searchAddress();
  }
};

const closeMapModal = () => {
  mapModal.classList.add('hidden');
};

const confirmMapLocation = () => {
  if (currentLatLng) {
    latitudeInput.value = currentLatLng.lat.toFixed(6);
    longitudeInput.value = currentLatLng.lng.toFixed(6);
  }
  closeMapModal();
};

if (closeTicketModal) {
  closeTicketModal.addEventListener('click', closeTicketModalHandler);
}
if (cancelTicketBtn) {
  cancelTicketBtn.addEventListener('click', closeTicketModalHandler);
}
if (isVirtualTicketCheckbox) {
  isVirtualTicketCheckbox.addEventListener('change', updateTicketModalInputs);
}
if (reserveTicketBtn) {
  reserveTicketBtn.addEventListener('click', reserveTicket);
}
if (seatMapContainer) {
  seatMapContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.seat');
    if (!button || button.disabled) return;
    selectSeat(button.dataset.category, Number(button.dataset.number));
  });
}

const loadEvents = async () => {
  try {
    const showArchivedParam = showArchived.checked ? '?archived=true' : '';
    const response = await fetchWithAuth('/api/events' + showArchivedParam);
    allEvents = await response.json();
    knownEventIds = new Set(allEvents.map(event => event.id));
    applyFilters();
    updateStatistics();
  } catch (error) {
    eventCount.textContent = 'حدث خطأ أثناء تحميل الفعاليات.';
    eventsList.innerHTML = '<p>حاول إعادة تسجيل الدخول.</p>';
    console.error(error);
  }
};

const applyFilters = async () => {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const categoryValue = categoryFilter.value;
  const dateValue = dateFilter.value;
  const districtValue = districtFilter?.value.toLowerCase().trim();
  const budgetValue = budgetFilter?.value;

  let filteredEvents = allEvents.filter(event => {
    // Search filter
    const matchesSearch = !searchTerm ||
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm) ||
      event.location.toLowerCase().includes(searchTerm);

    // Category filter
    const matchesCategory = !categoryValue || event.category === categoryValue;
    const matchesDistrict = !districtValue || (event.district || '').toLowerCase().includes(districtValue);
    const matchesBudget = matchesBudgetFilter(event, budgetValue);

    // Date filter
    let matchesDate = true;
    if (dateValue) {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateValue === 'upcoming') {
        matchesDate = eventDate >= today;
      } else if (dateValue === 'past') {
        matchesDate = eventDate < today;
      }
    }

    const attendanceValue = attendanceFilter?.value || '';
    let matchesAttendance = true;
    if (attendanceValue) {
      matchesAttendance = event.myAttendanceStatus === attendanceValue;
    }

    return matchesSearch && matchesCategory && matchesDate && matchesAttendance;
  });

  eventCount.textContent = `عدد الفعاليات: ${filteredEvents.length} من ${allEvents.length}`;
  eventsList.innerHTML = filteredEvents.length ? filteredEvents.map(renderEventCard).join('') : '<p>لا توجد فعاليات تطابق معايير البحث.</p>';
  await loadCommentsForEvents();
  renderWeeklyEvents(filteredEvents);
  renderTrendingEvents(filteredEvents);

  // Update calendar if in calendar view
  if (currentView === 'calendar') {
    renderCalendar();
  }
};

const matchesBudgetFilter = (event, budgetValue) => {
  const minBudget = Number(event.budgetCents || 0);
  if (!budgetValue) return true;
  if (budgetValue === 'under50') return minBudget > 0 && minBudget <= 5000;
  if (budgetValue === 'under100') return minBudget > 0 && minBudget <= 10000;
  if (budgetValue === 'over100') return minBudget > 10000;
  return true;
};

const renderWeeklyEvents = (events) => {
  if (!weeklyEvents) return;
  const oneWeekAhead = new Date();
  oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);
  const today = new Date();

  const weekEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= oneWeekAhead;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  weeklyEvents.innerHTML = weekEvents.length
    ? weekEvents.map((event) => `
        <article class="highlight-card">
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.description)}</p>
          <p><strong>التاريخ:</strong> ${formatDate(event.date)}</p>
          <p><strong>المنطقة:</strong> ${escapeHtml(event.district || 'غير محدد')}</p>
          <a href="/event.html?id=${event.id}" class="button small primary">تفاصيل وحجز</a>
        </article>
      `).join('')
    : '<p class="muted-text">لا توجد فعاليات لهذا الأسبوع.</p>';
};

const renderTrendingEvents = (events) => {
  if (!trendingEvents) return;
  const trending = [...events]
    .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
    .slice(0, 4);

  trendingEvents.innerHTML = trending.length
    ? trending.map((event) => `
        <article class="highlight-card trending-card">
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.category)}</p>
          <p><strong>تذاكر مباعة:</strong> ${event.attendees || 0}</p>
          <a href="/event.html?id=${event.id}" class="button small secondary">عرض التفاصيل</a>
        </article>
      `).join('')
    : '<p class="muted-text">لا توجد فعاليات رائجة حتى الآن.</p>';
};

const renderEventCard = (event) => {
  const attendanceButtons = currentRole
    ? `
        <div class="attendance-actions">
          <button type="button" class="button small attendance-btn ${event.myAttendanceStatus === 'attending' ? 'active' : ''}" data-id="${event.id}" data-status="attending">${attendanceStatusLabels.attending}</button>
          <button type="button" class="button small attendance-btn ${event.myAttendanceStatus === 'maybe' ? 'active' : ''}" data-id="${event.id}" data-status="maybe">${attendanceStatusLabels.maybe}</button>
          <button type="button" class="button small attendance-btn ${event.myAttendanceStatus === 'declined' ? 'active' : ''}" data-id="${event.id}" data-status="declined">${attendanceStatusLabels.declined}</button>
        </div>
        ${event.myAttendanceStatus ? `<p class="attendance-status">حالتك: ${attendanceStatusLabels[event.myAttendanceStatus] || event.myAttendanceStatus}</p>` : ''}
      `
    : '<p class="muted-text">سجل دخول لتحديد حضورك.</p>';

  const ticketActions = currentRole
    ? `
        <div class="event-actions">
          <a href="/event.html?id=${event.id}" class="button action-button primary">تفاصيل وحجز</a>
          <button type="button" class="button action-button reserve-seat-btn" data-id="${event.id}">اختر مقعد</button>
          ${event.isHybrid ? `<button type="button" class="button action-button purchase-virtual-btn" data-id="${event.id}">تذكرة افتراضية</button>` : ''}
        </div>
      `
    : '<p class="muted-text">سجل دخول لحجز التذكرة أو مشاهدة البث.</p>';

  const actions = currentRole === 'admin'
    ? `
        <div class="event-actions">
          <button type="button" class="button action-button edit-btn" data-id="${event.id}">تعديل</button>
          <button type="button" class="button action-button ${event.archived ? 'unarchive-btn' : 'archive-btn'}" data-id="${event.id}">${event.archived ? 'إلغاء الأرشفة' : 'أرشفة'}</button>
          <button type="button" class="button action-button delete-btn" data-id="${event.id}">حذف</button>
        </div>
      `
    : '';

  const mapSection = (event.latitude && event.longitude) ? `
    <div class="event-map">
      <iframe
        width="100%"
        height="${isMobileDevice() ? '180' : '220'}"
        frameborder="0"
        scrolling="no"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.02}%2C${event.latitude - 0.01}%2C${event.longitude + 0.02}%2C${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude}%2C${event.longitude}"
        onerror="this.style.display='none'; this.closest('.event-map').querySelector('.map-fallback').classList.remove('hidden');">
      </iframe>
      <div class="map-fallback hidden">
        <p>لم نتمكن من تحميل الخريطة الخارجية. يمكنك فتح الموقع مباشرة من الرابط أدناه.</p>
      </div>
      <p class="map-caption"><a href="https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=15/${event.latitude}/${event.longitude}" target="_blank" rel="noopener">فتح الخريطة كاملة</a></p>
    </div>
  ` : '';

  const mediaGallery = (event.media && event.media.length)
    ? `
      <div class="event-media-gallery">
        ${event.media.map((item) => {
          const src = escapeHtml(item.url);
          if (item.type === 'video') {
            const isLocalVideo = item.url.startsWith('/uploads/');
            return `
              <div class="media-item media-video">
                ${isLocalVideo ? `<video controls src="${src}"></video>` : `<a href="${src}" target="_blank" rel="noopener">عرض الفيديو</a>`}
              </div>
            `;
          }
          return `
            <div class="media-item media-image">
              <img src="${src}" alt="${escapeHtml(event.title)}" loading="lazy" />
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

  return `
    <article class="event-card">
      <h3>${escapeHtml(event.title)}</h3>
      ${mediaGallery}
      <p>${escapeHtml(event.description)}</p>
      <p><strong>المكان:</strong> ${escapeHtml(event.location)}</p>
      ${mapSection}
      ${event.isHybrid ? '<p class="hybrid-label">بث مباشر متاح</p>' : ''}
      <p class="tag">${escapeHtml(event.category)} · ${escapeHtml(event.district || 'الكل')}</p>
      <p class="price-tag">الميزانية: ${event.budgetCents ? `${Math.round(event.budgetCents / 100)}$` : 'غير محددة'}</p>
      <time>التاريخ: ${formatDate(event.date)}</time>
      <p class="attendees-info">المؤكدون: ${event.attendingCount ?? 0} · ربما: ${event.maybeCount ?? 0}</p>
      <p class="comment-count">عدد التعليقات: ${event.commentCount ?? 0}</p>
      ${attendanceButtons}
      ${ticketActions}

      <div class="share-section">
        <span class="share-label">مشاركة:</span>
        <div class="share-buttons">
          <button type="button" class="share-btn facebook" data-id="${event.id}" title="مشاركة على فيسبوك">📘</button>
          <button type="button" class="share-btn twitter" data-id="${event.id}" title="مشاركة على تويتر">🐦</button>
          <button type="button" class="share-btn whatsapp" data-id="${event.id}" title="مشاركة على واتساب">📱</button>
          <button type="button" class="share-btn copy-link" data-id="${event.id}" title="نسخ الرابط">🔗</button>
        </div>
      </div>

      <section class="event-comments-wrapper">
        <h4>تعليقات المجتمع</h4>
        <div class="comment-list" id="comments-${event.id}">
          <p class="muted-text">جارٍ تحميل التعليقات...</p>
        </div>
        ${currentRole ? `
          <div class="comment-form">
            <textarea class="comment-input" data-event-id="${event.id}" placeholder="اكتب تعليقك هنا..."></textarea>
            <button type="button" class="button small primary comment-submit-btn" data-event-id="${event.id}">أرسل التعليق</button>
          </div>
        ` : '<p class="muted-text">سجل دخول لتتمكن من المشاركة بالتعليقات.</p>'}
      </section>

      ${actions}
    </article>
  `;
};

const escapeHtml = (unsafe) => {
  const value = unsafe == null ? '' : String(unsafe);
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatCommentDate = (createdAt) => {
  const date = new Date(createdAt);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const renderCommentList = (comments) => {
  if (!comments || comments.length === 0) {
    return '<p class="muted-text">لا توجد تعليقات بعد. كن أول من يشارك!</p>';
  }

  return comments.map((comment) => `
    <div class="comment-card" data-comment-id="${comment.id}" data-event-id="${comment.eventId}">
      <div class="comment-header">
        <strong>${escapeHtml(comment.username)}</strong>
        <span>${formatCommentDate(comment.createdAt)}</span>
      </div>
      <div class="comment-body">
        <p class="comment-text">${escapeHtml(comment.content)}</p>
      </div>
      ${currentRole === 'admin' ? `
        <div class="comment-controls">
          <button type="button" class="button tiny comment-edit-btn" data-comment-id="${comment.id}" data-event-id="${comment.eventId}">تعديل</button>
          <button type="button" class="button tiny danger comment-delete-btn" data-comment-id="${comment.id}" data-event-id="${comment.eventId}">حذف</button>
        </div>
      ` : ''}
    </div>
  `).join('');
};

const renderCommentPager = (eventId, page, limit, totalComments) => {
  const totalPages = Math.ceil(totalComments / limit);
  if (totalPages <= 1) return '';
  const currentPage = page;

  return `
    <div class="comment-pager">
      <span>الصفحة ${currentPage} من ${totalPages}</span>
      ${currentPage < totalPages ? `<button type="button" class="button tiny comment-load-more-btn" data-event-id="${eventId}" data-next-page="${currentPage + 1}">عرض المزيد</button>` : ''}
    </div>
  `;
};

const loadComments = async (eventId, page = 1) => {
  const commentsContainer = document.getElementById(`comments-${eventId}`);
  if (!commentsContainer) return;

  try {
    const response = await fetch(`/api/events/${eventId}/comments?page=${page}&limit=5`);
    if (!response.ok) {
      commentsContainer.innerHTML = '<p class="muted-text">فشل تحميل التعليقات.</p>';
      return;
    }
    const result = await response.json();
    const { comments, totalComments, limit: currentLimit } = result;
    commentPageState[eventId] = {
      page,
      limit: currentLimit,
      totalComments
    };
    commentsContainer.innerHTML = `
      <div class="comment-items">
        ${renderCommentList(comments)}
      </div>
      ${renderCommentPager(eventId, page, currentLimit, totalComments)}
    `;
  } catch (error) {
    commentsContainer.innerHTML = '<p class="muted-text">حدث خطأ أثناء تحميل التعليقات.</p>';
    console.error(error);
  }
};

const loadCommentsForEvents = async () => {
  await Promise.all(allEvents.map((event) => loadComments(event.id)));
};

const resetForm = () => {
  editingId = null;
  removedMediaIds = [];
  formTitle.textContent = 'أضف فعالية جديدة';
  submitButton.textContent = 'إرسال الفعالية';
  cancelEditBtn.hidden = true;
  eventForm.reset();
  mediaPreviewContainer.innerHTML = '';
  eventForm.currentImage = null;
};

const renderMediaPreview = (mediaItems = []) => {
  if (!mediaItems || mediaItems.length === 0) {
    mediaPreviewContainer.innerHTML = '';
    return;
  }

  mediaPreviewContainer.innerHTML = mediaItems.map((item) => {
    const isVideo = item.type === 'video';
    const previewSrc = escapeHtml(item.url);
    const isLocalVideo = item.type === 'video' && item.url.startsWith('/uploads/');
    return `
      <div class="media-preview-item" data-media-id="${item.id}">
        ${isVideo ? `
          <div class="media-preview-video">
            ${isLocalVideo ? `<video controls src="${previewSrc}"></video>` : `<a href="${previewSrc}" target="_blank" rel="noopener">عرض الفيديو</a>`}
          </div>
        ` : `
          <img src="${previewSrc}" alt="وسائط الفعالية" />
        `}
        <button type="button" class="button tiny danger remove-media-btn" data-media-id="${item.id}">إزالة</button>
      </div>
    `;
  }).join('');
};

const fillFormForEdit = (eventData) => {
  editingId = eventData.id;
  removedMediaIds = [];
  formTitle.textContent = 'تعديل الفعالية';
  submitButton.textContent = 'حفظ التعديل';
  cancelEditBtn.hidden = false;
  eventForm.title.value = eventData.title;
  eventForm.description.value = eventData.description;
  eventForm.location.value = eventData.location;
  eventForm.district.value = eventData.district || '';
  eventForm.budgetCents.value = eventData.budgetCents ? Math.round(eventData.budgetCents / 100) : '';
  latitudeInput.value = eventData.latitude || '';
  longitudeInput.value = eventData.longitude || '';
  eventForm.date.value = eventData.date;
  eventForm.category.value = eventData.category;
  eventForm.videoUrl.value = eventData.media?.find((item) => item.type === 'video' && item.filename === null)?.url || '';
  // Store current image for form submission when using legacy image field
  eventForm.currentImage = eventData.image;
  renderMediaPreview(eventData.media || []);
};

const submitFormData = async (data) => {
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `/api/events/${editingId}` : '/api/events';

  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('location', data.location);
  formData.append('district', data.district || '');
  formData.append('budgetCents', data.budgetCents || 0);
  formData.append('latitude', data.latitude || '');
  formData.append('longitude', data.longitude || '');
  formData.append('date', data.date);
  formData.append('category', data.category);
  formData.append('videoUrl', videoUrlInput.value.trim());

  const mediaInput = document.getElementById('mediaFiles');
  if (mediaInput && mediaInput.files.length > 0) {
    Array.from(mediaInput.files).forEach((file) => {
      formData.append('mediaFiles', file);
    });
  }

  if (editingId && eventForm.currentImage) {
    formData.append('currentImage', eventForm.currentImage);
  }

  if (editingId && removedMediaIds.length > 0) {
    formData.append('removedMediaIds', JSON.stringify(removedMediaIds));
  }

  const response = await fetchWithAuth(url, {
    method,
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'فشل حفظ الفعالية');
  }

  return response.json();
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    loginError.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور.';
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل تسجيل الدخول');
    }

    const result = await response.json();
    authToken = result.token;
    currentRole = result.role;
    currentUser = result.username;
    saveSession();
    showApp();
    await loadEvents();
  } catch (error) {
    loginError.textContent = error.message;
    console.error(error);
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = regUsernameInput.value.trim();
  const email = regEmailInput.value.trim();
  const password = regPasswordInput.value.trim();
  if (!username || !email || !password) {
    registerError.textContent = 'يرجى إدخال اسم المستخدم والبريد الإلكتروني وكلمة المرور.';
    return;
  }

  if (password.length < 6) {
    registerError.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل إنشاء الحساب');
    }

    alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
    showLogin();
  } catch (error) {
    registerError.textContent = error.message;
    console.error(error);
  }
});

showRegisterLink.addEventListener('click', (event) => {
  event.preventDefault();
  showRegister();
});

showLoginLink.addEventListener('click', (event) => {
  event.preventDefault();
  showLogin();
});

showResendLink.addEventListener('click', (event) => {
  event.preventDefault();
  showResendActivation();
});

showLoginLink2.addEventListener('click', (event) => {
  event.preventDefault();
  showLogin();
});

resendForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = resendEmailInput.value.trim();
  if (!email) {
    resendError.textContent = 'يرجى إدخال البريد الإلكتروني.';
    return;
  }

  try {
    const response = await fetch('/api/resend-activation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل إرسال رابط التفعيل');
    }

    alert('تم إرسال رابط التفعيل إلى بريدك الإلكتروني. تحقق من صندوق الوارد.');
    showLogin();
  } catch (error) {
    resendError.textContent = error.message;
    console.error(error);
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    if (authToken) {
      await fetchWithAuth('/api/logout', { method: 'POST' });
    }
  } catch (error) {
    console.warn('Logout failed', error);
  }
  stopAnalyticsPolling();
  clearSession();
  showLogin();
  eventsList.innerHTML = '';
  eventCount.textContent = 'يرجى تسجيل الدخول لعرض الفعاليات.';
});

eventForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = {
    title: eventForm.title.value.trim(),
    description: eventForm.description.value.trim(),
    location: eventForm.location.value.trim(),
    district: eventForm.district.value.trim(),
    budgetCents: Number(eventForm.budgetCents.value) * 100 || 0,
    latitude: latitudeInput.value.trim(),
    longitude: longitudeInput.value.trim(),
    date: eventForm.date.value,
    category: eventForm.category.value
  };

  if (!data.title || !data.description || !data.location || !data.date) {
    alert('يرجى ملء جميع الحقول.');
    return;
  }

  if (!data.latitude || !data.longitude) {
    alert('يرجى تحديد الموقع عبر الخريطة أو إدخال خط العرض وخط الطول قبل إرسال الفعالية.');
    return;
  }

  const editingMode = Boolean(editingId);
  try {
    await submitFormData(data);
    resetForm();
    await loadEvents();
    alert(editingMode ? 'تم تعديل الفعالية بنجاح.' : 'تم إضافة الفعالية بنجاح.');
  } catch (error) {
    alert('حدث خطأ: ' + error.message);
    console.error(error);
  }
});

cancelEditBtn.addEventListener('click', () => {
  resetForm();
});

mediaPreviewContainer.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.remove-media-btn');
  if (!removeButton) return;

  const mediaId = removeButton.dataset.mediaId;
  const previewItem = removeButton.closest('.media-preview-item');
  if (!previewItem) return;

  if (mediaId && !Number.isNaN(Number(mediaId))) {
    const mediaIndex = Number(mediaId);
    if (!removedMediaIds.includes(mediaIndex)) {
      removedMediaIds.push(mediaIndex);
    }
  } else {
    eventForm.currentImage = null;
  }

  previewItem.remove();
});

eventsList.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  if (!id) return;

  if (button.classList.contains('reserve-seat-btn')) {
    await openTicketModal(id, false);
    return;
  }

  if (button.classList.contains('purchase-virtual-btn')) {
    await openTicketModal(id, true);
    return;
  }

  if (button.classList.contains('delete-btn')) {
    const confirmed = confirm('هل تريد حذف هذه الفعالية؟');
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/api/events/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل الحذف');
      }
      await loadEvents();
      alert('تم حذف الفعالية.');
      if (editingId && editingId.toString() === id.toString()) {
        resetForm();
      }
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
      console.error(error);
    }
  }

  if (button.classList.contains('edit-btn')) {
    try {
      const response = await fetchWithAuth(`/api/events/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل جلب بيانات الفعالية');
      }
      const eventData = await response.json();
      fillFormForEdit(eventData);
    } catch (error) {
      alert('حدث خطأ عند جلب بيانات الفعالية للتعديل.');
      console.error(error);
    }
  }

  if (button.classList.contains('attendance-btn')) {
    const status = button.dataset.status;
    const eventId = button.dataset.id;
    if (!status || !eventId) return;

    try {
      const response = await fetchWithAuth(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل تحديث حالة الحضور');
      }
      await loadEvents();
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
      console.error(error);
    }
    return;
  }

  if (button.classList.contains('archive-btn') || button.classList.contains('unarchive-btn')) {
    const isArchive = button.classList.contains('archive-btn');
    try {
      const response = await fetchWithAuth(`/api/events/${id}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ archived: isArchive })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل في الأرشفة');
      }
      await loadEvents();
      alert(isArchive ? 'تم أرشفة الفعالية.' : 'تم إلغاء أرشفة الفعالية.');
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
      console.error(error);
    }
  }

  // Comment form submit
  if (button.classList.contains('comment-submit-btn')) {
    const eventId = button.dataset.eventId;
    const textarea = document.querySelector(`textarea.comment-input[data-event-id="${eventId}"]`);
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
      alert('اكتب تعليقًا قبل الإرسال.');
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/events/${eventId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل إضافة التعليق');
      }
      textarea.value = '';
      await loadComments(eventId);
      await loadEvents();
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
    return;
  }

  if (button.classList.contains('comment-load-more-btn')) {
    const eventId = button.dataset.eventId;
    const nextPage = Number(button.dataset.nextPage) || 1;
    await loadComments(eventId, nextPage);
    return;
  }

  if (button.classList.contains('comment-edit-btn')) {
    const commentId = button.dataset.commentId;
    const eventId = button.dataset.eventId;
    const commentCard = document.querySelector(`.comment-card[data-comment-id="${commentId}"]`);
    if (!commentCard) return;

    const body = commentCard.querySelector('.comment-body');
    const contentText = body.querySelector('.comment-text').textContent;
    body.innerHTML = `
      <textarea class="comment-edit-input" data-comment-id="${commentId}" data-event-id="${eventId}">${escapeHtml(contentText)}</textarea>
      <div class="comment-edit-actions">
        <button type="button" class="button tiny primary comment-save-btn" data-comment-id="${commentId}" data-event-id="${eventId}">حفظ</button>
        <button type="button" class="button tiny comment-cancel-btn" data-comment-id="${commentId}" data-event-id="${eventId}">إلغاء</button>
      </div>
    `;
    return;
  }

  if (button.classList.contains('comment-save-btn')) {
    const commentId = button.dataset.commentId;
    const eventId = button.dataset.eventId;
    const textarea = document.querySelector(`textarea.comment-edit-input[data-comment-id="${commentId}"]`);
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
      alert('التعليق لا يمكن أن يكون فارغاً.');
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل تعديل التعليق');
      }
      await loadComments(eventId, commentPageState[eventId]?.page || 1);
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
    return;
  }

  if (button.classList.contains('comment-cancel-btn')) {
    const eventId = button.dataset.eventId;
    await loadComments(eventId, commentPageState[eventId]?.page || 1);
    return;
  }

  if (button.classList.contains('comment-delete-btn')) {
    const commentId = button.dataset.commentId;
    const eventId = button.dataset.eventId;
    if (!confirm('هل أنت متأكد أنك تريد حذف هذا التعليق؟')) return;

    try {
      const response = await fetchWithAuth(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل حذف التعليق');
      }
      const currentPage = commentPageState[eventId]?.page || 1;
      const totalComments = (commentPageState[eventId]?.totalComments || 1) - 1;
      const currentLimit = commentPageState[eventId]?.limit || 5;
      const newPage = currentPage > 1 && totalComments <= currentLimit * (currentPage - 1) ? currentPage - 1 : currentPage;
      await loadComments(eventId, newPage);
      await loadEvents();
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
    return;
  }

  if (button.classList.contains('share-btn')) {
    const event = allEvents.find(e => e.id.toString() === id.toString());
    if (!event) return;

    const eventText = `فعالية: ${event.title}\n${event.description}\nالمكان: ${event.location}\nالتاريخ: ${formatDate(event.date)}\nالفئة: ${event.category}`;
    const eventUrl = window.location.href;

    if (button.classList.contains('facebook')) {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}&quote=${encodeURIComponent(eventText)}`;
      window.open(url, '_blank', 'width=600,height=400');
    } else if (button.classList.contains('twitter')) {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(eventText)}&url=${encodeURIComponent(eventUrl)}`;
      window.open(url, '_blank', 'width=600,height=400');
    } else if (button.classList.contains('whatsapp')) {
      const url = `https://wa.me/?text=${encodeURIComponent(eventText + '\n' + eventUrl)}`;
      window.open(url, '_blank');
    } else if (button.classList.contains('copy-link')) {
      navigator.clipboard.writeText(eventUrl + '?event=' + id).then(() => {
        alert('تم نسخ الرابط!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = eventUrl + '?event=' + id;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('تم نسخ الرابط!');
      });
    }
  }
});

// Search and Filter Event Listeners
searchInput.addEventListener('input', applyFilters);
clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  if (attendanceFilter) {
    attendanceFilter.value = '';
  }
  if (districtFilter) {
    districtFilter.value = '';
  }
  if (budgetFilter) {
    budgetFilter.value = '';
  }
  applyFilters();
});
categoryFilter.addEventListener('change', applyFilters);
dateFilter.addEventListener('change', applyFilters);
districtFilter?.addEventListener('change', applyFilters);
budgetFilter?.addEventListener('change', applyFilters);
attendanceFilter?.addEventListener('change', applyFilters);
showArchived.addEventListener('change', loadEvents);

// Theme Event Listener
themeToggle.addEventListener('click', toggleTheme);
notificationToggle?.addEventListener('click', toggleNotifications);

// View Toggle Event Listeners
gridViewBtn.addEventListener('click', switchToGridView);
calendarViewBtn.addEventListener('click', switchToCalendarView);

// Calendar Event Listeners
prevMonth.addEventListener('click', () => changeMonth(-1));
nextMonth.addEventListener('click', () => changeMonth(1));

// Notification Settings Event Listeners
notificationSettingsBtn.addEventListener('click', openNotificationSettings);
closeNotificationModalBtn.addEventListener('click', closeNotificationSettings);
cancelNotificationSettingsBtn.addEventListener('click', closeNotificationSettings);
saveNotificationSettingsBtn.addEventListener('click', saveNotificationSettings);

// Update sub-options when main toggle changes
enableNotificationsCheckbox.addEventListener('change', () => {
  const enabled = enableNotificationsCheckbox.checked;
  upcomingEventsNotificationsCheckbox.disabled = !enabled;
  newEventsNotificationsCheckbox.disabled = !enabled;
  if (!enabled) {
    upcomingEventsNotificationsCheckbox.checked = false;
    newEventsNotificationsCheckbox.checked = false;
  } else {
    upcomingEventsNotificationsCheckbox.checked = upcomingEventsNotificationsEnabled;
    newEventsNotificationsCheckbox.checked = newEventsNotificationsEnabled;
  }
});

// Close modal when clicking outside
notificationModal.addEventListener('click', (event) => {
  if (event.target === notificationModal) {
    closeNotificationSettings();
  }
});

const confirmLocationBtn = document.getElementById('confirmLocation');
const cancelLocationBtn = document.getElementById('cancelLocation');
if (confirmLocationBtn) {
  confirmLocationBtn.addEventListener('click', confirmMapLocation);
}
if (cancelLocationBtn) {
  cancelLocationBtn.addEventListener('click', closeMapModal);
}

// Mobile Navigation Event Listeners
mobileMenuToggle.addEventListener('click', toggleMobileMenu);
mobileNavClose.addEventListener('click', closeMobileMenu);

// Mobile navigation links
mobileNavLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const panelId = link.getAttribute('data-panel');
    navigateToPanel(panelId);
  });
});

if (refreshUsersBtn) {
  refreshUsersBtn.addEventListener('click', loadUsers);
}
if (createUserForm) {
  createUserForm.addEventListener('submit', handleCreateUser);
}
if (usersTableBody) {
  usersTableBody.addEventListener('click', handleUsersAction);
}

// Close mobile menu when clicking outside
mobileNav.addEventListener('click', (event) => {
  if (event.target === mobileNav) {
    closeMobileMenu();
  }
});

// Close mobile menu on window resize if desktop size
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && mobileNav.classList.contains('open')) {
    closeMobileMenu();
  }
});

showForgotLink.addEventListener('click', (event) => {
  event.preventDefault();
  showForgotPassword();
});

showLoginLink3.addEventListener('click', (event) => {
  event.preventDefault();
  showLogin();
});

forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = forgotEmailInput.value.trim();
  if (!email) {
    forgotError.textContent = 'يرجى إدخال البريد الإلكتروني.';
    return;
  }

  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'فشل إرسال رابط إعادة التعيين');
    }

    alert('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد.');
    showLogin();
  } catch (error) {
    forgotError.textContent = error.message;
    console.error(error);
  }
});

// Close modal when clicking outside
mapModal?.addEventListener('click', (event) => {
  if (event.target === mapModal) {
    closeMapModal();
  }
});

const initialize = async () => {
  const splash = document.getElementById('appSplash');
  if (splash) {
    splash.classList.remove('hidden');
  }

  let initializationFailed = false;
  try {
    // Initialize theme
    setTheme(getCurrentTheme());

    // Initialize mobile optimizations
    optimizeForMobile();

    if (geocodeBtn) {
      geocodeBtn.addEventListener('click', async () => {
        await openMapModal();
      });
    }

    // Register service worker for PWA support
    await registerServiceWorker();

    // Initialize notifications
    loadNotificationSettings();
    if (notificationSettingsBtn) {
      notificationSettingsBtn.textContent = notificationsEnabled ? '🔔⚙️' : '🔕⚙️';
      notificationSettingsBtn.title = notificationsEnabled ? 'إعدادات الإشعارات (مفعل)' : 'إعدادات الإشعارات (معطل)';
    }

    const loaded = loadSession();
    if (!loaded) {
      showLogin();
      if (eventCount) {
        eventCount.textContent = 'يرجى تسجيل الدخول لعرض الفعاليات.';
      }
      return;
    }

    try {
      showApp();
      await loadEvents();

      // Check for upcoming events and new event alerts if notifications are enabled
      if (notificationsEnabled) {
        if (upcomingEventsNotificationsEnabled) checkUpcomingEvents();
        if (newEventsNotificationsEnabled) checkNewEvents();
        startNotificationPolling();
      }
    } catch (error) {
      console.error(error);
      clearSession();
      showLogin();
    }
  } catch (error) {
    initializationFailed = true;
    console.error('Initialization failed:', error);
    showFatalError(error?.message || 'حدث خطأ أثناء تهيئة التطبيق');
  } finally {
    if (!initializationFailed && splash) {
      splash.classList.add('hidden');
    }
  }
};

initialize();
