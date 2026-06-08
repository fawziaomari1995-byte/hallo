const activeTicketsContainer = document.getElementById('activeTickets');
const historyTicketsContainer = document.getElementById('historyTickets');
const profileLoginNotice = document.getElementById('profileLoginNotice');
const logoutButton = document.getElementById('logoutButton');

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
  return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};

const showLoginMessage = () => {
  profileLoginNotice.classList.remove('hidden');
  activeTicketsContainer.innerHTML = '';
  historyTicketsContainer.innerHTML = '';
};

const renderTicketCard = (ticket) => {
  const eventDate = ticket.eventDate ? formatDate(ticket.eventDate) : 'غير محدد';
  const price = Math.round(ticket.priceCents / 100);
  return `
    <article class="ticket-card">
      <h3>${ticket.eventTitle}</h3>
      <p><strong>التاريخ:</strong> ${eventDate}</p>
      <p><strong>نوع التذكرة:</strong> ${ticket.ticketType || 'عام'}</p>
      <p><strong>المقعد:</strong> ${ticket.seatCategory || 'افتراضي'} - ${ticket.seatNumber || '-'}</p>
      <p><strong>السعر:</strong> ${price}$</p>
      <p><strong>مزود الدفع:</strong> ${ticket.paymentProvider || 'بطاقة بنكية'}</p>
      <p><strong>الحالة:</strong> ${ticket.status}</p>
      <div class="button-row ticket-actions-row">
        ${ticket.pdfUrl ? `<a href="${ticket.pdfUrl}" class="button small secondary" target="_blank">تحميل PDF</a>` : ''}
        ${ticket.qrUrl ? `<a href="${ticket.qrUrl}" class="button small secondary" target="_blank">عرض QR</a>` : ''}
        <a href="/event.html?id=${ticket.eventId}" class="button small primary">تفاصيل الفعالية</a>
        ${ticket.reviewed
          ? '<span class="button small secondary">تم التقييم</span>'
          : `<a href="/event.html?id=${ticket.eventId}" class="button small primary">أضف تقييم</a>`
        }
      </div>
    </article>
  `;
};

const loadProfileData = async () => {
  const token = getAuthToken();
  if (!token) {
    showLoginMessage();
    return;
  }

  try {
    const [activeRes, historyRes] = await Promise.all([
      fetchWithAuth('/api/users/me/tickets'),
      fetchWithAuth('/api/users/me/history')
    ]);

    if (!activeRes.ok || !historyRes.ok) {
      throw new Error('فشل استرجاع بيانات الحساب.');
    }

    const activeTickets = await activeRes.json();
    const historyTickets = await historyRes.json();

    activeTicketsContainer.innerHTML = activeTickets.length
      ? activeTickets.map(renderTicketCard).join('')
      : '<p class="muted-text">لا توجد تذاكر نشطة حالياً.</p>';

    historyTicketsContainer.innerHTML = historyTickets.length
      ? historyTickets.map(renderTicketCard).join('')
      : '<p class="muted-text">لا توجد فعاليات سابقة في الأرشيف.</p>';
  } catch (err) {
    console.error(err);
    activeTicketsContainer.innerHTML = '<p class="error-text">حدث خطأ أثناء تحميل بياناتك.</p>';
    historyTicketsContainer.innerHTML = '<p class="error-text">حدث خطأ أثناء تحميل الأرشيف.</p>';
  }
};

logoutButton?.addEventListener('click', async () => {
  const token = getAuthToken();
  if (token) {
    try {
      await fetchWithAuth('/api/logout', { method: 'POST' });
    } catch (err) {
      console.warn(err);
    }
  }
  localStorage.removeItem('eventAppSession');
  window.location.href = '/';
});

loadProfileData();
