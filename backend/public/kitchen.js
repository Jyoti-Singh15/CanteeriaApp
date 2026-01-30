const socket = io();
const ordersContainer = document.getElementById('orders-container');
const pendingCount = document.getElementById('pending-count');
const preparingCount = document.getElementById('preparing-count');
const readyCount = document.getElementById('ready-count');
let currentFilter = 'all';
let allOrders = [];

// Fetch initial orders
async function fetchOrders() {
    try {
        const res = await fetch('/api/admin/analytics');
        const data = await res.json();
        allOrders = data.recentOrders || []; // Using recentOrders logic from backend
        renderOrders();
        updateCounts();
    } catch (err) {
        console.error("Failed to fetch orders", err);
    }
}

// Render Orders based on filter
function renderOrders() {
    ordersContainer.innerHTML = '';

    // Sort: Pending -> Preparing -> Ready -> Completed
    const statusPriority = { 'pending': 1, 'preparing': 2, 'ready': 3, 'completed': 4, 'cancelled': 5 };

    let filtered = allOrders.filter(o => {
        if (currentFilter === 'all') return o.status !== 'completed' && o.status !== 'cancelled';
        if (currentFilter === 'completed') return o.status === 'completed';
        return o.status === currentFilter;
    });

    filtered.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    if (filtered.length === 0) {
        ordersContainer.innerHTML = '<p style="text-align:center; width:100%; color:#888; margin-top:50px;">No orders found in this category.</p>';
        return;
    }

    filtered.forEach(order => {
        const card = document.createElement('div');
        card.className = `order-card ${order.status}`;

        let actionButtons = '';
        if (order.status === 'pending') {
            actionButtons = `<button class="btn-action btn-prepare" onclick="updateStatus('${order.id}', 'preparing')">Start Preparing</button>`;
        } else if (order.status === 'preparing') {
            actionButtons = `<button class="btn-action btn-ready" onclick="updateStatus('${order.id}', 'ready')">Ready to Pick Up</button>`;
        } else if (order.status === 'ready') {
            actionButtons = `<button class="btn-action btn-complete" onclick="updateStatus('${order.id}', 'completed')">Confirm Pick Up</button>`;
        } else {
            actionButtons = `<button class="btn-action btn-disabled" disabled>Completed</button>`;
        }

        const date = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
            <div class="card-header">
                <div>
                   <div class="order-id">#${order.id.slice(-4)}</div>
                   <span class="student-name">${order.studentName || 'Student'}</span>
                </div>
                <div class="order-time">${date}</div>
            </div>
            <div class="card-body">
                <ul class="order-items">
                    ${order.items.map(i => `
                        <li>
                            <span><span class="item-qty">${i.quantity}x</span> ${i.name || 'Item'}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="card-footer">
                ${actionButtons}
            </div>
        `;
        ordersContainer.appendChild(card);
    });
}

function updateCounts() {
    pendingCount.textContent = allOrders.filter(o => o.status === 'pending').length;
    preparingCount.textContent = allOrders.filter(o => o.status === 'preparing').length;
    readyCount.textContent = allOrders.filter(o => o.status === 'ready').length;
}

// Update Order Status via API
window.updateStatus = async (id, status) => {
    try {
        await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        // UI will update automatically via Socket.io event
    } catch (err) {
        alert("Failed to update status");
    }
};

// Filter Buttons
document.querySelectorAll('.filter-group button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-group button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderOrders();
    });
});

document.getElementById('refresh-btn').addEventListener('click', fetchOrders);

// Socket Listeners
socket.on('newOrder', (order) => {
    // Add to list if not exists, else update
    // Simple approach: re-fetch to ensure sync
    fetchOrders();
    // Play sound potentially
});

socket.on('orderStatusUpdated', (data) => {
    fetchOrders();
});

// Init
fetchOrders();
