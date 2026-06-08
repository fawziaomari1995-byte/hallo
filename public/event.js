const queryParams = new URLSearchParams(window.location.search);
const eventId = queryParams.get('id');
const eventLoading = document.getElementById('eventLoading');
const eventDetails = document.getElementById('eventDetails');
const eventTitle = document.getElementById('eventTitle');
const eventMeta = document.getElementById('eventMeta');
const eventDescription = document.getElementById('eventDescription');
const eventDate = document.getElementById('eventDate');
const eventDistrict = document.getElementById('eventDistrict');
const eventBudget = document.getElementById('eventBudget');
const eventCategory = document.getElementById('eventCategory');
const eventAttendance = document.getElementById('eventAttendance');
const eventCountdown = document.getElementById('eventCountdown');
const eventMedia = document.getElementById('eventMedia');
const eventMap = document.getElementById('eventMap');
const ticketPrices = document.getElementById('ticketPrices');
const bookButton = document.getElementById('bookButton');
const reviewForm = document.getElementById('reviewForm');
const loginNotice = document.getElementById('loginNotice');
const reviewAccessMessage = document.getElementById('reviewAccessMessage');
const existingCommentsContainer = document.getElementById('existingComments');
const reviewRating = document.getElementById('reviewRating');
const reviewContent = document.getElementById('reviewContent');
const submitReviewBtn = document.getElementById('submitReviewBtn');
const reviewMessage = document.getElementById('reviewMessage');

let countdownInterval = null;
let currentEvent = null;
let authToken = null;

const getAuthToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem('eventAppSession') || 'null');
    return session?.authToken || null;
  } catch (err) {
    return null;
  }
};

const fetchWithAuth = (url, options = {}) => {
  const headers = options.headers || {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

const formatDate = (value) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

const padZero = (value) => value.toString().padStart(2, '0');

const updateCountdown = (dateString) => {
  if (countdownInterval) clearInterval(countdownInterval);
  const targetDate = new Date(dateString);
  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) {
      eventCountdown.textContent = 'انتهت الفعالية';
      clearInterval(countdownInterval);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    eventCountdown.textContent = `${padZero(days)} يوم ${padZero(hours)} ساعة ${padZero(minutes)} دقيقة ${padZero(seconds)} ثانية`;
  }, 1000);
};

const renderMedia = (media = []) => {
  if (!media.length) {
    eventMedia.innerHTML = '<p class="muted-text">لا توجد صور أو فيديو توضيحي لهذه الفعالية.</p>';
    return;
  }

  eventMedia.innerHTML = media.map((item) => {
    const src = item.url;
    if (item.type === 'video') {
      const videoTag = src.startsWith('/uploads/') ? `<video controls src="${src}"></video>` : `<a href="${src}" target="_blank" rel="noopener">عرض الفيديو الخارجي</a>`;
      return `<div class="media-item media-video">${videoTag}</div>`;
    }
    return `<div class="media-item media-image"><img src="${src}" alt="${currentEvent?.title || 'فعالية'}" loading="lazy" /></div>`;
  }).join('');
};

const renderMap = (event) => {
  if (!event.latitude || !event.longitude) {
    eventMap.innerHTML = '<p class="muted-text">لا توجد بيانات موقع جغرافي لهذه الفعالية.</p>';
    return;
  }
  eventMap.innerHTML = `
    <iframe
      width="100%"
      height="320"
      frameborder="0"
      scrolling="no"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.02}%2C${event.latitude - 0.01}%2C${event.longitude + 0.02}%2C${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude}%2C${event.longitude}">
    </iframe>
    <p class="map-caption"><a href="https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=15/${event.latitude}/${event.longitude}" target="_blank" rel="noopener">فتح الخريطة كاملة</a></p>
  `;
};

const renderPrices = (event, seatMap) => {
  const rows = [];
  if (event.isHybrid) {
    rows.push(`<div class="ticket-price-item"><strong>تذكرة افتراضية</strong> — ${Math.round((event.virtualPriceCents || 1500) / 100)}$</div>`);
  }
  if (seatMap?.categories?.length) {
    seatMap.categories.forEach((category) => {
      rows.push(`<div class="ticket-price-item"><strong>${category.label}</strong> — ${Math.round(category.priceCents / 100)}$</div>`);
    });
  } else {
    rows.push('<div class="ticket-price-item">لا توجد بيانات أسعار المقاعد المتاحة.</div>');
  }
  ticketPrices.innerHTML = rows.join('');
};

const renderComment = (comment) => {
  const stars = comment.rating ? '⭐'.repeat(comment.rating) : 'بدون تقييم';
  return `
    <article class="comment-card">
      <div class="comment-header">
        <strong>${comment.username}</strong>
        <span class="comment-rating">${stars}</span>
      </div>
      <p>${comment.content}</p>
      <p class="muted-text">${comment.createdAt ? formatDate(comment.createdAt) : ''}</p>
    </article>
  `;
};

const loadComments = async () => {
  existingCommentsContainer.innerHTML = '<p class="muted-text">جارٍ تحميل تقييمات الحضور...</p>';
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/comments?limit=10`);
    if (!response.ok) {
      throw new Error('فشل تحميل التقييمات');
    }
    const data = await response.json();
    if (!data.comments || data.comments.length === 0) {
      existingCommentsContainer.innerHTML = '<p class="muted-text">لا توجد تقييمات حتى الآن.</p>';
      return;
    }
    existingCommentsContainer.innerHTML = data.comments.map(renderComment).join('');
  } catch (err) {
    existingCommentsContainer.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
};

const renderEvent = async (event) => {
  currentEvent = event;
  eventTitle.textContent = event.title;
  eventMeta.textContent = `${event.category} · ${event.district || 'المنطقة غير محددة'}`;
  eventDescription.textContent = event.description;
  eventDate.textContent = formatDate(event.date);
  eventDistrict.textContent = event.district || 'غير محدد';
  eventBudget.textContent = event.budgetCents ? `${Math.round(event.budgetCents / 100)}$` : 'غير محددة';
  eventCategory.textContent = event.category;
  eventAttendance.textContent = `${event.attendingCount || 0} تأكيد حضور`;
  renderMedia(event.media || []);
  renderMap(event);
  updateCountdown(event.date);
  bookButton.href = `/checkout.html?eventId=${event.id}`;

  const response = await fetchWithAuth(`/api/events/${event.id}/seat-map`);
  if (response.ok) {
    const data = await response.json();
    renderPrices(event, data.seatMap);
  } else {
    renderPrices(event, null);
  }

  const token = getAuthToken();
  if (!token) {
    reviewForm.classList.add('hidden');
    loginNotice.classList.remove('hidden');
    reviewAccessMessage.classList.add('hidden');
  } else if (event.userCanReview && !event.userHasCommented) {
    reviewForm.classList.remove('hidden');
    loginNotice.classList.add('hidden');
    reviewAccessMessage.classList.add('hidden');
  } else {
    reviewForm.classList.add('hidden');
    loginNotice.classList.add('hidden');
    reviewAccessMessage.classList.remove('hidden');
    if (event.userHasCommented) {
      reviewAccessMessage.textContent = 'لقد قمت بإضافة تقييم لهذه الفعالية سابقًا.';
    } else if (event.userHasTicket) {
      reviewAccessMessage.textContent = 'يمكنك إضافة تقييم بعد انتهاء الفعالية.';
    } else {
      reviewAccessMessage.textContent = 'يمكنك إضافة تقييم فقط بعد شراء تذكرة وحضور الفعالية.';
    }
  }

  loadComments();
};

const showError = (message) => {
  eventLoading.textContent = message;
  eventDetails.classList.add('hidden');
};

const loadEvent = async () => {
  if (!eventId) {
    showError('لا يوجد معرف فعالية صالح في الرابط.');
    return;
  }

  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`);
    if (!response.ok) {
      throw new Error('فشل تحميل بيانات الفعالية.');
    }
    const event = await response.json();
    eventLoading.classList.add('hidden');
    eventDetails.classList.remove('hidden');
    renderEvent(event);
  } catch (err) {
    console.error(err);
    showError(err.message || 'حدث خطأ أثناء تحميل بيانات الفعالية.');
  }
};

const postReview = async () => {
  reviewMessage.textContent = '';
  const content = reviewContent.value.trim();
  const rating = reviewRating.value;
  if (!content) {
    reviewMessage.textContent = 'يرجى كتابة المراجعة قبل الإرسال.';
    return;
  }
  try {
    const response = await fetchWithAuth(`/api/events/${encodeURIComponent(eventId)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, rating })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'فشل إرسال المراجعة');
    }
    reviewMessage.textContent = 'تم إرسال المراجعة بنجاح.';
    reviewContent.value = '';
    reviewRating.value = '';
  } catch (err) {
    reviewMessage.textContent = err.message;
  }
};

submitReviewBtn?.addEventListener('click', postReview);

loadEvent();
