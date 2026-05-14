// ==========================================
// 1. VARIABEL GLOBAL & KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null, userProfile = null, isAuthLogin = true;
let tabSebelumnya = 'home';
let dataRipperGlobal = [], isRipperExpanded = localStorage.getItem('statusLihatSemua') === 'true';
let viewedUserId = null; 

let allVideosData = []; 
let newUploads = []; 
let obs = null, activeVideoId = null, lastTap = 0, isGlobalMuted = true;
let replyingToId = null, replyingToName = null;
let currentVideoIndex = 0; 
const BATCH_SIZE = 5; 

let activeChatUserId = null;
let messageSubscription = null;
let globalMessageSubscription = null;
let presenceChannel = null;
let onlineUsersMap = new Map();
let selectedMessageId = null;
let blockedUsersList = [];
let typingTimer;
let activeGroupId = null; 
let activeGroupRole = 'member'; 
let currentProfileVideos = [];
let profileFeedIndex = 0;
let floatObs = null;

const services = [
    { id: 1, name: 'Joki Ballroom', price: 7500, label: '', desc: 'Estimasi pengerjaan 2 jam.' },
    { id: 2, name: 'Paket Joki AFK (Island/Japan/Hawai)', price: 65000, label: '', desc: 'Sesuai spek dan pesanan.' },
    { id: 3, name: 'Joki War Tari', price: 7500, label: '/hari', desc: '4x-5x play score max. Sesuai req lagu.' }
];

const faqs = [
    { t: "Berapa lama proses joki?", j: "Joki Ballroom memakan waktu sekitar 2 jam. Admin akan menginfokan detailnya di WA." },
    { t: "Apakah akun aman tidak kena Banned?", j: "100% Aman. Joki dikerjakan murni manual oleh player profesional." },
    { t: "Apakah harga Pricelist sudah termasuk biaya admin?", j: "Ya, sudah Include biaya Rekber NIKKY." }
];

// ==========================================
// 2. FUNGSI UTILITIES (ALAT BANTU UI)
// ==========================================
function formatCaption(text) {
    if(!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br>");
}

function timeAgo(dateString) {
    if (!dateString) return "Baru saja";
    const past = new Date(dateString);
    if (isNaN(past.getTime())) return "Beberapa saat lalu";
    const now = new Date();
    const seconds = Math.floor((now - past) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " tahun lalu";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " bulan lalu";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " hari lalu";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " jam lalu";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " menit lalu";
    
    return "Baru saja";
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgColor = 'bg-[#1A1133] border-brand-info/50';
    let icon = '<i class="fas fa-info-circle text-brand-info mr-3 text-lg"></i>';
    if(type === 'error') { bgColor = 'bg-[#2A0815] border-red-500/50'; icon = '<i class="fas fa-exclamation-circle text-red-500 mr-3 text-lg"></i>'; }
    if(type === 'success') { bgColor = 'bg-[#0A2010] border-[#25D366]/50'; icon = '<i class="fas fa-check-circle text-[#25D366] mr-3 text-lg"></i>'; }

    toast.className = `flex items-center px-5 py-3.5 rounded-2xl border shadow-2xl text-xs font-bold text-white toast-anim w-[90%] max-w-sm glass ${bgColor} cursor-pointer touch-none`;
    toast.innerHTML = `${icon} <span class="leading-snug">${message}</span>`;
    
    let startY = 0;
    toast.addEventListener('touchstart', e => { startY = e.touches[0].clientY; });
    toast.addEventListener('touchmove', e => {
        let moveY = e.touches[0].clientY;
        if (startY - moveY > 20) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.9)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    });
    toast.onclick = () => { toast.remove(); };

    container.appendChild(toast);
    
    setTimeout(() => {
        if(document.body.contains(toast)){
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.9)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

function customPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-prompt');
        const titleEl = document.getElementById('prompt-title');
        const inputEl = document.getElementById('prompt-input');
        const btnOk = document.getElementById('prompt-ok');
        const btnCancel = document.getElementById('prompt-cancel');

        titleEl.innerText = title;
        inputEl.value = defaultValue;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        inputEl.focus();

        const cleanup = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { cleanup(); resolve(inputEl.value); };
        btnCancel.onclick = () => { cleanup(); resolve(null); };
    });
}

function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function openLightbox(imgUrl) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    img.src = imgUrl;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    img.classList.remove('scale-95');
    img.classList.add('scale-100');
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    modal.classList.add('opacity-0');
    img.classList.remove('scale-100');
    img.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        img.src = '';
    }, 300);
}

// ==========================================
// 3. FUNGSI NAVIGASI TABS
// ==========================================
function switchTab(tabId, event = null, isPush = true) {
    if (event) event.preventDefault();
    
    if (tabId === 'profile' && event !== null && currentUser) {
        if (viewedUserId !== currentUser.id) {
            viewedUserId = currentUser.id;
            openUserProfile(currentUser.id);
            return; 
        }
    }

    if (tabId !== 'profile' && tabId !== 'pembayaran' && tabId !== 'upload') {tabSebelumnya = tabId;} 
    if (tabId === 'layanan' && isPush && document.getElementById('pembayaran').classList.contains('active')) {
        window.scrollTo({ top: 0, behavior: 'smooth' }); return; 
    }

    const targetSection = document.getElementById(tabId) || document.getElementById('home');
    if (!targetSection) return;

    localStorage.setItem('lastTab', tabId);
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        const icon = n.querySelector('i');
        if (icon) icon.style.animation = 'none';
    });

    targetSection.classList.add('active');
    
    if (tabId === 'sosial') {
        loadVideos();
    }

    const navMap = { 'home': 0, 'info': 1, 'layanan': 2, 'sosial': 3, 'rekber': 4, 'ripper': 5, 'profile': 6, 'pembayaran': 2 };
    const activeIndex = navMap[tabId];
    if (activeIndex !== undefined) {
        const activeNav = document.querySelectorAll('.nav-item')[activeIndex];
        if (activeNav) {
            activeNav.classList.add('active');
            const icon = activeNav.querySelector('i');
            if (icon) { void icon.offsetWidth; icon.style.animation = 'popBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'; }
        }
    }
    
    setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 10);
    if (isPush && window.location.hash !== `#${tabId}`) history.pushState(null, null, `#${tabId}`);
}
