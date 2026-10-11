const API_BASE_URL = 'http://localhost:5000/api';
let currentTrain = null;
let currentBookingData = null;

// Close Language Modal
function closeModal() {
  document.getElementById('alert-modal').classList.add('hidden');
}

// Live Clock
setInterval(() => {
  const timeEl = document.getElementById('live-time');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `${now.toLocaleDateString()} [${now.toLocaleTimeString()}]`;
  }
}, 1000);

// Layout Navigation
function showLayout(layoutId) {
  document.querySelectorAll('.layout').forEach(el => el.classList.add('hidden'));
  document.getElementById(layoutId).classList.remove('hidden');

  if (layoutId === 'portal-layout') {
    loadMyBookings();
  }
}

// Auth Tabs
function toggleAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

// Payment Tabs Switcher
function switchPayTab(method) {
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('pay-upi-view').classList.add('hidden');
  document.getElementById('pay-card-view').classList.add('hidden');
  document.getElementById('pay-net-view').classList.add('hidden');

  if (method === 'upi') {
    document.querySelectorAll('.pay-tab')[0].classList.add('active');
    document.getElementById('pay-upi-view').classList.remove('hidden');
  } else if (method === 'card') {
    document.querySelectorAll('.pay-tab')[1].classList.add('active');
    document.getElementById('pay-card-view').classList.remove('hidden');
  } else {
    document.querySelectorAll('.pay-tab')[2].classList.add('active');
    document.getElementById('pay-net-view').classList.remove('hidden');
  }
}

// Auth API Calls
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) alert('Login Successful!');
  } catch (err) {
    alert('Connected to demo session. Opening RailSafari Dashboard.');
  }
  showLayout('dashboard-layout');
}

async function handleSignup(e) {
  e.preventDefault();
  alert('Account created successfully! Please sign in.');
  toggleAuthTab('login');
}

// Search Trains
async function handleSearchTrains(e) {
  e.preventDefault();
  const from = document.getElementById('search-from').value;
  const to = document.getElementById('search-to').value;
  const date = document.getElementById('search-date').value;

  const resultsDiv = document.getElementById('train-results');
  resultsDiv.innerHTML = '<p style="text-align:center; padding:20px;">Searching RailSafari Oracle Database...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/trains/search?from=${from}&to=${to}&date=${date}`);
    const trains = await res.json();
    resultsDiv.innerHTML = '';
    trains.forEach(t => renderTrainCard(t, resultsDiv));
  } catch (err) {
    resultsDiv.innerHTML = '';
    renderTrainCard({ TRAIN_NO: '20901', TRAIN_NAME: 'VANDE BHARAT EXPRESS', DEPARTURE_TIME: '06:00 AM', ARRIVAL_TIME: '12:25 PM' }, resultsDiv);
    renderTrainCard({ TRAIN_NO: '12951', TRAIN_NAME: 'RAJDHANI EXPRESS', DEPARTURE_TIME: '04:55 PM', ARRIVAL_TIME: '08:35 AM' }, resultsDiv);
  }
}

function renderTrainCard(train, container) {
  const card = document.createElement('div');
  card.className = 'train-result-card';
  card.innerHTML = `
    <div>
      <h3>${train.TRAIN_NAME} (${train.TRAIN_NO})</h3>
      <p>Departs: ${train.DEPARTURE_TIME} | Arrives: ${train.ARRIVAL_TIME}</p>
    </div>
    <button class="btn-search-orange" style="width: auto; padding: 8px 16px;" onclick="startBooking('${train.TRAIN_NO}', '${train.TRAIN_NAME}')">BOOK NOW</button>
  `;
  container.appendChild(card);
}

// Booking & Seat Picker
function startBooking(trainNo, trainName) {
  currentTrain = { trainNo, trainName };
  document.getElementById('selected-train-info').innerHTML = `<strong>Selected Train:</strong> ${trainName} (${trainNo})`;

  const seatGrid = document.getElementById('seat-grid');
  seatGrid.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement('div');
    btn.className = 'seat-btn';
    btn.textContent = `S-${i}`;
    btn.onclick = () => selectSeat(btn, `S-${i}`);
    seatGrid.appendChild(btn);
  }

  showLayout('booking-layout');
}

function selectSeat(btn, seatNo) {
  document.querySelectorAll('.seat-btn').forEach(s => s.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('selected-seat-no').value = seatNo;
}

// Open Payment Modal
function openPaymentModal(e) {
  e.preventDefault();
  const seatNo = document.getElementById('selected-seat-no').value;
  if (!seatNo) {
    alert('Please select a seat from the grid first!');
    return;
  }

  currentBookingData = {
    name: document.getElementById('pass-name').value,
    age: document.getElementById('pass-age').value,
    gender: document.getElementById('pass-gender').value,
    seatNo: seatNo
  };

  document.getElementById('payment-modal').classList.remove('hidden');
}

function cancelPayment() {
  document.getElementById('payment-modal').classList.add('hidden');
}

// Process Payment & Generate Final E-Ticket
async function processPayment(e) {
  e.preventDefault();
  const payBtn = document.getElementById('pay-btn');
  payBtn.textContent = 'Processing Payment...';
  payBtn.disabled = true;

  setTimeout(async () => {
    payBtn.textContent = 'Make Payment & Confirm Ticket';
    payBtn.disabled = false;
    document.getElementById('payment-modal').classList.add('hidden');

    const pnr = 'PNR' + Math.floor(10000000 + Math.random() * 90000000);

    // Call Backend API to save booking
    try {
      await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pnr,
          passengerName: currentBookingData.name,
          seatNumber: currentBookingData.seatNo,
          trainId: currentTrain.trainNo,
          amount: 525
        })
      });
    } catch (err) {
      console.log('Saved to demo session');
    }

    // Display Digital Ticket
    document.getElementById('t-pnr').textContent = pnr;
    document.getElementById('t-name').textContent = currentBookingData.name;
    document.getElementById('t-age').textContent = currentBookingData.age;
    document.getElementById('t-gender').textContent = currentBookingData.gender;
    document.getElementById('t-train').textContent = `${currentTrain.trainName} (${currentTrain.trainNo})`;
    document.getElementById('t-seat').textContent = currentBookingData.seatNo;

    document.getElementById('booking-form').classList.add('hidden');
    document.getElementById('ticket-container').classList.remove('hidden');
  }, 1200);
}

// Load My Bookings
function loadMyBookings() {
  const container = document.getElementById('my-bookings-list');
  container.innerHTML = `
    <div class="train-result-card">
      <div>
        <h3>VANDE BHARAT EXPRESS (20901)</h3>
        <p>PNR: 849204821 | Seat: S-3 | Status: <strong style="color:#059669;">PAID / CONFIRMED</strong></p>
      </div>
      <button class="btn-dark-blue" onclick="alert('Ticket Cancellation Request Sent!')">Cancel</button>
    </div>
  `;
}