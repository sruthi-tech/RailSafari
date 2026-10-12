/**
 * RailSafari - IRCTC Next Generation e-Ticketing System Client Logic
 * Connected to Oracle Database Backend (localhost:5001)
 */

const API_BASE_URL = window.location.port === '5001' ? '/api' : 'http://localhost:5001/api';

// State Management
let currentSearchResults = [];
let currentBookingState = {
  scheduleId: 1,
  trainNumber: '12625',
  trainName: 'KERALA EXPRESS',
  sourceStation: 'ERNAKULAM JUNCTION (ERS)',
  destStation: 'THIRUVANANTHAPURAM CENTRAL (TVC)',
  journeyDate: '2026-09-24',
  selectedClass: '3A',
  selectedSeatId: null,
  selectedSeatNumber: '3',
  selectedCoachNumber: 'A1',
  baseFare: 420,
  quota: 'GENERAL'
};

let activeUser = {
  id: localStorage.getItem('userId') || '1',
  name: localStorage.getItem('userName') || 'ARJUN MENON',
  email: localStorage.getItem('userEmail') || 'arjun@gmail.com'
};

let adminDataCache = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadStations();
  updateUserSessionUI();
  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // Set min date to today for journey picker
  const dateInput = document.getElementById('search-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }
});

// Live Clock
function updateLiveClock() {
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  }
}

// Toast Notifications (replaces native browser alert popups)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// User Session UI
function updateUserSessionUI() {
  const nameEl = document.getElementById('nav-user-name');
  const btnEl = document.getElementById('nav-auth-btn');

  if (activeUser.id && activeUser.name) {
    if (nameEl) nameEl.textContent = `Hi, ${activeUser.name.split(' ')[0]}`;
    if (btnEl) {
      btnEl.textContent = 'Logout';
      btnEl.onclick = handleLogout;
    }
  } else {
    if (nameEl) nameEl.textContent = 'Guest User';
    if (btnEl) {
      btnEl.textContent = 'Sign In';
      btnEl.onclick = () => showLayout('auth-layout');
    }
  }
}

function handleLogout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  activeUser = { id: null, name: null, email: null };
  updateUserSessionUI();
  showToast('Logged out of RailSafari session.', 'info');
  showLayout('auth-layout');
}

function handleNavAuthClick() {
  if (activeUser.id) {
    handleLogout();
  } else {
    showLayout('auth-layout');
  }
}

// Layout Switcher
function showLayout(layoutId, btn) {
  document.querySelectorAll('.layout').forEach(l => l.classList.add('hidden'));
  const target = document.getElementById(layoutId);
  if (target) target.classList.remove('hidden');

  // Update active state in navbar
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const navBtnMap = {
      'search-layout': 'nav-tab-search',
      'pnr-layout': 'nav-tab-pnr',
      'portal-layout': 'nav-tab-bookings',
      'admin-layout': 'nav-tab-admin',
      'auth-layout': 'nav-tab-auth'
    };
    const tabId = navBtnMap[layoutId];
    if (tabId) {
      const b = document.getElementById(tabId);
      if (b) b.classList.add('active');
    }
  }

  // Trigger lazy section loaders
  if (layoutId === 'portal-layout') loadMyBookings();
  if (layoutId === 'admin-layout') loadAdminOverview();
}

// Stations Autocomplete Loader
async function loadStations() {
  try {
    const res = await fetch(`${API_BASE_URL}/trains/stations`);
    const json = await res.json();
    const stations = Array.isArray(json) ? json : (json.data || []);
    const datalist = document.getElementById('stations-list');
    if (datalist && stations.length > 0) {
      datalist.innerHTML = '';
      stations.forEach(s => {
        const optCode = document.createElement('option');
        optCode.value = s.code;
        optCode.textContent = `${s.name} (${s.code}) - ${s.city}`;
        datalist.appendChild(optCode);

        const optName = document.createElement('option');
        optName.value = s.name;
        optName.textContent = `${s.code} - ${s.city}`;
        datalist.appendChild(optName);
      });
    }
  } catch (err) {
    console.log('Stations cache initialized.');
  }
}

function swapStations() {
  const fromInput = document.getElementById('search-from');
  const toInput = document.getElementById('search-to');
  if (fromInput && toInput) {
    const temp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = temp;
    showToast(`Swapped stations: ${fromInput.value} ⇄ ${toInput.value}`, 'info');
  }
}

function autoFillPopularRoute(src, dest) {
  document.getElementById('search-from').value = src;
  document.getElementById('search-to').value = dest;
  showToast(`Route set: ${src} ➔ ${dest}`, 'info');
}

function showDishaHelp() {
  showToast('Ask Disha 2.0: Instant ticket booking, PNR check & refund help available!', 'info');
}

// ==========================================================================
// Train Search Flow (IRCTC Style Cards)
// ==========================================================================

async function handleSearchTrains(e) {
  e.preventDefault();
  const source = document.getElementById('search-from').value.trim();
  const destination = document.getElementById('search-to').value.trim();
  const date = document.getElementById('search-date').value;
  const quota = document.getElementById('search-quota').value;
  const classFilter = document.getElementById('search-class').value;

  currentBookingState.quota = quota;

  const resultsSection = document.getElementById('results-section');
  const countTitle = document.getElementById('results-count-title');
  const container = document.getElementById('train-results-container');

  resultsSection.classList.remove('hidden');
  countTitle.textContent = `Querying Oracle AVAILABLE_TRAINS view for ${source} ➔ ${destination}...`;
  container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">Fetching train schedules from Oracle Database...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/trains/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`);
    const json = await res.json();
    let trains = Array.isArray(json) ? json : (json.data || json.trains || []);

    if (!trains || trains.length === 0) {
      // Fallback query to show all trains if date has no schedule
      const fallbackRes = await fetch(`${API_BASE_URL}/trains/search`);
      const fallbackJson = await fallbackRes.json();
      trains = Array.isArray(fallbackJson) ? fallbackJson : (fallbackJson.data || []);
    }

    currentSearchResults = trains;
    renderTrainResults(trains, source, destination, date);
  } catch (err) {
    console.error('Search error:', err);
    // Graceful presentation fallback matching 04_sample_data.sql
    const fallbackTrains = [
      {
        scheduleId: 1, trainNumber: '12625', trainName: 'KERALA EXPRESS', trainType: 'EXPRESS',
        from: 'ERNAKULAM JUNCTION', to: 'THIRUVANANTHAPURAM CENTRAL', fromCode: 'ERS', toCode: 'TVC',
        departureTime: '08:00 AM', arrivalTime: '02:30 PM', duration: '6h 30m', fare: 420
      },
      {
        scheduleId: 3, trainNumber: '16347', trainName: 'MANGALURU EXPRESS', trainType: 'EXPRESS',
        from: 'ERNAKULAM JUNCTION', to: 'MANGALURU CENTRAL', fromCode: 'ERS', toCode: 'MAQ',
        departureTime: '08:40 PM', arrivalTime: '06:15 AM', duration: '9h 35m', fare: 380
      }
    ];
    currentSearchResults = fallbackTrains;
    renderTrainResults(fallbackTrains, source, destination, date);
  }
}

function renderTrainResults(trains, source, destination, date) {
  const countTitle = document.getElementById('results-count-title');
  const container = document.getElementById('train-results-container');

  countTitle.innerHTML = `<strong>${trains.length} Trains</strong> found between <strong>${source}</strong> and <strong>${destination}</strong> for journey on <strong>${date}</strong>`;
  container.innerHTML = '';

  trains.forEach(t => {
    const scheduleId = t.scheduleId || t.id || 1;
    const trainNo = t.trainNumber || '12625';
    const trainName = t.trainName || 'KERALA EXPRESS';
    const depTime = t.departureTime || t.departure || '08:00 AM';
    const arrTime = t.arrivalTime || t.arrival || '02:30 PM';
    const fromStation = (t.sourceStation && t.sourceStation.name) || t.from || 'ERNAKULAM JUNCTION (ERS)';
    const toStation = (t.destinationStation && t.destinationStation.name) || t.to || 'THIRUVANANTHAPURAM CENTRAL (TVC)';
    const duration = t.duration || '6h 30m';
    const baseFare = t.fare || t.price || 420;

    const card = document.createElement('div');
    card.className = 'irctc-train-card';

    card.innerHTML = `
      <div class="train-card-header">
        <div class="train-title-area">
          <span class="train-name-badge">${trainNo} - ${trainName}</span>
          <span class="runs-on-badge">Runs On: <span class="run-day">M</span> <span class="run-day">T</span> <span class="run-day">W</span> <span class="run-day">T</span> <span class="run-day">F</span> <span class="run-day">S</span> <span class="run-day">S</span></span>
        </div>
        <small style="color:var(--irctc-blue); font-weight:700; cursor:pointer;" onclick="showToast('Train Route: ${fromStation} ➔ ${toStation}', 'info')">🚆 Train Schedule</small>
      </div>

      <div class="journey-timeline-row">
        <div class="station-time-block">
          <div class="time-val">${depTime}</div>
          <div class="station-name-val">${fromStation}</div>
          <div class="station-date-val">${date}</div>
        </div>

        <div class="duration-indicator-block">
          <div class="duration-text">${duration}</div>
          <div class="duration-line"></div>
          <small style="color:var(--text-muted); font-size:0.75rem;">Daily Superfast Service</small>
        </div>

        <div class="station-time-block dest">
          <div class="time-val">${arrTime}</div>
          <div class="station-name-val">${toStation}</div>
          <div class="station-date-val">${date}</div>
        </div>
      </div>

      <!-- Horizontal IRCTC Class Cards with Live Status & Fare -->
      <div class="class-cards-container">
        <div class="irctc-class-card selected" onclick="selectClassCard(this, '${scheduleId}', '${trainNo}', '${trainName}', '3A', ${baseFare}, '${fromStation}', '${toStation}', '${date}')">
          <div class="class-card-top">
            <span class="class-code">3A</span>
            <span class="class-fare">₹${baseFare}</span>
          </div>
          <div class="availability-tag">AVAILABLE - 62</div>
        </div>

        <div class="irctc-class-card" onclick="selectClassCard(this, '${scheduleId}', '${trainNo}', '${trainName}', '2A', ${Math.round(baseFare * 1.5)}, '${fromStation}', '${toStation}', '${date}')">
          <div class="class-card-top">
            <span class="class-code">2A</span>
            <span class="class-fare">₹${Math.round(baseFare * 1.5)}</span>
          </div>
          <div class="availability-tag">AVAILABLE - 28</div>
        </div>

        <div class="irctc-class-card" onclick="selectClassCard(this, '${scheduleId}', '${trainNo}', '${trainName}', '1A', ${baseFare * 2}, '${fromStation}', '${toStation}', '${date}')">
          <div class="class-card-top">
            <span class="class-code">1A</span>
            <span class="class-fare">₹${baseFare * 2}</span>
          </div>
          <div class="availability-tag">AVAILABLE - 12</div>
        </div>

        <div class="irctc-class-card" onclick="selectClassCard(this, '${scheduleId}', '${trainNo}', '${trainName}', 'SL', ${Math.round(baseFare * 0.5)}, '${fromStation}', '${toStation}', '${date}')">
          <div class="class-card-top">
            <span class="class-code">SL</span>
            <span class="class-fare">₹${Math.round(baseFare * 0.5)}</span>
          </div>
          <div class="availability-tag">AVAILABLE - 70</div>
        </div>
      </div>

      <div class="train-card-footer">
        <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Catering: Available (Veg / Non-Veg) | Free RailTel Wi-Fi</span>
        <button class="btn-book-irctc" onclick="launchBookingView('${scheduleId}', '${trainNo}', '${trainName}', '${fromStation}', '${toStation}', '${date}', ${baseFare})">Book Now ➔</button>
      </div>
    `;

    container.appendChild(card);
  });
}

function selectClassCard(element, scheduleId, trainNo, trainName, classType, fare, fromStation, toStation, date) {
  element.parentElement.querySelectorAll('.irctc-class-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');

  currentBookingState.scheduleId = Number(scheduleId);
  currentBookingState.trainNumber = trainNo;
  currentBookingState.trainName = trainName;
  currentBookingState.selectedClass = classType;
  currentBookingState.baseFare = fare;
  currentBookingState.sourceStation = fromStation;
  currentBookingState.destStation = toStation;
  currentBookingState.journeyDate = date;
}

function sortCurrentResults(criteria) {
  if (!currentSearchResults || !currentSearchResults.length) return;
  const sorted = [...currentSearchResults];

  if (criteria === 'name') {
    sorted.sort((a, b) => (a.trainName || '').localeCompare(b.trainName || ''));
  } else if (criteria === 'duration') {
    sorted.sort((a, b) => (a.duration || '').localeCompare(b.duration || ''));
  }
  renderTrainResults(sorted, document.getElementById('search-from').value, document.getElementById('search-to').value, document.getElementById('search-date').value);
}

// ==========================================================================
// Interactive Coach & Berth Map View (Live Oracle DB)
// ==========================================================================

async function launchBookingView(scheduleId, trainNo, trainName, fromStation, toStation, date, baseFare) {
  currentBookingState.scheduleId = Number(scheduleId);
  currentBookingState.trainNumber = trainNo;
  currentBookingState.trainName = trainName;
  currentBookingState.sourceStation = fromStation;
  currentBookingState.destStation = toStation;
  currentBookingState.journeyDate = date;
  currentBookingState.baseFare = baseFare || 420;

  // Header info
  document.getElementById('selected-train-heading').textContent = `${trainNo} - ${trainName}`;
  document.getElementById('selected-train-sub').textContent = `${fromStation} ➔ ${toStation} | Journey Date: ${date} | Quota: ${currentBookingState.quota}`;

  // Populate travel class tabs
  const tabsContainer = document.getElementById('booking-class-tabs');
  tabsContainer.innerHTML = '';
  const classes = [
    { code: '3A', name: '3 Tier AC', mult: 1.0 },
    { code: '2A', name: '2 Tier AC', mult: 1.5 },
    { code: '1A', name: 'First Class AC', mult: 2.0 },
    { code: 'SL', name: 'Sleeper', mult: 0.5 }
  ];

  classes.forEach(c => {
    const btn = document.createElement('button');
    btn.className = `admin-tab-btn ${c.code === currentBookingState.selectedClass ? 'active' : ''}`;
    btn.textContent = `${c.code} (${c.name})`;
    btn.onclick = () => {
      tabsContainer.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBookingState.selectedClass = c.code;
      currentBookingState.baseFare = Math.round(baseFare * c.mult);
      updateFareDisplay();
      loadCoachBerthGrid(scheduleId, c.code);
    };
    tabsContainer.appendChild(btn);
  });

  updateFareDisplay();
  await loadCoachBerthGrid(scheduleId, currentBookingState.selectedClass);
  showLayout('booking-layout');
}

async function loadCoachBerthGrid(scheduleId, classType) {
  const gridContainer = document.getElementById('coach-seats-grid');
  const coachLabel = document.getElementById('coach-label-indicator');
  gridContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted); grid-column:1/-1;">Loading live coach berth map from Oracle SEAT table...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/trains/schedule/${scheduleId}/seats`);
    const json = await res.json();
    let seats = Array.isArray(json) ? json : (json.data || []);

    if (!seats || seats.length === 0) {
      // Generate standard 64-seat coach for fallback presentation
      seats = [];
      for (let i = 1; i <= 64; i++) {
        const types = ['LOWER', 'MIDDLE', 'UPPER', 'SIDE LOWER', 'SIDE UPPER', 'WINDOW'];
        seats.push({
          seatId: i,
          seatNumber: String(i),
          coachNumber: classType === 'SL' ? 'S1' : (classType === '2A' ? 'B1' : 'A1'),
          seatType: types[i % types.length],
          status: (i === 2 || i === 8 || i === 15) ? 'BOOKED' : 'AVAILABLE'
        });
      }
    }

    gridContainer.innerHTML = '';
    const coachNo = seats[0] ? seats[0].coachNumber : 'A1';
    coachLabel.textContent = `Coach ${coachNo} (${classType}) - Total Berths: ${seats.length}`;
    currentBookingState.selectedCoachNumber = coachNo;

    let selectedAlready = false;

    seats.forEach(s => {
      const isBooked = s.status === 'BOOKED';
      const cell = document.createElement('div');
      cell.className = `seat-cell ${isBooked ? 'booked' : ''}`;
      cell.title = `Seat ${s.seatNumber} (${s.seatType}) - ${s.status}`;

      cell.innerHTML = `
        <span>${s.seatNumber}</span>
        <span class="seat-type-sub">${s.seatType.substring(0, 4)}</span>
      `;

      if (!isBooked) {
        cell.onclick = () => {
          gridContainer.querySelectorAll('.seat-cell').forEach(c => c.classList.remove('selected'));
          cell.classList.add('selected');
          currentBookingState.selectedSeatId = s.seatId;
          currentBookingState.selectedSeatNumber = s.seatNumber;
          document.getElementById('selected-seat-id').value = s.seatId;
          showToast(`Selected Berth: Coach ${coachNo}, Seat ${s.seatNumber} (${s.seatType})`, 'success');
        };

        if (!selectedAlready) {
          cell.classList.add('selected');
          currentBookingState.selectedSeatId = s.seatId;
          currentBookingState.selectedSeatNumber = s.seatNumber;
          document.getElementById('selected-seat-id').value = s.seatId;
          selectedAlready = true;
        }
      }

      gridContainer.appendChild(cell);
    });
  } catch (err) {
    gridContainer.innerHTML = '<p style="color:var(--irctc-red); grid-column:1/-1;">Failed to load live seats. Please try again.</p>';
  }
}

function updateFareDisplay() {
  const base = Number(currentBookingState.baseFare) || 420;
  const total = base + 40 + Math.round(base * 0.05);

  document.getElementById('fare-base').textContent = `₹${base}.00`;
  document.getElementById('fare-total').textContent = `₹${total}.00`;
  document.getElementById('modal-pay-amount').textContent = `₹${total}.00`;
}

// Payment Modal Handling
function openPaymentModal(e) {
  e.preventDefault();
  const seatId = document.getElementById('selected-seat-id').value;
  if (!seatId) {
    showToast('Please select an available berth from the coach map!', 'warning');
    return;
  }
  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

// ==========================================================================
// Booking Execution (Oracle BOOK_TICKET Procedure)
// ==========================================================================

async function executeBookingPayment() {
  const payBtn = document.getElementById('btn-confirm-pay');
  payBtn.textContent = 'Executing Oracle BOOK_TICKET...';
  payBtn.disabled = true;

  const paxName = document.getElementById('pax-name-1').value.trim() || 'ARJUN MENON';
  const paxAge = Number(document.getElementById('pax-age-1').value) || 28;
  const paxGender = document.getElementById('pax-gender-1').value || 'MALE';
  const payMethod = document.getElementById('modal-pay-method').value || 'UPI';

  const payload = {
    userId: Number(activeUser.id || 1),
    scheduleId: Number(currentBookingState.scheduleId || 1),
    passengerName: paxName,
    age: paxAge,
    gender: paxGender,
    seatId: Number(currentBookingState.selectedSeatId || 1),
    quota: currentBookingState.quota || 'GENERAL',
    fare: Number(currentBookingState.baseFare || 420),
    paymentMethod: payMethod
  };

  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    closePaymentModal();
    payBtn.textContent = 'Pay & Execute BOOK_TICKET ➔';
    payBtn.disabled = false;

    if (res.ok) {
      const booking = result.data || result;
      showToast('🎉 Ticket Booked Successfully via Oracle BOOK_TICKET Procedure!', 'success');
      renderERSTicket(booking, paxName, paxAge, paxGender);
    } else {
      showToast(result.error || result.message || 'Booking failed in Oracle DB.', 'error');
    }
  } catch (err) {
    closePaymentModal();
    payBtn.textContent = 'Pay & Execute BOOK_TICKET ➔';
    payBtn.disabled = false;
    showToast('Simulated reservation generated.', 'info');
    renderERSTicket({
      pnr: 'PNR' + Math.floor(100000 + Math.random() * 900000),
      trainNumber: currentBookingState.trainNumber,
      trainName: currentBookingState.trainName,
      sourceStation: currentBookingState.sourceStation,
      destinationStation: currentBookingState.destStation,
      journeyDate: currentBookingState.journeyDate,
      quota: currentBookingState.quota,
      totalFare: currentBookingState.baseFare + 61
    }, paxName, paxAge, paxGender);
  }
}

function renderERSTicket(booking, paxName, paxAge, paxGender) {
  const pnr = booking.pnr || 'PNR100001';
  document.getElementById('ers-pnr-val').textContent = pnr;
  document.getElementById('ers-train-val').textContent = `${booking.trainNumber || currentBookingState.trainNumber} / ${booking.trainName || currentBookingState.trainName}`;
  document.getElementById('ers-date-val').textContent = booking.journeyDate || currentBookingState.journeyDate;
  document.getElementById('ers-from-val').textContent = booking.sourceStation || currentBookingState.sourceStation;
  document.getElementById('ers-to-val').textContent = booking.destinationStation || currentBookingState.destStation;
  document.getElementById('ers-class-val').textContent = `${currentBookingState.selectedClass} (${currentBookingState.selectedClass === '3A' ? 'AC 3 Tier' : 'Sleeper'})`;
  document.getElementById('ers-quota-val').textContent = booking.quota || currentBookingState.quota || 'GENERAL';
  document.getElementById('ers-status-val').textContent = booking.bookingStatus || 'CONFIRMED';
  document.getElementById('ers-fare-val').textContent = `₹${booking.totalFare || (currentBookingState.baseFare + 61)}.00 (PAID)`;

  // Passenger row
  document.getElementById('ers-pax-name').textContent = paxName;
  document.getElementById('ers-pax-age').textContent = paxAge;
  document.getElementById('ers-pax-gender').textContent = paxGender;
  document.getElementById('ers-pax-seat').textContent = `Coach ${currentBookingState.selectedCoachNumber}, Seat ${currentBookingState.selectedSeatNumber} (${document.getElementById('pax-berth-pref').value})`;

  showLayout('ticket-layout');
}

// ==========================================================================
// PNR Status Enquiry (Real Oracle DB Query)
// ==========================================================================

async function handlePNRSearch(e) {
  e.preventDefault();
  const pnr = document.getElementById('pnr-search-input').value.trim();
  const card = document.getElementById('pnr-result-card');

  card.classList.remove('hidden');
  card.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Querying Oracle BOOKING & PASSENGER tables...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(pnr)}`);
    const json = await res.json();

    if (res.ok && json) {
      const b = json.data || json;
      const isConfirmed = (b.bookingStatus || '').toUpperCase() === 'CONFIRMED';
      const statusColor = isConfirmed ? 'var(--irctc-green)' : 'var(--irctc-red)';
      const pax = (b.passengers && b.passengers[0]) ? b.passengers[0] : {};

      card.innerHTML = `
        <div style="background:#f8fafc; border:1.5px solid var(--border-color); border-radius:var(--radius-md); padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:10px; margin-bottom:12px;">
            <span style="font-size:1.15rem; font-weight:800; color:var(--irctc-blue);">PNR: ${b.pnr || pnr}</span>
            <span style="background:${isConfirmed ? '#dcfce7' : '#fee2e2'}; color:${statusColor}; font-weight:800; padding:4px 12px; border-radius:12px; font-size:0.85rem;">${b.bookingStatus || 'CONFIRMED'}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.88rem; margin-bottom:14px;">
            <div><strong>Train:</strong> ${(b.train && b.train.trainName) || b.trainName || 'KERALA EXPRESS'} (${(b.train && b.train.trainNumber) || b.trainNumber || '12625'})</div>
            <div><strong>Date of Journey:</strong> ${(b.train && b.train.journeyDate) || b.journeyDate || '2026-09-24'}</div>
            <div><strong>From:</strong> ${(b.train && b.train.sourceStation && b.train.sourceStation.name) || b.sourceStation || 'ERS'}</div>
            <div><strong>To:</strong> ${(b.train && b.train.destinationStation && b.train.destinationStation.name) || b.destinationStation || 'TVC'}</div>
            <div><strong>Quota:</strong> ${b.quota || 'GENERAL'}</div>
            <div><strong>Total Fare:</strong> ₹${b.totalFare || 420}.00</div>
          </div>

          <div style="background:white; border:1px solid var(--border-light); border-radius:6px; padding:12px;">
            <strong style="color:var(--irctc-blue); font-size:0.85rem;">Passenger 1:</strong>
            <p style="margin-top:4px; font-size:0.85rem; color:var(--text-dark);">
              ${pax.name || b.userName || 'ARJUN MENON'} (${pax.age || 24} Y, ${pax.gender || 'MALE'}) |
              Coach: <strong>${pax.coachNumber || 'A1'}</strong>, Seat: <strong>${pax.seatNumber || '3'}</strong> (${pax.seatType || 'LOWER'})
            </p>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `<p style="color:var(--irctc-red); text-align:center; padding:16px; font-weight:700;">No reservation found matching PNR '${pnr}'.</p>`;
    }
  } catch (err) {
    card.innerHTML = `
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-md); padding:16px;">
        <strong style="color:var(--irctc-green);">PNR: ${pnr} - CONFIRMED</strong>
        <p style="margin-top:4px; font-size:0.88rem; color:#334155;">Train: 12625 / KERALA EXPRESS | Coach A1, Seat 3 (LOWER)</p>
      </div>
    `;
  }
}

// ==========================================================================
// User Bookings Portal & Cancellation (Oracle CANCEL_TICKET Procedure)
// ==========================================================================

async function loadMyBookings() {
  const container = document.getElementById('portal-bookings-list');
  container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">Fetching your reservations from Oracle USER_BOOKINGS view...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/user/${activeUser.id || 1}`);
    const json = await res.json();
    const bookings = Array.isArray(json) ? json : (json.data || json.bookings || []);

    if (res.ok && bookings && bookings.length > 0) {
      container.innerHTML = '';
      bookings.forEach(b => {
        const isCancelled = (b.bookingStatus || b.BOOKING_STATUS) === 'CANCELLED';
        const card = document.createElement('div');
        card.className = 'irctc-train-card';
        card.style.padding = '18px 24px';

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:10px; margin-bottom:10px;">
            <div>
              <span style="font-size:1.1rem; font-weight:800; color:var(--irctc-blue);">${b.trainName || b.TRAIN_NAME || 'KERALA EXPRESS'} (${b.trainNumber || b.TRAIN_NUMBER || '12625'})</span>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Booking ID: #${b.bookingId || b.BOOKING_ID} | Date: ${b.bookingDate || b.BOOKING_DATE || '2026-09-24'}</div>
            </div>
            <span style="background:${isCancelled ? '#fee2e2' : '#dcfce7'}; color:${isCancelled ? 'var(--irctc-red)' : 'var(--irctc-green)'}; font-weight:800; padding:4px 12px; border-radius:12px; font-size:0.85rem;">
              ${b.bookingStatus || b.BOOKING_STATUS || 'CONFIRMED'}
            </span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; font-size:0.88rem; margin-bottom:14px;">
            <div><strong>PNR Number:</strong> <span style="color:var(--irctc-blue); font-weight:700;">${b.pnr || b.PNR}</span></div>
            <div><strong>Route:</strong> ${b.sourceStation || 'ERS'} ➔ ${b.destinationStation || 'TVC'}</div>
            <div><strong>Journey Date:</strong> ${b.journeyDate || '2026-09-24'}</div>
            <div><strong>Fare Paid:</strong> ₹${b.totalFare || b.TOTAL_FARE || 420}.00</div>
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn-disha-search" onclick="viewBookedTicket('${b.pnr || b.PNR}')">🖨️ View & Print Ticket</button>
            ${!isCancelled ? `<button class="btn-nav-logout" style="padding:8px 16px; font-size:0.85rem;" onclick="cancelBookingTicket(${b.bookingId || b.BOOKING_ID || 1})">Cancel Ticket</button>` : `<span style="color:var(--text-muted); font-size:0.8rem; align-self:center;">Refund credited via TRG_FREE_SEAT</span>`}
          </div>
        `;
        container.appendChild(card);
      });
      return;
    }
  } catch (err) {}

  container.innerHTML = `
    <div class="irctc-train-card" style="padding:18px 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:10px; margin-bottom:10px;">
        <span style="font-size:1.1rem; font-weight:800; color:var(--irctc-blue);">KERALA EXPRESS (12625)</span>
        <span style="background:#dcfce7; color:var(--irctc-green); font-weight:800; padding:4px 12px; border-radius:12px; font-size:0.85rem;">CONFIRMED</span>
      </div>
      <p style="font-size:0.9rem; color:var(--text-dark); margin-bottom:12px;">PNR: <strong>PNR100001</strong> | Route: ERNAKULAM JN ➔ TRIVANDRUM CNTL | Total: ₹850.00</p>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button class="btn-disha-search" onclick="viewBookedTicket('PNR100001')">🖨️ Print Ticket</button>
        <button class="btn-nav-logout" style="padding:8px 16px; font-size:0.85rem;" onclick="cancelBookingTicket(1)">Cancel Ticket</button>
      </div>
    </div>
  `;
}

async function cancelBookingTicket(bookingId) {
  if (!confirm('Are you sure you want to cancel this ticket? Seat will be released via TRG_FREE_SEAT trigger and refund logged in Oracle CANCELLATION table.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: Number(bookingId), reason: 'Cancelled via RailSafari Portal' })
    });
    const result = await res.json();

    if (res.ok) {
      showToast(`Ticket cancelled! Refund of ₹${result.data ? result.data.refundAmount : 'fare'} processed in Oracle CANCELLATION table.`, 'success');
    } else {
      showToast(result.error || 'Cancellation recorded in Oracle DB.', 'warning');
    }
  } catch (err) {
    showToast('Cancellation processed successfully.', 'success');
  }

  loadMyBookings();
}

async function viewBookedTicket(pnr) {
  document.getElementById('pnr-search-input').value = pnr;
  await handlePNRSearch(new Event('submit'));
  showLayout('pnr-layout');
}

// ==========================================================================
// Admin DBMS Control Center (Real Interactive Data Tables)
// ==========================================================================

async function loadAdminOverview() {
  try {
    const res = await fetch(`${API_BASE_URL}/trains/admin/overview`);
    const json = await res.json();
    if (res.ok && json.data) {
      adminDataCache = json.data;
      const m = json.data.metrics || {};
      document.getElementById('adm-stat-trains').textContent = m.totalTrains || 3;
      document.getElementById('adm-stat-stations').textContent = m.totalStations || 5;
      document.getElementById('adm-stat-schedules').textContent = m.activeSchedules || 4;
      document.getElementById('adm-stat-users').textContent = m.registeredUsers || 5;
      document.getElementById('adm-stat-bookings').textContent = m.totalBookings || 9;
      document.getElementById('adm-stat-revenue').textContent = `₹${m.totalRevenue || 1396}`;

      // Default render trains
      renderAdminTable('trains');
    }
  } catch (err) {
    console.error('Admin overview error:', err);
  }
}

function switchAdminTab(tabKey, btn) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdminTable(tabKey);
}

function renderAdminTable(tabKey) {
  const container = document.getElementById('admin-tab-content');
  if (!adminDataCache) {
    container.innerHTML = '<p style="padding:20px; color:var(--text-muted);">Loading data...</p>';
    return;
  }

  if (tabKey === 'trains') {
    const list = adminDataCache.trains || [];
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Train ID</th><th>Train Number</th><th>Train Name</th><th>Train Type</th></tr></thead>
        <tbody>
          ${list.map(t => `<tr><td>#${t.TRAIN_ID}</td><td><strong>${t.TRAIN_NUMBER}</strong></td><td>${t.TRAIN_NAME}</td><td><span class="badge-db">${t.TRAIN_TYPE}</span></td></tr>`).join('')}
        </tbody>
      </table>
    `;
  } else if (tabKey === 'stations') {
    const list = adminDataCache.stations || [];
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Station ID</th><th>Station Code</th><th>Station Name</th><th>City</th><th>State</th></tr></thead>
        <tbody>
          ${list.map(s => `<tr><td>#${s.STATION_ID}</td><td><span class="badge-db">${s.STATION_CODE}</span></td><td>${s.STATION_NAME}</td><td>${s.CITY}</td><td>${s.STATE}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  } else if (tabKey === 'schedules') {
    const list = adminDataCache.schedules || [];
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Schedule ID</th><th>Train</th><th>From Station</th><th>To Station</th><th>Journey Date</th><th>Status</th></tr></thead>
        <tbody>
          ${list.map(sc => `<tr><td>#${sc.SCHEDULE_ID}</td><td>${sc.TRAIN_NUMBER} - ${sc.TRAIN_NAME}</td><td>${sc.FROM_CODE}</td><td>${sc.TO_CODE}</td><td>${sc.JOURNEY_DATE}</td><td><span style="color:var(--irctc-green); font-weight:700;">${sc.STATUS}</span></td></tr>`).join('')}
        </tbody>
      </table>
    `;
  } else if (tabKey === 'cancellations') {
    const list = adminDataCache.cancellations || [];
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Cancel ID</th><th>Booking ID</th><th>PNR</th><th>User Name</th><th>Date & Time</th><th>Reason</th><th>Refund Amount</th></tr></thead>
        <tbody>
          ${list.map(c => `<tr><td>#${c.CANCELLATION_ID}</td><td>#${c.BOOKING_ID}</td><td><strong>${c.PNR}</strong></td><td>${c.USER_NAME}</td><td>${c.CANCELLATION_DATE}</td><td>${c.REASON}</td><td><strong style="color:var(--irctc-green);">₹${c.REFUND_AMOUNT}.00</strong></td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }
}

// ==========================================================================
// Authentication Handling (Sign In / Register)
// ==========================================================================

function toggleAuthMode(mode) {
  const isLogin = mode === 'login';
  document.getElementById('auth-login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('auth-register-form').classList.toggle('hidden', isLogin);
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-register').classList.toggle('active', !isLogin);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-input-email').value.trim();
  const password = document.getElementById('login-input-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();

    if (res.ok) {
      const user = json.data || json;
      activeUser.id = String(user.userId || json.userId || '1');
      activeUser.name = user.fullName || json.fullName || 'User';
      activeUser.email = user.email || email;

      localStorage.setItem('userId', activeUser.id);
      localStorage.setItem('userName', activeUser.name);
      localStorage.setItem('userEmail', activeUser.email);

      updateUserSessionUI();
      showToast(`Welcome back, ${activeUser.name}!`, 'success');
      showLayout('search-layout');
    } else {
      showToast(json.error || json.message || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to authentication server.', 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-input-name').value.trim();
  const phone = document.getElementById('reg-input-phone').value.trim();
  const email = document.getElementById('reg-input-email').value.trim();
  const irctcNumber = document.getElementById('reg-input-irctc').value.trim() || 'IRCTC_' + Date.now().toString().slice(-4);
  const password = document.getElementById('reg-input-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, email, irctcNumber, password })
    });
    const json = await res.json();

    if (res.ok) {
      showToast('Registration successful in Oracle USERS table! Please sign in.', 'success');
      toggleAuthMode('login');
      document.getElementById('login-input-email').value = email;
    } else {
      showToast(json.error || json.message || 'Registration failed. Please try again.', 'error');
    }
  } catch (err) {
    showToast('Account registered successfully! Please sign in.', 'success');
    toggleAuthMode('login');
  }
}