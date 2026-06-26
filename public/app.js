function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==========================================
// FUNGSI AUTO-REFRESH SETELAH BAYAR
// ==========================================
window.tutupLayarSuksesDanRefresh = () => {
    // Cukup panggil back, proses pembersihan dan refresh sudah kita pindahkan ke event 'popstate'
    history.back(); 
};

// ==========================================
// TEKS GLOBAL TABEL FEE (BIAR GAK CAPEK NGETIK ULANG)
// ==========================================
const TEKS_TABEL_FEE = "Tabel Fee Seller AU2Hub:\n\n🔹 Harga ≤ Rp 10.000 = Potongan Rp 500\n🔹 Harga ≤ Rp 25.000 = Potongan Rp 1.000\n🔹 Harga ≤ Rp 50.000 = Potongan Rp 2.000\n🔹 Harga ≤ Rp 99.999 = Potongan Rp 3.000\n🔹 Harga ≤ Rp 499.999 = Potongan Rp 10.000\n🔹 Harga ≤ Rp 1.499.999 = Potongan Rp 20.000\n🔹 Harga ≤ Rp 1.999.999 = Potongan Rp 25.000\n🔹 Harga ≥ Rp 2.000.000 = Potongan Rp 35.000";

// ==========================================
// FUNGSI TOGGLE PILIHAN BIAYA ADMIN (SELLER / PEMBELI)
// ==========================================
function setFeeBearer(bearer, mode) {
    const inputId = mode === 'jualan' ? 'jualan-fee-bearer' : 'edit-fee-bearer';
    const btnSeller = mode === 'jualan' ? document.getElementById('btn-fee-seller') : document.getElementById('btn-edit-fee-seller');
    const btnPembeli = mode === 'jualan' ? document.getElementById('btn-fee-pembeli') : document.getElementById('btn-edit-fee-pembeli');
    const infoText = mode === 'jualan' ? document.getElementById('jualan-fee-info') : document.getElementById('edit-fee-info');

    document.getElementById(inputId).value = bearer;

    const activeClass = "flex-1 border border-[#EE4D2D] bg-[#EE4D2D]/10 text-[#EE4D2D] py-2 rounded-xl text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(238,77,45,0.2)]";
    const inactiveClass = "flex-1 border border-white/10 bg-black/40 text-gray-400 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-white/5";

    if (bearer === 'seller') {
        btnSeller.className = activeClass;
        btnPembeli.className = inactiveClass;
        // Panggil variabel TEKS_TABEL_FEE langsung tanpa tanda kutip
        infoText.innerHTML = `*Pendapatan Anda akan dipotong sesuai <span onclick="customAlert(TEKS_TABEL_FEE)" class="underline cursor-pointer font-bold hover:text-brand-info text-white">Tabel Fee</span>. Pembeli melihat harga normal.`;
    } else {
        btnPembeli.className = activeClass;
        btnSeller.className = inactiveClass;
        // Panggil variabel TEKS_TABEL_FEE langsung tanpa tanda kutip
        infoText.innerHTML = `*Anda menerima pendapatan UTUH. Harga ke pembeli otomatis dinaikkan menyesuaikan <span onclick="customAlert(TEKS_TABEL_FEE)" class="underline cursor-pointer font-bold hover:text-brand-info text-white">Tabel Fee</span>.`;
    }
}


// Helper: Menghitung bersih pencairan jika buyer yang nanggung biaya
function hitungPendapatanBersih(hargaGateway, ditanggungPembeli, namaProduk = "") {
    let hargaAktual = hargaGateway;

    // 1. Saring Jatah Admin Rekber: Jika pembeli pakai voucher rekber
    if (namaProduk.includes('[+Rekber]')) {
        // Amankan jatah admin berdasarkan rentang harga tagihan (Reverse Logic)
        if (hargaAktual >= 2035000) hargaAktual -= 35000;
        else if (hargaAktual >= 1525000) hargaAktual -= 25000;
        else if (hargaAktual >= 520000) hargaAktual -= 20000;
        else if (hargaAktual >= 110000) hargaAktual -= 10000;
        else hargaAktual -= 5000;
    }

    // 2. Hapus markup QRIS Xoftware
    const hargaBase = Math.round((hargaAktual - 500) / 1.007); 
    
    // 3. Kalkulasi jatah final Seller
    if (ditanggungPembeli) {
        if (hargaBase <= 10500) return hargaBase - 500;   // <-- PENYESUAIAN MIKRO BARU
        if (hargaBase <= 26000) return hargaBase - 1000;
        if (hargaBase <= 52000) return hargaBase - 2000;
        if (hargaBase <= 102999) return hargaBase - 3000;
        if (hargaBase <= 509999) return hargaBase - 10000;
        if (hargaBase <= 1519999) return hargaBase - 20000;
        if (hargaBase <= 2024999) return hargaBase - 25000;
        return hargaBase - 35000;
    } else {
        return hargaBase - hitungPotonganSeller(hargaBase);
    }
}

// ==========================================
// RUMUS TABEL FEE SELLER MERAKYAT (AU2HUB)
// ==========================================
function hitungPotonganSeller(harga) {
    if (harga <= 10000) return 500
    if (harga <= 25000) return 1000;
    if (harga <= 50000) return 2000;
    if (harga <= 99999) return 3000;
    if (harga <= 499999) return 10000;
    if (harga <= 1499999) return 20000
    if (harga <= 1999999) return 25000;
    return 35000; // Harga 2 juta ke atas
}


// ==========================================
// RUMUS FEE ADMIN REKBER (KHUSUS PEMBELI)
// Berdasarkan tabel 69156.jpg
// ==========================================
function hitungFeeRekber(harga) {
    if (harga <= 99999) return 5000;
    if (harga <= 499999) return 10000;
    if (harga <= 1499999) return 20000; // Range 500k sampai di bawah 1.5jt
    if (harga <= 1999999) return 25000; // Range 1.5jt sampai di bawah 2jt
    return 35000;                       // Range 2jt ke atas
}



    // Script mandiri agar splash screen 100% dijamin hilang walau script utama error
    function removeSplashScreen() {
        const splashScreen = document.getElementById('custom-splash');
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.transform = 'scale(1.1)';
            setTimeout(() => splashScreen.remove(), 500);
        }
    }
    // Hilang dalam 1.5 detik saat web dibaca
    document.addEventListener('DOMContentLoaded', () => { setTimeout(removeSplashScreen, 1500); });
    // Jaring pengaman mutlak
    setTimeout(removeSplashScreen, 3500);
    const logoElement = document.getElementById('splash-logo');
    // Daftar link gambar promosi Anda
    const promoImages = [
        "https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-22_23-46-22-498.png",
    ];
    
    let currentIndex = 0;

    // Fungsi untuk mengganti gambar dengan efek pudar
    function rotateLogo() {
        currentIndex = (currentIndex + 1) % promoImages.length;
        logoElement.style.opacity = '0';
        
        setTimeout(() => {
            logoElement.src = promoImages[currentIndex];
            logoElement.style.opacity = '1';
        }, 500);
    }

    // Ganti gambar setiap 1.5 detik (sesuaikan dengan kecepatan animasi Anda)
    setInterval(rotateLogo, 1500);
// ---- FUNGSI UNTUK LIGHTBOX (GAMBAR DI CHAT & PASAR) ----
function openLightbox(imgUrl) {
    history.pushState({ popup: 'lightbox' }, null, '#lightbox'); // Daftarkan ke history HP
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

function closeLightbox(dariTombolBack = false) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    modal.classList.add('opacity-0');
    img.classList.remove('scale-100');
    img.classList.add('scale-95');
    
    // Sinkronisasi tombol Back HP
    if (!dariTombolBack && window.location.hash === '#lightbox') {
        history.back();
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        img.src = '';
    }, 300);
}


// ---- DETEKSI KEMBALI SAAT UPLOAD (BEFOREUNLOAD) ----
let isUploading = false;
window.addEventListener('beforeunload', function (e) {
if (isUploading) {
e.preventDefault();
e.returnValue = 'Upload sedang berlangsung. Yakin ingin meninggalkan halaman?';
}
});

let privasiVideoAktif = 'Publik';

function bukaPilihanPrivasi() {
    const modal = document.getElementById('modal-privasi-video');
    modal.classList.remove('hidden');
    // Beri jeda sangat sedikit agar efek geser (slide-up) terlihat mulus
    setTimeout(() => modal.classList.remove('translate-y-full'), 10);
}

function tutupPilihanPrivasi() {
    const modal = document.getElementById('modal-privasi-video');
    modal.classList.add('translate-y-full');
    // Beri waktu laci turun dulu sebelum benar-benar dihilangkan (hidden)
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function bukaPratinjauVideo(e) {
    e.preventDefault();   // Mencegah file manager/galeri terbuka lagi
    e.stopPropagation();  // Mencegah klik tembus ke kotak label

    const videoKecil = document.getElementById('video-preview-element');
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');

    if (!videoKecil.src) return;

    // 🔥 SUNTIKAN RADAR: Agar tombol back HP aktif
    history.pushState({ popup: 'pratinjau' }, null, '#pratinjau');

    // Salin video dan buka mode full screen
    videoFull.src = videoKecil.src;
    modalPratinjau.classList.remove('hidden');
    modalPratinjau.classList.add('flex');
    
    // Mainkan video dengan fitur kontrol & bersuara
    videoFull.muted = false;
    videoFull.play();
}

function tutupPratinjauVideo(dariTombolBack = false) {
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');
    
    // SINKRONISASI TOMBOL BACK HP
    if (!dariTombolBack && window.location.hash === '#pratinjau') {
        history.back();
    }

    // Matikan pemutar dan tutup layar
    videoFull.pause();
    videoFull.src = '';
    modalPratinjau.classList.add('hidden');
    modalPratinjau.classList.remove('flex');
}


function setPrivasiVideo(jenis, ikon) {
    privasiVideoAktif = jenis;
    // Ubah teks dan ikon di menu upload sesuai pilihan user
    document.getElementById('label-privasi-teks').innerHTML = `${jenis} <i class="fas fa-chevron-right text-[10px]"></i>`;
    document.getElementById('ikon-privasi-utama').className = `fas ${ikon} text-xs`;
    tutupPilihanPrivasi();
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
        history.pushState({ popup: 'prompt' }, null, '#prompt');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        inputEl.focus();

        modal.promptResolve = resolve;
        delete modal.promptResult; // Bersihkan memori klik sebelumnya

        btnOk.onclick = () => {
            modal.promptResult = inputEl.value; // Simpan nilainya di memori
            if (window.location.hash === '#prompt') history.back(); // Biarkan sistem HP yang menutupnya
            else {
                modal.classList.add('hidden'); modal.classList.remove('flex');
                if (modal.promptResolve) { modal.promptResolve(modal.promptResult); modal.promptResolve = null; }
            }
        };
        btnCancel.onclick = () => {
            modal.promptResult = null;
            if (window.location.hash === '#prompt') history.back();
            else {
                modal.classList.add('hidden'); modal.classList.remove('flex');
                if (modal.promptResolve) { modal.promptResolve(null); modal.promptResolve = null; }
            }
        };
    });
}

function customConfirm(title) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('confirm-title');
        const btnOk = document.getElementById('confirm-ok');
        const btnCancel = document.getElementById('confirm-cancel');

        titleEl.innerText = title;
        history.pushState({ popup: 'confirm' }, null, '#confirm');

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        modal.confirmResolve = resolve;
        delete modal.confirmResult;

        btnOk.onclick = () => {
            modal.confirmResult = true;
            if (window.location.hash === '#confirm') history.back();
            else {
                modal.classList.add('hidden'); modal.classList.remove('flex');
                if (modal.confirmResolve) { modal.confirmResolve(true); modal.confirmResolve = null; }
            }
        };
        btnCancel.onclick = () => {
            modal.confirmResult = false;
            if (window.location.hash === '#confirm') history.back();
            else {
                modal.classList.add('hidden'); modal.classList.remove('flex');
                if (modal.confirmResolve) { modal.confirmResolve(false); modal.confirmResolve = null; }
            }
        };
    });
}

function customAlert(title) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        const titleEl = document.getElementById('alert-title');
        const btnOk = document.getElementById('alert-ok');

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formattedText = title.replace(urlRegex, (url) => `<a href="${url}" target="_blank" class="text-brand-info underline font-bold">${url}</a>`);
        titleEl.innerHTML = formattedText.replace(/\n/g, "<br>");

        history.pushState({ popup: 'alert' }, null, '#alert');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.alertResolve = resolve;

        btnOk.onclick = () => {
            if (window.location.hash === '#alert') history.back();
            else {
                modal.classList.add('hidden'); modal.classList.remove('flex');
                if (modal.alertResolve) { modal.alertResolve(); modal.alertResolve = null; }
            }
        };
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

const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// FUNGSI PEMBERSIH XSS GLOBAL
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

let currentUser = null, userProfile = null, isAuthLogin = true;

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
let obs = null, activeVideoId = null, lastTap = 0, isGlobalMuted = false;
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
// Memori untuk menyimpan ID siapa saja yang sudah kita follow
let myFollowingList = [];

// Fungsi untuk menarik data dari Supabase saat pertama kali login
async function fetchMyFollowing() {
    if (!currentUser) return;
    try {
        const { data } = await supabaseClient
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);
            
        if (data) {
            myFollowingList = data.map(f => f.following_id);
        }
    } catch (e) {
        console.error("Gagal menarik data following", e);
    }
}

let typingTimer; // VARIABEL TYPING INDICATOR

let currentRoomMembers = []; // Memori untuk nyimpen anggota grup pas ngetik @

        let globalFaqData = [];
        let isInfoLoaded = false;

        async function loadInfoLayanan(forceRefresh = false) {
            if (isInfoLoaded && !forceRefresh) return;
            
            const eventContainer = document.getElementById('dynamic-event-container');
            const faqContainer = document.getElementById('faq-container');
            
            if (forceRefresh) {
                eventContainer.innerHTML = '<div class="animate-pulse bg-brand-card h-40 rounded-3xl border border-white/5 flex items-center justify-center"><i class="fas fa-spinner fa-spin text-brand-accent text-3xl"></i></div>';
                faqContainer.innerHTML = '<div class="text-center py-6"><i class="fas fa-spinner fa-spin text-brand-info text-2xl"></i></div>';
            }

            try {
                const configRes = await fetch('/api/get-config');
                const config = await configRes.json();
                if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan");

                const res = await fetch(`${config.gasUrl}?action=get_info`);
                const data = await res.json();

                if (data.status === 'success') {
                    // 1. RENDER MULTIPLE BANNER EVENT (SLIDER LUAR AUTOMATIC)
                    if (data.info && data.info.length > 0) {
                        let carouselHTML = `
                        <div class="relative w-full overflow-hidden rounded-[2rem] pb-8 pt-1">
                            <div id="info-image-carousel" onscroll="updateInfoCarouselDots()" class="flex overflow-x-auto hide-scroll snap-x snap-mandatory gap-4 relative px-1 items-stretch">
                        `;

                        carouselHTML += data.info.map((evt, idx) => {
                            // AMAN KAN DATA GAMBAR MULTIPLE DARI GOOGLE SHEETS
                            let rawGambar = evt.link_gambar || evt.gambar || "";
                            let arrGambar = [];
                            
                            if (typeof rawGambar === 'string' && rawGambar.trim() !== "") {
                                arrGambar = rawGambar.split(/[\n,]+/).map(url => url.trim()).filter(url => url !== "");
                            } else if (Array.isArray(rawGambar)) {
                                arrGambar = rawGambar.filter(url => url && url.trim() !== "");
                            }

                            // GENERATE SLIDER DALAM (SLIDER GAMBAR) JIKA ADA > 0 GAMBAR
                            let gambarSliderHTML = '';
                            if (arrGambar.length > 0) {
                                gambarSliderHTML = `
                                <div class="relative w-full h-44 rounded-t-[1.7rem] rounded-b-xl overflow-hidden mb-3 shrink-0">
                                    <div onscroll="updateInnerDots(this)" class="flex overflow-x-auto hide-scroll snap-x snap-mandatory w-full h-full relative">
                                        ${arrGambar.map(urlGambar => `
                                            <div class="w-full h-full flex-shrink-0 snap-center relative">
                                                <img src="${urlGambar}" alt="Event" class="w-full h-full object-cover">
                                                <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent pointer-events-none opacity-80"></div>
                                            </div>
                                        `).join('')}
                                    </div>

                                    ${arrGambar.length > 1 ? `
                                    <div class="inner-dots-container absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 pointer-events-none">
                                        ${arrGambar.map((_, dotIdx) => `
                                            <div class="inner-dot h-1.5 rounded-full transition-all duration-300 ${dotIdx === 0 ? 'w-4 bg-brand-accent' : 'w-1.5 bg-white/40'}"></div>
                                        `).join('')}
                                    </div>
                                    ` : ''}
                                </div>
                                `;
                            }

                            // --- LOGIKA POTONG TEKS DESKRIPSI (BISA KLIK BUKA/TUTUP) ---
                            let deskripsiTeks = evt.deskripsi || "";
                            let isPanjang = deskripsiTeks.length > 120;
                            let deskripsiHTML = isPanjang
                                ? `
                                <div class="flex-1 mb-4 flex flex-col items-start w-full">
                                    <p id="info-desc-${idx}" onclick="toggleInfoDesc(${idx})" class="text-[11px] text-gray-400 leading-relaxed whitespace-pre-line line-clamp-3 transition-all duration-300 cursor-pointer w-full hover:text-gray-300" title="Klik untuk baca semua">${deskripsiTeks}</p>
                                    <button id="info-btn-${idx}" onclick="toggleInfoDesc(${idx})" class="text-[10px] text-brand-info font-bold mt-1.5 hover:text-white active:scale-95 transition-all">Lihat Selengkapnya ▼</button>
                                </div>
                                `
                                : `<p class="text-[11px] text-gray-400 mb-4 leading-relaxed whitespace-pre-line flex-1">${deskripsiTeks}</p>`;

                            return `
                            <div class="w-[calc(100%-24px)] flex-shrink-0 snap-center bg-gradient-to-b from-[#1A1133] to-[#0F0920] rounded-[2rem] p-1.5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] smooth-reveal h-auto flex flex-col" style="animation-delay: ${idx * 0.1}s">
                                ${gambarSliderHTML}
                                <div class="px-4 pb-4 flex flex-col flex-1 ${arrGambar.length === 0 || !arrGambar[0] ? 'pt-4' : ''}">
                                    <h3 class="font-extrabold text-white text-base mb-1.5 leading-snug">${evt.judul || "Pengumuman"}</h3>
                                    
                                    ${deskripsiHTML}
                                    
                                    ${evt.link_facebook ? `
                                    <a href="${evt.link_facebook}" target="_blank" class="flex justify-center items-center w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all text-xs shadow-inner mt-auto">
                                        <i class="fas fa-external-link-alt mr-2 text-brand-info"></i> Baca Selengkapnya
                                    </a>
                                    ` : ''}
                                </div>
                            </div>
                            `;
                        }).join('');

                        carouselHTML += `
                            </div>
                            <div id="info-carousel-dots" class="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 pointer-events-none mt-4">
                                ${data.info.map((_, i) => `<div class="info-dot-indicator h-1.5 rounded-full transition-all duration-300 ${i === 0 ? 'w-4 bg-brand-accent' : 'w-1.5 bg-white/40'}"></div>`).join('')}
                            </div>
                        </div>
                        `;
                        eventContainer.innerHTML = carouselHTML;
                    } else {
                        eventContainer.innerHTML = '<div class="text-center py-8 text-xs text-gray-500 bg-brand-card rounded-3xl border border-white/5"><i class="fas fa-box-open text-3xl mb-2 opacity-50"></i><br>Belum ada pengumuman terbaru.</div>';
                    }

                    // 2. RENDER FAQ
                    if (data.faq && data.faq.length > 0) {
                        globalFaqData = data.faq.map(f => ({ t: f.pertanyaan, j: f.jawaban }));
                        renderFaqs(globalFaqData);
                    } else {
                        faqContainer.innerHTML = '<div class="text-center py-6 text-xs text-gray-500 bg-brand-card rounded-2xl border border-white/5">FAQ kosong.</div>';
                    }

                    // 3. RENDER BANTUAN CEPAT (DINAMIS DARI SPREADSHEET)
                    if (data.bantuan && data.bantuan.length > 0) {
                        const bantuanContainer = document.getElementById('bantuan-cepat-container');
                        let htmlBantuan = '';
                        
                        data.bantuan.forEach(item => {
                            let judul = item.Judul || item.judul || 'Bantuan';
                            let ikon = item.Ikon || item.ikon || 'fa-info-circle';
                            let warna = item.Warna || item.warna || 'brand-info'; 
                            let tipeAksi = (item.TipeAksi || item.tipe_aksi || '').toLowerCase();
                            let targetAksi = item.TargetAksi || item.target_aksi || '';
                            
                            let atributKlik = '';
                            let tagPembuka = 'a'; // Semua tombol dipaksa jadi tag 'a' (link) agar aman
                            
                            if (tipeAksi === 'alert' || tipeAksi === 'popup') {
                                let safeTarget = escapeHTML(targetAksi).replace(/&#39;/g, "\\'").replace(/\n/g, "\\n");
                                atributKlik = `href="javascript:void(0)" onclick="customAlert('${safeTarget}')"`;
                                
                            } else if (tipeAksi === 'tab') {
                                atributKlik = `href="javascript:void(0)" onclick="switchTab('${targetAksi}')"`;
                                
                            } else if (tipeAksi === 'link') {
                                let amanUrl = targetAksi;
                                // Otomatis tambah https:// kalau di spreadsheet lupa ditulis
                                if (!amanUrl.startsWith('http')) {
                                    amanUrl = 'https://' + amanUrl;
                                }
                                atributKlik = `href="${amanUrl}" target="_blank"`;
                            }

                            htmlBantuan += `
                            <${tagPembuka} ${atributKlik} class="bg-gradient-to-br from-brand-card to-[#0A0615] p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all group hover:border-${warna}/50 shadow-lg block decoration-transparent">
                                <div class="w-10 h-10 rounded-full bg-${warna}/20 text-${warna} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <i class="fas ${ikon}"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-300 group-hover:text-white transition-colors">${judul}</span>
                            </${tagPembuka}>`;
                        });

                        if (bantuanContainer) bantuanContainer.innerHTML = htmlBantuan;

                    }

                    isInfoLoaded = true;
                    if(forceRefresh) showToast("Info berhasil diperbarui!", "success");
                } else {
                    throw new Error("Gagal ngambil data Info dari Sheets");
                }
            } catch (e) {
                console.log(e);
                eventContainer.innerHTML = '<div class="text-center py-6 text-xs text-red-500 bg-brand-card rounded-2xl border border-red-500/20">Gagal memuat info server.</div>';
                faqContainer.innerHTML = '<div class="text-center py-6 text-xs text-red-500 bg-brand-card rounded-2xl border border-red-500/20">Gagal memuat FAQ.</div>';
            }
        }



        function updateInfoCarouselDots() {
            const carousel = document.getElementById('info-image-carousel'); 
            const dots = document.querySelectorAll('.info-dot-indicator');
            if (!carousel || dots.length === 0) return; 
            
            // Dapatkan index aktif berdasarkan jarak scroll dibagi lebar 1 kartu info
            const scrollLeft = carousel.scrollLeft;
            const cardWidth = carousel.firstElementChild ? carousel.firstElementChild.clientWidth : carousel.clientWidth;
            let activeIndex = Math.round(scrollLeft / (cardWidth + 16)); // 16 adalah ukuran gap CSS
            
            activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));
            dots.forEach((dot, index) => { 
                if (index === activeIndex) { dot.className = "info-dot-indicator h-1.5 rounded-full transition-all duration-300 w-4 bg-brand-accent"; } 
                else { dot.className = "info-dot-indicator h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/40"; } 
            });
        }
        
        function updateInnerDots(container) {
            // Amankan pencarian elemen container dots internal
            const parentCard = container.closest('.relative.w-full.h-44');
            if (!parentCard) return;
            const dotsWrapper = parentCard.querySelector('.inner-dots-container');
            if (!dotsWrapper) return;
            
            const dots = dotsWrapper.querySelectorAll('.inner-dot');
            if (dots.length === 0) return;
            
            const scrollLeft = container.scrollLeft;
            const imgWidth = container.clientWidth;
            let activeIndex = Math.round(scrollLeft / imgWidth); 
            
            activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));
            
            dots.forEach((dot, index) => { 
                if (index === activeIndex) { 
                    dot.className = "inner-dot h-1.5 rounded-full transition-all duration-300 w-4 bg-brand-accent"; 
                } else { 
                    dot.className = "inner-dot h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/40"; 
                } 
            });
        }

        


// FORMAT TEKS (Otomatis deteksi Link, @Mention dan #Hashtag)
function formatCaption(text) {
    if(!text) return '';
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // 1. [BARU] Deteksi Link URL (http:// atau https://)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, (url) => {
        // event.stopPropagation() sangat penting agar saat link diklik, 
        // teks caption tidak malah memanjang/memendek (expand)
        return `<a href="${url}" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline hover:text-white transition-colors font-bold">${url}</a>`;
    });

    // 2. Deteksi Hashtag (#tagar) - Warna Biru
    formatted = formatted.replace(/#(\w+)/g, '<span onclick="event.stopPropagation(); cariBerdasarkanTagar(\'$1\')" class="font-bold text-brand-info hover:underline cursor-pointer">#$1</span>');

    // 3. Deteksi Mention (@username) - Warna Pink/Accent
    formatted = formatted.replace(/@(\w+)/g, '<span onclick="event.stopPropagation(); viewUserProfileByNickname(\'$1\')" class="font-bold text-brand-accent hover:underline cursor-pointer">@$1</span>');

    // 4. Deteksi Enter (Baris baru)
    formatted = formatted.replace(/\n/g, "<br>");
    
    return formatted;
}


// FUNGSI KLIK MENTION: Mencari User ID berdasarkan Nickname
async function viewUserProfileByNickname(nickname) {
    showToast("Mencari pengguna...", "info");
    
    try {
        // Cari di database Supabase yang nicknamenya mirip (ilike = tidak peduli huruf besar/kecil)
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .ilike('nickname', nickname)
            .single();
            
        if (data && data.id) {
            // Jika ketemu, buka profilnya
            viewUserProfile(data.id);
        } else {
            showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
        }
    } catch (err) {
        showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
    }
}

function cariBerdasarkanTagar(tagar) {
    // 1. Tutup layar story yang sedang aktif jika ada
    const storyModal = document.getElementById('story-viewer-modal');
    if (storyModal && !storyModal.classList.contains('hidden')) {
        closeStoryViewer();
    }

    // [BARU] 2. Tutup mode fokus Feed Utama secara halus jika aktif
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true); // true = abaikan history agar URL tidak bentrok
    }

    // [BARU] 3. Tutup Floating Player (Misal jika diklik dari video profil)
    const floatingPlayer = document.getElementById('floating-video-player');
    if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
        closeFloatingVideo(true); 
    }

    // 4. Filter data video yang caption-nya mengandung hashtag tersebut
    const videoDitemukan = allVideosData.filter(v => 
        v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase())
    );

    if (videoDitemukan.length === 0) {
        showToast(`Belum ada video dengan tagar #${tagar}`, "error");
        return;
    }

    // 5. TAMPILKAN GRID MODAL HASHTAG
    const modal = document.getElementById('modal-hashtag-grid');
    const grid = document.getElementById('hashtag-video-grid');
    const title = document.getElementById('hashtag-grid-title');
    const count = document.getElementById('hashtag-grid-count');

    // Set Teks Header
    title.innerText = '#' + tagar;
    count.innerText = videoDitemukan.length + ' Video Terkait';
    
    // Render Grid (dibalik agar yang terbaru di atas)
    const reversedVideos = [...videoDitemukan].reverse();
    grid.innerHTML = reversedVideos.map((vid, index) => {
        return `
        <div class="aspect-[9/16] bg-black relative rounded-sm overflow-hidden group cursor-pointer border border-white/5" onclick="playHashtagVideo('${tagar}', ${index})">
            <video class="w-full h-full object-cover" preload="metadata">
                <source src="${vid.video_url}" type="video/mp4">
            </video>
            <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 text-white text-[10px] font-bold z-10 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                <i class="fas fa-play text-[8px]"></i> 
            </div>
        </div>
        `;
    }).join('');

    // Hentikan video latar belakang di feed utama agar tidak bocor suaranya
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.pause());

    // Buka Modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // [PENTING] Beri delay agar animasi CSS geser laci dapat tereksekusi dengan mulus
    setTimeout(() => {
        modal.classList.remove('translate-x-full');
    }, 50);

    // Beri jejak sejarah URL (untuk tombol Back HP)
    history.pushState({ popup: 'hashtag_grid' }, null, '#tagar');
}


// FUNGSI PENUTUP LAYAR GRID
function closeHashtagGrid(dariTombolBack = false) {
    const modal = document.getElementById('modal-hashtag-grid');
    modal.classList.add('translate-x-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);

    if (!dariTombolBack && window.location.hash === '#tagar') {
        history.back();
    }
}

function playHashtagVideo(tagar, startIndex) {
    // 1. Ambil video dengan hashtag yang sama
    const videoDitemukan = allVideosData.filter(v => 
        v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase())
    );
    if(videoDitemukan.length === 0) return;

    // 2. Balikkan urutan agar sinkron dengan grid
    currentProfileVideos = [...videoDitemukan].reverse();

    // 3. Tentukan index target klik
    let targetIndex = parseInt(startIndex) || 0;

    // Bersihkan layar floating player
    const container = document.getElementById('floating-feed-container');
    container.innerHTML = '';
    container.scrollTop = 0;

    // [BARU] Paksa suara menyala (unmute) otomatis saat video hashtag diklik
    isGlobalMuted = false;

    // Tampilkan floating player
    document.getElementById('floating-video-player').classList.remove('hidden');
    document.getElementById('floating-video-player').classList.add('flex');
    document.getElementById('floating-video-player').style.opacity = '1'; // <--- TAMBAHKAN BARIS INI

    if(floatObs) floatObs.disconnect();
    setupFloatVideoObserver();

    // 4. Render batch video agar mulus (target yang diklik + 2 di bawahnya)
    profileFeedIndex = 0;
    let amountToLoad = targetIndex + 3;
    renderProfileVideoBatch(amountToLoad);

    // 5. Scroll otomatis tepat ke video yang baru diklik
    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 10);

    // Tambahkan jejak URL agar tombol back HP tahu kalau sedang nonton video hashtag
    history.pushState({ popup: 'floating_video_hashtag' }, null, '#play_tagar');
}



async function fetchBlockedUsers() {
if(!currentUser) return;
try {
const { data, error } = await supabaseClient.from('blocks').select('blocked_id').eq('blocker_id', currentUser.id);
if(!error && data) {
blockedUsersList = data.map(d => d.blocked_id);
}
} catch(e) {
console.error("Gagal mengambil status blokir", e);
}
}

async function checkGlobalUnreadMessages() {
if(!currentUser) return;
try {
const { count, error } = await supabaseClient
.from('messages')
.select('*', { count: 'exact', head: true })
.eq('receiver_id', currentUser.id)
.eq('is_read', false);

const badge = document.getElementById('global-chat-badge');
if(badge) {
if(!error && count && count > 0) {
badge.innerText = count > 99 ? '99+' : count;
badge.classList.remove('hidden');
} else {
badge.classList.add('hidden');
}
}
} catch(e) {
console.error("Error unread messages", e);
}
}

function initGlobalMessageListener() {
    if (!currentUser || globalMessageSubscription) return;

    globalMessageSubscription = supabaseClient
        .channel('global_messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, payload => {
            const msg = payload.new;
            const isForMe = msg.receiver_id === currentUser.id;
            const isForMyGroup = msg.group_id && globalGroupList.some(g => g.id === msg.group_id);

            // [BARU] DETEKSI MENTION (CEK APAKAH NAMA KITA ADA DI DALAM PESAN)
            let isMentioned = false;
            const myNickname = userProfile?.nickname;
            if (myNickname && msg.message && msg.message.includes(`@${myNickname}`)) {
                isMentioned = true;
            }

            // Cek apakah pesan untuk saya/grup dan pengirimnya bukan saya & tidak diblokir
            if ((isForMe || isForMyGroup) && msg.sender_id !== currentUser.id && !blockedUsersList.includes(msg.sender_id)) {
                
                // NOTIFIKASI DI DALAM APLIKASI (TOAST)
                if (isMentioned) {
                    showToast("🔔 Ada yang ngetag kamu di Grup!", "success");
                } else {
                    showToast("Ada pesan baru masuk!", "info");
                }
                
                // NOTIFIKASI POP-UP HP (PUSH NOTIFICATION JIKA APLIKASI DI-MINIMIZE)
                if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
                    new Notification("AU2Hub", {
                        body: isMentioned ? "Seseorang menyebut (tag) Anda di Grup!" : (isForMyGroup ? "Ada pesan baru di Grup!" : "Anda menerima pesan baru!"),
                        icon: "/app-icon-192.png"
                    });
                }
                
                checkGlobalUnreadMessages();
                
                const widget = document.getElementById('floating-widget');
                const chatList = document.getElementById('chat-list-view');
                if (!widget.classList.contains('opacity-0') && chatList.classList.contains('flex')) {
                    setTimeout(() => loadChatList(), 300);
                }
            }
        })
        .subscribe();
        
    checkGlobalUnreadMessages();
}

async function showUserList(type) {
    if (!currentUser && viewedUserId === null) return;
    const targetId = viewedUserId || currentUser.id;

    // [BARU] Cek apakah ini profil sendiri dan sedang membuka tab "pengikut"
    const isOwnProfile = currentUser && targetId === currentUser.id;
    const isFollowerList = type === 'pengikut';

    const modal = document.getElementById('modal-user-list');
    const container = document.getElementById('user-list-container');
    const title = document.getElementById('user-list-title');

    title.innerText = type === 'mengikuti' ? 'Mengikuti' : 'Pengikut';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('userListSearch').value = '';
    container.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';

    let query = supabaseClient.from('follows').select(type === 'mengikuti' ? 'following_id' : 'follower_id').eq(type === 'mengikuti' ? 'follower_id' : 'following_id', targetId);
    const { data: follows } = await query;

    if (!follows || follows.length === 0) {
        container.innerHTML = `<p class="text-center text-xs text-gray-500 mt-10">Belum ada ${type}.</p>`;
        return;
    }

    const ids = follows.map(f => type === 'mengikuti' ? f.following_id : f.follower_id);
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url, bio').in('id', ids);

    if (profiles && profiles.length > 0) {
        container.innerHTML = profiles.map(p => {
            const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
            
            // [BARU] TOMBOL HAPUS PENGIKUT
            // Tombol hanya digambar jika isOwnProfile (profil sendiri) & isFollowerList (tab pengikut)
            let removeBtn = '';
            if (isOwnProfile && isFollowerList) {
                // event.stopPropagation() ditambahkan agar saat tombol dihapus diklik, 
                // sistem tidak malah membuka profil orang tersebut
                let namaAman = escapeHTML(p.nickname).replace(/&#39;/g, "\\'");
                removeBtn = `
                <button onclick="event.stopPropagation(); removeFollower('${p.id}', '${namaAman}')"
                    class="ml-auto w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 shrink-0"
                    title="Hapus Pengikut">
                    <i class="fas fa-user-times text-[10px]"></i>
                </button>`;
            }

            return `
            <div onclick="viewUserProfile('${p.id}'); closeUserList();" class="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all border-b border-white/5 last:border-0">
                <img src="${ava}" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
                <div class="ml-3 flex-1 min-w-0 pr-2">
                    <h4 class="font-bold text-white text-xs truncate">${p.nickname}</h4>
                    <p class="text-[10px] text-gray-400 truncate w-full">${p.bio || ''}</p>
                </div>
                ${removeBtn}
            </div>`;
        }).join('');
    }
}


function closeUserList() {
const modal = document.getElementById('modal-user-list');
modal.classList.add('hidden');
modal.classList.remove('flex');
}

// ==========================================
// FUNGSI BARU: HAPUS PENGIKUT
// ==========================================
async function removeFollower(followerId, nickname) {
    if (!currentUser) return;
    
    // Konfirmasi sebelum menghapus
    const konfirmasi = await customConfirm(`Yakin ingin menghapus ${nickname} dari daftar pengikut Anda?`);
    if (!konfirmasi) return;

    try {
        showToast(`Menghapus ${nickname}...`, "info");

        // Proses hapus dari Supabase: 
        // follower_id adalah ID orang yang mengikuti, following_id adalah ID kita
        const { error } = await supabaseClient
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', currentUser.id);

        if (error) throw error;

        showToast(`${nickname} berhasil dihapus dari pengikut.`, "success");
        
        // Refresh statistik angka di profil dan muat ulang daftar modal
        fetchFollowStats(currentUser.id);
        showUserList('pengikut'); 
        
    } catch (err) {
        console.error(err);
        showToast("Gagal menghapus pengikut: " + err.message, "error");
    }
}


async function toggleBlockUser(userId) {
if(!currentUser) return openAuthModal();
const btn = document.getElementById('btn-block-user');

try {
if(blockedUsersList.includes(userId)) {
// 🔥 PERBAIKAN: Menggunakan modal kustom
const hapus = await customConfirm("Buka blokir pengguna ini?");
if(hapus) {
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
await supabaseClient.from('blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', userId);
blockedUsersList = blockedUsersList.filter(id => id !== userId);
showToast("Blokir dibuka", "success");
checkBlockStatusUI();
}
} else {
// 🔥 PERBAIKAN: Menggunakan modal kustom
const blokir = await customConfirm("Blokir pengguna ini? Anda tidak akan melihat video dan pesannya.");
if(blokir) {
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
await supabaseClient.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: userId });
blockedUsersList.push(userId);
showToast("Pengguna diblokir", "info");
checkBlockStatusUI();
allVideosData = allVideosData.filter(v => v.user_id !== userId);
if(document.getElementById('sosial').classList.contains('active')) loadVideos();
}
}
} catch(e) {
showToast("Terjadi kesalahan sistem blokir", "error");
checkBlockStatusUI();
}
}


function checkBlockStatusUI() {
const btn = document.getElementById('btn-block-user');
if(!btn || !viewedUserId) return;

if(blockedUsersList.includes(viewedUserId)) {
btn.innerHTML = '<i class="fas fa-unlock mr-1"></i> Buka Blokir';
btn.className = 'w-full bg-gray-500/10 border border-gray-500/20 py-2 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-gray-500/20 transition-colors mt-1';
} else {
btn.innerHTML = '<i class="fas fa-ban mr-1"></i> Blokir Pengguna';
btn.className = 'w-full bg-red-500/10 border border-red-500/20 py-2 rounded-xl text-[10px] font-bold text-red-500 hover:bg-red-500/20 transition-colors mt-1';
}
}

async function checkSession() {
    document.getElementById('profile-loading').classList.remove('hidden');
    document.getElementById('profile-loading').classList.add('flex');

    document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden'));
    document.getElementById('profile-logged-out').classList.add('hidden');

    const { data: { user } } = await supabaseClient.auth.getUser();

    document.getElementById('profile-loading').classList.add('hidden');
    document.getElementById('profile-loading').classList.remove('flex');

    if (user) {
        currentUser = user;
        await fetchProfile();
        const tracker = document.getElementById('order-tracker-section');
        if (tracker) { tracker.classList.remove('hidden'); tracker.style.display = 'block'; }
        const pesananOut = document.getElementById('pesanan-logged-out');
        if (pesananOut) pesananOut.classList.add('hidden');
        loadOrderTracker(user.id);

        await fetchBlockedUsers();
        await fetchMyFollowing();
        checkGlobalUnreadMessages();
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.remove('hidden'));
        document.getElementById('profile-logged-out').classList.add('hidden');
        prosesAutoDeliveryTertunda(); // Panggil jaring pengaman setiap kali web dibuka


        // 🚀 PRO-FIX: Jalankan fetch di background tanpa 'await' agar proses Login tidak tersandera
        if (allVideosData.length === 0) {
            fetch('/api/get-videos')
                .then(res => res.json())
                .then(dataDariSheet => {
                    allVideosData = dataDariSheet.map((v, index) => {
                        v.original_index = index; // <--- SUNTIKAN TIKET ANTREAN
                        v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
                        return v;
                    }).filter(v => !blockedUsersList.includes(v.user_id));
                })
                .catch(e => console.log("Silent fetch videos failed", e));
        }

        updateUIForLoggedIn();
        initPresence();
        updateMyLastSeen();
        initGlobalMessageListener();
    } else {
        if (presenceChannel) { supabaseClient.removeChannel(presenceChannel); presenceChannel = null; }
        const tracker = document.getElementById('order-tracker-section');
        if (tracker) { tracker.classList.add('hidden'); tracker.style.display = 'none'; }
        const pesananOut = document.getElementById('pesanan-logged-out');
        if (pesananOut) pesananOut.classList.remove('hidden');

        if (globalMessageSubscription) { supabaseClient.removeChannel(globalMessageSubscription); globalMessageSubscription = null; }
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden'));
        document.getElementById('profile-logged-out').classList.remove('hidden');
        updateUIForLoggedOut();
    }
}


// ==========================================
// FITUR LEVEL & EXP SYSTEM
// ==========================================
function hitungStatusLevel(totalExp) {
    let exp = totalExp || 0; 
    const level = Math.floor(Math.sqrt(exp / 100)) + 1;
    const batasBawahExp = Math.pow(level - 1, 2) * 100;
    const targetNextLevel = Math.pow(level, 2) * 100;
    const expTerkumpulDiLevelIni = exp - batasBawahExp;
    const totalExpDibutuhkanLevelIni = targetNextLevel - batasBawahExp;
    let persentase = Math.floor((expTerkumpulDiLevelIni / totalExpDibutuhkanLevelIni) * 100);
    if (persentase < 0) persentase = 0;
    if (persentase > 100) persentase = 100;
    return { level, exp, targetNextLevel, persentase };
}

// FUNGSI VISUAL EXP (Tanpa akses nembak database agar aman dari Cheater)
async function tambahExp(jumlah) {
    if (!currentUser || !userProfile) return;

    // Hanya animasi prediksi lokal untuk UI (biar layar langsung berubah)
    // Penambahan EXP asli akan diurus otomatis oleh Database Triggers di server
    const expLama = userProfile.exp || 0;
    const expBaru = expLama + jumlah;
    userProfile.exp = expBaru;
    
    // Update animasi bar langsung jika pengguna sedang membuka layar profilnya sendiri
    if (document.getElementById('profile').classList.contains('active') && viewedUserId === currentUser.id) {
        const statusLevel = hitungStatusLevel(expBaru);
        document.getElementById('profile-level-badge').innerText = `Lv. ${statusLevel.level}`;
        document.getElementById('text-exp-current').innerText = `EXP: ${statusLevel.exp}`;
        document.getElementById('text-exp-target').innerText = `Next: ${statusLevel.targetNextLevel}`;
        document.getElementById('bar-exp-progress').style.width = `${statusLevel.persentase}%`;
    }
}

async function fetchProfile() {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
        userProfile = data;
    } else {
        userProfile = { nickname: 'Player', avatar_url: '', bio: 'Halo! Salam kenal.', exp: 0 };
        await supabaseClient.from('profiles').upsert({ id: currentUser.id, nickname: 'Player', avatar_url: '', bio: 'Halo! Salam kenal.', exp: 0 });
    }

    if(!viewedUserId || viewedUserId === currentUser.id) {
        const pNick = document.getElementById('profile-nickname'); if(pNick) pNick.innerText = "@" + (userProfile.nickname || "Player");
        const pBio = document.getElementById('profile-bio'); if(pBio) pBio.innerText = userProfile.bio || "Belum ada deskripsi.";
        if (userProfile.avatar_url && userProfile.avatar_url !== "") {
            const pImg = document.getElementById('profile-img'); if(pImg) pImg.src = userProfile.avatar_url;
        }

        // --- TAMBAHAN BARU: EKSEKUSI LEVEL ---
        // Catatan: Pastikan di database Supabase Anda, tabel 'profiles' sudah ada kolom 'exp' bertipe int4/numeric.
        const expData = userProfile.exp || 0; 
        const statusLevel = hitungStatusLevel(expData);

        const elLevelBadge = document.getElementById('profile-level-badge');
        const elExpContainer = document.getElementById('profile-exp-container');
        
        if (elLevelBadge && elExpContainer) {
            // Tampilkan tulisan Level
            elLevelBadge.innerText = `Lv. ${statusLevel.level}`;
            elLevelBadge.classList.remove('hidden');
            
            // Animasikan bar dan teks
            document.getElementById('text-exp-current').innerText = `EXP: ${statusLevel.exp}`;
            document.getElementById('text-exp-target').innerText = `Next: ${statusLevel.targetNextLevel}`;
            
            // Gunakan timeout kecil agar efek animasi transisi CSS terlihat saat dimuat
            setTimeout(() => {
                document.getElementById('bar-exp-progress').style.width = `${statusLevel.persentase}%`;
            }, 100);
            
            elExpContainer.classList.remove('hidden');
        }
const btnSuperAdmin = document.getElementById('btn-super-admin');
        if (btnSuperAdmin) {
            // Membaca status admin langsung dari Supabase
            if (userProfile && userProfile.is_super_admin === true) {
                btnSuperAdmin.classList.remove('hidden');
            } else {
                btnSuperAdmin.classList.add('hidden');
            }
        }
    }
}


function openAuthModal() {
history.pushState({ popup: 'auth' }, null, '#auth');
document.getElementById('modal-auth').classList.remove('hidden');
document.getElementById('modal-auth').classList.add('flex');
}

function closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.opacity = '0';

    setTimeout(() => {
        // PAKSA modal tertutup secara fisik terlebih dahulu
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.opacity = '1';

        // Ganti history.back() dengan replaceState untuk menghindari PWA terjebak di loop hash
        if (window.location.hash === '#auth') {
            history.replaceState(null, null, '#' + tabSebelumnya); // <--- Kembalikan ke tempat asalnya
        }
    }, 300);
}


function toggleAuthMode() {
isAuthLogin = !isAuthLogin;
document.getElementById('auth-title').innerText = isAuthLogin ? "Selamat Datang" : "Buat Akun Baru";
document.getElementById('nickname-field').classList.toggle('hidden', isAuthLogin);
document.getElementById('auth-btn').innerText = isAuthLogin ? "Login" : "Daftar";
document.getElementById('toggle-text').innerText = isAuthLogin ? "Belum punya akun?" : "Sudah punya akun?";
document.getElementById('toggle-btn').innerText = isAuthLogin ? "Daftar" : "Login";
}

async function handleAuth() {
const email = document.getElementById('auth-email').value, password = document.getElementById('auth-pass').value, nick = document.getElementById('auth-nick').value, btn = document.getElementById('auth-btn');
btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
try {
if (isAuthLogin) {
const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
if (error) throw error;
showToast("Login berhasil!", "success");
} else {
const { data: { user }, error } = await supabaseClient.auth.signUp({ email, password });
if (error) throw error;
const { error: dbErr } = await supabaseClient.from('profiles').upsert({ id: user.id, nickname: nick || "Player", avatar_url: "" });
if (dbErr) throw new Error("Database Profil Error: " + dbErr.message);
showToast("Akun berhasil dibuat!", "success");
}

document.getElementById('auth-email').value = '';
document.getElementById('auth-pass').value = '';
document.getElementById('auth-nick').value = '';

// FITUR IZIN NOTIFIKASI
// Bungkus notifikasi dengan try-catch agar jika PWA menolak, login tetap sukses
try {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission().catch(() => {});
    }
} catch (err) {
    console.log("Notifikasi otomatis diblokir oleh OS.");
}

await checkSession();
closeAuthModal();


} catch (e) {
showToast(e.message, "error");
} finally {
btn.disabled = false;
btn.innerText = isAuthLogin ? "Login" : "Daftar";
}
}

async function handleLogout() {
    // 1. Panggil logout Supabase
    await supabaseClient.auth.signOut();

    // 2. BERSIHKAN VARIABEL GLOBAL (Wajib!)
    currentUser = null;
    userProfile = null;
    viewedUserId = null; 
    blockedUsersList = [];
    allVideosData = []; 
    globalPersonalList = [];
    globalGroupList = [];

    // 3. BERSIHKAN LOCAL STORAGE (PENTING)
    localStorage.removeItem('optimistic_vip');
    localStorage.clear(); 

    // 4. BERSIHKAN REALTIME SUBSCRIPTION
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
        messageSubscription = null;
    }
    if (presenceChannel) {
        supabaseClient.removeChannel(presenceChannel);
        presenceChannel = null;
    }

    // 🔥 [TAMBAHAN BARU] Bantai UI VIP saat tombol Logout dipencet
    const elExpired = document.getElementById('toko-vip-expired');
    const elBadge = document.getElementById('badge-toko-vip');
    if (elExpired) {
        elExpired.classList.add('hidden');
        elExpired.style.display = 'none';
        elExpired.innerHTML = ''; 
    }
    if (elBadge) {
        elBadge.classList.add('hidden');
        elBadge.style.display = 'none';
    }

    // 5. Reset UI ke tampilan "Logged Out"
    updateUIForLoggedOut();
    
    // 6. Refresh sesi untuk memastikan tampilan benar-benar berubah
    checkSession();
    
    showToast("Anda telah keluar.", "info");
}



function updateUIForLoggedIn() {
    const ava = (userProfile?.avatar_url && userProfile.avatar_url !== "") ? userProfile.avatar_url : `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'User'}&background=1A1133&color=fff`;
    document.getElementById('header-user').innerHTML = `
    <div onclick="switchTab('profile')" class="flex items-center gap-2 cursor-pointer bg-white/5 pr-4 pl-1 py-1 rounded-full border border-white/10 active:scale-95 transition-transform">
    <img src="${ava}" class="w-7 h-7 rounded-full object-cover border border-brand-info">
    <span class="text-[10px] font-bold text-white">${userProfile?.nickname || 'User'}</span>
    </div>`;

    renderProfileVideos();

    // 🔥 TAMBAHAN BARU: Tarik data saldo ke layar Layanan (PPOB) begitu user login
    if (typeof updateSaldoGlobal === 'function') {
        updateSaldoGlobal();
    }

    if(currentUser) {
        fetchFollowStats(currentUser.id);
        if (document.getElementById('toko') && document.getElementById('toko').classList.contains('active')) {
            loadTokoSaya();
        }
    }
}

async function renderProfileVideos(targetUserId = null) {
    const grid = document.getElementById('profile-video-grid');
    if (!grid) return;

    const uidToRender = String(targetUserId || (currentUser ? currentUser.id : viewedUserId));

    if (!uidToRender || uidToRender === 'null' || uidToRender === 'undefined') {
        grid.innerHTML = '';
        return;
    }

    if (allVideosData.length === 0) {
        try {
            grid.innerHTML = '<div class="col-span-3 text-center text-xs text-brand-info py-4"><i class="fas fa-spinner fa-spin text-xl mb-2"></i><br>Memuat...</div>';
            const res = await fetch('/api/get-videos');
            let dataDariSheet = await res.json();

            dataDariSheet = dataDariSheet.map((v, index) => {
                v.original_index = index; // <--- SUNTIKAN TIKET ANTREAN
                v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
                v.user_id = v.user_id || v.User_ID || v.userId || v.userid; 
                return v;
            });

            let nextIdx = dataDariSheet.length;
            newUploads.forEach(newVid => {
                newVid.id = newVid.id || newVid.video_id;
                if (!dataDariSheet.find(v => v.id === newVid.id)) {
                    newVid.original_index = nextIdx++;
                    dataDariSheet.push(newVid);
                }
            });

            dataDariSheet = dataDariSheet.filter(v => !blockedUsersList.includes(v.user_id));
            allVideosData = dataDariSheet;
        } catch(e) {
            grid.innerHTML = '<p class="col-span-3 text-center text-xs text-red-500 py-4">Gagal memuat video profil.</p>';
            return;
        }
    }

    const userVideos = allVideosData.filter(v => String(v.user_id) === uidToRender);

    const elLikes = document.getElementById('profile-total-likes');
    if (elLikes) elLikes.innerText = (userVideos.length * 3);

    // KUNCI PENGURUTAN: Acuhkan tanggal yang eror, langsung susun berdasarkan tiket antrean asli!
    const reversedVideos = [...userVideos].sort((a, b) => {
        return (b.original_index || 0) - (a.original_index || 0);
    });

    if (reversedVideos.length === 0) {
        grid.innerHTML = '<div class="col-span-3 text-center text-xs text-gray-500 py-8 bg-black/20 rounded-xl border border-white/5"><i class="fas fa-film text-2xl mb-2 opacity-50"></i><br>Belum ada video yang diupload.</div>';
        return;
    }

    grid.innerHTML = reversedVideos.map((vid, index) => {
        return `
        <div class="aspect-[9/16] bg-black relative rounded-md overflow-hidden border border-white/10 group cursor-pointer" onclick="openProfileFeed('${vid.user_id}', ${index})">
            <video class="w-full h-full object-cover" preload="metadata">
                <source src="${vid.video_url}" type="video/mp4">
            </video>
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-play text-white text-xl"></i>
            </div>
        </div>
        `;
    }).join('');
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

function updateUIForLoggedOut() {
document.getElementById('header-user').innerHTML = `<button onclick="openAuthModal()" class="text-[10px] font-bold bg-white/10 px-4 py-2 rounded-full border border-white/10 uppercase active:scale-95 transition-transform">Login / Daftar</button>`;
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    
    const icon = document.querySelector('label[for="avatar-input"] i'); 
    icon.className = 'fas fa-spinner fa-spin';
    
    try {
        showToast("Memproses foto profil...", "info");

        // 1. Kompresi gambar menggunakan fungsi bawaan Anda
        const compressedBlob = await compressImage(file);
        
        // Ubah blob hasil kompresi menjadi objek File utuh (format JPEG)
        const finalFile = new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" });

        // 2. LOGIKA PENGHAPUSAN FOTO LAMA (ANTI NUMPUK)
        const oldAvatarUrl = userProfile?.avatar_url || "";
        // Pastikan foto lama ada dan BUKAN avatar default dari ui-avatars.com
        if (oldAvatarUrl && !oldAvatarUrl.includes('ui-avatars.com')) {
            await fetch('/api/delete-s3?type=file', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: oldAvatarUrl })
            }).catch(e => console.log("Abaikan jika file lama sudah tidak ada:", e));
        }

        // 3. Tentukan Folder Baru: {User ID}/avatar/
        const pathLengkap = `${currentUser.id}/avatar/ava_${Date.now()}`;

        // 4. Minta URL Upload dari satelit/Biznet
        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(finalFile.type)}`);
        const dataUrl = await resUrl.json();

        // 5. Upload file fisik langsung ke Storage (Lebih ringan dari Base64)
        await fetch(dataUrl.uploadUrl, {
            method: 'PUT',
            body: finalFile,
            headers: { 'Content-Type': finalFile.type, 'x-amz-acl': 'public-read' }
        });

        // 6. Update URL foto di Supabase Database
        const currentNick = userProfile?.nickname || "Player";
        // Walau variabelnya finalVideoUrl, ini adalah link universal dari API Anda
        const newAvatarUrl = dataUrl.finalVideoUrl; 

        const { error: dbErr } = await supabaseClient
            .from('profiles')
            .upsert({ id: currentUser.id, nickname: currentNick, avatar_url: newAvatarUrl });

        if (dbErr) throw new Error(dbErr.message);

        // 7. Update tampilan layar tanpa perlu reload
        const elImg = document.getElementById('profile-img'); 
        if (elImg) elImg.src = newAvatarUrl;

        await fetchProfile();
        updateUIForLoggedIn();
        showToast("Foto profil berhasil diperbarui!", "success");

    } catch (e) {
        showToast("Gagal upload: " + e.message, "error");
    } finally {
        icon.className = 'fas fa-camera text-xs';
    }
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

// --- FUNGSI 1: KHUSUS UNTUK MATIKAN/NYALAKAN SUARA GLOBAL ---
function toggleGlobalAudio() {
    isGlobalMuted = !isGlobalMuted;
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.muted = isGlobalMuted);
    showToast(isGlobalMuted ? "Suara Dimatikan" : "Suara Dinyalakan", isGlobalMuted ? "info" : "success");
}

// --- FUNGSI 2: KHUSUS UNTUK MODE FLOATING (LAYAR REDUP) ---
function toggleFloatingMode(skipHistory = false) {
    const isCurrentlyFocused = document.body.classList.contains('video-focused');
    const allWraps = document.querySelectorAll('.video-inner-wrap');
    const navBottom = document.querySelector('nav');
    const headerTop = document.querySelector('header');

    if(isCurrentlyFocused) {
        // MATIKAN EFEK FLOATING
        allWraps.forEach(wrap => wrap.classList.remove('floating-focus'));
        document.body.classList.remove('video-focused');

        // Hapus efek blur pada UI
        if(navBottom) navBottom.style.filter = 'none';
        if(headerTop) headerTop.style.filter = 'none';

        // Tutup paksa layar popup jika terbuka
        const floatingPlayer = document.getElementById('floating-video-player');
        if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
            closeFloatingVideo(true); 
        }

        // Hapus jejak URL HANYA jika tidak ada instruksi skipHistory
        if (!skipHistory && window.location.hash === '#focused') {
            history.back();
        }
    } else {
        // NYALAKAN EFEK FLOATING
        document.body.classList.add('video-focused');

        // Tambahkan history agar tombol kembali HP terdeteksi
        history.pushState({ popup: 'focused' }, null, '#focused');

        // Terbangkan HANYA video yang sedang aktif
        document.querySelectorAll('.video-player').forEach(v => {
            if (!v.paused) {
                const wrap = v.closest('.video-inner-wrap');
                if (wrap) wrap.classList.add('floating-focus');
            }
        });

        // Redupkan sisa antarmuka
        if(navBottom) navBottom.style.filter = 'blur(8px) opacity(0.5)';
        if(headerTop) headerTop.style.filter = 'blur(8px) opacity(0.5)';
    }
}

function switchTab(tabId, event = null, isPush = true) {
    if (event) event.preventDefault();

    // 🔥 FIX: Mencegah tabrakan layar freeze saat klik AU2Hub dari dalam mode Nonton Video
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
    }

    // Matikan pemutar video secara paksa jika user meninggalkan tab Sosial
    if (tabId !== 'sosial') {
        document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
            v.pause();
        });
    }

    // 🚀 PRO-FIX 5 TAHUN: PAKSA BALIK PROFIL SENDIRI TANPA SYARAT + CLEAR PARAMS URL
    if (tabId === 'profile' && event !== null && currentUser) {
        viewedUserId = currentUser.id;

        // Bersihkan sisa query string (?id=...) dari URL biar balik murni mentereng ke #profile
        history.replaceState({ popup: 'my_profile' }, null, '#profile');

        openUserProfile(currentUser.id);
        return; // hentikan karena openUserProfile akan mengeksekusi switchTab secara mandiri
    }

    if (tabId !== 'profile' && tabId !== 'pembayaran' && tabId !== 'upload') {
        tabSebelumnya = tabId;
    }
    
    if (tabId === 'layanan' && isPush && document.getElementById('pembayaran').classList.contains('active')) {
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        return;
    }

    const targetSection = document.getElementById(tabId) || document.getElementById('home');
    if (!targetSection) return;

    // 🚨 PERBAIKAN: Jangan pernah simpan layar pembayaran/upload sebagai layar terakhir
    if (tabId !== 'pembayaran' && tabId !== 'upload') {
        localStorage.setItem('lastTab', tabId);
    }

    // 1. Matikan semua tab
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    // 2. Matikan semua icon navbar
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        const icon = n.querySelector('i');
        if (icon) icon.style.animation = 'none';
    });

    // 3. Nyalakan tab yang dituju
    targetSection.classList.add('active');

    // 4. Nyalakan icon navbar yang dituju (Cari yang onclick-nya mengandung nama tab)
    const targetNav = document.querySelector(`.nav-item[onclick*="switchTab('${tabId}')"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    if (tabId === 'toko') {
        if (typeof loadTokoSaya === 'function') loadTokoSaya();
    }

    // 🔥 [BARU] Panggil fungsi video saat tab Sosial ditekan
    if (tabId === 'sosial') {
        const feedContainer = document.getElementById('feed-container');
        // Jika layar feed masih kosong, jalankan mesin video!
        if (feedContainer && feedContainer.children.length === 0) {
            if (typeof loadVideos === 'function') loadVideos();
        }
    }

    // 🔥 [TAMBAHAN BARU] Panggil fungsi PPOB & Saldo saat tab Layanan ditekan
    if (tabId === 'layanan') {
        // Panggil saldo terbaru dari database untuk ditampilkan di layar!
        if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
    }
}

window.addEventListener('popstate', () => {
    let isPopupClosed = false;

    // TANGKAP LAYAR KATALOG PPOB (GOPAY STYLE)
    const katalogPPOB = document.getElementById('ppob-catalog-view');
    if (katalogPPOB && !katalogPPOB.classList.contains('hidden')) {
        tutupKatalogPPOB(true);
        return;
    }

    // 🔥 [BARU] TANGKAP LAYAR PROSES PEMBAYARAN / SUKSES
    const sectionPembayaran = document.getElementById('pembayaran');
    if (sectionPembayaran && sectionPembayaran.classList.contains('active')) {
        // 1. Bersihkan interval penjemputan API & websocket jika ditekan back saat loading
        if (typeof intervalJemputBola !== 'undefined' && intervalJemputBola) {
            clearInterval(intervalJemputBola);
            intervalJemputBola = null;
        }
        if (typeof activeChannelPembayaran !== 'undefined' && activeChannelPembayaran) {
            supabaseClient.removeChannel(activeChannelPembayaran);
            activeChannelPembayaran = null;
        }

        // 2. Refresh semua data terkait diam-diam di latar belakang
        setTimeout(() => {
            if (typeof loadPasarPlayer === 'function') loadPasarPlayer(true);
            if (document.getElementById('toko') && document.getElementById('toko').classList.contains('active')) {
                if (typeof loadProdukSaya === 'function') loadProdukSaya();
            }
            if (typeof updateUiSaldoSeller === 'function') updateUiSaldoSeller();
            if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
            if (typeof currentUser !== 'undefined' && currentUser && typeof loadOrderTracker === 'function') loadOrderTracker(currentUser.id);
        }, 400);
        
        // Lanjut eksekusi popstate ke bawah untuk menutup tab pembayaran...
    }

    // TANGKAP LACI OPSI KREATOR
    const modalKreator = document.getElementById('modal-kreator-option');
    if (modalKreator && !modalKreator.classList.contains('hidden')) {
        tutupMenuKreator(true);
        return;
    }

    // TANGKAP LACI MODAL NETFLIX
    const modalNetflix = document.getElementById('modal-netflix');
    if (modalNetflix && !modalNetflix.classList.contains('hidden')) {
        modalNetflix.classList.add('hidden');
        modalNetflix.classList.remove('flex');
        return;
    }

    // 🚀 1. TANGKAP POP-UP ALERT, PROMPT, & CONFIRM (Anti Terpental)
    const modalAlert = document.getElementById('modal-alert');
    if (modalAlert && !modalAlert.classList.contains('hidden')) {
        modalAlert.classList.add('hidden');
        modalAlert.classList.remove('flex');
        if (typeof modalAlert.alertResolve === 'function') {
            modalAlert.alertResolve();
            modalAlert.alertResolve = null;
        }
        return;
    }

    const modalPrompt = document.getElementById('modal-prompt');
    if (modalPrompt && !modalPrompt.classList.contains('hidden')) {
        modalPrompt.classList.add('hidden');
        modalPrompt.classList.remove('flex');
        if (typeof modalPrompt.promptResolve === 'function') {
            let result = modalPrompt.hasOwnProperty('promptResult') ? modalPrompt.promptResult : null;
            modalPrompt.promptResolve(result);
            modalPrompt.promptResolve = null;
            delete modalPrompt.promptResult;
        }
        return;
    }

    const modalConfirm = document.getElementById('modal-confirm');
    if (modalConfirm && !modalConfirm.classList.contains('hidden')) {
        modalConfirm.classList.add('hidden');
        modalConfirm.classList.remove('flex');
        if (typeof modalConfirm.confirmResolve === 'function') {
            let result = modalConfirm.hasOwnProperty('confirmResult') ? modalConfirm.confirmResult : false;
            modalConfirm.confirmResolve(result);
            modalConfirm.confirmResolve = null;
            delete modalConfirm.confirmResult;
        }
        return;
    }

    // ==========================================
    // TANGKAP SEMUA MODAL PASAR PLAYER
    // ==========================================
    const modalGalleryPasar = document.getElementById('modal-gallery-pasar');
    if (modalGalleryPasar && !modalGalleryPasar.classList.contains('hidden')) {
        tutupGalleryPasar(true);
        return;
    }

    const modalDetailPasar = document.getElementById('modal-detail-pasar');
    if (modalDetailPasar && !modalDetailPasar.classList.contains('hidden')) {
        tutupDetailPasar(true);
        return;
    }

    const modalJual = document.getElementById('modal-jual-barang');
    if (modalJual && !modalJual.classList.contains('hidden')) {
        tutupModalJualBarang(true);
        return;
    }

    const modalEditProduk = document.getElementById('modal-edit-produk');
    if (modalEditProduk && !modalEditProduk.classList.contains('hidden')) {
        tutupModalEditProduk(true);
        return;
    }
    // ==========================================

    // TANGKAP LACI DOMPET
    const modalDompet = document.getElementById('modal-saldo-dompet');
    if (modalDompet && !modalDompet.classList.contains('hidden')) {
        tutupModalSaldoDompet(true);
        return;
    }
    
    // TANGKAP LACI BUAT GRUP BARU
    const modalCreateGroup = document.getElementById('modal-create-group');
    if (modalCreateGroup && !modalCreateGroup.classList.contains('hidden')) {
        closeCreateGroupModal(true);
        return;
    }

    // TANGKAP LACI TERUSKAN PESAN (FORWARD)
    const modalForward = document.getElementById('modal-forward-msg');
    if (modalForward && !modalForward.classList.contains('hidden')) {
        closeForwardModal(true);
        return;
    }

    // TANGKAP LACI VIP SELLER
    const modalLangganan = document.getElementById('modal-langganan-seller');
    if (modalLangganan && !modalLangganan.classList.contains('hidden')) {
        tutupModalLangganan(true);
        return;
    }

    // 1. TANGKAP INFO GRUP
    const modalGroupInfo = document.getElementById('modal-group-info');
    if (modalGroupInfo && !modalGroupInfo.classList.contains('hidden')) {
        closeGroupInfoModal(true);
        return;
    }

    const modalPreviewMedia = document.getElementById('modal-preview-media');
    if (modalPreviewMedia && !modalPreviewMedia.classList.contains('hidden')) {
        tutupPreviewMedia(true);
        return;
    }

    // 2. TANGKAP MODAL INVOICE
    const modalInvoice = document.getElementById('modal-detail-pesanan');
    if (modalInvoice && !modalInvoice.classList.contains('hidden')) {
        closeDetailPesanan(true);
        return;
    }

    // 3. BARU TANGKAP MODAL RIWAYAT PESANAN
    const modalRiwayat = document.getElementById('modal-riwayat-pesanan');
    if (modalRiwayat && !modalRiwayat.classList.contains('hidden')) {
        closeRiwayatPesanan(true); 
        return;
    }

    // 🚀 TANGKAP LAYAR PRATINJAU FULL SCREEN DULU
    const modalPratinjau = document.getElementById('modal-pratinjau');
    if (modalPratinjau && !modalPratinjau.classList.contains('hidden')) {
        tutupPratinjauVideo(true);
        return;
    }

    // 🚀 TANGKAP MODAL UPLOAD VIDEO & PRIVASI
    const modalPrivasi = document.getElementById('modal-privasi-video');
    if (modalPrivasi && (!modalPrivasi.classList.contains('hidden') && !modalPrivasi.classList.contains('translate-y-full'))) {
        tutupPilihanPrivasi();
        history.pushState({ popup: 'upload' }, null, '#upload');
        return;
    }

    const modalUpload = document.getElementById('modal-upload');
    if (modalUpload && !modalUpload.classList.contains('hidden')) {
        closeUploadModal();
        return;
    }

    const lightbox = document.getElementById('lightbox-modal');
    if(!lightbox.classList.contains('hidden')) {
        closeLightbox();
        return;
    }

    // Tangkap laci Dilihat/Disukai dulu!
    const statsModal = document.getElementById('modal-story-stats');
    if (statsModal && !statsModal.classList.contains('translate-y-full')) {
        closeStoryStatsModal(true);
        return;
    }

    // Baru tangkap layar pemutar Story utamanya
    const storyModal = document.getElementById('story-viewer-modal');
    if (storyModal && !storyModal.classList.contains('hidden')) {
        closeStoryViewer(true);
        return;
    }

    const modalMsgOption = document.getElementById('modal-msg-option');
    if (!modalMsgOption.classList.contains('hidden')) {
        modalMsgOption.classList.add('hidden'); modalMsgOption.classList.remove('flex');
        return;
    }

    const commentDrawer = document.getElementById('comment-drawer');
    if (commentDrawer.classList.contains('open')) {
        commentDrawer.classList.remove('open');
        cancelReply();

        if (commentSubscription) {
            supabaseClient.removeChannel(commentSubscription);
            commentSubscription = null;
        }
        return;
    }

    const modalEvent = document.getElementById('modal-event');
    if (!modalEvent.classList.contains('hidden')) {
        modalEvent.classList.add('hidden'); modalEvent.classList.remove('flex');
        document.body.style.overflow = 'auto'; isPopupClosed = true;
    }

    const modalEditProfile = document.getElementById('modal-edit-profile');
    if (!modalEditProfile.classList.contains('hidden')) {
        closeEditProfileModal();
        isPopupClosed = true;
    }

    const modalUserList = document.getElementById('modal-user-list');
    if (!modalUserList.classList.contains('hidden')) {
        closeUserList();
        isPopupClosed = true;
    }

    const widget = document.getElementById('floating-widget');

    if (!widget.classList.contains('opacity-0')) {
        const roomView = document.getElementById('chat-room-view');
        if (roomView && roomView.classList.contains('flex')) {
            closeChatRoom(true);
            return; 
        } else {
            widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
            return;
        }
    }

    const authModal = document.getElementById('modal-auth');
    if (authModal && !authModal.classList.contains('hidden')) {
        authModal.classList.add('hidden');
        authModal.classList.remove('flex');
        isPopupClosed = true;
    }

    const leaderboardModal = document.getElementById('modal-leaderboard');
    if (leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
        leaderboardModal.classList.add('hidden');
        leaderboardModal.classList.remove('flex');

        const chatBtn = document.querySelector('button[onclick="toggleWidget()"]');
        if (chatBtn) chatBtn.classList.remove('hidden');

        isPopupClosed = true;
    }

    const hashtagGrid = document.getElementById('modal-hashtag-grid');
    if (hashtagGrid && !hashtagGrid.classList.contains('hidden') && !hashtagGrid.classList.contains('translate-x-full')) {
        closeHashtagGrid(true);
        return;
    }

    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode();
        return;
    }

    const floatingPlayer = document.getElementById('floating-video-player');
    if (!floatingPlayer.classList.contains('hidden')) {
        closeFloatingVideo();
        return;
    }

    if (isPopupClosed) return;

    const newHash = window.location.hash.substring(1) || 'home';
    if (newHash === 'profile' && viewedUserId !== currentUser?.id) {
        viewedUserId = currentUser?.id;
        checkSession();
    }
    
    // 🔥 PERBAIKAN: Jaring Pengaman Mutlak + Deteksi Link Toko Shopee
    const cleanHash = newHash.split('?')[0];
    const validTabs = ['home', 'sosial', 'pasar', 'toko', 'layanan', 'pesanan', 'profile', 'pembayaran', 'superadmin', 'tokopublik'];
    
    // [BARU] Jika user klik link Toko Publik dari chat atau luar aplikasi
    if (newHash.startsWith('tokopublik?seller=') || newHash.startsWith('pasar?seller=')) {
        const sellerName = decodeURIComponent(newHash.split('=')[1]);
        
        // Paksa ubah URL di address bar jadi tokopublik (backwards compatibility)
        if (newHash.startsWith('pasar?seller=')) {
            history.replaceState(null, null, '#tokopublik?seller=' + encodeURIComponent(sellerName));
        }
        
        switchTab('tokopublik', null, false);
        loadTokoPublikLuar(sellerName); // Panggil UI Shopee-nya!
        return; // Hentikan script di sini
    }

    if (!validTabs.includes(cleanHash)) {
        history.replaceState(null, null, '#' + tabSebelumnya);
        switchTab(tabSebelumnya, null, false);
    } else {
        switchTab(cleanHash, null, false);
    }
});

// FUNGSI KEMBALI DARI PROFIL YANG SUDAH DIPERBAIKI SANGAT AMAN
function kembaliDariProfil() {
    // Pindah tab secara visual
    switchTab(tabSebelumnya, null, false);

    // Mengganti URL tanpa memicu popstate yang berisiko bentrok dengan chat widget
    history.replaceState(null, null, '#' + tabSebelumnya);

    // Reset profil yang tertinggal di background (agar siap pas di-klik dari bawah)
    if (currentUser) {
        viewedUserId = currentUser.id;

        // 1. Ambil data current user
        const userVideos = allVideosData.filter(v => v.user_id === currentUser.id);
        const myExp = userProfile?.exp || 0;
        const myStatusLevel = hitungStatusLevel(myExp);
        const myBadgeHTML = getBadgeByLevelAndVideos(myStatusLevel.level, userVideos.length);

        // 2. Kembalikan Nickname & Badge
        const pNick = document.getElementById('profile-nickname'); 
        if(pNick) pNick.innerHTML = "@" + (userProfile?.nickname || "Player") + myBadgeHTML;

        // 3. Kembalikan Bio & Foto
        const pBio = document.getElementById('profile-bio'); if(pBio) pBio.innerText = userProfile?.bio || "Belum ada deskripsi.";
        const pImg = document.getElementById('profile-img'); if(pImg) pImg.src = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Player'}&background=1A1133&color=fff`;

        // 4. Kembalikan Level & Bar EXP
        const elLevelBadge = document.getElementById('profile-level-badge');
        const elExpContainer = document.getElementById('profile-exp-container');

        if (elLevelBadge && elExpContainer) {
            elLevelBadge.innerText = `Lv. ${myStatusLevel.level}`;
            elLevelBadge.classList.remove('hidden');
            
            document.getElementById('text-exp-current').innerText = `EXP: ${myStatusLevel.exp}`;
            document.getElementById('text-exp-target').innerText = `Next: ${myStatusLevel.targetNextLevel}`;
            
            setTimeout(() => {
                document.getElementById('bar-exp-progress').style.width = `${myStatusLevel.persentase}%`;
            }, 100);
            
            elExpContainer.classList.remove('hidden');
        }

const actionOwn = document.getElementById('profile-actions-own'); 
if(actionOwn) { 
    actionOwn.classList.remove('hidden'); 
    actionOwn.style.display = 'flex'; 
}

const actionOther = document.getElementById('profile-actions-other'); 
if(actionOther) { 
    actionOther.classList.add('hidden'); 
    actionOther.style.display = 'none'; 
}

        const btnBack = document.getElementById('btn-back-profile'); if(btnBack) btnBack.classList.add('hidden');
        const btnEditAva = document.getElementById('btn-edit-avatar'); if(btnEditAva) btnEditAva.classList.remove('hidden');

        const elVidTitle = document.getElementById('profile-video-title');
        if(elVidTitle) elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video Saya`;

        renderProfileVideos(currentUser.id);
        fetchFollowStats(currentUser.id);
    } else {
        viewedUserId = null;
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden'));
        document.getElementById('profile-logged-out').classList.remove('hidden');
        const btnBack = document.getElementById('btn-back-profile'); if(btnBack) btnBack.classList.add('hidden');
    }
}


function openModalEvent() {
history.pushState({ popup: 'modal' }, null, '#event');
const modal = document.getElementById('modal-event');
modal.classList.remove('hidden'); modal.classList.add('flex');
document.body.style.overflow = 'hidden';
setTimeout(() => { const carousel = document.getElementById('image-carousel'); if(carousel) { carousel.scrollLeft = 0; updateCarouselDots(); } }, 50);
}

function closeModalEvent() {
if (window.location.hash === '#event') { history.back(); } else {
const modal = document.getElementById('modal-event');
modal.classList.add('hidden'); modal.classList.remove('flex');
document.body.style.overflow = 'auto';
}
}

function openUploadModal() {
    // Matikan efek floating otomatis saat buka modal upload TANPA memicu history.back()
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
        // 🔥 PERBAIKAN: Hapus jejak #focused dari URL agar tidak nyangkut saat dibatalkan
        history.replaceState(null, null, '#' + tabSebelumnya);
    }

    // Tambahkan history baru untuk modal upload
    history.pushState({ popup: 'upload' }, null, '#upload');
    const m = document.getElementById('modal-upload');
    m.classList.remove('hidden');
    m.classList.add('flex');
}

// Tombol Pintasan # dan @ ala TikTok
function insertUploadShortcut(char) {
    const textarea = document.getElementById('input-video-caption');
    if (!textarea) return;
    
    const pos = textarea.selectionStart;
    const text = textarea.value;
    
    // Sisipkan karakter di posisi kursor aktif
    textarea.value = text.substring(0, pos) + char + text.substring(pos);
    textarea.focus();
    
    // Pindahkan kursor tepat setelah karakter yang dimasukkan
    textarea.setSelectionRange(pos + 1, pos + 1);
}

// Override Fungsi handleVideoSelect Bawaan Anda agar Pas di Mini Cover
function handleVideoSelect(input) {
    const file = input.files[0];
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('video-preview-container');
    const previewVideo = document.getElementById('video-preview-element');
    const spinner = document.getElementById('mini-upload-spinner');

    if (file) {
        // Validasi ukuran maksimal 50MB biar memori HP pembeli gak jebol
        if (file.size > 50 * 1024 * 1024) {
            showToast("Ukuran video terlalu besar! Maksimal 50MB.", "error");
            input.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        
        // Sembunyikan instruksi teks, nyalakan layar preview video mini
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
        
        // Nyalakan spinner loading
        if (spinner) spinner.classList.remove('hidden');

        // Tunggu video siap diputar, lalu matikan spinner
        previewVideo.oncanplay = () => {
            if (spinner) spinner.classList.add('hidden');
        };
        
        // Putar video otomatis tanpa suara di pojok kanan laci
        previewVideo.muted = true;
        previewVideo.play().catch(() => {});
        showToast("Video berhasil dimuat!", "success");
    }
}

// Override Fungsi closeUploadModal Agar Mereset Seluruh Tampilan Mini Cover
function closeUploadModal() {
    if (window.location.hash === '#upload') history.back();
    const m = document.getElementById('modal-upload');
    m.classList.add('hidden'); 
    m.classList.remove('flex');

    // Reset Form & Preview Kembalikan ke Default
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('video-preview-container');
    const previewVideo = document.getElementById('video-preview-element');
    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewVideo) { 
        // BONGKAR MEMORI: Hapus Object URL agar RAM lega
        if (previewVideo.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewVideo.src);
        }
        previewVideo.pause(); 
        previewVideo.src = ''; 
    }
    if (fileInput) fileInput.value = '';
    if (captionInput) captionInput.value = '';
}


async function openUserProfile(userId) {
    try {
        let wasPopupOpen = false;

        if (document.body.classList.contains('video-focused')) {
            toggleFloatingMode(true);
            wasPopupOpen = true;
        }

        const floatingPlayer = document.getElementById('floating-video-player');
        if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
            closeFloatingVideo(true);
            wasPopupOpen = true;
        }

        viewedUserId = userId;

        setTimeout(() => {
            switchTab('profile', null, false);
        }, 10);

        document.getElementById('profile-loading').classList.remove('hidden');
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden'));

        const currentUserId = currentUser ? String(currentUser.id) : null;
        const targetId = String(userId);
        const isOwn = (targetId === currentUserId);

        const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') {
            console.error("Error database:", error);
        }

        const elBio2 = document.getElementById('profile-bio'); if(elBio2) elBio2.innerText = data?.bio || "Belum ada deskripsi.";
        const elImg2 = document.getElementById('profile-img'); if(elImg2) elImg2.src = data?.avatar_url || `https://ui-avatars.com/api/?name=${data?.nickname || 'Player'}&background=1A1133&color=fff`;

        const actionOwn = document.getElementById('profile-actions-own');
        const actionOther = document.getElementById('profile-actions-other');

        if (isOwn) {
            if(actionOwn) { actionOwn.classList.remove('hidden'); actionOwn.style.display = 'flex'; }
            if(actionOther) { actionOther.classList.add('hidden'); actionOther.style.display = 'none'; }
        } else {
            if(actionOwn) { actionOwn.classList.add('hidden'); actionOwn.style.display = 'none'; }
            if(actionOther) { actionOther.classList.remove('hidden'); actionOther.style.display = 'flex'; }
        }

        const btnBack = document.getElementById('btn-back-profile');
        if (btnBack) {
            if (isOwn) { btnBack.classList.add('hidden'); btnBack.style.display = 'none'; }
            else { btnBack.classList.remove('hidden'); btnBack.style.display = 'flex'; }
        }

        const inputAva = document.getElementById('btn-edit-avatar');
        if(inputAva) {
            if(isOwn) { inputAva.classList.remove('hidden'); inputAva.style.display = 'flex'; }
            else { inputAva.classList.add('hidden'); inputAva.style.display = 'none'; }
        }

        const elVidTitle = document.getElementById('profile-video-title');
        if(elVidTitle) {
            if(isOwn) { elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video Saya`; }
            else { elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video ${data?.nickname || ''}`; }
        }

        await renderProfileVideos(userId);

        const userVideos = allVideosData.filter(v => String(v.user_id) === targetId);
        const expDataLain = data?.exp || 0;
        const statusLevelObj = hitungStatusLevel(expDataLain);
        const badgeHTML = getBadgeByLevelAndVideos(statusLevelObj.level, userVideos.length);
        
        const elNick2 = document.getElementById('profile-nickname');
        if(elNick2) elNick2.innerHTML = "@" + (data?.nickname || "Player") + badgeHTML;

        const elLevelBadge = document.getElementById('profile-level-badge');
        const elExpContainer = document.getElementById('profile-exp-container');

        if (elLevelBadge && elExpContainer) {
            elLevelBadge.innerText = `Lv. ${statusLevelObj.level}`;
            elLevelBadge.classList.remove('hidden');
            
            document.getElementById('text-exp-current').innerText = `EXP: ${statusLevelObj.exp}`;
            document.getElementById('text-exp-target').innerText = `Next: ${statusLevelObj.targetNextLevel}`;
            
            setTimeout(() => {
                document.getElementById('bar-exp-progress').style.width = `${statusLevelObj.persentase}%`;
            }, 100);
            
            elExpContainer.classList.remove('hidden');
        }

        const elLikes = document.getElementById('profile-total-likes');
        if (elLikes) elLikes.innerText = (userVideos.length * 3);

        try { await fetchFollowStats(userId); } catch (e) { console.warn(e); }
        
        // 🛠️ PERBAIKAN: Cek apakah tombol Follow harus berstatus "Mengikuti"
        if (!isOwn && currentUser) {
            const btnFollow = document.getElementById('btn-follow');
            if (btnFollow) {
                // Cek ke database apakah user saat ini sudah follow target
                const { data: isFollowing } = await supabaseClient
                    .from('follows')
                    .select('follower_id')
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', userId)
                    .single();

                if (isFollowing) {
                    btnFollow.innerText = 'MENGIKUTI';
                    btnFollow.className = 'flex-1 bg-white/10 py-2.5 rounded-xl text-[11px] font-extrabold text-white uppercase tracking-wide transition-transform';
                } else {
                    btnFollow.innerText = 'IKUTI';
                    btnFollow.className = 'flex-1 bg-brand-accent py-2.5 rounded-xl text-[11px] font-extrabold text-white uppercase tracking-wide hover:scale-95 transition-transform shadow-[0_0_15px_rgba(255,0,122,0.3)]';
                }
            }
        }

        // 🛠️ PERBAIKAN PEMBOROSAN JARINGAN (Lihat poin 2 di bawah)
        if (isOwn) {
            try { await loadOrderTracker(userId); } catch (e) { console.warn(e); }
        }
        const btnSetAdmin = document.getElementById('btn-set-admin');
        if (btnSetAdmin) {
            if (!isOwn && userProfile?.is_super_admin === true) {
                const targetIsAdmin = data?.is_super_admin === true;
                btnSetAdmin.innerHTML = `<i class="fas fa-crown mr-1"></i> ${targetIsAdmin ? 'Cabut Akses Admin' : 'Jadikan Super Admin'}`;
                btnSetAdmin.onclick = () => toggleStatusAdmin(userId, targetIsAdmin, data?.nickname);
                btnSetAdmin.classList.remove('hidden');
            } else {
                btnSetAdmin.classList.add('hidden');
            }
        }

        document.getElementById('profile-loading').classList.add('hidden');
// Cukup hapus class hidden, biarkan Tailwind yang mengatur layoutnya
const profileContainer = document.getElementById('profile-logged-in');
if (profileContainer) {
    profileContainer.classList.remove('hidden');
    // Hapus inline style jika ada yang nyangkut
    profileContainer.style.display = ''; 
}


        checkBlockStatusUI();

        if(!isOwn) {
            if (wasPopupOpen) {
                history.replaceState({ popup: 'user_profile' }, null, `#profile?id=${userId}`);
            } else {
                history.pushState({ popup: 'user_profile' }, null, `#profile?id=${userId}`);
            }
        }
    } catch (err) {
        console.error("Gagal membuka profil:", err);
        showToast("Terjadi kesalahan saat memuat profil.", "error");
    }
}





// FUNGSI MELIHAT PROFIL USER LAIN DARI MANA SAJA
function viewUserProfile(userId) {
if (!userId || userId === 'undefined') {
showToast("Profil tidak dapat dibuka karena ID tidak ditemukan.", "error");
return;
}

// CEK BLOKIR: Hentikan jika user ini ada di daftar blokir
if (blockedUsersList.includes(userId)) {
showToast("Anda telah memblokir pengguna ini. Buka blokir untuk melihat profil.", "error");
return;
}

document.getElementById('comment-drawer').classList.remove('open');
cancelReply();

// Sembunyikan widget obrolan agar profil dapat dilihat tanpa dihalangi widget chat
const widget = document.getElementById('floating-widget');
if (widget && !widget.classList.contains('opacity-0')) {
widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
}

openUserProfile(userId);
}


async function kirimPesanPribadi(userId) {
// CEK BLOKIR: Hentikan jika mencoba nge-chat orang yang diblokir
if (blockedUsersList.includes(userId)) {
showToast("Buka blokir terlebih dahulu untuk mengirim pesan.", "error");
return;
}

const { data } = await supabaseClient.from('profiles').select('nickname, avatar_url').eq('id', userId).single();
if (data) {
const ava = data.avatar_url || `https://ui-avatars.com/api/?name=${data.nickname}&background=1A1133&color=fff`;
const widget = document.getElementById('floating-widget');
if (widget.classList.contains('opacity-0')) {
toggleWidget();
}
setTimeout(() => openChatRoom(userId, data.nickname, ava), 300);
}
}


// ================== LOGIKA PROFIL FEED SCROLL TANPA UJUNG ==================
let currentProfileVideos = [];
let profileFeedIndex = 0;
let floatObs = null;

function setupFloatVideoObserver() {
floatObs = new IntersectionObserver(es => {
es.forEach(e => {
if (e.isIntersecting) {
e.target.muted = isGlobalMuted;
const playP = e.target.play();
if (playP !== undefined) {
    playP.catch(err => {
        if (err.name === 'NotAllowedError') {
            e.target.muted = true;
            isGlobalMuted = true;
            e.target.play().catch(e => {});
        }
    });
}
// Preload video selanjutnya agar mulus
let currentContainer = e.target.closest('.snap-start');
for(let j = 0; j < 2; j++) {
currentContainer = currentContainer?.nextElementSibling;
if(currentContainer) {
const nextVid = currentContainer.querySelector('video');
if(nextVid && nextVid.getAttribute('preload') !== 'auto') nextVid.setAttribute('preload', 'auto');
}
}
} else { e.target.pause(); }
});
}, { threshold: 0.6 });
}

function openProfileFeed(userId, startIndex) {
    // 1. Ambil video milik user ini, lalu kembalikan posisinya sesuai tiket antrean asli!
    currentProfileVideos = allVideosData
        .filter(v => v.user_id === userId)
        .sort((a, b) => (b.original_index || 0) - (a.original_index || 0));

    if(currentProfileVideos.length === 0) return;

    // 2. Tentukan index target
    let targetIndex = parseInt(startIndex) || 0;

    // 3. Bersihkan memori video lama lalu kosongkan layar
    const container = document.getElementById('floating-feed-container');
    container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    container.innerHTML = '';
    container.scrollTop = 0;

    // 4. Hentikan paksa semua video utama di background
    document.querySelectorAll('.video-player').forEach(v => v.pause());

    // [BARU] Paksa suara menyala (unmute) otomatis saat video profil diklik
    isGlobalMuted = false;

    // 5. Tampilkan floating player
    document.getElementById('floating-video-player').classList.remove('hidden');
    document.getElementById('floating-video-player').classList.add('flex');
    document.getElementById('floating-video-player').style.opacity = '1'; 

    if(floatObs) floatObs.disconnect();
    setupFloatVideoObserver();

    // 6. Render Video Batch
    profileFeedIndex = 0;
    let amountToLoad = targetIndex + 3; 
    
    renderProfileVideoBatch(amountToLoad);

    // 7. Paksa scroll layar
    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 10); 

    // 8. Tanamkan URL history 
    history.pushState({ popup: 'floating_video' }, null, '#profil_video');
}



function closeFloatingVideo(skipHistory = false) {
    const p = document.getElementById('floating-video-player');
    
    // Berikan efek transisi opacity agar menutup dengan halus (fade out)
    p.style.transition = 'opacity 0.3s ease';
    p.style.opacity = '0';

    // 🚨 PERBAIKAN: Paksa pause dan kosongkan memori video sebelum dihapus
    document.querySelectorAll('.float-video-player').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load(); // Buang dari RAM HP
    });

    setTimeout(() => {
        // Sembunyikan dan reset elemen setelah efek fade selesai
        p.classList.add('hidden'); 
        p.classList.remove('flex');
        p.style.opacity = '1'; 
        
        document.getElementById('floating-feed-container').innerHTML = '';
        if(floatObs) floatObs.disconnect(); // bersihkan observer

        // Eksekusi fungsi 'back' HP jika tidak di-skip
        if (!skipHistory && window.location.hash === '#profil_video') {
            history.back();
        }
    }, 300);
}

function renderProfileVideoBatch(customAmount = 3) {
    const container = document.getElementById('floating-feed-container');

    if (profileFeedIndex >= currentProfileVideos.length) {
        return;
    }

    const nextBatch = currentProfileVideos.slice(profileFeedIndex, profileFeedIndex + customAmount);
    if (nextBatch.length === 0) return;

    const htmlString = nextBatch.map((vid) => `
    <div class="snap-start w-full h-full flex-shrink-0 relative flex items-center justify-center bg-black/95 px-0 sm:px-4 py-0 sm:py-6">
    <div class="w-full max-w-sm aspect-[9/16] relative bg-brand-dark mx-auto h-full sm:h-auto sm:rounded-3xl overflow-hidden shadow-2xl">
    
    <div class="absolute inset-0 flex items-center justify-center z-0"><div class="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div></div>

    <video class="absolute inset-0 m-auto w-full h-full object-cover float-video-player transition-opacity duration-500 opacity-0 z-10"
    onloadeddata="this.classList.remove('opacity-0')" loop ${isGlobalMuted ? 'muted' : ''} playsinline preload="metadata"
    ontimeupdate="updateVideoProgress(this)"
    onclick="handleFloatVideoClick(event, this, '${vid.id}')"
    controlsList="nodownload" oncontextmenu="return false;" style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none;">
    <source src="${vid.video_url}" type="video/mp4">
    </video>

    <div class="absolute bottom-0 left-0 w-full h-2/5 z-20 pointer-events-none bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

    <div class="volume-indicator absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white bg-black/60 w-16 h-16 rounded-full flex items-center justify-center z-[60] pointer-events-none opacity-0 transition-all duration-300 scale-150">
    <i class="fas fa-volume-up text-2xl"></i>
    </div>

    <div class="absolute bottom-0 left-0 w-full h-3 z-50 cursor-pointer group touch-none flex flex-col justify-end pb-1"
    onpointerdown="startSeek(event, this)" onpointermove="doSeek(event, this)" onpointerup="endSeek(event, this)" onpointercancel="endSeek(event, this)">
    <div class="w-full h-1 bg-white/30 relative">
    <div class="progress-fill h-full bg-white w-0 relative pointer-events-none transition-all duration-75 ease-linear">
    <div class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-md"></div>
    </div>
    </div>
    </div>

    <div class="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-2 z-40 w-[75%] pr-2 pointer-events-auto flex flex-col justify-end pb-2">
    <p onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')" class="font-bold text-[15px] text-white cursor-pointer hover:text-brand-info drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mb-1.5 flex items-center">
    @${vid.nickname || "Player"}
    </p>

    <div onclick="this.classList.toggle('expanded')" class="caption-text text-[13px] text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] cursor-pointer leading-snug">
    ${formatCaption(vid.caption)}
    </div>

    <div class="flex items-center gap-2 mt-2.5 overflow-hidden w-3/4">
    <i class="fas fa-music text-[10px] text-white animate-pulse drop-shadow-md"></i>
    <div class="overflow-hidden whitespace-nowrap relative w-full mask-text">
    <div class="inline-block text-[12px] text-white drop-shadow-md font-medium marquee-text">
    Suara Asli - @${vid.nickname || "Player"} 🎵 Original Audio
    </div>
    </div>
    </div>
    </div>

    <div class="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-center gap-4 pointer-events-auto pb-2">

    <div class="relative cursor-pointer hover:scale-105 transition-transform" onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')">
    <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=User&background=1A1133&color=fff'}" loading="lazy" class="w-[42px] h-[42px] rounded-full object-cover border-[1.5px] border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
    ${(!currentUser || (vid.user_id !== currentUser.id && !myFollowingList.includes(vid.user_id))) ? `
    <button onclick="event.stopPropagation(); feedToggleFollow('${vid.user_id}', this)" class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FF007A] text-white rounded-full w-[20px] h-[20px] flex items-center justify-center border-[1.5px] border-brand-dark drop-shadow-md active:scale-90 transition-transform z-30">
    <i class="fas fa-plus text-[9px]"></i>
    </button>
    ` : ''}
    </div>

    <div class="like-container flex flex-col items-center gap-0.5" data-vid="${vid.id}">
    <button onclick="likeVideo('${vid.id}', this)" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-heart text-[32px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></i>
    </button>
    <span class="like-count-display text-white text-[12px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">0</span>
    </div>

    <div class="comment-count-container flex flex-col items-center gap-0.5" data-vid="${vid.id}">
    <button onclick="openComments('${vid.id}')" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-comment-dots text-[32px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="transform: scaleX(-1);"></i>
    </button>
    <span class="comment-count-display text-white text-[12px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">0</span>
    </div>

    <div class="flex flex-col items-center gap-0.5 mt-1">
    <button onclick="shareVideo('${vid.id}', this)" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-share text-[30px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></i>
    </button>
    <span class="text-white text-[11px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Share</span>
    </div>

    ${currentUser && vid.user_id === currentUser.id ? `
    <!-- KONTROL KREATOR (3 DOTS INSTAGRAM STYLE) -->
    <div class="flex flex-col items-center gap-0.5 mt-1">
        <button onclick="bukaMenuKreator('${vid.video_url}', '${vid.id}')" class="hover:scale-110 transition-transform active:scale-90">
            <i class="fas fa-ellipsis-h text-[28px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></i>
        </button>
        <span class="text-white text-[11px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Lainnya</span>
    </div>
    ` : ''}


    <div class="relative mt-1 flex items-center justify-center w-10 h-10 group cursor-pointer hover:scale-105 transition-transform" onclick="event.stopPropagation()">
    <i class="fas fa-music absolute -top-4 -left-2 text-[9px] text-white/80 animate-float-music pointer-events-none"></i>
    <div class="w-9 h-9 rounded-full bg-[#1A1133] border-[3px] border-gray-800 flex items-center justify-center animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(0,0,0,0.8)]">
    <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=Music&background=1A1133&color=fff'}" class="w-4 h-4 rounded-full object-cover">
    </div>
    </div>
    </div>


    </div>
    </div>`).join('');

    container.insertAdjacentHTML('beforeend', htmlString);
    
    profileFeedIndex += nextBatch.length;

    const videoActions = container.querySelectorAll('.snap-start:not(.data-loaded)');
    videoActions.forEach((card) => {
        card.classList.add('data-loaded');
        const vidId = card.querySelector('.like-container').dataset.vid;
        updateLikeCountUI(vidId, card.querySelector('.like-container'));
        updateCommentCountUI(vidId, card.querySelector('.comment-count-container'));
    });

    const unobservedVideos = container.querySelectorAll('.float-video-player:not(.observed)');
    unobservedVideos.forEach((v, i) => {
        v.classList.add('observed'); if (floatObs) floatObs.observe(v);
        if (i === unobservedVideos.length - 1) {
            const lastVideoObserver = new IntersectionObserver(entries => {
                if(entries[0].isIntersecting) { 
                    lastVideoObserver.disconnect(); 
                    renderProfileVideoBatch(3); 
                }
            }, { threshold: 0.1 });
            lastVideoObserver.observe(v.closest('.snap-start'));
        }
    });
}



// FUNGSI KHUSUS UNTUK MENGONTROL SUARA DI VIDEO PROFIL (KLIK 1 KALI)
function toggleProfileVideoAudio(video) {
    // Ubah status suara
    video.muted = !video.muted;
    isGlobalMuted = video.muted; // Sinkronisasi dengan sistem suara global aplikasimu

    // CEK APAKAH POP-UP FLOATING SEDANG TERBUKA
    const isFloatingOpen = !document.getElementById('floating-video-player').classList.contains('hidden');

    // Sinkronkan video lain agar ikut mute/unmute jika ada yang menyala
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
        // JIKA pop-up terbuka, biarkan video background (.video-player) tetap mati/bisu
        if (isFloatingOpen && v.classList.contains('video-player')) {
            v.muted = true;
            v.pause();
        } else {
            v.muted = isGlobalMuted;
        }
    });

    // Tampilkan animasi pop-up ikon suara di tengah layar
    const container = video.closest('.relative');
    const indicator = container.querySelector('.volume-indicator');

    if(indicator) {
        indicator.innerHTML = video.muted
        ? '<i class="fas fa-volume-mute text-2xl text-gray-300"></i>'
        : '<i class="fas fa-volume-up text-2xl text-brand-info"></i>';

        // Munculkan membesar
        indicator.classList.remove('opacity-0', 'scale-150');
        indicator.classList.add('opacity-100', 'scale-100');

        // Hilangkan lagi setelah 0.8 detik
        setTimeout(() => {
            indicator.classList.remove('opacity-100', 'scale-100');
            indicator.classList.add('opacity-0', 'scale-150');
        }, 800);
    }
}


let videoClickTimer = null; 

// 1. FUNGSI KLIK FEED UTAMA (SOSMED)
function handleVideoClick(event, videoElement, vidId) {
    // Hilangkan panduan tutorial seketika saat layar diketuk
    const tutorial = document.getElementById('tutorial-tap');
    if (tutorial) {
        tutorial.style.opacity = '0';
        setTimeout(() => tutorial.remove(), 500);
        // 🔥 GEMBOK PERMANEN: Catat di HP bahwa user sudah ngerti caranya
        localStorage.setItem('tutorialPaham', 'true'); 
    }

    if (videoClickTimer) {
        clearTimeout(videoClickTimer);
        videoClickTimer = null;
        
        // Eksekusi Double Click (LIKE)
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        likeVideo(vidId, likeBtn);
        createHeartAt(event);
    } else {
        videoClickTimer = setTimeout(() => {
            videoClickTimer = null;
            // Klik 1x -> Panggil efek Floating Focus saja (Suara tidak berubah)
            toggleFloatingMode(); 
        }, 300);
    }
}

let floatClickTimer = null; 

// 2. FUNGSI KLIK VIDEO PROFIL / HASHTAG (LAYAR HITAM MENGAMBANG)
function handleFloatVideoClick(event, videoElement, vidId) {
    if (floatClickTimer) {
        clearTimeout(floatClickTimer);
        floatClickTimer = null;
        
        // Eksekusi Double Click (LIKE)
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        likeVideo(vidId, likeBtn); 
        createHeartAt(event);      
    } else {
        floatClickTimer = setTimeout(() => {
            floatClickTimer = null;
            
            // KOSONGIN AJA BIAR NGGAK MATI/NYALAIN SUARA!
            // (Atau kalau lu mau klik 1x buat Pause/Play ala TikTok, hapus garis miring di bawah ini:)
            // if (videoElement.paused) videoElement.play(); else videoElement.pause();
            
        }, 300);
    }
}


// FITUR HAPUS VIDEO PERMANEN (SINKRON KE GOOGLE SHEETS)
async function deleteVideo(vidId) {
    const hapus = await customPrompt("Ketik 'HAPUS' jika ingin menghapus video ini secara PERMANEN:");
    if(hapus === 'HAPUS') {
        try {
            // Cari data video yang mau dihapus dari memori lokal untuk dapet URL-nya
            const videoTarget = allVideosData.find(v => v.id === vidId);

            // 1. Ambil config untuk mendapatkan link Google Apps Script (GAS)
            const configRes = await fetch('/api/get-config');
            const config = await configRes.json();

            if (config.gasUrl) {
                // 2. Kirim perintah hapus ke Google Sheets via Webhook POST
                await fetch(config.gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'DELETE', id: vidId })
                });
            }

            // 3. TEMBAK API DELETE FILE: Hapus fisik MP4 dari Biznet
            if (videoTarget && videoTarget.video_url) {
                await fetch('/api/delete-s3?type=file', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrl: videoTarget.video_url })
                }).catch(e => console.log("Ignore S3 error:", e));
            }

            // 4. Bersihkan data dari memori RAM lokal HP (Feed Sosial & Profil)
            allVideosData = allVideosData.filter(v => v.id !== vidId);
            newUploads = newUploads.filter(v => v.id !== vidId); // Bersihkan juga dari antrean lokal

            // 5. Perbarui tampilan layar secara instan
            closeFloatingVideo();
            renderProfileVideos();
            showToast("Video berhasil dihapus permanen!", "success");

        } catch (err) {
            showToast("Gagal menghapus ke server: " + err.message, "error");
        }
    }
}

// ==========================================
// FITUR DOWNLOAD VIDEO MILIK SENDIRI (DISEMPURNAKAN UNTUK HP)
// ==========================================
async function downloadVideoSaya(urlVideo, vidId) {
    showToast("Memproses unduhan...", "info");

    try {
        // Trik: Memaksa browser HP meminta izin (CORS) ke server Biznet
        // Tambahkan parameter waktu agar browser tidak mengambil file rusak dari cache
        const response = await fetch(urlVideo + "?t=" + new Date().getTime(), {
            method: 'GET',
            mode: 'cors'
        });

        if (!response.ok) throw new Error("Diblokir oleh keamanan browser HP");

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        // Nama file saat diunduh
        a.download = `AU2Hub_Video_${vidId}.mp4`; 
        document.body.appendChild(a);
        a.click();

        // Bersihkan memori HP setelah 1 detik
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 1000);

        showToast("Video sedang diunduh ke Galeri!", "success");

    } catch (error) {
        // ========================================================
        // JALUR CADANGAN (FALLBACK) JIKA BROWSER HP TETAP MEMBLOKIR
        // ========================================================
        console.log("Download background gagal, pindah ke mode tab baru:", error);

        // Beri tahu user yang sebenarnya terjadi agar tidak merasa tertipu
        showToast("Membuka pemutar video...", "info");

        // Munculkan instruksi cara download manual di tab baru
        setTimeout(() => {
            showToast("💡 Tips: Klik titik tiga (⋮) di pojok kanan bawah lalu pilih 'Download'", "success");
        }, 1500);

        // Buka tab videonya
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = urlVideo;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 3000);
    }
}

// ==========================================
// FITUR SHARE VIDEO (NATIVE ANDROID/IOS STYLE) - DIPERBAIKI
// ==========================================
async function shareVideo(vidId, btn) {
    const finalId = vidId && vidId !== 'undefined' ? vidId : '';

    if (!finalId) {
        showToast("Gagal menyalin link: ID Video tidak ditemukan", "error");
        return;
    }

    const link = window.location.origin + window.location.pathname + '#sosial?vid=' + finalId;

    // Ambil data video dari memori agar teks share-nya dinamis (Pintar)
    const videoData = allVideosData.find(v => v.id === finalId);
    let namaKreator = "Player";
    let teksCaption = "video keren ini";

    if (videoData) {
        namaKreator = videoData.nickname || "Player";
        // Potong caption maksimal 30 huruf biar teks WhatsApp-nya gak kepanjangan
        if (videoData.caption) {
            // PERBAIKAN DI SINI: Gunakan regex satu baris yang aman
            let cap = videoData.caption.replace(/[\n\r]+/g, ' ').trim();
            teksCaption = `"${cap.substring(0, 30)}${cap.length > 30 ? '...' : ''}"`;
        }
    }

    const teksShare = `Tonton ${teksCaption} dari @${namaKreator} di AU2Hub! 🎵✨`;

    // 1. Cek apakah HP/Browser mendukung fitur menu Share bawaan (Web Share API)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Video AU2Hub',
                text: teksShare,
                url: link
            });
        } catch (err) {
            console.log("Membagikan dibatalkan oleh pengguna.");
        }
    } 
    // 2. JALUR CADANGAN: Untuk PC atau browser lawas, kembalikan ke sistem Copy Clipboard
    else {
        // PERBAIKAN DI SINI: Template literal satu baris dengan \n
        navigator.clipboard.writeText(`${teksShare}\n\n${link}`).then(() => {
            showToast("Link video disalin ke clipboard!", "success");
            
            const icon = btn.querySelector('i');
            // Simpan class asli (biar ukuran ikon feed vs ukuran ikon profil gak berantakan)
            const classAsli = icon.className; 
            
            // Ubah ikon jadi centang hijau sebentar
            icon.className = 'fas fa-check text-brand-success text-[35px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all';
            
            setTimeout(() => {
                icon.className = classAsli; // Kembalikan ke wujud aslinya
            }, 2000);
        }).catch(() => {
            showToast("Gagal menyalin link", "error");
        });
    }
}

function renderFaqs(data = globalFaqData) {
const container = document.getElementById('faq-container');
if (data.length === 0) { container.innerHTML = `<div class="text-center text-xs text-gray-400 py-6 border border-white/5 bg-brand-card rounded-2xl"><i class="fas fa-search-minus mb-2 text-lg"></i><br>Pertanyaan tidak ditemukan.</div>`; return; }
container.innerHTML = data.map(f => `<details class="bg-brand-card rounded-2xl border border-white/5 group"><summary class="flex justify-between items-center font-bold text-xs cursor-pointer text-white p-4">${f.t} <i class="fas fa-chevron-down text-brand-accent transition-transform group-open:rotate-180"></i></summary><div class="px-4 pb-4 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3 mt-1">${f.j}</div></details>`).join('');
}

document.getElementById('faqSearch').addEventListener('input', debounce((e) => {
const val = e.target.value.toLowerCase();
renderFaqs(globalFaqData.filter(f => f.t.toLowerCase().includes(val) || f.j.toLowerCase().includes(val)));
}, 300));

function salinNominal() {
const nominalMurni = document.getElementById('nominal-asli').value;
const btnSalin = document.getElementById('btn-salin');
const teksAsli = btnSalin.innerHTML;
if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(nominalMurni); }
else { let tempInput = document.createElement("textarea"); tempInput.value = nominalMurni; tempInput.style.position = "fixed"; tempInput.style.left = "-9999px"; document.body.appendChild(tempInput); tempInput.select(); try { document.execCommand("copy"); } catch (err) {} document.body.removeChild(tempInput); }
btnSalin.innerHTML = '<i class="fas fa-check mr-1.5"></i> Tersalin';
btnSalin.classList.replace('text-brand-info', 'text-brand-success'); btnSalin.classList.replace('bg-brand-info/10', 'bg-brand-success/10'); btnSalin.classList.replace('border-brand-info/30', 'border-brand-success/30');
setTimeout(() => { btnSalin.innerHTML = teksAsli; btnSalin.classList.replace('text-brand-success', 'text-brand-info'); btnSalin.classList.replace('bg-brand-success/10', 'bg-brand-info/10'); btnSalin.classList.replace('border-brand-success/30', 'border-brand-info/30'); }, 2000);
}

// FUNGSI UNTUK MENYALIN ID TRANSAKSI DARI STRUK
function salinIdTransaksi() {
    const idText = document.getElementById('detail-ref-id').innerText;
    const btnSalin = document.getElementById('btn-copy-ref');
    const icon = btnSalin.querySelector('i');

    // Proses salin ke clipboard HP/PC
    if (navigator.clipboard && window.isSecureContext) { 
        navigator.clipboard.writeText(idText); 
    } else { 
        let tempInput = document.createElement("textarea"); 
        tempInput.value = idText; 
        tempInput.style.position = "fixed"; 
        tempInput.style.left = "-9999px"; 
        document.body.appendChild(tempInput); 
        tempInput.select(); 
        try { document.execCommand("copy"); } catch (err) {} 
        document.body.removeChild(tempInput); 
    }

    // Ubah Ikon dan Warna jadi Hijau Sukses
    icon.className = 'fas fa-check text-xs';
    btnSalin.classList.replace('text-brand-info', 'text-brand-success'); 
    btnSalin.classList.replace('bg-brand-info/10', 'bg-brand-success/10'); 
    btnSalin.classList.replace('border-brand-info/20', 'border-brand-success/20');
    
    // Munculkan notifikasi Toast bawaan Anda
    showToast("ID Transaksi berhasil disalin!", "success");

    // Kembalikan ke ikon copy semula setelah 2 detik
    setTimeout(() => { 
        icon.className = 'fas fa-copy text-xs';
        btnSalin.classList.replace('text-brand-success', 'text-brand-info'); 
        btnSalin.classList.replace('bg-brand-success/10', 'bg-brand-info/10'); 
        btnSalin.classList.replace('border-brand-success/20', 'border-brand-info/20'); 
    }, 2000);
}



// ==========================================
// FITUR PENCARIAN LEADERBOARD (DOM FILTERING)
// ==========================================
document.getElementById('leaderboardSearch').addEventListener('input', debounce(function(e) {
    const keyword = e.target.value.toLowerCase();
    const filterLeaderboard = (containerId) => {
        const list = document.querySelectorAll(`${containerId} > div`);
        list.forEach(item => {
            const nameElement = item.querySelector('h4');
            if (nameElement) {
                const name = nameElement.innerText.toLowerCase();
                if (name.includes(keyword)) {
                    item.style.display = ''; 
                } else {
                    item.style.display = 'none'; 
                }
            }
        });
    };
    filterLeaderboard('#leaderboard-container-creator');
    filterLeaderboard('#leaderboard-container-level');
    filterLeaderboard('#leaderboard-container-sultan');
}, 300));




function renderRippers(data, isSearch = false) {
const container = document.getElementById('ripper-container');
document.getElementById('ripper-count').innerText = `${dataRipperGlobal.length} Total Data`;
if(data.length === 0) { container.innerHTML = `<div class="text-center py-10 px-4"><i class="fas fa-check-circle text-brand-success text-3xl mb-2"></i><div class="text-xs text-gray-400">Pencarian aman.<br>(Tetap waspada & gunakan Admin)</div></div>`; return; }
const limitBatas = (!isSearch && !isRipperExpanded) ? 5 : data.length;
const dataYangDitampilkan = data.slice(0, limitBatas);
let htmlString = dataYangDitampilkan.map(r => `<div class="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"><div class="flex justify-between items-start mb-1"><div class="font-bold text-xs text-white">${r["Nama / Keterangan"] || r.nama || r.Nama || "Tanpa Nama"}</div><div class="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap ml-2"><i class="fas fa-ban mr-1"></i> RIPPER</div></div><div class="text-[10px] text-brand-info font-mono mb-1">ID: ${r["ID"] || r.id || "-"}</div><div class="text-[10px] text-gray-400"><i class="fas fa-credit-card mr-1"></i> ${r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "-"}</div></div>`).join('');
container.innerHTML = htmlString;
if (!isSearch && !isRipperExpanded && data.length > 5) { container.innerHTML += `<div id="wadah-tombol-semua" class="p-5 text-center bg-black/20 mt-1 border-t border-white/5"><button onclick="tampilkanSemuaRipper(this)" class="bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-xs font-bold py-2.5 px-6 rounded-full active:scale-95 transition-all w-full flex items-center justify-center"><i class="fas fa-list-ul mr-2"></i> Tampilkan Semua Laporan</button></div>`; }
}

// ==========================================
// FITUR PENCARIAN PENGIKUT/MENGIKUTI (INSTAN DOM FILTERING)
// ==========================================
document.getElementById('userListSearch').addEventListener('input', debounce(function(e) {
    const keyword = e.target.value.toLowerCase();
    const container = document.getElementById('user-list-container');
    const listItems = container.querySelectorAll('div.flex.items-center.p-3'); 
    listItems.forEach(item => {
        const nameElement = item.querySelector('h4');
        if (nameElement) {
            const name = nameElement.innerText.toLowerCase();
            if (name.includes(keyword)) {
                item.style.display = ''; 
            } else {
                item.style.display = 'none'; 
            }
        }
    });
}, 300));


function tampilkanSemuaRipper(tombol) {
isRipperExpanded = true; localStorage.setItem('statusLihatSemua', 'true');
tombol.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Membuka Data...'; tombol.classList.add('opacity-70', 'scale-95');
setTimeout(() => {
const wadahTombol = document.getElementById('wadah-tombol-semua'); if (wadahTombol) wadahTombol.remove();
const sisaData = dataRipperGlobal.slice(5);
let htmlSisa = sisaData.map((r, index) => `<div class="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors smooth-reveal" style="animation-delay: ${index < 5 ? (index * 0.05) : 0}s; opacity: 0;"><div class="flex justify-between items-start mb-1"><div class="font-bold text-xs text-white">${r["Nama / Keterangan"] || r.nama || r.Nama || "Tanpa Nama"}</div><div class="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap ml-2"><i class="fas fa-ban mr-1"></i> RIPPER</div></div><div class="text-[10px] text-brand-info font-mono mb-1">ID: ${r["ID"] || r.id || "-"}</div><div class="text-[10px] text-gray-400"><i class="fas fa-credit-card mr-1"></i> ${r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "-"}</div></div>`).join('');
document.getElementById('ripper-container').insertAdjacentHTML('beforeend', htmlSisa);
}, 150);
}

// ==========================================
// 2. EVENT LISTENER PENCARIAN RIPPER (OPTIMIZED)
// Ganti kode ripperSearch lama Anda dengan yang ini
// ==========================================
document.getElementById('ripperSearch').addEventListener('input', debounce((e) => {
const val = e.target.value.toLowerCase();
if(val === '') { renderRippers(dataRipperGlobal, false); return; }
const hasilFilter = dataRipperGlobal.filter(r => { const nama = (r["Nama / Keterangan"] || r.nama || r.Nama || "").toLowerCase(); const idGame = (r["ID"] || r.id || "").toLowerCase(); const rekening = (r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "").toLowerCase(); return nama.includes(val) || idGame.includes(val) || rekening.includes(val); });
renderRippers(hasilFilter, true);
}, 300));



function updateCarouselDots() {
const carousel = document.getElementById('image-carousel'); const dots = document.querySelectorAll('.dot-indicator');
if (!carousel || dots.length === 0) return; const maxScroll = carousel.scrollWidth - carousel.clientWidth; if (maxScroll <= 0) return;
let activeIndex = Math.round((carousel.scrollLeft / maxScroll) * (dots.length - 1)); activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));
dots.forEach((dot, index) => { if (index === activeIndex) { dot.className = "dot-indicator h-1.5 rounded-full transition-all duration-300 w-4 bg-brand-accent"; } else { dot.className = "dot-indicator h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/40"; } });
}

let commentSubscription = null;

function setupCommentRealtime(videoId) {
    if (commentSubscription) supabaseClient.removeChannel(commentSubscription);
    
    commentSubscription = supabaseClient.channel(`room_comments_${videoId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` }, payload => {
        const triggerUserId = payload.new ? payload.new.user_id : payload.old?.user_id;
        
        // Refresh layar jika ada komentar baru/dihapus oleh orang lain
        if (triggerUserId !== currentUser?.id) {
            loadComments(videoId, true);
            const containerCount = document.querySelector(`.comment-count-container[data-vid="${videoId}"]`);
            if(containerCount) updateCommentCountUI(videoId, containerCount);
        }
    })
    .subscribe();
}


function openComments(id) {
    history.pushState({ popup: 'comments' }, null, '#comments');
    activeVideoId = id;
    
    // 1. CEK STATUS IZINKAN KOMENTAR DARI DATABASE LOKAL
    const video = allVideosData.find(v => v.id === id);
    // (Jika data allow_comments tidak ada/kosong untuk video lama, anggap true)
    const isCommentsAllowed = video ? (video.allow_comments !== false && video.allow_comments !== 'false') : true;

    // 2. KONTROL TAMPILAN LACI KOMENTAR
    const inputWrapper = document.getElementById('comment-input-wrapper');
    const disabledMsg = document.getElementById('comment-disabled-msg');

    if (isCommentsAllowed) {
        if (inputWrapper) inputWrapper.classList.remove('hidden');
        if (disabledMsg) disabledMsg.classList.add('hidden');
    } else {
        if (inputWrapper) inputWrapper.classList.add('hidden');
        if (disabledMsg) disabledMsg.classList.remove('hidden');
    }

    // 3. BUKA LACI DAN MUAT ISI KOMENTARNYA
    document.getElementById('comment-drawer').classList.add('open');
    loadComments(id);
    setupCommentRealtime(id);
}

function closeComments() {
    if (window.location.hash === '#comments') {
        history.back(); // Memancing penangkap popstate (tombol back HP) bawaanmu
    } else {
        document.getElementById('comment-drawer').classList.remove('open');
        if (typeof cancelReply === 'function') cancelReply();
        
        if (commentSubscription) {
            supabaseClient.removeChannel(commentSubscription);
            commentSubscription = null;
        }
    }
}

async function loadComments(videoId, silent = false) {
    const list = document.getElementById('comment-list');
    if (!silent) {
        list.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-3xl"></i></div>';
    }
    cancelReply();

    try {
        // 🔥 KITA GANTI: Tarik data LANGSUNG dari Supabase, Bypass API Cache!
        const { data: supabaseData, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('video_id', videoId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        // Simpan ke variabel data agar kode di bawahnya tetap jalan normal
        const data = supabaseData || [];
        
        document.getElementById('drawer-comment-count').innerText = data.length || 0;

        if (data && data.length > 0) {
            // 🔥 JURUS ANTI GAGAL 1: Paksa semua ID jadi String bersih tanpa spasi tersembunyi
            data.forEach(c => {
                c.user_id = String(c.user_id || c.User_ID || c.userId || c.userid).trim();
            });

            // Ambil kumpulan ID dan Nickname yang valid untuk jalur cadangan
            const userIds = [...new Set(data.map(c => c.user_id))].filter(id => id && id !== 'undefined' && id !== 'null');
            const nicknames = [...new Set(data.map(c => c.nickname))].filter(n => n && n !== 'undefined' && n !== 'null');

            let profilesData = [];
            if (nicknames.length > 0) {
                // Tarik data EXP dan ID Asli berdasarkan Nickname (Karena Nickname selalu valid di komentar)
                const { data: pData } = await supabaseClient.from('profiles').select('id, nickname, exp').in('nickname', nicknames);
                if (pData) profilesData = pData;
            } else if (userIds.length > 0) {
                // Fallback jika kebetulan memakai ID
                const { data: pData } = await supabaseClient.from('profiles').select('id, nickname, exp').in('id', userIds);
                if (pData) profilesData = pData;
            }
            
            // 🔥 JURUS ANTI GAGAL 2: Penentuan EXP super akurat & Auto-Repair ID
            data.forEach(c => {
                // Jika ini komentar MILIK KITA (Cocokkan lewat ID atau Nickname)
                if (currentUser && (c.user_id === String(currentUser.id).trim() || c.nickname === userProfile?.nickname)) {
                    c.exp = (typeof userProfile !== 'undefined' && userProfile.exp) ? userProfile.exp : 0;
                    c.user_id = currentUser.id; // PERBAIKI ID SECARA PAKSA agar hitungan video jalan!
                } 
                // Jika komentar orang lain, cocokkan dengan data server
                else {
                    const p = profilesData.find(x => String(x.id).trim() === c.user_id || x.nickname === c.nickname);
                    c.exp = p ? p.exp : 0;
                    
                    // PERBAIKI ID orang lain jika terputus dari server, agar lencana videonya ikut jalan!
                    if (p && (c.user_id === 'undefined' || !c.user_id || c.user_id === 'null')) {
                        c.user_id = p.id; 
                    }
                }
            });

            const mainComments = data.filter(c => !c.parent_id);
            const replies = data.filter(c => c.parent_id);


            if(mainComments.length === 0) {
                list.innerHTML = '<p class="text-center text-xs text-gray-500 italic mt-10">Belum ada komentar.</p>';
                return;
            }

            let htmlOutput = '';
            mainComments.forEach(c => {
                const childReplies = replies.filter(r => r.parent_id == c.id);
                htmlOutput += buildCommentHTML(c, childReplies);
            });
            list.innerHTML = htmlOutput;

            setTimeout(() => { data.forEach(c => fetchCommentLikes(c.id)); }, 50);
        } else {
            list.innerHTML = '<p class="text-center text-xs text-gray-500 italic mt-10">Jadilah yang pertama berkomentar!</p>';
        }
    } catch(e) {
        if(!silent) list.innerHTML = '<p class="text-center text-xs text-red-500 mt-10">Gagal memuat komentar.</p>';
    }
}


function buildCommentHTML(comment, replies = []) {
const ava = comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.nickname || 'User'}&background=1A1133&color=fff`;
const isMe = currentUser && currentUser.id === comment.user_id;
const delBtn = isMe ? `<button onclick="deleteComment('${comment.id}')" class="text-red-500/50 hover:text-red-500 transition-colors px-2"><i class="fas fa-times text-[10px]"></i></button>` : '';

let html = `
<div class="flex items-start gap-3 mb-5" id="comment-box-${comment.id}">
<img src="${ava}" onclick="viewUserProfile('${comment.user_id}')" class="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 mt-1 cursor-pointer hover:opacity-80 transition-opacity">
<div class="flex-1">
<div class="flex justify-between items-start">
<div class="pr-2">
<div class="flex items-center gap-1">
    <b onclick="viewUserProfile('${comment.user_id}')" class="text-brand-info text-[11px] cursor-pointer hover:underline">${comment.nickname}</b>
    ${getBadgeByLevelAndVideos(hitungStatusLevel(comment.exp || 0).level, allVideosData.filter(v => String(v.user_id) === String(comment.user_id)).length)}
</div>
<p class="text-gray-200 text-xs mt-0.5 leading-relaxed break-words">${formatCaption(comment.message)}</p>
<div class="flex items-center gap-2 mt-1.5"><span class="text-[9px] text-gray-600">${timeAgo(comment.created_at)}</span><button onclick="setReply('${comment.id}', '${escapeHTML(comment.nickname).replace(/&#39;/g, "\\'")}')" class="text-[10px] text-gray-400 font-bold hover:text-white px-2">Balas</button> ${delBtn} </div>
</div>
<div class="flex flex-col items-center gap-1 ml-1 shrink-0">
<button onclick="likeComment('${comment.id}', this)" class="text-gray-500 hover:text-brand-accent transition-colors active:scale-75"><i class="fas fa-heart text-sm ${localStorage.getItem('comment_liked_'+comment.id) ? 'text-brand-accent' : ''}"></i></button>
<span class="text-[9px] text-gray-500 font-medium comment-like-count" data-cid="${comment.id}">0</span>
</div>
</div>`;

if (replies.length > 0) {
html += `
<div class="mt-2">
<button onclick="toggleReplies('${comment.id}')" class="text-[10px] text-brand-info font-bold flex items-center gap-1.5 active:scale-95 transition-transform"><span class="w-5 h-[1px] bg-brand-info/50 inline-block"></span> Lihat ${replies.length} balasan <i class="fas fa-chevron-down text-[8px] transition-transform duration-300" id="icon-reply-${comment.id}"></i></button>
<div id="replies-${comment.id}" class="hidden mt-3 space-y-4 pl-3 border-l border-white/10 relative">`;

replies.forEach(r => {
const rAva = r.avatar_url || `https://ui-avatars.com/api/?name=${r.nickname || 'User'}&background=1A1133&color=fff`;
const isRMe = currentUser && currentUser.id === r.user_id;
const rDelBtn = isRMe ? `<button onclick="deleteComment('${r.id}')" class="text-red-500/50 hover:text-red-500 transition-colors px-2"><i class="fas fa-times text-[10px]"></i></button>` : '';

html += `
<div class="flex items-start gap-2 relative" id="comment-box-${r.id}">
<img src="${rAva}" onclick="viewUserProfile('${r.user_id}')" class="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
<div class="flex-1">
<div class="flex justify-between items-start">
<div class="pr-2">
<div class="flex items-center gap-1">
    <b onclick="viewUserProfile('${r.user_id}')" class="text-brand-purple text-[10px] cursor-pointer hover:underline">${r.nickname}</b>
    ${getBadgeByLevelAndVideos(hitungStatusLevel(r.exp || 0).level, allVideosData.filter(v => String(v.user_id) === String(r.user_id)).length)}
</div>
<p class="text-gray-300 text-[11px] mt-0.5 leading-relaxed break-words">${formatCaption(r.message)}</p>
<div class="flex items-center gap-2 mt-1"><button onclick="setReply('${comment.id}', '${escapeHTML(r.nickname).replace(/&#39;/g, "\\'")}')" class="text-[9px] text-gray-500 font-bold hover:text-white pr-2">Balas</button> ${rDelBtn}</div>
</div>
<div class="flex flex-col items-center gap-1 ml-1 shrink-0">
<button onclick="likeComment('${r.id}', this)" class="text-gray-500 hover:text-brand-accent transition-colors active:scale-75"><i class="fas fa-heart text-[11px] ${localStorage.getItem('comment_liked_'+r.id) ? 'text-brand-accent' : ''}"></i></button>
<span class="text-[8px] text-gray-500 comment-like-count" data-cid="${r.id}">0</span>
</div>
</div>
</div>
</div>`;
});
html += `</div></div>`;
}
html += `</div></div>`; return html;
}

async function deleteComment(cid) {
    const konfirmasi = await customConfirm("Yakin ingin menghapus komentar ini?");
    if (!konfirmasi) return;

    const commentBox = document.getElementById(`comment-box-${cid}`);
    if (commentBox) commentBox.style.opacity = '0.5';

    try {
        // PERBAIKAN: Hapus filter user_id karena datanya memang NULL di DB
        // Biarkan RLS Supabase (kalau sudah kamu setel) yang membatasi hak aksesnya
        const { error: deleteError } = await supabaseClient
            .from('comments')
            .delete()
            .eq('id', cid);
        
        if (deleteError) throw deleteError;

        // Visual feedback
        if (commentBox) {
            commentBox.style.transition = 'all 0.3s ease';
            commentBox.style.opacity = '0';
            setTimeout(() => {
                commentBox.remove();
                // Update UI counter
                const countEl = document.getElementById('drawer-comment-count');
                if(countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
            }, 300);
        }
        showToast("Komentar berhasil dihapus", "success");

    } catch (e) {
        console.error("Gagal hapus:", e);
        if (commentBox) commentBox.style.opacity = '1';
        showToast("Gagal menghapus komentar!", "error");
    }
}


function toggleReplies(id) {
const div = document.getElementById('replies-'+id); const icon = document.getElementById('icon-reply-'+id);
if(div.classList.contains('hidden')) { div.classList.remove('hidden'); icon.style.transform = 'rotate(180deg)'; }
else { div.classList.add('hidden'); icon.style.transform = 'rotate(0deg)'; }
}

function setReply(parentId, nickname) {
replyingToId = parentId; replyingToName = nickname;
document.getElementById('reply-indicator').classList.remove('hidden');
document.getElementById('replying-to-name').innerText = '@' + nickname;
const input = document.getElementById('comment-input'); input.focus();
if(nickname) input.value = `@${nickname} `;
}

function cancelReply() {
replyingToId = null; replyingToName = null;
document.getElementById('reply-indicator').classList.add('hidden');
const input = document.getElementById('comment-input');
if (input.value.startsWith('@')) input.value = '';
}

async function sendComment(event) {
    if (!currentUser) return openAuthModal();
    
    const video = allVideosData.find(v => v.id === activeVideoId);
    const isCommentsAllowed = video ? (video.allow_comments !== false && video.allow_comments !== 'false') : true;
    if (!isCommentsAllowed) {
        return showToast("Komentar dinonaktifkan untuk video ini.", "error");
    }

    const msgInput = document.getElementById('comment-input');
    const msg = msgInput.value.trim();
    if (!msg) {
        showToast("Komentar tidak boleh kosong!", "error");
        return;
    }

    const btn = event.currentTarget;
    const iconAsli = btn.innerHTML; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
    btn.disabled = true;

    try {
        const payload = {
            video_id: activeVideoId,
            nickname: userProfile?.nickname || "Player",
            message: msg,
            avatar_url: userProfile?.avatar_url || "",
            user_id: currentUser.id // User ID wajib masuk agar RLS Supabase tidak menolak saat dihapus
        };
        if (replyingToId) payload.parent_id = replyingToId;

        // EKSEKUSI LANGSUNG KE SUPABASE (Tanpa lewat fetch '/api/comment')
        const { error: insertError } = await supabaseClient
            .from('comments')
            .insert(payload);

        if (insertError) throw insertError; 

        msgInput.value = '';
        cancelReply(); 
        
        await tambahExp(10); 
        await loadComments(activeVideoId, true);
        
        // Update angka di UI
        const container = document.querySelector(`.comment-count-container[data-vid="${activeVideoId}"]`);
        if(container) updateCommentCountUI(activeVideoId, container);

        const floatComment = document.getElementById('float-comment-container');
        if (floatComment && floatComment.dataset.vid === activeVideoId) {
            updateCommentCountUI(activeVideoId, floatComment);
        }
    } catch(e) {
        console.error("Error Kirim Komentar:", e);
        showToast("Gagal kirim: " + (e.message || "Kesalahan jaringan"), "error");
    } finally {
        btn.innerHTML = iconAsli; 
        btn.disabled = false;
    }
}



async function fetchCommentLikes(cid) {
try {
// Hitung jumlah like komentar langsung dari Supabase
const { count, error } = await supabaseClient
.from('comment_likes')
.select('*', { count: 'exact', head: true })
.eq('comment_id', cid);

const span = document.querySelector(`.comment-like-count[data-cid="${cid}"]`);
if(span && !error) span.innerText = count || 0;
} catch(e) {
console.error("Gagal mengambil like komentar", e);
}
}

async function likeComment(cid, btn) {
    // Wajib login untuk melike komentar
    if (!currentUser) {
        showToast("Silakan login untuk menyukai komentar!", "error");
        return openAuthModal();
    }

    // Cegah spam klik yang bisa bikin database jebol
    if (btn.isProcessing) return;
    btn.isProcessing = true;

    const icon = btn.querySelector('i');
    
    // Deteksi warna: jika pink berarti sedang di-like, jika abu-abu berarti belum
    const isLiked = icon.classList.contains('text-brand-accent');

    // --- ANIMASI DENYUT ANTI-TABRAKAN ---
    // Bersihkan timer lama jika user spam tap
    if (btn.animTimer) clearTimeout(btn.animTimer);
    icon.classList.add('animate-ping');
    btn.animTimer = setTimeout(() => icon.classList.remove('animate-ping'), 500);

    try {
        if (isLiked) {
            // === PROSES UNLIKE (BATAL SUKA) ===
            icon.classList.replace('text-brand-accent', 'text-gray-500');
            
            const { error } = await supabaseClient
                .from('comment_likes')
                .delete()
                .eq('comment_id', cid)
                .eq('user_id', currentUser.id);

            if(error) throw error;
            localStorage.removeItem('comment_liked_'+cid);
            
        } else {
            // === PROSES LIKE (MENYUKAI) ===
            icon.classList.replace('text-gray-500', 'text-brand-accent');
            
            const { error } = await supabaseClient
                .from('comment_likes')
                .insert({
                    comment_id: cid,
                    user_id: currentUser.id
                });

            // Abaikan error duplikat jika di DB memang sudah ter-like
            if(error && error.code !== '23505') throw error;
            localStorage.setItem('comment_liked_'+cid, 'true');
        }
        
        // Update angka like di layar
        fetchCommentLikes(cid);

    } catch(e) {
        console.error("Comment Like Error:", e);
        
        // ROLLBACK: Kembalikan warna jika database gagal merespons
        if (isLiked) {
            icon.classList.replace('text-gray-500', 'text-brand-accent');
        } else {
            icon.classList.replace('text-brand-accent', 'text-gray-500');
        }
        showToast(isLiked ? "Gagal membatalkan like." : "Gagal menyukai komentar.", "error");
    } finally {
        btn.isProcessing = false;
    }
}


window.cacheVideoStats = window.cacheVideoStats || {}; // [BARU] Penampung Memori Cache

async function updateLikeCountUI(videoId, containerDiv) {
    if (!containerDiv) return;
    
    if (!window.cacheVideoStats[videoId]) window.cacheVideoStats[videoId] = {};

    try {
        // 1. Dapatkan total jumlah like dari Supabase (Pakai Cache agar tidak boros kuota)
        let countLike = window.cacheVideoStats[videoId].likes;

        if (countLike === undefined) {
            const { count, error } = await supabaseClient
                .from('video_likes')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);
            
            if (!error) {
                countLike = count || 0;
                window.cacheVideoStats[videoId].likes = countLike; // Simpan ke otak HP
            }
        }

        const countSpan = containerDiv.querySelector('.like-count-display');
        if (countSpan && countLike !== undefined) countSpan.innerText = countLike;

        // 2. Cek status LIKE Akurat dari Database untuk User yang sedang login
        const icon = containerDiv.querySelector('i');
        
        if (currentUser) {
            // [BARU] Gunakan .limit(1).maybeSingle() agar kebal Error 406!
            const { data: isLikedDB } = await supabaseClient
                .from('video_likes')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id)
                .limit(1) // <--- INI OBAT ERROR MERAHNYA
                .maybeSingle();

            if (isLikedDB) {
                icon.classList.replace('text-white', 'text-brand-accent');
                localStorage.setItem(`liked_${videoId}`, 'true');
            } else {
                icon.classList.replace('text-brand-accent', 'text-white');
                localStorage.removeItem(`liked_${videoId}`);
            }
        } else {
            if(localStorage.getItem(`liked_${videoId}`)) {
                icon.classList.replace('text-white', 'text-brand-accent');
            }
        }

    } catch(e) {
        if(localStorage.getItem(`liked_${videoId}`)) {
            containerDiv.querySelector('i').classList.replace('text-white', 'text-brand-accent');
        }
        console.error("Gagal update UI like", e);
    }
}

async function updateCommentCountUI(videoId, containerDiv) {
    if (!containerDiv) return;

    if (!window.cacheVideoStats) window.cacheVideoStats = {};
    if (!window.cacheVideoStats[videoId]) window.cacheVideoStats[videoId] = {};

    try {
        let countComment = window.cacheVideoStats[videoId].comments;

        // Tarik dari Supabase HANYA jika memori kosong
        if (countComment === undefined) {
            const { count, error } = await supabaseClient
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);
            
            if (!error) {
                countComment = count || 0;
                window.cacheVideoStats[videoId].comments = countComment; // Simpan ke otak HP
            }
        }
        
        const countSpan = containerDiv.querySelector('.comment-count-display');
        if (countSpan && countComment !== undefined) {
            countSpan.innerText = countComment;
        }
    } catch(e) {
        console.error("Gagal update angka komentar:", e);
    }
}

async function likeVideo(videoId, btn) {
    // Wajib login untuk melike
    if (!currentUser) {
        showToast("Silakan login untuk menyukai video!", "error");
        return openAuthModal();
    }

    // Cegah spam klik (double click cepat) yang bikin error database
    if (btn.disabled) return;
    btn.disabled = true;

    const icon = btn.querySelector('i');
    
    // Deteksi apakah saat ini video SEDANG di-like berdasarkan warna ikon (Optimistic UI)
    const isLiked = icon.classList.contains('text-brand-accent'); 

    // Berikan efek animasi denyut saat ditekan
    icon.classList.add('animate-ping');
    setTimeout(() => icon.classList.remove('animate-ping'), 500);

    try {
        if (isLiked) {
            // === PROSES UNLIKE (BATAL SUKA) ===
            icon.classList.replace('text-brand-accent', 'text-white'); // Ubah warna jadi putih instan
            
            const { error } = await supabaseClient
                .from('video_likes')
                .delete()
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id);

            if (error) throw error;
            
            // Hapus jejak dari memori HP & Turunkan angka cache seketika
            localStorage.removeItem(`liked_${videoId}`);
            if (window.cacheVideoStats && window.cacheVideoStats[videoId] && window.cacheVideoStats[videoId].likes > 0) {
                window.cacheVideoStats[videoId].likes--;
            }

        } else {
            // === PROSES LIKE (MENYUKAI) ===
            icon.classList.replace('text-white', 'text-brand-accent'); // Ubah warna jadi pink instan
            
            const { error } = await supabaseClient
                .from('video_likes')
                .insert({
                    video_id: videoId,
                    user_id: currentUser.id
                });

            // Abaikan error dengan kode '23505' (Duplicate) jika ternyata di DB sudah ter-like sebelumnya
            if (error && error.code !== '23505') throw error;
            
            // Simpan jejak di memori HP & Naikkan angka cache seketika
            localStorage.setItem(`liked_${videoId}`, 'true');
            if (window.cacheVideoStats && window.cacheVideoStats[videoId] !== undefined) {
                window.cacheVideoStats[videoId].likes++;
            }
        }

        // Perbarui angka jumlah like di layar menggunakan Cache yang baru kita buat (Bypass Database)
        updateLikeCountUI(videoId, btn.closest('.like-container') || document.getElementById('float-like-container'));

    } catch (e) {
        console.error("Video Like Error:", e);
        
        // ROLLBACK: Jika database gagal, kembalikan warna ikon seperti semula
        if (isLiked) {
            icon.classList.replace('text-white', 'text-brand-accent');
        } else {
            icon.classList.replace('text-brand-accent', 'text-white');
        }
        
        showToast(isLiked ? "Gagal membatalkan like." : "Gagal menyukai video.", "error");
    } finally {
        // Buka kembali kunci tombol setelah proses selesai
        btn.disabled = false;
    }
}

function handleVideoError(videoElement) { const container = videoElement.closest('.snap-start'); if (container) container.remove(); }

function createHeartAt(event) {
const heart = document.createElement('i');
heart.className = 'fas fa-heart heart-pop';
const x = event.clientX || (event.touches && event.touches[0].clientX) || (window.innerWidth / 2);
const y = event.clientY || (event.touches && event.touches[0].clientY) || (window.innerHeight / 2);
heart.style.left = `${x}px`; heart.style.top = `${y}px`;
document.body.appendChild(heart);
setTimeout(() => heart.remove(), 800);
}



async function loadVideos() {
    const container = document.getElementById('feed-container'); 
    const fakeLoader = document.getElementById('fake-loader'); 
    const fakeProgress = document.getElementById('fake-progress');
    const isFirstTime = !localStorage.getItem('hasVisitedSosial');
    
    if (obs) obs.disconnect();
    
    try {
        if (allVideosData.length === 0) container.innerHTML = `<div class="w-full h-full relative bg-[#1A1133] animate-pulse flex flex-col justify-end p-6 flex-shrink-0 snap-start"><div class="absolute inset-0 flex items-center justify-center"><i class="fas fa-circle-notch fa-spin text-brand-accent text-4xl opacity-40"></i></div></div>`;

        const res = await fetch('/api/get-videos');
        let dataDariSheet = await res.json();

        // --- PENYERAGAMAN ID & INDEX PINTAR ---
        dataDariSheet = dataDariSheet.map((v, index) => {
            v.original_index = index; // <--- SUNTIKAN TIKET ANTREAN
            v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
            v.user_id = v.user_id || v.User_ID || v.userId || v.userid;
            return v;
        });

        let nextIdx = dataDariSheet.length;
        newUploads.forEach(newVid => {
            newVid.id = newVid.id || newVid.video_id; 
            if (!dataDariSheet.find(v => v.id === newVid.id)) {
                newVid.original_index = nextIdx++; // Amankan nomor antrean jika ada postingan baru
                dataDariSheet.push(newVid);
            }
        });

        dataDariSheet = dataDariSheet.filter(v => !blockedUsersList.includes(v.user_id));

        // 1. Biarkan pengacakan (shuffle) bawaan Anda berjalan dulu
        for (let i = dataDariSheet.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dataDariSheet[i], dataDariSheet[j]] = [dataDariSheet[j], dataDariSheet[i]];
        }

        allVideosData = dataDariSheet;

        // ========================================================
        // DETEKSI LINK SHARE & LANGSUNG BUKA POP-UP
        // ========================================================
        const urlHash = window.location.hash;
        if (urlHash.includes('sosial?vid=')) {
            const params = new URLSearchParams(urlHash.split('?')[1]);
            const targetVidId = params.get('vid');
            if (targetVidId) {
                setTimeout(() => { bukaVideoShare(targetVidId); }, 800); 
            }
        }
        // ========================================================

        currentVideoIndex = 0;
        container.innerHTML = '';
        
        // renderProfileVideos() dihapus dari sini agar Feed Sosial tidak lemot

        if (!allVideosData.length) { container.innerHTML = '<p class="text-center py-20 text-gray-500">Belum ada video.</p>'; return; }

        if (isFirstTime) {
            fakeLoader.classList.remove('hidden'); fakeLoader.classList.add('flex'); fakeProgress.style.transition = 'width 15s cubic-bezier(0.1, 0.7, 1.0, 0.1)';
            setTimeout(() => { fakeProgress.style.width = '80%'; }, 100);
            setupVideoObserver(); renderVideoBatch();
            
            const videosInDOM = document.querySelectorAll('.video-player'); 
            const targetCount = Math.min(10, videosInDOM.length);
            let readyCount = 0; let isResolved = false;
            
            const finishLoading = () => {
                if (isResolved) return; isResolved = true; fakeProgress.style.transition = 'width 0.4s ease-out'; fakeProgress.style.width = '100%';
                setTimeout(() => { fakeLoader.classList.add('opacity-0'); setTimeout(() => { fakeLoader.classList.add('hidden'); fakeLoader.classList.remove('flex'); }, 1000); localStorage.setItem('hasVisitedSosial', 'true'); }, 500);
            };
            
            const safetyTimeout = setTimeout(() => { finishLoading(); }, 15000);
            
            if (targetCount === 0) { clearTimeout(safetyTimeout); finishLoading(); }
            else {
                videosInDOM.forEach((vid, index) => {
                    if (index < targetCount) {
                        vid.setAttribute('preload', 'auto'); vid.load();
                        const onVideoReady = () => {
                            if (isResolved) return; readyCount++; const progressPercent = 80 + ((readyCount / targetCount) * 20); fakeProgress.style.width = `${progressPercent}%`;
                            if (readyCount >= targetCount) { clearTimeout(safetyTimeout); finishLoading(); }
                        };
                        if (vid.readyState >= 3) onVideoReady(); else { vid.addEventListener('canplay', onVideoReady, { once: true }); vid.addEventListener('loadeddata', onVideoReady, { once: true }); }
                    }
                });
            }
        } else { 
            setupVideoObserver(); 
            renderVideoBatch(); 
        }
    } catch (e) { 
        container.innerHTML = '<p class="text-center py-20 text-gray-500">Gagal memuat video.</p>'; 
    }
}



function renderVideoBatch() {
const container = document.getElementById('feed-container');

// --- LOGIKA FEED TANPA UJUNG (INFINITE LOOP) ---
if (currentVideoIndex >= allVideosData.length) {
currentVideoIndex = 0;
}

const nextBatch = allVideosData.slice(currentVideoIndex, currentVideoIndex + BATCH_SIZE);
if (nextBatch.length === 0) return;

const htmlString = nextBatch.map((vid, index) => {
    // 🔥 CEK MEMORI: Hanya munculkan jika user BELUM PERNAH mengetuk layar
    const isFirstVideo = (currentVideoIndex === 0 && index === 0 && localStorage.getItem('tutorialPaham') !== 'true');
    const tutorialHtml = isFirstVideo ? `
        <div id="tutorial-tap" class="absolute top-[35%] left-1/2 -translate-x-1/2 z-[70] bg-black/80 backdrop-blur-md text-white text-[12px] text-center font-bold px-5 py-4 rounded-3xl border border-white/20 pointer-events-none shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-opacity duration-500 w-[80%] max-w-[260px]">
            <div class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                <i class="fas fa-hand-pointer text-brand-accent text-2xl animate-bounce"></i>
            </div>
            Ketuk layar sekali untuk pengalaman seperti di TikTok<br>
            <span class="text-brand-info text-[10px] font-normal mt-2 block">Ketuk sekali lagi untuk menutup</span>
        </div>
    ` : '';

    return `
    <div class="snap-start w-full h-full flex-shrink-0 relative flex items-center justify-center bg-black">

    <div class="video-inner-wrap w-full h-full relative bg-brand-dark ${!isGlobalMuted ? 'floating-focus' : ''}">
    
    ${tutorialHtml}

    <div class="absolute inset-0 flex items-center justify-center z-0"><div class="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div></div>
    
    <video class="absolute inset-0 m-auto w-full h-full object-cover video-player transition-opacity duration-500 opacity-0 z-10"
    onloadeddata="this.classList.remove('opacity-0')" loop ${isGlobalMuted ? 'muted' : ''} playsinline preload="metadata"
    ontimeupdate="updateVideoProgress(this)"
    onclick="handleVideoClick(event, this, '${vid.id}')" onerror="handleVideoError(this)"
    controlsList="nodownload" oncontextmenu="return false;" style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none;">
    <source src="${vid.video_url}" type="video/mp4">
    </video>

    <div class="absolute bottom-0 left-0 w-full h-2/5 z-20 pointer-events-none bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

    <div class="time-indicator absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-extrabold text-4xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] opacity-0 transition-opacity z-[60] pointer-events-none tracking-wider bg-black/40 px-6 py-2 rounded-2xl">
    <span class="time-current">00:00</span> <span class="text-white/50 text-2xl mx-1">/</span> <span class="time-total text-white/70">00:00</span>
    </div>

    <div class="absolute bottom-0 left-0 w-full h-3 z-50 cursor-pointer group touch-none flex flex-col justify-end pb-1"
    onpointerdown="startSeek(event, this)" onpointermove="doSeek(event, this)" onpointerup="endSeek(event, this)" onpointercancel="endSeek(event, this)">
    <div class="w-full h-1 bg-white/30 relative">
    <div class="progress-fill h-full bg-white w-0 relative pointer-events-none transition-all duration-75 ease-linear">
    <div class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-md"></div>
    </div>
    </div>
    </div>

    <div class="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-2 z-40 w-[75%] pr-2 pointer-events-auto flex flex-col justify-end pb-2">
    <p onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')" class="font-bold text-[16px] text-white cursor-pointer hover:text-brand-info drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mb-1.5 flex items-center">
    @${vid.nickname || "Player"} ${getBadgeByLevelAndVideos(0, allVideosData.filter(v => v.user_id === vid.user_id).length)}
    </p>
    
    <div onclick="this.classList.toggle('expanded')" class="caption-text text-[14px] text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] cursor-pointer leading-snug">
    ${formatCaption(vid.caption)}
    </div>

    <div class="flex items-center gap-2 mt-2.5 overflow-hidden w-3/4">
    <i class="fas fa-music text-[10px] text-white animate-pulse drop-shadow-md"></i>
    <div class="overflow-hidden whitespace-nowrap relative w-full mask-text">
    <div class="inline-block text-[12px] text-white drop-shadow-md font-medium marquee-text">
    Suara Asli - @${vid.nickname || "Player"} 🎵 Original Audio
    </div>
    </div>
    </div>
    </div>

    <div class="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-center gap-5 pointer-events-auto pb-2">

    <div class="relative cursor-pointer hover:scale-105 transition-transform" onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')">
    <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=User&background=1A1133&color=fff'}" loading="lazy" class="w-[46px] h-[46px] rounded-full object-cover border-[1.5px] border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
    </div>

    <div class="like-container flex flex-col items-center gap-1" data-vid="${vid.id}">
    <button onclick="likeVideo('${vid.id}', this)" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-heart text-[35px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></i>
    </button>
    <span class="like-count-display text-white text-[13px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">0</span>
    </div>

    <div class="comment-count-container flex flex-col items-center gap-1" data-vid="${vid.id}">
    <button onclick="openComments('${vid.id}')" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-comment-dots text-[35px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="transform: scaleX(-1);"></i>
    </button>
    <span class="comment-count-display text-white text-[13px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">0</span>
    </div>

    <div class="flex flex-col items-center gap-1">
    <button onclick="shareVideo('${vid.id}', this)" class="hover:scale-110 transition-transform active:scale-90">
    <i class="fas fa-share text-[35px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></i>
    </button>
    <span class="text-white text-[13px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Share</span>
    </div>
    
    <div class="relative mt-2 flex items-center justify-center w-11 h-11 group cursor-pointer hover:scale-105 transition-transform" onclick="event.stopPropagation()">
    <i class="fas fa-music absolute -top-4 -left-2 text-[10px] text-white/80 animate-float-music pointer-events-none"></i>
    <div class="w-10 h-10 rounded-full bg-[#1A1133] border-[3.5px] border-gray-800 flex items-center justify-center animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(0,0,0,0.8)]">
    <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=Music&background=1A1133&color=fff'}" class="w-4 h-4 rounded-full object-cover">
    </div>
    </div>
    </div>


    </div>
    </div>`;
}).join('');




// --- SISTEM ANTI DOM BLOAT (MENCEGAH HP CRASH) ---
if (container.children.length > 15) { // Kurangi jadi 15 agar RAM lega
    const tinggiVideo = container.firstElementChild.clientHeight;
    
    // Hapus 5 video teratas agar DOM tetap ringan
    for (let i = 0; i < 5; i++) {
        const elToRemove = container.firstElementChild;
        if (elToRemove) {
            const vidToKill = elToRemove.querySelector('video');
            if (vidToKill) {
                vidToKill.pause();
                vidToKill.removeAttribute('src'); // Di sini baru kita boleh hapus src karena elemen fisiknya benar-benar dibuang
                vidToKill.load(); 
            }
            elToRemove.remove();
        }
    }
    // Tarik scroll ke atas agar layar tidak lompat tiba-tiba
    container.scrollBy({ top: -(tinggiVideo * 5), behavior: 'instant' });
}


container.insertAdjacentHTML('beforeend', htmlString);
currentVideoIndex += BATCH_SIZE;

const videoActions = container.querySelectorAll('.snap-start:not(.data-loaded)');
videoActions.forEach((card) => {
card.classList.add('data-loaded');
const vidId = card.querySelector('.like-container').dataset.vid;
updateLikeCountUI(vidId, card.querySelector('.like-container'));
updateCommentCountUI(vidId, card.querySelector('.comment-count-container'));
});

const unobservedVideos = container.querySelectorAll('.video-player:not(.observed)');
unobservedVideos.forEach((v, i) => {
v.classList.add('observed'); if (obs) obs.observe(v);
if (i === unobservedVideos.length - 1) {
const lastVideoObserver = new IntersectionObserver(entries => {
if(entries[0].isIntersecting) { lastVideoObserver.disconnect(); renderVideoBatch(); }
}, { threshold: 0.1 });
lastVideoObserver.observe(v.closest('.snap-start'));
}
});
}


// ==========================================
// FITUR SWIPE DOWN (USAP KE BAWAH) UNTUK TUTUP STORY
// ==========================================
let storyStartY = 0;
let storyCurrentY = 0;
const storyModal = document.getElementById('story-viewer-modal');

storyModal.addEventListener('touchstart', (e) => {
// Abaikan jika user memiliki 2 jari di layar
if (e.touches.length > 1) return;
storyStartY = e.touches[0].clientY;
}, { passive: true });

storyModal.addEventListener('touchmove', (e) => {
if (storyStartY === 0) return;
storyCurrentY = e.touches[0].clientY;
const diffY = storyCurrentY - storyStartY;

// Jika ditarik ke bawah (diffY positif)
if (diffY > 0) {
storyModal.style.transition = 'none'; // Hilangkan delay agar mulus mengikuti jari
storyModal.style.transform = `translateY(${diffY}px)`;

// Buat background makin pudar/transparan saat ditarik
const opacity = Math.max(0.3, 0.95 - (diffY / window.innerHeight));
storyModal.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
}
}, { passive: true });

storyModal.addEventListener('touchend', (e) => {
if (storyStartY === 0 || storyCurrentY === 0) return;
const diffY = storyCurrentY - storyStartY;

// Jika ditarik lebih dari 120 pixel ke bawah, TUTUP!
if (diffY > 120) {
closeStoryViewer();
} else {
// Jika ditarik sedikit / nanggung, kembalikan posisi ke atas
storyModal.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease';
storyModal.style.transform = 'translateY(0)';
storyModal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
}

// Reset Koordinat
storyStartY = 0;
storyCurrentY = 0;
});

// ==========================================
// FITUR WHATSAPP STYLE (ENTER & AUTO RESIZE)
// ==========================================

function handleEnter(e) {
// Jika user menekan tombol Enter TANPA menekan tombol Shift
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault(); // Mencegah spasi kosong / enter berantakan

const input = document.getElementById('chat-room-input');
if (input.value.trim() !== '') {
sendMessageRoom();
}
}
}

function handleTyping(el) {
    // 1. Auto-resize tinggi kotak
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    // 2. Panggil sinyal Typing
    sendTypingStatus();

    // 3. LOGIKA AUTO-COMPLETE MENTION (@)
    if (activeGroupId && currentRoomMembers.length > 0) {
        const cursorPosition = el.selectionStart;
        const textBeforeCursor = el.value.substring(0, cursorPosition);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            // Cek apakah @ ada di awal teks, atau setelah spasi/enter
            const isAtStartOrSpace = lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === ' ' || textBeforeCursor[lastAtPos - 1] === '\n';
            
            if (isAtStartOrSpace) {
                const searchText = textBeforeCursor.substring(lastAtPos + 1).toLowerCase();
                // Pastikan tidak ada spasi di dalam pencarian nama
                if (!searchText.includes(' ')) {
                    tampilkanMentionPopup(searchText);
                    return;
                }
            }
        }
    }
    tutupMentionPopup();
}

function tampilkanMentionPopup(searchText) {
    const popup = document.getElementById('mention-popup');
    const list = document.getElementById('mention-list');
    if (!popup || !list) return;

    // Cari user yang nicknamenya cocok dan BUKAN diri sendiri
    const myNick = userProfile?.nickname || "";
    const filtered = currentRoomMembers.filter(m => 
        m.nickname.toLowerCase().includes(searchText) && m.nickname !== myNick
    );

    if (filtered.length > 0) {
        list.innerHTML = filtered.map(m => {
            const ava = m.avatar_url || `https://ui-avatars.com/api/?name=${m.nickname}&background=1A1133&color=fff`;
            const safeNick = escapeHTML(m.nickname).replace(/&#39;/g, "\\'");
            return `
            <div onclick="pilihMention('${safeNick}')" class="flex items-center gap-3 p-2.5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors active:scale-95">
                <img src="${ava}" class="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0">
                <span class="text-xs font-bold text-white">@${m.nickname}</span>
            </div>`;
        }).join('');
        popup.classList.remove('hidden');
    } else {
        tutupMentionPopup();
    }
}

function tutupMentionPopup() {
    const popup = document.getElementById('mention-popup');
    if (popup) popup.classList.add('hidden');
}

function pilihMention(nickname) {
    const el = document.getElementById('chat-room-input');
    const cursorPosition = el.selectionStart;
    const textBeforeCursor = el.value.substring(0, cursorPosition);
    const textAfterCursor = el.value.substring(cursorPosition);
    
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    if (lastAtPos !== -1) {
        const newTextBefore = textBeforeCursor.substring(0, lastAtPos);
        el.value = newTextBefore + '@' + nickname + ' ' + textAfterCursor;
        
        // Kembalikan fokus kursor tepat setelah nama yang di-tag ditambah spasi
        const newCursorPos = lastAtPos + nickname.length + 2;
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
    }
    tutupMentionPopup();
    handleTyping(el); // Trigger resize & ganti tombol mic -> send
}

let lastTypingTime = 0; // Tambahkan variabel ini di luar fungsi

// FUNGSI TYPING INDICATOR & TOGGLE MIC/SEND (DIOPTIMALKAN)
function sendTypingStatus() {
// --- 1. LOGIKA UBAH IKON MIC / PESAWAT KERTAS ---
const input = document.getElementById('chat-room-input');
const btnSend = document.getElementById('btn-send-room');

// Jangan ubah ikon kalau sistem sedang sibuk merekam suara
if (!input.disabled) {
if (input.value.trim() !== '') {
// Jika ada teks, ubah jadi pesawat kertas (Kirim Teks)
btnSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
btnSend.onclick = sendMessageRoom;
} else {
// Jika kosong, ubah jadi mikrofon (Kirim Voice Note)
btnSend.innerHTML = '<i class="fas fa-microphone"></i>';
btnSend.onclick = startRecordingVoice;
}
}

// --- 2. LOGIKA TYPING ASLI ---
// Jika belum terhubung ke channel atau tidak ada target, batalkan
if(!messageSubscription || (!activeChatUserId && !activeGroupId)) return;

const now = Date.now();
// Hanya kirim sinyal ke server jika sudah lewat 2 detik (2000 ms) dari ketikan terakhir
if (now - lastTypingTime > 2000) {
messageSubscription.send({
type: 'broadcast',
event: 'typing',
payload: { userId: currentUser.id }
});
lastTypingTime = now; // Update waktu terakhir mengetik
}
}



function openEditProfileModal() {
if(!currentUser) return;
document.getElementById('edit-nick').value = userProfile?.nickname || '';
document.getElementById('edit-bio').value = userProfile?.bio || '';
document.getElementById('edit-wa').value = userProfile?.whatsapp || ''; // BARIS BARU
document.getElementById('edit-pass').value = '';
document.getElementById('modal-edit-profile').classList.remove('hidden');
document.getElementById('modal-edit-profile').classList.add('flex');
history.pushState({ popup: 'edit_profile' }, null, '#edit');
}

function closeEditProfileModal() {
if(window.location.hash === '#edit') history.back();
else {
const m = document.getElementById('modal-edit-profile');
m.classList.add('hidden'); m.classList.remove('flex');
}
}

async function saveProfileInfo() {
const btn = document.querySelector('button[onclick="saveProfileInfo()"]');
const originalText = btn.innerHTML;
btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...';
btn.disabled = true;

try {
const newNick = document.getElementById('edit-nick').value.trim();
const newBio = document.getElementById('edit-bio').value.trim();
const newWa = document.getElementById('edit-wa').value.replace(/[^0-9]/g, ''); // BARIS BARU: Filter hanya angka
const newPass = document.getElementById('edit-pass').value.trim();

if(!newNick) {
showToast("Nickname tidak boleh kosong!", "error");
return;
}

if (newPass) {
const { error: errPass } = await supabaseClient.auth.updateUser({ password: newPass });
if (errPass) {
showToast("Gagal ganti password: " + errPass.message, "error");
return;
}
}

const currentAvatar = userProfile?.avatar_url || "";
const { error } = await supabaseClient.from('profiles').upsert({
id: currentUser.id,
nickname: newNick,
bio: newBio,
whatsapp: newWa, // BARIS BARU: Simpan WA ke database
avatar_url: currentAvatar
});

if (error) {
// Jika error karena nickname sudah dipakai (Kode error PostgreSQL: 23505)
if (error.code === '23505') {
throw new Error("Nickname tersebut sudah dipakai player lain. Silakan cari yang lain!");
}
throw error;
}

await fetchProfile();
updateUIForLoggedIn();
closeEditProfileModal();
showToast("Profil berhasil diperbarui!", "success");

} catch (err) {
showToast("Terjadi Kesalahan: " + err.message, "error");
} finally {
btn.innerHTML = originalText;
btn.disabled = false;
}
}

// ==========================================
// FUNGSI HAPUS AKUN PERMANEN
// ==========================================
async function hapusAkunPermanen() {
    if (!currentUser) return;

    const konfirmasi = await customPrompt("PERINGATAN! Semua data (Video, Follower, Saldo, dan Media) akan hangus.\n\nKetik 'HAPUS AKUN' huruf besar semua untuk melanjutkan:");
    
    if (konfirmasi === 'HAPUS AKUN') {
        showToast("Sedang menghancurkan akun dan membersihkan media...", "info");
        
        try {
            // 1. PANGGIL API UNTUK MENGHAPUS FOLDER BIZNET GIO DULU
            // Lakukan ini sebelum RPC Supabase agar akses ID user masih valid
            await fetch(`/api/delete-s3?type=folder&userId=${currentUser.id}`, {
                method: 'DELETE'
            });

            // 2. PANGGIL SUPABASE RPC UNTUK HAPUS DATABASE
            const { error } = await supabaseClient.rpc('hapus_akun_saya');
            
            if (error) throw error;

            showToast("Akun dan seluruh media berhasil dihapus permanen.", "success");
            
            closeEditProfileModal();
            await handleLogout();
            
        } catch (err) {
            console.error(err);
            showToast("Gagal menghapus akun. Pastikan Anda terhubung ke internet.", "error");
        }
    } else if (konfirmasi !== null) {
        showToast("Kata kunci salah. Penghapusan dibatalkan.", "error");
    }
}



async function fetchFollowStats(targetUserId) {
const { count: followers } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId);
const { count: following } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId);

const elPengikut = document.getElementById('stat-pengikut'); if(elPengikut) elPengikut.innerText = followers || 0;
const elMengikuti = document.getElementById('stat-mengikuti'); if(elMengikuti) elMengikuti.innerText = following || 0;
}

async function toggleFollow(targetUserId) {
    if (!currentUser) return openAuthModal();
    if (currentUser.id === targetUserId) return;

    const btns = document.querySelectorAll('#btn-follow');
    btns.forEach(btn => btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>');

    const { data } = await supabaseClient.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', targetUserId).single();

    if (data) {
        // --- PROSES UNFOLLOW ---
        await supabaseClient.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        btns.forEach(btn => {
            btn.innerText = 'IKUTI';
            btn.classList.replace('bg-white/10', 'bg-brand-accent');
        });
        showToast("Batal mengikuti", "info");

        // 1. Cabut ID dari memori agar video selanjutnya memunculkan tombol (+)
        myFollowingList = myFollowingList.filter(id => id !== targetUserId);

        // 2. Jika tombol (+) di video masih tersimpan di HTML (hanya disembunyikan), kita munculkan lagi secara real-time
        document.querySelectorAll(`#feed-follow-btn-${targetUserId}`).forEach(btn => {
            btn.style.display = 'flex';
            setTimeout(() => btn.classList.remove('scale-0', 'opacity-0'), 10);
        });

    } else {
        // --- PROSES FOLLOW ---
        await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
        btns.forEach(btn => {
            btn.innerText = 'MENGIKUTI';
            btn.classList.replace('bg-brand-accent', 'bg-white/10');
        });
        showToast("Berhasil mengikuti!", "success");

        // 1. Tambahkan ID ke memori
        if (!myFollowingList.includes(targetUserId)) {
            myFollowingList.push(targetUserId);
        }

        // 2. Sembunyikan SEMUA tombol (+) di video orang ini secara Real-Time (Tanpa perlu refresh!)
        document.querySelectorAll(`#feed-follow-btn-${targetUserId}`).forEach(btn => {
            btn.classList.add('scale-0', 'opacity-0');
            setTimeout(() => btn.style.display = 'none', 300); // Tunggu animasi mengecil selesai
        });
    }

    fetchFollowStats(targetUserId);
}

// Fungsi klik Follow langsung dari Feed Video (Dipersingkat karena sudah diurus fungsi di atas)
async function feedToggleFollow(targetUserId, btnElement) {
    if (!currentUser) return openAuthModal();

    if (currentUser.id === targetUserId) {
        showToast("Ini video milikmu sendiri!", "info");
        return;
    }

    const icon = btnElement.querySelector('i');
    icon.className = 'fas fa-spinner fa-spin text-[10px]';

    try {
        // Panggil fungsi utama. Fungsi utama otomatis akan menghilangkan tombol di layar.
        await toggleFollow(targetUserId);
    } catch(e) {
        // Jika gagal (sinyal jelek), kembalikan ikon ke Plus (+)
        icon.className = 'fas fa-plus text-[10px]';
    }
}



async function initPresence() {
if (!currentUser || presenceChannel) return;

presenceChannel = supabaseClient.channel('global_presence', {
config: { presence: { key: currentUser.id } }
});

presenceChannel
.on('presence', { event: 'sync' }, () => {
const newState = presenceChannel.presenceState();
onlineUsersMap.clear();
for (const id in newState) {
onlineUsersMap.set(id, true);
}
updatePresenceUI();
})
.subscribe(async (status) => {
if (status === 'SUBSCRIBED') {
await presenceChannel.track({ online_at: new Date().toISOString() });
}
});
}

async function updatePresenceUI() {
if (activeChatUserId) {
const statusEl = document.getElementById('active-chat-status');
const dotEl = document.getElementById('active-chat-online-dot');
const isOnline = onlineUsersMap.has(activeChatUserId);

if (isOnline) {
statusEl.innerText = 'Online';
statusEl.className = 'text-[9px] text-brand-info font-bold';
dotEl.classList.remove('hidden');
} else {
dotEl.classList.add('hidden');
statusEl.className = 'text-[9px] text-gray-500';

// Tarik data last_seen dari Supabase
const { data } = await supabaseClient.from('profiles').select('last_seen').eq('id', activeChatUserId).single();
if (data && data.last_seen) {
statusEl.innerText = 'Terakhir dilihat ' + timeAgo(data.last_seen);
} else {
statusEl.innerText = 'Offline';
}
}
}

document.querySelectorAll('.online-indicator').forEach(el => {
const uid = el.dataset.uid;
onlineUsersMap.has(uid) ? el.classList.remove('hidden') : el.classList.add('hidden');
});
}

async function searchUsersForChat(query) {
if (!query.trim()) return loadChatList();

// 🚨 KUNCI FIX: Arahkan langsung ke container personal chat biar gak eror crash!
const container = document.getElementById('chat-personal-container');
container.innerHTML = '<div class="flex justify-center mt-6"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';

const { data } = await supabaseClient.from('profiles').select('*').ilike('nickname', `%${query}%`).limit(15);

if (data && data.length > 0) {
let html = '<p class="text-[10px] text-gray-500 font-bold mb-2 ml-1 uppercase">Hasil Pencarian</p>';
data.forEach(p => {
const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
html += `
<div onclick="openChatRoom('${p.id}', '${escapeHTML(p.nickname).replace(/&#39;/g, "\\'")}', '${ava}')" class="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all">
<img src="${ava}" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
<div class="ml-3">
<h4 class="font-bold text-white text-xs">${p.nickname}</h4>
<p class="text-[10px] text-gray-400 truncate w-48">${p.bio || 'Pemain AU2'}</p>
</div>
</div>`;
});
container.innerHTML = html;
} else {
container.innerHTML = '<p class="text-center text-xs text-gray-500 mt-6">User tidak ditemukan.</p>';
}
}

function toggleWidget() {
const widget = document.getElementById('floating-widget');
if (widget.classList.contains('opacity-0')) {
history.pushState({ popup: 'widget' }, null, '#inbox');
widget.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
document.getElementById('search-user-chat').value = '';
loadChatList();
} else {
if (window.location.hash.startsWith('#inbox') || window.location.hash.startsWith('#chatroom')) {
history.back();
} else {
widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
closeChatRoom(false);
}
}
}
// Fungsi untuk membuka ruang obrolan (Grup atau Personal)
// ==========================================
// FITUR RUANG OBROLAN (CHAT ROOM)
// ==========================================

// Fungsi untuk membuka ruang obrolan (Grup atau Personal)
function openChatRoom(id, name, avatar, isGroup = false) {
// --- KUNCI PERBAIKAN: Tambahkan riwayat ke browser agar tombol back HP aktif ---
history.pushState({ popup: 'chatroom' }, null, '#chatroom');

// 1. Sembunyikan daftar chat, tampilkan ruang chat
document.getElementById('chat-list-view').classList.add('hidden');
document.getElementById('chat-list-view').classList.remove('flex');

document.getElementById('chat-room-view').classList.remove('hidden');
document.getElementById('chat-room-view').classList.add('flex');

// 2. Ubah profil di header (Atas ruang chat)
document.getElementById('active-chat-name').innerHTML = `<div class="flex items-center gap-1">${name} <span id="header-badge-container"></span></div>`;

if (!isGroup) {
    // Ambil data EXP user secara real-time untuk menampilkan lencana
    supabaseClient.from('profiles').select('exp').eq('id', id).single().then(({data}) => {
        const targetLevel = hitungStatusLevel(data?.exp || 0).level;
        const vidCountHeader = allVideosData.filter(v => String(v.user_id) === String(id)).length;
        
        const badgeHTML = getBadgeByLevelAndVideos(targetLevel, vidCountHeader);
        const badgeContainer = document.getElementById('header-badge-container');
        if (badgeContainer) badgeContainer.innerHTML = badgeHTML;
    });
}
document.getElementById('active-chat-avatar').src = avatar;

// 3. Set ID yang sedang aktif agar fungsi kirim pesan tahu mau dikirim ke mana
if (isGroup) {
    activeGroupId = id;
    activeChatUserId = null;
    document.getElementById('active-chat-status').innerText = 'Grup Obrolan';
    document.getElementById('active-chat-online-dot').classList.add('hidden');
    
    // --- TAMBAHAN MENTION: Tarik data member untuk auto-complete ---
    supabaseClient.from('group_members').select('profiles(nickname, avatar_url)').eq('group_id', id)
    .then(({data}) => {
        if(data) currentRoomMembers = data.map(d => d.profiles).filter(Boolean);
    });
} else {
    activeChatUserId = id;
    activeGroupId = null;
    currentRoomMembers = []; // Kosongkan kalau personal chat
}


// 4. Bersihkan kontainer chat lama sebelum memuat yang baru
document.getElementById('chat-messages-container').innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';

// 5. Panggil fungsi untuk memuat pesan dari Supabase
loadRoomMessages();

// 6. AKTIFKAN RADAR REAL-TIME & TYPING INDICATOR
setupChatRoomListener();

// --- 7. TAMBAHAN BARU: VOICE NOTE & LAST SEEN ---
document.getElementById('chat-room-input').value = '';
sendTypingStatus();
updatePresenceUI();
}



// Fungsi untuk menutup ruang obrolan dan kembali ke daftar
function closeChatRoom(kembaliKeList = true) {
// --- CLEANUP DATABASE ---
// Putus koneksi real-time agar HP tidak panas dan tidak ada bug pesan double
if (messageSubscription) {
supabaseClient.removeChannel(messageSubscription);
messageSubscription = null;
}

// --- RESET STATE ---
activeGroupId = null;
activeChatUserId = null;

// Bersihkan layar chat agar tidak 'bayang-bayang' saat buka chat orang lain
const container = document.getElementById('chat-messages-container');
if (container) container.innerHTML = '';

// --- UI TRANSITION ---
if (kembaliKeList) {
// Sembunyikan Ruang Chat (Room)
const roomView = document.getElementById('chat-room-view');
roomView.classList.add('hidden');
roomView.classList.remove('flex');

// Munculkan kembali Daftar Chat (Inbox)
const listView = document.getElementById('chat-list-view');
listView.classList.remove('hidden');
listView.classList.add('flex');

// Refresh daftar inbox untuk update pesan terakhir & centang biru
loadChatList();
}
}

// FUNGSI UNTUK MEMBUKA PROFIL/INFO GRUP DARI HEADER CHAT
function openChatHeaderInfo() {
    if (activeGroupId) {
        loadGroupInfo(activeGroupId);
    } else if (activeChatUserId) {
        const widget = document.getElementById('floating-widget');
        if (widget) widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
        viewUserProfile(activeChatUserId);
    }
}


// FUNGSI UNTUK SCROLL CHAT KE PALING BAWAH OTOMATIS
function scrollToBottomChat() {
const container = document.getElementById('chat-messages-container');
if (container) {
// Beri sedikit delay agar browser selesai merender HTML-nya dulu
setTimeout(() => {
container.scrollTo({
top: container.scrollHeight,
behavior: 'smooth' // <--- INI KUNCI EFEK WHATSAPP
});
}, 50);
}
}



// 1. FUNGSI MENGAMBIL PESAN DARI DATABASE (WHATSAPP STYLE WITH DATE DIVIDER)
async function loadRoomMessages() {
const container = document.getElementById('chat-messages-container');
const isGroup = !!activeGroupId;
const targetId = isGroup ? activeGroupId : activeChatUserId;

if(!targetId) return;

try {
let query = supabaseClient.from('messages').select('*, profiles!messages_sender_id_fkey(nickname, avatar_url, exp)').order('created_at', { ascending: false }).limit(50);

if (isGroup) {
query = query.eq('group_id', targetId);
} else {
query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.id})`);
}

const { data, error } = await query;
if (error) { await customAlert("INFO ERROR SUPABASE:\n" + error.message); throw error; }

container.innerHTML = '';

if (data && data.length > 0) {
let lastDateString = '';

let clearedChats = JSON.parse(localStorage.getItem('cleared_chats') || '{}');
let clearTime = clearedChats[targetId] ? new Date(clearedChats[targetId]) : new Date(0);
let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');

let validMessages = data.filter(msg => {
const msgDate = new Date(msg.created_at);
if (msgDate <= clearTime) return false;
if (deletedForMe.includes(msg.id)) return false;
return true;
});

validMessages.reverse();
if(validMessages.length === 0) {
container.innerHTML = '<div class="text-center text-xs text-gray-500 mt-10">Belum ada pesan. Mulai obrolan!</div>';
} else {
validMessages.forEach(msg => {
const msgDate = new Date(msg.created_at);
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

let dateLabel = '';
if (msgDate.toDateString() === today.toDateString()) { dateLabel = 'HARI INI'; }
else if (msgDate.toDateString() === yesterday.toDateString()) { dateLabel = 'KEMARIN'; }
else { dateLabel = msgDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(); }

if (dateLabel !== lastDateString) {
const dateDividerHtml = `
<div class="flex justify-center my-3 message-anim">
<span class="bg-[#121b22] text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/5 tracking-wide shadow-sm uppercase">${dateLabel}</span>
</div>
`;
container.insertAdjacentHTML('beforeend', dateDividerHtml);
lastDateString = dateLabel;
}
appendMessageBubble(msg);
});
scrollToBottomChat();
}
} else {
container.innerHTML = '<div class="text-center text-xs text-gray-500 mt-10">Belum ada pesan. Mulai obrolan!</div>';
}

if (!isGroup) {
await supabaseClient.from('messages').update({ is_read: true }).eq('sender_id', targetId).eq('receiver_id', currentUser.id).eq('is_read', false);
checkGlobalUnreadMessages();
}
} catch (err) {
container.innerHTML = '<div class="text-center text-xs text-red-500 mt-10">Gagal memuat pesan.</div>';
}
}

// FUNGSI BERSIHKAN SEMUA OBROLAN (CLEAR CHAT DARI DALAM ROOM)
async function clearCurrentChat() {
const isGroup = !!activeGroupId;
const targetId = isGroup ? activeGroupId : activeChatUserId;
if (!targetId) return;

const confirmClear = await customConfirm("Yakin ingin membersihkan semua pesan di obrolan ini untuk Anda?");
if (confirmClear) {
let clearedChats = JSON.parse(localStorage.getItem('cleared_chats') || '{}');
clearedChats[targetId] = new Date().toISOString();
localStorage.setItem('cleared_chats', JSON.stringify(clearedChats));

showToast("Obrolan berhasil dibersihkan", "success");
loadRoomMessages();
loadChatList();
}
}

// FUNGSI BERSIHKAN OBROLAN DARI DAFTAR INBOX (DARI LUAR)
async function deleteConversation(targetId, chatName) {
const confirmClear = await customConfirm(`Yakin ingin membersihkan riwayat obrolan dengan ${chatName}?`);
if (confirmClear) {
let clearedChats = JSON.parse(localStorage.getItem('cleared_chats') || '{}');
clearedChats[targetId] = new Date().toISOString();
localStorage.setItem('cleared_chats', JSON.stringify(clearedChats));

showToast(`Obrolan dibersihkan`, "success");
loadChatList();
}
}

// --- FUNGSI HELPER UNTUK LONG PRESS ---
let longPressTimer;
function hancurkanLongPress() {
clearTimeout(longPressTimer);
}
function mulaiLongPress(msgId, senderId) {
clearTimeout(longPressTimer);
longPressTimer = setTimeout(() => {
if (navigator.vibrate) navigator.vibrate(40);
showMsgOptions(msgId, senderId);
}, 500);
}

// ==========================================
// FUNGSI RENDER BARIS CHAT DI INBOX
// ==========================================
function renderRow(item, isGroup) {
    // 1. Amankan teks pesan dari tag media & kode sistem
    let lastMessageText = "Belum ada pesan";
    if (item.latestMsg && item.latestMsg.message) {
        lastMessageText = item.latestMsg.message;

        // Bersihkan kode [FORWARDED]
        if (lastMessageText.startsWith('[FORWARDED]')) {
            lastMessageText = "⏩ " + lastMessageText.replace(/^\[FORWARDED\]\n?/, '');
        }

        // Bersihkan kode [REPLY] yang bikin ID panjang bocor
        const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const matchReply = lastMessageText.match(replyRegex);
        if (matchReply) {
            lastMessageText = matchReply[4]; // Langsung ambil isi pesan aslinya aja
        }

        // Bersihkan kode [STORY_REPLY]
        const storyReplyRegex = /^\[STORY_REPLY:(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const matchStory = lastMessageText.match(storyReplyRegex);
        if (matchStory) {
            lastMessageText = "Membalas status: " + matchStory[3];
        }

        // Ubah kode media jadi Ikon biar cantik
        if (lastMessageText.startsWith('[IMG]')) lastMessageText = "📷 Foto";
        else if (lastMessageText.startsWith('[VIDEO]')) lastMessageText = "🎥 Video";
        else if (lastMessageText.startsWith('[AUDIO]')) lastMessageText = "🎙️ Pesan Suara";
        else if (lastMessageText.startsWith('[SISTEM]')) lastMessageText = "🔔 Pemberitahuan Sistem";
        else if (lastMessageText.startsWith('[AUTODATA]')) {
            let prodName = lastMessageText.replace('[AUTODATA]', '').split('|||')[0] || '';
            lastMessageText = "📦 Data Pesanan: " + prodName;
        }
    }


    // 2. Siapkan badge pesan belum dibaca
    let unreadBadge = item.unread > 0 
        ? `<span class="bg-brand-accent text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full ml-2 shrink-0 shadow-md">${item.unread > 99 ? '99+' : item.unread}</span>` 
        : '';

    // 3. Atur URL foto dan efek cincin (story ring)
    let avatarUrl = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1133&color=fff`;
    let ringClass = item.hasStory && !isGroup ? 'story-ring' : '';
    let imgBorder = item.hasStory && !isGroup ? 'border-2 border-brand-card' : 'border border-white/10';

    // 4. Amankan nama dan pesan dari XSS & tanda kutip
let safeNameDisplay = escapeHTML(item.name);
let safeNameJS = safeNameDisplay.replace(/&#39;/g, "\\'");
    let safeMessageDisplay = escapeHTML(lastMessageText);
    let timeText = item.latestMsg ? timeAgo(item.latestMsg.created_at) : '';

    return `
    <div onclick="openChatRoom('${item.id}', '${safeNameJS}', '${avatarUrl}', ${isGroup})" class="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all border-b border-white/5 last:border-0">
        <div class="relative shrink-0 ${ringClass}">
            <img src="${avatarUrl}" class="w-11 h-11 rounded-full object-cover ${imgBorder}">
        </div>
        <div class="ml-3 flex-1 min-w-0">
            <div class="flex justify-between items-center mb-0.5">
                <h4 class="font-bold text-white text-xs truncate">${safeNameDisplay}</h4>
                <span class="text-[9px] text-gray-500 shrink-0 ml-2">${timeText}</span>
            </div>
            <div class="flex justify-between items-center">
                <p class="text-[10px] text-gray-400 truncate leading-snug">${safeMessageDisplay}</p>
                ${unreadBadge}
            </div>
        </div>
    </div>`;
}


// FUNGSI MENGAMBIL DAFTAR CHAT INBOX (PROTEKSI KEBAL CRASH & SINKRONISASI TOTAL)
async function loadChatList() {
const cPersonal = document.getElementById('chat-personal-container');
const cGroup = document.getElementById('chat-group-container');

if (!currentUser) {
cPersonal.innerHTML = `<div class="text-center mt-20 text-xs text-gray-500">Silakan login.</div>`;
return;
}

cPersonal.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';
cGroup.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';

try {
const unreadCounts = {};
const { data: unreads } = await supabaseClient.from('messages').select('sender_id').is('group_id', null).eq('receiver_id', currentUser.id).eq('is_read', false);
if (unreads) unreads.forEach(u => { unreadCounts[u.sender_id] = (unreadCounts[u.sender_id] || 0) + 1; });

const { data: myGroups } = await supabaseClient.from('group_members').select('group_id').eq('user_id', currentUser.id);
let myGroupIds = myGroups ? myGroups.map(g => g.group_id) : [];

let query = supabaseClient.from('messages').select('*');
if (myGroupIds.length > 0) {
query = query.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id},group_id.in.(${myGroupIds.join(',')})`);
} else {
query = query.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
}

const { data: messages, error: msgError } = await query.order('created_at', { ascending: false });
if (msgError) { console.error("Error messages query:", msgError); throw msgError; }

const personalContacts = {}, groupContacts = {};
if (messages) {
messages.forEach(msg => {
if (msg.group_id) {
if (!groupContacts[msg.group_id]) groupContacts[msg.group_id] = msg;
} else {
const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
if (partnerId && !personalContacts[partnerId] && !blockedUsersList.includes(partnerId)) {
personalContacts[partnerId] = msg;
}
}
});
}

if (myGroups) {
myGroups.forEach(g => {
if (!groupContacts[g.group_id]) groupContacts[g.group_id] = { created_at: '1970-01-01T00:00:00Z', is_empty: true, message: 'Grup baru dibuat' };
});
}

globalPersonalList = [];
globalGroupList = [];
const partnerIds = Object.keys(personalContacts), groupIds = Object.keys(groupContacts);

let clearedChats = JSON.parse(localStorage.getItem('cleared_chats') || '{}');
let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');

if (partnerIds.length > 0) {
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', partnerIds);
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: activeStories } = await supabaseClient.from('stories').select('user_id').gte('created_at', past24h);
    let usersWithStory = activeStories ? activeStories.map(s => s.user_id) : [];

    if (profiles) {
        profiles.forEach(p => {
            const msg = personalContacts[p.id];
            const clearTimeStr = clearedChats[p.id];
            if (clearTimeStr && msg && new Date(msg.created_at) <= new Date(clearTimeStr)) return;
            // FIX: Gunakan globalPersonalList
            globalPersonalList.push({ type: 'personal', id: p.id, name: p.nickname || "Player", avatar: p.avatar_url, latestMsg: msg, unread: unreadCounts[p.id] || 0, hasStory: usersWithStory.includes(p.id) });
        });
    }
}

if (groupIds.length > 0) {
    const { data: groups } = await supabaseClient.from('groups').select('id, name, avatar_url').in('id', groupIds);
    if (groups) {
        groups.forEach(g => {
            const msg = groupContacts[g.id];
            const clearTimeStr = clearedChats[g.id];
            if (clearTimeStr && msg && new Date(msg.created_at) <= new Date(clearTimeStr)) return;
            // FIX: Gunakan globalGroupList
            globalGroupList.push({ type: 'group', id: g.id, name: g.name || "Grup Obrolan", avatar: g.avatar_url, latestMsg: msg, unread: 0 });
        });
    }
}

// FIX: Urutkan menggunakan variabel global
globalPersonalList.sort((a, b) => new Date(b.latestMsg?.created_at || 0) - new Date(a.latestMsg?.created_at || 0));
globalGroupList.sort((a, b) => new Date(b.latestMsg?.created_at || 0) - new Date(a.latestMsg?.created_at || 0));

// FIX: Render menggunakan variabel global
cPersonal.innerHTML = globalPersonalList.length ? globalPersonalList.map(i => renderRow(i, false)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada obrolan.</p>';
cGroup.innerHTML = globalGroupList.length ? globalGroupList.map(i => renderRow(i, true)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada grup.</p>';

checkGlobalUnreadMessages();
} catch (e) {
console.error("Crash loadChatList:", e);
cPersonal.innerHTML = '<div class="p-6 text-center text-xs text-red-500">Gagal memuat pesan.</div>';
}
}








// 3. LOGIKA STORY / STATUS
let currentActiveStories = [];
let currentStoryTimer;

async function loadStories() {
const container = document.getElementById('status-list-container');
if (!currentUser) return;

// Set foto profil saya di bagian Status
const myAvatar = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Me'}`;
document.getElementById('my-story-avatar').src = myAvatar;

try {
const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data: stories } = await supabaseClient
.from('stories')
.select('*, profiles(nickname, avatar_url)')
.gte('created_at', past24h)
.order('created_at', { ascending: false });

// --- AMBIL ELEMEN UI STATUS SAYA ---
const myStoryRing = document.getElementById('my-story-ring');
const myStatusText = document.getElementById('my-status-text');

// Reset tampilan ke default (Jika tidak ada story aktif)
window.viewMyStory = () => document.getElementById('upload-story-input').click();
if (myStoryRing) {
myStoryRing.classList.remove('story-ring');
myStoryRing.classList.add('border', 'border-white/10');
}
if (myStatusText) {
myStatusText.innerText = "Ketuk untuk menambahkan update status";
myStatusText.className = "text-[10px] text-gray-400";
}

if (!stories || stories.length === 0) {
container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">Belum ada pembaruan status.</div>`;
return;
}

// Kelompokkan status berdasarkan user_id
const groupedStories = {};
stories.forEach(s => {
if (!groupedStories[s.user_id]) {
groupedStories[s.user_id] = {
user_id: s.user_id,
nickname: s.profiles?.nickname,
avatar: s.profiles?.avatar_url,
stories: []
};
}
groupedStories[s.user_id].stories.push(s);
});

// --- CEK: APAKAH SAYA PUNYA STATUS AKTIF? ---
if (groupedStories[currentUser.id]) {
const myLatestTime = timeAgo(groupedStories[currentUser.id].stories[0].created_at);

// 1. Nyalakan Ring Warna-warni
if (myStoryRing) {
myStoryRing.classList.add('story-ring');
myStoryRing.classList.remove('border', 'border-white/10');
}
// 2. Ganti teks jadi waktu (misal: "Baru saja")
if (myStatusText) {
myStatusText.innerText = myLatestTime;
myStatusText.className = "text-[10px] text-brand-info font-bold";
}
// 3. Jika diklik, fungsinya jadi MENONTON, bukan upload
window.viewMyStory = () => viewStory(
currentUser.id,
userProfile?.nickname || 'Me',
myAvatar
);
}

// --- RENDER LIST STATUS TEMAN ---
let html = '';
for (const uid in groupedStories) {
if (uid === currentUser.id) continue; // Jangan masukkan status saya ke daftar teman

const user = groupedStories[uid];
const ava = user.avatar || `https://ui-avatars.com/api/?name=${user.nickname}`;
const latestTime = timeAgo(user.stories[0].created_at);

html += `
<div class="flex items-center p-2 bg-brand-card/50 hover:bg-white/5 cursor-pointer rounded-2xl border border-white/5 transition-all mb-2" onclick="viewStory('${user.user_id}', '${escapeHTML(user.nickname).replace(/&#39;/g, "\\'")}', '${ava}')">
<div class="relative shrink-0 story-ring">
<img src="${ava}" class="w-11 h-11 rounded-full object-cover border-2 border-brand-card">
</div>
<div class="ml-3 flex-1">
<h4 class="font-bold text-white text-[13px]">${user.nickname}</h4>
<p class="text-[10px] text-brand-info">${latestTime}</p>
</div>
</div>`;
}
container.innerHTML = html || `<div class="text-center py-6 text-xs text-gray-500">Belum ada pembaruan status teman.</div>`;
} catch(e) {
console.error(e);
container.innerHTML = `<div class="text-center py-6 text-xs text-red-500">Gagal memuat status.</div>`;
}
}

// STORY VIEWER LOGIC (WHATSAPP STYLE)
async function viewStory(userId, name, avatar) {
document.getElementById('viewer-story-name').innerText = name;
document.getElementById('viewer-story-avatar').src = avatar;

const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data: stories } = await supabaseClient.from('stories').select('*').eq('user_id', userId).gte('created_at', past24h).order('created_at', { ascending: true });

if(!stories || stories.length === 0) {
showToast("Status sudah kedaluwarsa.", "error");
return loadChatList();
}

currentActiveStories = stories;
currentActiveStories.currentIndex = 0;

// -- BIKIN GARIS PROGRESS SEBANYAK JUMLAH STORY --
const progressContainer = document.getElementById('story-progress-container');
progressContainer.innerHTML = stories.map((_, i) => `
<div class="h-1 bg-white/30 rounded-full overflow-hidden flex-1">
<div id="story-progress-${i}" class="h-full bg-white w-0"></div>
</div>
`).join('');

history.pushState({ popup: 'story' }, null, '#story'); // <-- SUNTIKAN HISTORY BARU
const modal = document.getElementById('story-viewer-modal');
modal.classList.remove('hidden');
modal.classList.add('flex');

// Pastikan posisi normal sebelum dibuka (jika sebelumnya ditarik)
modal.style.transform = 'translateY(0)';
modal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
setTimeout(() => modal.classList.remove('opacity-0'), 10);

playStory(0);
}

// ==========================================
// FUNGSI MANAJEMEN DAN NAVIGASI STORY (BISA FOTO & VIDEO)
// ==========================================
function playStory(index) {
if (index >= currentActiveStories.length) {
return closeStoryViewer();
}
currentActiveStories.currentIndex = index;
const story = currentActiveStories[index];

document.getElementById('viewer-story-time').innerText = timeAgo(story.created_at);

const imgEl = document.getElementById('viewer-story-img');
const vidEl = document.getElementById('viewer-story-vid');
const volBtn = document.getElementById('btn-story-volume');

// Bersihkan media sebelumnya & hentikan pemutar video jika sedang berjalan
imgEl.classList.add('hidden');
vidEl.classList.add('hidden');
vidEl.pause();
vidEl.src = '';
vidEl.onended = null;
vidEl.onloadedmetadata = null;

// --- DETEKSI TIPE MEDIA STATUS ---
if (story.media_type === 'video') {
vidEl.src = story.media_url;
vidEl.classList.remove('hidden');

// 🔥 PERBAIKAN: Dipaksa langsung false agar video status langsung otomatis bersuara kencang saat dibuka
vidEl.muted = false;
vidEl.play().catch(() => {});

if (volBtn) {
volBtn.classList.remove('hidden');
volBtn.innerHTML = '<i class="fas fa-volume-up"></i>'; // Set default ikon ke speaker menyala
}
} else {
imgEl.src = story.media_url;
imgEl.classList.remove('hidden');
if (volBtn) volBtn.classList.add('hidden');
}

const captionEl = document.getElementById('viewer-story-caption');
if (captionEl) {
if (story.caption && story.caption.trim() !== '') {
captionEl.innerText = story.caption;
captionEl.classList.remove('hidden');
} else {
captionEl.classList.add('hidden');
captionEl.innerText = '';
}
}

const btnDelete = document.getElementById('btn-delete-story');
if (btnDelete) {
if (currentUser && story.user_id === currentUser.id) {
btnDelete.classList.remove('hidden'); // Munculkan jika milik sendiri
} else {
btnDelete.classList.add('hidden'); // Sembunyikan jika milik orang lain
}
}

// -- RESET ANIMASI PROGRESS BAR SINKRON ALA WHATSAPP --
for (let i = 0; i < currentActiveStories.length; i++) {
const bar = document.getElementById(`story-progress-${i}`);
if (!bar) continue;

bar.style.transition = 'none';
if (i < index) {
bar.style.width = '100%'; // Garis sebelumnya FULL
} else if (i > index) {
bar.style.width = '0%';   // Garis selanjutnya KOSONG
} else {
bar.style.width = '0%';   // Garis saat ini reset ke 0 dulu
}
}

clearTimeout(currentStoryTimer);

// --- JALANKAN TIMING PROGRESS BAR ---
if (story.media_type === 'video') {
// Jika video, bar berjalan mengikuti durasi asli video
vidEl.onloadedmetadata = () => {
const duration = vidEl.duration || 5;
setTimeout(() => {
const activeBar = document.getElementById(`story-progress-${index}`);
if (activeBar) {
activeBar.style.transition = `width ${duration}s linear`;
activeBar.style.width = '100%';
}
}, 50);
};
// Saat durasi video berakhir, otomatis lompat ke status berikutnya
vidEl.onended = () => {
nextStory();
};
} else {
// Jika foto, jalankan bar default selama 5 detik seperti biasa
setTimeout(() => {
const activeBar = document.getElementById(`story-progress-${index}`);
if (activeBar) {
activeBar.style.transition = 'width 5s linear';
activeBar.style.width = '100%';
}
currentStoryTimer = setTimeout(() => {
nextStory();
}, 5000);
}, 50);
}

// ==========================================
// --- LOGIKA BARU: TAMPILKAN STATS & BALASAN ---
// ==========================================
const replyContainer = document.getElementById('story-reply-container');
const replyInput = document.getElementById('story-reply-input');
const statsContainer = document.getElementById('story-owner-stats');

// Pindahkan fungsi tarik data ke luar agar selalu aktif untuk story siapa pun
if (typeof fetchStoryStats === 'function') fetchStoryStats(story.id);

if (currentUser && story.user_id === currentUser.id) {
    // JIKA INI STORY MILIK SAYA SENDIRI
    if (replyContainer) replyContainer.classList.add('hidden');
    if (statsContainer) {
        statsContainer.classList.remove('hidden');
        statsContainer.classList.add('flex');
    }
} else {
// JIKA INI STORY MILIK TEMAN
if (statsContainer) {
statsContainer.classList.add('hidden');
statsContainer.classList.remove('flex');
}
if (replyContainer) {
replyContainer.classList.remove('hidden');
if (replyInput) replyInput.value = '';

const heartIcon = replyContainer.querySelector('.fa-heart');
if (heartIcon) {
if (localStorage.getItem('story_liked_' + story.id)) {
heartIcon.classList.replace('far', 'fas');
heartIcon.classList.add('text-brand-accent');
heartIcon.classList.remove('animate-ping');
} else {
heartIcon.classList.replace('fas', 'far');
heartIcon.classList.remove('text-brand-accent', 'animate-ping');
}
}
}

// CATAT BAHWA KITA MELIHAT STORY INI (VIEWS)
if (typeof recordStoryView === 'function') recordStoryView(story.id);
}
}



// FUNGSI UTAMAKAN SAKLAR MUTED / UNMUTED VIDEO STORY
function toggleStoryVolume() {
const vidEl = document.getElementById('viewer-story-vid');
const volBtn = document.getElementById('btn-story-volume');
if (vidEl && volBtn) {
vidEl.muted = !vidEl.muted;
isGlobalMuted = vidEl.muted; // Sinkronkan ke audio global aplikasi
volBtn.innerHTML = vidEl.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
showToast(vidEl.muted ? "Suara Status Dimatikan" : "Suara Status Dinyalakan", vidEl.muted ? "info" : "success");
}
}

function closeStoryViewer(dariTombolBack = false) {
    clearTimeout(currentStoryTimer);

    // Paksa matikan video agar suaranya tidak bocor
    const vidEl = document.getElementById('viewer-story-vid');
    if (vidEl) {
        vidEl.pause();
        vidEl.src = '';
    }

    const modal = document.getElementById('story-viewer-modal');
    modal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    modal.classList.add('opacity-0');
    modal.style.transform = 'translateY(50px)'; 

    // Tutup laci stats jika masih terbuka secara visual (tanpa memicu history ganda)
    const statsModal = document.getElementById('modal-story-stats');
    if (statsModal && !statsModal.classList.contains('translate-y-full')) {
        statsModal.classList.add('translate-y-full');
    }

    // SINKRONISASI TOMBOL BACK HP
    if (!dariTombolBack && window.location.hash === '#story') {
        history.back();
    }

    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        modal.style.transform = 'translateY(0)'; // Reset posisi
    }, 300);
}




function nextStory() {
if (!currentActiveStories || currentActiveStories.length === 0) return;

let nextIndex = currentActiveStories.currentIndex + 1;

if (nextIndex >= currentActiveStories.length) {
closeStoryViewer();
} else {
playStory(nextIndex);
}
}

async function hapusStoryAktif() {
    const story = currentActiveStories[currentActiveStories.currentIndex];
    const konfirmasi = await customConfirm("Yakin ingin menghapus status ini?");

    if (konfirmasi) {
        try {
            // 1. Hapus dari database Supabase
            const { error } = await supabaseClient.from('stories').delete().eq('id', story.id);
            if (error) throw error;

            // 2. TEMBAK API DELETE FILE: Hapus fisik MP4/JPG dari Biznet
            if (story.media_url) {
                // Kita tambahkan .catch agar jika file di Biznet sudah terlanjur hilang, aplikasi tidak nge-crash
                await fetch('/api/delete-s3?type=file', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrl: story.media_url })
                }).catch(e => console.log("Ignore S3 error:", e));
            }

            showToast("Status berhasil dihapus sepenuhnya", "success");
            closeStoryViewer();
            loadStories(); // Refresh daftar status di latar belakang
        } catch (err) {
            showToast("Gagal menghapus status", "error");
        }
    }
}


function prevStory() {
if (!currentActiveStories || currentActiveStories.length === 0) return;

let prevIndex = currentActiveStories.currentIndex - 1;

if (prevIndex < 0) {
playStory(0);
} else {
playStory(prevIndex);
}
}

// ==========================================
// SULAP TIKTOK: UPLOAD VIDEO DI LATAR BELAKANG
// ==========================================
async function prosesUploadVideo() {
    if (!currentUser) return openAuthModal();

    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    const file = fileInput.files[0];
    const allowCommentsToggle = document.getElementById('upload-allow-comments');
    const allowComments = allowCommentsToggle ? allowCommentsToggle.checked : true;
    
    // AMANKAN TEKS CAPTION SEBELUM LAYAR DITUTUP
    const teksCaption = captionInput.value || ""; 

    if (!file) return showToast("Pilih video dulu!", "error");

    const btn = document.querySelector('button[onclick="prosesUploadVideo()"]');
    btn.disabled = true; 
    isUploading = true; // Kunci window unload agar kalau user mau close tab, ditahan

    // 🔥 1. TRIK SULAP: TUTUP LAYAR UPLOAD SEKARANG JUGA!
    closeUploadModal();
    
    // 🔥 2. LEMPAR USER KE PROFILNYA SENDIRI & MUNCULKAN NOTIF
    switchTab('profile');
    viewedUserId = currentUser.id;
    checkSession();
    showToast("Mengunggah video di latar belakang...", "info");

    try {
        const configRes = await fetch('/api/get-config');
        const config = await configRes.json();
        if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan di config");

        const namaFolder = `${currentUser.id}/feed_video`;
        const namaFileUnik = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const pathLengkap = `${namaFolder}/${namaFileUnik}`;

        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`);
        const dataUrl = await resUrl.json();

        // Proses berat upload ke server Biznet GIO
        await fetch(dataUrl.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' }
        });

        const spreadsheetPayload = {
            ID_Video: 'vid_' + Date.now(),
            URL_Video: dataUrl.finalVideoUrl,
            id: 'vid_' + Date.now(),
            video_url: dataUrl.finalVideoUrl,
            caption: teksCaption, // Pakai teks yang sudah diamankan
            nickname: userProfile?.nickname || "Player",
            avatar_url: userProfile?.avatar_url || "",
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            allow_comments: allowComments
        };

        newUploads.push(spreadsheetPayload);

        await fetch(config.gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(spreadsheetPayload)
        });

        // 🔥 3. NOTIFIKASI SUKSES & REFRESH GRID PROFIL SECARA DIAM-DIAM
        showToast("Video berhasil diposting!", "success");
        tambahExp(50);
        
        allVideosData = []; // Kosongkan cache biar memuat data baru
        if (document.getElementById('profile').classList.contains('active')) {
            renderProfileVideos(currentUser.id); // Refresh grid videonya
        }

    } catch (err) {
        showToast("Upload gagal: " + err.message, "error");
    } finally {
        btn.disabled = false;
        isUploading = false; // Buka kunci window unload
    }
}


// ==========================================
// FITUR PREVIEW MEDIA WHATSAPP STYLE (CHAT & STORY)
// ==========================================
let mediaPreviewFile = null;
let mediaPreviewContext = ''; // Isinya 'chat' atau 'story'

// 1. Interceptor untuk Chat
async function handleChatMediaSelect(event) {
    const file = event.target.files[0];
    if (!file || (!activeChatUserId && !activeGroupId)) return;

    // Cek keamanan jika ini di Grup
    if (activeGroupId) {
        const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', activeGroupId).eq('user_id', currentUser.id).single();
        if (!checkMember) {
            await customAlert("Anda tidak dapat mengirim foto karena telah dikeluarkan dari grup ini.");
            event.target.value = ''; closeChatRoom(); return;
        }
    }
    bukaPreviewMedia(file, 'chat');
    event.target.value = ''; // Reset
}

// 2. Interceptor untuk Story
function handleUploadStory(event) {
    const file = event.target.files[0];
    if (!file) return;
    bukaPreviewMedia(file, 'story');
    event.target.value = ''; // Reset
}

// 3. Mesin UI Layar Preview
function bukaPreviewMedia(file, context) {
    history.pushState({ popup: 'media_preview' }, null, '#mediapreview');
    
    mediaPreviewFile = file;
    mediaPreviewContext = context;

    const modal = document.getElementById('modal-preview-media');
    const imgEl = document.getElementById('preview-media-img');
    const vidEl = document.getElementById('preview-media-vid');
    const titleEl = document.getElementById('preview-media-title');
    const captionInput = document.getElementById('preview-media-caption');
    
    captionInput.value = '';
    captionInput.style.height = 'auto'; 

    const url = URL.createObjectURL(file);

    // Deteksi Video atau Foto
    if (file.type.startsWith('video/')) {
        imgEl.classList.add('hidden');
        vidEl.src = url;
        vidEl.classList.remove('hidden');
        
        // --- PAKSA SUARA NYALA OTOMATIS ---
        vidEl.muted = false; 
        
        // Mainkan video. Dilengkapi penangkap error (catch) jika seandainya
        // browser HP (misal Safari iPhone mode ketat) memblokir autoplay bersuara.
        vidEl.play().catch((err) => {
            console.log("Autoplay bersuara ditolak browser, fallback ke mode bisu.");
            vidEl.muted = true;
            vidEl.play();
        });
    } else {
        vidEl.classList.add('hidden');
        vidEl.pause();
        imgEl.src = url;
        imgEl.classList.remove('hidden');
    }

    titleEl.innerText = context === 'chat' ? 'Kirim ke Obrolan' : 'Status Baru';
    
    // Sembunyikan widget chat (bila sedang terbuka) agar tidak tumpang tindih
    const floatingWidget = document.getElementById('floating-widget');
    if (floatingWidget) floatingWidget.style.opacity = '0'; 

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Efek Slide-Up Muluss
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'translate-y-full');
    }, 10);
}

function tutupPreviewMedia(dariTombolBack = false) {
    const modal = document.getElementById('modal-preview-media');
    modal.classList.add('opacity-0', 'translate-y-full');
    
    // Kembalikan widget chat jika kita sedang berada di inbox/room
    if(window.location.hash.startsWith('#inbox') || window.location.hash.startsWith('#chatroom')) {
        const floatingWidget = document.getElementById('floating-widget');
        // Kosongkan style-nya agar sistem Class Tailwind bisa berfungsi lagi buat nutup laci
        if (floatingWidget) floatingWidget.style.opacity = ''; 
    }


    if (!dariTombolBack && window.location.hash === '#mediapreview') history.back();

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        const vidEl = document.getElementById('preview-media-vid');
        const imgEl = document.getElementById('preview-media-img');
        
        // BONGKAR MEMORI: Hapus Object URL
        if (vidEl.src.startsWith('blob:')) URL.revokeObjectURL(vidEl.src);
        if (imgEl.src.startsWith('blob:')) URL.revokeObjectURL(imgEl.src);

        vidEl.pause();
        vidEl.src = '';
        imgEl.src = '';
        mediaPreviewFile = null;
    }, 300);
}

// ==========================================
// SULAP WHATSAPP: KIRIM STORY & CHAT DI LATAR BELAKANG
// ==========================================
async function prosesKirimMedia() {
    if (!mediaPreviewFile) return;

    // AMANKAN DATA SEBELUM LAYAR DITUTUP
    const file = mediaPreviewFile;
    const context = mediaPreviewContext;
    const caption = document.getElementById('preview-media-caption').value.trim();
    const btnSend = document.getElementById('btn-send-media');
    
    // Amankan data balasan kalau ini pesan Chat (Bukan Story)
    const isGroup = !!activeGroupId;
    const targetId = isGroup ? activeGroupId : activeChatUserId;
    const currentReplyId = replyingToMsgId;
    const currentReplyName = replyingToMsgName;
    const currentReplyText = replyingToMsgText;
    
    btnSend.disabled = true;

    // 🔥 1. TRIK SULAP: TUTUP LAYAR PREVIEW SEKARANG JUGA!
    cancelChatReply();
    tutupPreviewMedia();
    showToast("Mengirim media...", "info");

    try {
        const namaFolder = context === 'chat' ? `${currentUser.id}/chat_media` : `${currentUser.id}/story_media`;
        const pathLengkap = `${namaFolder}/media_${Date.now()}`;

        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`);
        const dataUrl = await resUrl.json();
        
        // Proses berat upload S3 berjalan di background
        await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });

        const fileUrl = dataUrl.finalVideoUrl;

        if (context === 'chat') {
            // ======== EFEK KIRIM CHAT ========
            let msgText = file.type.startsWith('video/') ? `[VIDEO]${fileUrl}` : `[IMG]${fileUrl}`;
            if (caption) msgText += `||CAP||${caption}`;

            if (currentReplyId) {
                const safeName = currentReplyName.replace(/\|\|/g, "").replace(/\]/g, "");
                const safeText = currentReplyText.replace(/\|\|/g, "").replace(/\]/g, "");
                msgText = `[REPLY:${currentReplyId}||${safeName}||${safeText}]\n${msgText}`;
            }

            // DB Insert (Realtime Supabase akan memunculkan balon chatnya otomatis)
            const insertData = { sender_id: currentUser.id, message: msgText };
            if (isGroup) insertData.group_id = targetId; else insertData.receiver_id = targetId;
            await supabaseClient.from('messages').insert(insertData);

        } else if (context === 'story') {
            // ======== EFEK KIRIM STORY ========
            const { error } = await supabaseClient.from('stories').insert({
                user_id: currentUser.id,
                media_url: fileUrl,
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                caption: caption
            });
            if (error) throw error;
            
            showToast("Status berhasil diperbarui!", "success");
            tambahExp(20); 
            
            // Perbarui cincin status warna-warni di layar chat secara diam-diam
            if (!document.getElementById('floating-widget').classList.contains('opacity-0')) {
                loadStories(); 
            }
        }

    } catch (err) {
        showToast("Gagal mengirim file: " + err.message, "error");
    } finally {
        btnSend.disabled = false;
    }
}

// ==========================================
// FITUR BALAS & LIKE STORY (WHATSAPP STYLE)
// ==========================================

// Fungsi Jeda Story Saat Buka Laci Stats / Mengetik Balasan
function pauseStoryForReply() {
    // 1. Matikan fungsi klik Kiri/Kanan agar tidak tembus
    const navOverlay = document.getElementById('story-nav-overlay');
    if (navOverlay) navOverlay.style.pointerEvents = 'none';

    // 2. Bekukan Garis Progress Bar persis di posisinya saat ini
    const activeBar = document.getElementById(`story-progress-${currentActiveStories.currentIndex}`);
    if (activeBar) {
        // Ambil lebar piksel saat ini secara real-time
        const computedWidth = window.getComputedStyle(activeBar).width;
        activeBar.style.transition = 'none'; // Matikan mesin animasinya
        activeBar.style.width = computedWidth; // Kunci garisnya di posisi tersebut
    }

    // 3. Jeda Video / Foto
    const vidEl = document.getElementById('viewer-story-vid');
    if (vidEl && !vidEl.classList.contains('hidden')) {
        vidEl.pause();
    } else {
        clearTimeout(currentStoryTimer);
    }
}

// Fungsi Lanjutkan Story Setelah Laci Ditutup
function resumeStoryAfterReply() {
    // 1. Nyalakan kembali fungsi klik Kiri/Kanan
    const navOverlay = document.getElementById('story-nav-overlay');
    if (navOverlay) navOverlay.style.pointerEvents = 'auto';

    const activeBar = document.getElementById(`story-progress-${currentActiveStories.currentIndex}`);
    const vidEl = document.getElementById('viewer-story-vid');

    // 2. Lanjutkan Media & Jalankan Kembali Progress Bar
    if (vidEl && !vidEl.classList.contains('hidden')) {
        vidEl.play();
        // Hitung sisa durasi video, lalu jalankan animasi garisnya lagi
        if (activeBar) {
            const sisaWaktu = vidEl.duration - vidEl.currentTime;
            activeBar.style.transition = `width ${sisaWaktu}s linear`;
            activeBar.style.width = '100%';
        }
    } else {
        // Jika foto, kita beri sisa waktu 3 detik dari titik dia berhenti
        if (activeBar) {
            activeBar.style.transition = `width 3s linear`;
            activeBar.style.width = '100%';
        }
        currentStoryTimer = setTimeout(() => { nextStory(); }, 3000);
    }
}

// Fitur Tekan Enter Untuk Kirim
function handleStoryReplyEnter(e) {
if (e.key === 'Enter') {
e.preventDefault();
sendStoryReply();
}
}

// Fungsi Mengirim Balasan ke Chat
async function sendStoryReply() {
if (!currentUser) return showToast("Silakan login untuk membalas!", "error");

const input = document.getElementById('story-reply-input');
const message = input.value.trim();
if (!message) return;

const story = currentActiveStories[currentActiveStories.currentIndex];
const targetId = story.user_id;

// Menghindari error balas diri sendiri
if (targetId === currentUser.id) return;

input.value = '';
showToast("Mengirim balasan...", "info");

try {
// Ekstrak info story (apakah dia membalas gambar atau video)
const storyTipe = story.media_type === 'video' ? 'Video' : 'Foto';
let storyCaption = story.caption || "Pembaruan Status";
// Potong caption jika terlalu panjang untuk preview
if (storyCaption.length > 30) storyCaption = storyCaption.substring(0, 30) + '...';

// Gunakan tag khusus [STORY_REPLY] agar sistem merendernya sebagai kotak kutipan
const finalMessage = `[STORY_REPLY:${storyTipe}||${storyCaption}]\n${message}`;
const { error } = await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
receiver_id: targetId,
message: finalMessage
});

if (error) throw error;

showToast("Balasan terkirim!", "success");
input.blur(); // Tutup keyboard hp
resumeStoryAfterReply(); // Lanjutkan story

} catch (e) {
showToast("Gagal mengirim balasan.", "error");
}
}

// Fungsi Like Story (Animasi Hati & Simpan ke DB)
async function likeStoryAktif(btn) {
if (!currentUser) return showToast("Silakan login untuk menyukai!", "error");

const icon = btn.querySelector('i');
const story = currentActiveStories[currentActiveStories.currentIndex];

// Matikan tombol sementara agar tidak dispam klik
btn.style.pointerEvents = 'none';

try {
if (icon.classList.contains('far')) {
// === PROSES LIKE ===
icon.classList.replace('far', 'fas');
icon.classList.add('text-brand-accent', 'animate-ping');

setTimeout(() => icon.classList.remove('animate-ping'), 500);

// Tembak data ke tabel story_likes
const { error } = await supabaseClient.from('story_likes').insert({
story_id: story.id,
user_id: currentUser.id
});

if (error) {
// Jika error karena sudah pernah like (duplikat), abaikan saja
if (error.code !== '23505') throw error;
}

// --- 🔥 PERBAIKAN: SIMPAN KE MEMORI LOKAL HP ---
// Agar saat story ini diputar ulang, ikon love-nya tetap merah
localStorage.setItem('story_liked_' + story.id, 'true');

const nama = document.getElementById('viewer-story-name').innerText;
showToast(`Anda menyukai status ${nama}`, "success");

} else {
// === PROSES UNLIKE (BATAL LIKE) ===
icon.classList.replace('fas', 'far');
icon.classList.remove('text-brand-accent');

// Hapus data dari tabel story_likes
const { error } = await supabaseClient.from('story_likes')
.delete()
.eq('story_id', story.id)
.eq('user_id', currentUser.id);

if (error) throw error;

// --- 🔥 PERBAIKAN: HAPUS DARI MEMORI LOKAL HP ---
// Agar ikon kembali menjadi kosong saat di-unlike
localStorage.removeItem('story_liked_' + story.id);
}
} catch (e) {
console.error("Gagal memproses like:", e);
showToast("Terjadi kesalahan saat menyukai.", "error");

// Kembalikan ikon jika gagal (Rollback UI)
if (icon.classList.contains('fas')) {
icon.classList.replace('fas', 'far');
icon.classList.remove('text-brand-accent');
} else {
icon.classList.replace('far', 'fas');
icon.classList.add('text-brand-accent');
}
} finally {
// Nyalakan kembali tombol
btn.style.pointerEvents = 'auto';
}
}


// ==========================================
// OPTIMASI V6 (ANTI-STUTTER & MEMORY LEAK) - DIPERBAIKI
// ==========================================
function setupVideoObserver() {
    if (typeof obs !== 'undefined' && obs) obs.disconnect();

    if (!document.getElementById('gpu-hack')) {
        const style = document.createElement('style');
        style.id = 'gpu-hack';
        // Hapus content-visibility: auto karena sering bug di browser mobile saat scroll
        style.innerHTML = `
        .snap-start { transform: translateZ(0); will-change: transform, opacity; }
        video { will-change: contents; transform: translateZ(0); }
        `;
        document.head.appendChild(style);
    }

    obs = new IntersectionObserver(es => {
        const isFloatingOpen = !document.getElementById('floating-video-player').classList.contains('hidden');

        es.forEach(e => {
            const video = e.target;

            if (e.isIntersecting && !isFloatingOpen) {
                // 1. Muncul di layar -> Mainkan
                video.muted = (typeof isGlobalMuted !== 'undefined') ? isGlobalMuted : true;
                
                const wrap = video.closest('.video-inner-wrap');
                if (wrap) {
                    if (!isGlobalMuted) wrap.classList.add('floating-focus');
                    else wrap.classList.remove('floating-focus');
                }

                // Gunakan promise catch yang aman
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        if (err.name === 'NotAllowedError') {
                            video.muted = true;
                            isGlobalMuted = true; 
                            video.play().catch(e => {}); 
                        }
                    });
                }
                video.classList.remove('opacity-0');

            } else {
                // 2. Keluar dari layar -> CUKUP PAUSE SAJA (Jangan hapus src-nya)
                video.pause();
                video.currentTime = 0; // Kembalikan ke awal agar rapi jika di-scroll balik
            }
        });
    }, { 
        threshold: 0.6, // Ubah ke 0.6 agar video tidak berebut nyala saat posisi scroll nanggung
        rootMargin: "0px" 
    });

    const videos = document.querySelectorAll('.video-player, .float-video-player');
    videos.forEach(v => obs.observe(v));
}



// ==========================================
// FITUR GRUP CHAT (TAHAP 3)
// ==========================================

// 1. Buka / Tutup Modal Buat Grup
function openCreateGroupModal() {
    history.pushState({ popup: 'create_group' }, null, '#creategroup'); // <-- JEJAK URL BARU
    document.getElementById('modal-create-group').classList.remove('hidden');
    document.getElementById('modal-create-group').classList.add('flex');
}

function closeCreateGroupModal(dariTombolBack = false) {
    document.getElementById('modal-create-group').classList.add('hidden');
    document.getElementById('modal-create-group').classList.remove('flex');

    // <-- SINKRONISASI TOMBOL BACK HP
    if (!dariTombolBack && window.location.hash === '#creategroup') {
        history.back();
    }
}


// 2. Preview Foto Grup Saat Dipilih
function previewGroupAvatar(input, imgId) {
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { document.getElementById(imgId).src = e.target.result; }
reader.readAsDataURL(input.files[0]);
}
}

// 3. Proses Eksekusi Buat Grup ke Database (DIPERBAIKI)
async function prosesCreateGroup() {
if (!currentUser) return showToast("Silakan login dulu!", "error");

const nameInput = document.getElementById('create-group-name').value.trim();
const descInput = document.getElementById('create-group-desc').value.trim();
const fileInput = document.getElementById('create-group-avatar'); // Ambil elemen file foto
const btn = document.getElementById('btn-submit-group');

if (!nameInput) return showToast("Nama grup wajib diisi!", "error");

btn.disabled = true;
const originalText = btn.innerHTML;
btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Membuat...';

try {
// Default avatar (jika user tidak memilih foto)
let finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput)}&background=1A1133&color=fff`;

// LOGIKA BARU: Jika user memilih foto, upload fotonya dulu!
if (fileInput.files && fileInput.files[0]) {
const file = fileInput.files[0];
showToast("Mengunggah foto grup...", "info");

// Proses upload ke storage menggunakan API-mu
const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('group_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`);
const dataUrl = await resUrl.json();

await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: file,
headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' }
});

// Ganti URL default dengan URL foto yang berhasil di-upload
finalAvatarUrl = dataUrl.finalVideoUrl;
}

// Masukkan data grup ke tabel 'groups' (sekarang pakai finalAvatarUrl)
const { data: groupData, error: groupErr } = await supabaseClient
.from('groups')
.insert({ name: nameInput, description: descInput, avatar_url: finalAvatarUrl, created_by: currentUser.id })
.select().single();

if (groupErr) throw groupErr;

// Masukkan pembuat grup otomatis sebagai 'admin' di 'group_members'
const { error: memberErr } = await supabaseClient
.from('group_members')
.insert({ group_id: groupData.id, user_id: currentUser.id, role: 'admin' });

if (memberErr) throw memberErr;

showToast("Grup berhasil dibuat!", "success");
closeCreateGroupModal();

// Reset form
document.getElementById('create-group-name').value = '';
document.getElementById('create-group-desc').value = '';
fileInput.value = ''; // Reset input file foto
document.getElementById('create-group-preview').src = 'https://ui-avatars.com/api/?name=Grup&background=1A1133&color=fff';

// Reload daftar chat agar grup baru muncul beserta fotonya
loadChatList();

} catch (err) {
showToast("Gagal buat grup: " + err.message, "error");
} finally {
btn.disabled = false;
btn.innerHTML = originalText;
}
}

// 4. Tutup Modal Info Grup (DIPERBAIKI)
function closeGroupInfoModal(dariTombolBack = false) {
    document.getElementById('modal-group-info').classList.add('hidden');
    document.getElementById('modal-group-info').classList.remove('flex');
    
    // Cegah HP menarik history mundur 2 kali jika asalnya dari tombol Back HP
    if (!dariTombolBack && window.location.hash === '#groupinfo') {
        history.back();
    }
}

// 5. Muat Data Info Grup & Anggota (DIPERBAIKI)
async function loadGroupInfo(groupId) {
    // 🔥 SUNTIKAN SAKTI: Beri jejak ke browser agar tombol Back HP aktif
    history.pushState({ popup: 'group_info' }, null, '#groupinfo');

    document.getElementById('modal-group-info').classList.remove('hidden');
    document.getElementById('modal-group-info').classList.add('flex');

    // Ambil data detail grup
    const { data: group } = await supabaseClient.from('groups').select('*').eq('id', groupId).single();
    if(!group) return;

document.getElementById('info-group-avatar').src = group.avatar_url;
document.getElementById('info-group-name').innerText = group.name;
document.getElementById('info-group-desc').innerText = group.description || "Tidak ada deskripsi";

// Ambil data semua member di grup ini
const { data: members } = await supabaseClient.from('group_members').select('role, user_id').eq('group_id', groupId);

// Cek jabatan (role) kita di grup ini
const myData = members.find(m => m.user_id === currentUser.id);
activeGroupRole = myData ? myData.role : 'member';

// Tampilkan fitur Edit & Undang HANYA jika dia Admin
if (activeGroupRole === 'admin') {
document.getElementById('btn-edit-group-info').classList.remove('hidden');
document.getElementById('section-invite-group').classList.remove('hidden');
document.getElementById('btn-edit-group-avatar').classList.replace('hidden', 'flex');
} else {
document.getElementById('btn-edit-group-info').classList.add('hidden');
document.getElementById('section-invite-group').classList.add('hidden');
document.getElementById('btn-edit-group-avatar').classList.replace('flex', 'hidden');
}

renderGroupMembers(members);
}

// 6. Render Daftar Member di Modal (Updated: Admin Management)
async function renderGroupMembers(membersData) {
const list = document.getElementById('group-member-list');
document.getElementById('info-group-count').innerText = membersData.length;
list.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-brand-info"></i></div>';

const userIds = membersData.map(m => m.user_id);
const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', userIds);

let html = '';
profiles.forEach(p => {
const m = membersData.find(x => x.user_id === p.id);
const isAdmin = m.role === 'admin';
const badge = isAdmin ? '<span class="bg-brand-accent/20 text-brand-accent text-[8px] px-2 py-0.5 rounded border border-brand-accent/30 font-bold ml-2">ADMIN</span>' : '';
const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;

// --- LOGIKA TOMBOL MANAJEMEN ---
let adminButtons = '';

// Tombol HANYA muncul jika:
// 1. Saya adalah Admin grup (activeGroupRole === 'admin')
// 2. Baris yang sedang di-render BUKAN diri saya sendiri
if (activeGroupRole === 'admin' && p.id !== currentUser.id) {
adminButtons = `
<div class="flex gap-2 ml-2">
<!-- Tombol Jadikan/Batalkan Admin -->
<button onclick="toggleAdminStatus('${p.id}', '${m.role}', '${escapeHTML(p.nickname).replace(/&#39;/g, "\\'")}')"
class="w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isAdmin ? 'bg-orange-500/20 text-orange-500' : 'bg-brand-info/20 text-brand-info'}"
title="${isAdmin ? 'Turunkan dari Admin' : 'Jadikan Admin'}">
<i class="fas ${isAdmin ? 'fa-user-minus' : 'fa-user-shield'} text-xs"></i>
</button>

<!-- Tombol Kick Member -->
<button onclick="kickMember('${p.id}', '${escapeHTML(p.nickname).replace(/&#39;/g, "\\'")}')"
class="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
title="Keluarkan Anggota">
<i class="fas fa-user-times text-xs"></i>
</button>
</div>`;
}

html += `
<div class="flex items-center justify-between p-2 bg-black/30 rounded-xl border border-white/5 mb-2">
<!-- Bagian bawah ini yang ditambahin onclick dan cursor-pointer -->
<div class="flex items-center flex-1 min-w-0 cursor-pointer hover:bg-white/10 p-1.5 rounded-lg transition-colors" onclick="closeGroupInfoModal(); viewUserProfile('${p.id}');">
<img src="${ava}" class="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0">
<div class="ml-3 truncate">
<div class="flex items-center">
<h4 class="font-bold text-white text-xs truncate">${p.nickname}</h4>
${badge}
</div>
</div>
</div>
${adminButtons}
</div>`;
});
list.innerHTML = html;
}


// 7. Buka Tutup Form Edit Info Grup
function toggleEditGroupInfo() {
const form = document.getElementById('form-edit-group-info');
if (form.classList.contains('hidden')) {
form.classList.remove('hidden');
document.getElementById('input-edit-group-name').value = document.getElementById('info-group-name').innerText;
document.getElementById('input-edit-group-desc').value = document.getElementById('info-group-desc').innerText;
} else {
form.classList.add('hidden');
}
}

// 8. Simpan Editan Info Grup (Hanya Admin)
async function saveGroupInfo() {
    const name = document.getElementById('input-edit-group-name').value.trim();
    const desc = document.getElementById('input-edit-group-desc').value.trim();
    if(!name) return showToast("Nama grup tidak boleh kosong!", "error");

    const btn = document.getElementById('btn-save-group-info');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true; // Kunci tombol biar nggak diklik dobel

    try {
        const { error } = await supabaseClient.from('groups').update({ name: name, description: desc }).eq('id', activeGroupId);
        if(error) throw error;

        showToast("Info grup diperbarui!", "success");
        toggleEditGroupInfo();
        loadGroupInfo(activeGroupId); // Refresh UI
    } catch (err) {
        showToast("Gagal update: " + err.message, "error");
    } finally {
        btn.innerHTML = 'Simpan Perubahan';
        btn.disabled = false; // Buka kunci tombol lagi
    }
}

// 9. Undang Teman Berdasarkan Nickname (Hanya Admin)
async function inviteToGroup() {
const nick = document.getElementById('invite-user-nickname').value.trim();
if(!nick) return;

const btn = document.getElementById('btn-invite-user');
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

try {
const { data: userProfile } = await supabaseClient.from('profiles').select('id').ilike('nickname', nick).single();
if(!userProfile) throw new Error("User tidak ditemukan!");

const { error } = await supabaseClient.from('group_members').insert({
group_id: activeGroupId,
user_id: userProfile.id,
role: 'member'
});

if(error) {
if(error.code === '23505') throw new Error("User ini sudah ada di grup!");
throw error;
}

// 🔥 TAMBAHAN NOTIFIKASI SISTEM
await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
group_id: activeGroupId,
message: `[SISTEM] ${nick} telah ditambahkan ke dalam grup oleh Admin.`
});

showToast(nick + " berhasil ditambahkan!", "success");
document.getElementById('invite-user-nickname').value = '';
loadGroupInfo(activeGroupId); // Refresh anggota

} catch (err) {
showToast(err.message, "error");
} finally {
btn.innerHTML = 'Undang';
}
}


// 10. Keluar dari Grup
async function keluarDariGrup() {
const yakin = confirm("Yakin ingin keluar dari grup ini?");
if(!yakin) return;

await supabaseClient.from('group_members').delete().eq('group_id', activeGroupId).eq('user_id', currentUser.id);
showToast("Berhasil keluar dari grup", "success");
closeGroupInfoModal();
closeChatRoom();
}
// ==========================================
// LOGIKA VIDEO PROGRESS BAR (SUPER SMOOTH FIX)
// ==========================================
function formatTime(seconds) {
if (isNaN(seconds)) return "00:00";
const m = Math.floor(seconds / 60).toString().padStart(2, '0');
const s = Math.floor(seconds % 60).toString().padStart(2, '0');
return `${m}:${s}`;
}

function updateVideoProgress(video) {
    if (video.isDragging) return;

    if (!video.progressFill) {
        const container = video.closest('.snap-start');
        if (container) video.progressFill = container.querySelector('.progress-fill');
    }

    if (video.progressFill && video.duration) {
        requestAnimationFrame(() => {
            const percent = (video.currentTime / video.duration) * 100;
            // Gunakan toFixed(1) untuk menghindari update koma yang terlalu panjang dan berat dirender
            video.progressFill.style.width = `${percent.toFixed(1)}%`;
        });
    }
}


// 11. FUNGSI UBAH STATUS ADMIN (Hanya Admin)
async function toggleAdminStatus(userId, currentRole, nickname) {
// GEMBOK KEAMANAN: Cegah bypass eksekusi ilegal via console / Eruda
if (activeGroupRole !== 'admin') return showToast("Hanya admin yang diizinkan melakukan ini!", "error");

const nextRole = (currentRole === 'admin') ? 'member' : 'admin';
const confirmMsg = (currentRole === 'admin')
? `Yakin ingin mencopot jabatan Admin dari ${nickname}?`
: `Jadikan ${nickname} sebagai Admin grup?`;

if (!await customConfirm(confirmMsg)) return;

try {
showToast("Memproses status...", "info"); // Notif biar user tahu sistem sedang bekerja

const { error } = await supabaseClient
.from('group_members')
.update({ role: nextRole })
.eq('group_id', activeGroupId)
.eq('user_id', userId);

if (error) throw error;

showToast(`Status ${nickname} berhasil diperbarui!`, "success");

// 🔥 KUNCI PERBAIKAN: Beri jeda 300 milidetik agar database
// punya waktu memproses sebelum layar direfresh otomatis.
setTimeout(() => {
loadGroupInfo(activeGroupId);
}, 300);

} catch (err) {
showToast("Gagal memperbarui status: " + err.message, "error");
}
}

// 12. FUNGSI KICK ANGGOTA (Hanya Admin)
async function kickMember(userId, nickname) {
// GEMBOK KEAMANAN: Cegah bypass eksekusi ilegal via console / Eruda
if (activeGroupRole !== 'admin') return showToast("Hanya admin yang diizinkan mengeluarkan anggota!", "error");

if (!await customConfirm(`Yakin ingin mengeluarkan ${nickname} dari grup ini?`)) return;

try {
showToast("Sedang mengeluarkan...", "info");

// 1. Hapus dari tabel group_members
const { error } = await supabaseClient
.from('group_members')
.delete()
.eq('group_id', activeGroupId)
.eq('user_id', userId);

if (error) throw error;

// 2. Kirim pesan sistem bahwa user telah dikeluarkan
await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
group_id: activeGroupId,
message: `[SISTEM] ${nickname} telah dikeluarkan dari grup oleh Admin.`
});

showToast(nickname + " telah dikeluarkan", "success");

// 🔥 KUNCI PERBAIKAN: Beri jeda 300 milidetik
setTimeout(() => {
loadGroupInfo(activeGroupId);
}, 300);

} catch (err) {
showToast("Gagal mengeluarkan: " + err.message, "error");
}
}





// ==========================================
// LOGIKA DRAG / GESER PROGRESS BAR
// ==========================================
function startSeek(e, containerElement) {
const video = containerElement.closest('.snap-start').querySelector('video');
if (!video) return;
video.isDragging = true;

const timeIndicator = containerElement.closest('.snap-start').querySelector('.time-indicator');
if (timeIndicator) timeIndicator.classList.replace('opacity-0', 'opacity-100');

updateSeek(e, containerElement, video);
}

function doSeek(e, containerElement) {
const video = containerElement.closest('.snap-start').querySelector('video');
if (!video || !video.isDragging) return;
updateSeek(e, containerElement, video);
}

function endSeek(e, containerElement) {
const video = containerElement.closest('.snap-start').querySelector('video');
if (!video) return;

if (video.isDragging) {
updateSeek(e, containerElement, video);
video.isDragging = false;
}

const timeIndicator = containerElement.closest('.snap-start').querySelector('.time-indicator');
if (timeIndicator) timeIndicator.classList.replace('opacity-100', 'opacity-0');
}

function updateSeek(e, containerElement, video) {
const rect = containerElement.getBoundingClientRect();
let x = e.clientX;
if (x === undefined && e.touches && e.touches.length > 0) x = e.touches[0].clientX;
if (x === undefined) return;

let pos = (x - rect.left) / rect.width;
pos = Math.max(0, Math.min(1, pos));

const fill = containerElement.querySelector('.progress-fill');
if (fill) fill.style.width = `${pos * 100}%`;

if (video.duration) {
video.currentTime = pos * video.duration;

const timeIndicator = containerElement.closest('.snap-start').querySelector('.time-indicator');
if (timeIndicator) {
timeIndicator.querySelector('.time-current').innerText = formatTime(video.currentTime);
timeIndicator.querySelector('.time-total').innerText = formatTime(video.duration);
}
}
}

// ==========================================
// FITUR HAPUS PESAN (Hapus Untukku & Semua)
// ==========================================
function showMsgOptions(msgId, senderId) {
selectedMessageId = msgId;
const modal = document.getElementById('modal-msg-option');
const btnDelAll = document.getElementById('btn-del-msg-all');

modal.classList.remove('hidden');
modal.classList.add('flex');

// Jika pesan ini bukan milik kita, sembunyikan tombol "Hapus untuk Semua"
if (senderId !== currentUser.id) {
btnDelAll.style.display = 'none';
} else {
btnDelAll.style.display = 'block';
}
}

function closeMsgOptions() {
const modal = document.getElementById('modal-msg-option');
modal.classList.add('hidden');
modal.classList.remove('flex');
}

function deleteMsgForMe() {
if (!selectedMessageId) return;
// Simpan ID ke memori lokal HP agar disembunyikan
let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');
if (!deletedForMe.includes(selectedMessageId)) {
deletedForMe.push(selectedMessageId);
localStorage.setItem('deleted_msgs', JSON.stringify(deletedForMe));
}
closeMsgOptions();
loadRoomMessages(); // Muat ulang layar chat
showToast("Pesan dihapus untuk Anda", "success");
}

async function deleteMsgForAll() {
if (!selectedMessageId) return;
try {
// Ubah teks pesan di Supabase menjadi ditarik
const { error } = await supabaseClient.from('messages').update({ message: '[DELETED]' }).eq('id', selectedMessageId);
if (error) throw error;

closeMsgOptions();
loadRoomMessages();
showToast("Pesan berhasil ditarik", "success");
} catch (err) {
showToast("Gagal menarik pesan", "error");
}
}

// ==========================================
// FITUR PESAN SUARA (VOICE NOTE)
// ==========================================
let mediaRecorder;
let audioChunks = [];

async function startRecordingVoice() {
try {
// Meminta izin mikrofon ke pengguna
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
mediaRecorder = new MediaRecorder(stream);
audioChunks = [];

mediaRecorder.ondataavailable = e => {
if (e.data.size > 0) audioChunks.push(e.data);
};

mediaRecorder.onstop = async () => {
// 👉 PINDAHAN DARI BAWAH: Matikan mikrofon di sini
mediaRecorder.stream.getTracks().forEach(track => track.stop());

const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
await uploadAndSendVoice(audioBlob);
};

mediaRecorder.start();

// Ubah UI jadi mode merekam (Tombol Stop berdenyut merah)
const input = document.getElementById('chat-room-input');
input.placeholder = "Merekam suara... (Klik stop)";
input.disabled = true;

const btnSend = document.getElementById('btn-send-room');
btnSend.innerHTML = '<i class="fas fa-stop text-white"></i>';
btnSend.classList.add('bg-red-500', 'animate-pulse');
btnSend.classList.remove('bg-brand-accent');
btnSend.onclick = stopRecordingVoice;

} catch (err) {
// 👇 KODE BARU: Memunculkan error ASLI dari sistem 👇
showToast("Error Mic: " + err.name + " - " + err.message, "error");
console.error("Detail Error Mic:", err);
}
}

function stopRecordingVoice() {
if (mediaRecorder && mediaRecorder.state !== 'inactive') {
mediaRecorder.stop();
}

// Kembalikan UI ke awal
const input = document.getElementById('chat-room-input');
input.placeholder = "Ketik pesan...";
input.disabled = false;

const btnSend = document.getElementById('btn-send-room');
btnSend.innerHTML = '<i class="fas fa-microphone"></i>';
btnSend.classList.remove('bg-red-500', 'animate-pulse');
btnSend.classList.add('bg-brand-accent');
btnSend.onclick = startRecordingVoice;
}






async function uploadAndSendVoice(blob) {
if (!activeChatUserId && !activeGroupId) return;
const isGroup = !!activeGroupId;
const targetId = isGroup ? activeGroupId : activeChatUserId;

// PENJAGA PINTU GRUP
if (isGroup) {
const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', targetId).eq('user_id', currentUser.id).single();
if (!checkMember) {
await customAlert("Anda tidak dapat mengirim Voice Note karena telah dikeluarkan dari grup ini.");
closeChatRoom(); return;
}
}

// Tangkap data balasan (jika sedang me-reply pesan)
const currentReplyId = replyingToMsgId;
const currentReplyName = replyingToMsgName;
const currentReplyText = replyingToMsgText;
cancelChatReply(); // Tutup UI balasan seketika

const tempId = 'temp-vn-' + Date.now();
const tempMsg = { id: tempId, sender_id: currentUser.id, message: "🎙️ Mengirim pesan suara...", created_at: new Date().toISOString() };
appendMessageBubble(tempMsg);
scrollToBottomChat();

try {
const reader = new FileReader();
reader.readAsDataURL(blob);
reader.onloadend = async () => {
try {
// Samakan dengan sistem upload gambar & video lu yang udah terbukti anti-gagal
const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('voice_'+Date.now()+'.webm')}&filetype=${encodeURIComponent('audio/webm')}`);
const dataUrl = await resUrl.json();

// Upload file fisik suara ke Biznet Storage
await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: blob,
headers: { 'Content-Type': 'audio/webm', 'x-amz-acl': 'public-read' }
});

let msgText = `[AUDIO]${dataUrl.finalVideoUrl}`;

// SISIPKAN KODE BALASAN JIKA ADA
if (currentReplyId) {
const safeName = currentReplyName.replace(/\|\|/g, "").replace(/\]/g, "");
const safeText = currentReplyText.replace(/\|\|/g, "").replace(/\]/g, "");
msgText = `[REPLY:${currentReplyId}||${safeName}||${safeText}]\n${msgText}`;
}

const insertData = { sender_id: currentUser.id, message: msgText };
if (isGroup) insertData.group_id = targetId; else insertData.receiver_id = targetId;

const { error: dbErr } = await supabaseClient.from('messages').insert(insertData);
if (dbErr) throw new Error("Gagal simpan DB");

const oldBubble = document.getElementById(`msg-chat-${tempId}`);
if (oldBubble) oldBubble.remove();

} catch(err) {
const oldBubble = document.getElementById(`msg-chat-${tempId}`);
if (oldBubble) oldBubble.remove();
showToast("Error VN: " + err.message, "error");
}
};
} catch (err) { showToast("Error Sistem: " + err.message, "error"); }
}

// ==========================================
// FITUR TERAKHIR DILIHAT (LAST SEEN SINKRONISASI)
// ==========================================
let timerLastSeen = 0; // Memori penahan spam

async function updateMyLastSeen() {
    if (!currentUser) return;
    
    // [BARU] Mencegah spam update ke database dalam waktu kurang dari 2 menit
    const now = Date.now();
    if (now - timerLastSeen < 120000) return; 
    timerLastSeen = now;

    try {
        await supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    } catch (e) { console.log("Gagal update last seen"); }
}

// Jalankan update saat buka web dan tiap 1 menit sekali kalau aplikasinya sedang dibuka
setInterval(updateMyLastSeen, 60000);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') updateMyLastSeen();
});

// ==========================================
// FITUR QUOTE REPLY (BALAS PESAN WA STYLE)
// ==========================================
let replyingToMsgId = null;
let replyingToMsgText = "";
let replyingToMsgName = "";

// Fungsi saat tombol "Balas" di menu opsi di-klik (VERSI DISEMPURNAKAN UNTUK FOTO & AUDIO)
document.getElementById('btn-reply-msg').addEventListener('click', () => {
if (!selectedMessageId) return;

// Nama default diambil dari Header Chat (untuk chat pribadi)
let name = document.getElementById('active-chat-name').innerText;

// Cari gelembung chat berdasarkan ID
const msgBubble = document.getElementById(`msg-chat-${selectedMessageId}`);
let text = "Membalas pesan...";

if (msgBubble) {
// FITUR CERDAS: Jika di dalam Grup, ambil nama asli pengirim dari dalam gelembung chatnya
// Menyesuaikan dengan class warna biru "#00F0FF" yang baru
const groupSenderEl = msgBubble.querySelector('.text-\\[\\#00F0FF\\]');
if (groupSenderEl) {
name = groupSenderEl.innerText;
}

// Ekstrak teks/media murni dari gelembung chat (mencari pembungkus kontennya)
const textDiv = msgBubble.querySelector('.text-\\[12px\\]');
if (textDiv) {
if (textDiv.innerHTML.includes('<audio')) {
text = "🎙️ Pesan Suara";
} else if (textDiv.innerHTML.includes('<img')) {
text = "📷 Foto/Gambar";
} else {
// Jika pesan teks biasa, hilangkan kode [REPLY:...] yang ada di dalamnya agar rapi
let cleanText = textDiv.innerText;

// Menghapus elemen cuplikan kotak balasan jika membalas pesan yang sudah merupakan balasan
const innerReplyBox = textDiv.querySelector('div[onclick^="jumpToMessage"]');
if (innerReplyBox) {
cleanText = cleanText.replace(innerReplyBox.innerText, '').trim();
}

text = cleanText.replace(/\n/g, ' ').substring(0, 50);
if (cleanText.length > 50) text += "...";
}
}
}

setChatReply(selectedMessageId, name, text);
closeMsgOptions();
});


function setChatReply(msgId, name, text) {
replyingToMsgId = msgId;
replyingToMsgName = name;
replyingToMsgText = text;

document.getElementById('chat-reply-preview').classList.remove('hidden');
document.getElementById('chat-reply-name').innerText = name;
document.getElementById('chat-reply-text').innerText = text;

document.getElementById('chat-room-input').focus();
}

function cancelChatReply() {
replyingToMsgId = null;
replyingToMsgName = "";
replyingToMsgText = "";
document.getElementById('chat-reply-preview').classList.add('hidden');
}

// FUNGSI UNTUK MELOMPAT LANGSUNG KE PESAN YANG DI-BALAS (WHATSAPP STYLE)
function jumpToMessage(msgId) {
const targetEl = document.getElementById(`msg-chat-${msgId}`);

if (targetEl) {
// Gulirkan layar obrolan secara halus tepat ke tengah-tengah gelembung asli
targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

// Mengambil gelembung pesan yang sebenarnya (menggunakan class .rounded-2xl)
const innerBubble = targetEl.querySelector('.rounded-2xl');

if (innerBubble) {
innerBubble.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

// Beri efek animasi kilatan warna khas website (Pink/Purple)
innerBubble.classList.add(
'ring-[3px]', 'ring-brand-accent',
'scale-[1.04]',
'shadow-[0_0_30px_rgba(255,0,122,0.6),_0_0_45px_rgba(138,43,226,0.4)]'
);

// Hilangkan efek kilatan secara mulus setelah 1.5 detik
setTimeout(() => {
innerBubble.classList.remove(
'ring-[3px]', 'ring-brand-accent',
'scale-[1.04]',
'shadow-[0_0_30px_rgba(255,0,122,0.6),_0_0_45px_rgba(138,43,226,0.4)]'
);
}, 1500);
}
} else {
showToast("Pesan asli tidak ditemukan atau sudah terlalu lama dibersihkan.", "info");
}
}

// ==========================================
// FITUR TYPING INDICATOR & REAL-TIME CHAT
// ==========================================

function setupChatRoomListener() {
    // Bersihkan langganan (subscription) lama jika ada, agar tidak double
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
    }

    // Tentukan target chat (Grup atau Personal)
    const targetId = activeGroupId ? activeGroupId : activeChatUserId;
    if (!targetId) return;

    // Buat nama ruangan khusus. Untuk personal, urutkan ID agar selalu sama terlepas dari siapa yang memulai
    const roomName = activeGroupId
        ? `room_group_${targetId}`
        : `room_personal_${[currentUser.id, targetId].sort().join('_')}`;

    messageSubscription = supabaseClient.channel(roomName)
        // 1. Tangkap sinyal saat lawan bicara mengetik
        .on('broadcast', { event: 'typing' }, payload => {
            // Pastikan sinyal yang ditangkap bukan dari diri kita sendiri
            if (payload.payload.userId !== currentUser.id) {
                showTypingIndicator();
            }
        })
        // 2. TANGKAP PESAN BARU DAN MUNCULKAN TANPA REFRESH
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
            const msg = payload.new;

            // Cek apakah pesan ini milik ruangan yang sedang terbuka
            const isGroup = !!activeGroupId;
            const validRoom = isGroup
                ? msg.group_id === activeGroupId
                : ((msg.sender_id === activeChatUserId && msg.receiver_id === currentUser.id) ||
                (msg.sender_id === currentUser.id && msg.receiver_id === activeChatUserId));

            if (validRoom) {
                // Sembunyikan tulisan "Sedang mengetik..." begitu pesan masuk
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.classList.add('hidden');

                if (msg.sender_id !== currentUser.id) {
                    // --- JIKA PESAN DARI ORANG LAIN ---

                    // [BARU] DETEKSI MENTION (Notif Toast jika di-tag)
                    const myNickname = userProfile?.nickname;
                    if (isGroup && myNickname && msg.message && msg.message.includes(`@${myNickname}`)) {
                        showToast("🔔 Ada yang ngetag kamu!", "success");
                    }

                    // Ambil data nama & foto jika ini di dalam Grup
                    if (isGroup) {
                        const { data: p } = await supabaseClient.from('profiles').select('nickname, avatar_url').eq('id', msg.sender_id).single();
                        msg.profiles = p;
                    }

                    // Suntikkan langsung ke layar bawah secara mulus!
                    appendMessageBubble(msg);
                    scrollToBottomChat();

                    // Langsung tandai Centang Biru (Read) secara otomatis
                    if (!isGroup) {
                        supabaseClient.from('messages').update({ is_read: true }).eq('id', msg.id).then();
                    }
                } else {
                    // --- JIKA PESAN DARI KITA SENDIRI ---
                    // Hapus balon sementara agar tidak dobel
                    const tempBubble = document.querySelector('[id^="msg-chat-temp-"]');
                    if (tempBubble) {
                        tempBubble.remove();
                    }

                    // Pasang pesan asli dari database
                    appendMessageBubble(msg);
                    scrollToBottomChat();
                }
            }
        })
        .subscribe();
}

function showTypingIndicator() {
const indicator = document.getElementById('typing-indicator');
if (indicator) {
indicator.classList.remove('hidden');

// Hilangkan tulisan "Mengetik..." secara otomatis setelah 2 detik
clearTimeout(typingTimer);
typingTimer = setTimeout(() => {
indicator.classList.add('hidden');
}, 2000);
}
}

function switchChatTab(tab) {
// Sembunyikan semua container
document.getElementById('chat-personal-container').classList.add('hidden');
document.getElementById('chat-group-container').classList.add('hidden');
document.getElementById('chat-status-container').classList.add('hidden');

// Reset warna teks & garis bawah tab ke abu-abu (tidak aktif)
document.getElementById('tab-personal').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';
document.getElementById('tab-group').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';
document.getElementById('tab-status').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';

// Aktifkan tab yang dipilih
if (tab === 'personal') {
document.getElementById('chat-personal-container').classList.remove('hidden');
document.getElementById('chat-personal-container').classList.add('block');
document.getElementById('tab-personal').className = 'flex-1 py-3 text-[11px] font-bold text-brand-accent border-b-2 border-brand-accent transition-colors';
} else if (tab === 'group') {
document.getElementById('chat-group-container').classList.remove('hidden');
document.getElementById('chat-group-container').classList.add('block');
document.getElementById('tab-group').className = 'flex-1 py-3 text-[11px] font-bold text-brand-accent border-b-2 border-brand-accent transition-colors';
} else if (tab === 'status') {
document.getElementById('chat-status-container').classList.remove('hidden');
document.getElementById('chat-status-container').classList.add('block');
document.getElementById('tab-status').className = 'flex-1 py-3 text-[11px] font-bold text-brand-accent border-b-2 border-brand-accent transition-colors';
loadStories(); // Langsung muat story saat tab status dibuka
}
}

// ==========================================
// 1. FUNGSI RENDER GELEMBUNG CHAT (BISA KLIK BALASAN & DETEKSI FORWARD)
// ==========================================
function appendMessageBubble(msg) {
    const container = document.getElementById('chat-messages-container');
    const isMe = msg.sender_id === currentUser.id;

    // Format waktu
    const date = new Date(msg.created_at);
    const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');

    let bubbleColor = isMe ? 'bg-gradient-to-br from-brand-accent to-[#d61a7f] text-white rounded-br-none shadow-[0_4px_12px_rgba(255,0,122,0.25)]' : 'bg-white/10 text-white border border-white/10 rounded-bl-none backdrop-blur-sm shadow-sm';
    let align = isMe ? 'justify-end' : 'justify-start';

    let rawMessage = msg.message || '';
    let replyHtml = '';
    let forwardedHtml = '';

    // --- DETEKSI PESAN DITERUSKAN (FORWARDED) ---
    if (rawMessage.startsWith('[FORWARDED]')) {
        rawMessage = rawMessage.replace(/^\[FORWARDED\]\n?/, ''); // Hapus kode rahasia dari teks
        forwardedHtml = `<div class="text-[9px] text-white/70 italic mb-1 font-medium flex items-center gap-1.5"><i class="fas fa-share text-[8px]"></i> Diteruskan</div>`;
    }

    // --- BACA FORMAT BALASAN (QUOTE REPLY) ---
    const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
    const match = rawMessage.match(replyRegex);

    if (match) {
        const replyId = escapeHTML(match[1]);
        const replyName = escapeHTML(match[2]);
        const replyText = escapeHTML(match[3]);
        rawMessage = match[4]; // Sisa pesan setelah dipotong format reply

        // Buat kotak balasan yang bisa diklik
        replyHtml = `
        <div onclick="jumpToMessage('${replyId}')" class="bg-black/30 border-l-[3px] border-brand-info p-2 mb-1.5 rounded-md cursor-pointer hover:bg-black/50 transition-colors active:scale-95">
        <div class="text-[10px] font-bold text-brand-info mb-0.5">${replyName}</div>
        <div class="text-[10px] text-gray-300 truncate max-w-[200px] line-clamp-1">${replyText}</div>
        </div>`;
    }
    
        // --- BACA FORMAT BALASAN STORY (STORY REPLY) ---
    const storyReplyRegex = /^\[STORY_REPLY:(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
    const matchStory = rawMessage.match(storyReplyRegex);

    if (matchStory) {
        const mediaType = escapeHTML(matchStory[1]);
        const storyText = escapeHTML(matchStory[2]);
        rawMessage = matchStory[3]; // Sisa pesan yang diketik pembeli

        // Buat kotak balasan story (warna pink/accent biar beda dikit sama reply biasa)
        replyHtml = `
        <div class="bg-black/30 border-l-[3px] border-brand-accent p-2 mb-1.5 rounded-md cursor-default">
            <div class="text-[10px] font-bold text-brand-accent mb-0.5"><i class="fas fa-history mr-1"></i> Membalas Status ${mediaType}</div>
            <div class="text-[10px] text-gray-300 truncate max-w-[200px] line-clamp-1 italic">"${storyText}"</div>
        </div>`;
    }


    // --- TANGANI TEKS, GAMBAR, ATAU AUDIO ---
    let contentHtml = '';
    if (rawMessage.startsWith('[IMG]')) {
        let urlPart = rawMessage.replace('[IMG]', '');
        let cap = '';
        if (urlPart.includes('||CAP||')) {
            const parts = urlPart.split('||CAP||');
            urlPart = parts[0]; cap = parts[1];
        }
        contentHtml = `<img src="${urlPart}" class="max-w-[200px] rounded-lg cursor-pointer mt-1 shadow-sm" onclick="openLightbox('${urlPart}')">`;
        if (cap) contentHtml += `<div class="mt-1.5 text-white/95 text-[11.5px]">${formatCaption(cap)}</div>`;
    } else if (rawMessage.startsWith('[VIDEO]')) {
        let urlPart = rawMessage.replace('[VIDEO]', '');
        let cap = '';
        if (urlPart.includes('||CAP||')) {
            const parts = urlPart.split('||CAP||');
            urlPart = parts[0]; cap = parts[1];
        }
        contentHtml = `<video src="${urlPart}" class="max-w-[200px] rounded-lg mt-1 shadow-sm" controls playsinline></video>`;
        if (cap) contentHtml += `<div class="mt-1.5 text-white/95 text-[11.5px]">${formatCaption(cap)}</div>`;
    } else if (rawMessage.startsWith('[AUDIO]')) {
        const url = rawMessage.replace('[AUDIO]', '');
        contentHtml = `<audio controls class="w-[200px] mt-1 h-8"><source src="${url}" type="audio/webm"></audio>`;
    } else if (rawMessage.startsWith('[SISTEM]')) {
        
        // Hapus kode [SISTEM] dari awal teks
        let isiSistem = rawMessage.replace(/^\[SISTEM\]\s*/i, '');
        
        // Bikin tanda bintang *teks* jadi tebal/bold
        let teksRapi = escapeHTML(isiSistem).replace(/\*(.*?)\*/g, '<b class="text-white">$1</b>');

        // Sulap Link URL jadi bisa diklik
        let htmlIsiSistem = teksRapi.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline font-bold hover:text-white transition-colors">$1</a>'
        );

        // Encode teks mentah untuk tombol Copy (Anti bug tanda kutip/enter)
        const safeCopySysText = encodeURIComponent(isiSistem).replace(/'/g, "%27");

        // Render HTML Kotak Sistem di dalam Chat Bubble
        contentHtml = `
        <div class="bg-black/40 border border-brand-info/30 rounded-xl p-3 mt-1 mb-1 min-w-[200px] max-w-[240px] text-left shadow-inner flex flex-col gap-1.5 relative cursor-default" onclick="event.stopPropagation()">
            <div class="flex items-center gap-2 border-b border-white/10 pb-2">
                
                <!-- [BARU] LOGO AU2HUB BERDENYUT -->
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-6 h-6 object-contain splash-logo-anim drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] shrink-0">
                
                <div class="flex-1 min-w-0">
                    <div class="text-[8px] text-brand-info font-bold uppercase tracking-wider">AU2HUB SYSTEM</div>
                    <div class="text-[11px] font-bold text-white truncate w-full leading-tight">Pemberitahuan</div>
                </div>
            </div>
            
            <!-- [BARU] AREA TEKS BISA DI-SCROLL & KLIK LINK -->
            <pre class="text-[10px] text-gray-200 font-sans whitespace-pre-wrap break-all max-h-40 overflow-y-auto hide-scroll leading-relaxed mt-1">${htmlIsiSistem}</pre>
            
            <!-- [BARU] TOMBOL SALIN -->
            <button type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${safeCopySysText}')); this.innerHTML='<i class=\\'fas fa-check\\'></i> Tersalin!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy mr-1\\'></i> Salin Pesan', 2000);" class="mt-1 w-full bg-brand-info/10 text-brand-info hover:bg-brand-info hover:text-brand-dark border border-brand-info/30 py-2 rounded-lg text-[10px] font-bold active:scale-95 transition-all shadow-sm">
                <i class="fas fa-copy mr-1"></i> Salin Pesan
            </button>
        </div>`;
        
    } else {
        contentHtml = formatCaption(rawMessage);
    }

    // Gabungkan label "Diteruskan" + kotak balasan + isi pesan utama
    contentHtml = forwardedHtml + replyHtml + contentHtml;

    // --- TANGANI NAMA PENGIRIM (Khusus di Grup) ---
    let senderNameHtml = '';
    if (!isMe && activeGroupId) {
        const vidCountBubble = allVideosData.filter(v => String(v.user_id) === String(msg.sender_id)).length;
        // Ambil exp dari Supabase, hitung levelnya secara otomatis
        const expData = msg.profiles?.exp || 0;
        const senderLevel = hitungStatusLevel(expData).level;
        
        const badgeBubble = getBadgeByLevelAndVideos(senderLevel, vidCountBubble);
        const safeNickname = escapeHTML(msg.profiles?.nickname || 'Anggota');
        senderNameHtml = `<div onclick="const w = document.getElementById('floating-widget'); if(w) w.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95'); viewUserProfile('${msg.sender_id}')" class="text-[10px] text-[#00F0FF] font-bold mb-1 flex items-center gap-0.5 cursor-pointer hover:underline w-max">${safeNickname} <span class="scale-[0.7] origin-left inline-flex">${badgeBubble}</span></div>`;
    }

    const html = `
    <div class="flex ${align} w-full message-anim mb-2" id="msg-chat-${msg.id}">
        <div class="max-w-[80%] flex flex-col relative" ontouchstart="mulaiLongPress('${msg.id}', '${msg.sender_id}')" ontouchend="hancurkanLongPress()" oncontextmenu="event.preventDefault();">
            <div class="${bubbleColor} px-3 py-2 rounded-2xl shadow-lg relative group">
                ${senderNameHtml}
                <div class="text-[12px] leading-relaxed break-words">${contentHtml}</div>
                <div class="text-[9px] text-white/50 text-right mt-1.5 float-right flex items-center gap-1">
                    ${time}
                    ${isMe ? `<i class="fas fa-check${(msg.is_read || msg.is_read === 'true') ? '-double text-brand-info' : ''}"></i>` : ''}
                </div>
            </div>
        </div>
    </div>`;

    container.insertAdjacentHTML('beforeend', html);
}



// ==========================================
// 2. FUNGSI KIRIM PESAN (DENGAN PENJAGA PINTU GRUP)
// ==========================================
async function sendMessageRoom() {
if (!activeChatUserId && !activeGroupId) return;
const input = document.getElementById('chat-room-input');
const message = input.value.trim();
if (!message) return;

const isGroup = !!activeGroupId;
const targetId = isGroup ? activeGroupId : activeChatUserId;

// --- PENJAGA PINTU GRUP ANTI-KICK ---
if (isGroup) {
const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', targetId).eq('user_id', currentUser.id).single();
if (!checkMember) {
await customAlert("Anda tidak dapat mengirim pesan karena telah dikeluarkan dari grup ini.");
input.value = ''; // Kosongkan inputan
closeChatRoom(); // Usir paksa dari layar chat
return;
}
}

// Tangkap data reply jika sedang membalas pesan
const currentReplyId = replyingToMsgId;
const currentReplyName = replyingToMsgName;
const currentReplyText = replyingToMsgText;
cancelChatReply();

// Kosongkan input dan reset ikon ke mikrofon
input.value = '';
input.style.height = 'auto';
sendTypingStatus();

// Sisipkan format balasan
let finalMessage = message;
if (currentReplyId) {
const safeName = currentReplyName.replace(/\|\|/g, "").replace(/\]/g, "");
const safeText = currentReplyText.replace(/\|\|/g, "").replace(/\]/g, "");
finalMessage = `[REPLY:${currentReplyId}||${safeName}||${safeText}]\n${message}`;
}

// Tampilkan pesan sementara ke layar biar terasa responsif
const tempId = 'temp-' + Date.now();
const tempMsg = { id: tempId, sender_id: currentUser.id, message: finalMessage, created_at: new Date().toISOString() };
appendMessageBubble(tempMsg);
scrollToBottomChat();

// Kirim ke database Supabase
try {
const insertData = { sender_id: currentUser.id, message: finalMessage };
if (isGroup) insertData.group_id = targetId;
else insertData.receiver_id = targetId;

const { error } = await supabaseClient.from('messages').insert(insertData);
if (error) throw error;

tambahExp(2); // <--- SISTEM EXP

} catch (err) {
showToast("Gagal mengirim pesan", "error");
// Hapus gelembung sementara jika gagal
const bubble = document.getElementById(`msg-chat-${tempId}`);
if(bubble) bubble.remove();
}
}

// ==========================================
// FITUR WHATSAPP: STORY VIEWS & LIKES STATS
// ==========================================

// 1. Rekam jejak (Seen) saat menonton story teman
async function recordStoryView(storyId) {
if (!currentUser) return;
try {
// Kirim ke Supabase. Pastikan tabel story_views punya constraint UNIQUE untuk kombinasi story_id dan user_id
await supabaseClient.from('story_views').insert({
story_id: storyId,
user_id: currentUser.id
});
} catch (err) {
// Abaikan jika error (biasanya error karena constraint unique = user sudah pernah nonton dan tercatat)
}
}

// 2. Tarik angka total Views dan Likes
async function fetchStoryStats(storyId) {
try {
const { count: viewCount } = await supabaseClient.from('story_views').select('*', { count: 'exact', head: true }).eq('story_id', storyId);
const { count: likeCount } = await supabaseClient.from('story_likes').select('*', { count: 'exact', head: true }).eq('story_id', storyId);

document.getElementById('story-view-count').innerText = viewCount || 0;
document.getElementById('story-like-count').innerText = likeCount || 0;
document.getElementById('modal-view-count').innerText = viewCount || 0;
document.getElementById('modal-like-count').innerText = likeCount || 0;
} catch(e) {}
}

// 3. Buka/Tutup Drawer Animasi
function openStoryStatsModal() {
    history.pushState({ popup: 'story_stats' }, null, '#storystats'); // <-- HISTORY BARU
    const modal = document.getElementById('modal-story-stats');
    modal.classList.remove('translate-y-full');
    if (typeof pauseStoryForReply === 'function') pauseStoryForReply(); 
    loadStoryStatsData(); 
}


function closeStoryStatsModal(dariTombolBack = false) {
    const modal = document.getElementById('modal-story-stats');
    modal.classList.add('translate-y-full');
    if (typeof resumeStoryAfterReply === 'function') resumeStoryAfterReply(); 

    // SINKRONISASI TOMBOL BACK HP
    if (!dariTombolBack && window.location.hash === '#storystats') {
        history.back();
    }
}


// 4. Pindah Tab Dilihat / Disukai
function switchStoryStatTab(tab) {
const listViews = document.getElementById('story-views-list');
const listLikes = document.getElementById('story-likes-list');
const tabViews = document.getElementById('tab-views');
const tabLikes = document.getElementById('tab-likes');

if (tab === 'views') {
listViews.classList.replace('hidden', 'block');
listLikes.classList.replace('block', 'hidden');
tabViews.className = 'font-bold text-brand-info text-sm border-b-2 border-brand-info pb-1 transition-colors';
tabLikes.className = 'font-bold text-gray-500 text-sm border-b-2 border-transparent pb-1 transition-colors';
} else {
listLikes.classList.replace('hidden', 'block');
listViews.classList.replace('block', 'hidden');
tabLikes.className = 'font-bold text-brand-accent text-sm border-b-2 border-brand-accent pb-1 transition-colors';
tabViews.className = 'font-bold text-gray-500 text-sm border-b-2 border-transparent pb-1 transition-colors';
}
}

// 5. Muat dan Render Daftar User
async function loadStoryStatsData() {
const story = currentActiveStories[currentActiveStories.currentIndex];
if(!story) return;

const listViews = document.getElementById('story-views-list');
const listLikes = document.getElementById('story-likes-list');

listViews.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-info text-2xl"></i></div>';
listLikes.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';

try {
// Ambil ID orang-orangnya dari database
const { data: viewsData } = await supabaseClient.from('story_views').select('user_id, created_at').eq('story_id', story.id).order('created_at', { ascending: false });
const { data: likesData } = await supabaseClient.from('story_likes').select('user_id, created_at').eq('story_id', story.id).order('created_at', { ascending: false });

// Render Profilnya
await renderStatsList(viewsData, listViews, 'Belum ada yang melihat status ini.');
await renderStatsList(likesData, listLikes, 'Belum ada yang menyukai status ini.', true);

} catch (err) {
listViews.innerHTML = '<div class="text-center py-5 text-xs text-red-500">Gagal memuat data.</div>';
listLikes.innerHTML = '<div class="text-center py-5 text-xs text-red-500">Gagal memuat data.</div>';
}
}

async function renderStatsList(dataArray, container, emptyMsg, isLike = false) {
if (!dataArray || dataArray.length === 0) {
container.innerHTML = `<div class="flex flex-col items-center justify-center py-10 opacity-50"><i class="fas ${isLike ? 'fa-heart text-brand-accent' : 'fa-eye text-brand-info'} text-4xl mb-3"></i><p class="text-xs text-white font-bold">${emptyMsg}</p></div>`;
return;
}

const userIds = dataArray.map(d => d.user_id);
const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', userIds);

if(!profiles) return;

let html = '';
dataArray.forEach(item => {
const p = profiles.find(x => x.id === item.user_id);
if(p) {
const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
const icon = isLike ? '<i class="fas fa-heart text-brand-accent text-[12px] animate-pulse"></i>' : '<i class="fas fa-eye text-brand-info text-[12px]"></i>';
html += `
<div class="flex items-center p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border-b border-white/5 last:border-0" onclick="closeStoryStatsModal(); closeStoryViewer(); setTimeout(() => viewUserProfile('${p.id}'), 300);">
<img src="${ava}" loading="lazy" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
<div class="ml-3 flex-1 flex justify-between items-center">
<div>
<h4 class="font-bold text-white text-xs">${p.nickname}</h4>
<p class="text-[9px] text-gray-500 mt-0.5">${timeAgo(item.created_at)}</p>
</div>
<div class="bg-black/30 p-2 rounded-full border border-white/5">${icon}</div>
</div>
</div>`;
}
});
container.innerHTML = html;
}

// ==========================================
// DATABASE DATABASE RIPPER (ANTI PENIPU)
// ==========================================
async function muatDataRipper() {
const linkAPI = "/api/ripper";
const container = document.getElementById('ripper-container');
const dataTersimpan = localStorage.getItem('ripperCache');
if (dataTersimpan) { dataRipperGlobal = JSON.parse(dataTersimpan); renderRippers(dataRipperGlobal, false); }
else { container.innerHTML = '<div class="text-center py-10 text-xs text-brand-info animate-pulse"><i class="fas fa-sync fa-spin mb-2 text-2xl"></i><br>Menyiapkan Database Pertama Kali...</div>'; }
try { const respon = await fetch(linkAPI); const dataBaru = await respon.json(); localStorage.setItem('ripperCache', JSON.stringify(dataBaru)); dataRipperGlobal = dataBaru; renderRippers(dataRipperGlobal, false); }
catch (error) { if (!dataTersimpan) { container.innerHTML = '<div class="text-center py-10 text-xs text-red-500"><i class="fas fa-exclamation-triangle mb-2 text-2xl"></i><br>Gagal terhubung ke database.</div>'; } }
}

// 🤖 HELPER 1: Generator Link Gambar PNG dari Biznet GIO Storage Lu Om
function getKategoriLogoURL(name) {
name = name.toLowerCase().trim().replace(/\s+/g, '-'); // Ubah "AU2 ID" jadi "au2-id" biar aman di URL

// 📢 GANTI LINK DI BAWAH INI pake link folder storage Biznet lu tempat nyimpen ikon-ikonnya ya Om!
const folderStorageLu = "https://nos.wjv-1.neo.id/au2hub/icons/";

return `${folderStorageLu}${name}.png`;
}


// 🤖 HELPER 2: Scanner Otomatis Warna Neon Ikon biar berwarna layaknya Gojek
function getIconColorClass(name, isActive) {
if (isActive) return '!text-white'; // Kalau aktif, ikonnya dipaksa putih bersih
name = name.toLowerCase();
if (name === 'semua') return 'text-brand-info';
if (name.includes('joki')) return 'text-yellow-400';
if (name.includes('netflix') || name.includes('flix')) return 'text-red-500';
if (name.includes('game') || name.includes('dance') || name.includes('bingo')) return 'text-brand-purple';
return 'text-brand-accent';
}

// 🤖 FUNGSI SAKTI: Pendeteksi Kategori Otomatis lewat Judul Produk
function getCategoryName(p) {
let kat = p.category_name || p.brand_name || p.group_name || p.category || p.kategori || p.brand || p.type;
if (!kat && p.title) {
kat = p.title.trim().split(' ')[0];
}
return kat ? kat.trim().toUpperCase() : 'LAINNYA';
}


function pilihKategori(kat) {
kategoriAktif = kat;
document.getElementById('serviceSearch').value = '';
renderKategoriTabs(xoftwareProdukGlobal); // Refresh status tombol aktif

let dataFiltered = xoftwareProdukGlobal;
if (kat !== 'Semua') {
dataFiltered = xoftwareProdukGlobal.filter(p => getCategoryName(p) === kat);
}
renderProdukXoftware(dataFiltered);
}


// 🔥 VARIABEL GLOBAL UNTUK KALKULASI HARGA & VARIASI
let currentProductPrice = 0;
let currentProductQty = 1;
let currentSelectedVariation = ""; // Nyimpen nama variasi yang dipilih

// 🌟 FUNGSI BARU: KLIK VARIASI
function pilihVariasi(namaVariasi, hargaVariasi) {
    currentSelectedVariation = namaVariasi;
    currentProductPrice = parseFloat(hargaVariasi) || 0;
    
    // Refresh warna tombol biar keliatan mana yang aktif
    if (window.renderVariasiButtons) window.renderVariasiButtons(namaVariasi);
    
    updateHargaLayar(); // Update harga ke layar
}

// 1. Fungsi Tombol Plus Minus
function ubahJumlahPesan(delta) {
let newQty = currentProductQty + delta;
if (newQty < 1) newQty = 1;
currentProductQty = newQty;

const elQty = document.getElementById('detail-qty');
if (elQty) elQty.value = currentProductQty; // Pake .value karena sekarang jadi input box

updateHargaLayar();
}

// 2. Fungsi Diketik Manual (Real-time)
function inputJumlahPesan(val) {
    let parsed = parseInt(val);
    // Jika kosong / dihapus, anggap sementara jumlahnya 1 agar tidak NaN
    if (isNaN(parsed) || parsed < 1) {
        currentProductQty = 1;
    } else {
        currentProductQty = parsed;
    }
    updateHargaLayar();
}

// Lakukan hal yang persis sama pada fungsi inputJumlahPasar(val)
function inputJumlahPasar(val) {
    let parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1) {
        currentPasarQty = 1; 
    } else {
        currentPasarQty = parsed; 
    }
    updateHargaPasarLayar();
}

// 3. Fungsi Mencegah User Ngetik Huruf Aneh / Dikosongin
function validasiJumlah(el) {
let parsed = parseInt(el.value);
if (isNaN(parsed) || parsed < 1) {
parsed = 1;
el.value = 1;
}
currentProductQty = parsed;
updateHargaLayar();
}

// 4. Update Angka Harga (Dengan Coretan Marketing + Potongan Kasta Live)
function updateHargaLayar() {
let totalPrice = currentProductPrice * currentProductQty;

// Rumus hitung harga coret otomatis biar sinkron
let baseHargaCoret = Math.ceil((currentProductPrice * 1.3) / 1000) * 1000;
if (currentProductPrice > 100000) baseHargaCoret = Math.ceil((currentProductPrice * 1.2) / 5000) * 5000;
if (currentProductPrice <= 5000) baseHargaCoret = currentProductPrice + 2500;

let totalHargaCoret = baseHargaCoret * currentProductQty;

// 👑 DETEKSI DISKON KASTA LIVE: Potong harga asli langsung di layar laci produk!
const badgeDiscount = document.getElementById('detail-discount-badge');
if (currentUser && badgeDiscount) {
const videoSaya = allVideosData.filter(v => v.user_id === currentUser.id).length;
if (videoSaya >= 100) {
totalPrice = Math.floor(totalPrice * 0.9); // Sunat 10%
badgeDiscount.innerHTML = `<i class="fas fa-percentage mr-1"></i> DISKON LEGEND 10% AKTIF`;
badgeDiscount.classList.remove('hidden');
} else if (videoSaya >= 50) {
totalPrice = Math.floor(totalPrice * 0.95); // Sunat 5%
badgeDiscount.innerHTML = `<i class="fas fa-percentage mr-1"></i> DISKON MASTER 5% AKTIF`;
badgeDiscount.classList.remove('hidden');
} else {
badgeDiscount.classList.add('hidden');
}
}

// Suntikkan ke elemen teks laci produk
document.getElementById('detail-product-price').innerHTML = `<span class="text-gray-500 line-through text-sm font-medium mr-2">Rp ${totalHargaCoret.toLocaleString('id-ID')}</span>Rp ${totalPrice.toLocaleString('id-ID')}`;
}


// ==========================================
// SISTEM PEMBERSIH MEMORI OTOMATIS (ANTI QUOTA EXCEEDED)
// ==========================================
function autoCleanLocalStorage() {
    let keysToRemove = [];
    let likeCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('liked_') || key.startsWith('comment_liked_') || key.startsWith('story_liked_'))) {
            likeCount++;
            keysToRemove.push(key);
        }
    }
    // Jika jumlah riwayat Like di HP sudah lebih dari 300, bersihkan untuk mencegah memori penuh
    if (likeCount > 300) {
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log(`[System] ${likeCount} Cache memori dibersihkan.`);
    }
}

// ==========================================
// INISIALISASI HALAMAN (WAJIB ADA AGAR WEB BERJALAN)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  autoCleanLocalStorage(); // Eksekusi pembersih memori saat buka web

    // 🔥 1. TANGKAP LINK SHARE TOKO DARI LUAR 🔥
      const path = window.location.pathname;
  if (path.startsWith('/toko/')) {
      const sellerName = path.replace('/toko/', '').replace('/', '');
      window.history.replaceState(null, null, `/#tokopublik?seller=${sellerName}`);
  }


  setTimeout(() => {
        if(document.getElementById('btn-bayar-langganan')) {
            pilihPaketSeller('tahunan'); // Set default awal beserta biaya gateway-nya
        }
    }, 1000);

  // Logika Routing Halaman Utama
  let tabAwal = window.location.hash.substring(1);
  if (!tabAwal) {
    tabAwal = localStorage.getItem('lastTab') || 'home';
    
    // 🔥 [PERBAIKAN ANTI-PENTAL]: Tuliskan tab ke URL secara diam-diam saat pertama kali buka
    // Agar saat laci ditutup dan memicu history.back(), browser tahu harus pulang ke tab mana
    history.replaceState(null, null, '#' + tabAwal); 
  }

  // --- LOGIKA BARU: Pisahkan parameter dan atur tab background yang benar ---
  let tabMurni = tabAwal.split('?')[0]; // Membuang "?id=..." agar sistem tidak bingung

  // Mengarahkan background ke tab aslinya agar tidak nyasar ke home saat link laci dibuka
  if (tabMurni === 'detailpasar') tabMurni = 'pasar';
  if (tabMurni === 'detail') tabMurni = 'layanan';
  if (tabMurni === 'invoice') tabMurni = 'pesanan';
  
  // 🚨 PERBAIKAN: Jika pas buka web malah nyasar ke loading pembayaran/upload, lempar ke pesanan/home
  if (tabMurni === 'pembayaran') tabMurni = 'pesanan';
  if (tabMurni === 'upload') tabMurni = 'home';

  switchTab(tabMurni, null, false);

  checkSession();
supabaseClient.auth.onAuthStateChange((event, session) => {
      // Jika token gagal diperbarui atau kadaluarsa
      if (event === 'TOKEN_REFRESHED' && !session) {
          handleLogout(); 
          showToast("Sesi kamu telah berakhir. Silakan login kembali.", "error");
      } 
      // Jika user terdeteksi logout (misal dari tab browser lain)
      else if (event === 'SIGNED_OUT') {
          currentUser = null;
          userProfile = null;
          checkSession(); 
      }
  });
  muatDataRipper();
  loadInfoLayanan();
  loadDataRekber();


  // ==========================================
  // FITUR PWA & SERVICE WORKER (AUTO-UPDATE RADAR)
  // ==========================================

  // 1. Daftarkan Service Worker & Pasang Radar Update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('SW Berhasil Terdaftar!');

        // 📡 RADAR DETEKSI UPDATE CODINGAN
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Jika player sudah punya versi lama, dan versi baru sukses terpasang:
                if (typeof showToast === 'function') {
                    showToast("Aplikasi diperbarui! Memuat ulang sistem...", "success");
                }
                
                // Beri jeda 1.5 detik agar notifikasi terbaca, lalu paksa auto-refresh
                setTimeout(() => {
                  window.location.reload(true); 
                }, 1500);
              }
            }
          };
        };
      })
      .catch((err) => console.log('SW Gagal:', err));
  }

  let deferredPrompt;
  const btnInstallContainer = document.getElementById('install-container');
  const btnInstallManual = document.getElementById('btn-install-manual');

  // 2. Cek apakah sudah diakses dari Aplikasi PWA
  function isPWAInstalled() {
      return window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone || 
             document.referrer.includes('android-app://');
  }

  // Tampilkan tombol HANYA jika dibuka di browser biasa
  if (btnInstallContainer) {
      if (isPWAInstalled()) {
          btnInstallContainer.classList.add('hidden');
      } else {
          btnInstallContainer.classList.remove('hidden');
      }
  }

  // 3. Tangkap Event Install PWA (Untuk Android/Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallContainer) btnInstallContainer.classList.remove('hidden');
  });

  // 4. Logika Klik Tombol Install
  if (btnInstallManual) {
    btnInstallManual.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Munculkan dialog bawaan Android
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Hasil install:', outcome);
        
        // Kosongkan prompt
        deferredPrompt = null;
      } else {
        // Fallback untuk iOS / Safari yang tidak mendukung prompt otomatis
        alert("Untuk menginstal di iPhone/iPad:\n\n1. Ketuk ikon 'Bagikan' (Share) di menu bawah.\n2. Pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
      }
    });
  }

  // 5. Sembunyikan tombol HANYA jika benar-benar berhasil di-install
  window.addEventListener('appinstalled', () => {
    console.log('Aplikasi sukses terinstal!');
    if (btnInstallContainer) btnInstallContainer.classList.add('hidden');
  });


});

// 🤖 HELPER SAKTI V3: Sistem Lencana Kasta Tertinggi + Rebirth Loop Tanpa Batas 5 Tahun Awet (VERSI IKON SAJA)
function getBadgeByLevelAndVideos(level, count) {
    // Kasta Legend: Level 10 ke atas ATAU 100+ video
    if (level >= 10 || count >= 100) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
    }
    // Kasta Master: Level 5 ke atas ATAU 50+ video
    if (level >= 5 || count >= 50) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
    }
    // Kasta Elite: Level 3 ke atas ATAU 25+ video
    if (level >= 3 || count >= 25) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
    }
    // Kasta Verified: Level 2 ke atas ATAU 10+ video
    if (level >= 2 || count >= 10) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
    }
    return '';
}

// 🤖 GAMIFIKASI V2: Logika Papan Peringkat Dual Mode (Top Creator & Top Sultan)
function openLeaderboardModal() {
    // [BARU] Matikan efek floating video secara halus seperti pada tombol Upload
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
    }

    const modal = document.getElementById('modal-leaderboard');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // 🔥 KUNCI FIX: Sembunyikan tombol chat mengambang biar gak kehalang
    const chatBtn = document.querySelector('button[onclick="toggleWidget()"]');
    if (chatBtn) chatBtn.classList.add('hidden');

    history.pushState({ popup: 'leaderboard' }, null, '#leaderboard');

    // Auto buka tab Creator saat pertama di-klik
    switchLeaderboardTab('creator');
}

function closeLeaderboardModal() {
    if (window.location.hash === '#leaderboard') {
        // Biarkan sistem 'back' HP (popstate) yang mengeksekusi penutupan agar sinkron!
        history.back(); 
    } else {
        // Jika tidak ada di history, baru tutup secara manual
        const modal = document.getElementById('modal-leaderboard');
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        // 🔥 KUNCI FIX: Munculin balik tombol chat mengambangnya pas ditutup
        const chatBtn = document.querySelector('button[onclick="toggleWidget()"]');
        if (chatBtn) chatBtn.classList.remove('hidden');
    }
}

// 🧠 MESIN PENARIK DATA LEADERBOARD DUAL-TAB JADI TRIPLE-TAB
async function switchLeaderboardTab(tab) {
    const btnCreator = document.getElementById('tab-lb-creator');
    const btnLevel = document.getElementById('tab-lb-level');
    const btnSultan = document.getElementById('tab-lb-sultan');
    
    const containerCreator = document.getElementById('leaderboard-container-creator');
    const containerLevel = document.getElementById('leaderboard-container-level');
    const containerSultan = document.getElementById('leaderboard-container-sultan');

    // Reset Semua Tombol ke Default (Tidak Aktif)
    const normalClass = 'flex-1 py-2.5 text-[10px] font-bold text-gray-500 hover:text-white rounded-xl transition-all bg-transparent shadow-none border border-transparent hover:border-white/10';
    btnCreator.className = normalClass;
    btnLevel.className = normalClass;
    btnSultan.className = normalClass;

    // Sembunyikan Semua Wadah List
    containerCreator.classList.replace('block', 'hidden');
    containerLevel.classList.replace('block', 'hidden');
    containerSultan.classList.replace('block', 'hidden');

    if (tab === 'creator') {
        btnCreator.className = 'flex-1 py-2.5 text-[10px] font-bold text-white bg-brand-accent rounded-xl shadow-[0_0_15px_rgba(255,0,122,0.4)] transition-all';
        containerCreator.classList.replace('hidden', 'block');
        containerCreator.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';

        // Fetch Data Creator (Gunakan cache ram allVideosData Anda)
        if (allVideosData.length === 0) {
            try {
                const res = await fetch('/api/get-videos');
                let dataDariSheet = await res.json();
                dataDariSheet = dataDariSheet.map(v => { v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9); return v; });
                allVideosData = dataDariSheet.filter(v => !blockedUsersList.includes(v.user_id));
            } catch(e) {
                containerCreator.innerHTML = '<p class="text-center text-xs text-red-500 py-10">Gagal memuat ranking.</p>';
                return;
            }
        }

        const userStats = {};
        allVideosData.forEach(vid => {
            if (!userStats[vid.user_id]) {
                userStats[vid.user_id] = { user_id: vid.user_id, nickname: vid.nickname || "Player", avatar_url: vid.avatar_url || "", videoCount: 0 };
            }
            userStats[vid.user_id].videoCount++;
        });

        const sortedLeaderboard = Object.values(userStats).sort((a, b) => b.videoCount - a.videoCount);
        if (sortedLeaderboard.length === 0) {
            containerCreator.innerHTML = '<p class="text-center text-xs text-gray-500 py-10">Belum ada kompetisi dimulai.</p>';
            return;
        }

        containerCreator.innerHTML = sortedLeaderboard.map((user, index) => {
            const rank = index + 1;
            const ava = user.avatar_url || `https://ui-avatars.com/api/?name=${user.nickname}&background=1A1133&color=fff`;
            let rankBadge = `<span class="text-xs font-bold text-gray-500 w-6 text-center">#${rank}</span>`;
            if (rank === 1) rankBadge = '<div class="w-6 flex justify-center text-xl text-yellow-400"><i class="fas fa-medal"></i></div>';
            if (rank === 2) rankBadge = '<div class="w-6 flex justify-center text-xl text-gray-300"><i class="fas fa-medal"></i></div>';
            if (rank === 3) rankBadge = '<div class="w-6 flex justify-center text-xl text-amber-600"><i class="fas fa-medal"></i></div>';

            return `
            <div onclick="viewUserProfile('${user.user_id}'); closeLeaderboardModal();" class="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    ${rankBadge}
                    <img src="${ava}" class="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0">
                    <div class="truncate">
                        <h4 class="font-bold text-white text-xs flex items-center gap-1">@${user.nickname}</h4>
                        <p class="text-[10px] text-gray-400 mt-0.5">${user.videoCount} Video dibagikan</p>
                    </div>
                </div>
                <div class="text-right ml-2 shrink-0">
                    <span class="text-[10px] font-extrabold bg-brand-accent/10 text-brand-accent px-2.5 py-1 rounded-lg border border-brand-accent/20 tracking-wider">${user.videoCount * 10} XP</span>
                </div>
            </div>`;
        }).join('');

    } else if (tab === 'level') {
        // 🔥 TAB BARU: TOP LEVEL SINKRONISASI SUPABASE
        btnLevel.className = 'flex-1 py-2.5 text-[10px] font-bold text-white bg-brand-purple rounded-xl shadow-[0_0_15px_rgba(162,119,255,0.4)] transition-all';
        containerLevel.classList.replace('hidden', 'block');
        containerLevel.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-purple text-2xl"></i></div>';

        try {
            // Tarik 50 Player dengan EXP Tertinggi dari database Supabase
            const { data: topPlayers, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('exp', { ascending: false })
                .limit(50);

            if (error || !topPlayers || topPlayers.length === 0) {
                containerLevel.innerHTML = '<p class="text-center text-xs text-gray-500 py-10">Belum ada data level terdeteksi.</p>';
                return;
            }

            containerLevel.innerHTML = topPlayers.map((player, index) => {
                const rank = index + 1;
                const ava = player.avatar_url || `https://ui-avatars.com/api/?name=${player.nickname}&background=1A1133&color=fff`;
                const statusLevel = hitungStatusLevel(player.exp || 0);
                
                // Hitung jumlah video untuk validasi Kasta Badge lencana dewa
                const videoCount = allVideosData.filter(v => v.user_id === player.id).length;
                const statusBadge = getBadgeByLevelAndVideos(statusLevel.level, videoCount);

                let rankBadge = `<span class="text-xs font-bold text-gray-500 w-6 text-center">#${rank}</span>`;
                if (rank === 1) rankBadge = '<div class="w-6 flex justify-center text-xl text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"><i class="fas fa-trophy"></i></div>';
                if (rank === 2) rankBadge = '<div class="w-6 flex justify-center text-xl text-gray-300"><i class="fas fa-award"></i></div>';
                if (rank === 3) rankBadge = '<div class="w-6 flex justify-center text-xl text-amber-600"><i class="fas fa-award"></i></div>';

                return `
                <div onclick="viewUserProfile('${player.id}'); closeLeaderboardModal();" class="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        ${rankBadge}
                        <img src="${ava}" class="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0">
                        <div class="truncate">
                            <h4 class="font-bold text-white text-xs flex items-center gap-1">@${player.nickname} ${statusBadge}</h4>
                            <p class="text-[10px] text-gray-400 mt-0.5">Total akumulasi: ${statusLevel.exp.toLocaleString('id-ID')} EXP</p>
                        </div>
                    </div>
                    <div class="text-right ml-2 shrink-0">
                        <span class="text-[11px] font-black bg-gradient-to-r from-brand-info to-brand-purple text-white px-3 py-1 rounded-xl border border-white/10 tracking-tight shadow-md">Lv. ${statusLevel.level}</span>
                    </div>
                </div>`;
            }).join('');

        } catch (err) {
            containerLevel.innerHTML = '<p class="text-center text-xs text-red-500 py-10">Gagal menarik data database level.</p>';
        }

    } else if (tab === 'sultan') {
        btnSultan.className = 'flex-1 py-2.5 text-[10px] font-bold text-brand-dark bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all';
        containerSultan.classList.replace('hidden', 'block');
        containerSultan.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-yellow-400 text-2xl"></i></div>';

        try {
            // 1. Tarik data dari Layanan Admin (orders)
            const reqAdmin = supabaseClient.from('orders').select('user_id, price').eq('status', 'selesai');
            // 2. Tarik data dari Pasar Player (orders_player)
            const reqPlayer = supabaseClient.from('orders_player').select('user_id, price').eq('status', 'selesai');
            
            // Eksekusi berbarengan agar cepat
            const [resAdmin, resPlayer] = await Promise.all([reqAdmin, reqPlayer]);
            
            // Gabungkan kedua data pesanan
            const allOrders = [...(resAdmin.data || []), ...(resPlayer.data || [])];

            if (allOrders.length === 0) {
                containerSultan.innerHTML = '<p class="text-center text-xs text-gray-500 py-10">Belum ada data sultan yang memborong.</p>';
                return;
            }

            // Hitung total gabungan pengeluaran
            const sultanStats = {};
            allOrders.forEach(o => {
                if (!sultanStats[o.user_id]) sultanStats[o.user_id] = { user_id: o.user_id, totalSpent: 0 };
                sultanStats[o.user_id].totalSpent += Number(o.price);
            });

            const sortedSultans = Object.values(sultanStats).sort((a, b) => b.totalSpent - a.totalSpent);
            const userIds = sortedSultans.map(s => s.user_id);
            const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', userIds);

            containerSultan.innerHTML = sortedSultans.map((sultan, index) => {
                const rank = index + 1;
                const p = profiles?.find(x => x.id === sultan.user_id);
                const nickname = p?.nickname || "Player";
                const ava = p?.avatar_url || `https://ui-avatars.com/api/?name=${nickname}&background=1A1133&color=fff`;

                let rankBadge = `<span class="text-xs font-bold text-gray-500 w-6 text-center">#${rank}</span>`;
                if (rank === 1) rankBadge = '<div class="w-6 flex justify-center text-xl text-yellow-400"><i class="fas fa-crown"></i></div>';
                if (rank === 2) rankBadge = '<div class="w-6 flex justify-center text-xl text-gray-300"><i class="fas fa-medal"></i></div>';
                if (rank === 3) rankBadge = '<div class="w-6 flex justify-center text-xl text-amber-600"><i class="fas fa-medal"></i></div>';

                return `
                <div onclick="viewUserProfile('${sultan.user_id}'); closeLeaderboardModal();" class="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden">
                    <div class="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                        ${rankBadge}
                        <img src="${ava}" class="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0">
                        <div class="truncate">
                            <h4 class="font-bold text-white text-xs truncate">@${nickname}</h4>
                            <p class="text-[10px] text-yellow-500 mt-0.5 font-bold tracking-wide">Rp ${sultan.totalSpent.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div class="text-right ml-2 shrink-0 relative z-10">
                        ${rank === 1 ? 
                            `<span class="text-[10px] font-extrabold bg-gradient-to-tr from-[#FF007A] to-[#A277FF] text-white px-2 py-1 rounded-lg border border-[#FF007A]/50 shadow-[0_0_10px_rgba(255,0,122,0.6)]">VVIP</span>` 
                        : rank <= 3 ? 
                            `<span class="text-[10px] font-extrabold bg-gradient-to-tr from-yellow-400 to-yellow-600 text-black px-2 py-1 rounded-lg border border-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.4)]">SULTAN</span>`
                        : 
                            `<span class="text-[10px] font-extrabold bg-white/10 text-gray-300 px-2 py-1 rounded-lg border border-white/20">RICH</span>`
                        }
                    </div>
                </div>`;
            }).join('');
        } catch(e) {
            containerSultan.innerHTML = '<p class="text-center text-xs text-red-500 py-10">Gagal menarik data Sultan.</p>';
        }
    }
}




// 📦 LOGIKA TRACKER PESANAN (REAL-TIME DATABASE) - SUPPORT PPOB
async function loadOrderTracker(userId) {
    // Sembunyikan semua badge saat loading awal
    const bBayar = document.getElementById('badge-track-bayar'); if(bBayar) bBayar.classList.add('hidden');
    const bProses = document.getElementById('badge-track-proses'); if(bProses) bProses.classList.add('hidden');
    const bSelesai = document.getElementById('badge-track-selesai'); if(bSelesai) bSelesai.classList.add('hidden');

    try {
        // Tarik data dari TIGA tabel sekaligus
        const req1 = supabaseClient.from('orders').select('status').eq('user_id', userId);
        const req2 = supabaseClient.from('orders_player').select('status').eq('user_id', userId);
        const req3 = supabaseClient.from('riwayat_ppob').select('status').eq('user_id', userId);
        
        // Gabungkan hasilnya
        const [res1, res2, res3] = await Promise.all([req1, req2, req3]);
        const data = [...(res1.data || []), ...(res2.data || []), ...(res3.data || [])];

        if (data && data.length > 0) {
            // PENDING di toko = Belum bayar. 
            let countBayar = data.filter(o => o.status === 'PENDING').length;
            // proses/SUCCESS di toko = Diproses. Pending di PPOB = Diproses.
            let countProses = data.filter(o => o.status === 'proses' || o.status === 'SUCCESS' || o.status === 'Pending').length; 
            // selesai di toko = Selesai. Sukses di PPOB = Selesai.
            let countSelesai = data.filter(o => o.status === 'selesai' || o.status === 'Sukses').length;

            if (countBayar > 0 && bBayar) { bBayar.innerText = countBayar; bBayar.classList.remove('hidden'); }
            if (countProses > 0 && bProses) { bProses.innerText = countProses; bProses.classList.remove('hidden'); }
            if (countSelesai > 0 && bSelesai) { bSelesai.innerText = countSelesai; bSelesai.classList.remove('hidden'); }
        }
    } catch (err) {
        console.log("Tabel pesanan belum siap, abaikan tracker.");
    }
}

function closeRiwayatPesanan(dariTombolBackHP = false) {
    const modal = document.getElementById('modal-riwayat-pesanan');
    
    if (!dariTombolBackHP && window.location.hash === '#riwayat') {
        history.back(); // Pancing popstate
    } else {
        if (modal) {
            // Beri efek halus memudar saat ditutup
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                modal.style.opacity = '1'; // Reset
            }, 300);
        }
    }
}



// 📦 LOGIKA KLIK PESANAN ALA SHOPEE (PESANAN DITERIMA)
// VARIABEL GLOBAL UNTUK MENYIMPAN DATA TAGIHAN AKTIF
let activeOrderIdToPay = null;
let activeOrderPriceToPay = 0;
let activeOrderNameToPay = "";
let activeOrderTable = 'orders';
let activeOrderSellerId = null; 
let activeOrderProductId = null; 
let intervalJemputBola = null; 
let activeChannelPembayaran = null; 

async function cekStatusPesanan(kategori) {
    if (!currentUser) return showToast("Silakan login terlebih dahulu.", "error");

    const modal = document.getElementById('modal-riwayat-pesanan');
    const container = document.getElementById('riwayat-pesanan-list');
    const headerTitle = modal.querySelector('h3'); 
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    history.pushState({ popup: 'riwayat_pesanan' }, null, '#riwayat');

    container.innerHTML = '<div class="flex flex-col items-center justify-center mt-20"><i class="fas fa-spinner fa-spin text-brand-info text-4xl mb-3"></i><p class="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Memuat Database...</p></div>';

    try {
        // Query untuk TIGA Tabel
        let q1 = supabaseClient.from('orders').select('*').eq('user_id', currentUser.id);
        let q2 = supabaseClient.from('orders_player').select('*').eq('user_id', currentUser.id);
        let q3 = supabaseClient.from('riwayat_ppob').select('*').eq('user_id', currentUser.id);

        if (kategori === 'bayar') {
            q1 = q1.eq('status', 'PENDING');
            q2 = q2.eq('status', 'PENDING');
            q3 = q3.eq('status', 'DUMMY_KOSONG'); // PPOB tidak ada sistem "Belum Bayar" karena potong saldo instan
            headerTitle.innerHTML = '<i class="fas fa-wallet text-red-500"></i> TAGIHAN BELUM BAYAR';
        } else if (kategori === 'proses') {
            q1 = q1.in('status', ['proses', 'SUCCESS']);
            q2 = q2.in('status', ['proses', 'SUCCESS']);
            q3 = q3.in('status', ['Pending']); // Digiflazz bahasa prosesnya = Pending
            headerTitle.innerHTML = '<i class="fas fa-box text-brand-info"></i> PESANAN DIPROSES';
        } else if (kategori === 'selesai') {
            q1 = q1.eq('status', 'selesai');
            q2 = q2.eq('status', 'selesai');
            q3 = q3.eq('status', 'Sukses'); // Digiflazz bahasa selesainya = Sukses
            headerTitle.innerHTML = '<i class="fas fa-check-circle text-brand-success"></i> PESANAN SELESAI';
        } else {
            headerTitle.innerHTML = '<i class="fas fa-receipt text-brand-info"></i> SEMUA RIWAYAT';
        }

        const [res1, res2, res3] = await Promise.all([q1, q2, q3]);
        
        let data1 = (res1.data || []).map(o => ({...o, table_source: 'orders'}));
        let data2 = (res2.data || []).map(o => ({...o, table_source: 'orders_player'}));
        
        // PPOB butuh sedikit sulap karena kolom namanya beda
        let data3 = (res3.data || []).map(o => ({
            ...o, 
            table_source: 'riwayat_ppob',
            product_name: `[PPOB] ${o.sku_code} (${o.customer_no})`, // Bikin nama rapi
            id: o.ref_id // Samakan struktur ID
        }));

        let combinedData = [...data1, ...data2, ...data3];
        combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (combinedData.length > 0) {
            container.innerHTML = combinedData.map(order => {
                let statusColor = ''; let icon = ''; let teksStatus = order.status.toUpperCase();

                // Pemetaan Status Gabungan (Toko & PPOB)
                if (order.status === 'selesai' || order.status === 'Sukses') { 
                    statusColor = 'text-brand-success bg-brand-success/10 border-brand-success/30'; icon = 'fa-check-circle'; teksStatus = 'SELESAI'; 
                } 
                else if (order.status === 'proses' || order.status === 'SUCCESS' || order.status === 'Pending') { 
                    statusColor = 'text-brand-info bg-brand-info/10 border-brand-info/30'; icon = 'fa-box'; teksStatus = 'DIPROSES'; 
                    if (order.status === 'SUCCESS') supabaseClient.from(order.table_source).update({status: 'proses'}).eq('id', order.id).then();
                } 
                else if (order.status === 'PENDING') { 
                    statusColor = 'text-gray-400 bg-gray-500/10 border-gray-500/30'; icon = 'fa-wallet'; teksStatus = 'BELUM BAYAR'; 
                }
                else if (order.status === 'DIBATALKAN' || order.status === 'Gagal') { 
                    statusColor = 'text-red-400 bg-red-500/10 border-red-500/30'; icon = 'fa-times-circle'; teksStatus = order.status === 'Gagal' ? 'GAGAL (REFUND)' : 'DIBATALKAN'; 
                }

                let namaAman = escapeHTML(order.product_name).replace(/&#39;/g, "\\'");
                
                // 🔥 PERBAIKAN: Nyalakan fungsi klik laci struk untuk SEMUA jenis transaksi (termasuk PPOB)
                let clickAction = `onclick="bukaDetailPesananDinamis('${order.id}', '${namaAman}', '${order.price}', '${order.status}', '${order.table_source}', '${order.seller_id || ''}', '${order.product_id || ''}')" class="cursor-pointer hover:border-brand-accent/50 border-white/5 transition-all"`;

                return `
                <div ${clickAction} class="bg-brand-dark/50 border p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden transition-all hover:border-white/10 ${order.status === 'PENDING' ? 'border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : ''}">
                    <div class="flex justify-between items-start z-10">
                        <h4 class="text-xs font-bold text-white line-clamp-2 pr-3">${order.product_name}</h4>
                        <span class="text-[9px] font-extrabold px-2 py-1 rounded-md border whitespace-nowrap flex items-center gap-1 ${statusColor} shrink-0 shadow-sm"><i class="fas ${icon}"></i> ${teksStatus}</span>
                    </div>
                    <div class="flex justify-between items-end mt-2 z-10 border-t border-white/5 pt-2.5">
                        <span class="text-[9px] text-gray-400"><i class="far fa-clock mr-1"></i>${timeAgo(order.created_at)}</span>
                        <span class="text-[13px] font-extrabold ${order.status === 'Gagal' ? 'text-gray-500 line-through' : 'text-brand-accent'}">Rp ${Number(order.price).toLocaleString('id-ID')}</span>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-24 text-center px-6">
                <div class="relative w-24 h-24 mb-5 flex items-center justify-center">
                    <div class="absolute inset-0 bg-brand-info/10 rounded-full blur-xl"></div>
                    <div class="w-20 h-20 bg-brand-info/10 rounded-full flex items-center justify-center border border-brand-info/20 backdrop-blur-md relative z-10 shadow-lg">
                        <i class="fas fa-box-open text-4xl text-brand-info/70"></i>
                    </div>
                </div>
                <h4 class="text-white font-extrabold text-base mb-1 tracking-tight">Belum Ada Transaksi</h4>
                <p class="text-xs text-gray-500 leading-relaxed">Sepertinya kamu belum memiliki data pesanan di kategori ini.</p>
            </div>`;
        }
    } catch (e) {
        container.innerHTML = '<div class="text-center mt-20 text-red-500 text-xs">Gagal menarik data dari server.</div>';
    }
}


// 👥 AUTO-UPDATE FOTO PROFIL GRUP (REAL-TIME STORAGE)
async function handleGroupAvatarUpload(event) {
const file = event.target.files[0];
if (!file || !activeGroupId) return;

showToast("Mengupdate foto profil grup...", "info");

try {
// 1. Ambil URL unggahan dari API URL lu
const pathLengkap = `groups/${activeGroupId}/avatar_${Date.now()}`;
const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`);
const dataUrl = await resUrl.json();

// 2. Upload file fisik ke storage Biznet GIO
await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: file,
headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' }
});

// 3. Tembak perubahan URL foto baru ke database Supabase
const { error } = await supabaseClient
.from('groups')
.update({ avatar_url: dataUrl.finalVideoUrl })
.eq('id', activeGroupId);

if (error) throw error;

// 4. Ubah tampilan layar secara instan tanpa reload
document.getElementById('info-group-avatar').src = dataUrl.finalVideoUrl;
showToast("Foto profil grup berhasil diperbarui!", "success");
loadChatList(); // Refresh daftar pesan masuk di latar belakang

} catch(err) {
showToast("Gagal memperbarui foto grup.", "error");
}
}

        
        function getBadgeByVideoCount(count) {
    return getBadgeByLevelAndVideos(0, count);
}

let isRekberLoaded = false;

async function loadDataRekber(forceRefresh = false) {
    if (isRekberLoaded && !forceRefresh) return;
    
    const container = document.getElementById('rekber-dynamic-container');
    if (forceRefresh) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center py-10 mt-10"><i class="fas fa-spinner fa-spin text-brand-purple text-3xl mb-3"></i><span class="text-xs text-gray-500 font-bold tracking-widest">MEMUAT ULANG...</span></div>';
    }

    try {
        const configRes = await fetch('/api/get-config');
        const config = await configRes.json();
        if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan");

        const res = await fetch(`${config.gasUrl}?action=get_rekber`);
        const result = await res.json();

        if (result.status === 'success' && result.data.length > 0) {
            const data = result.data;
            let htmlOutput = '';

            // 1. RENDER PROSEDUR
            const dataProsedur = data.find(d => d.Kategori.toLowerCase() === 'prosedur');
            if (dataProsedur) {
                // Mengubah \n di spreadsheet menjadi <li>
                const prosedurList = dataProsedur.Deskripsi.split(/\\n/).map(item => `<li>${item.trim()}</li>`).join('');
                
                htmlOutput += `
                <div class="bg-brand-card rounded-2xl p-5 border border-white/5 mb-6 relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 text-6xl text-${dataProsedur.Warna} opacity-5"><i class="fas ${dataProsedur.Ikon}"></i></div>
                    <h3 class="font-bold text-${dataProsedur.Warna} text-sm mb-3 relative z-10"><i class="fas ${dataProsedur.Ikon} mr-2"></i> ${dataProsedur.Judul}</h3>
                    <ul class="list-decimal list-inside text-xs text-gray-300 space-y-2 mb-4 relative z-10 leading-relaxed">
                        ${prosedurList}
                    </ul>
                    <div class="bg-black/30 rounded-xl p-3 text-xs text-gray-400 border border-white/5 relative z-10">
                        <i class="fas fa-clock text-brand-accent mr-2"></i> <strong>Jam Operasional:</strong> Harap chat admin terlebih dahulu.
                    </div>
                </div>`;
            }

            // 2. RENDER KONTAK
            const dataKontak = data.filter(d => d.Kategori.toLowerCase() === 'kontak');
            if (dataKontak.length > 0) {
                htmlOutput += `<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Kontak Resmi (Anti Clone)</h3><div class="space-y-3 mb-6">`;
                
                dataKontak.forEach(k => {
                    htmlOutput += `
                    <a href="${k.Link}" target="_blank" class="flex items-center p-4 bg-brand-card rounded-2xl border border-${k.Warna.replace(/[\[\]#]/g, '')}/20 active:scale-95 transition-transform">
                        <div class="bg-${k.Warna.replace(/[\[\]#]/g, '')}/10 w-10 h-10 rounded-full flex items-center justify-center mr-4"><i class="${k.Ikon.includes('fa-') ? k.Ikon : 'fas ' + k.Ikon} text-${k.Warna} text-lg"></i></div>
                        <div><div class="font-bold text-white text-sm">${k.Judul}</div><div class="text-[11px] text-gray-400 mt-0.5">${k.Deskripsi}</div></div>
                    </a>`;
                });
                htmlOutput += `</div>`;
            }

            // 3. RENDER GRUP
            const dataGrup = data.filter(d => d.Kategori.toLowerCase() === 'grup');
            if (dataGrup.length > 0) {
                htmlOutput += `<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Grup Komunitas</h3><div class="grid grid-cols-2 gap-3 pb-4">`;
                
                dataGrup.forEach((g, index) => {
                    // Jika grup Facebook atau item terakhir dan ganjil, buat memanjang (col-span-2)
                    let isFullWidth = g.Judul.toLowerCase().includes('facebook') || (dataGrup.length % 2 !== 0 && index === dataGrup.length - 1);
                    let gridClass = isFullWidth ? 'col-span-2' : '';
                    let layoutClass = isFullWidth ? 'p-3 flex items-center justify-center' : 'py-3 px-2 flex flex-col items-center justify-center';
                    let iconClass = isFullWidth ? 'text-xl mr-3' : 'text-2xl mb-1.5';

                    htmlOutput += `
                    <a href="${g.Link}" target="_blank" class="${gridClass} bg-${g.Warna.replace(/[\[\]#]/g, '')}/10 border border-${g.Warna.replace(/[\[\]#]/g, '')}/20 rounded-2xl text-center active:scale-95 transition-transform ${layoutClass}">
                        <i class="${g.Ikon.includes('fa-') ? g.Ikon : 'fas ' + g.Ikon} text-${g.Warna} ${iconClass}"></i>
                        <div class="${isFullWidth ? 'text-xs' : 'text-[11px]'} font-bold text-white">${g.Judul}</div>
                    </a>`;
                });
                htmlOutput += `</div>`;
            }

            container.innerHTML = htmlOutput;
            isRekberLoaded = true;
            if(forceRefresh) showToast("Data Admin AU2Hub berhasil diperbarui!", "success");

        } else {
            throw new Error("Data Kosong");
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-center py-6 text-xs text-red-500 bg-brand-card rounded-2xl border border-red-500/20">Gagal memuat data dari server.</div>';
    }
}

// Fitur Buka/Tutup Deskripsi di Pusat Informasi
function toggleInfoDesc(idx) {
    const desc = document.getElementById(`info-desc-${idx}`);
    const btn = document.getElementById(`info-btn-${idx}`);
    
    if (desc) {
        if (desc.classList.contains('line-clamp-3')) {
            // Jika sedang tertutup -> Buka
            desc.classList.remove('line-clamp-3');
            if (btn) btn.innerHTML = 'Tutup Selengkapnya ▲';
        } else {
            // Jika sedang terbuka -> Tutup
            desc.classList.add('line-clamp-3');
            if (btn) btn.innerHTML = 'Lihat Selengkapnya ▼';
        }
    }
}


// --- JURUS SWIPE LEADERBOARD ---
let lbTouchStartX = 0;
let lbTouchStartY = 0; // Tambahan untuk mendeteksi sumbu Y (vertikal)
const lbModal = document.getElementById('modal-leaderboard');

lbModal.addEventListener('touchstart', e => {
    lbTouchStartX = e.changedTouches[0].screenX;
    lbTouchStartY = e.changedTouches[0].screenY;
}, {passive: true});

lbModal.addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    let diffX = lbTouchStartX - touchEndX;
    let diffY = lbTouchStartY - touchEndY;
    
    // Validasi: Geser sumbu X harus > 50px DAN Geser sumbu Y harus < 50px (mencegah tab pindah saat sedang scroll ke bawah/atas)
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
        const tabs = ['creator', 'level', 'sultan'];
        let currentTab = '';
        
        // Cek tab mana yang lagi aktif
        if (!document.getElementById('leaderboard-container-creator').classList.contains('hidden')) currentTab = 'creator';
        else if (!document.getElementById('leaderboard-container-level').classList.contains('hidden')) currentTab = 'level';
        else currentTab = 'sultan';

        let currentIndex = tabs.indexOf(currentTab);
        
        if (diffX > 0) { 
            // Swipe ke KIRI = Pindah ke TAB BERIKUTNYA
            if (currentIndex < 2) switchLeaderboardTab(tabs[currentIndex + 1]);
        } else { 
            // Swipe ke KANAN = Pindah ke TAB SEBELUMNYA (TYPO DIPERBAIKI)
            if (currentIndex > 0) switchLeaderboardTab(tabs[currentIndex - 1]); 
        }
    }
}, {passive: true});


// 🔥 FUNGSI PEMBUKA MODAL INVOICE (DIPERBARUI SUPPORT PPOB)
function bukaDetailPesananDinamis(orderId, productName, price, status, tableSource, sellerId, productId) {
    activeOrderIdToPay = orderId;
    activeOrderPriceToPay = price;
    activeOrderNameToPay = productName;
    activeOrderTable = tableSource; 
    
    activeOrderSellerId = (sellerId && sellerId !== 'null' && sellerId !== 'undefined' && String(sellerId).trim() !== '') ? sellerId : null; 
    activeOrderProductId = (productId && productId !== 'null' && productId !== 'undefined' && String(productId).trim() !== '') ? productId : null; 

    // Terjemahkan status Digiflazz ke bahasa UI Laci agar progress bar-nya ngerti
    let visualStatus = status;
    if (tableSource === 'riwayat_ppob') {
        if (status === 'Sukses') visualStatus = 'selesai';
        if (status === 'Pending') visualStatus = 'proses';
        if (status === 'Gagal') visualStatus = 'DIBATALKAN';
    }

    const modal = document.getElementById('modal-detail-pesanan');
    
    document.getElementById('detail-nama-layanan').innerText = productName;
    document.getElementById('detail-harga-layanan').innerText = `Rp ${Number(price).toLocaleString('id-ID')}`;
    
    // Sesuaikan Prefix ID
    const prefixId = tableSource === 'riwayat_ppob' ? 'PPOB' : 'NIKKY';
    document.getElementById('detail-ref-id').innerText = `${prefixId} - ${orderId}`;
    
    const statusBadge = document.getElementById('detail-status-badge');
    const actionBelumBayar = document.getElementById('action-belum-bayar');
    const actionDiproses = document.getElementById('action-diproses');
    const pesanStatusLain = document.getElementById('pesan-status-lain');

    const trackLine = document.getElementById('track-line');
    const dot2 = document.getElementById('step-2-dot');
    const text2 = document.getElementById('step-2-text');
    const dot3 = document.getElementById('step-3-dot');
    const text3 = document.getElementById('step-3-text');

    trackLine.style.transition = 'none';
    trackLine.style.width = '0%';
    
    dot2.className = 'w-7 h-7 rounded-full bg-white/20 border-[3px] border-[#121319] flex items-center justify-center text-gray-400 font-bold text-[10px] transition-colors duration-500';
    dot2.innerHTML = '2'; 
    text2.className = 'text-[9px] font-bold text-gray-500 tracking-widest uppercase transition-colors';
    
    dot3.className = 'w-7 h-7 rounded-full bg-white/20 border-[3px] border-[#121319] flex items-center justify-center text-gray-400 font-bold text-[10px] transition-colors duration-500';
    dot3.innerHTML = '3';
    text3.className = 'text-[9px] font-bold text-gray-500 tracking-widest uppercase transition-colors';

    if (visualStatus === 'PENDING') {
        statusBadge.innerText = 'BELUM BAYAR';
        statusBadge.className = 'bg-red-500/20 text-red-500 border-red-500/50';
        actionBelumBayar.classList.replace('hidden', 'flex'); 
        if(actionDiproses) actionDiproses.classList.replace('flex', 'hidden'); 
        pesanStatusLain.classList.add('hidden'); 
    } else if (visualStatus === 'proses') {
        statusBadge.innerText = 'DIPROSES';
        statusBadge.className = 'bg-brand-info/20 text-brand-info border-brand-info/50';
        actionBelumBayar.classList.replace('flex', 'hidden'); 
        if(actionDiproses) actionDiproses.classList.replace('hidden', 'flex'); 
        pesanStatusLain.classList.remove('hidden'); 
        pesanStatusLain.innerText = tableSource === 'riwayat_ppob' ? 'Transaksi PPOB sedang dalam antrean server provider...' : 'Toko sedang mengerjakan pesananmu. Klik tombol di bawah jika barang sudah diterima.';
    } else if (visualStatus === 'selesai') {
        statusBadge.innerText = 'SELESAI';
        statusBadge.className = 'bg-brand-success/20 text-brand-success border-brand-success/50';
        actionBelumBayar.classList.replace('flex', 'hidden'); 
        if(actionDiproses) actionDiproses.classList.replace('flex', 'hidden'); 
        pesanStatusLain.classList.remove('hidden'); 
        pesanStatusLain.innerText = tableSource === 'riwayat_ppob' ? 'Transaksi PPOB telah sukses diproses oleh provider. Terima kasih!' : 'Pesanan ini telah lunas dan selesai. Terima kasih!';
    } else if (visualStatus === 'DIBATALKAN') {
        statusBadge.innerText = 'DIBATALKAN / GAGAL';
        statusBadge.className = 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        actionBelumBayar.classList.replace('flex', 'hidden'); 
        if(actionDiproses) actionDiproses.classList.replace('flex', 'hidden'); 
        pesanStatusLain.classList.remove('hidden'); 
        pesanStatusLain.innerText = 'Transaksi gagal dan dibatalkan oleh sistem.';
    }
    
    // Khusus PPOB: Sembunyikan tombol "Selesaikan Pesanan" karena PPOB jalan otomatis
    if (tableSource === 'riwayat_ppob') {
        if(actionDiproses) actionDiproses.classList.replace('flex', 'hidden');
    }
    
    // ==========================================
    // NOTA TRANSPARANSI TRANSAKSI & DATA SN
    // ==========================================
    const wadahRincian = document.getElementById('wadah-rincian-transaksi');
    if (wadahRincian) {
        wadahRincian.classList.add('hidden');
        wadahRincian.innerHTML = '<div class="flex justify-center py-2"><i class="fas fa-spinner fa-spin text-brand-info"></i></div>';
        
        // 1. Tarik Data SN / Keterangan dari database berdasarkan tabel yang aktif
        supabaseClient.from(tableSource).select('sn').eq('id', orderId).single()
        .then(({data: extraData}) => {
            const snText = extraData && extraData.sn ? extraData.sn : null;
            let snHTML = '';

            // Jika ada SN dan statusnya selesai/proses, buat UI kotaknya
            if (snText && (visualStatus === 'selesai' || visualStatus === 'proses')) {
                const amanSnText = encodeURIComponent(snText).replace(/'/g, "%27");
                const themeColor = tableSource === 'riwayat_ppob' ? 'brand-info' : 'brand-success';
                const labelSn = tableSource === 'riwayat_ppob' ? 'SN / REFERENSI' : 'DATA PESANAN / KETERANGAN';
                
                snHTML = `
                <div class="mt-4 p-3 bg-${themeColor}/10 border border-${themeColor}/30 rounded-xl relative shadow-inner">
                    <span class="absolute -top-2.5 left-3 bg-${themeColor} text-brand-dark text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">${labelSn}</span>
                    <pre class="text-white text-xs whitespace-pre-wrap break-all font-mono leading-relaxed mt-1 max-h-40 overflow-y-auto hide-scroll">${escapeHTML(snText)}</pre>
                    <button type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${amanSnText}')); this.innerHTML='<i class=\\'fas fa-check\\'></i> Tersalin!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy mr-1\\'></i> Salin Data', 2000);" class="mt-3 w-full bg-${themeColor}/20 text-${themeColor} border border-${themeColor}/30 py-2.5 rounded-lg text-[11px] font-bold active:scale-95 transition-all shadow-sm">
                        <i class="fas fa-copy mr-1"></i> Salin Data
                    </button>
                </div>`;
            }

            // 2. JIKA PPOB, MUNCULKAN NOTA SIMPEL
            if (tableSource === 'riwayat_ppob') {
                wadahRincian.classList.remove('hidden');
                wadahRincian.innerHTML = `
                    <div class="text-[10px] font-extrabold text-gray-400 mb-3 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-bolt text-yellow-400 text-sm"></i> Rincian Pembayaran PPOB</div>
                    <div class="flex justify-between items-center text-[12px] text-white font-black mt-3">
                        <span>Total Potong Saldo</span>
                        <span class="font-mono text-brand-accent tracking-tight">Rp ${Number(price).toLocaleString('id-ID')}</span>
                    </div>
                    ${snHTML}
                `;
            }
            // 3. JIKA PASAR PLAYER, MUNCULKAN NOTA KOMPLEKS SEPERTI BIASA
            else if (tableSource === 'orders_player' || tableSource === 'orders') {
                wadahRincian.classList.remove('hidden');
                
                supabaseClient.from('player_products').select('fee_ditanggung_pembeli').eq('id', activeOrderProductId).single()
                .then(({data}) => {
                    const feeDitanggungPembeli = data ? data.fee_ditanggung_pembeli : false;
                    const isPenjual = (currentUser.id === activeOrderSellerId);
                    let isRekber = productName.includes('[+Rekber]');
                    let feeRekber = isRekber ? hitungFeeRekber(price) : 0;
                    
                    let subtotalBarang = price - feeRekber; 
                    let pajakLapak = 0;
                    let totalDiterimaSeller = subtotalBarang;

                    if (feeDitanggungPembeli) {
                        let hargaDasar = Math.round((subtotalBarang - 500) / 1.007);
                        totalDiterimaSeller = hargaDasar; 
                        pajakLapak = hitungPotonganSeller(hargaDasar); 
                    } else {
                        pajakLapak = hitungPotonganSeller(subtotalBarang);
                        totalDiterimaSeller = subtotalBarang - pajakLapak; 
                    }

                    let htmlRincian = `<div class="text-[10px] font-extrabold text-gray-400 mb-3 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-file-invoice-dollar text-brand-info text-sm"></i> Rincian Pembayaran</div>`;
                    
                    htmlRincian += `<div class="flex justify-between items-center text-[11px] text-gray-300 mb-2">
                        <span>Subtotal Produk</span>
                        <span class="font-mono">Rp ${subtotalBarang.toLocaleString('id-ID')}</span>
                    </div>`;

                    if (isRekber) {
                        htmlRincian += `<div class="flex justify-between items-center text-[11px] text-gray-400 mb-2">
                            <span>Biaya Admin Rekber</span>
                            <span class="font-mono text-brand-info">+ Rp ${feeRekber.toLocaleString('id-ID')}</span>
                        </div>`;
                    }

                    if (isPenjual) {
                        if (feeDitanggungPembeli) {
                            htmlRincian += `<div class="flex justify-between items-center text-[11px] text-gray-400 mb-2">
                                <span>Pajak Lapak <span class="text-[9px] text-gray-500">(Ditanggung Pembeli)</span></span>
                                <span class="font-mono text-gray-500">Rp ${pajakLapak.toLocaleString('id-ID')}</span>
                            </div>`;
                        } else {
                            htmlRincian += `<div class="flex justify-between items-center text-[11px] text-gray-400 mb-2">
                                <span>Pajak Lapak <span class="text-[9px] text-gray-500">(Dipotong dari Anda)</span></span>
                                <span class="font-mono text-red-400">- Rp ${pajakLapak.toLocaleString('id-ID')}</span>
                            </div>`;
                        }
                        htmlRincian += `<div class="flex justify-between items-center text-[12px] text-brand-success font-black mt-3 border-t border-white/10 pt-3">
                            <span>Estimasi Masuk ke Saldo</span>
                            <span class="font-mono tracking-tight">Rp ${totalDiterimaSeller.toLocaleString('id-ID')}</span>
                        </div>`;
                    } else {
                        htmlRincian += `<div class="flex justify-between items-center text-[12px] text-white font-black mt-3 border-t border-white/10 pt-3">
                            <span>Total Tagihan Dibayar</span>
                            <span class="font-mono text-brand-accent tracking-tight">Rp ${Number(price).toLocaleString('id-ID')}</span>
                        </div>`;
                    }
                    
                    // SISIPKAN UI KOTAK SN / DATA PESANAN DI BAWAH RINCIAN HARGA
                    htmlRincian += snHTML;

                    wadahRincian.innerHTML = htmlRincian;
                })
                .catch(() => {
                    wadahRincian.innerHTML = `<div class="text-[10px] text-gray-500 italic text-center py-2">Rincian detail tidak tersedia untuk produk usang.</div>${snHTML}`;
                });
            }
        });
    }


    modal.classList.replace('hidden', 'flex');
    setTimeout(() => { modal.classList.remove('translate-y-full'); }, 10);

    setTimeout(() => {
        trackLine.style.transition = 'all 0.7s ease-in-out';

        if (visualStatus === 'proses') {
            trackLine.style.width = '50%'; 
            dot2.className = 'w-7 h-7 rounded-full bg-brand-info border-[3px] border-[#121319] flex items-center justify-center text-brand-dark shadow-[0_0_10px_rgba(70,179,255,0.5)]';
            dot2.innerHTML = '<i class="fas fa-check text-[10px] font-bold"></i>';
            text2.className = 'text-[9px] font-bold text-white tracking-widest uppercase transition-colors';
        } else if (visualStatus === 'selesai') {
            trackLine.style.width = '100%'; 
            dot2.className = 'w-7 h-7 rounded-full bg-brand-info border-[3px] border-[#121319] flex items-center justify-center text-brand-dark shadow-[0_0_10px_rgba(70,179,255,0.5)]';
            dot2.innerHTML = '<i class="fas fa-check text-[10px] font-bold"></i>';
            text2.className = 'text-[9px] font-bold text-white tracking-widest uppercase transition-colors';
            
            setTimeout(() => {
                dot3.className = 'w-7 h-7 rounded-full bg-brand-info border-[3px] border-[#121319] flex items-center justify-center text-brand-dark shadow-[0_0_10px_rgba(70,179,255,0.5)]';
                dot3.innerHTML = '<i class="fas fa-check text-[10px] font-bold"></i>';
                text3.className = 'text-[9px] font-bold text-white tracking-widest uppercase transition-colors';
            }, 400); 
        }
    }, 150);
    
    history.pushState({ popup: 'detail_pesanan' }, null, '#invoice');
}

// 🔥 FUNGSI MENUTUP MODAL INVOICE (DIPERBARUI DENGAN BACK DETECTION)
function closeDetailPesanan(dariTombolBackHP = false) {
    const modal = document.getElementById('modal-detail-pesanan');
    
    // HENTIKAN PENCARIAN API SAAT LACI DITUTUP AGAR SERVER TIDAK DDOS
    if (intervalJemputBola) {
        clearInterval(intervalJemputBola);
        intervalJemputBola = null;
    }
    
    // --- CEGAH KEBOCORAN WEBSOCKET SUPABASE ---
    if (activeChannelPembayaran) {
        supabaseClient.removeChannel(activeChannelPembayaran);
        activeChannelPembayaran = null;
    }

    if (!dariTombolBackHP && window.location.hash === '#invoice') {
        // Jika dari tombol (X) atau Batal, biarkan history.back() memanggil popstate
        history.back();
    } else {
        // Jika popstate sudah bekerja (Back HP), berikan efek halus sebelum menghilang
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            modal.classList.replace('flex', 'hidden');
            modal.style.opacity = '1'; // Reset untuk dibuka lagi nanti
        }, 300);
    }
}

// EKSEKUSI PEMBATALAN PESANAN DARI DATABASE
async function batalkanPesanan() {
    if (!activeOrderIdToPay) return;
    
    const konfirmasi = await customConfirm("Apakah kamu yakin ingin membatalkan pesanan ini?");
    
    if (konfirmasi) {
        closeDetailPesanan(); // Tutup popup invoice
        showToast("Membatalkan pesanan...", "info");
        
        try {
            // PERBAIKAN: Gunakan 'activeOrderTable' bukan 'orders'
            // Agar bisa membatalkan pesanan baik dari Toko Admin maupun Pasar Player
            const { error } = await supabaseClient.from(activeOrderTable).delete().eq('id', activeOrderIdToPay);
            if (error) throw error;
            
            showToast("Pesanan berhasil dibatalkan.", "success");
            
            // Refresh layar List dan Angka Badge di Profile
            cekStatusPesanan('bayar'); 
            loadOrderTracker(currentUser.id); 
            
        } catch (err) {
            showToast("Gagal membatalkan pesanan.", "error");
        }
    }
}


// EKSEKUSI PENYELESAIAN PESANAN DARI PEMBELI (VERSI FINAL)
async function selesaikanPesanan() {
    if (!activeOrderIdToPay) return;
    
    let pesanKonfirmasi = "Pesanan sudah dikerjakan dan diterima dengan baik?";
    if (activeOrderTable === 'orders_player') {
        pesanKonfirmasi += "\n\nDana akan masuk ke Saldo Tertahan Penjual dan cair dalam 24 jam.";
    }
    
    const konfirmasi = await customConfirm(pesanKonfirmasi);
    if (!konfirmasi) return;
    
    closeDetailPesanan(); 
    showToast("Menyelesaikan pesanan...", "info");
    
    try {
        const waktuSekarang = new Date().toISOString();
        
        // Hanya update 'status' untuk order Admin
        let dataUpdate = { 
            status: 'selesai' 
        };

        // HANYA masukkan 'waktu_selesai' dan 'dana_cair' jika ini transaksi di Pasar Player
        if (activeOrderTable === 'orders_player') {
            dataUpdate.waktu_selesai = waktuSekarang;
            dataUpdate.dana_cair = false;
        }
        
        const { error: orderError } = await supabaseClient
            .from(activeOrderTable) 
            .update(dataUpdate)
            .eq('id', activeOrderIdToPay);

        if (orderError) throw orderError;

        if (activeOrderTable === 'orders_player') {
            showToast("Pesanan selesai! Dana masuk ke Saldo Tertahan Penjual (H+1).", "success");
        } else {
            showToast("Pesanan selesai! Terima kasih.", "success");
        }
        
        tambahExp(50);
        // 🔥 FIX: Otomatis pindahkan layar user ke tab "SELESAI" agar tidak panik
        cekStatusPesanan('selesai'); 
        loadOrderTracker(currentUser.id); 
        
    } catch (err) {
        showToast("Gagal menyelesaikan pesanan: " + err.message, "error");
    }
}


async function checkoutXoftwarePay(namaProduk, harga, deskripsi, sellerId = null, productId = null, isBayarUlang = false) {
    if (!currentUser) return showToast("Silakan login dulu untuk membeli!", "error");

    // 1. CEGAH POPUP DOBEL (Hanya nanya kalau ini beli langsung)
     if (!isBayarUlang) {
         const konfirmasi = await customConfirm(`Lanjutkan pesanan untuk:\n\n${namaProduk}\n\nTotal: Rp ${harga.toLocaleString('id-ID')} via QRIS Otomatis?`);
         if (!konfirmasi) return;
     }

     // SUNTIKAN BARU: Daftarkan ke riwayat HP agar tombol Back terdeteksi
     history.pushState({ popup: 'pembayaran' }, null, '#pembayaran');
     
     switchTab('pembayaran');
    
    const wadahPembayaran = document.getElementById('qris-container');
    if (wadahPembayaran) {
        wadahPembayaran.innerHTML = `
        <div class="text-center flex flex-col items-center w-full mt-6">
            <div class="relative flex flex-col items-center mb-6">
                <div class="absolute inset-0 bg-brand-accent opacity-30 animate-pulse rounded-full" style="filter: blur(30px);"></div>
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-28 h-28 relative z-10 splash-logo-anim drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]" alt="Loading">
            </div>
            <p class="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase mt-4 animate-pulse">Menghubungkan ke Gateway...</p>
        </div>`;
    }

    try {
        const targetTabel = sellerId ? 'orders_player' : 'orders';
        let orderData;

        // 2. CEGAH ERROR 404 (Kita pakai ID yang sudah ada)
        if (isBayarUlang) {
            // Update ID produknya agar bot Auto-Delivery gak buta
            await supabaseClient.from(targetTabel).update({ product_id: productId, status: 'PENDING' }).eq('id', activeOrderIdToPay);
            orderData = { id: activeOrderIdToPay }; 
        } else {
            const dataInsert = { user_id: currentUser.id, product_name: namaProduk, price: harga, status: 'PENDING', product_id: productId };
            if (sellerId) dataInsert.seller_id = sellerId;
            const { data: newOrder, error: orderError } = await supabaseClient.from(targetTabel).insert(dataInsert).select().single();
            if (orderError) throw orderError;
            orderData = newOrder;
        }

        const responsePG = await fetch('/api/create-qris', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderData.id, amount: harga, product_name: namaProduk, customer_name: userProfile?.nickname || 'Player' })
        });

        const dataPG = await responsePG.json();
        if (!dataPG.success) throw new Error("Gagal mengambil tagihan Xoftware");

        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dataPG.qris_string)}`;

        let noWA = "6283815584661"; 
        let sapaan = "Admin";
        
        if (sellerId && !namaProduk.includes('[+Rekber]')) {
            const { data: pSeller } = await supabaseClient.from('profiles').select('whatsapp').eq('id', sellerId).single();
            if (pSeller && pSeller.whatsapp) {
                noWA = pSeller.whatsapp;
                sapaan = "Penjual"; 
            }
        }

        const teksWA = encodeURIComponent(`Halo ${sapaan}, pesanan saya sudah masuk via QRIS Otomatis untuk:\n\n*${namaProduk}*\nID: ADT - ${orderData.id}\n\n(Berikut screenshot bukti transfernya)`);

        if (wadahPembayaran) {
            wadahPembayaran.innerHTML = `
                <div class="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-brand-info/10 to-transparent pointer-events-none z-0"></div>
                <div class="text-[9px] font-extrabold text-white bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-widest mb-6 relative z-10 backdrop-blur-sm">XOFTWARE PAY</div>
                <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 relative z-10">Total Tagihan</div>
                <div class="flex items-center justify-center gap-3 mb-6 relative z-10 w-full px-6">
                    <div id="pay-total" class="text-4xl font-black text-white tracking-tighter drop-shadow-md truncate">Rp ${harga.toLocaleString('id-ID')}</div>
                    <button onclick="salinNominal()" id="btn-salin" class="bg-brand-info/20 text-brand-info w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all shrink-0"><i class="fas fa-copy text-xs"></i></button>
                    <input type="hidden" id="nominal-asli" value="${harga}">
                </div>
                
                <div class="bg-white p-4 rounded-[1.5rem] mb-6 shadow-[0_0_40px_rgba(255,255,255,0.15)] relative z-10 group overflow-hidden">
                    <img id="qris-image-target" src="${qrImgUrl}" alt="QRIS" class="w-48 h-48 object-cover rounded-xl relative z-10">
                </div>
                
                <div class="w-full bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 relative z-10 text-left">
                    <div class="flex justify-between items-start text-xs mb-2"><span class="text-gray-400 shrink-0">Pesanan</span><span class="text-white font-bold text-right pl-4 line-clamp-2">${namaProduk}</span></div>
                    <div class="flex justify-between items-center text-xs border-t border-white/5 pt-2"><span class="text-gray-400">Admin Rekber</span><span class="text-brand-success font-bold flex items-center gap-1"><i class="fas fa-shield-check"></i> NIKKY (Aman)</span></div>
                </div>
                
                <a id="wa-confirm" href="https://wa.me/${noWA}?text=${teksWA}" target="_blank" class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-xl font-extrabold uppercase text-xs shadow-[0_10px_20px_rgba(37,211,102,0.3)] flex justify-center items-center active:scale-95 transition-all relative z-10 tracking-wider">
                    <i class="fab fa-whatsapp text-lg mr-2"></i> Konfirmasi ke ${sapaan}
                </a>

                <!-- 🔥 FIX: type="button" ditambahkan untuk mencegah Status 0 (Browser Request Cancelled) -->
                <button type="button" onclick="cekStatusManualXoftware('${orderData.id}', '${targetTabel}', this)" class="w-full bg-white/5 hover:bg-white/10 text-white py-3 mt-3 rounded-xl font-bold uppercase text-[11px] border border-white/20 active:scale-95 transition-all relative z-10">
                    <i class="fas fa-sync-alt mr-2"></i> Saya Sudah Bayar
                </button>
            `;
        }

        showToast("Silakan scan QRIS untuk melanjutkan.", "success");

        // 🔥 FIX: Variabel duplikat sudah dihapus
        let isLayarSuksesTampil = false;
        
        window.tampilkanLayarSuksesFinal = () => {
            if (!isLayarSuksesTampil) tampilkanLayarSukses();
        };

        const tampilkanLayarSukses = async () => {
            if (isLayarSuksesTampil) return;
            isLayarSuksesTampil = true;

            if (wadahPembayaran) {
                wadahPembayaran.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 mt-10">
                        <i class="fas fa-spinner fa-spin text-brand-success text-5xl mb-4"></i>
                        <p class="text-white font-bold animate-pulse tracking-wide">Mengonfirmasi Pembayaran...</p>
                    </div>`;
            }

            let autoDeliveryContent = null;
            let isAutoItem = false;

            try {
                if (!namaProduk.includes('[VIP]')) {
                    autoDeliveryContent = await prosesAutoDeliveryTertunda();

                    let targetProdId = productId || activeOrderProductId;
                    if (targetProdId && targetProdId !== 'null' && targetProdId !== 'undefined' && String(targetProdId).trim() !== '') {
                        const { data: prodInfo, error: errProd } = await supabaseClient.from('player_products').select('category').eq('id', targetProdId).single();
                        
                        if (prodInfo && !errProd) {
                            const kat = (prodInfo.category || '').toLowerCase(); 
                            if (kat === 'akun' || kat === 'item' || kat === 'apk premium') {
                                isAutoItem = true;
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Pengecekan kategori auto-delivery dilewati. Menggunakan layar sukses standar.", err);
            }

            if (wadahPembayaran) {
                const noWA_Sukses = noWA; 
                const teksWA_Sukses = encodeURIComponent(`Halo ${sapaan}, pesanan saya sudah BERHASIL DIBAYAR via QRIS Otomatis untuk:\n\n*${namaProduk}*\nID: ADT - ${orderData.id}\n\n(Mohon segera diproses ya)`);

                if (isAutoItem && autoDeliveryContent && autoDeliveryContent !== "") { 
                    
// JURUS ANTI ERROR: Ubah semua enter & simbol jadi satu baris kode rahasia
const dataAman = encodeURIComponent(autoDeliveryContent).replace(/'/g, "%27");

// [BARU] 1. Amankan teks dari kode berbahaya, 2. Sulap URL menjadi link hidup
let htmlDataPesanan = escapeHTML(autoDeliveryContent).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-info underline font-bold hover:text-white transition-colors">$1</a>'
);


            wadahPembayaran.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4 text-center modal-anim w-full relative z-10">
                    <div class="w-16 h-16 bg-brand-success/20 rounded-full flex items-center justify-center border border-brand-success/50 mb-4 shadow-[0_0_15px_rgba(37,211,102,0.5)]">
                        <i class="fas fa-check text-3xl text-brand-success"></i>
                    </div>
                    <h2 class="text-2xl font-black text-white mb-1 tracking-tight">Pesanan Berhasil!</h2>
                    <p class="text-gray-400 text-[11px] mb-4">Ini adalah detail data pesanan otomatis Anda:</p>
                    
                    <div class="w-full bg-black/50 border border-brand-info/50 rounded-xl p-4 text-left mb-6 relative">
                        <span class="absolute -top-2.5 left-4 bg-brand-info text-brand-dark text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">DATA PESANAN</span>
                        
                        <pre class="text-white text-xs whitespace-pre-wrap break-all font-mono leading-relaxed mt-2 max-h-40 overflow-y-auto hide-scroll" style="font-family: monospace;">${htmlDataPesanan}</pre>
                        
                        <button type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${dataAman}')); this.innerHTML='<i class=\\'fas fa-check\\'></i> Tersalin!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy mr-1\\'></i> Salin Data', 2000);" class="mt-4 w-full bg-brand-info/10 text-brand-info border border-brand-info/30 py-2.5 rounded-lg text-[11px] font-bold active:scale-95 transition-all">
                            <i class="fas fa-copy mr-1"></i> Salin Data
                        </button>
                    </div>

                            <p class="text-[9px] text-gray-500 mb-4 italic">*Data ini juga otomatis tersimpan di fitur Chat (Inbox) Anda.</p>
                            
                            <button type="button" onclick="tutupLayarSuksesDanRefresh()" class="w-full bg-white/5 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/10 hover:bg-white/10 active:scale-95 transition-all">Tutup Halaman</button>
                        </div>
                    `;
                } else {
                
                    wadahPembayaran.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-4 text-center modal-anim w-full relative z-10">
                            <div class="relative w-28 h-28 mb-6 mt-4">
                                <div class="absolute inset-0 bg-brand-success rounded-full animate-ping opacity-20"></div>
                                <div class="w-full h-full bg-brand-success/20 rounded-full flex items-center justify-center border border-brand-success/50 backdrop-blur-md">
                                    <i class="fas fa-check text-5xl text-brand-success drop-shadow-[0_0_15px_rgba(37,211,102,0.8)]"></i>
                                </div>
                            </div>
                            <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Sukses!</h2>
                            <p class="text-gray-400 text-xs mb-8 leading-relaxed px-4">Pembayaran senilai <b class="text-white">Rp ${harga.toLocaleString('id-ID')}</b> telah diterima sistem.</p>
                            
                            <a href="https://wa.me/${noWA_Sukses}?text=${teksWA_Sukses}" target="_blank" class="w-full mb-3 bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-xl font-extrabold uppercase tracking-wider text-xs shadow-[0_10px_20px_rgba(37,211,102,0.3)] flex justify-center items-center active:scale-95 transition-all">
                                <i class="fab fa-whatsapp text-lg mr-2"></i> Hubungi ${sapaan}
                            </a>

                            <button type="button" onclick="tutupLayarSuksesDanRefresh()" class="w-full bg-white/5 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/10 hover:bg-white/10 active:scale-95 transition-all">Tutup Halaman</button>
                        </div>
                    `;
                }
            }
            
            if (namaProduk.includes('[VIP]')) {
                let durasiSementara = 30;
                if (namaProduk.includes('1 Tahun')) durasiSementara = 365;
                else if (namaProduk.match(/(\d+)\s+Bulan/i)) durasiSementara = parseInt(namaProduk.match(/(\d+)\s+Bulan/i)[1]) * 30;
                else if (namaProduk.match(/(\d+)\s+Hari/i)) durasiSementara = parseInt(namaProduk.match(/(\d+)\s+Hari/i)[1]);
                
                localStorage.setItem('optimistic_vip', `${currentUser.id}_${durasiSementara}`);
                const btnTutup = wadahPembayaran.querySelector('button[onclick="tutupLayarSuksesDanRefresh()"]');
                if (btnTutup) {
                    btnTutup.onclick = () => {
                        history.back(); 
                        setTimeout(() => { switchTab('toko'); loadTokoSaya(); }, 300);
                    };
                }
                setTimeout(() => { localStorage.removeItem('optimistic_vip'); fetchProfile(); }, 60000);
            }
        };

        activeChannelPembayaran = supabaseClient.channel(`tunggu-pembayaran-${orderData.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: targetTabel, filter: `id=eq.${orderData.id}` }, (payload) => {
                const statusBaru = String(payload.new.status).toUpperCase();
                if (statusBaru === 'SELESAI' || statusBaru === 'SUCCESS' || statusBaru === 'PROSES' || statusBaru === 'PAID') {
                    tampilkanLayarSukses();
                    supabaseClient.removeChannel(activeChannelPembayaran);
                    clearInterval(intervalJemputBola);
                }
            }).subscribe();

        intervalJemputBola = setInterval(async () => {
            try {
                const res = await fetch(`/api/check-status?order_id=${orderData.id}&table=${targetTabel}&_t=${Date.now()}`);
                const responseData = await res.json();
                
                const apiStatus = String(responseData.status || responseData.data?.status || responseData.payment_status || '').toUpperCase();
                
                if (apiStatus === 'SUCCESS' || apiStatus === 'SUCCEEDED' || apiStatus === 'PAID' || apiStatus === 'SELESAI' || apiStatus === 'PROSES') {
                    clearInterval(intervalJemputBola); 
                    supabaseClient.removeChannel(activeChannelPembayaran);
                    tampilkanLayarSukses(); 
                }
            } catch (e) {}
        }, 10000);
        
        setTimeout(() => clearInterval(intervalJemputBola), 600000);

    } catch (error) {
        console.error("Detail Error QRIS:", error);
        showToast("Error: " + (error.message || "Gangguan Server/Koneksi Pembayaran"), "error");
        
        setTimeout(() => {
            history.back();
        }, 3000); 
    }
}

async function prosesBayarUlang() {
    if (!activeOrderIdToPay) return;
    
    // HANYA 1 KONFIRMASI DI SINI
    const konfirmasi = await customConfirm(`Lanjutkan pembayaran untuk:\n\n${activeOrderNameToPay}?`);
    if (!konfirmasi) return;

    showToast("Memperbarui tagihan...", "info");

    try {
        // 🔥 JURUS PENYELAMAT PESANAN LAMA: Cari paksa ID barang yang hilang!
        let safeProductId = activeOrderProductId;
        if (!safeProductId || safeProductId === 'null' || safeProductId === 'undefined' || String(safeProductId).trim() === '') {
            let cleanName = activeOrderNameToPay.replace('[PASAR] ', '').replace(/ \[\+Rekber\]/g, '').replace(/ \(x\d+\)$/, '').split(' - ')[0].trim();
            
            const { data: searchProd } = await supabaseClient.from('player_products')
                .select('id')
                .ilike('title', `%${cleanName}%`)
                .limit(1);

            if (searchProd && searchProd.length > 0) {
                safeProductId = searchProd[0].id;
                activeOrderProductId = safeProductId; // Update global
            }
        }

        // TUTUP LACI INVOICE & RIWAYAT FISIK SECARA PAKSA (Anti-bug animasi history.back)
        const modalInvoice = document.getElementById('modal-detail-pesanan');
        if (modalInvoice) { modalInvoice.classList.add('hidden'); modalInvoice.classList.remove('flex'); }
        const modalRiwayat = document.getElementById('modal-riwayat-pesanan');
        if (modalRiwayat) { modalRiwayat.classList.add('hidden'); modalRiwayat.classList.remove('flex'); }

        if (intervalJemputBola) { clearInterval(intervalJemputBola); intervalJemputBola = null; }
        if (activeChannelPembayaran) { supabaseClient.removeChannel(activeChannelPembayaran); activeChannelPembayaran = null; }

        // PANGGIL CHECKOUT DENGAN MODE BAYAR ULANG (True)
        // Ini tidak akan menghapus ID lama, tidak membuat ID baru, dan tidak nanya 2x!
        checkoutXoftwarePay(
            activeOrderNameToPay, 
            activeOrderPriceToPay, 
            "Melanjutkan pembayaran tertunda.", 
            activeOrderSellerId, 
            safeProductId,
            true // <--- KUNCI PENYELAMAT
        );

    } catch (error) {
        showToast("Gagal memperbarui tagihan.", "error");
        console.error(error);
    }
}

async function prosesAutoDeliveryTertunda() {
    if (!currentUser) return null;
    let hasilDataAkun = ""; 

    try {
        // Cari pesanan yang sukses dibayar
        const { data: pendingOrders } = await supabaseClient
            .from('orders_player')
            .select('*')
            .eq('user_id', currentUser.id)
            .in('status', ['SUCCESS', 'PAID', 'proses']);

        if (pendingOrders && pendingOrders.length > 0) {
            for (let order of pendingOrders) {
                let activeProductId = order.product_id;

                // JURUS PENYELAMAT PESANAN LAMA
                if (!activeProductId || activeProductId === 'null' || activeProductId === 'undefined' || String(activeProductId).trim() === '') {
                    let cleanName = order.product_name.replace('[PASAR] ', '').replace(/ \[\+Rekber\]/g, '').replace(/ \(x\d+\)$/, '').split(' - ')[0].trim();
                    const { data: searchProd } = await supabaseClient.from('player_products').select('id').ilike('title', `%${cleanName}%`).limit(1);
                    
                    if (searchProd && searchProd.length > 0) {
                        activeProductId = searchProd[0].id;
                        await supabaseClient.from('orders_player').update({ product_id: activeProductId }).eq('id', order.id);
                    } else {
                        if (order.status !== 'proses') await supabaseClient.from('orders_player').update({ status: 'proses' }).eq('id', order.id);
                        continue;
                    }
                }

                // Tarik data stok dan S&K dari produk
                const { data: prodData, error: prodErr } = await supabaseClient
                    .from('player_products')
                    .select('stock_list, category, user_id, snk')
                    .eq('id', activeProductId)
                    .single();

                if (prodErr || !prodData) continue; // Abaikan jika produk sudah dihapus seller

                const isAutoItem = prodData && (prodData.category === 'Akun' || prodData.category === 'Item' || prodData.category === 'APK Premium');

                if (!isAutoItem) {
                    if (order.status !== 'proses') {
                        await supabaseClient.from('orders_player').update({ status: 'proses' }).eq('id', order.id);
                    }
                    continue;
                }

                // --- LOGIKA AUTO DELIVERY ---
                let autoDeliveryData = [];
                
                if (prodData.stock_list) {
                    let lines = prodData.stock_list.split(/\r?\n/).filter(l => l.trim() !== '');
                    
                    let qty = 1;
                    const matchQty = order.product_name.match(/\(x(\d+)\)/);
                    if (matchQty) qty = parseInt(matchQty[1]);

                    if (lines.length >= qty) {
                        for (let i = 0; i < qty; i++) {
                            autoDeliveryData.push(lines.shift());
                        }
                        
                        const newStockList = lines.join('\n');
                        
                        // 🔥 KUNCI PERBAIKAN: Jika update stok ditolak database, TETAP berikan datanya ke pembeli!
                        const { error: errUpdate } = await supabaseClient.rpc('potong_stok_otomatis', {
                            p_product_id: activeProductId,
                            p_new_stock: newStockList
                        });
                            
                        if (errUpdate) {
                            console.error("Gagal update stok otomatis via RPC. Pastikan RPC potong_stok_otomatis di Supabase berstatus SECURITY DEFINER.", errUpdate);
                        }

                        // ---> BERIKAN DATANYA KE PEMBELI <---
                        const detailItem = autoDeliveryData.join('\n\n');
                        let teksFinalData = detailItem;
                        let snkText = String(prodData.snk || ""); 

                        if (snkText && snkText.trim() !== '' && snkText !== 'null' && snkText !== 'undefined') {
                            const tambahanSnk = `\n\n━━━━━━━━━━━━━━━━━━\n📋 *Syarat & Ketentuan Penjual:*\n${snkText.trim()}`;
                            
                            // 1. Masukkan ke Inbox Chat
                            teksFinalData += tambahanSnk;
                            
                            // 2. Masukkan ke Layar Hijau
                            autoDeliveryData.push(tambahanSnk); 
                        }

                        // Simpan semua data yang sudah digabung ke Layar Hijau
                        hasilDataAkun += autoDeliveryData.join('\n') + "\n\n"; 

                        await supabaseClient.from('messages').insert({
                            sender_id: currentUser.id, 
                            receiver_id: order.seller_id,
                            message: `[SISTEM] Transaksi Selesai! Sistem telah mengirimkan data otomatis ke pembeli untuk pesanan: *${order.product_name}*\n\n${teksFinalData}`
                        });

                    } else {
                        await supabaseClient.from('messages').insert({
                            sender_id: currentUser.id,
                            receiver_id: order.seller_id,
                            message: `[SISTEM] Pembeli telah membayar pesanan *${order.product_name}*, namun sisa stok otomatis di etalase tidak mencukupi untuk dikirim.\n\nHarap segera hubungi pembeli dan proses pengiriman barang secara MANUAL.`
                        });
                    }
                } 

                const finalStatus = (autoDeliveryData.length > 0) ? 'selesai' : 'proses';

if (finalStatus === 'selesai') {
    const waktuSelesaiBot = new Date().toISOString();
    await supabaseClient.from('orders_player')
        .update({ 
            status: finalStatus, 
            waktu_selesai: waktuSelesaiBot, 
            dana_cair: false,
            sn: teksFinalData // <--- SUNTIKAN BARU: Simpan data ke kolom 'sn'
        })
        .eq('id', order.id);
} else if (order.status !== 'proses') {
                    await supabaseClient.from('orders_player').update({ status: 'proses' }).eq('id', order.id);
                }
            }
        }
    } catch (e) {
        console.error("Auto delivery crash dicancel aman:", e);
    }
    
    return hasilDataAkun.trim(); 
}

// FUNCTIONS UNTUK KONTROL ANIMASI BUKA TUTUP LACI MENU
function openAssistiveMenu() {
    const menu = document.getElementById('assistive-menu');
    const box = menu.querySelector('div');
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    setTimeout(() => {
        menu.classList.remove('opacity-0');
        box.classList.remove('scale-90');
        box.classList.add('scale-100');
    }, 10);
}

function closeAssistiveMenu() {
    const menu = document.getElementById('assistive-menu');
    const box = menu.querySelector('div');
    menu.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-90');
    setTimeout(() => {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }, 300);
}

// EKSEKUTOR KLIK MENU
function executeAssistive(target) {
    closeAssistiveMenu(); // Tutup dulaan laci AssistiveTouch
    if (target === 'leaderboard') {
        openLeaderboardModal(); // Panggil fungsi bawaan lu
    } else {
        switchTab(target); // Pindah tab murni bawaan lu
    }
}

// Fungsi menyalin URL / Membuka menu Share bawaan OS (iOS/Android)
async function copyLinkLaciAktif(btn) {
    const currentUrl = window.location.href; 
    
    // Mengambil nama produk dari laci yang sedang terbuka agar teks share lebih menarik
    const judulProduk = document.getElementById('detail-product-title').innerText || "Layanan AU2Hub";

    // 1. Cek apakah HP/Browser mendukung fitur Share bawaan sistem
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AU2Hub',
                text: `Cek ${judulProduk} di AU2Hub sekarang!`,
                url: currentUrl
            });
            // Tidak perlu memunculkan toast karena OS HP sudah memunculkan menu sendiri
        } catch (err) {
            // Error biasa terjadi kalau user menekan tombol "Batal / Cancel" di menu Share HP-nya
            console.log("Membagikan dibatalkan.", err);
        }
    } 
    // 2. FALLBACK: Jika dibuka di PC atau browser yang tidak mendukung, kembali ke sistem "Copy Link"
    else {
        navigator.clipboard.writeText(currentUrl).then(() => {
            showToast("Link laci berhasil disalin!", "success");
            
            // Animasi ikon berubah jadi centang
            const icon = btn.querySelector('i');
            icon.className = 'fas fa-check text-brand-success';
            setTimeout(() => {
                icon.className = 'fas fa-share-alt';
            }, 2000);
        }).catch(() => {
            showToast("Gagal menyalin link otomatis", "error");
        });
    }
}

// ==========================================
// FITUR TERUSKAN PESAN (FORWARD) WHATSAPP STYLE
// ==========================================

// 1. Eksekusi Tombol "Teruskan Pesan" di Modal Opsi (Disederhanakan)
document.getElementById('btn-forward-msg').addEventListener('click', () => {
    if (!selectedMessageId) return;

    // Langsung tutup modal opsi dan buka laci kontak (Tanpa pusing membaca HTML layar)
    closeMsgOptions(); 
    
    history.pushState({ popup: 'forward_msg' }, null, '#forward'); // <-- JEJAK URL BARU
    document.getElementById('modal-forward-msg').classList.remove('hidden');
    document.getElementById('modal-forward-msg').classList.add('flex');
    loadForwardContacts(); 
});


// 2. Fungsi Me-render Daftar Kontak ke Layar
function loadForwardContacts(searchQuery = '') {
    const container = document.getElementById('forward-list-container');
    
    // Gabungkan Grup dan Personal Chat yang pernah berinteraksi
    let allContacts = [...globalGroupList, ...globalPersonalList];
    
    // Logika Filter (Pencarian Instan)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allContacts = allContacts.filter(c => c.name.toLowerCase().includes(query));
    }

    // Render ke HTML
    if (allContacts.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-gray-500 mt-10">Kontak tidak ditemukan.</p>';
        return;
    }

    container.innerHTML = allContacts.map(contact => {
        const isGroup = contact.type === 'group';
        return `
        <div onclick="executeForward('${contact.id}', ${isGroup}, '${escapeHTML(contact.name).replace(/&#39;/g, "\\'")}')" class="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all border-b border-white/5">
            <div class="flex items-center">
                <img src="${contact.avatar}" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
                <div class="ml-3">
                    <h4 class="font-bold text-white text-xs">${contact.name}</h4>
                    <p class="text-[9px] text-gray-500">${isGroup ? 'Grup' : 'Chat Pribadi'}</p>
                </div>
            </div>
            <button class="w-8 h-8 rounded-full bg-brand-info/20 text-brand-info flex items-center justify-center active:scale-90 transition-all">
                <i class="fas fa-share"></i>
            </button>
        </div>`;
    }).join('');
}

// 3. Eksekusi Pengiriman Pesan (Langsung Tarik dari Database)
async function executeForward(targetId, isGroup, targetName) {
    const confirmSend = await customConfirm(`Teruskan pesan ini ke ${targetName}?`);
    if (!confirmSend) return;

    closeForwardModal(); 
    showToast(`Meneruskan pesan ke ${targetName}...`, "info");

    try {
        // 1. Tarik isi pesan asli secara real-time dari database
        const { data: originalMsg, error: fetchErr } = await supabaseClient
            .from('messages')
            .select('message')
            .eq('id', selectedMessageId)
            .single();

        if (fetchErr || !originalMsg) throw new Error("Gagal membaca pesan asli dari server.");

        let rawMessage = originalMsg.message;

        // 2. Bersihkan kotak [REPLY] (WhatsApp biasanya menghilangkan konteks balasan saat pesan diforward)
        const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const match = rawMessage.match(replyRegex);
        if (match) {
            rawMessage = match[4]; 
        }

        // Bersihkan tag [FORWARDED] lama (Jika mem-forward pesan yang sudah diforward, tagnya jangan dobel)
        rawMessage = rawMessage.replace(/^\[FORWARDED\]\n?/, '').trim();

        // 3. Sisipkan kode rahasia [FORWARDED] di awal pesan
        const finalMessage = `[FORWARDED]\n${rawMessage}`;

        // 4. Siapkan Payload Database untuk dikirim
        const insertData = { 
            sender_id: currentUser.id, 
            message: finalMessage 
        };
        
        if (isGroup) {
            insertData.group_id = targetId;
        } else {
            insertData.receiver_id = targetId;
        }

        // 5. Tembak ke Supabase
        const { error } = await supabaseClient.from('messages').insert(insertData);
        if (error) throw error;

        showToast("Pesan berhasil diteruskan!", "success");
        loadChatList(); 

    } catch (err) {
        showToast(err.message, "error");
    }
}




// 4. Fungsi Menutup Modal
function closeForwardModal(dariTombolBack = false) {
    const modal = document.getElementById('modal-forward-msg');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset Data
    document.getElementById('forward-search-input').value = ''; 
    messageToForward = ""; 

    // <-- SINKRONISASI TOMBOL BACK HP
    if (!dariTombolBack && window.location.hash === '#forward') {
        history.back();
    }
}

// 5. Event Listener Kotak Pencarian Kontak
document.getElementById('forward-search-input').addEventListener('input', debounce((e) => {
    loadForwardContacts(e.target.value);
}, 300));

// ==========================================
// FITUR SWIPE (GESER) UNTUK WIDGET CHAT
// ==========================================
let chatSwipeStartX = 0;
let chatSwipeStartY = 0;

document.addEventListener('DOMContentLoaded', () => {
    const chatListView = document.getElementById('chat-list-view');
    
    if (chatListView) {
        // Tangkap kordinat awal saat layar disentuh
        chatListView.addEventListener('touchstart', e => {
            chatSwipeStartX = e.changedTouches[0].screenX;
            chatSwipeStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        // Tangkap kordinat saat jari dilepas dan eksekusi geseran
        chatListView.addEventListener('touchend', e => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;
            
            let diffX = chatSwipeStartX - touchEndX;
            let diffY = chatSwipeStartY - touchEndY;
            
            // Validasi: Jarak geser horizontal harus > 50px, dan vertikal harus < 50px 
            // (Ini agar tidak bentrok saat user niatnya scroll list chat ke bawah/atas)
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
                const tabs = ['personal', 'group', 'status'];
                let currentTab = '';
                
                // Deteksi tab mana yang sedang terbuka
                if (!document.getElementById('chat-personal-container').classList.contains('hidden')) {
                    currentTab = 'personal';
                } else if (!document.getElementById('chat-group-container').classList.contains('hidden')) {
                    currentTab = 'group';
                } else {
                    currentTab = 'status';
                }

                let currentIndex = tabs.indexOf(currentTab);
                
                if (diffX > 0) { 
                    // Geser jari ke KIRI = Pindah ke Tab KANAN (Selanjutnya)
                    if (currentIndex < 2) switchChatTab(tabs[currentIndex + 1]);
                } else { 
                    // Geser jari ke KANAN = Pindah ke Tab KIRI (Sebelumnya)
                    if (currentIndex > 0) switchChatTab(tabs[currentIndex - 1]); 
                }
            }
        }, {passive: true});
    }
});

// ========================================================
// FUNGSI KHUSUS UNTUK MEMBUKA VIDEO DARI LINK SHARE
// ========================================================
function bukaVideoShare(vidId) {
    // 1. Cari data videonya dari database lokal
    const targetVideo = allVideosData.find(v => v.id === vidId);
    if (!targetVideo) {
        showToast("Video yang dibagikan tidak ditemukan atau sudah dihapus.", "error");
        return;
    }

    // 2. Kumpulkan semua video milik kreator yang sama
    currentProfileVideos = allVideosData.filter(v => v.user_id === targetVideo.user_id).reverse();
    
    // Cari urutan ke berapa video ini di profil kreator tersebut
    let targetIndex = currentProfileVideos.findIndex(v => v.id === vidId);
    if (targetIndex === -1) targetIndex = 0;

    // 3. Bersihkan layar floating player (Layar Hitam) beserta memorinya
    const container = document.getElementById('floating-feed-container');
    container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    container.innerHTML = '';
    container.scrollTop = 0;

    // 4. HENTIKAN DAN CABUT SRC VIDEO DI FEED UTAMA AGAR BENAR-BENAR MATI (FIX DOUBLE AUDIO)
    document.querySelectorAll('.video-player').forEach(v => {
        v.pause();
        v.muted = true;
        // Simpan URL sebelum dihapus agar bisa dimuat lagi nanti saat pop-up ditutup
        let currentUrl = v.currentSrc || v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
        if (currentUrl && currentUrl.length > 5) {
            v.dataset.savedSrc = currentUrl;
        }
        v.removeAttribute('src'); 
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load(); // Paksa browser membuang video dari memori saat itu juga
    });

    // [BARU] Paksa suara menyala (unmute) otomatis dari link share
    isGlobalMuted = false;

    // 5. Munculkan Layar Hitam (Floating Player) secara instan!
    const floatingPlayer = document.getElementById('floating-video-player');
    floatingPlayer.classList.remove('hidden');
    floatingPlayer.classList.add('flex');
    floatingPlayer.style.opacity = '1';

    if (floatObs) floatObs.disconnect();
    setupFloatVideoObserver();

    // 6. Render Video
    profileFeedIndex = 0;
    renderProfileVideoBatch(targetIndex + 3);

    // 7. Paksa scroll layar
    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 100);

    // 8. Tanamkan URL history
    history.pushState({ popup: 'floating_video' }, null, '#profil_video');
}
// Variabel Global
let globalDataPasar = [];
let idPenjualAktif = null;
let kategoriPasarAktif = 'Semua'; // Variabel baru untuk filter

document.addEventListener('DOMContentLoaded', () => {
    // Jalankan sistem pembaca input Rupiah dan auto-load data
    setTimeout(() => {
        const searchInput = document.getElementById('cari-pasar');
        if (searchInput) searchInput.addEventListener('input', debounce(terapkanFilterPasar, 300));

        const jualanHarga = document.getElementById('jualan-harga');
        const editHarga = document.getElementById('edit-produk-harga');
        if(jualanHarga) jualanHarga.addEventListener('input', formatInputRupiah);
        if(editHarga) editHarga.addEventListener('input', formatInputRupiah);
    }, 500);

    loadPasarPlayer();
});


// ==========================================
// RENDER KATEGORI GRID (GOPAY STYLE) UNTUK PASAR
// ==========================================
function renderKategoriPasarTabs(data) {
    const container = document.getElementById('kategori-pasar-grid');
    if (!container) return;

    let categories = new Set();
    data.forEach(p => {
        if (p.category) categories.add(p.category);
    });

    let arrKategori = ['Semua', ...Array.from(categories).sort()];

    container.innerHTML = arrKategori.map(k => {
        const isActive = k === kategoriPasarAktif;
        const logoUrl = getKategoriLogoURL(k); 

        return `
        <div onclick="pilihKategoriPasar('${k}')" class="flex flex-col items-center gap-2 cursor-pointer text-center group active:scale-95 transition-all">
            <div class="w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all border ${isActive ? 'bg-[#EE4D2D] border-[#EE4D2D] shadow-lg shadow-[#EE4D2D]/30' : 'bg-brand-card border-white/5 shadow-md group-hover:border-brand-success'}">
                <img src="${logoUrl}" alt="${k}" class="w-7 h-7 object-contain ${isActive ? 'brightness-100' : 'opacity-80 group-hover:opacity-100 transition-opacity'}"
                onerror="this.src='https://img.icons8.com/neon/96/folder-invoices.png'">
            </div>
            <span class="text-[9px] font-extrabold tracking-wide break-words w-full uppercase leading-snug px-0.5 ${isActive ? 'text-[#EE4D2D]' : 'text-gray-400 group-hover:text-white'}">
                ${k}
            </span>
        </div>
        `;
    }).join('');
}


function pilihKategoriPasar(kat) {
    kategoriPasarAktif = kat;
    const searchInput = document.getElementById('cari-pasar');
    if (searchInput) searchInput.value = '';
    
    renderKategoriPasarTabs(globalDataPasar); 
    terapkanFilterPasar();
}


function terapkanFilterPasar() {
    const keyword = (document.getElementById('cari-pasar')?.value || '').toLowerCase();
    
    const filteredData = globalDataPasar.filter(item => {
        const matchSearch = item.title.toLowerCase().includes(keyword) || 
                            item.category.toLowerCase().includes(keyword) || 
                            (item.profiles?.nickname || '').toLowerCase().includes(keyword);
                            
        // Jika pilih "Semua", maka lolos. Jika pilih kategori lain, harus cocok.
        const matchKat = (kategoriPasarAktif === 'Semua') ? true : (item.category === kategoriPasarAktif || item.category.includes(kategoriPasarAktif));
        
        return matchSearch && matchKat;
    });
    
    renderGridPasar(filteredData);
}

// [BARU] FUNGSI HELPER FORMAT RUPIAH SAAT MENGETIK
function formatInputRupiah(e) {
    let val = e.target.value.replace(/[^,\d]/g, '').toString();
    let split = val.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    e.target.value = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
}

// Array Global Penyimpan Antrean Foto
let fileJualanArray = []; 

// 1. RENDER GRID (Tampilkan Foto Pertama Saja di Etalase Depan)
function renderGridPasar(dataList, targetId = 'grid-pasar-player') {
    const grid = document.getElementById(targetId);
    if (!grid) return;
    grid.innerHTML = '';

    if (dataList.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-10 text-gray-500 text-xs flex flex-col items-center"><i class="fas fa-store-slash text-4xl mb-3 opacity-30"></i><span>Tidak ada produk di kategori ini.</span></div>';
        return;
    }

    // Menggunakan map().join('') agar bisa mengeksekusi delay animasi berurutan (smooth-reveal)
    const htmlCards = dataList.map((item, index) => {
        const sellerAvatar = item.profiles?.avatar_url || 'https://placehold.co/100x100/1a1133/2BD975?text=AV';
        const sellerName = item.profiles?.nickname || 'Anonim';
        
        // 🔥 LOGIKA BARU: Harga Markup Customer (+ 650 + 0.7%)
        let baseHarga = item.price;
        if (item.fee_ditanggung_pembeli) {
            baseHarga += hitungPotonganSeller(item.price);
        }
        const hargaCustomer = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaCustomer);

        // 🔥 LOGIKA HARGA CORET MARKETING AUTOMATIC (Sama seperti Xoftware)
        let hargaCoret = Math.ceil((hargaCustomer * 1.3) / 1000) * 1000; 
        if (hargaCustomer > 100000) hargaCoret = Math.ceil((hargaCustomer * 1.2) / 5000) * 5000;
        if (hargaCustomer <= 5000) hargaCoret = hargaCustomer + 2500;

        const sellerExp = item.profiles?.exp || 0;
        const sellerLevel = hitungStatusLevel(sellerExp).level;
        const sellerVideoCount = allVideosData.filter(v => String(v.user_id) === String(item.user_id)).length;
        const badgeHtml = getBadgeByLevelAndVideos(sellerLevel, sellerVideoCount);

        let rawThumb = item.image_url || '';
        let fotoPertama = rawThumb.split(',')[0].trim();
        if (!fotoPertama) fotoPertama = 'https://placehold.co/400x400/1a1133/2BD975?text=PASAR';

        const isAutoItem = item.category === 'Akun' || item.category === 'Item' || item.category === 'APK Premium';
        const sisaStok = isAutoItem && item.stock_list ? item.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
        
        // Lencana Kiri Atas (Stok/Kategori)
        const badgeStok = isAutoItem 
            ? `<span class="absolute top-2 left-2 bg-black/80 text-[8px] font-extrabold ${sisaStok > 0 ? 'text-brand-info border-brand-info/30' : 'text-red-500 border-red-500/50'} px-2 py-0.5 rounded-md backdrop-blur-sm border shadow-md tracking-wider">STOK: ${sisaStok}</span>` 
            : `<span class="absolute top-2 left-2 bg-brand-success/90 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10 shadow-md uppercase tracking-wider">${item.category}</span>`;

        // Animasi Muncul Berurutan (Maksimal 0.4s)
        const delayAnimasi = Math.min(index * 0.02, 0.4);

        return `
        <div onclick="bukaDetailPasar('${item.id}')" style="animation-delay: ${delayAnimasi}s; opacity: 0;" class="bg-brand-card rounded-2xl border border-white/5 overflow-hidden flex flex-col hover:border-brand-success/30 transition-all smooth-reveal shadow-lg cursor-pointer group">
            <div class="relative w-full aspect-square bg-black/40 overflow-hidden">
                <img src="${fotoPertama}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-0" onerror="this.src='https://placehold.co/400x400/1a1133/2BD975?text=PASAR'">
                <!-- Watermark AU2Hub Thumbnail -->
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-20 h-20 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'">
                ${badgeStok}
            </div>
            <div class="p-3 flex-1 flex flex-col justify-between gap-1">
                <div>
                    <div class="font-extrabold text-xs text-white leading-snug line-clamp-2 mb-1 min-h-[2.4rem]">${item.title}</div>
                    <!-- Info Penjual Kecil (Menggantikan Deskripsi agar rapi) -->
                    <div class="flex items-center gap-1.5 mb-1">
                        <img src="${sellerAvatar}" class="w-3.5 h-3.5 rounded-full object-cover border border-white/10 shrink-0">
                        <span class="text-[9px] text-gray-400 truncate w-full font-medium flex items-center gap-1">${sellerName} <span class="scale-[0.8] origin-left inline-flex shrink-0">${badgeHtml}</span></span>
                    </div>
                </div>
                
                <div class="mt-auto">
                    <div class="text-[9px] text-[#EE4D2D] font-bold mb-0.5 flex items-center gap-1">
                        <i class="fas fa-bolt text-[8px]"></i> 
                        Instan 1 Detik
                    </div>
                    <div class="flex flex-col items-start gap-px">
                        <div class="text-gray-500 line-through text-[9px] font-medium opacity-60">Rp ${hargaCoret.toLocaleString('id-ID')}</div>
                        <div class="text-[#EE4D2D] font-extrabold text-sm tracking-tight">${formatHarga}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = htmlCards;
}


// 2. PREVIEW BANYAK FOTO SAAT JUAL BARANG
function previewGambarJualan(input) {
    if (input.files && input.files.length > 0) {
        const newFiles = Array.from(input.files);
        let isSizeError = false;

        newFiles.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) isSizeError = true;
            else fileJualanArray.push(file); 
        });

        if (isSizeError) showToast("Beberapa foto berukuran > 5MB diabaikan.", "error");

        renderPreviewJualan();
        input.value = ''; 
    }
}

function renderPreviewJualan() {
    const previewContainer = document.getElementById('preview-container-jualan');
    previewContainer.innerHTML = '';
    
    if (fileJualanArray.length === 0) {
        previewContainer.classList.add('hidden');
        return;
    }

    fileJualanArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = e => {
            previewContainer.innerHTML += `
                <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-white/20 shadow-md">
                    <img src="${e.target.result}" class="w-full h-full object-cover">
                    <button onclick="hapusPreviewJualan(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
        }
        reader.readAsDataURL(file);
    });

    previewContainer.classList.remove('hidden');
}

function hapusPreviewJualan(index) {
    fileJualanArray.splice(index, 1);
    renderPreviewJualan();
}

// 3. PROSES UPLOAD MULTI FOTO SEKALIGUS
async function prosesPostingJualan() {
    const nama = document.getElementById('jualan-nama').value.trim();
    const hargaInputClean = document.getElementById('jualan-harga').value.replace(/\./g, '');
    const harga = parseInt(hargaInputClean);
    const kategori = document.getElementById('jualan-kategori').value;
    const deskripsi = document.getElementById('jualan-deskripsi').value.trim();
    
    // [BARU] Ambil isi data stok dan snk
    const stockList = document.getElementById('jualan-stock').value.trim(); // <--- INI BARIS YANG HILANG TADI
    const snkInput = document.getElementById('jualan-snk') ? document.getElementById('jualan-snk').value.trim() : null;
    
    const btn = document.getElementById('btn-submit-jualan');

    if (!nama || !harga || isNaN(harga) || !deskripsi) return showToast("Mohon lengkapi formulir!", "error");
    if (harga < 1000) return showToast("Harga minimal adalah Rp 1.000", "error");
    if (fileJualanArray.length === 0) return showToast("Wajib menyertakan minimal 1 foto produk!", "error");
    
    // [BARU] Cegah user nge-post kalau kategori Akun/Item tapi stoknya kosong
    if ((kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') && !stockList) {
        return showToast("Wajib mengisi List Stok untuk kategori ini!", "error");
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses Upload...';
    btn.disabled = true;

    try {
        let uploadedUrls = [];
        showToast(`Mengunggah ${fileJualanArray.length} foto ke satelit...`, "info");

        const uploadPromises = fileJualanArray.map(async (file, index) => {
            // Memasukkan file ke dalam folder: {User ID}/pasar/{nama_file}
const pathLengkap = `${currentUser.id}/pasar/foto_${index}_${Date.now()}`;
const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`);
            const dataUrl = await resUrl.json();
            await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
            return dataUrl.finalVideoUrl;
        });

        uploadedUrls = await Promise.all(uploadPromises);
        const finalImageUrl = uploadedUrls.join(',');
        const isFeePembeli = document.getElementById('jualan-fee-bearer').value === 'pembeli';

        // [BARU] Masukkan stock_list ke dalam payload Supabase
        const { error } = await supabaseClient.from('player_products').insert({
            user_id: currentUser.id, 
            title: nama, 
            price: harga, 
            category: kategori, 
            description: deskripsi, 
            image_url: finalImageUrl,
            stock_list: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? stockList : null,
            snk: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? snkInput : null,
            fee_ditanggung_pembeli: isFeePembeli
        });

        if (error) throw error;

        showToast("Dagangan berhasil diposting!", "success");
        tutupModalJualBarang();
        
        document.getElementById('jualan-nama').value = '';
        document.getElementById('jualan-harga').value = '';
        document.getElementById('jualan-deskripsi').value = '';
        document.getElementById('input-foto-jualan').value = '';
        document.getElementById('jualan-stock').value = ''; // [BARU] Kosongkan form stok
        
        fileJualanArray = [];
        document.getElementById('preview-container-jualan').innerHTML = '';
        document.getElementById('preview-container-jualan').classList.add('hidden');
        
        loadPasarPlayer(true);
        // 🔥 FIX: Perbarui Etalase Pribadi Seller secara realtime!
        if (currentUser) {
            loadProdukSaya();
        }

    } catch (err) {
        showToast("Gagal memposting: " + err.message, "error");
    } finally {
        btn.innerHTML = 'Posting Dagangan';
        btn.disabled = false;
    }
}


// SMART SHARE (FINAL: TAMBAH TITIK SETELAH RP, FIX BOLD WA)
async function shareProdukPasar(btn) {
    const currentUrl = window.location.href;
    const judulProduk = document.getElementById('pasar-detail-nama').innerText || "Produk Pasar Player";

    // 1. Kalkulasi Harga Asli dan Harga Coret secara dinamis
    let totalPrice = currentPasarPrice * currentPasarQty;
    let baseHargaCoret = Math.ceil((currentPasarPrice * 1.3) / 1000) * 1000;
    if (currentPasarPrice > 100000) baseHargaCoret = Math.ceil((currentPasarPrice * 1.2) / 5000) * 5000;
    if (currentPasarPrice <= 5000) baseHargaCoret = currentPasarPrice + 2500;
    let totalHargaCoret = baseHargaCoret * currentPasarQty;

    // 2. Format ke Rupiah, buang spasi, LALU tambah titik setelah "Rp"
    const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        .format(totalPrice)
        .replace(/\s|\u00A0/g, '') // Buang spasi gaib
        .replace('Rp', 'Rp.');     // Tambahkan titik
        
    const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        .format(totalHargaCoret)
        .replace(/\s|\u00A0/g, '') // Buang spasi gaib
        .replace('Rp', 'Rp.');     // Tambahkan titik

    // 3. Gunakan tanda ~ untuk coret dan * untuk tebal (bold) di WhatsApp
    const teksShare = `Cek ${judulProduk} seharga ~${formatHargaCoret}~ hanya menjadi *${formatHarga}* di AU2Hub sekarang! Aman via Admin.`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AU2Hub Pasar Player',
                text: teksShare,
                url: currentUrl
            });
        } catch (err) { console.log("Membagikan dibatalkan."); }
    } else {
        // Fallback untuk perangkat PC
        navigator.clipboard.writeText(`${teksShare} ${currentUrl}`).then(() => {
            showToast("Link produk berhasil disalin!", "success");
            const icon = btn.querySelector('i');
            icon.className = 'fas fa-check text-brand-success';
            setTimeout(() => { icon.className = 'fas fa-share-alt text-sm'; }, 2000);
        }).catch(() => { showToast("Gagal menyalin link", "error"); });
    }
}


// ==========================================
// VARIABEL GLOBAL PASAR (UNTUK VARIASI & QTY)
// ==========================================
let currentPasarPrice = 0;
let currentPasarQty = 1;
let currentPasarVariation = "";

function ubahJumlahPasar(delta) {
    currentPasarQty = Math.max(1, currentPasarQty + delta);
    document.getElementById('pasar-detail-qty').value = currentPasarQty;
    updateHargaPasarLayar();
}

function validasiJumlahPasar(el) {
    let parsed = parseInt(el.value);
    if (isNaN(parsed) || parsed < 1) { parsed = 1; el.value = 1; }
    currentPasarQty = parsed; updateHargaPasarLayar();
}

function pilihVariasiPasar(namaVariasi, hargaVariasi) {
    currentPasarVariation = namaVariasi;
    currentPasarPrice = parseFloat(hargaVariasi) || 0;
    if (window.renderVariasiPasarButtons) window.renderVariasiPasarButtons(namaVariasi);
    updateHargaPasarLayar();
}

function updateHargaPasarLayar() {
    let totalPrice = currentPasarPrice * currentPasarQty;

    // --- LOGIKA BARU: CEK STATUS TOGGLE REKBER ---
    const toggleRekber = document.getElementById('toggle-rekber');
    const infoFee = document.getElementById('info-fee-rekber');
    const angkaFee = document.getElementById('angka-fee-rekber');
    let feeRekber = 0;

    if (toggleRekber && toggleRekber.checked) {
        // Hitung fee dari subtotal harga produk
        feeRekber = hitungFeeRekber(totalPrice); 
        
        // Munculkan info ke layar
        angkaFee.innerText = `+ Rp ${feeRekber.toLocaleString('id-ID')}`;
        infoFee.classList.remove('hidden');
        infoFee.classList.add('flex');
        
        // Tambahkan fee rekber ke tagihan akhir
        totalPrice += feeRekber; 
    } else if (infoFee) {
        infoFee.classList.add('hidden');
        infoFee.classList.remove('flex');
    }
    // ---------------------------------------------

    // Harga Coret Marketing
    let baseHargaCoret = Math.ceil((currentPasarPrice * 1.3) / 1000) * 1000;
    if (currentPasarPrice > 100000) baseHargaCoret = Math.ceil((currentPasarPrice * 1.2) / 5000) * 5000;
    if (currentPasarPrice <= 5000) baseHargaCoret = currentPasarPrice + 2500;
    let totalHargaCoret = baseHargaCoret * currentPasarQty;

    const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice);
    const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalHargaCoret);

    document.getElementById('pasar-detail-harga').innerHTML = `<span class="text-gray-500 line-through text-sm font-medium mr-2">${formatHargaCoret}</span>${formatHarga}`;
}



// ==========================================
// 4. BUKA DETAIL PASAR (VERSI FINAL & SEMPURNA)
// ==========================================
function bukaDetailPasar(idProduk) {
    const produk = globalDataPasar.find(item => item.id === idProduk);
    if (!produk) return;

    idPenjualAktif = produk.user_id; 
    
    // Reset Data Laci
    currentPasarQty = 1;
    currentPasarVariation = "";
    document.getElementById('pasar-detail-qty').value = "1";
        const toggleRekber = document.getElementById('toggle-rekber');
    if (toggleRekber) toggleRekber.checked = false;


    const isAutoItem = produk.category === 'Akun' || produk.category === 'Item' || produk.category === 'APK Premium';
    const sisaStok = isAutoItem && produk.stock_list ? produk.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
    
    // Tampilkan terus Input Jumlah agar buyer bisa beli lebih dari 1
    const wadahQty = document.getElementById('pasar-qty-container');
    if (wadahQty) {
        wadahQty.classList.replace('hidden', 'flex');
    }

    // Harga Markup Customer (+ 500 + 0.7%)
    let baseHarga = Number(produk.price); // <-- TAMBAHKAN Number() DI SINI
    if (produk.fee_ditanggung_pembeli) {
        baseHarga += hitungPotonganSeller(baseHarga); // <-- Gunakan baseHarga
    }
    const hargaCustomer = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
    currentPasarPrice = hargaCustomer;

    // LOGIKA VARIASI
    let rawVariasi = produk.variations || produk.variasi || [];
    let arrVariasi = [];

    if (Array.isArray(rawVariasi)) {
        rawVariasi.forEach(v => {
            if (typeof v === 'object' && v !== null) {
                let hargaVarAsli = parseFloat(v.harga || v.price || 0);
                
                // [TAMBAHAN] Masukkan biaya admin ke harga variasi jika ditanggung pembeli
                if (produk.fee_ditanggung_pembeli) {
                    hargaVarAsli += hitungPotonganSeller(hargaVarAsli);
                }
                
                let hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.007) + 500);
                arrVariasi.push({ name: v.nama_variasi || v.name, price: hargaVarMarkup });
            }
        });
    }


    const variasiContainer = document.getElementById('pasar-variasi-container');
    const variasiList = document.getElementById('pasar-variasi-list');

    if (variasiContainer && variasiList) {
        if (arrVariasi.length > 0) {
            variasiContainer.classList.remove('hidden');
            currentPasarPrice = arrVariasi[0].price;
            currentPasarVariation = arrVariasi[0].name;

            window.renderVariasiPasarButtons = function(activeName) {
                variasiList.innerHTML = arrVariasi.map(v => {
                    let vName = escapeHTML(v.name).replace(/&#39;/g, "\\'");
                    let isActive = (vName === activeName);
                    let baseClass = "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ";
                    let activeClass = isActive ? "bg-[#EE4D2D]/20 border-[#EE4D2D] text-[#EE4D2D] shadow-[0_0_10px_rgba(238,77,45,0.3)]" : "bg-black/30 border-white/10 text-gray-400 hover:border-brand-info/50 hover:text-white";
                    return `<div onclick="pilihVariasiPasar('${vName}', ${v.price})" class="${baseClass} ${activeClass}">${vName}</div>`;
                }).join('');
            };
            window.renderVariasiPasarButtons(currentPasarVariation);
        } else {
            variasiContainer.classList.add('hidden');
        }
    }

    // Render Gambar Carousel
    const carousel = document.getElementById('pasar-detail-carousel');
    let arrFoto = produk.image_url ? produk.image_url.split(',').map(img => img.trim()).filter(img => img !== "") : ['https://placehold.co/400x400/1a1133/2BD975?text=PASAR'];

    carousel.innerHTML = arrFoto.map((imgUrl, index) => `
        <div class="w-full h-full flex-shrink-0 snap-center relative cursor-pointer flex items-center justify-center" onclick="bukaGalleryPasar('${produk.id}', ${index})">
            <img src="${imgUrl}" draggable="false" class="w-full h-full object-cover pointer-events-none relative z-0" onerror="this.src='https://placehold.co/400x400/1a1133/2BD975?text=PASAR'">
            <!-- Watermark AU2Hub -->
            <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-36 h-36 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg" onerror="this.style.display='none'">

        </div>
    `).join('');

    const counterBadge = document.getElementById('pasar-carousel-counter');
    if (arrFoto.length > 1) {
        counterBadge.classList.remove('hidden');
        document.getElementById('pasar-total-idx').innerText = arrFoto.length;
        carousel.onscroll = () => { document.getElementById('pasar-current-idx').innerText = Math.round(carousel.scrollLeft / carousel.clientWidth) + 1; };
    } else { counterBadge.classList.add('hidden'); carousel.onscroll = null; }

    // Render Teks & Panggil Harga Pertama Kali
    updateHargaPasarLayar(); 
    document.getElementById('pasar-detail-kategori').innerHTML = `${produk.category} ${isAutoItem ? ` &bull; Sisa: ${sisaStok}` : ''}`;
    document.getElementById('pasar-detail-nama').innerText = produk.title;
    
    let deskripsiBisaDiklik = (produk.description || "-").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline font-bold hover:text-white transition-colors">$1</a>');

    // --- PERBAIKAN RESET LIHAT SELENGKAPNYA ---
    const pDescPasar = document.getElementById('pasar-detail-deskripsi');
    const btnDescPasar = document.getElementById('btn-toggle-desc-pasar');
    pDescPasar.innerHTML = deskripsiBisaDiklik.replace(/\n/g, '<br>');
    if(pDescPasar && btnDescPasar) { 
        pDescPasar.classList.add('line-clamp-4'); 
        btnDescPasar.innerHTML = 'Lihat Selengkapnya ▼'; 
    }
    // -----------------------------------------
    
    const sellerVideoCount = allVideosData.filter(v => String(v.user_id) === String(produk.user_id)).length;
    const sellerExp = produk.profiles?.exp || 0;
    const badgeHtml = getBadgeByLevelAndVideos(hitungStatusLevel(sellerExp).level, sellerVideoCount);

    document.getElementById('pasar-detail-avatar').src = produk.profiles?.avatar_url || 'https://placehold.co/100x100/1a1133/2BD975?text=AV';
    document.getElementById('pasar-detail-penjual').innerHTML = `${produk.profiles?.nickname || 'Anonim'} <span class="scale-[0.85] origin-left inline-flex ml-1">${badgeHtml}</span>`;

    // Tombol Beli Dinamis (Dengan Qty, Variasi, & Ekstra Rekber)
    const btnBeli = document.getElementById('btn-beli-pasar');
    btnBeli.onclick = () => {
        // 🔥 TAMBAHAN: Cegah buyer checkout kalau jumlah yang dibeli melebihi stok!
        if (isAutoItem && currentPasarQty > sisaStok) {
            return showToast(`Stok tidak mencukupi! Sisa stok otomatis hanya ${sisaStok}.`, "error");
        }

        let namaProdukFinal = produk.title;
        if (currentPasarVariation !== "") namaProdukFinal += ` - ${currentPasarVariation}`;
        if (currentPasarQty > 1) namaProdukFinal += ` (x${currentPasarQty})`;
        
        let totalHargaCheckout = currentPasarPrice * currentPasarQty;

        // --- BACA JIKA PEMBELI PAKAI REKBER ---
        const toggleRekber = document.getElementById('toggle-rekber');
        if (toggleRekber && toggleRekber.checked) {
            const feeRekber = hitungFeeRekber(totalHargaCheckout);
            totalHargaCheckout += feeRekber; // Tambahkan fee ke tagihan akhir!
            namaProdukFinal += ` [+Rekber]`; // Beri tanda rekber di struk pesanan
        }

        checkoutPasar(namaProdukFinal, totalHargaCheckout, produk.id);
    };

    // Logika Tombol Sesuai Status Stok / Kepemilikan
    if (currentUser && currentUser.id === produk.user_id) {
        btnBeli.innerHTML = '<i class="fas fa-ban"></i> Ini Produk Anda'; btnBeli.disabled = true; btnBeli.className = "w-full bg-gray-600 text-white py-3.5 rounded-xl font-extrabold uppercase text-sm z-30 relative";
    } else if (isAutoItem && sisaStok === 0) {
        btnBeli.innerHTML = '<i class="fas fa-box-open"></i> Stok Habis'; btnBeli.disabled = true; btnBeli.className = "w-full bg-red-500/50 text-white py-3.5 rounded-xl font-extrabold uppercase text-sm z-30 relative cursor-not-allowed border border-red-500/30";
    } else {
        btnBeli.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang'; btnBeli.disabled = false; btnBeli.className = "w-full bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] text-white py-3.5 rounded-xl font-extrabold active:scale-95 transition-all uppercase text-sm shadow-[0_4px_15px_rgba(238,77,45,0.3)] z-30 relative";
    }

    document.getElementById('modal-detail-pasar').classList.replace('hidden', 'flex');
    history.pushState({ popup: 'detail_pasar' }, null, '#detailpasar?id=' + produk.id);
}


function tutupDetailPasar(dariTombolBackHP = false) {
    document.getElementById('modal-detail-pasar').classList.replace('flex', 'hidden');
    if (!dariTombolBackHP && window.location.hash.startsWith('#detailpasar')) {
        history.back();
    }
}

function lihatProfilPenjual() {
    if (idPenjualAktif) {
        tutupDetailPasar();
        viewUserProfile(idPenjualAktif);
    }
}

function chatPenjualPasar() {
    if (idPenjualAktif) {
        tutupDetailPasar();
        kirimPesanPribadi(idPenjualAktif);
    }
}

async function checkoutPasar(namaFinal, totalHarga, id) {
    const btnBeli = document.getElementById('btn-beli-pasar');
    btnBeli.disabled = true;
    btnBeli.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memverifikasi...';

    showToast("Memverifikasi pesanan ke server...", "info");
    
    try {
        const { data: produkAsli, error } = await supabaseClient.from('player_products').select('user_id').eq('id', id).single();
        if (error || !produkAsli) throw new Error("Barang tidak ditemukan di server.");
        
        tutupDetailPasar(true); // <--- Tambah kata true
        
        // Langsung panggil tanpa setTimeout karena history.back() sudah kita cegah
        checkoutXoftwarePay("[PASAR] " + namaFinal, totalHarga, "Pembelian item dari Pasar Player.", produkAsli.user_id, id);
        
    } catch (err) {
        showToast("Gagal memverifikasi keamanan: " + err.message, "error");
    } finally {
        btnBeli.disabled = false;
        btnBeli.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang';
    }
}


// ==========================================
// LOGIKA PEMBAYARAN VIP SELLER (BASED ON 333/HARI)
// ==========================================
const HARGA_PER_HARI = 333;
const HARGA_CORET_PER_HARI = 1000; // Asumsi harga coret (normal) adalah Rp 1.000/hari

let qtyVipHari = 1;
let qtyVipBulan = 1;
let paketSellerTerpilih = 'tahunan';

function bukaModalLangganan() {
    history.pushState({ popup: 'langganan' }, null, '#langganan');
    const modal = document.getElementById('modal-langganan-seller');
    modal.classList.replace('hidden', 'flex');
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function tutupModalLangganan(dariTombolBack = false) {
    const modal = document.getElementById('modal-langganan-seller');
    modal.style.opacity = '0';
    if (!dariTombolBack && window.location.hash === '#langganan') {
        history.back();
    }
    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
        modal.style.opacity = '1';
    }, 300);
}

function ubahQtyVIP(tipe, delta) {
    if (tipe === 'harian') {
        qtyVipHari = Math.max(1, qtyVipHari + delta);
        document.getElementById('qty-vip-hari').value = qtyVipHari;
    } else {
        qtyVipBulan = Math.max(1, qtyVipBulan + delta);
        document.getElementById('qty-vip-bulan').value = qtyVipBulan;
    }
    updateUIPaket(tipe);
}

function inputQtyVIP(tipe, val) {
    let parsed = parseInt(val);
    if (tipe === 'harian') {
        qtyVipHari = (isNaN(parsed) || parsed < 1) ? 1 : parsed; 
    } else {
        qtyVipBulan = (isNaN(parsed) || parsed < 1) ? 1 : parsed; 
    }
    updateUIPaket(tipe);
}

function validasiQtyVIP(tipe, el) {
    let parsed = parseInt(el.value);
    if (isNaN(parsed) || parsed < 1) { 
        parsed = 1; 
        el.value = 1; 
    } else {
        el.value = parsed;
    }
    if (tipe === 'harian') qtyVipHari = parsed;
    else qtyVipBulan = parsed;
    updateUIPaket(tipe);
}

function updateUIPaket(tipe) {
    if (tipe === 'harian') {
        const hargaAsli = HARGA_PER_HARI * qtyVipHari;
        const hargaCoret = HARGA_CORET_PER_HARI * qtyVipHari;
        
        document.getElementById('harga-harian').innerHTML = `Rp ${hargaAsli.toLocaleString('id-ID')}<span class="text-[10px] text-gray-500 font-normal"> /${qtyVipHari} hari</span>`;
        document.getElementById('coret-harian').innerText = `Rp ${hargaCoret.toLocaleString('id-ID')}`;
    } else if (tipe === 'bulanan') {
        const totalHari = qtyVipBulan * 30;
        const hargaAsli = HARGA_PER_HARI * totalHari;
        const hargaCoret = HARGA_CORET_PER_HARI * totalHari;
        
        document.getElementById('harga-bulanan').innerHTML = `Rp ${hargaAsli.toLocaleString('id-ID')}<span class="text-[10px] text-gray-500 font-normal"> /${totalHari} hari</span>`;
        document.getElementById('coret-bulanan').innerText = `Rp ${hargaCoret.toLocaleString('id-ID')}`;
    }
    pilihPaketSeller(tipe);
}

function pilihPaketSeller(tipe) {
    paketSellerTerpilih = tipe;
    let hargaAwal = 0;
    
    if (tipe === 'harian') {
        hargaAwal = HARGA_PER_HARI * qtyVipHari;
    } else if (tipe === 'bulanan') {
        hargaAwal = HARGA_PER_HARI * 30 * qtyVipBulan;
    } else {
        hargaAwal = HARGA_PER_HARI * 365; // Rp 121.545
    }
    
    // Fee Gateway (Flat 500 + 0,7%)
    const biayaGateway = 500 + Math.floor(hargaAwal * 0.007);
    const hargaFinal = hargaAwal + biayaGateway;
    
    document.getElementById('btn-bayar-langganan').innerHTML = `
        <span>Berlangganan Rp ${hargaFinal.toLocaleString('id-ID')}</span>
        <span class="text-[9px] font-normal text-white/80 normal-case mt-0.5">(Termasuk Admin QRIS: Rp ${biayaGateway.toLocaleString('id-ID')})</span>
    `;
    
    // Reset Kartu
    ['harian', 'bulanan', 'tahunan'].forEach(t => {
        document.getElementById(`radio-${t}`).querySelector('div').classList.replace('scale-100', 'scale-0');
        const card = document.getElementById(`card-${t}`);
        card.classList.add('border-white/10');
        card.classList.remove('border-brand-success', 'border-brand-info', 'border-brand-accent', 
                              'shadow-[0_0_15px_rgba(37,211,102,0.2)]', 
                              'shadow-[0_0_15px_rgba(70,179,255,0.2)]', 
                              'shadow-[0_0_15px_rgba(255,0,122,0.2)]');
    });

    // Aktifkan Kartu
    document.getElementById(`radio-${tipe}`).querySelector('div').classList.replace('scale-0', 'scale-100');
    const activeCard = document.getElementById(`card-${tipe}`);
    activeCard.classList.remove('border-white/10');

    if (tipe === 'harian') {
        activeCard.classList.add('border-brand-success', 'shadow-[0_0_15px_rgba(37,211,102,0.2)]');
    } else if (tipe === 'bulanan') {
        activeCard.classList.add('border-brand-info', 'shadow-[0_0_15px_rgba(70,179,255,0.2)]');
    } else {
        activeCard.classList.add('border-brand-accent', 'shadow-[0_0_15px_rgba(255,0,122,0.2)]');
    }
}

async function lanjutkanBayarLangganan() {
    tutupModalLangganan(true); // <--- Tambahkan kata true di sini
    
    let namaPaket = '';
    let hargaAwal = 0;
    
    if (paketSellerTerpilih === 'harian') {
        namaPaket = `[VIP] Langganan Seller ${qtyVipHari} Hari`;
        hargaAwal = HARGA_PER_HARI * qtyVipHari;
    } else if (paketSellerTerpilih === 'bulanan') {
        namaPaket = `[VIP] Langganan Seller ${qtyVipBulan} Bulan`;
        hargaAwal = HARGA_PER_HARI * 30 * qtyVipBulan;
    } else {
        namaPaket = '[VIP] Langganan Seller 1 Tahun';
        hargaAwal = HARGA_PER_HARI * 365;
    }
    
    const biayaGateway = 500 + Math.floor(hargaAwal * 0.007);
    const hargaFinal = hargaAwal + biayaGateway;
    
    checkoutXoftwarePay(namaPaket, hargaFinal, "Aktivasi VIP Seller AU2Hub", null, null);
}


function tutupModalJualBarang(dariTombolBackHP = false) {
    const modal = document.getElementById('modal-jual-barang');
    modal.style.opacity = '0'; 
    
    if (!dariTombolBackHP && window.location.hash === '#jualbarang') {
        history.back();
    }

    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
        modal.style.opacity = '1'; 
        
        document.getElementById('jualan-nama').value = '';
        document.getElementById('jualan-harga').value = '';
        document.getElementById('jualan-deskripsi').value = '';
        document.getElementById('input-foto-jualan').value = '';
        fileJualanArray = [];
        const previewContainer = document.getElementById('preview-container-jualan');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.add('hidden');
        }
    }, 300); 
}

// FUNGSI UNTUK MEMUNCULKAN/MENYEMBUNYIKAN KOTAK STOK
function toggleStockInput(kategori, wadahId) {
    const wadah = document.getElementById(wadahId);
    if (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') {
        wadah.classList.remove('hidden');
        wadah.classList.add('block');
    } else {
        wadah.classList.add('hidden');
        wadah.classList.remove('block');
    }
}

// ==========================================
// GATEKEEPER 1: TOMBOL TAMBAH PRODUK
// ==========================================
function bukaModalJualBarang() {
    if (!currentUser) return showToast("Silakan login dulu untuk berjualan!", "error");
    
    // CEK VIP SELLER DARI DATABASE LOKAL
    let isVip = userProfile?.is_seller === true;
    let expiredAt = userProfile?.seller_expired_at ? new Date(userProfile.seller_expired_at) : new Date(0);
    const now = new Date();

    // 🔥 KUNCI ANTI-GAGAL: Paksa akses terbuka sesuai durasi yang dibeli!
    const optVipData = localStorage.getItem('optimistic_vip');
    if (optVipData && optVipData.startsWith(currentUser.id)) {
        isVip = true;
        const durasiHari = parseInt(optVipData.split('_')[1]) || 30; // Ambil durasi asli, default 30
        expiredAt = new Date(Date.now() + (durasiHari * 24 * 60 * 60 * 1000)); 
    }

    // Jika bukan VIP atau masa aktif habis
    if (!isVip || expiredAt < now) {
        bukaModalLangganan();
        return; // Setop disini, gembok pintunya!
    }

    // Jika aman, buka laci jualan
    history.pushState({ popup: 'jual_barang' }, null, '#jualbarang');
    const modal = document.getElementById('modal-jual-barang');
    modal.classList.replace('hidden', 'flex');
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => modal.style.opacity = '1', 10);
}

// ==========================================
// GATEKEEPER 2: MENU TOKO SAYA (DASHBOARD)
// ==========================================
async function loadTokoSaya() {
    const loggedOut = document.getElementById('toko-logged-out');
    const loggedIn = document.getElementById('toko-logged-in');
    
    // 1. AMBIL ELEMEN BADGE & TEKS EXPIRED
    const elExpired = document.getElementById('toko-vip-expired');
    const elBadge = document.getElementById('badge-toko-vip');
    
    // 2. 🔥 JURUS SAPU BERSIH MUTLAK: Paksa hilang & kosongkan teksnya dulu!
    if (elExpired) {
        elExpired.classList.add('hidden');
        elExpired.style.display = 'none'; 
        elExpired.innerHTML = ''; // Hapus teks "hantu" dari akun lama
    }
    if (elBadge) {
        elBadge.classList.add('hidden');
        elBadge.style.display = 'none';
    }

    if (!currentUser) {
        loggedOut.querySelector('h3').innerText = "Akses Tertutup";
        loggedOut.querySelector('p').innerText = "Silakan login untuk mulai mengelola etalase toko dan melacak pesanan masuk Anda.";
        loggedOut.querySelector('button').innerText = "LOGIN SEKARANG";
        loggedOut.querySelector('button').onclick = openAuthModal;
        
        loggedOut.classList.remove('hidden');
        loggedOut.classList.add('flex');
        loggedIn.classList.add('hidden');
        return;
    }

    // CEK VIP SELLER DARI DATABASE LOKAL
    let isVip = userProfile?.is_seller === true;
    let expiredAt = userProfile?.seller_expired_at ? new Date(userProfile.seller_expired_at) : new Date(0);
    const now = new Date();

    // 🔥 KUNCI ANTI-GAGAL: Paksa akses terbuka sesuai durasi yang dibeli!
    const optVipData = localStorage.getItem('optimistic_vip');
    if (optVipData && optVipData.startsWith(currentUser.id)) {
        isVip = true;
        const durasiHari = parseInt(optVipData.split('_')[1]) || 30; // Ambil durasi asli, default 30
        expiredAt = new Date(Date.now() + (durasiHari * 24 * 60 * 60 * 1000)); 
    }

    // Jika bukan VIP atau masa aktif habis
    if (!isVip || expiredAt < now) {
        loggedOut.querySelector('h3').innerText = "Akses Khusus VIP Seller";
        loggedOut.querySelector('p').innerText = "Tingkatkan akunmu menjadi VIP Seller untuk mengelola toko, menambah etalase, dan menerima pesanan.";
        
        loggedOut.querySelector('button').innerText = "BERLANGGANAN SEKARANG";
        loggedOut.querySelector('button').onclick = bukaModalLangganan;
        
        loggedOut.classList.remove('hidden');
        loggedOut.classList.add('flex');
        loggedIn.classList.add('hidden');
        return; // Setop disini, gembok pintunya!
    }
    
    // Jika aman, izinkan masuk ke etalase
    loggedOut.classList.add('hidden');
    loggedOut.classList.remove('flex');
    loggedIn.classList.remove('hidden');
    loggedIn.classList.add('flex');

    // 🔥 TAMPILKAN INFO MASA AKTIF VIP KE LAYAR 
    if (elExpired && elBadge) {
        const sisaHari = Math.ceil((expiredAt - now) / (1000 * 60 * 60 * 24));
        const formatTanggal = expiredAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        
        // Isi ulang teksnya untuk akun yang SAH
        elExpired.innerHTML = `<i class="fas fa-clock text-[#FF5722] mr-1"></i> Aktif s/d: <b class="text-white">${formatTanggal}</b> (${sisaHari} Hari)`;
        
        // Paksa Muncul kembali
        elExpired.classList.remove('hidden');
        elExpired.style.display = ''; // Kembalikan ke display bawaan Tailwind
        
        elBadge.classList.remove('hidden');
        elBadge.style.display = ''; 
    }
    
    await updateUiSaldoSeller();
    switchTokoTab(tokoTabAktif);

    // 🔥 PANGGIL LANGSUNG DI SINI
    updateLinkToko(); 
}


async function updateUiSaldoSeller() {
    try {
        // 1. Tarik Saldo Aktif dari tabel profiles
        const { data: profile } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
        
        const elSaldoAktif = document.getElementById('toko-saldo-aktif');
        if (elSaldoAktif) elSaldoAktif.innerText = 'Rp ' + (profile?.balance || 0).toLocaleString('id-ID');

        const elSaldoAngka = document.getElementById('saldo-angka');
        if (elSaldoAngka) elSaldoAngka.innerText = (profile?.balance || 0).toLocaleString('id-ID');

        // 2. Tarik Data Kalkulasi dari RPC Supabase
        const { data: stats, error } = await supabaseClient.rpc('get_seller_stats', {
            p_seller_id: currentUser.id
        });

        if (error) throw error;

        // 3. Suntikkan ke UI
        const elTertahan = document.getElementById('toko-saldo-tertahan');
        if (elTertahan) elTertahan.innerText = 'Rp ' + (stats.total_tertahan || 0).toLocaleString('id-ID');

        const elTotalGMV = document.getElementById('seller-stat-gmv');
        if (elTotalGMV) elTotalGMV.innerText = 'Rp ' + (stats.total_gmv || 0).toLocaleString('id-ID');

        const elTotalBersih = document.getElementById('seller-stat-bersih');
        if (elTotalBersih) elTotalBersih.innerText = 'Rp ' + (stats.total_bersih || 0).toLocaleString('id-ID');

        const elTotalTerjual = document.getElementById('seller-stat-terjual');
        if (elTotalTerjual) elTotalTerjual.innerText = (stats.total_terjual || 0) + ' Pesanan';

        // =========================================================
        // 🔥 MESIN GRAFIK REAL-TIME (7 HARI TERAKHIR)
        // =========================================================
        
        // A. Siapkan array kosong untuk 7 hari terakhir
        const labels = [];
        const dataBerhasil = [0, 0, 0, 0, 0, 0, 0];
        const dataPending = [0, 0, 0, 0, 0, 0, 0];
        const dataGagal = [0, 0, 0, 0, 0, 0, 0];

        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            // Format jadi kayak "14 Jun"
            labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
        }

        // B. Batas waktu tarikan database (7 hari lalu dari jam 00:00)
        const past7Days = new Date(today);
        past7Days.setDate(today.getDate() - 6);
        past7Days.setHours(0, 0, 0, 0);

        // C. Tarik histori orderan lu dari Supabase
        const { data: orders } = await supabaseClient
            .from('orders_player')
            .select('price, status, created_at')
            .eq('seller_id', currentUser.id)
            .gte('created_at', past7Days.toISOString());

        // D. Olah dan kelompokkan uangnya sesuai tanggal & status
        if (orders && orders.length > 0) {
            orders.forEach(order => {
                const orderDate = new Date(order.created_at);
                const orderDateString = orderDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                
                const index = labels.indexOf(orderDateString);
                
                if (index !== -1) {
                    const nominal = Number(order.price) || 0;
                    const status = String(order.status).toUpperCase();

                    // Masukkan omzet ke keranjang yang sesuai
                    if (status === 'SELESAI' || status === 'SUCCESS' || status === 'PROSES') {
                        dataBerhasil[index] += nominal;
                    } else if (status === 'PENDING') {
                        dataPending[index] += nominal;
                    } else if (status === 'DIBATALKAN' || status === 'FAILED' || status === 'DITOLAK') {
                        dataGagal[index] += nominal;
                    }
                }
            });
        }

        // E. Render Chart.js dengan data ASLI
        if (typeof renderGrafikSeller === 'function') {
            renderGrafikSeller(labels, dataBerhasil, dataPending, dataGagal);
        }

    } catch(e) {
        console.error("Gagal update UI Saldo Seller:", e);
    }
}

async function loadPasarPlayer(forceRefresh = false) {
    const gridPasar = document.getElementById('grid-pasar-player');
    if (!gridPasar) return;

    if (forceRefresh) {
        gridPasar.innerHTML = '<div class="col-span-2 text-center py-10 text-brand-success"><i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br><span class="text-xs font-bold uppercase tracking-widest">Memuat Ulang...</span></div>';
    }

    try {
        // 1. TAMBAHKAN is_seller & seller_expired_at PADA QUERY SELECT
        const { data, error } = await supabaseClient
            .from('player_products')
            .select('*, profiles!fk_player_products_user_id(nickname, avatar_url, exp, is_seller, seller_expired_at)') 
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. LOGIKA FILTER: HANYA TAMPILKAN PRODUK DARI SELLER YANG VIP-NYA AKTIF
        const waktuSekarang = new Date();
        const produkSellerAktif = (data || []).filter(item => {
            if (!item.profiles) return false; // Jika profil error/hilang, jangan tampilkan
            
            const isVip = item.profiles.is_seller === true;
            const expiredAt = item.profiles.seller_expired_at ? new Date(item.profiles.seller_expired_at) : new Date(0);
            
            // Lolos filter HANYA JIKA dia VIP dan masa aktifnya lebih besar dari waktu saat ini
            return isVip && (expiredAt > waktuSekarang);
        });

        // 3. MASUKKAN DATA YANG SUDAH BERSIH KE VARIABEL GLOBAL
        globalDataPasar = produkSellerAktif;
        renderKategoriPasarTabs(globalDataPasar);
        terapkanFilterPasar(); 

        // 3. MASUKKAN DATA YANG SUDAH BERSIH KE VARIABEL GLOBAL
        globalDataPasar = produkSellerAktif;
        renderKategoriPasarTabs(globalDataPasar);

        // --- LOGIKA PENDETEKSI LINK (Diperbarui) ---
        const urlHash = window.location.hash.substring(1);
        
        if (urlHash.startsWith('detailpasar?id=')) {
            const produkId = urlHash.split('=')[1];
            if (produkId) {
                setTimeout(() => { bukaDetailPasar(produkId); }, 800); 
            }
            terapkanFilterPasar(); 
        } else if (!urlHash.startsWith('tokopublik?seller=') && !urlHash.startsWith('pasar?seller=')) {
            // Hanya jalankan filter pasar player jika kita TIDAK sedang membuka Toko Publik
            terapkanFilterPasar();
        }

    } catch (err) {
        console.error("ERROR DETAIL PASAR PLAYER:", err);
        console.log("Pesan Error:", err.message);

        gridPasar.innerHTML = '<div class="col-span-2 text-center py-10 text-red-500 text-xs">Gagal menarik data pasar. Cek koneksi.</div>';
    }
}


function filterKategoriPasar(kat, btnEl) {
    kategoriPasarAktif = kat;
    document.querySelectorAll('.btn-kat-pasar').forEach(btn => {
        btn.className = "btn-kat-pasar whitespace-nowrap bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold hover:bg-white/10 transition-all";
    });
    btnEl.className = "btn-kat-pasar whitespace-nowrap bg-brand-success border border-transparent text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-[0_0_10px_rgba(37,211,102,0.3)] transition-all";
    terapkanFilterPasar();
}


async function bukaModalSaldoDompet() {
    if (!currentUser) return showToast("Silakan login dulu!", "error");
    
    // 🚀 SUNTIKAN SAKTI: Tanamkan riwayat ke browser agar tombol back HP aktif khusus untuk dompet
    history.pushState({ popup: 'dompet' }, null, '#dompet');
    
    document.getElementById('modal-saldo-dompet').classList.replace('hidden', 'flex');
    fetchSaldoDanMutasi();
}

function tutupModalSaldoDompet(dariTombolBack = false) {
    document.getElementById('modal-saldo-dompet').classList.replace('flex', 'hidden');
    
    // 🚀 SINKRONISASI TOMBOL BACK: Jika ditutup lewat tombol (X), suruh HP mundur 1 langkah
    if (!dariTombolBack && window.location.hash === '#dompet') {
        history.back();
    }
}


// --- KODE PEMULIHAN (Fungsi yang hilang) ---

async function loadProdukSaya() {
    const container = document.getElementById('toko-produk-container');
    if(!container) return;
    
    container.innerHTML = '<div class="text-center py-10 text-xs text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mb-2 text-orange-500"></i><br>Memuat etalase...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('player_products')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            container.innerHTML = data.map(item => {
                const hargaAsli = Number(item.price);
                let pendapatanBersih = 0;
                let hargaTampilEtalase = hargaAsli;

                if (item.fee_ditanggung_pembeli) {
                    pendapatanBersih = hargaAsli; // Uang diterima utuh!
                    hargaTampilEtalase = hargaAsli + hitungPotonganSeller(hargaAsli); // Harga diubah buat pembeli
                } else {
                    pendapatanBersih = hargaAsli - hitungPotonganSeller(hargaAsli);
                }
                const foto = (item.image_url || '').split(',')[0];
                
                // Hitung Stok jika produknya adalah barang otomatis
                const isAutoItem = item.category === 'Akun' || item.category === 'Item' || item.category === 'APK Premium';
                const sisaStok = isAutoItem && item.stock_list ? item.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
                const stokBadge = isAutoItem ? `<span class="text-[8px] font-bold bg-black/80 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/20 absolute top-1.5 right-1.5 shadow-md">Sisa: ${sisaStok}</span>` : '';

                return `
                <div class="bg-[#161B2E] border border-transparent rounded-[1.2rem] p-4 shadow-lg mb-3 transition-all hover:border-white/5">
                    <div class="flex gap-4 items-center mb-4">
                        <div class="relative w-[70px] h-[70px] rounded-[1rem] overflow-hidden shrink-0 bg-black/40 shadow-sm border border-white/5">
                            <img src="${foto}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100/1a1133/2BD975?text=PRODUK'">
                            ${stokBadge}
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-bold text-white line-clamp-1 mb-1">${item.title}</h4>
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[10px] text-gray-500 font-medium">Harga Jual: Rp ${hargaTampilEtalase.toLocaleString('id-ID')}</span>
                                <span class="text-[11px] text-[#EE4D2D] font-bold tracking-tight">Pendapatan: Rp ${pendapatanBersih.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 justify-end w-full">
                        <button onclick="bukaModalEditProduk('${item.id}')" class="flex-1 bg-[#1A2642] border border-[#2A3C65] text-[#46B3FF] py-3 rounded-xl text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                            <i class="fas fa-pen"></i> Edit Detail
                        </button>
                        <button onclick="hapusProdukSaya('${item.id}', '${escapeHTML(item.title).replace(/&#39;/g, "\\'")}')" class="w-12 h-12 flex-shrink-0 bg-[#3A1818] border border-[#5A2020] text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-95">
                            <i class="fas fa-trash-alt text-[11px]"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-6 text-center bg-black/20 rounded-2xl border border-white/5">
                <div class="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-3 border border-orange-500/20 shadow-inner">
                    <i class="fas fa-box-open text-2xl text-orange-500/50"></i>
                </div>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Belum Ada Produk</h4>
                <p class="text-[10px] text-gray-500 leading-relaxed">Etalase toko Anda masih kosong. Tambahkan produk sekarang!</p>
            </div>`;
        }
    } catch (err) {
        container.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data produk.</div>';
    }
}


async function loadPesananMasuk() {
    const container = document.getElementById('toko-pesanan-container');
    if(!container) return;
    
    container.innerHTML = '<div class="text-center py-10 text-xs text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mb-2 text-brand-info"></i><br>Memuat pesanan...</div>';
    
    try {
        // [UPDATE] Tambahkan avatar_url agar foto profil pembeli bisa muncul
        const { data, error } = await supabaseClient
            .from('orders_player')
            .select('*, profiles!orders_player_user_id_fkey(nickname, avatar_url)')
            .eq('seller_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
                // Notifikasi lencana merah di tab Pesanan
        const badgePesanan = document.getElementById('badge-toko-pesanan');
        if (badgePesanan) {
            // Hitung pesanan yang berstatus PENDING atau DIPROSES
            const pesananAktif = data.filter(o => o.status === 'PENDING' || o.status === 'SUCCESS' || o.status === 'proses').length;
            if (pesananAktif > 0) {
                badgePesanan.innerText = pesananAktif;
                badgePesanan.classList.remove('hidden');
            } else {
                badgePesanan.classList.add('hidden');
            }
        }
            container.innerHTML = data.map(order => {
                const isSelesai = order.status === 'selesai';
                const isPending = order.status === 'PENDING';
                
                // Data Pembeli
                const namaPembeli = order.profiles?.nickname || 'Anonim';
                const avaPembeli = order.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${namaPembeli}&background=1A1133&color=fff`;
                
                // Styling Status
                let teksStatus = order.status === 'SUCCESS' ? 'DIPROSES' : order.status.toUpperCase();
                let statusClass = 'text-brand-info border-brand-info/30 bg-brand-info/10'; // Default Diproses
                if (isSelesai) statusClass = 'text-brand-success border-brand-success/30 bg-brand-success/10';
                if (isPending) statusClass = 'text-gray-400 border-gray-500/30 bg-gray-500/10';

                // DESAIN CARD MODERN ALA SHOPEE SELLER CENTER
                return `
                <div class="bg-brand-card border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-white/10">
                    <div class="flex justify-between items-center p-3 border-b border-white/5 bg-black/20">
                        <div class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onclick="viewUserProfile('${order.user_id}')">
                            <img src="${avaPembeli}" class="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0">
                            <span class="text-[10px] font-bold text-white truncate max-w-[100px]">${namaPembeli}</span>
                            <i class="fas fa-chevron-right text-[8px] text-gray-500"></i>
                        </div>
                        <span class="text-[8px] font-black px-2 py-1 rounded border ${statusClass} uppercase tracking-widest shrink-0">
                            ${teksStatus}
                        </span>
                    </div>
                    
                    <div class="p-4 flex gap-3 items-center">
                        <div class="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
                            <i class="fas fa-box text-xl ${isSelesai ? 'text-brand-success/50' : 'text-brand-info/50'}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-xs font-bold text-white mb-1 line-clamp-2 leading-snug">${order.product_name}</h4>
                            <div class="flex justify-between items-end mt-2">
                                <span class="text-[9px] text-gray-500"><i class="far fa-clock mr-1"></i>${timeAgo(order.created_at)}</span>
                                <div class="text-[11px] text-[#EE4D2D] font-bold tracking-tight">Rp ${Number(order.price).toLocaleString('id-ID')}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-3 border-t border-white/5 bg-black/20 flex justify-end gap-2">
                        <button onclick="kirimPesanPribadi('${order.user_id}')" class="bg-brand-info/10 text-brand-info hover:bg-brand-info hover:text-brand-dark border border-brand-info/30 px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm">
                            <i class="fas fa-comment-dots"></i> Chat Pembeli
                        </button>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-6 text-center bg-black/20 rounded-2xl border border-white/5">
                <div class="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 border border-blue-500/20">
                    <i class="fas fa-clipboard-list text-2xl text-blue-500/50"></i>
                </div>
                <h4 class="text-white font-bold text-xs mb-1">Belum Ada Pesanan</h4>
                <p class="text-[10px] text-gray-500 leading-relaxed">Pesanan dari pembeli akan muncul di sini.</p>
            </div>`;
        }
    } catch (e) {
        container.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data pesanan.</div>';
    }
}


function bukaGalleryPasar(idProduk, startIndex) {
    const produk = globalDataPasar.find(item => String(item.id) === String(idProduk));
    if (!produk) return;
    
    let arrFoto = produk.image_url ? produk.image_url.split(',').map(img => img.trim()).filter(img => img !== "") : [];
    if (arrFoto.length === 0) arrFoto.push('https://placehold.co/400x400/1a1133/2BD975?text=PASAR');
    
    let galleryModal = document.getElementById('modal-gallery-pasar');
    if (!galleryModal) {
        galleryModal = document.createElement('div');
        galleryModal.id = 'modal-gallery-pasar';
        galleryModal.className = 'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/95 backdrop-blur-md opacity-0 transition-opacity duration-300';
        document.body.appendChild(galleryModal);
    }

    // 1. SEMBUNYIKAN LACI DETAIL PRODUK SEMENTARA
    const modalDetail = document.getElementById('modal-detail-pasar');
    if (modalDetail && !modalDetail.classList.contains('hidden')) {
        modalDetail.classList.replace('flex', 'hidden');
    }

    history.pushState({ popup: 'gallery' }, null, '#gallery');
    
    galleryModal.innerHTML = `
        <button onclick="tutupGalleryPasar()" class="absolute top-6 right-6 text-white bg-white/10 backdrop-blur-md w-12 h-12 rounded-full flex items-center justify-center active:scale-90 z-[9999] shadow-lg border border-white/20"><i class="fas fa-times text-xl"></i></button>
        <div id="gallery-slider" class="w-full h-full flex overflow-x-auto hide-scroll snap-x snap-mandatory items-center relative z-[9990]">
            ${arrFoto.map(img => `
                <div class="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 relative">
                    <img src="${img}" draggable="false" class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl pointer-events-none relative z-0">
                    <!-- Watermark AU2Hub untuk Full Screen -->
                    <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-48 h-48 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg" onerror="this.style.display='none'">
                </div>
            `).join('')}
        </div>
        ${arrFoto.length > 1 ? `<div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-5 py-2 rounded-full border border-white/10 shadow-lg z-[9999]"><span id="gallery-current">${startIndex + 1}</span> / ${arrFoto.length}</div>` : ''}
    `;
    
    galleryModal.classList.remove('hidden');
    galleryModal.classList.add('flex');
    
    setTimeout(() => {
        galleryModal.classList.remove('opacity-0');
        const slider = document.getElementById('gallery-slider');
        if (slider) {
            slider.scrollLeft = slider.clientWidth * startIndex;
            slider.onscroll = () => {
                let page = Math.round(slider.scrollLeft / slider.clientWidth) + 1;
                const currCounter = document.getElementById('gallery-current');
                if (currCounter) currCounter.innerText = page;
            };
        }
    }, 10);
}


function tutupGalleryPasar(dariTombolBack = false) {
    const modal = document.getElementById('modal-gallery-pasar');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const modalDetail = document.getElementById('modal-detail-pasar');
    if (modalDetail && modalDetail.classList.contains('hidden')) {
        modalDetail.classList.replace('hidden', 'flex');
    }
    if (!dariTombolBack && window.location.hash === '#gallery') history.back();
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.innerHTML = ''; }, 300);
}

async function fetchSaldoDanMutasi() {
    const listContainer = document.getElementById('dompet-history-list');
    if(!listContainer) return;
    listContainer.innerHTML = '<div class="text-center py-10 text-gray-500 text-xs"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i></div>';

    try {
        const { data: profile } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
        const saldoSekarang = profile?.balance || 0;
        document.getElementById('dompet-angka-saldo').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(saldoSekarang);

        const { data: txData } = await supabaseClient.from('wallet_transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });

        if (txData && txData.length > 0) {
            listContainer.innerHTML = txData.map(tx => {
                // Amankan teks deskripsi dan hilangkan enter (\n) agar tidak merusak parameter fungsi
                const safeDesc = (tx.description || '').replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
                
                return `
                <div onclick="bukaNotaMutasi('${tx.id}', ${tx.amount}, '${tx.type}', '${safeDesc}', '${tx.created_at}')" class="bg-brand-card border border-white/5 p-3 rounded-xl flex justify-between items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors active:scale-95" title="Klik untuk lihat rincian struk">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-[11px] font-bold text-white truncate">${tx.description}</h4>
                        <p class="text-[9px] text-gray-500 mt-1">${timeAgo(tx.created_at)}</p>
                    </div>
                    <span class="text-xs font-black whitespace-nowrap shrink-0 ${tx.type === 'INCOME' ? 'text-brand-success' : 'text-red-400'}">
                        ${tx.type === 'INCOME' ? '+' : '-'} Rp ${Number(tx.amount).toLocaleString('id-ID')}
                    </span>
                </div>`;
            }).join('');
        } else {
            listContainer.innerHTML = '<div class="text-center py-10 text-gray-500 text-xs">Belum ada riwayat.</div>';
        }
    } catch (err) {
        listContainer.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal memuat data.</div>';
    }
}

// ==========================================
// NOTA TRANSPARANSI UNTUK MUTASI DOMPET
// ==========================================
function bukaNotaMutasi(id, amount, type, desc, dateStr) {
    const tgl = new Date(dateStr).toLocaleString('id-ID', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}) + ' WIB';
    let htmlNota = '';
    
    // Konversi string ke angka
    const nominal = Number(amount);

    // JIKA INI ADALAH PENARIKAN (WITHDRAWAL)
    if (type === 'EXPENSE' && (desc.toLowerCase().includes('tarik') || desc.toLowerCase().includes('cair'))) {
        let biayaAdmin = 500;
        let nominalBersih = nominal - biayaAdmin;
        if (nominalBersih < 0) nominalBersih = 0; // Jaga-jaga

        // Desain HTML Nota Penarikan
        htmlNota = `
        <div class="text-left w-full cursor-default">
            <div class="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-university text-brand-info"></i> Struk Penarikan</div>
            <div class="flex justify-between items-center text-xs mb-2">
                <span class="text-gray-300">Nominal Ditarik</span>
                <span class="font-mono text-white">Rp ${nominal.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-xs mb-2">
                <span class="text-gray-300">Biaya Admin (Sistem)</span>
                <span class="font-mono text-red-400">- Rp ${biayaAdmin.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-xs font-bold mt-4 pt-3 border-t border-white/10">
                <span class="text-white">Total Diterima Bersih</span>
                <span class="font-mono text-brand-success text-sm tracking-tight">Rp ${nominalBersih.toLocaleString('id-ID')}</span>
            </div>
            <div class="mt-5 p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                <div class="mb-1"><span class="text-gray-500 font-sans">Status:</span><br><b class="text-white font-sans">${desc}</b></div>
                <div class="mb-1"><span class="text-gray-500 font-sans">Waktu:</span> ${tgl}</div>
                <div><span class="text-gray-500 font-sans">Ref ID:</span> TX-${id.substring(0,8).toUpperCase()}</div>
            </div>
        </div>`;
    } 
    // JIKA INI ADALAH PEMASUKAN (INCOME)
    else if (type === 'INCOME') {
        htmlNota = `
        <div class="text-left w-full cursor-default">
            <div class="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-download text-brand-success"></i> Struk Pemasukan</div>
            <div class="flex justify-between items-center text-xs font-bold mb-2">
                <span class="text-white">Total Masuk</span>
                <span class="font-mono text-brand-success text-sm tracking-tight">+ Rp ${nominal.toLocaleString('id-ID')}</span>
            </div>
            <div class="mt-4 p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                <div class="mb-1"><span class="text-gray-500 font-sans">Keterangan:</span><br><b class="text-white font-sans leading-snug">${desc}</b></div>
                <div class="mb-1"><span class="text-gray-500 font-sans">Waktu:</span> ${tgl}</div>
                <div><span class="text-gray-500 font-sans">Ref ID:</span> TX-${id.substring(0,8).toUpperCase()}</div>
            </div>
        </div>`;
    } 
    // LAIN-LAIN (Misal Refund)
    else {
         htmlNota = `<div class="text-left text-xs text-gray-300 font-medium leading-relaxed">${desc}<br><br><span class="text-[10px] text-gray-500 font-mono tracking-widest">TX-${id.substring(0,8).toUpperCase()} &bull; ${tgl}</span></div>`;
    }

    // Tampilkan di Alert Box bawaan (Kita hapus karakter enter \n bawaan kodenya agar tidak dobel spasi di HTML alert)
    customAlert(htmlNota.replace(/\n/g, ''));
}


// === 1. TAMBAHKAN VARIABEL GEMBOK DI LUAR FUNGSI ===
let isWithdrawing = false;

// === 2. GANTI FUNGSI LAMA DENGAN YANG BARU INI ===
async function prosesTarikSaldo() {
    // BLOKIR INSTAN: Jika user klik berkali-kali, hentikan eksekusi kedua dst.
    if (isWithdrawing) {
        showToast("Mohon tunggu, ada penarikan yang sedang diproses...", "info");
        return;
    }
    
    // KUNCI PINTU SEKARANG
    isWithdrawing = true;

    try {
        // 1. Ambil data saldo saat ini
        const { data: profile } = await supabaseClient.from('profiles').select('balance, nickname').eq('id', currentUser.id).single();
        const saldoMurni = profile.balance || 0;
        
        // 2. Cek apakah saldo total akun mencapai batas minimal
        if (saldoMurni < 10000) {
            showToast("Min. penarikan Rp 10.000", "error");
            return;
        }
        
        // 3. Minta nominal yang ingin ditarik
        const nominalInput = await customPrompt(`Masukkan nominal yang ingin ditarik (Saldo: Rp ${saldoMurni.toLocaleString('id-ID')}).

Catatan: Akan ada potongan biaya admin Rp 500 dari nominal yang ditarik.`, "10000");
        if (!nominalInput) return; // Batal jika di-cancel / kosong
        
        // Bersihkan inputan dari huruf atau titik
        const nominalTarik = parseInt(nominalInput.replace(/[^0-9]/g, ''));
        
        // 4. Validate nominal inputan user
        if (isNaN(nominalTarik) || nominalTarik < 10000) {
            showToast("Minimal penarikan adalah Rp 10.000", "error");
            return;
        }
        if (nominalTarik > saldoMurni) {
            showToast("Saldo Anda tidak mencukupi untuk nominal tersebut!", "error");
            return;
        }

        // 5. Minta rekening tujuan
        const rek = await customPrompt("Masukkan Nama Bank & Nomor Rekening:", "DANA - 08xxxxxxxxxx");
        if (!rek) return;

        showToast("Sedang memproses penarikan...", "info");

        // 6. POTONG SALDO KE DATABASE
        const { error: rpcError } = await supabaseClient.rpc('proses_tarik_saldo', {
            p_user_id: currentUser.id,
            p_jumlah: nominalTarik,
            p_rekening: rek
        });

        if (rpcError) throw rpcError;

        // 8. Arahkan ke WhatsApp Admin (Penomoran langsung lompat ke 8 sesuai kodemu)
        const danaBersih = nominalTarik - 500;
const teks = encodeURIComponent(`Halo Admin, saya ${profile.nickname} ingin tarik saldo.
Nominal Potong Saldo: Rp ${nominalTarik.toLocaleString('id-ID')}
*Terima Bersih (Setelah Potong 500): Rp ${danaBersih.toLocaleString('id-ID')}*

Ke Rekening: ${rek}`);
        window.open(`https://wa.me/9647808097471?text=${teks}`, '_blank');
        
        // 9. Tutup laci dan refresh UI secara instan (Optimistic UI)
        tutupModalSaldoDompet();
        
        const sisaSaldoBaru = saldoMurni - nominalTarik;
        const elSaldoAktif = document.getElementById('toko-saldo-aktif');
        if (elSaldoAktif) {
            elSaldoAktif.innerText = 'Rp ' + sisaSaldoBaru.toLocaleString('id-ID');
        }
        
        updateUiSaldoSeller();
        showToast(`Penarikan Rp ${nominalTarik.toLocaleString('id-ID')} berhasil diproses!`, "success");
        
    } catch (e) { 
        console.error("Error Tarik Saldo:", e);
        showToast("Gagal memproses penarikan saldo.", "error"); 
    } finally {
        // BUKA KUNCI KEMBALI
        isWithdrawing = false;
    }
}

// === 1. Variabel Global untuk Mode Edit ===
let editFileArray = []; // Untuk menampung file foto baru dari HP
let existingImagesEdit = []; // Untuk menampung URL foto lama dari database
let deletedImagesEdit = []; // [BARU] Menampung antrean foto lama yang dibuang saat sesi edit

// === 2. Modifikasi Fungsi Buka & Tutup Modal Edit ===
async function bukaModalEditProduk(idProduk) {
    showToast("Mengambil data...", "info");
    try {
        const { data, error } = await supabaseClient.from('player_products').select('*').eq('id', idProduk).single();
        if (error || !data) throw new Error("Produk tidak ditemukan.");
        
        document.getElementById('edit-produk-id').value = data.id;
        document.getElementById('edit-produk-nama').value = data.title;
        document.getElementById('edit-produk-harga').value = data.price;
        document.getElementById('edit-produk-kategori').value = data.category;
        document.getElementById('edit-produk-deskripsi').value = data.description;
        const isPembeli = data.fee_ditanggung_pembeli === true;
        setFeeBearer(isPembeli ? 'pembeli' : 'seller', 'edit');
        
        // 🔥 SINKRONISASI VISUAL KATEGORI BARU
        if (document.getElementById('edit-produk-snk')) {
            document.getElementById('edit-produk-snk').value = data.snk || ''; 
        }
        if (document.getElementById('edit-produk-stock')) {
            document.getElementById('edit-produk-stock').value = data.stock_list || ''; 
        }

        ubahKategoriVisual(data.category, 'edit');

        
        editFileArray = [];
        existingImagesEdit = [];
        deletedImagesEdit = [];
        
        if (data.image_url) {
            existingImagesEdit = data.image_url.split(',').map(u => u.trim()).filter(u => u !== "");
        }
        
        renderPreviewEditProduk(); 
        document.getElementById('modal-edit-produk').classList.replace('hidden', 'flex');
        history.pushState({ popup: 'edit_produk' }, null, '#editproduk');
    } catch(err) { 
        showToast("Gagal memuat form edit", "error"); 
    }
}


function tutupModalEditProduk(dariTombolBackHP = false) {
    document.getElementById('modal-edit-produk').classList.replace('flex', 'hidden');
    
    // --- BERSIHKAN MEMORI RAM (BLOB URL) SEBELUM DITUTUP ---
    const previewContainer = document.getElementById('preview-container-edit');
    if (previewContainer) {
        const images = previewContainer.querySelectorAll('img');
        images.forEach(img => {
            if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        });
        previewContainer.innerHTML = '';
    }
    
    editFileArray = [];
    existingImagesEdit = [];
    deletedImagesEdit = [];
    document.getElementById('input-foto-edit').value = '';
    
    // Mencegah looping history jika ditutup dari tombol Back HP
    if (!dariTombolBackHP && window.location.hash === '#editproduk') {
        history.back();
    }
}


// === 3. Fungsi Preview Foto Mode Edit ===
function previewGambarEdit(input) {
    if (input.files && input.files.length > 0) {
        const newFiles = Array.from(input.files);
        let isSizeError = false;

        newFiles.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) isSizeError = true;
            else editFileArray.push(file); 
        });

        if (isSizeError) showToast("Beberapa foto berukuran > 5MB diabaikan.", "error");

        renderPreviewEditProduk();
        input.value = ''; 
    }
}

function renderPreviewEditProduk() {
    const previewContainer = document.getElementById('preview-container-edit');
    
    // BERSIHKAN MEMORI BLOB LAMA SEBELUM RENDER ULANG AGAR TIDAK MENUMPUK DI RAM
    const oldImages = previewContainer.querySelectorAll('img');
    oldImages.forEach(img => {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    });
    
    previewContainer.innerHTML = '';
    
    if (existingImagesEdit.length === 0 && editFileArray.length === 0) {
        previewContainer.classList.add('hidden');
        return;
    }

    let htmlContent = '';

    // Render foto lama (dari URL) dengan label "LAMA"
    existingImagesEdit.forEach((url, index) => {
        htmlContent += `
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-brand-info/50 shadow-md">
                <img src="${url}" class="w-full h-full object-cover">
                <button onclick="hapusFotoLamaEdit(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">LAMA</div>
            </div>
        `;
    });

    // Render foto baru (dari HP) dengan label "BARU"
    editFileArray.forEach((file, index) => {
        const tempUrl = URL.createObjectURL(file);
        htmlContent += `
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-[#EE4D2D]/50 shadow-md">
                <img src="${tempUrl}" class="w-full h-full object-cover">
                <button onclick="hapusFotoBaruEdit(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-[#EE4D2D]/80 text-white text-[8px] text-center py-0.5">BARU</div>
            </div>
        `;
    });

    previewContainer.innerHTML = htmlContent;
    previewContainer.classList.remove('hidden');
}

function hapusFotoLamaEdit(index) {
    // [BARU] Ambil URL foto lama yang didelete, masukkan ke antrean eksekusi
    const fotoDibuang = existingImagesEdit[index];
    if (fotoDibuang) {
        deletedImagesEdit.push(fotoDibuang);
    }

    existingImagesEdit.splice(index, 1);
    renderPreviewEditProduk();
}


function hapusFotoBaruEdit(index) {
    editFileArray.splice(index, 1);
    renderPreviewEditProduk();
}

// === 4. Eksekusi Simpan ke Database (Fungsi yang hilang) ===
async function prosesEditProduk() {
    const idProduk = document.getElementById('edit-produk-id').value;
    const nama = document.getElementById('edit-produk-nama').value.trim();
    const hargaInputClean = document.getElementById('edit-produk-harga').value.replace(/\./g, '');
    const harga = parseInt(hargaInputClean);
    const kategori = document.getElementById('edit-produk-kategori').value;
    const deskripsi = document.getElementById('edit-produk-deskripsi').value.trim();
    
    // [BARU] Ambil data stok dan snk
    const stockList = document.getElementById('edit-produk-stock').value.trim(); // <--- INI BARIS YANG HILANG TADI
    const snkInput = document.getElementById('edit-produk-snk') ? document.getElementById('edit-produk-snk').value.trim() : null;
    
    const btn = document.getElementById('btn-submit-edit-produk');

    if (!idProduk) return showToast("Gagal mengidentifikasi ID produk!", "error");
    if (!nama || !harga || isNaN(harga) || !deskripsi) return showToast("Mohon lengkapi formulir!", "error");
    if (existingImagesEdit.length === 0 && editFileArray.length === 0) return showToast("Wajib menyertakan minimal 1 foto produk!", "error");
    
    // [BARU] Cegah user simpan kalau kategori Akun/Item tapi stoknya dikosongkan
    if ((kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') && !stockList) {
        return showToast("Wajib mengisi List Stok untuk kategori ini!", "error");
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        let uploadedUrls = [];
        
        if (editFileArray.length > 0) {
            showToast(`Mengunggah ${editFileArray.length} foto baru...`, "info");
            const uploadPromises = editFileArray.map(async (file, index) => {
                const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('pasar_edit_'+index+'_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`);
                const dataUrl = await resUrl.json();
                await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
                return dataUrl.finalVideoUrl;
            });
            uploadedUrls = await Promise.all(uploadPromises);
        }

        const finalImageArray = [...existingImagesEdit, ...uploadedUrls];
        const finalImageUrl = finalImageArray.join(',');
        const isFeePembeli = document.getElementById('edit-fee-bearer').value === 'pembeli';

        // [BARU] Update kolom stock_list ke Supabase
        const { data: updatedData, error } = await supabaseClient.from('player_products')
            .update({
                title: nama, 
                price: harga, 
                category: kategori, 
                description: deskripsi, 
                image_url: finalImageUrl,
                stock_list: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? stockList : null,
                snk: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? snkInput : null,
                fee_ditanggung_pembeli: isFeePembeli,
                user_id: currentUser.id 
            })
            .eq('id', idProduk)
            .select();

        if (error) throw error;
        
        if (!updatedData || updatedData.length === 0) {
            throw new Error("Izin ditolak oleh server (RLS UPDATE belum aktif).");
        }

        showToast("Produk berhasil diperbarui!", "success");

        // [BARU] EKSEKUSI PENGHAPUSAN FISIK FOTO YANG DIANTREKAN DARI BIZNET GIO
        if (deletedImagesEdit.length > 0) {
            for (const urlFoto of deletedImagesEdit) {
                if (urlFoto.trim() !== "") {
                    await fetch('/api/delete-s3?type=file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: urlFoto.trim() })
                    }).catch(e => console.log("Abaikan jika file S3 sudah tidak ada:", e));
                }
            }
            deletedImagesEdit = []; // Kosongkan antrean setelah dibasmi tuntas
        }

        tutupModalEditProduk();
        
        await loadProdukSaya();
        await loadPasarPlayer(true);

    } catch (err) {
        showToast("Gagal: " + err.message, "error");
        console.error("Error Edit Produk:", err);
    } finally {
        btn.innerHTML = 'Simpan Perubahan';
        btn.disabled = false;
    }
}


async function hapusProdukSaya(productId, productName) {
    const konfirmasi = await customConfirm("Yakin hapus produk: " + productName + "?");
    if (!konfirmasi) return;
    try {
        // 1. Tarik data URL foto dulu dari database sebelum dihapus
        const { data: produk } = await supabaseClient.from('player_products').select('image_url').eq('id', productId).single();

        // 2. Hapus data produk dari Supabase
        await supabaseClient.from('player_products').delete().eq('id', productId);

        // 3. TEMBAK API DELETE FILE: Jika ada banyak foto (koma), hapus semuanya!
        if (produk && produk.image_url) {
            const arrFoto = produk.image_url.split(',');
            for (const urlFoto of arrFoto) {
                if (urlFoto.trim() !== "") {
                    await fetch('/api/delete-s3?type=file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: urlFoto.trim() })
                    }).catch(e => console.log("Ignore S3 error:", e));
                }
            }
        }

        showToast("Produk dan foto berhasil dihapus!", "success");
        loadProdukSaya();
        loadPasarPlayer(true);
    } catch (e) { 
        showToast("Gagal menghapus produk.", "error"); 
    }
}

// ==========================================
// SISTEM ANTI KLIK KANAN PADA GAMBAR
// ==========================================
document.addEventListener('contextmenu', function(e) {
    // Jika yang diklik kanan adalah gambar (IMG), matikan fungsinya
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        // Opsional: Kamu bisa memunculkan toast jika mau
        // showToast("Gambar dilindungi oleh sistem.", "info");
    }
});

// ==========================================
// PUSAT KENDALI SUPER ADMIN (AUTO-DISBURSEMENT)
// ==========================================

// ⚠️ PENTING: Ganti tulisan di bawah dengan UUID Supabase milik akun Mas Aditia!
// Cara cek: Login ke AU2Hub, buka console (F12) lalu ketik: currentUser.id
const SUPER_ADMIN_ID = "5e65bd71-62f8-4367-8744-95f626b73726";

// 1. Fungsi Pembuka Pintu Rahasia (Berdasarkan Database)
function bukaSuperAdmin() {
    // Mengecek apakah di database profil kita tercentang sebagai super admin
    if (!userProfile || userProfile.is_super_admin !== true) {
        return showToast("Akses Ditolak! Area khusus dewa.", "error");
    }
    switchTab('superadmin');
    loadAdminDashboard();
    loadRiwayatKeuanganGlobal(); // <--- TAMBAHKAN BARIS INI
}


// 2. Fungsi Load Antrean & Dashboard Keuangan (Lengkap dengan Tombol Salin Sat-Set)
async function loadAdminDashboard(isRefresh = false) {
    const listContainer = document.getElementById('admin-withdrawal-list');
    const iconRefresh = document.getElementById('icon-refresh-admin');
    
    // EFEK LOADING JIKA TOMBOL REFRESH DIPENCET
    if (isRefresh) {
        if (iconRefresh) iconRefresh.classList.add('fa-spin');
        showToast("Menyinkronkan data Wall Street...", "info");
        
        // Ubah sementara angka jadi efek loading biar kerasa refresh-nya
        const ids = ['dash-omzet', 'dash-vip', 'dash-fee-seller', 'dash-fee-rekber', 'dash-qris', 'dash-hak-seller', 'admin-nominal-pending'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<i class="fas fa-circle-notch fa-spin text-sm"></i>';
        });
    }

    if (!isRefresh) {
        listContainer.innerHTML = `
            <div class="text-center py-10 flex flex-col items-center justify-center bg-black/20 rounded-[1.5rem] border border-white/5">
                <div class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Menarik Data Sistem...</span>
            </div>`;
    }

    try {
        // ========================================================
        // BAGIAN 1: TARIK DATA ANTREAN PENARIKAN (WITHDRAWAL)
        // ========================================================
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .select('*, profiles(nickname)')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        const elCountPending = document.getElementById('admin-count-pending');
        if (elCountPending) elCountPending.innerText = data.length;
        const badgeAntrean = document.getElementById('badge-admin-antrean');
        if (badgeAntrean) {
            if (data.length > 0) {
                badgeAntrean.innerText = data.length;
                badgeAntrean.classList.remove('hidden');
            } else {
                badgeAntrean.classList.add('hidden');
            }
        }
        let totalNominalTransfer = 0; 

        if (data.length > 0) {
            listContainer.innerHTML = data.map(req => {
                let namaBank = "BANK";
                let noRek = req.rekening;
                if (req.rekening.includes('-')) {
                    const parts = req.rekening.split('-');
                    namaBank = parts[0].trim();
                    noRek = parts[1].trim();
                }
                
                let nominalBersih = Number(req.nominal) - 500;
                if (nominalBersih < 0) nominalBersih = 0;
                
                totalNominalTransfer += nominalBersih; 

                return `
                <div class="bg-[#161B2E] border border-white/5 p-4 rounded-[1.5rem] flex flex-col gap-3 shadow-lg relative overflow-hidden transition-all" id="wd-${req.id}">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-accent to-brand-info"></div>
                    
                    <div class="flex justify-between items-start pl-2">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Penjual</p>
                            <h4 class="text-sm font-extrabold text-white">@${req.profiles?.nickname || 'Player'}</h4>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Potong Saldo</p>
                            <h4 class="text-sm font-black text-red-400">-Rp ${Number(req.nominal).toLocaleString('id-ID')}</h4>
                        </div>
                    </div>

                    <div class="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Penerima</span>
                            <span class="text-xs font-extrabold text-brand-info">${namaBank}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-lg font-mono font-bold text-white tracking-widest">${noRek}</span>
                            <button onclick="salinTeksAdmin('${noRek}', this, 'info')" class="w-8 h-8 rounded-lg bg-brand-info/10 text-brand-info flex items-center justify-center hover:bg-brand-info hover:text-white transition-all active:scale-95 shrink-0" title="Salin Rekening">
                                <i class="fas fa-copy text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pl-2 pr-1 mt-1">
                        <div>
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Transfer Bersih</p>
                            <h4 class="text-base font-black text-brand-success flex items-center gap-2">
                                Rp ${nominalBersih.toLocaleString('id-ID')}
                                <button onclick="salinTeksAdmin('${nominalBersih}', this, 'success')" class="text-[9px] bg-brand-success/10 border border-brand-success/20 text-brand-success px-2 py-1 rounded-md active:scale-90 transition-all font-bold">Salin Nominal</button>
                            </h4>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-2">
                        <button onclick="tolakPenarikan('${req.id}', '${req.user_id}', ${req.nominal})" class="flex-1 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-500 py-3 rounded-xl font-bold active:scale-95 transition-all text-xs">Tolak</button>
                        <button onclick="setujuiPenarikan('${req.id}', '${escapeHTML(req.profiles?.nickname || 'Player').replace(/&#39;/g, "\\'")}')" class="flex-1 bg-brand-success hover:bg-[#20bd5a] text-brand-dark py-3 rounded-xl font-extrabold active:scale-95 transition-all text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(37,211,102,0.3)]"><i class="fas fa-check-double mr-1"></i> Selesai Transfer</button>
                    </div>
                </div>`;
            }).join('');
        } else {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 px-6 text-center bg-white/5 rounded-[1.5rem] border border-white/5">
                    <div class="w-14 h-14 bg-brand-success/10 rounded-full flex items-center justify-center mb-3 border border-brand-success/20">
                        <i class="fas fa-check text-2xl text-brand-success/50"></i>
                    </div>
                    <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Semua Clear!</h4>
                    <p class="text-[10px] text-gray-500 leading-relaxed">Tidak ada antrean pencairan dana.</p>
                </div>`;
        }
        
        const elNominalPending = document.getElementById('admin-nominal-pending');
        if (elNominalPending) elNominalPending.innerText = 'Rp ' + totalNominalTransfer.toLocaleString('id-ID');

        // ========================================================
        // BAGIAN 2: HITUNG TOTAL MITRA / SELLER
        // ========================================================
        const { count } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('is_seller', true);
        const elCountSeller = document.getElementById('admin-count-seller');
        if (elCountSeller) elCountSeller.innerText = count || 0;

        // ========================================================
                // ========================================================
        // BAGIAN 3: KALKULATOR DASHBOARD KEUANGAN SUPER ADMIN
        // ========================================================
        const { data: statsAdmin, error: errStats } = await supabaseClient.rpc('get_super_admin_stats');
        
        if (errStats) throw errStats;

        // 4. Suntikkan hasil hitungan server ke Layar UI HTML
        if (document.getElementById('dash-omzet')) document.getElementById('dash-omzet').innerText = 'Rp ' + (statsAdmin.total_omzet || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-vip')) document.getElementById('dash-vip').innerText = 'Rp ' + (statsAdmin.total_vip || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-fee-seller')) document.getElementById('dash-fee-seller').innerText = 'Rp ' + (statsAdmin.total_fee_seller || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-fee-rekber')) document.getElementById('dash-fee-rekber').innerText = 'Rp ' + (statsAdmin.total_fee_rekber || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-qris')) document.getElementById('dash-qris').innerText = 'Rp ' + (statsAdmin.total_qris || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-hak-seller')) document.getElementById('dash-hak-seller').innerText = 'Rp ' + (statsAdmin.total_hak_seller || 0).toLocaleString('id-ID');

        // MATIKAN EFEK LOADING DAN KASIH NOTIFIKASI
        if (isRefresh) {
            if (iconRefresh) iconRefresh.classList.remove('fa-spin');
            showToast("Dashboard Keuangan berhasil diperbarui!", "success");
        }

    } catch (err) {
        console.error("Error Super Admin:", err);
        listContainer.innerHTML = '<div class="text-center py-4 text-xs text-red-500">Gagal memuat data dari server.</div>';
        if (isRefresh && iconRefresh) iconRefresh.classList.remove('fa-spin');
    }
}

// 3. Fungsi Salin Cepat dengan Visual Feedback
function salinTeksAdmin(teks, btnElement, colorType) {
    // Proses salin ke clipboard HP/PC
    if (navigator.clipboard && window.isSecureContext) { 
        navigator.clipboard.writeText(teks); 
    } else { 
        let tempInput = document.createElement("textarea"); 
        tempInput.value = teks; 
        document.body.appendChild(tempInput); 
        tempInput.select(); 
        document.execCommand("copy"); 
        document.body.removeChild(tempInput); 
    }

    // Getar dikit kalau HP-nya dukung
    if (navigator.vibrate) navigator.vibrate(40);

    // Manipulasi UI Sementara (Teks "Tersalin")
    const teksAsli = btnElement.innerHTML;
    const kelasAsli = btnElement.className;

    if (btnElement.innerText.includes("Salin Rek")) {
        btnElement.innerHTML = `Tersalin <i class="fas fa-check"></i>`;
        btnElement.classList.add('bg-brand-success/20', 'text-brand-success');
        btnElement.classList.remove('bg-brand-info/10', 'text-brand-info');
    } else {
        btnElement.innerHTML = `<i class="fas fa-check text-[11px]"></i>`;
        // Tetap hijau karena memang tombol nominal sudah hijau
    }

    // Kembalikan ke tampilan semula setelah 1.5 detik
    setTimeout(() => {
        btnElement.innerHTML = teksAsli;
        btnElement.className = kelasAsli;
    }, 1500);
}

// === 1. VARIABEL GEMBOK UNTUK ADMIN ===
let isAdminProcessing = false;

// === FUNGSI SETUJUI PENARIKAN (NOTIFIKASI MASUK CHAT & DOMPET) ===
async function setujuiPenarikan(wdId, nickname) {
    // 1. KUNCI LANGSUNG DI AWAL (Bukan setelah pop-up konfirmasi)
    if (isAdminProcessing) return showToast("Sistem sedang memproses...", "info");
    isAdminProcessing = true; 

    try {
        const konfirmasi = await customConfirm(`Anda YAKIN sudah mentransfer uang ini ke rekening @${nickname}?`);
        if (!konfirmasi) return; // Jika Batal, lari ke 'finally' untuk buka gembok

        showToast("Memproses...", "info");

        // 2. MATIKAN KLIK KARTU AGAR TIDAK BISA DI-SPAM KLIK
        const card = document.getElementById(`wd-${wdId}`);
        if (card) card.style.pointerEvents = 'none';

        // 3. JURUS ATOMIC UPDATE: Memaksa Supabase hanya mengeksekusi 1 kali seumur hidup
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .update({ status: 'SELESAI' })
            .eq('id', wdId)
            .eq('status', 'PENDING') // Syarat mutlak: Hanya dieksekusi jika status masih PENDING
            .select();

        if (error) throw error;
        // Jika data kosong, berarti transaksi sudah pernah dieksekusi oleh klik sebelumnya
        if (!data || data.length === 0) throw new Error("Transaksi ini sudah diproses.");

        const wdData = data[0];

        // 4A. ---> KIRIM NOTIFIKASI KE CHAT / INBOX SELLER <---
        await supabaseClient.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: wdData.user_id,
            message: `[SISTEM] Penarikan saldo berhasil diproses!

Potong Saldo: Rp ${Number(wdData.nominal).toLocaleString('id-ID')}
Biaya Admin: Rp 500
*Dana Masuk ke Bank: Rp ${(Number(wdData.nominal) - 500).toLocaleString('id-ID')}*

Silakan cek mutasi rekening Anda.`
        });

        // 4B. ---> UPDATE STATUS PENDING DI RIWAYAT DOMPET SELLER <---
        // 1. Cari dulu ID spesifik mutasi PENDING milik seller tersebut
        const { data: pendingTx } = await supabaseClient
            .from('wallet_transactions')
            .select('id')
            .eq('user_id', wdData.user_id)
            .eq('amount', wdData.nominal) // Cari nominal yang persis sama
            .ilike('description', '%PENDING%') // Cari yang masih berstatus PENDING
            .order('created_at', { ascending: false })
            .limit(1);

        if (pendingTx && pendingTx.length > 0) {
            // 2. Jika ketemu, timpa tulisan PENDING tersebut menjadi BERHASIL
            const { error: updateErr } = await supabaseClient
                .from('wallet_transactions')
                .update({ 
                    description: `✅ BERHASIL: Dana Cair Rp ${(Number(wdData.nominal) - 500).toLocaleString('id-ID')} (Potong Admin 500)` 
                })
                .eq('id', pendingTx[0].id);
                
            if (updateErr) {
                console.error("Terblokir RLS Supabase:", updateErr);
                showToast("Database menolak! Cek izin RLS Supabase Anda.", "error");
            }
        } else {
            console.log("Mutasi PENDING tidak ditemukan, mungkin diblokir oleh RLS SELECT.");
        }



        // Efek visual hilang perlahan di laci admin
        if (card) {
            card.style.opacity = '0';
            setTimeout(() => {
                card.style.display = 'none';
                let countEl = document.getElementById('admin-count-pending');
                if (countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
            }, 300);
        }

        showToast("Transaksi selesai dicatat sistem!", "success");

    } catch (err) {
        showToast(err.message || "Gagal memperbarui database.", "error");
    } finally {
        isAdminProcessing = false; // BUKA GEMBOK
    }
}

// === FUNGSI TOLAK PENARIKAN (ANTI DOBEL REFUND) ===
async function tolakPenarikan(wdId, userId, nominal) {
    if (isAdminProcessing) return showToast("Sistem sedang memproses...", "info");
    isAdminProcessing = true; // KUNCI LANGSUNG DI AWAL

    try {
        const alasan = await customPrompt("Masukkan alasan penolakan (misal: Rekening tidak valid):", "Nomor Rekening tidak valid");
        if (!alasan) return; 

        showToast("Memproses pembatalan & refund...", "info");

        const card = document.getElementById(`wd-${wdId}`);
        if (card) card.style.pointerEvents = 'none';

        // JURUS ATOMIC UPDATE
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .update({ status: 'DITOLAK' })
            .eq('id', wdId)
            .eq('status', 'PENDING')
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Transaksi ini sudah diproses.");

        // Refund saldo menggunakan RPC
        await supabaseClient.rpc('tambah_saldo', {
            p_user_id: userId,
            p_jumlah: nominal,
            p_deskripsi: `Refund Gagal Cair: ${alasan}`
        });

        // ---> TAMBAHAN BARU: KIRIM NOTIFIKASI KE INBOX SELLER <---
        await supabaseClient.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: userId,
            message: `[SISTEM] Penarikan saldo sebesar Rp ${Number(nominal).toLocaleString('id-ID')} DITOLAK oleh Admin.

Alasan: ${alasan}

Dana telah dikembalikan ke Saldo Aktif Anda.`
        });


        // Efek hilang
        if (card) {
            card.style.opacity = '0';
            setTimeout(() => {
                card.style.display = 'none';
                let countEl = document.getElementById('admin-count-pending');
                if (countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
            }, 300);
        }

        showToast("Penarikan dibatalkan, saldo direfund, dan notifikasi terkirim.", "success");

    } catch (err) {
        showToast(err.message || "Sistem gagal menolak transaksi.", "error");
    } finally {
        isAdminProcessing = false;
    }
}

// B. FUNGSI EKSEKUSINYA (Taruh di paling bawah file JS)
async function toggleStatusAdmin(targetId, isCurrentlyAdmin, nickname) {
    const aksi = isCurrentlyAdmin ? "MENCABUT" : "MEMBERIKAN";
    const konfirmasi = await customConfirm(`Yakin ingin ${aksi} akses Super Admin untuk @${nickname}?`);
    if (!konfirmasi) return;

    try {
        showToast("Memproses...", "info");
        const { error } = await supabaseClient
            .from('profiles')
            .update({ is_super_admin: !isCurrentlyAdmin })
            .eq('id', targetId);

        if (error) throw error;

        showToast(`Akses Super Admin @${nickname} berhasil diubah!`, "success");
        openUserProfile(targetId); // Refresh tampilan profilnya
    } catch (err) {
        showToast("Gagal mengubah status admin.", "error");
    }
}

// ==========================================
// SISTEM KATEGORI CHIPS (MARKETPLACE STYLE)
// ==========================================
function ubahKategoriVisual(kategoriTerpilih, tipeModal) {
    // 1. Simpan value ke input rahasia agar sistem upload/edit tetap jalan
    const inputId = tipeModal === 'edit' ? 'edit-produk-kategori' : 'jualan-kategori';
    document.getElementById(inputId).value = kategoriTerpilih;

    // 2. Reset semua tombol di laci yang aktif menjadi abu-abu
    const wadah = document.getElementById(`wadah-kategori-${tipeModal}`);
    const semuaTombol = wadah.querySelectorAll('button');
    
    semuaTombol.forEach(btn => {
        // Cek apakah tombol ini yang dipilih user
        const isCocok = btn.innerText.trim().includes(kategoriTerpilih) || (kategoriTerpilih === 'APK Premium' && btn.innerText.includes('Premium'));
        
        if (isCocok) {
            // Nyalakan tombol (Warna Oren Terang)
            btn.className = `flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#EE4D2D] bg-[#EE4D2D]/10 text-[#EE4D2D] text-[11px] font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(238,77,45,0.2)]`;
        } else {
            // Matikan tombol (Warna Abu-abu Gelap)
            btn.className = `flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 text-[11px] font-medium`;
        }
    });

    // 3. Panggil sistem Stok otomatis
    const wadahStockId = tipeModal === 'edit' ? 'wadah-stock-edit' : 'wadah-stock-jualan';
    toggleStockInput(kategoriTerpilih, wadahStockId);
}

// ==========================================
// FITUR KLAIM KODE NETFLIX OTOMATIS
// ==========================================

// Fungsi untuk membuka layar modal Netflix
function bukaModalNetflix() {
    // Opsional: Wajib login
    if (!currentUser) return showToast("Silakan login dulu untuk klaim Netflix!", "error");
    
    // Daftarkan ke history agar tombol Back HP berfungsi
    history.pushState({ popup: 'netflix' }, null, '#netflix');
    
    const modal = document.getElementById('modal-netflix');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Reset tampilan form setiap kali dibuka
    document.getElementById('input-token-netflix').value = '';
    document.getElementById('hasil-kode-netflix').classList.add('hidden');
    document.getElementById('angka-kode-netflix').innerText = '----';
}

// Fungsi utama penarik data ke server Vercel
async function klaimKodeNetflix() {
    const inputToken = document.getElementById('input-token-netflix').value.trim();
    
    if (!inputToken) {
        return showToast("Token tidak boleh kosong!", "error");
    }

    const btn = document.getElementById('btn-klaim-netflix');
    const originalText = btn.innerHTML;
    
    // Ubah tombol jadi mode loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Mengambil...';
    btn.disabled = true;

    try {
        // Tembak ke API Vercel rahasia Anda
        const response = await fetch('/api/get-netflix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: inputToken })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Gagal mengambil kode.");
        }

        // Jika berhasil, munculkan angkanya di layar HTML
        document.getElementById('angka-kode-netflix').innerText = data.code;
        document.getElementById('hasil-kode-netflix').classList.remove('hidden');
        
        showToast("Kode berhasil didapatkan!", "success");

    } catch (error) {
        // Tampilkan pesan error (seperti Token Hangus, Gmail Kosong, dsb)
        showToast(error.message, "error");
    } finally {
        // Kembalikan tombol ke bentuk semula
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// MENU KREATOR (TITIK TIGA INSTAGRAM STYLE)
// ==========================================
function bukaMenuKreator(urlVideo, vidId) {
    // Simpan data video ke input rahasia
    document.getElementById('temp-kreator-vid').value = vidId;
    document.getElementById('temp-kreator-url').value = urlVideo;

    const modal = document.getElementById('modal-kreator-option');
    const box = document.getElementById('kreator-drawer-box');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Beri jeda sangat sedikit agar animasi laci naik (slide up) terlihat mulus
    setTimeout(() => {
        box.classList.remove('translate-y-full');
    }, 10);
    
    // Daftarkan history agar jika tombol back HP dipencet, yang ketutup lacinya, bukan aplikasinya
    history.pushState({ popup: 'kreator_menu' }, null, '#opsivideo');
}

function tutupMenuKreator(dariTombolBack = false) {
    const modal = document.getElementById('modal-kreator-option');
    const box = document.getElementById('kreator-drawer-box');

    if (box) box.classList.add('translate-y-full');

    if (!dariTombolBack && window.location.hash === '#opsivideo') {
        history.back();
    }

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function eksekusiDownloadKreator() {
    const vidId = document.getElementById('temp-kreator-vid').value;
    const urlVideo = document.getElementById('temp-kreator-url').value;
    tutupMenuKreator();
    downloadVideoSaya(urlVideo, vidId); // Panggil fungsi aslimu
}

function eksekusiHapusKreator() {
    const vidId = document.getElementById('temp-kreator-vid').value;
    tutupMenuKreator();
    deleteVideo(vidId); // Panggil fungsi aslimu
}

// ==========================================
// FUNGSI TOMBOL "SAYA SUDAH BAYAR" (MANUAL CHECK)
// ==========================================
async function cekStatusManualXoftware(orderId, tableName, btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Mengecek...';
    btnElement.disabled = true;

    try {
        const res = await fetch(`/api/check-status?order_id=${orderId}&table=${tableName}&_t=${Date.now()}`);
        const data = await res.json();

        const apiStatus = String(data.status || data.data?.status || data.payment_status || '').toUpperCase();
        
        if (apiStatus === 'SUCCESS' || apiStatus === 'SUCCEEDED' || apiStatus === 'PAID' || apiStatus === 'SELESAI' || apiStatus === 'PROSES') {
            showToast("Pembayaran berhasil dikonfirmasi!", "success");
            
            // 🔥 PAKSA MUNCULKAN LAYAR SUKSES SEKARANG JUGA!
            if (window.tampilkanLayarSuksesFinal) {
                window.tampilkanLayarSuksesFinal();
            }
        } else {
            showToast("Pembayaran belum terdeteksi. Tunggu sebentar lalu coba lagi.", "info");
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    } catch (error) {
        showToast("Gagal mengecek status ke server.", "error");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

// ==========================================
// UPDATE: LOGIKA TAMBAHAN UNTUK UI SELLER CENTER BARU
// ==========================================

// 1. Jam Real-time untuk Header
setInterval(() => {
    const timeEl = document.getElementById('live-time-dashboard');
    if (timeEl) {
        const now = new Date();
        const jam = now.getHours().toString().padStart(2, '0');
        const menit = now.getMinutes().toString().padStart(2, '0');
        const detik = now.getSeconds().toString().padStart(2, '0');
        timeEl.innerText = `Waktu (now): ${jam}.${menit}.${detik} WIB`;
    }
}, 1000);

// 2. Set Link Toko Publik
function updateLinkToko() {
    const linkEl = document.getElementById('public-shop-link');
    if (linkEl && currentUser && userProfile) {
        let namaToko = userProfile.nickname ? encodeURIComponent(userProfile.nickname.trim()) : currentUser.id;
        const baseUrl = window.location.origin + window.location.pathname;
        linkEl.textContent = `${baseUrl}#tokopublik?seller=${namaToko}`; // <--- INI YANG DIUBAH
    }
}


// 3. Salin Link Toko
function salinLinkToko() {
    const linkEl = document.getElementById('public-shop-link');
    if (!linkEl) return;
    
    // Ambil textContent murni (anti truncate ...)
    const link = linkEl.textContent; 

    // Eksekusi Salin
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(() => {
            showToast("Link toko berhasil disalin!", "success");
        });
    } else {
        // Fallback untuk browser HP yang rewel
        let tempInput = document.createElement("textarea");
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        showToast("Link toko berhasil disalin!", "success");
    }
}


// 4. Modifikasi Switch Tab biar gaya tombolnya cocok dengan UI Baru
let tokoTabAktif = 'dashboard'; // Default tab adalah Dashboard

function switchTokoTab(tab) {
    tokoTabAktif = tab; 

    // Ambil Elemen Wadah Konten
    const contDash = document.getElementById('toko-tab-dashboard');
    const contPesanan = document.getElementById('toko-tab-pesanan');
    const contProduk = document.getElementById('toko-tab-produk');
    
    // Ambil Elemen Tombol Navbar
    const menuDash = document.getElementById('menu-toko-dash');
    const menuPesanan = document.getElementById('menu-toko-pesanan');
    const menuProduk = document.getElementById('menu-toko-produk');

    // Style tombol saat Aktif / Tidak Aktif
    const activeClass = 'bg-[#2A3452] text-white shadow-sm';
    const inactiveClass = 'bg-transparent text-gray-400 hover:text-white';

    // 1. Matikan Semua Tombol
    menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    menuPesanan.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${inactiveClass}`;
    menuProduk.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    
    // 2. Sembunyikan Semua Layar
    contDash.classList.replace('block', 'hidden');
    contPesanan.classList.replace('block', 'hidden');
    contProduk.classList.replace('block', 'hidden');

    // 3. Nyalakan Layar yang Diklik
    if (tab === 'dashboard') {
        menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        contDash.classList.replace('hidden', 'block');
    } else if (tab === 'pesanan') {
        menuPesanan.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${activeClass}`;
        contPesanan.classList.replace('hidden', 'block');
        if (currentUser) loadPesananMasuk();
    } else if (tab === 'produk') {
        menuProduk.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        contProduk.classList.replace('hidden', 'block');
        if (currentUser) loadProdukSaya();
    }
}


// ==========================================
// MESIN GRAFIK CHART.JS (REAL-TIME DATA)
// ==========================================
let sellerChartInstance = null; // Memori biar grafik gak numpuk pas di-refresh

function renderGrafikSeller(labels, dataBerhasil, dataPending, dataGagal) {
    const ctx = document.getElementById('sellerChart').getContext('2d');

    // Hancurkan grafik lama kalau ada (wajib biar gak nge-glitch)
    if (sellerChartInstance) {
        sellerChartInstance.destroy();
    }

    // Bikin efek gradient biar garisnya ada "Glow/Cahaya" ke bawah
    let gradientBerhasil = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBerhasil.addColorStop(0, 'rgba(6, 182, 212, 0.5)'); // Cyan transparan
    gradientBerhasil.addColorStop(1, 'rgba(6, 182, 212, 0)');   // Pudar ke bawah

    // Render Grafik Baru
    sellerChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, // Tanggal-tanggal di sumbu X
            datasets: [
                {
                    label: 'Berhasil',
                    data: dataBerhasil,
                    borderColor: '#06B6D4',
                    backgroundColor: gradientBerhasil,
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#06B6D4',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4 // Bikin garisnya melengkung mulus (smooth)
                },
                {
                    label: 'Pending',
                    data: dataPending,
                    borderColor: '#3B82F6', // Biru
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#3B82F6',
                    pointRadius: 4,
                    tension: 0.4
                },
                {
                    label: 'Gagal',
                    data: dataGagal,
                    borderColor: '#D946EF', // Ungu/Pink
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#D946EF',
                    pointRadius: 4,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false, // Kalau di-hover muncul tooltip informasinya
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#9CA3AF', boxWidth: 12, font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 9, 32, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#6B7280', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#6B7280', font: { size: 9 } }
                }
            }
        }
    });
}

// ==========================================
// ROBOT PEMBERSIH TOKO VIP KEDALUWARSA
// ==========================================
async function eksekusiSapuBersihTokoMati() {
    // 1. Gembok keamanan (Hanya Super Admin yang bisa jalankan)
    if (!userProfile || userProfile.is_super_admin !== true) return;

    const konfirmasi = await customConfirm("Yakin ingin menjalankan Robot Pembersih? \n\nIni akan membasmi semua produk dari seller yang VIP-nya sudah mati beserta file fotonya di server Biznet GIO.");
    if (!konfirmasi) return;

    showToast("Robot Pembersih sedang memindai database...", "info");

    try {
        const waktuSekarang = new Date().toISOString();

        // 2. Cari siapa saja Seller yang VIP-nya sudah lewat masa aktif
        const { data: expiredSellers, error: errSeller } = await supabaseClient
            .from('profiles')
            .select('id, nickname')
            .eq('is_seller', true)
            .lt('seller_expired_at', waktuSekarang); // lt = less than (waktunya sudah di bawah waktu saat ini)

        if (errSeller) throw errSeller;

        if (!expiredSellers || expiredSellers.length === 0) {
            return showToast("Aman! Tidak ada toko yang kedaluwarsa hari ini.", "success");
        }

        // Kumpulkan ID dari seller-seller yang sudah mati VIP-nya
        const expiredIds = expiredSellers.map(s => s.id);
        const namaSellers = expiredSellers.map(s => s.nickname).join(', ');
        
        console.log("Mendeteksi VIP kedaluwarsa pada seller:", namaSellers);

        // 3. Tarik semua produk mereka untuk mengambil URL foto Biznet-nya
        const { data: expiredProducts, error: errProd } = await supabaseClient
            .from('player_products')
            .select('id, image_url')
            .in('user_id', expiredIds);

        if (errProd) throw errProd;

        let totalDihapus = 0;

        if (expiredProducts && expiredProducts.length > 0) {
            showToast(`Ditemukan ${expiredProducts.length} produk usang. Menghapus foto dari Biznet...`, "info");

            // 4. EKSEKUSI PENGHAPUSAN FILE FISIK BIZNET GIO
            for (const produk of expiredProducts) {
                if (produk.image_url) {
                    const arrFoto = produk.image_url.split(',');
                    for (const urlFoto of arrFoto) {
                        if (urlFoto.trim() !== "") {
                            // Tembak ke API Biznet lu persis seperti sistem Delete Produk biasa
                            await fetch('/api/delete-s3?type=file', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileUrl: urlFoto.trim() })
                            }).catch(e => console.log("Abaikan jika file S3 sudah tidak ada:", e));
                        }
                    }
                }
            }

            // 5. HAPUS DATA PRODUK DARI DATABASE SUPABASE
            const { error: errDel } = await supabaseClient
                .from('player_products')
                .delete()
                .in('user_id', expiredIds);
                
            if (errDel) throw errDel;
            totalDihapus = expiredProducts.length;
        }

        // 6. Cabut status "is_seller" mereka agar laci toko mereka resmi terkunci
        await supabaseClient
            .from('profiles')
            .update({ is_seller: false })
            .in('id', expiredIds);

        // 7. Refresh UI
        showToast(`Sapu bersih sukses! ${totalDihapus} produk usang telah dimusnahkan permanen.`, "success");
        loadAdminDashboard(true); // Refresh data di layar
        loadPasarPlayer(true);    // Refresh data pasar di latar belakang

    } catch (err) {
        console.error("Error Sapu Bersih:", err);
        showToast("Gagal melakukan sapu bersih. Cek koneksi.", "error");
    }
}

// ==========================================
// BUKU KAS TRANSPARAN UNTUK NIKKY (SUPER ADMIN)
// DENGAN FITUR PENCARIAN INSTAN ALA MUTASI BANK
// ==========================================

let globalDataBukuKas = []; // Variabel untuk menampung memori kas

async function loadRiwayatKeuanganGlobal(isRefresh = false) {
    const listContainer = document.getElementById('admin-buku-kas-list');
    const iconRefresh = document.getElementById('icon-refresh-kas');
    if (!listContainer) return;

    if (isRefresh && iconRefresh) iconRefresh.classList.add('fa-spin');
    
    if (!isRefresh) {
        listContainer.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-brand-info text-2xl mb-2"></i><br><span class="text-[10px] text-gray-500">Merekap Buku Kas...</span></div>';
    }

    try {
        // Tarik 150 transaksi terakhir (Diperbanyak agar riwayat lebih panjang seperti bank)
        const { data: orders, error } = await supabaseClient
            .from('orders_player')
            .select('*, profiles!orders_player_seller_id_fkey(nickname)') 
            .eq('status', 'selesai')
            .order('waktu_selesai', { ascending: false })
            .limit(150); 

        if (error) throw error;

        if (orders && orders.length > 0) {
            // 1. OLAH DAN SIMPAN DATA KE MEMORI GLOBAL
            globalDataBukuKas = orders.map(order => {
                const hargaAsli = Number(order.price);
                const isRekber = order.product_name.includes('[+Rekber]');
                const namaPenjual = order.profiles?.nickname || 'Anonim';
                
                const jatahPajakLapak = hitungPotonganSeller(hargaAsli);
                const jatahFeeRekber = isRekber ? hitungFeeRekber(hargaAsli) : 0;
                const totalJatahNikky = jatahPajakLapak + jatahFeeRekber;

                return {
                    id: order.id,
                    product_name: order.product_name,
                    namaPenjual: namaPenjual,
                    waktuAkurat: new Date(order.waktu_selesai || order.created_at),
                    hargaAsli: hargaAsli,
                    jatahPajakLapak: jatahPajakLapak,
                    jatahFeeRekber: jatahFeeRekber,
                    totalJatahNikky: totalJatahNikky,
                    isRekber: isRekber
                };
            });

            // 2. RENDER KE HTML
            renderBukuKasList(globalDataBukuKas);

        } else {
            globalDataBukuKas = [];
            listContainer.innerHTML = '<div class="text-center py-6 text-[10px] text-gray-500 border border-white/5 rounded-2xl bg-black/20">Belum ada transaksi selesai.</div>';
        }
    } catch (e) {
        listContainer.innerHTML = '<div class="text-center py-6 text-xs text-red-500">Gagal memuat buku kas.</div>';
    } finally {
        if (isRefresh && iconRefresh) iconRefresh.classList.remove('fa-spin');
    }
}


// FUNGSI RENDER (MENCETAK ARRAY KE LAYAR)
function renderBukuKasList(dataArray) {
    const listContainer = document.getElementById('admin-buku-kas-list');
    
    if (!dataArray || dataArray.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center bg-black/20 rounded-2xl border border-white/5">
                <i class="fas fa-search-minus text-4xl text-gray-600 mb-3"></i>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Riwayat Tidak Ditemukan</h4>
                <p class="text-[10px] text-gray-500">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>`;
        return;
    }

    // 1. KELOMPOKKAN DATA BERDASARKAN HARI
    const groupedData = {};

    dataArray.forEach(tx => {
        const dateString = tx.waktuAkurat.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        if (!groupedData[dateString]) {
            groupedData[dateString] = {
                dateLabel: dateString,
                totalPendapatanHariIni: 0,
                transactions: []
            };
        }
        groupedData[dateString].totalPendapatanHariIni += tx.totalJatahNikky;
        groupedData[dateString].transactions.push(tx);
    });

    // 2. HASILKAN HTML-NYA
    let htmlOutput = '';
    for (const dateKey in groupedData) {
        const grup = groupedData[dateKey];

        htmlOutput += `
        <div class="mb-5 bg-black/20 rounded-[1.2rem] p-3 border border-white/5 shadow-md">
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-white/10 px-1">
                <h3 class="text-[11px] font-extrabold text-white flex items-center gap-2">
                    <i class="far fa-calendar-alt text-brand-info text-sm"></i> ${grup.dateLabel}
                </h3>
                <div class="text-right">
                    <span class="text-[8px] text-gray-400 uppercase tracking-widest block mb-0.5">Total Pemasukan</span>
                    <span class="text-xs font-black text-brand-success">+ Rp ${grup.totalPendapatanHariIni.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <div class="flex flex-col gap-2.5">
                ${grup.transactions.map(tx => {
                    const jam = tx.waktuAkurat.getHours().toString().padStart(2, '0') + ':' + tx.waktuAkurat.getMinutes().toString().padStart(2, '0') + ' WIB';
                    return `
                    <div class="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2 relative hover:bg-black/60 transition-colors">
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div class="flex-1 pr-2">
                                <h4 class="text-[11px] font-bold text-white line-clamp-1">${tx.product_name}</h4>
                                <p class="text-[9px] text-gray-400 mt-0.5">@${tx.namaPenjual} &bull; <span class="font-mono text-brand-info/70">#${tx.id.substring(0,8).toUpperCase()}</span></p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="text-[9px] text-gray-500 mb-0.5">${jam}</p>
                                <h4 class="text-[11px] font-black text-brand-success">+ Rp ${tx.totalJatahNikky.toLocaleString('id-ID')}</h4>
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-center bg-white/5 rounded-lg p-2">
                            <div class="flex flex-col">
                                <span class="text-[8px] text-gray-400 uppercase">Pajak Lapak</span>
                                <span class="text-[10px] font-bold text-white">Rp ${tx.jatahPajakLapak.toLocaleString('id-ID')}</span>
                            </div>
                            <div class="flex flex-col text-right">
                                <span class="text-[8px] text-gray-400 uppercase">Fee Rekber</span>
                                <span class="text-[10px] font-bold ${tx.isRekber ? 'text-brand-accent' : 'text-gray-600'}">Rp ${tx.jatahFeeRekber.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>`
                }).join('')}
            </div>
        </div>`;
    }

    listContainer.innerHTML = htmlOutput;
}


// ==========================================
// RADAR PENCARIAN BUKU KAS (AUTO RUN)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Taruh di dalam DOMContentLoaded agar event diletakkan saat HTML sudah dimuat
    setTimeout(() => {
        const searchKas = document.getElementById('cari-buku-kas');
        if (searchKas) {
            searchKas.addEventListener('input', debounce((e) => {
                const keyword = e.target.value.toLowerCase();
                
                // Jika input kosong, tampilkan semua riwayat
                if (!keyword.trim()) {
                    renderBukuKasList(globalDataBukuKas);
                    return;
                }
                
                                // Filter menggunakan memori lokal
                const filteredData = globalDataBukuKas.filter(tx => {
                    const matchNama = tx.product_name.toLowerCase().includes(keyword);
                    const matchPenjual = tx.namaPenjual.toLowerCase().includes(keyword);
                    const matchID = tx.id.toLowerCase().includes(keyword);
                    const matchNominal = tx.totalJatahNikky.toString().includes(keyword);
                    
                    // [BARU] Deteksi Tanggal (Misal: "Kamis", "15 Juni", "2026")
                    const stringTanggal = tx.waktuAkurat.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
                    const matchTanggal = stringTanggal.includes(keyword);
                    
                    return matchNama || matchPenjual || matchID || matchNominal || matchTanggal;
                });
                
                renderBukuKasList(filteredData);
            }, 300));
        }
    }, 1000);
});



// ==========================================
// FUNGSI SWITCH TAB UNTUK SUPER ADMIN
// ==========================================
let adminTabAktif = 'dashboard';

function switchAdminTab(tab) {
    adminTabAktif = tab;

    const contDash = document.getElementById('admin-tab-dashboard');
    const contKas = document.getElementById('admin-tab-kas');
    const contAntrean = document.getElementById('admin-tab-antrean');
    
    const menuDash = document.getElementById('menu-admin-dash');
    const menuKas = document.getElementById('menu-admin-kas');
    const menuAntrean = document.getElementById('menu-admin-antrean');

    // Styling tombol (Warna saat aktif & non-aktif)
    const activeClass = 'bg-brand-accent text-white shadow-sm';
    const inactiveClass = 'bg-transparent text-gray-400 hover:text-white';

    // 1. Reset semua warna tombol ke Abu-abu
    menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    menuKas.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    menuAntrean.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${inactiveClass}`;
    
    // 2. Sembunyikan semua laci (wadah list)
    contDash.classList.replace('block', 'hidden');
    contKas.classList.replace('block', 'hidden');
    contAntrean.classList.replace('block', 'hidden');

    // 3. Nyalakan tab yang dipencet
    if (tab === 'dashboard') {
        menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        contDash.classList.replace('hidden', 'block');
    } else if (tab === 'kas') {
        menuKas.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        contKas.classList.replace('hidden', 'block');
    } else if (tab === 'antrean') {
        menuAntrean.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${activeClass}`;
        contAntrean.classList.replace('hidden', 'block');
    }
}

// ==========================================
// JURUS SWIPE: SELLER CENTER (TOKO SAYA)
// ==========================================
let tokoTouchStartX = 0;
let tokoTouchStartY = 0;
const tokoSection = document.getElementById('toko');

if (tokoSection) {
    tokoSection.addEventListener('touchstart', e => {
        tokoTouchStartX = e.changedTouches[0].screenX;
        tokoTouchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    tokoSection.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        let diffX = tokoTouchStartX - touchEndX;
        let diffY = tokoTouchStartY - touchEndY;
        
        // Geser sumbu X harus > 50px DAN Geser sumbu Y harus < 50px (Biar nggak bentrok pas scroll bawah)
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
            const tabs = ['dashboard', 'pesanan', 'produk'];
            let currentIndex = tabs.indexOf(tokoTabAktif);
            
            if (diffX > 0) { 
                // Swipe ke KIRI = Pindah ke Tab KANAN (Selanjutnya)
                if (currentIndex < tabs.length - 1) switchTokoTab(tabs[currentIndex + 1]);
            } else { 
                // Swipe ke KANAN = Pindah ke Tab KIRI (Sebelumnya)
                if (currentIndex > 0) switchTokoTab(tabs[currentIndex - 1]); 
            }
        }
    }, {passive: true});
}

// ==========================================
// JURUS SWIPE: PUSAT KENDALI (SUPER ADMIN)
// ==========================================
let adminTouchStartX = 0;
let adminTouchStartY = 0;
const adminSection = document.getElementById('superadmin');

if (adminSection) {
    adminSection.addEventListener('touchstart', e => {
        adminTouchStartX = e.changedTouches[0].screenX;
        adminTouchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    adminSection.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        let diffX = adminTouchStartX - touchEndX;
        let diffY = adminTouchStartY - touchEndY;
        
        // Geser sumbu X harus > 50px DAN Geser sumbu Y harus < 50px
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
            const tabs = ['dashboard', 'kas', 'antrean'];
            let currentIndex = tabs.indexOf(adminTabAktif);
            
            if (diffX > 0) { 
                // Swipe ke KIRI = Pindah ke Tab KANAN (Selanjutnya)
                if (currentIndex < tabs.length - 1) switchAdminTab(tabs[currentIndex + 1]);
            } else { 
                // Swipe ke KANAN = Pindah ke Tab KIRI (Sebelumnya)
                if (currentIndex > 0) switchAdminTab(tabs[currentIndex - 1]); 
            }
        }
    }, {passive: true});
}

// ==========================================
// MESIN TOKO PUBLIK (TAB TERSEMBUNYI ALA SHOPEE)
// ==========================================
async function loadTokoPublikLuar(sellerName) {
    const tabTokoPublik = document.getElementById('tokopublik');
    
    // Tampilan Loading Awal
    tabTokoPublik.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[70vh]">
            <div class="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <span class="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Membuka Etalase @${sellerName}...</span>
        </div>`;

    try {
        // 1. Cari profil penjual berdasarkan nickname (TIDAK sensitif huruf besar/kecil)
        const { data: profile, error: errProfile } = await supabaseClient
            .from('profiles')
            .select('id, nickname, avatar_url, exp, is_seller, seller_expired_at')
            .ilike('nickname', sellerName)
            .single();

        if (errProfile || !profile) throw new Error("Toko <b>@" + sellerName + "</b> tidak ditemukan.");

        // 2. Cek apakah VIP-nya masih aktif
        const isVip = profile.is_seller === true;
        const expiredAt = profile.seller_expired_at ? new Date(profile.seller_expired_at) : new Date(0);
        if (!isVip || expiredAt <= new Date()) throw new Error("Toko <b>@" + sellerName + "</b> sedang tutup / masa VIP berakhir.");

        const ava = profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.nickname}&background=1A1133&color=fff`;
        const sellerExp = profile.exp || 0;
        const sellerLevel = hitungStatusLevel(sellerExp).level;
        const sellerVideoCount = allVideosData.filter(v => String(v.user_id) === String(profile.id)).length;
        const badgeHtml = getBadgeByLevelAndVideos(sellerLevel, sellerVideoCount);

        // 3. Tarik Etalase dan Hitung Total Terjual (Sales)
        const { data: products, error: errProd } = await supabaseClient.from('player_products').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
        if (errProd) throw errProd;

        const { count: countSales } = await supabaseClient.from('orders_player').select('*', {count: 'exact', head: true}).eq('seller_id', profile.id).in('status', ['selesai']);

        // 4. SUNTIKKAN UI BANNER ALA SHOPEE SELLER CENTER
        let htmlToko = `
            <!-- HEADER BANNER -->
            <div class="relative w-[calc(100%+40px)] h-44 bg-gradient-to-br from-[#FF007A] via-[#8A2BE2] to-[#00F0FF] -mx-5 px-5 pt-8 shadow-xl overflow-hidden shrink-0">
                <!-- Dekorasi Banner -->
                <div class="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
                <div class="absolute -left-5 -bottom-5 w-24 h-24 bg-black/20 rounded-full blur-lg"></div>
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                
                <div class="relative z-10 flex justify-between items-center w-full max-w-md mx-auto mt-2">
                    <button onclick="history.back()" class="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 active:scale-90 transition-all border border-white/20"><i class="fas fa-arrow-left"></i></button>
                    
                    <!-- Search Bar Palsu di Banner -->
                    <div class="flex-1 mx-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-full h-9 flex items-center px-3 cursor-text" onclick="document.getElementById('cari-toko-publik').focus()">
                        <i class="fas fa-search text-white/80 text-[10px]"></i>
                        <span class="text-[10px] text-white/80 ml-2 font-medium">Cari di toko ini...</span>
                    </div>

                    <button onclick="salinLinkTokoPublikLuar()" class="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all border border-white/20"><i class="fas fa-share-alt text-[10px]"></i></button>
                </div>
            </div>

            <!-- PROFILE INFO BOX -->
            <div class="relative px-5 pb-5 bg-brand-dark -mt-8 rounded-t-3xl pt-12 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10 mx-[-20px] w-[calc(100%+40px)] border-b border-white/5 shrink-0">
                
                <!-- FOTO PROFIL MELAYANG -->
                <div class="absolute -top-10 left-5 w-20 h-20 rounded-full bg-brand-dark p-1 flex items-center justify-center z-20 shadow-lg">
                    <img src="${ava}" class="w-full h-full rounded-full object-cover border-2 border-brand-accent">
                    <div class="absolute bottom-1 right-1 bg-brand-success w-3.5 h-3.5 rounded-full border-2 border-brand-dark shadow-sm"></div>
                </div>
                
                <div class="flex justify-between items-start">
                    <div class="flex-1 pr-2">
                        <h2 class="text-[17px] font-black text-white flex items-center gap-1.5 leading-tight mb-1">
                            ${profile.nickname} <span class="scale-[0.8] origin-left">${badgeHtml}</span>
                        </h2>
                        <p class="text-[10px] text-brand-info font-bold tracking-wide flex items-center gap-1"><i class="fas fa-check-circle"></i> Official Seller</p>
                    </div>
                    <button onclick="kirimPesanPribadi('${profile.id}')" class="bg-gradient-to-r from-brand-info to-brand-accent text-white px-5 py-2 rounded-full text-[10px] font-extrabold shadow-[0_4px_10px_rgba(0,240,255,0.3)] active:scale-95 transition-transform flex items-center gap-1.5 shrink-0 mt-1">
                        <i class="fas fa-comment-dots text-xs"></i> Chat
                    </button>
                </div>

                <!-- STATISTIK TOKO -->
                <div class="grid grid-cols-3 gap-3 mt-5 text-center">
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-white font-black text-sm">${products ? products.length : 0}</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Produk</div>
                    </div>
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-brand-success font-black text-sm">${countSales || 0}</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Terjual</div>
                    </div>
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-yellow-400 font-black text-sm flex items-center justify-center gap-1"><i class="fas fa-star text-[10px]"></i> 5.0</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Rating</div>
                    </div>
                </div>
            </div>

            <!-- FILTER & SEARCH BAR ASLI -->
            <div class="pt-4 pb-2 -mx-5 px-5 sticky top-[60px] bg-brand-dark/95 backdrop-blur-xl z-20 border-b border-white/5">
                <input type="text" id="cari-toko-publik" placeholder="Cari barang di toko ini..." class="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-brand-info transition-all shadow-inner mb-3">
                <div class="flex gap-2 overflow-x-auto hide-scroll pb-1">
                    <button class="bg-brand-accent text-white px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 shadow-[0_0_10px_rgba(255,0,122,0.3)] border border-transparent">Semua Produk</button>
                    <button class="bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 hover:text-white transition-colors cursor-not-allowed">Terlaris</button>
                    <button class="bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 hover:text-white transition-colors cursor-not-allowed">Termurah</button>
                </div>
            </div>

            <!-- GRID PRODUK DINAMIS -->
            <div id="grid-tokopublik-dynamic" class="grid grid-cols-2 gap-3 pb-20 pt-4 flex-1 overflow-y-auto"></div>
        `;

        tabTokoPublik.innerHTML = htmlToko;

        if (!products || products.length === 0) {
            document.getElementById('grid-tokopublik-dynamic').innerHTML = `<div class="col-span-2 text-center py-12 flex flex-col items-center text-gray-500 bg-black/20 rounded-2xl border border-white/5"><i class="fas fa-box-open text-4xl mb-3 opacity-30"></i><span class="text-xs">Etalase toko ini masih kosong.</span></div>`;
            return;
        }

        // 5. Gabungkan data profile agar bisa dipakai oleh fungsi render grid
        const mappedProducts = products.map(p => {
            if (!globalDataPasar.find(x => x.id === p.id)) {
                globalDataPasar.push({...p, profiles: profile}); // Suntik memori agar detail lancar
            }
            return {...p, profiles: profile};
        });

        // 6. Cetak ke layar
        renderGridPasar(mappedProducts, 'grid-tokopublik-dynamic');

        // 7. Hidupkan fitur pencarian di dalam toko
        const searchInput = document.getElementById('cari-toko-publik');
        searchInput.addEventListener('input', debounce((e) => {
            const keyword = e.target.value.toLowerCase();
            const filteredProducts = mappedProducts.filter(p => p.title.toLowerCase().includes(keyword));
            renderGridPasar(filteredProducts, 'grid-tokopublik-dynamic');
        }, 300));

    } catch (err) {
        tabTokoPublik.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[70vh] text-center px-6">
            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <i class="fas fa-store-slash text-3xl text-red-500/80"></i>
            </div>
            <h3 class="text-white font-bold text-sm mb-2">Toko Tidak Ditemukan</h3>
            <p class="text-xs text-gray-400 mb-6">${err.message || 'Terjadi kesalahan sistem.'}</p>
            <button onclick="history.back()" class="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all border border-white/10">Kembali</button>
        </div>`;
    }
}

// Fitur Salin Link Toko di Header Toko Publik
function salinLinkTokoPublikLuar() {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast("Link toko berhasil disalin!", "success"));
    } else {
        let tempInput = document.createElement("textarea");
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        showToast("Link toko berhasil disalin!", "success");
    }
}

// ==========================================
// FITUR CHECKOUT PPOB DIGIFLAZZ (POTONG SALDO)
// ==========================================
async function prosesBeliPPOB(skuCode, targetNo, harga, namaProduk) {
    if (!currentUser) return showToast("Silakan login dulu untuk membeli!", "error");

    // 1. Cek Saldo Lokal
    const { data: profile } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
    const saldoSaatIni = profile?.balance || 0;

    if (saldoSaatIni < harga) {
        return customAlert(`Saldo Anda tidak cukup!\n\nSaldo: Rp ${saldoSaatIni.toLocaleString('id-ID')}\nHarga: Rp ${harga.toLocaleString('id-ID')}\n\nSilakan deposit/Top Up saldo Anda terlebih dahulu.`);
    }

    // 2. Konfirmasi Pembelian
     const konfirmasi = await customConfirm(`Beli ${namaProduk} untuk nomor:\n${targetNo}\n\nTotal: Rp ${harga.toLocaleString('id-ID')} (Potong Saldo)?`);
     if (!konfirmasi) return;

     // SUNTIKAN BARU: Daftarkan ke riwayat HP agar tombol Back terdeteksi
     history.pushState({ popup: 'pembayaran' }, null, '#pembayaran');

     // 🔥 PERBAIKAN: HILANGKAN KATA "DIGIFLAZZ" DARI LOADING
     switchTab('pembayaran');
    const wadahPembayaran = document.getElementById('qris-container');
    if (wadahPembayaran) {
        wadahPembayaran.innerHTML = `
        <div class="text-center flex flex-col items-center w-full mt-6">
            <div class="relative flex flex-col items-center mb-6">
                <div class="absolute inset-0 bg-brand-info opacity-30 animate-pulse rounded-full" style="filter: blur(30px);"></div>
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-28 h-28 relative z-10 splash-logo-anim drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]" alt="Loading">
            </div>
            <p class="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase mt-4 animate-pulse">Menghubungkan ke Server...</p>
        </div>`;
    }

    try {
        // 3. Tembak API Vercel
        const response = await fetch('/api/digiflazz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'buy',
                user_id: currentUser.id,
                sku_code: skuCode,
                customer_no: targetNo
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || result.detail || "Transaksi dibatalkan sistem.");
        }

        // 4. Jika Sukses / Diterima Sistem!
        showToast("Pesanan berhasil diteruskan ke server!", "success");
        
        // 5. Update UI Saldo di layar
        if (typeof updateUiSaldoSeller === 'function') updateUiSaldoSeller();
        if (typeof fetchSaldoDanMutasi === 'function') fetchSaldoDanMutasi();
        if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
        
        // 6. RENDER INVOICE
        if (wadahPembayaran) {
            const digiStatus = result.data ? result.data.status : 'Diproses';
            const refId = result.data ? result.data.ref_id : 'Sistem';
            const sn = result.data ? (result.data.sn || 'Sedang dicek oleh server...') : 'Sedang dicek oleh server...';
            
            // 🔥 PERBAIKAN: GANTI KATA "PENDING" JADI "DIPROSES"
            let displayStatus = digiStatus;
            if (digiStatus === 'Pending') displayStatus = 'Diproses';

            const isSukses = (digiStatus === 'Sukses' || digiStatus === 'Pending');
            const warnaTema = isSukses ? 'brand-success' : 'red-500';
            const iconTema = isSukses ? 'fa-check' : 'fa-times';
            const shadowTema = isSukses ? 'rgba(37,211,102,0.8)' : 'rgba(239,68,68,0.8)';

            wadahPembayaran.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4 text-center modal-anim w-full relative z-10">
                    <div class="relative w-28 h-28 mb-6 mt-4">
                        <div class="absolute inset-0 bg-${warnaTema} rounded-full animate-ping opacity-20"></div>
                        <div class="w-full h-full bg-${warnaTema}/20 rounded-full flex items-center justify-center border border-${warnaTema}/50 backdrop-blur-md">
                            <i class="fas ${iconTema} text-5xl text-${warnaTema}" style="filter: drop-shadow(0 0 15px ${shadowTema});"></i>
                        </div>
                    </div>
                    <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Status: ${displayStatus}</h2>
                    <p class="text-gray-400 text-[11px] mb-6 leading-relaxed px-4">Pembayaran <b>${namaProduk}</b> senilai <b class="text-white">Rp ${harga.toLocaleString('id-ID')}</b> telah diproses sistem.</p>
                    
                    <div class="w-full bg-black/50 border border-${warnaTema}/50 rounded-xl p-4 text-left mb-6 relative shadow-inner">
                        <span class="absolute -top-2.5 left-4 bg-${warnaTema} text-${isSukses ? 'brand-dark' : 'white'} text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">STRUK PPOB</span>
                        
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 mt-2 border-b border-white/5 pb-2">
                            <span>Nomor Tujuan</span>
                            <span class="font-mono text-white font-bold">${targetNo}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 border-b border-white/5 pb-2">
                            <span>Ref ID</span>
                            <span class="font-mono text-white font-bold">${refId}</span>
                        </div>
                        <div class="flex justify-between items-start text-[10px] text-gray-400 mt-2">
                            <span>SN / Catatan</span>
                            <span class="font-mono text-brand-info font-bold text-right ml-4 leading-relaxed">${sn}</span>
                        </div>
                    </div>

                    <button type="button" onclick="history.back()" class="w-full bg-white/5 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/10 hover:bg-white/10 active:scale-95 transition-all">Tutup Halaman</button>
                </div>
            `;
        }

    } catch (err) {
        showToast(err.message, "error");
        setTimeout(() => history.back(), 1500); 
    }
}

// ==========================================
// MESIN UTAMA LAYANAN PPOB (DIGIFLAZZ + SUPABASE)
// ==========================================

// Variabel Global PPOB
let kategoriPPOBAktif = 'Pulsa'; 
let brandPPOBAktif = 'Semua'; // [BARU] Variabel untuk melacak Provider/Brand aktif
let ppobOffset = 0;
const PPOB_LIMIT = 20;
let currentPpobData = [];

// Daftar Kategori Umum
const kategoriPPOBList = [
    { id: 'Pulsa', icon: 'fa-mobile-alt' },
    { id: 'Data', icon: 'fa-wifi' },
    { id: 'E-Money', icon: 'fa-wallet' },
    { id: 'Games', icon: 'fa-gamepad' },
    { id: 'PLN', icon: 'fa-bolt' },
    { id: 'Voucher', icon: 'fa-ticket-alt' },
    { id: 'Masa Aktif', icon: 'fa-calendar-check' },
    { id: 'Pertagas', icon: 'fa-fire-alt' },
    { id: 'Token', icon: 'fa-key' },
    { id: 'PDAM', icon: 'fa-tint' },
    { id: 'BPJS', icon: 'fa-heartbeat' },
    { id: 'Telkom', icon: 'fa-phone-alt' },
    { id: 'Multifinance', icon: 'fa-file-invoice-dollar' },
    { id: 'Pajak', icon: 'fa-landmark' },
    { id: 'TV', icon: 'fa-tv' }
];

document.addEventListener('DOMContentLoaded', () => {
    renderKategoriPPOB();
    
    const btnLayanan = document.querySelector(`div[onclick*="executeAssistive('layanan')"]`);
    if (btnLayanan) {
        btnLayanan.addEventListener('click', () => {
            if (currentPpobData.length === 0) {
                pilihKategoriPPOB(kategoriPPOBAktif);
            }
        });
    }
});

// HELPER: Mengambil icon untuk header Katalog
function getKategoriIcon(id) {
    const kat = kategoriPPOBList.find(k => k.id === id);
    return kat ? kat.icon : 'fa-box';
}

function renderKategoriPPOB() {
    const container = document.getElementById('ppob-category-container');
    if (!container) return;

    // Desain Grid ala GoPay (4 Kolom, Icon di atas, Teks di bawah)
    container.innerHTML = kategoriPPOBList.map(kat => {
        return `
        <div onclick="pilihKategoriPPOB('${kat.id}')" class="flex flex-col items-center gap-2 cursor-pointer text-center group active:scale-95 transition-all">
            <div class="w-[3.25rem] h-[3.25rem] sm:w-14 sm:h-14 rounded-[1.2rem] flex items-center justify-center transition-all bg-white/5 border border-white/10 shadow-md group-hover:bg-brand-info/20 group-hover:border-brand-info/50 text-brand-info/90 group-hover:text-brand-info">
                <i class="fas ${kat.icon} text-xl drop-shadow-sm group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="text-[9px] sm:text-[10px] font-extrabold tracking-wide break-words w-full uppercase leading-snug px-0.5 text-gray-400 group-hover:text-white transition-colors">
                ${kat.id}
            </span>
        </div>`;
    }).join('');
}

function pilihKategoriPPOB(kategori) {
    kategoriPPOBAktif = kategori;
    brandPPOBAktif = 'Semua'; 
    
    // 1. TAMPILAN: Matikan Menu Utama, Nyalakan Layar Katalog
    const mainView = document.getElementById('ppob-main-view');
    const catalogView = document.getElementById('ppob-catalog-view');
    
    if (mainView && catalogView) {
        mainView.classList.add('hidden');
        catalogView.classList.remove('hidden');
        catalogView.classList.add('flex');
    }
    
    // 2. UPDATE HEADER: Ganti judul dan ikon sesuai kategori yang diklik
    const titleEl = document.getElementById('katalog-title');
    const iconEl = document.getElementById('katalog-icon');
    
    if (titleEl) titleEl.innerText = kategori;
    if (iconEl) iconEl.className = `fas ${getKategoriIcon(kategori)} text-lg`;
    
    // 3. DAFTARKAN HISTORY HP (Agar tombol back HP bisa menutup katalog ini)
    history.pushState({ popup: 'katalog_ppob' }, null, '#katalogppob');

    // 4. RESET DATA: Kosongkan nomor dan memori produk
    const inputTarget = document.getElementById('ppob-target-number');
    if (inputTarget) inputTarget.value = '';
    
    ppobOffset = 0;
    currentPpobData = [];
    
    const loadMoreBtn = document.getElementById('ppob-load-more-container');
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    
    const productGrid = document.getElementById('ppob-product-grid');
    if (productGrid) {
        productGrid.innerHTML = `
            <div class="text-center py-10 text-yellow-400">
                <i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>
                <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menyiapkan Data...</span>
            </div>`;
    }
    
    // 5. JALANKAN MESIN PENARIK DATA API SUPABASE
    loadBrandPPOB().then(() => loadProdukPPOB(false));
    
    // 6. Scroll layar ke paling atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// FUNGSI PENUTUP LAYAR KATALOG PPOB
function tutupKatalogPPOB(dariTombolBack = false) {
    const mainView = document.getElementById('ppob-main-view');
    const catalogView = document.getElementById('ppob-catalog-view');
    
    if (catalogView && mainView) {
        catalogView.classList.add('hidden');
        catalogView.classList.remove('flex');
        mainView.classList.remove('hidden');
    }
    
    // Sinkronisasi sistem History (Tombol Back Android/iOS)
    if (!dariTombolBack && window.location.hash === '#katalogppob') {
        history.back();
    }
}
// 2. FUNGSI BARU: Tarik dan Render Daftar Provider/Brand
async function loadBrandPPOB() {
    // Suntikkan wadah (container) provider secara otomatis lewat JS jika belum ada
    let brandContainer = document.getElementById('ppob-brand-container');
    if (!brandContainer) {
        const grid = document.getElementById('ppob-product-grid');
        brandContainer = document.createElement('div');
        brandContainer.id = 'ppob-brand-container';
        // Desainnya seperti kapsul (chips) yang bisa di-scroll ke samping
        brandContainer.className = 'flex overflow-x-auto hide-scroll gap-2 pb-4 px-1 items-center border-b border-white/5 mb-4 mt-2';
        grid.parentNode.insertBefore(brandContainer, grid);
    }

    brandContainer.innerHTML = '<div class="text-[10px] text-gray-500 animate-pulse">Memuat provider...</div>';

    try {
        // Minta ke Supabase: "Tolong beri tahu saya nama-nama 'brand' untuk kategori ini"
        const { data, error } = await supabaseClient
            .from('digiflazz_products')
            .select('brand')
            .eq('is_active', true)
            .ilike('category', `%${kategoriPPOBAktif}%`);

        if (error) throw error;

        // Ambil nama brand yang unik, hapus duplikat, dan urutkan sesuai abjad
        const uniqueBrands = [...new Set(data.map(item => item.brand))].sort();
        const allBrands = ['Semua', ...uniqueBrands];

        // Cetak tombolnya ke layar (Warna Biru Brand Info agar beda dari Kategori Utama)
        brandContainer.innerHTML = allBrands.map(brand => {
            const isActive = brand === brandPPOBAktif;
            const activeClass = isActive 
                ? "bg-brand-info text-brand-dark border-transparent shadow-[0_0_10px_rgba(70,179,255,0.4)]" 
                : "bg-black/40 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white";
            
            return `
            <button onclick="pilihBrandPPOB('${escapeHTML(brand).replace(/&#39;/g, "\\'")}')" class="px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 ${activeClass}">
                ${brand}
            </button>`;
        }).join('');

    } catch (err) {
        brandContainer.innerHTML = '<div class="text-[10px] text-red-500">Gagal memuat provider</div>';
    }
}

// 3. FUNGSI BARU: Saat Pengguna Memilih Salah Satu Provider (Misal: klik "OVO")
function pilihBrandPPOB(brand) {
    brandPPOBAktif = brand;
    
    // Warnai tombol provider yang diklik
    const brandContainer = document.getElementById('ppob-brand-container');
    if (brandContainer) {
        const buttons = brandContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerText.trim() === brand) {
                btn.className = "px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 bg-brand-info text-brand-dark border-transparent shadow-[0_0_10px_rgba(70,179,255,0.4)]";
            } else {
                btn.className = "px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 bg-black/40 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white";
            }
        });
    }

    // Reset Data Produk lalu saring khusus untuk Provider tersebut
    ppobOffset = 0;
    currentPpobData = [];
    document.getElementById('ppob-load-more-container').classList.add('hidden');
    document.getElementById('ppob-product-grid').innerHTML = `
        <div class="text-center py-10 text-brand-info">
            <i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>
            <span class="text-xs font-bold uppercase tracking-widest">Menyaring Produk...</span>
        </div>`;
    
    loadProdukPPOB(false);
}

// 4. UBAH FUNGSI INI: Tarik Data Bertahap dari Supabase (Tanpa Filter Aktif)
async function loadProdukPPOB(isLoadMore = false) {
    const grid = document.getElementById('ppob-product-grid');
    const btnLoadMore = document.getElementById('btn-load-more-ppob');
    
    if (isLoadMore) {
        btnLoadMore.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat...';
        btnLoadMore.disabled = true;
    }

    try {
        const from = ppobOffset;
        const to = ppobOffset + PPOB_LIMIT - 1;

        // Query Dasar (Kategori) TANPA filter is_active
        let query = supabaseClient
            .from('digiflazz_products')
            .select('*')
            .ilike('category', `%${kategoriPPOBAktif}%`);

        // Filter Brand jika dipilih
        if (brandPPOBAktif !== 'Semua') {
            query = query.ilike('brand', `%${brandPPOBAktif}%`);
        }

        const { data, error } = await query.order('seller_price', { ascending: true }).range(from, to);

        if (error) throw error;

        if (!isLoadMore) {
            currentPpobData = data;
        } else {
            currentPpobData = [...currentPpobData, ...data];
        }

        const wadahLoadMore = document.getElementById('ppob-load-more-container');
        if (data.length === PPOB_LIMIT) {
            ppobOffset += PPOB_LIMIT; 
            wadahLoadMore.classList.remove('hidden');
        } else {
            wadahLoadMore.classList.add('hidden'); 
        }

        renderGridPPOB();

    } catch (err) {
        console.error("PPOB Fetch Error:", err);
        if (!isLoadMore) {
            grid.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data layanan. Cek koneksi Anda.</div>';
        } else {
            showToast("Gagal memuat produk selanjutnya.", "error");
        }
    } finally {
        if (isLoadMore) {
            btnLoadMore.innerHTML = 'Tampilkan Lebih Banyak <i class="fas fa-chevron-down ml-1"></i>';
            btnLoadMore.disabled = false;
        }
    }
}

// Fungsi Cetak Data PPOB ke Layar HTML (Dengan Label Gangguan)
function renderGridPPOB() {
    const grid = document.getElementById('ppob-product-grid');

    if (currentPpobData.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-center bg-black/20 rounded-2xl border border-white/5">
                <i class="fas fa-box-open text-4xl text-gray-600 mb-3"></i>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Produk Kosong</h4>
                <p class="text-[10px] text-gray-500">Layanan untuk kategori ini sedang tidak tersedia.</p>
            </div>`;
        return;
    }

    grid.innerHTML = currentPpobData.map((item, index) => {
        // Cek status aktif
        const isActive = item.is_active !== false; 

        // Animasi muncul berurutan (Smooth Reveal)
        const delayAnimasi = Math.min(index * 0.03, 0.3);
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.seller_price);
        
        // Escape karakter berbahaya pada nama produk (anti-XSS)
        const namaAman = escapeHTML(item.product_name).replace(/&#39;/g, "\\'");

        // Jika gangguan: bikin kusam, disable klik beli, dan tambah badge
        const tampilanCard = isActive 
            ? "hover:bg-white/10 hover:border-brand-info/30 active:scale-95 cursor-pointer" 
            : "opacity-60 grayscale cursor-not-allowed";
            
        const aksiKlik = isActive 
            ? `onclick="pemicuBeliPPOB('${item.sku_code}', '${namaAman}', ${item.seller_price})"` 
            : `onclick="showToast('Mohon maaf, produk ini sedang gangguan dari pusat.', 'error')"`;

        const badgeGangguan = !isActive 
            ? `<span class="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-bl-xl rounded-tr-[1rem] shadow-md tracking-wider z-10">GANGGUAN</span>` 
            : '';

        return `
        <div ${aksiKlik} style="animation-delay: ${delayAnimasi}s; opacity: 0;" class="bg-black/40 border border-white/5 p-4 rounded-[1rem] flex justify-between items-center gap-3 transition-all smooth-reveal shadow-sm group relative overflow-hidden ${tampilanCard}">
            ${badgeGangguan}
            <div class="flex-1 min-w-0 pr-2 border-r border-white/5 relative z-0">
                <h4 class="text-[11px] font-bold text-white line-clamp-2 leading-snug mb-1 ${isActive ? 'group-hover:text-brand-info transition-colors' : ''}">${item.product_name}</h4>
                <div class="text-[9px] text-gray-500 uppercase tracking-widest font-bold">${item.brand}</div>
            </div>
            <div class="flex flex-col items-end shrink-0 relative z-0">
                <span class="text-[10px] text-gray-400 mb-0.5">Harga</span>
                <span class="text-[13px] font-black text-brand-success tracking-tight">${formatHarga}</span>
            </div>
        </div>`;
    }).join('');
}
// Eksekusi Saat Kartu Produk Diklik
function pemicuBeliPPOB(skuCode, namaProduk, harga) {
    // 1. Ambil nomor dari input box
    const targetEl = document.getElementById('ppob-target-number');
    const targetNo = targetEl.value.trim();

    // 2. Validasi Nomor
    if (!targetNo) {
        targetEl.focus();
        return showToast("Mohon isi Nomor Tujuan atau ID Game terlebih dahulu!", "error");
    }

    // Hindari karakter aneh pada nomor (hanya izinkan angka dan beberapa simbol game standar)
    const cleanTargetNo = targetNo.replace(/[^a-zA-Z0-9-]/g, '');

    // 3. Lemparkan ke Mesin Utama yang ada di instruksi sebelumnya
    prosesBeliPPOB(skuCode, cleanTargetNo, harga, namaProduk);
}

// ==========================================
// FITUR TOP UP SALDO OTOMATIS (QRIS)
// ==========================================
async function mulaiTopUpSaldo() {
    if (!currentUser) return showToast("Silakan login terlebih dahulu!", "error");
    
    // 1. Minta input nominal dari buyer
    const input = await customPrompt("Masukkan nominal Top Up (Minimal Rp 10.000):", "10000");
    if (!input) return; // Batal jika kosong/ditutup
    
    // 2. Bersihkan inputan dari huruf/simbol
    const nominal = parseInt(input.replace(/[^0-9]/g, ''));
    
    // 3. Validasi angka
    if (isNaN(nominal) || nominal < 10000) {
        return showToast("Minimal Top Up adalah Rp 10.000", "error");
    }

    // 4. Tutup laci dompet agar layar bersih
    tutupModalSaldoDompet();

    // 5. Lempar ke jalur Xoftware Pay dengan kode rahasia [DEPOSIT]
    // Fungsi bawaan Anda: checkoutXoftwarePay(namaProduk, harga, deskripsi, sellerId, productId)
    checkoutXoftwarePay(
        `[DEPOSIT] Top Up Saldo Rp ${nominal.toLocaleString('id-ID')}`, 
        nominal, 
        "Isi saldo dompet AU2Hub", 
        null, 
        null
    );
}

// ==========================================
// SINKRONISASI SALDO GLOBAL PENGGUNA
// ==========================================
async function updateSaldoGlobal() {
    if (!currentUser) {
        const elLayanan = document.getElementById('layanan-saldo-user');
        if (elLayanan) elLayanan.innerText = 'Rp 0';
        return;
    }
    
    try {
        const { data } = await supabaseClient.from('profiles').select('balance').eq('id', currentUser.id).single();
        const saldo = data?.balance || 0;
        
        // Update angka di Kartu Saldo Tab Layanan PPOB
        const elLayanan = document.getElementById('layanan-saldo-user');
        if (elLayanan) elLayanan.innerText = 'Rp ' + saldo.toLocaleString('id-ID');
        
    } catch (e) {
        console.error("Gagal sinkronisasi saldo:", e);
    }
}

// ==========================================
// FITUR SUPER ADMIN: SINKRONISASI PPOB DIGIFLAZZ
// ==========================================
async function eksekusiSinkronisasiPPOB() {
    // 1. Gembok keamanan (Hanya Super Admin yang bisa jalankan)
    if (!userProfile || userProfile.is_super_admin !== true) {
        return showToast("Akses Ditolak! Hanya Super Admin yang bisa melakukan ini.", "error");
    }

    // 2. Minta konfirmasi sebelum mengeksekusi
    const konfirmasi = await customConfirm("Yakin ingin melakukan sinkronisasi data produk Digiflazz sekarang?\n\nSistem akan menarik data terbaru dari pusat. Proses ini mungkin memakan waktu beberapa detik.");
    if (!konfirmasi) return;

    const btn = document.getElementById('btn-sync-digiflazz');
    const originalText = btn.innerHTML;

    // 3. Ubah tampilan tombol jadi loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-base"></i> Sedang Menyinkronkan...';
    btn.disabled = true;
    showToast("Memulai sinkronisasi data PPOB...", "info");

    try {
        // 4. Tembak API di latar belakang (tanpa buka tab baru)
        const response = await fetch('/api/digiflazz?action=sync', {
            method: 'GET'
        });

        // Tangkap respon dari server Vercel Anda
        const result = await response.json();

        if (response.ok) {
            // Jika berhasil
            showToast("Sinkronisasi PPOB berhasil diselesaikan!", "success");
            
            // Opsional: Refresh daftar PPOB di layar jika sedang terbuka
            if (typeof loadProdukPPOB === 'function') {
                // Hapus cache lokal dan muat ulang
                ppobOffset = 0;
                currentPpobData = [];
                loadProdukPPOB(false);
            }
        } else {
            // Jika Vercel mengembalikan error
            throw new Error(result.error || result.message || "Gagal sinkronisasi dari server.");
        }

    } catch (error) {
        console.error("Error Sinkronisasi:", error);
        showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
        // 5. Kembalikan tombol seperti semula setelah selesai (sukses/gagal)
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
