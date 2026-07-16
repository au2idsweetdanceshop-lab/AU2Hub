let currentUser = null, userProfile = null;
let tabSebelumnya = 'home';
let activeGroupId = null;
let activeGroupRole = 'member';
let globalPersonalList = [];
let globalGroupList = [];
let messageToForward = "";
let dataRipperGlobal = [], isRipperExpanded = localStorage.getItem('statusLihatSemua') === 'true';
let viewedUserId = null;
let allVideosData = [];
let newUploads = [];
let activeChatUserId = null;
let messageSubscription = null;
let globalMessageSubscription = null;
let presenceChannel = null;
let onlineUsersMap = new Map();
let selectedMessageId = null;
let blockedUsersList = [];
let myFollowingList = [];
let isUploading = false;
let privasiVideoAktif = 'Publik';
let isTransferProcessing = false;

const TEKS_TABEL_FEE = "Tabel Fee Seller AU2Hub:\n\n🔹 Harga ≤ Rp 10.000 = Potongan Rp 500\n🔹 Harga ≤ Rp 25.000 = Potongan Rp 1.000\n🔹 Harga ≤ Rp 50.000 = Potongan Rp 2.000\n🔹 Harga ≤ Rp 99.999 = Potongan Rp 3.000\n🔹 Harga ≤ Rp 499.999 = Potongan Rp 10.000\n🔹 Harga ≤ Rp 1.499.999 = Potongan Rp 20.000\n🔹 Harga ≤ Rp 1.999.999 = Potongan Rp 25.000\n🔹 Harga ≥ Rp 2.000.000 = Potongan Rp 35.000";

const SUPER_ADMIN_ID = "5e65bd71-62f8-4367-8744-95f626b73726";

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.tutupLayarSuksesDanRefresh = () => {
    history.back(); 
};

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const scale = 400 / img.width;
                canvas.width = 400; canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}
