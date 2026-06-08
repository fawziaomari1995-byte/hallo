const queryParams = new URLSearchParams(window.location.search);
const eventId = queryParams.get('eventId');
const checkoutLoading = document.getElementById('checkoutLoading');
const checkoutContent = document.getElementById('checkoutContent');
const eventSummary = document.getElementById('eventSummary');
const seatMapContainer = document.getElementById('seatMapContainer');
const checkoutForm = document.getElementById('checkoutForm');
const paymentProviderInput = document.getElementById('paymentProvider');
const emailInput = document.getElementById('email');
const ticketTypeSelect = document.getElementById('ticketType');
const ticketPriceInput = document.getElementById('ticketPrice');
const confirmationMessage = document.getElementById('confirmationMessage');

let currentEvent = null;
let currentSeatMap = null;
let selectedSeat = null;

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

const renderEventSummary = (event) => {
  eventSummary.innerHTML = `
    <div class="checkout-summary-card">
      <h3>${event.title}</h3>
      <p>${event.description}</p>
      <p><strong>التاريخ:</strong> ${formatDate(event.date)}</p>
      <p><strong>المنطقة:</strong> ${event.district || 'غير محددة'}</p>
      <p><strong>الميزانية:</strong> ${event.budgetCents ? `${Math.round(event.budgetCents / 100)}$` : 'غير محددة'}</p>
      <p><strong>نوع الفعالية:</strong> ${event.category}</p>
    </div>
  `;
};

const renderPriceOptions = (event, seatMap) => {
  ticketTypeSelect.innerHTML = '';
  const optionSet = new Set();
  if (event.isHybrid) {
    optionSet.add(`<option value="virtual">تذكرة افتراضية - ${Math.round((event.virtualPriceCents || 1500) / 100)}$</option>`);
  }
  if (seatMap?.categories?.length) {
    seatMap.categories.forEach((category) => {
      optionSet.add(`<option value="${category.id}">${category.label} - ${Math.round(category.priceCents / 100)}$</option>`);
    });
  }
  if (!optionSet.size) {
    optionSet.add('<option value="general">عام</option>');
  }
  ticketTypeSelect.innerHTML = Array.from(optionSet).join('');
  if (!currentEvent?.isHybrid && seatMap?.categories?.length) {
    updateTicketPrice();
  }
};

const updateTicketPrice = () => {
  const selectedType = ticketTypeSelect.value;
  if (selectedType === 'virtual') {
    ticketPriceInput.value = `${Math.round((currentEvent.virtualPriceCents || 1500) / 100)}$`;
    return;
  }
  const category = currentSeatMap?.categories?.find((item) => item.id === selectedType);
  if (category) {
    ticketPriceInput.value = `${Math.round(category.priceCents / 100)}$`;
    return;
  }
  ticketPriceInput.value = 'غير محدد';
};

const renderSeatMap = (seatMap) => {
  currentSeatMap = seatMap;
  if (!seatMap || !seatMap.categories?.length) {
    seatMapContainer.innerHTML = '<p class="muted-text">لا يوجد مخطط مقاعد مرئي لهذه الفعالية.</p>';
    return;
  }

  seatMapContainer.innerHTML = seatMap.categories.map((category) => `
    <div class="seat-category">
      <h4>${category.label} — ${Math.round(category.priceCents / 100)}$</h4>
      <div class="seat-grid">
        ${category.seats.map((seat) => `
          <button type="button" class="seat ${seat.reserved ? 'reserved' : ''} ${selectedSeat?.category === category.id && selectedSeat?.number === seat.number ? 'selected' : ''}" data-category="${category.id}" data-number="${seat.number}" ${seat.reserved ? 'disabled' : ''}>
            ${seat.number}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
};

const showError = (message) => {
  checkoutLoading.textContent = message;
  checkoutContent.classList.add('hidden');
};

const loadCheckout = async () => {
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
    currentEvent = event;
    renderEventSummary(event);
    const seatResponse = await fetch(`/api/events/${encodeURIComponent(eventId)}/seat-map`);
    const seatData = seatResponse.ok ? await seatResponse.json() : null;
    renderSeatMap(seatData?.seatMap);
    renderPriceOptions(event, seatData?.seatMap);
    checkoutLoading.classList.add('hidden');
    checkoutContent.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    showError(err.message || 'حدث خطأ أثناء تحميل صفحة الدفع.');
  }
};

seatMapContainer?.addEventListener('click', (event) => {
  const button = event.target.closest('.seat');
  if (!button || button.disabled) return;
  const category = button.dataset.category;
  const number = Number(button.dataset.number);
  selectedSeat = { category, number };
  Array.from(seatMapContainer.querySelectorAll('.seat')).forEach((btn) => btn.classList.remove('selected'));
  button.classList.add('selected');
  ticketTypeSelect.value = category;
  updateTicketPrice();
});

paymentProviderInput?.addEventListener('change', () => {
  const provider = paymentProviderInput.value;
  if (provider === 'local-wallet') {
    emailInput.placeholder = 'استخدم البريد الإلكتروني لمحفظتك أو رقم الهاتف';
  } else {
    emailInput.placeholder = 'example@mail.com';
  }
});

ticketTypeSelect?.addEventListener('change', updateTicketPrice);

checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  confirmationMessage.innerHTML = '';
  const email = emailInput.value.trim();
  const provider = paymentProviderInput.value;
  const ticketType = ticketTypeSelect.value;
  const isVirtual = ticketType === 'virtual';
  let priceCents = 0;

  if (isVirtual) {
    priceCents = currentEvent.virtualPriceCents || 1500;
  } else {
    const category = currentSeatMap?.categories?.find((item) => item.id === ticketType);
    priceCents = category ? category.priceCents : 0;
  }

  if (!priceCents) {
    confirmationMessage.innerHTML = '<p class="error-text">يرجى اختيار نوع تذكرة صحيح.</p>';
    return;
  }

  if (!isVirtual && !selectedSeat) {
    confirmationMessage.innerHTML = '<p class="error-text">يرجى اختيار مقعد من خريطة القاعة.</p>';
    return;
  }

  const payload = {
    ticketType,
    priceCents,
    paymentProvider: provider,
    email,
    isVirtual,
    seatCategory: isVirtual ? null : selectedSeat.category,
    seatNumber: isVirtual ? null : selectedSeat.number
  };

  try {
    const response = await fetchWithAuth(`/api/events/${encodeURIComponent(eventId)}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل إتمام الحجز.');
    }
    confirmationMessage.innerHTML = `
      <div class="ticket-success">
        <h3>تم تأكيد الحجز!</h3>
        <p>رقم التذكرة: ${data.ticketCode}</p>
        <p>السعر: ${Math.round(data.priceCents / 100)}$</p>
        <p>طريقة الدفع: ${provider === 'local-wallet' ? 'محفظة محلية' : 'بطاقة بنكية'}</p>
        ${data.pdfUrl ? `<a href="${data.pdfUrl}" class="button small secondary" target="_blank">تحميل التذكرة PDF</a>` : ''}
        ${data.qrUrl ? `<a href="${data.qrUrl}" class="button small secondary" target="_blank">عرض QR Code</a>` : ''}
      </div>
    `;
  } catch (err) {
    confirmationMessage.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
});

loadCheckout();
