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

// ==========================================
// 4. MANAJEMEN SESI & AUTENTIKASI (LOGIN/REGISTER)
// ==========================================
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
        await fetchBlockedUsers(); 
        checkGlobalUnreadMessages();
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.remove('hidden')); 
        document.getElementById('profile-logged-out').classList.add('hidden'); 
        updateUIForLoggedIn(); 
        initPresence(); 
        initGlobalMessageListener(); 
    } else { 
        if (presenceChannel) { supabaseClient.removeChannel(presenceChannel); presenceChannel = null; }
        if (globalMessageSubscription) { supabaseClient.removeChannel(globalMessageSubscription); globalMessageSubscription = null; }
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden')); 
        document.getElementById('profile-logged-out').classList.remove('hidden'); 
        updateUIForLoggedOut(); 
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
        if (window.location.hash === '#auth') {
            history.back();
        } else {
            modal.classList.add('hidden'); 
            modal.classList.remove('flex'); 
        }
        modal.style.opacity = '1';
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

        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
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
    await supabaseClient.auth.signOut(); 
    currentUser = null;
    userProfile = null;
    blockedUsersList = [];
    
    if (globalMessageSubscription) {
        supabaseClient.removeChannel(globalMessageSubscription);
        globalMessageSubscription = null;
    }

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
    
    if(currentUser) {
        fetchFollowStats(currentUser.id);
    }
}

function updateUIForLoggedOut() { 
    document.getElementById('header-user').innerHTML = `<button onclick="openAuthModal()" class="text-[10px] font-bold bg-white/10 px-4 py-2 rounded-full border border-white/10 uppercase active:scale-95 transition-transform">Login / Daftar</button>`; 
}

// ==========================================
// 5. MANAJEMEN PROFIL
// ==========================================
async function fetchProfile() {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) { 
        userProfile = data; 
    } else {
        userProfile = { nickname: 'Player', avatar_url: '', bio: 'Halo! Salam kenal.' };
        await supabaseClient.from('profiles').upsert({ id: currentUser.id, nickname: 'Player', avatar_url: '', bio: 'Halo! Salam kenal.' });
    }
    
    if(!viewedUserId || viewedUserId === currentUser.id) {
        const pNick = document.getElementById('profile-nickname'); if(pNick) pNick.innerText = "@" + (userProfile.nickname || "Player"); 
        const pBio = document.getElementById('profile-bio'); if(pBio) pBio.innerText = userProfile.bio || "Belum ada deskripsi."; 
        if (userProfile.avatar_url && userProfile.avatar_url !== "") {
            const pImg = document.getElementById('profile-img'); if(pImg) pImg.src = userProfile.avatar_url; 
        }
    }
}

async function openUserProfile(userId) {
    viewedUserId = userId;
    switchTab('profile', null, false);
    document.getElementById('profile-loading').classList.remove('hidden');
    document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.add('hidden'));
    
    const isOwn = (userId === currentUser?.id);
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    
    const elNick2 = document.getElementById('profile-nickname'); if(elNick2) elNick2.innerText = "@" + (data?.nickname || "Player");
    const elBio2 = document.getElementById('profile-bio'); if(elBio2) elBio2.innerText = data?.bio || "Belum ada deskripsi.";
    const elImg2 = document.getElementById('profile-img'); if(elImg2) elImg2.src = data?.avatar_url || `https://ui-avatars.com/api/?name=${data?.nickname || 'Player'}&background=1A1133&color=fff`;

    const actionOwn = document.getElementById('profile-actions-own'); if(actionOwn) actionOwn.classList.toggle('hidden', !isOwn);
    const actionOther = document.getElementById('profile-actions-other'); if(actionOther) actionOther.classList.toggle('hidden', isOwn);
    
    document.getElementById('btn-back-profile').classList.toggle('hidden', isOwn);
    
    const inputAva = document.getElementById('btn-edit-avatar');
    if(inputAva) inputAva.classList.toggle('hidden', !isOwn);

    const elVidTitle = document.getElementById('profile-video-title');
    if(elVidTitle) {
        if(isOwn) { elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video Saya`; } 
        else { elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video ${data?.nickname || ''}`; }
    }
    
    const userVideos = allVideosData.filter(v => v.user_id === userId);
    const elLikes = document.getElementById('profile-total-likes');
    if (elLikes) elLikes.innerText = (userVideos.length * 3);

    renderProfileVideos(userId);
    fetchFollowStats(userId); 
    
    document.getElementById('profile-loading').classList.add('hidden');
    document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.remove('hidden'));
    
    checkBlockStatusUI();
    
    if(!isOwn) history.pushState({ popup: 'user_profile' }, null, `#profile?id=${userId}`);
}

function viewUserProfile(userId) {
    if (!userId || userId === 'undefined') { 
        showToast("Profil tidak dapat dibuka karena ID tidak ditemukan.", "error"); 
        return; 
    }
    if (blockedUsersList.includes(userId)) {
        showToast("Anda telah memblokir pengguna ini. Buka blokir untuk melihat profil.", "error");
        return;
    }
    document.getElementById('comment-drawer').classList.remove('open');
    cancelReply();
    const widget = document.getElementById('floating-widget');
    if (widget && !widget.classList.contains('opacity-0')) {
        widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
    }
    openUserProfile(userId);
}

function kembaliDariProfil() {
    switchTab(tabSebelumnya, null, false);
    history.replaceState(null, null, '#' + tabSebelumnya);
    
    if (currentUser) {
        viewedUserId = currentUser.id;
        const pNick = document.getElementById('profile-nickname'); if(pNick) pNick.innerText = "@" + (userProfile?.nickname || "Player");
        const pBio = document.getElementById('profile-bio'); if(pBio) pBio.innerText = userProfile?.bio || "Belum ada deskripsi.";
        const pImg = document.getElementById('profile-img'); if(pImg) pImg.src = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Player'}&background=1A1133&color=fff`;

        const actionOwn = document.getElementById('profile-actions-own'); if(actionOwn) actionOwn.classList.remove('hidden');
        const actionOther = document.getElementById('profile-actions-other'); if(actionOther) actionOther.classList.add('hidden');
        
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

function openEditProfileModal() {
    if(!currentUser) return;
    document.getElementById('edit-nick').value = userProfile?.nickname || '';
    document.getElementById('edit-bio').value = userProfile?.bio || '';
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
        const newPass = document.getElementById('edit-pass').value.trim();
        
        if(!newNick) { showToast("Nickname tidak boleh kosong!", "error"); return; }
        if (newPass) {
            const { error: errPass } = await supabaseClient.auth.updateUser({ password: newPass });
            if (errPass) { showToast("Gagal ganti password: " + errPass.message, "error"); return; }
        }

        const currentAvatar = userProfile?.avatar_url || "";
        const { error } = await supabaseClient.from('profiles').upsert({
            id: currentUser.id, nickname: newNick, bio: newBio, avatar_url: currentAvatar
        });

        if (error) {
            if (error.code === '23505') throw new Error("Nickname tersebut sudah dipakai player lain!");
            throw error; 
        }

        await fetchProfile(); 
        updateUIForLoggedIn(); 
        closeEditProfileModal();
        showToast("Profil berhasil diperbarui!", "success");
    } catch (err) {
        showToast("Terjadi Kesalahan: " + err.message, "error");
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
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

async function handleAvatarUpload(event) {
    const file = event.target.files[0]; if (!file) return; 
    const icon = document.querySelector('label[for="avatar-input"] i'); icon.className = 'fas fa-spinner fa-spin';
    try {
        const compressedBlob = await compressImage(file); 
        const base64data = await new Promise((resolve) => {
            const reader = new FileReader(); reader.readAsDataURL(compressedBlob); reader.onloadend = () => resolve(reader.result);
        });
        
        const response = await fetch('/api/upload-foto', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileBase64: base64data, userId: currentUser.id })
        });
        
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const currentNick = userProfile?.nickname || "Player";
        const { error: dbErr } = await supabaseClient.from('profiles').upsert({ id: currentUser.id, nickname: currentNick, avatar_url: data.url }); 
        if (dbErr) throw new Error(dbErr.message);

        const elImg = document.getElementById('profile-img'); if(elImg) elImg.src = data.url; 
        
        await fetchProfile(); updateUIForLoggedIn(); showToast("Foto profil berhasil diperbarui!", "success");
    } catch (e) { showToast("Gagal upload: " + e.message, "error"); } finally { icon.className = 'fas fa-camera text-xs'; }
}

// ==========================================
// 6. MANAJEMEN FOLLOW & BLOKIR
// ==========================================
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
        await supabaseClient.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        btns.forEach(btn => { btn.innerText = 'IKUTI'; btn.classList.replace('bg-white/10', 'bg-brand-accent'); });
        showToast("Batal mengikuti", "info");
    } else {
        await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
        btns.forEach(btn => { btn.innerText = 'MENGIKUTI'; btn.classList.replace('bg-brand-accent', 'bg-white/10'); });
        showToast("Berhasil mengikuti!", "success");
    }
    fetchFollowStats(targetUserId);
}

async function feedToggleFollow(targetUserId, btnElement) {
    if (!currentUser) return openAuthModal();
    if (currentUser.id === targetUserId) return showToast("Ini video milikmu sendiri!", "info");
    
    const icon = btnElement.querySelector('i'); icon.className = 'fas fa-spinner fa-spin text-[10px]';
    try {
        await toggleFollow(targetUserId); 
        btnElement.classList.add('scale-0', 'opacity-0');
        setTimeout(() => { btnElement.style.display = 'none'; }, 300);
    } catch(e) { icon.className = 'fas fa-plus text-[10px]'; }
}

async function showUserList(type) {
    if (!currentUser && viewedUserId === null) return;
    const targetId = viewedUserId || currentUser.id;
    const modal = document.getElementById('modal-user-list');
    const container = document.getElementById('user-list-container');
    const title = document.getElementById('user-list-title');
    
    title.innerText = type === 'mengikuti' ? 'Mengikuti' : 'Pengikut';
    modal.classList.remove('hidden'); modal.classList.add('flex');
    container.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';
    
    let query = supabaseClient.from('follows').select(type === 'mengikuti' ? 'following_id' : 'follower_id').eq(type === 'mengikuti' ? 'follower_id' : 'following_id', targetId);
    const { data: follows } = await query;
    
    if (!follows || follows.length === 0) { container.innerHTML = `<p class="text-center text-xs text-gray-500 mt-10">Belum ada ${type}.</p>`; return; }
    
    const ids = follows.map(f => type === 'mengikuti' ? f.following_id : f.follower_id);
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url, bio').in('id', ids);
    
    if (profiles && profiles.length > 0) {
        container.innerHTML = profiles.map(p => {
            const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
            return `
            <div onclick="viewUserProfile('${p.id}'); closeUserList();" class="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all border-b border-white/5 last:border-0">
                <img src="${ava}" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
                <div class="ml-3"><h4 class="font-bold text-white text-xs">${p.nickname}</h4><p class="text-[10px] text-gray-400 truncate w-48">${p.bio || ''}</p></div>
            </div>`;
        }).join('');
    }
}

function closeUserList() {
    const modal = document.getElementById('modal-user-list');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}

async function fetchBlockedUsers() {
    if(!currentUser) return;
    try {
        const { data, error } = await supabaseClient.from('blocks').select('blocked_id').eq('blocker_id', currentUser.id);
        if(!error && data) { blockedUsersList = data.map(d => d.blocked_id); }
    } catch(e) { console.error("Gagal mengambil status blokir", e); }
}

async function toggleBlockUser(userId) {
    if(!currentUser) return openAuthModal();
    const btn = document.getElementById('btn-block-user');
    try {
        if(blockedUsersList.includes(userId)) {
            const hapus = confirm("Buka blokir pengguna ini?");
            if(hapus) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                await supabaseClient.from('blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', userId);
                blockedUsersList = blockedUsersList.filter(id => id !== userId);
                showToast("Blokir dibuka", "success"); checkBlockStatusUI();
            }
        } else {
            const blokir = confirm("Blokir pengguna ini? Anda tidak akan melihat video dan pesannya.");
            if(blokir) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                await supabaseClient.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: userId });
                blockedUsersList.push(userId);
                showToast("Pengguna diblokir", "info"); checkBlockStatusUI();
                allVideosData = allVideosData.filter(v => v.user_id !== userId);
                if(document.getElementById('sosial').classList.contains('active')) loadVideos();
            }
        }
    } catch(e) { showToast("Terjadi kesalahan sistem blokir", "error"); checkBlockStatusUI(); }
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

// ==========================================
// 7. MANAJEMEN VIDEO FEED & PROFIL SCROLL
// ==========================================
async function renderProfileVideos(targetUserId = null) {
    const grid = document.getElementById('profile-video-grid');
    if (!grid) return;
    
    const uidToRender = targetUserId || (currentUser ? currentUser.id : null);
    if (!uidToRender) { grid.innerHTML = ''; return; }

    if (allVideosData.length === 0) {
        try {
            grid.innerHTML = '<div class="col-span-3 text-center text-xs text-brand-info py-4"><i class="fas fa-spinner fa-spin text-xl mb-2"></i><br>Memuat...</div>';
            const res = await fetch('/api/get-videos');
            let dataDariSheet = await res.json();
            
            dataDariSheet = dataDariSheet.map(v => {
                v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
                return v;
            });
            
            newUploads.forEach(newVid => {
                newVid.id = newVid.id || newVid.video_id; 
                if (!dataDariSheet.find(v => v.id === newVid.id)) dataDariSheet.push(newVid);
            });
            
            dataDariSheet = dataDariSheet.filter(v => !blockedUsersList.includes(v.user_id));
            allVideosData = dataDariSheet;
        } catch(e) {
            grid.innerHTML = '<p class="col-span-3 text-center text-xs text-red-500 py-4">Gagal memuat video profil.</p>';
            return;
        }
    }

    const userVideos = allVideosData.filter(v => v.user_id === uidToRender);
    const elLikes = document.getElementById('profile-total-likes');
    if (elLikes) elLikes.innerText = (userVideos.length * 3);

    const reversedVideos = [...userVideos].reverse();
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
    `}).join('');
}

function openProfileFeed(userId, startIndex) {
    currentProfileVideos = allVideosData.filter(v => v.user_id === userId);
    if(currentProfileVideos.length === 0) return;

    currentProfileVideos = [...currentProfileVideos].reverse();
    profileFeedIndex = parseInt(startIndex) || 0;

    const container = document.getElementById('floating-feed-container');
    container.innerHTML = '';
    container.scrollTop = 0; 
    
    document.querySelectorAll('.video-player').forEach(v => v.pause());
    
    document.getElementById('floating-video-player').classList.remove('hidden');
    document.getElementById('floating-video-player').classList.add('flex');

    if(floatObs) floatObs.disconnect();
    setupFloatVideoObserver();

    renderProfileVideoBatch();
    history.pushState({ popup: 'floating_video' }, null);
}

function setupFloatVideoObserver() {
    floatObs = new IntersectionObserver(es => {
        es.forEach(e => {
            if (e.isIntersecting) {
                e.target.play().catch(() => {}); e.target.muted = isGlobalMuted;
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

function renderProfileVideoBatch() {
    const container = document.getElementById('floating-feed-container');
    if (profileFeedIndex >= currentProfileVideos.length) return;

    const nextBatch = currentProfileVideos.slice(profileFeedIndex, profileFeedIndex + 3);
    if (nextBatch.length === 0) return;

    const htmlString = nextBatch.map((vid) => `
        <div class="snap-start w-full h-full flex-shrink-0 relative flex items-center justify-center overflow-hidden bg-black/95 px-0 sm:px-4 py-0 sm:py-6">
            <div class="w-full max-w-sm aspect-[9/16] relative bg-brand-dark mx-auto h-full sm:h-auto sm:rounded-3xl overflow-hidden shadow-2xl">
                <div class="absolute inset-0 flex items-center justify-center z-0"><div class="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div></div>
                <video class="absolute inset-0 m-auto w-full h-full object-cover float-video-player transition-opacity duration-500 opacity-0 z-10" 
                       onloadeddata="this.classList.remove('opacity-0')" loop ${isGlobalMuted ? 'muted' : ''} playsinline preload="metadata"
                       ontimeupdate="updateVideoProgress(this)"
                       onclick="handleFloatVideoClick(event, this, '${vid.id}')" onerror="handleVideoError(this)">
                    <source src="${vid.video_url}" type="video/mp4">
                </video>
                
                <div class="time-indicator absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-extrabold text-4xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] opacity-0 transition-opacity z-[60] pointer-events-none tracking-wider bg-black/40 px-6 py-2 rounded-2xl backdrop-blur-sm">
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

                <div class="absolute bottom-0 left-0 w-full p-6 flex justify-between items-end z-20 pointer-events-none bg-gradient-to-t from-black/80 to-transparent pb-10 sm:pb-6">
                    <div class="text-white drop-shadow-lg w-[75%] pointer-events-auto">
                        <p class="font-bold text-[15px] shadow-black drop-shadow-md mb-1.5">@${vid.nickname || "Player"}</p>
                        <div onclick="this.classList.toggle('expanded')" class="caption-text text-[13px] opacity-90 shadow-black drop-shadow-md cursor-pointer pr-2 leading-relaxed">${formatCaption(vid.caption)}</div>
                    </div>
                    
                    <div class="flex flex-col gap-4 items-center pointer-events-auto mb-2 mr-1">
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
                        <button onclick="deleteVideo('${vid.id}')" class="hover:scale-110 transition-transform mt-3 active:scale-90">
                            <div class="bg-black/50 p-2 rounded-full border border-white/20 backdrop-blur-sm">
                                <i class="fas fa-trash text-red-500 text-xl drop-shadow-md"></i>
                            </div>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`).join('');

    container.insertAdjacentHTML('beforeend', htmlString);
    profileFeedIndex += 3;

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
                if(entries[0].isIntersecting) { lastVideoObserver.disconnect(); renderProfileVideoBatch(); }
            }, { threshold: 0.1 });
            lastVideoObserver.observe(v.closest('.snap-start'));
        }
    });
}

function handleFloatVideoClick(event, videoElement, vidId) {
    const now = Date.now();
    const TIMESLOT = 300; 
    if (now - lastTap < TIMESLOT) {
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        likeVideo(vidId, likeBtn);
        createHeartAt(event);
    } else {
        setTimeout(() => { if (Date.now() - lastTap >= TIMESLOT) toggleGlobalAudio(); }, TIMESLOT);
    }
    lastTap = now;
}

function closeFloatingVideo() {
    const p = document.getElementById('floating-video-player');
    p.classList.add('hidden'); p.classList.remove('flex');
    document.getElementById('floating-feed-container').innerHTML = '';
    if(floatObs) floatObs.disconnect(); 
}

function handleVideoClick(event, videoElement, vidId) {
    const now = Date.now();
    const TIMESLOT = 300; 
    if (now - lastTap < TIMESLOT) {
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        likeVideo(vidId, likeBtn);
        createHeartAt(event);
    } else {
        setTimeout(() => { if (Date.now() - lastTap >= TIMESLOT) toggleGlobalAudio(); }, TIMESLOT);
    }
    lastTap = now;
}

async function deleteVideo(vidId) {
    const hapus = await customPrompt("Ketik 'HAPUS' jika ingin menghapus video ini:");
    if(hapus === 'HAPUS') {
        allVideosData = allVideosData.filter(v => v.id !== vidId);
        closeFloatingVideo();
        renderProfileVideos();
        showToast("Video berhasil dihapus", "success");
    }
}

function shareVideo(vidId, btn) {
    const finalId = vidId && vidId !== 'undefined' ? vidId : '';
    if (!finalId) { showToast("Gagal menyalin link: ID Video tidak ditemukan", "error"); return; }

    const link = window.location.origin + window.location.pathname + '#sosial?vid=' + finalId;
    navigator.clipboard.writeText(link).then(() => {
        showToast("Link video disalin ke clipboard!", "success");
        const icon = btn.querySelector('i');
        icon.classList.replace('fa-share', 'fa-check'); icon.classList.add('text-brand-success');
        setTimeout(() => { icon.classList.replace('fa-check', 'fa-share'); icon.classList.remove('text-brand-success'); }, 2000);
    }).catch(() => { showToast("Gagal menyalin link otomatis", "error"); });
}

// ==========================================
// 8. MANAJEMEN KOMENTAR & LIKE VIDEO
// ==========================================
function openComments(id) {
    history.pushState({ popup: 'comments' }, null, '#comments'); 
    activeVideoId = id; 
    document.getElementById('comment-drawer').classList.add('open'); 
    loadComments(id); 
}

function closeComments() {
    if (window.location.hash === '#comments') { history.back(); } 
    else { document.getElementById('comment-drawer').classList.remove('open'); cancelReply(); }
}

async function loadComments(videoId, silent = false) {
    const list = document.getElementById('comment-list');
    if (!silent) list.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-3xl"></i></div>'; 
    cancelReply();

    try {
        const response = await fetch(`/api/comment?video_id=${videoId}`);
        const data = await response.json();
        
        document.getElementById('drawer-comment-count').innerText = data.length || 0;

        if (data && data.length > 0) {
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
    } catch(e) { if(!silent) list.innerHTML = '<p class="text-center text-xs text-red-500 mt-10">Gagal memuat komentar.</p>'; }
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
                    <b onclick="viewUserProfile('${comment.user_id}')" class="text-brand-info text-[11px] cursor-pointer hover:underline">${comment.nickname}</b>
                    <p class="text-gray-200 text-xs mt-0.5 leading-relaxed break-words">${formatCaption(comment.message)}</p>
                    <div class="flex items-center gap-2 mt-1.5"><span class="text-[9px] text-gray-600">${timeAgo(comment.created_at)}</span><button onclick="setReply('${comment.id}', '${comment.nickname}')" class="text-[10px] text-gray-400 font-bold hover:text-white px-2">Balas</button> ${delBtn} </div>
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
                                    <b onclick="viewUserProfile('${r.user_id}')" class="text-brand-purple text-[10px] cursor-pointer hover:underline">${r.nickname}</b>
                                    <p class="text-gray-300 text-[11px] mt-0.5 leading-relaxed break-words">${formatCaption(r.message)}</p>
                                    <div class="flex items-center gap-2 mt-1"><button onclick="setReply('${comment.id}', '${r.nickname}')" class="text-[9px] text-gray-500 font-bold hover:text-white pr-2">Balas</button> ${rDelBtn}</div>
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
    const hapus = confirm("Hapus komentar ini?");
    if (hapus) {
        const cBox = document.getElementById('comment-box-' + cid);
        if(cBox) cBox.style.display = 'none';

        try {
            const { error } = await supabaseClient.from('comments').delete().eq('id', cid);
            if(error) throw error;
            showToast("Komentar dihapus.", "success");
        } catch(e) {
            showToast("Gagal menghapus komentar dari database.", "error");
            if(cBox) cBox.style.display = 'flex'; 
        }
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
    const msgInput = document.getElementById('comment-input');
    const msg = msgInput.value.trim();
    if (!msg) { showToast("Komentar tidak boleh kosong!", "error"); return; }

    const btn = event.currentTarget;
    const iconAsli = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

    try {
        const payload = { video_id: activeVideoId, nickname: userProfile?.nickname || "Player", message: msg, avatar_url: userProfile?.avatar_url || "", user_id: currentUser.id };
        if (replyingToId) payload.parent_id = replyingToId;

        const response = await fetch('/api/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (response.ok) {
            msgInput.value = ''; 
            await loadComments(activeVideoId, true);
            const container = document.querySelector(`.comment-count-container[data-vid="${activeVideoId}"]`);
            if(container) updateCommentCountUI(activeVideoId, container);
            
            const floatComment = document.getElementById('float-comment-container');
            if (floatComment && floatComment.dataset.vid === activeVideoId) updateCommentCountUI(activeVideoId, floatComment);

            cancelReply();
        } else { throw new Error("Gagal menyimpan komentar"); }
    } catch(e) { showToast("Gagal kirim komentar.", "error"); } finally { btn.innerHTML = iconAsli; btn.disabled = false; }
}

async function fetchCommentLikes(cid) {
    try { 
        const { count, error } = await supabaseClient.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', cid);
        const span = document.querySelector(`.comment-like-count[data-cid="${cid}"]`); 
        if(span && !error) span.innerText = count || 0; 
    } catch(e) { console.error("Gagal mengambil like komentar", e); }
}

async function likeComment(cid, btn) {
    if (!currentUser) { showToast("Silakan login untuk menyukai komentar!", "error"); return openAuthModal(); }
    if(localStorage.getItem('comment_liked_'+cid)) return; 
    
    localStorage.setItem('comment_liked_'+cid, 'pending');
    const icon = btn.querySelector('i'); 
    icon.classList.remove('text-gray-500'); icon.classList.add('text-brand-accent', 'animate-ping'); 
    setTimeout(() => icon.classList.remove('animate-ping'), 500);

    try {
        const { error } = await supabaseClient.from('comment_likes').insert({ comment_id: cid, user_id: currentUser.id });
        if(!error) { localStorage.setItem('comment_liked_'+cid, 'true'); fetchCommentLikes(cid); } else { throw error; }
    } catch(e) { 
        localStorage.removeItem('comment_liked_'+cid);
        icon.classList.add('text-gray-500'); icon.classList.remove('text-brand-accent'); 
        showToast("Gagal menyukai komentar.", "error");
    }
}

async function updateLikeCountUI(videoId, containerDiv) {
    if (!containerDiv) return;
    try {
        const { count, error } = await supabaseClient.from('video_likes').select('*', { count: 'exact', head: true }).eq('video_id', videoId);
        const countSpan = containerDiv.querySelector('.like-count-display');
        if (countSpan && !error) countSpan.innerText = count || 0;
        if(localStorage.getItem(`liked_${videoId}`)) { containerDiv.querySelector('i').classList.replace('text-white', 'text-brand-accent'); }
    } catch(e) { console.error("Gagal update UI like", e); }
}

async function updateCommentCountUI(videoId, containerDiv) {
    try {
        const response = await fetch(`/api/comment?video_id=${videoId}`); const data = await response.json();
        const countSpan = containerDiv.querySelector('.comment-count-display');
        if (countSpan && Array.isArray(data)) countSpan.innerText = data.length;
    } catch(e) {}
}

async function likeVideo(videoId, btn) {
    if (!currentUser) { showToast("Silakan login untuk menyukai video!", "error"); return openAuthModal(); }
    if(localStorage.getItem(`liked_${videoId}`)) return; 
    
    localStorage.setItem(`liked_${videoId}`, 'pending'); 
    const icon = btn.querySelector('i'); 
    icon.classList.replace('text-white', 'text-brand-accent'); icon.classList.add('animate-ping'); 
    setTimeout(() => icon.classList.remove('animate-ping'), 500);

    try {
        const { error } = await supabaseClient.from('video_likes').insert({ video_id: videoId, user_id: currentUser.id });
        if (!error) { 
            localStorage.setItem(`liked_${videoId}`, 'true'); 
            updateLikeCountUI(videoId, btn.closest('.like-container') || document.getElementById('float-like-container')); 
        } else { throw error; }
    } catch (e) { 
        localStorage.removeItem(`liked_${videoId}`);
        icon.classList.replace('text-brand-accent', 'text-white'); 
        showToast("Gagal menyukai video.", "error");
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

// ==========================================
// 9. LOGIKA DRAG / GESER PROGRESS BAR VIDEO
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
            video.progressFill.style.width = `${percent}%`;
        });
    }
}

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
// 10. UPLOAD VIDEO & STATUS (STORY)
// ==========================================
function openUploadModal() { history.pushState({ popup: 'upload' }, null, '#upload'); const m = document.getElementById('modal-upload'); m.classList.remove('hidden'); m.classList.add('flex'); }

function handleVideoSelect(input) {
    const file = input.files[0];
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('video-preview-container');
    const previewVideo = document.getElementById('video-preview-element');
    const fileNameInfo = document.getElementById('nama-file-info');

    if (file) {
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        previewVideo.play();
        
        placeholder.classList.add('opacity-0');
        setTimeout(() => {
            placeholder.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            previewContainer.classList.add('flex', 'animate-fade-in');
            fileNameInfo.innerText = file.name;
        }, 300);
    }
}

function closeUploadModal() {
    if (window.location.hash === '#upload') history.back();
    const m = document.getElementById('modal-upload');
    m.classList.add('hidden'); m.classList.remove('flex');
    
    document.getElementById('upload-placeholder').classList.remove('hidden', 'opacity-0');
    document.getElementById('video-preview-container').classList.add('hidden');
    document.getElementById('video-preview-element').src = '';
}

async function prosesUploadVideo() {
    if (!currentUser) return openAuthModal();
    
    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    const file = fileInput.files[0];
    if (!file) return showToast("Pilih video dulu!", "error");

    const btn = document.querySelector('button[onclick="prosesUploadVideo()"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    isUploading = true;

    try {
        const configRes = await fetch('/api/get-config');
        const config = await configRes.json();
        
        if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan di config");

        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent(file.name)}&filetype=${file.type}`);
        const dataUrl = await resUrl.json();

        await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

        const spreadsheetPayload = {
            ID_Video: 'vid_' + Date.now(),
            URL_Video: dataUrl.finalVideoUrl,
            id: 'vid_' + Date.now(),
            video_url: dataUrl.finalVideoUrl,
            caption: captionInput.value || "",
            nickname: userProfile?.nickname || "Player",
            avatar_url: userProfile?.avatar_url || "",
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        };

        await fetch(config.gasUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(spreadsheetPayload) });

        showToast("Berhasil diposting!", "success");
        fileInput.value = ''; captionInput.value = ''; 
        closeUploadModal();
        allVideosData = []; 
        
        if (tabSebelumnya && tabSebelumnya !== 'sosial' && tabSebelumnya !== 'upload') { switchTab(tabSebelumnya); } else { switchTab('sosial'); }
        loadVideos();

    } catch (err) { showToast("Error: " + err.message, "error"); } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Posting Video'; isUploading = false;
    }
}

async function loadStories() {
    const container = document.getElementById('status-list-container');
    if (!currentUser) return;
    
    const myAvatar = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Me'}`;
    document.getElementById('my-story-avatar').src = myAvatar;

    try {
        const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: stories } = await supabaseClient.from('stories').select('*, profiles(nickname, avatar_url)').gte('created_at', past24h).order('created_at', { ascending: false });
        
        const myStoryRing = document.getElementById('my-story-ring');
        const myStatusText = document.getElementById('my-status-text');
        
        window.viewMyStory = () => document.getElementById('upload-story-input').click();
        if (myStoryRing) { myStoryRing.classList.remove('story-ring'); myStoryRing.classList.add('border', 'border-white/10'); }
        if (myStatusText) { myStatusText.innerText = "Ketuk untuk menambahkan update status"; myStatusText.className = "text-[10px] text-gray-400"; }
        
        if (!stories || stories.length === 0) { container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">Belum ada pembaruan status.</div>`; return; }

        const groupedStories = {};
        stories.forEach(s => {
            if (!groupedStories[s.user_id]) { groupedStories[s.user_id] = { user_id: s.user_id, nickname: s.profiles?.nickname, avatar: s.profiles?.avatar_url, stories: [] }; }
            groupedStories[s.user_id].stories.push(s);
        });

        if (groupedStories[currentUser.id]) {
            const myLatestTime = timeAgo(groupedStories[currentUser.id].stories[0].created_at);
            if (myStoryRing) { myStoryRing.classList.add('story-ring'); myStoryRing.classList.remove('border', 'border-white/10'); }
            if (myStatusText) { myStatusText.innerText = myLatestTime; myStatusText.className = "text-[10px] text-brand-info font-bold"; }
            window.viewMyStory = () => viewStory(currentUser.id, userProfile?.nickname || 'Me', myAvatar);
        }

        let html = '';
        for (const uid in groupedStories) {
            if (uid === currentUser.id) continue; 
            const user = groupedStories[uid];
            const ava = user.avatar || `https://ui-avatars.com/api/?name=${user.nickname}`;
            const latestTime = timeAgo(user.stories[0].created_at);
            html += `
            <div class="flex items-center p-2 bg-brand-card/50 hover:bg-white/5 cursor-pointer rounded-2xl border border-white/5 transition-all mb-2" onclick="viewStory('${user.user_id}', '${user.nickname}', '${ava}')">
                <div class="relative shrink-0 story-ring"><img src="${ava}" class="w-11 h-11 rounded-full object-cover border-2 border-brand-card"></div>
                <div class="ml-3 flex-1"><h4 class="font-bold text-white text-[13px]">${user.nickname}</h4><p class="text-[10px] text-brand-info">${latestTime}</p></div>
            </div>`;
        }
        container.innerHTML = html || `<div class="text-center py-6 text-xs text-gray-500">Belum ada pembaruan status teman.</div>`;
    } catch(e) { container.innerHTML = `<div class="text-center py-6 text-xs text-red-500">Gagal memuat status.</div>`; }
}

async function handleUploadStory(event) {
    const file = event.target.files[0]; if (!file) return; event.target.value = ''; 
    const captionStory = await customPrompt("Tulis caption untuk status ini:", "");
    if (captionStory === null) return; 

    showToast("Mengunggah status...", "info");

    try {
        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('story_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`);
        const dataUrl = await resUrl.json();
        await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
        
        const { error } = await supabaseClient.from('stories').insert({ user_id: currentUser.id, media_url: dataUrl.finalVideoUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image', caption: captionStory });

        if (error) throw error;
        showToast("Status berhasil diperbarui!", "success"); loadStories(); 
    } catch (err) { showToast("Gagal mengunggah status.", "error"); }
}

async function viewStory(userId, name, avatar) {
    document.getElementById('viewer-story-name').innerText = name; document.getElementById('viewer-story-avatar').src = avatar;
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories } = await supabaseClient.from('stories').select('*').eq('user_id', userId).gte('created_at', past24h).order('created_at', { ascending: true });
    
    if(!stories || stories.length === 0) { showToast("Status sudah kedaluwarsa.", "error"); return loadChatList(); }

    currentActiveStories = stories; currentActiveStories.currentIndex = 0;
    const modal = document.getElementById('story-viewer-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    playStory(0);
}

function playStory(index) {
    if (index >= currentActiveStories.length) return closeStoryViewer();
    currentActiveStories.currentIndex = index; const story = currentActiveStories[index];
    
    document.getElementById('viewer-story-time').innerText = timeAgo(story.created_at);
    document.getElementById('viewer-story-img').src = story.media_url;
    
    const captionEl = document.getElementById('viewer-story-caption');
    if (captionEl) {
        if (story.caption && story.caption.trim() !== '') { captionEl.innerText = story.caption; captionEl.classList.remove('hidden'); } 
        else { captionEl.classList.add('hidden'); captionEl.innerText = ''; }
    }
    
    const progressBar = document.getElementById('story-progress');
    progressBar.style.transition = 'none'; progressBar.style.width = '0%';
    clearTimeout(currentStoryTimer);
    
    setTimeout(() => {
        progressBar.style.transition = 'width 5s linear'; progressBar.style.width = '100%';
        currentStoryTimer = setTimeout(() => { nextStory(); }, 5000);
    }, 50);
}

function nextStory() { playStory(currentActiveStories.currentIndex + 1); }
function prevStory() { playStory(Math.max(0, currentActiveStories.currentIndex - 1)); }

function closeStoryViewer() {
    clearTimeout(currentStoryTimer);
    const modal = document.getElementById('story-viewer-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.remove('flex'); modal.classList.add('hidden'); }, 300);
}

// ==========================================
// 11. WIDGET CHAT & LOGIKA PESAN (PERSONAL)
// ==========================================
async function checkGlobalUnreadMessages() {
    if(!currentUser) return;
    try {
        const { count, error } = await supabaseClient.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', currentUser.id).eq('is_read', false);
        const badge = document.getElementById('global-chat-badge');
        if(badge) {
            if(!error && count && count > 0) { badge.innerText = count > 99 ? '99+' : count; badge.classList.remove('hidden'); } 
            else { badge.classList.add('hidden'); }
        }
    } catch(e) { console.error("Error unread messages", e); }
}

function initGlobalMessageListener() {
    if (!currentUser || globalMessageSubscription) return;
    globalMessageSubscription = supabaseClient.channel('global_messages').on('postgres_changes', { 
            event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` 
        }, payload => {
            checkGlobalUnreadMessages();
            if (activeChatUserId !== payload.new.sender_id && !blockedUsersList.includes(payload.new.sender_id)) {
                showToast("Ada pesan baru masuk!", "info");
                if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
                    new Notification("AU2Hub", { body: "Anda menerima pesan baru!", icon: "/app-icon-192.png" });
                }
            }
            const widget = document.getElementById('floating-widget');
            const chatList = document.getElementById('chat-list-view');
            if (!widget.classList.contains('opacity-0') && chatList.classList.contains('flex')) { setTimeout(() => loadChatList(), 300); }
        }).subscribe();
}

async function searchUsersForChat(query) {
    if (!query.trim()) return loadChatList();
    const container = document.getElementById('chat-list-container');
    if(container) container.innerHTML = '<div class="flex justify-center mt-6"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';
    
    const { data } = await supabaseClient.from('profiles').select('*').ilike('nickname', `%${query}%`).limit(15);
    if (data && data.length > 0 && container) {
        let html = '<p class="text-[10px] text-gray-500 font-bold mb-2 ml-1 uppercase">Hasil Pencarian</p>';
        data.forEach(p => {
            const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
            html += `
            <div onclick="openChatRoom('${p.id}', '${p.nickname.replace(/'/g, "\\'")}', '${ava}')" class="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-2xl transition-all">
                <img src="${ava}" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0">
                <div class="ml-3"><h4 class="font-bold text-white text-xs">${p.nickname}</h4><p class="text-[10px] text-gray-400 truncate w-48">${p.bio || 'Pemain AU2'}</p></div>
            </div>`;
        });
        container.innerHTML = html;
    } else if(container) {
        container.innerHTML = '<p class="text-center text-xs text-gray-500 mt-6">User tidak ditemukan.</p>';
    }
}

function toggleWidget() {
    const widget = document.getElementById('floating-widget');
    if (widget.classList.contains('opacity-0')) {
        history.pushState({ popup: 'widget' }, null, '#inbox'); 
        widget.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95'); 
        const searchInput = document.getElementById('search-user-chat');
        if(searchInput) searchInput.value = '';
        loadChatList();
    } else { 
        if (window.location.hash.startsWith('#inbox') || window.location.hash.startsWith('#chatroom')) { history.back(); } 
        else { widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95'); closeChatRoom(false); }
    }
}

function switchChatTab(tabName) {
    const tabs = ['personal', 'group', 'status'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const container = document.getElementById(`chat-${t}-container`);
        if(!btn || !container) return;
        
        if (t === tabName) {
            btn.classList.replace('text-gray-500', 'text-brand-accent'); btn.classList.replace('border-transparent', 'border-brand-accent');
            container.classList.remove('hidden'); container.classList.add('block');
        } else {
            btn.classList.replace('text-brand-accent', 'text-gray-500'); btn.classList.replace('border-brand-accent', 'border-transparent');
            container.classList.remove('block'); container.classList.add('hidden');
        }
    });

    const searchContainer = document.getElementById('chat-search-container');
    if (tabName === 'status' && searchContainer) { searchContainer.classList.add('hidden'); loadStories(); } 
    else if(searchContainer) { searchContainer.classList.remove('hidden'); }
}

async function loadChatList() {
    const cPersonal = document.getElementById('chat-personal-container');
    const cGroup = document.getElementById('chat-group-container');
    if(!cPersonal || !cGroup) return;
    
    if (!currentUser) { cPersonal.innerHTML = `<div class="text-center mt-20 text-xs text-gray-500">Silakan login.</div>`; return; }

    cPersonal.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';
    cGroup.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';

    try {
        const unreadCounts = {};
        const { data: unreads } = await supabaseClient.from('messages').select('sender_id').is('group_id', null).eq('receiver_id', currentUser.id).eq('is_read', false);
        if (unreads) unreads.forEach(u => { unreadCounts[u.sender_id] = (unreadCounts[u.sender_id] || 0) + 1; });

        const { data: messages } = await supabaseClient.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id},group_id.not.is.null`).order('created_at', { ascending: false });
        const { data: myGroups } = await supabaseClient.from('group_members').select('group_id').eq('user_id', currentUser.id);

        const personalContacts = {}, groupContacts = {};
        if (messages) {
            messages.forEach(msg => {
                if (msg.group_id) {
                    if (!groupContacts[msg.group_id]) groupContacts[msg.group_id] = msg;
                } else {
                    const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
                    if (partnerId && !personalContacts[partnerId] && !blockedUsersList.includes(partnerId)) { personalContacts[partnerId] = msg; }
                }
            });
        }

        if (myGroups) { myGroups.forEach(g => { if (!groupContacts[g.group_id]) groupContacts[g.group_id] = { created_at: '1970-01-01T00:00:00Z', is_empty: true, message: 'Grup baru dibuat' }; }); }

        let personalList = [], groupList = [];
        const partnerIds = Object.keys(personalContacts), groupIds = Object.keys(groupContacts);
        let usersWithStory = [];
        
        if (partnerIds.length > 0) {
            const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', partnerIds);
            const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: activeStories } = await supabaseClient.from('stories').select('user_id').gte('created_at', past24h);
            if (activeStories) usersWithStory = activeStories.map(s => s.user_id);

            if (profiles) profiles.forEach(p => personalList.push({ type: 'personal', id: p.id, name: p.nickname, avatar: p.avatar_url, latestMsg: personalContacts[p.id], unread: unreadCounts[p.id] || 0, hasStory: usersWithStory.includes(p.id) }));
        }

        if (groupIds.length > 0) {
            const { data: groups } = await supabaseClient.from('groups').select('id, name, avatar_url').in('id', groupIds);
            if (groups) groups.forEach(g => groupList.push({ type: 'group', id: g.id, name: g.name, avatar: g.avatar_url, latestMsg: groupContacts[g.id], unread: 0 }));
        }

        personalList.sort((a, b) => new Date(b.latestMsg.created_at) - new Date(a.latestMsg.created_at));
        groupList.sort((a, b) => new Date(b.latestMsg.created_at) - new Date(a.latestMsg.created_at));
        let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');
        
        const renderRow = (item, isGroup) => {
            const ava = item.avatar || `https://ui-avatars.com/api/?name=${item.name}&background=1A1133&color=fff`;
            const msg = item.latestMsg;
            let prefix = '', preview = msg.message;

            if (isGroup && !msg.is_empty) prefix = msg.sender_id === currentUser.id ? 'Anda: ' : '<i class="fas fa-user text-[8px] mr-1"></i> ';
            else if (!isGroup && msg.sender_id === currentUser.id) prefix = (msg.is_read || msg.is_read === 'true') ? '<i class="fas fa-check-double text-brand-info mr-1 text-[10px]"></i>' : '<i class="fas fa-check text-white/60 mr-1 text-[10px]"></i>';

            if (preview === '[DELETED]') { preview = '<i class="fas fa-ban mr-1"></i> Dihapus'; prefix = ''; } 
            else if (deletedForMe.includes(msg.id)) { preview = '...'; prefix = ''; } 
            else if (preview.startsWith('[IMG]')) { preview = '<i class="fas fa-image mr-1"></i> Gambar'; }
            
            const badge = item.unread > 0 ? `<div class="bg-brand-accent text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ml-2">${item.unread}</div>` : '';
            const icon = isGroup ? '<div class="absolute -bottom-1 -right-1 bg-brand-dark p-0.5 rounded-full"><i class="fas fa-users text-[10px] text-brand-info"></i></div>' : '';
            
            const ringClass = item.hasStory ? 'story-ring' : 'border border-white/10';
            const avatarClickCode = item.hasStory ? `event.stopPropagation(); viewStory('${item.id}', '${item.name}', '${ava}')` : `event.stopPropagation(); viewUserProfile('${item.id}')`;

            return `
            <div class="flex items-center p-3 bg-brand-card/50 hover:bg-white/5 cursor-pointer rounded-2xl border border-white/5 transition-all mb-2" onclick="openChatRoom('${item.id}', '${item.name.replace(/'/g, "\\'")}', '${ava}', ${isGroup})">
                <div class="relative shrink-0" onclick="${isGroup ? '' : avatarClickCode}">
                    <div class="${isGroup ? 'border border-brand-accent/30 rounded-full' : ringClass}"><img src="${ava}" loading="lazy" class="w-11 h-11 rounded-full object-cover border-2 border-brand-card"></div>
                    ${icon}
                </div>
                <div class="flex-1 min-w-0 ml-3">
                    <div class="flex justify-between items-center mb-1"><h4 class="font-bold text-white text-[13px] truncate">${item.name}</h4><div class="flex items-center"><span class="text-[9px] text-gray-500 shrink-0 ml-2">${msg.is_empty ? 'Baru' : timeAgo(msg.created_at)}</span>${badge}</div></div>
                    <p class="text-[11px] text-gray-400 truncate">${prefix} ${preview}</p>
                </div>
            </div>`;
        };

        cPersonal.innerHTML = personalList.length ? personalList.map(i => renderRow(i, false)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada obrolan.</p>';
        cGroup.innerHTML = groupList.length ? groupList.map(i => renderRow(i, true)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada grup.</p>';
        checkGlobalUnreadMessages();
    } catch (e) { cPersonal.innerHTML = '<div class="p-6 text-center text-xs text-red-500">Gagal memuat pesan.</div>'; }
}

async function sendRoomMessage(targetId, isGroup) {
    if (!currentUser) return showToast("Silakan login terlebih dahulu!", "error");
    const input = document.getElementById('chat-room-input'); const msg = input.value.trim();
    if (!msg) return;

    input.value = ''; const btn = document.getElementById('btn-send-room'); btn.disabled = true;
    const tempId = 'temp-' + Date.now();
    const tempMsg = { id: tempId, sender_id: currentUser.id, message: msg, created_at: new Date().toISOString() };
    if (isGroup) tempMsg.group_id = targetId; else tempMsg.receiver_id = targetId;
    
    appendMessageBubble(tempMsg); scrollToBottomChat();

    try {
        const insertData = { sender_id: currentUser.id, message: msg };
        if (isGroup) insertData.group_id = targetId; else insertData.receiver_id = targetId;
        const { error } = await supabaseClient.from('messages').insert(insertData);
        if (error) throw error;
    } catch (err) { showToast("Gagal mengirim pesan", "error"); } finally { btn.disabled = false; input.focus(); }
}

function appendMessageBubble(msg) {
    const container = document.getElementById('chat-messages-container');
    const isMe = msg.sender_id === currentUser.id;
    const alignClass = isMe ? 'justify-end' : 'justify-start';
    const bubbleClass = isMe ? 'bg-gradient-to-br from-[#FF007A] to-[#8A2BE2] text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm' : 'bg-brand-card border border-white/5 text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm';
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if(container.innerHTML.includes('fa-hand-sparkles') || container.innerHTML.includes('Kirim pesan pertama')) container.innerHTML = '';
    let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');
    if(deletedForMe.includes(msg.id)) return; 

    let contentHtml = ''; let isDeletedAll = msg.message === '[DELETED]';
    if (isDeletedAll) { contentHtml = `<p class="text-[11px] text-white/50 italic"><i class="fas fa-ban mr-1"></i> Pesan ini telah dihapus</p>`; } 
    else if (msg.message.startsWith('[IMG]')) {
        const imgUrl = msg.message.substring(5); 
        contentHtml = `<img src="${imgUrl}" alt="Sent Image" class="rounded-lg max-w-[200px] w-full object-cover mb-1 cursor-pointer" onclick="event.stopPropagation(); openLightbox('${imgUrl}')">`;
    } else { contentHtml = `<p class="text-[12px] leading-relaxed break-words">${msg.message}</p>`; }

    const tickIcon = isMe && !isDeletedAll ? (msg.is_read || msg.is_read === 'true' ? `<i class="fas fa-check-double text-[8px] text-brand-info" id="tick-${msg.id || 'temp'}"></i>` : `<i class="fas fa-check text-[8px] text-white/60" id="tick-${msg.id || 'temp'}"></i>`) : '';

    const div = document.createElement('div'); div.className = `flex w-full mb-3 ${alignClass} message-anim`;
    const onclickCode = (!isDeletedAll && msg.id && !msg.id.startsWith('temp')) ? `onclick="showMsgOptions('${msg.id}', ${isMe})"` : '';

    div.innerHTML = `
        <div class="max-w-[80%] px-4 py-2.5 shadow-md relative ${bubbleClass} cursor-pointer active:opacity-80 transition-opacity" ${onclickCode}>
            <div id="bubble-msg-${msg.id}">${contentHtml}</div>
            <div class="flex items-center justify-end gap-1 mt-1"><span class="text-[9px] text-white/60">${timeStr}</span>${tickIcon}</div>
        </div>`;
    container.appendChild(div);
}

function showMsgOptions(msgId, isMe) {
    selectedMessageId = msgId;
    const modal = document.getElementById('modal-msg-option'); const btnAll = document.getElementById('btn-del-msg-all');
    
    if (isMe) { btnAll.classList.remove('hidden'); btnAll.onclick = () => actionDeleteMessage('all'); } 
    else { btnAll.classList.add('hidden'); btnAll.onclick = null; }
    document.getElementById('btn-del-msg-me').onclick = () => actionDeleteMessage('me');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

async function actionDeleteMessage(type) {
    document.getElementById('modal-msg-option').classList.replace('flex', 'hidden');
    if(!selectedMessageId) return;

    if (type === 'me') {
        let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]'); deletedForMe.push(selectedMessageId);
        localStorage.setItem('deleted_msgs', JSON.stringify(deletedForMe)); showToast("Pesan dihapus untuk Anda.", "success");
    } else if (type === 'all') {
        const { error } = await supabaseClient.from('messages').update({ message: '[DELETED]' }).eq('id', selectedMessageId);
        if (error) return showToast("Gagal menghapus pesan.", "error");
    }
    
    if(activeChatUserId || activeGroupId) {
        const target = activeGroupId ? activeGroupId : activeChatUserId;
        openChatRoom(target, document.getElementById('active-chat-name').innerText, document.getElementById('active-chat-avatar').src, !!activeGroupId);
    }
}

function scrollToBottomChat() {
    const container = document.getElementById('chat-messages-container');
    if(container) container.scrollTop = container.scrollHeight;
}

function closeChatRoom(reloadList = true, fromPopstate = false) {
    activeChatUserId = null; activeGroupId = null; 
    if (messageSubscription) { supabaseClient.removeChannel(messageSubscription); messageSubscription = null; }
    document.getElementById('chat-list-view').classList.remove('hidden'); document.getElementById('chat-list-view').classList.add('flex');
    document.getElementById('chat-room-view').classList.add('hidden'); document.getElementById('chat-room-view').classList.remove('flex');
    if(reloadList) loadChatList(); 
}

async function uploadChatImage(event) {
    const file = event.target.files[0]; if (!file || (!activeChatUserId && !activeGroupId)) return;
    const isGroup = !!activeGroupId; const targetId = isGroup ? activeGroupId : activeChatUserId;
    event.target.value = ''; showToast("Mengirim gambar...", "info");

    try {
        const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('img_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`);
        const dataUrl = await resUrl.json();
        await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
        
        const tempMsg = { id: 't-'+Date.now(), sender_id: currentUser.id, message: `[IMG]${dataUrl.finalVideoUrl}`, created_at: new Date().toISOString() };
        appendMessageBubble(tempMsg); scrollToBottomChat();

        const insertData = { sender_id: currentUser.id, message: `[IMG]${dataUrl.finalVideoUrl}` };
        if (isGroup) insertData.group_id = targetId; else insertData.receiver_id = targetId;
        await supabaseClient.from('messages').insert(insertData);
    } catch (err) { showToast("Gagal mengirim gambar", "error"); }
}

function sendTypingStatus() {
    if(!messageSubscription || !activeChatUserId) return;
    messageSubscription.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id } });
}

// ==========================================
// 12. MANAJEMEN GRUP CHAT
// ==========================================
function openCreateGroupModal() { document.getElementById('modal-create-group').classList.remove('hidden'); document.getElementById('modal-create-group').classList.add('flex'); }
function closeCreateGroupModal() { document.getElementById('modal-create-group').classList.add('hidden'); document.getElementById('modal-create-group').classList.remove('flex'); }

function previewGroupAvatar(input, imgId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader(); reader.onload = function(e) { document.getElementById(imgId).src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

async function prosesCreateGroup() {
    if (!currentUser) return showToast("Silakan login dulu!", "error");
    const nameInput = document.getElementById('create-group-name').value.trim(); const descInput = document.getElementById('create-group-desc').value.trim();
    const fileInput = document.getElementById('create-group-avatar'); const btn = document.getElementById('btn-submit-group');

    if (!nameInput) return showToast("Nama grup wajib diisi!", "error");
    btn.disabled = true; const originalText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Membuat...';

    try {
        let finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput)}&background=1A1133&color=fff`;
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0]; showToast("Mengunggah foto grup...", "info");
            const resUrl = await fetch(`/api/upload-url?filename=${encodeURIComponent('group_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`);
            const dataUrl = await resUrl.json();
            await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
            finalAvatarUrl = dataUrl.finalVideoUrl; 
        }

        const { data: groupData, error: groupErr } = await supabaseClient.from('groups').insert({ name: nameInput, description: descInput, avatar_url: finalAvatarUrl, created_by: currentUser.id }).select().single();
        if (groupErr) throw groupErr;

        const { error: memberErr } = await supabaseClient.from('group_members').insert({ group_id: groupData.id, user_id: currentUser.id, role: 'admin' });
        if (memberErr) throw memberErr;

        showToast("Grup berhasil dibuat!", "success"); closeCreateGroupModal();
        document.getElementById('create-group-name').value = ''; document.getElementById('create-group-desc').value = ''; fileInput.value = '';
        document.getElementById('create-group-preview').src = 'https://ui-avatars.com/api/?name=Grup&background=1A1133&color=fff';
        loadChatList(); 
    } catch (err) { showToast("Gagal buat grup: " + err.message, "error"); } finally { btn.disabled = false; btn.innerHTML = originalText; }
}

function openChatHeaderInfo() {
    if (activeGroupId) loadGroupInfo(activeGroupId); 
    else if (activeChatUserId) viewUserProfile(activeChatUserId); 
}

function closeGroupInfoModal() { document.getElementById('modal-group-info').classList.add('hidden'); document.getElementById('modal-group-info').classList.remove('flex'); }

async function loadGroupInfo(groupId) {
    document.getElementById('modal-group-info').classList.remove('hidden'); document.getElementById('modal-group-info').classList.add('flex');
    const { data: group } = await supabaseClient.from('groups').select('*').eq('id', groupId).single();
    if(!group) return;

    document.getElementById('info-group-avatar').src = group.avatar_url;
    document.getElementById('info-group-name').innerText = group.name;
    document.getElementById('info-group-desc').innerText = group.description || "Tidak ada deskripsi";

    const { data: members } = await supabaseClient.from('group_members').select('role, user_id').eq('group_id', groupId);
    const myData = members.find(m => m.user_id === currentUser.id); activeGroupRole = myData ? myData.role : 'member';

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

async function renderGroupMembers(membersData) {
    const list = document.getElementById('group-member-list'); document.getElementById('info-group-count').innerText = membersData.length;
    list.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-brand-info"></i></div>';

    const userIds = membersData.map(m => m.user_id);
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, avatar_url').in('id', userIds);

    let html = '';
    profiles.forEach(p => {
        const m = membersData.find(x => x.user_id === p.id);
        const badge = m.role === 'admin' ? '<span class="bg-brand-accent/20 text-brand-accent text-[8px] px-2 py-0.5 rounded border border-brand-accent/30 font-bold ml-2">ADMIN</span>' : '';
        const ava = p.avatar_url || `https://ui-avatars.com/api/?name=${p.nickname}&background=1A1133&color=fff`;
        html += `
        <div class="flex items-center p-2 bg-black/30 rounded-xl border border-white/5">
            <img src="${ava}" class="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0">
            <div class="ml-3 flex-1 flex items-center"><h4 class="font-bold text-white text-xs">${p.nickname}</h4>${badge}</div>
        </div>`;
    });
    list.innerHTML = html;
}

function toggleEditGroupInfo() {
    const form = document.getElementById('form-edit-group-info');
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        document.getElementById('input-edit-group-name').value = document.getElementById('info-group-name').innerText;
        document.getElementById('input-edit-group-desc').value = document.getElementById('info-group-desc').innerText;
    } else { form.classList.add('hidden'); }
}

async function saveGroupInfo() {
    const name = document.getElementById('input-edit-group-name').value.trim(); const desc = document.getElementById('input-edit-group-desc').value.trim();
    if(!name) return showToast("Nama tidak boleh kosong!", "error");

    const btn = document.getElementById('btn-save-group-info'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const { error } = await supabaseClient.from('groups').update({ name: name, description: desc }).eq('id', activeGroupId);
    
    btn.innerHTML = 'Simpan Perubahan';
    if(error) return showToast("Gagal update: " + error.message, "error");
    
    showToast("Info grup diperbarui!", "success"); toggleEditGroupInfo(); loadGroupInfo(activeGroupId); 
}

async function inviteToGroup() {
    const nick = document.getElementById('invite-user-nickname').value.trim(); if(!nick) return;
    const btn = document.getElementById('btn-invite-user'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { data: userProfile } = await supabaseClient.from('profiles').select('id').ilike('nickname', nick).single();
        if(!userProfile) throw new Error("User tidak ditemukan!");

        const { error } = await supabaseClient.from('group_members').insert({ group_id: activeGroupId, user_id: userProfile.id, role: 'member' });
        if(error) { if(error.code === '23505') throw new Error("User ini sudah ada di grup!"); throw error; }

        showToast(nick + " berhasil ditambahkan!", "success"); document.getElementById('invite-user-nickname').value = ''; loadGroupInfo(activeGroupId); 
    } catch (err) { showToast(err.message, "error"); } finally { btn.innerHTML = 'Undang'; }
}

async function keluarDariGrup() {
    const yakin = confirm("Yakin ingin keluar dari grup ini?"); if(!yakin) return;
    await supabaseClient.from('group_members').delete().eq('group_id', activeGroupId).eq('user_id', currentUser.id);
    showToast("Berhasil keluar dari grup", "success"); closeGroupInfoModal(); closeChatRoom(); 
}

// ==========================================
// 13. RIPPER, INFO, DAN LAYANAN
// ==========================================
async function muatDataRipper() {
    const linkAPI = "/api/ripper"; const container = document.getElementById('ripper-container');
    const dataTersimpan = localStorage.getItem('ripperCache');
    if (dataTersimpan) { dataRipperGlobal = JSON.parse(dataTersimpan); renderRippers(dataRipperGlobal, false); } 
    else if (container) { container.innerHTML = '<div class="text-center py-10 text-xs text-brand-info animate-pulse"><i class="fas fa-sync fa-spin mb-2 text-2xl"></i><br>Menyiapkan Database Pertama Kali...</div>'; }
    try { 
        const respon = await fetch(linkAPI); const dataBaru = await respon.json(); localStorage.setItem('ripperCache', JSON.stringify(dataBaru)); dataRipperGlobal = dataBaru; renderRippers(dataRipperGlobal, false); 
    } catch (error) { if (!dataTersimpan && container) { container.innerHTML = '<div class="text-center py-10 text-xs text-red-500"><i class="fas fa-exclamation-triangle mb-2 text-2xl"></i><br>Gagal terhubung ke database.</div>'; } }
}

function renderRippers(data, isSearch = false) {
    const container = document.getElementById('ripper-container'); if(!container) return;
    document.getElementById('ripper-count').innerText = `${dataRipperGlobal.length} Total Data`;
    if(data.length === 0) { container.innerHTML = `<div class="text-center py-10 px-4"><i class="fas fa-check-circle text-brand-success text-3xl mb-2"></i><div class="text-xs text-gray-400">Pencarian aman.<br>(Tetap waspada & gunakan Rekber)</div></div>`; return; }
    const limitBatas = (!isSearch && !isRipperExpanded) ? 5 : data.length;
    const dataYangDitampilkan = data.slice(0, limitBatas);
    let htmlString = dataYangDitampilkan.map(r => `<div class="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"><div class="flex justify-between items-start mb-1"><div class="font-bold text-xs text-white">${r["Nama / Keterangan"] || r.nama || r.Nama || "Tanpa Nama"}</div><div class="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap ml-2"><i class="fas fa-ban mr-1"></i> RIPPER</div></div><div class="text-[10px] text-brand-info font-mono mb-1">ID: ${r["ID"] || r.id || "-"}</div><div class="text-[10px] text-gray-400"><i class="fas fa-credit-card mr-1"></i> ${r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "-"}</div></div>`).join('');
    container.innerHTML = htmlString;
    if (!isSearch && !isRipperExpanded && data.length > 5) { container.innerHTML += `<div id="wadah-tombol-semua" class="p-5 text-center bg-black/20 mt-1 border-t border-white/5"><button onclick="tampilkanSemuaRipper(this)" class="bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-xs font-bold py-2.5 px-6 rounded-full active:scale-95 transition-all w-full flex items-center justify-center"><i class="fas fa-list-ul mr-2"></i> Tampilkan Semua Laporan</button></div>`; }
}

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

const inputRipper = document.getElementById('ripperSearch');
if(inputRipper) {
    inputRipper.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if(val === '') { renderRippers(dataRipperGlobal, false); return; }
        const hasilFilter = dataRipperGlobal.filter(r => { const nama = (r["Nama / Keterangan"] || r.nama || r.Nama || "").toLowerCase(); const idGame = (r["ID"] || r.id || "").toLowerCase(); const rekening = (r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "").toLowerCase(); return nama.includes(val) || idGame.includes(val) || rekening.includes(val); });
        renderRippers(hasilFilter, true); 
    });
}

function renderServices(data = services) {
    const container = document.getElementById('service-list'); if(!container) return;
    if (data.length === 0) { container.innerHTML = `<div class="text-center text-xs text-gray-400 py-6 border border-white/5 bg-brand-card rounded-2xl"><i class="fas fa-search-minus mb-2 text-lg"></i><br>Layanan tidak ditemukan.</div>`; return; }
    container.innerHTML = data.map(s => `<div class="bg-brand-card p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-brand-accent/30 transition-all"><div class="w-[60%]"><div class="font-bold text-sm text-white mb-1">${s.name}</div><div class="text-[10px] text-gray-400 leading-tight">${s.desc}</div><div class="text-[9px] text-brand-info mt-1"><i class="fas fa-check-circle mr-1"></i> Include Rekber NIKKY</div></div><div class="text-right flex flex-col items-end"><div class="text-brand-accent font-extrabold text-[15px] mb-2">Rp ${s.price.toLocaleString('id-ID')} <span class="text-[9px] font-normal text-gray-500">${s.label}</span></div><button onclick="checkout('${s.name}', ${s.price})" class="bg-brand-accent/10 text-brand-accent text-[10px] font-bold px-5 py-2 rounded-full border border-brand-accent/30 active:scale-90 transition-transform">BELI</button></div></div>`).join('');
}

const inputLayanan = document.getElementById('serviceSearch');
if(inputLayanan){
    inputLayanan.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        renderServices(services.filter(s => s.name.toLowerCase().includes(val) || s.desc.toLowerCase().includes(val)));
    });
}

function checkout(name, price) {
    const hargaRupiah = price.toLocaleString('id-ID');
    document.getElementById('pay-total').innerText = `Rp ${hargaRupiah}`;
    document.getElementById('pay-product').innerText = name;
    document.getElementById('nominal-asli').value = price;
    const noWA = "6283815584661";
    const teksWA = encodeURIComponent(`Halo Admin Joki AU2Hub,\n\nSaya ingin mengkonfirmasi pembayaran pesanan saya:\n\nPaket : *${name}*\nTotal : *Rp ${hargaRupiah}*\n\n(Berikut ini saya lampirkan gambar bukti transfer QRIS / screenshot)`);
    document.getElementById('wa-confirm').setAttribute('href', `https://wa.me/${noWA}?text=${teksWA}`);
    switchTab('pembayaran');
}

function salinNominal() {
    const nominalMurni = document.getElementById('nominal-asli').value; const btnSalin = document.getElementById('btn-salin'); const teksAsli = btnSalin.innerHTML;
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(nominalMurni); } 
    else { let tempInput = document.createElement("textarea"); tempInput.value = nominalMurni; tempInput.style.position = "fixed"; tempInput.style.left = "-9999px"; document.body.appendChild(tempInput); tempInput.select(); try { document.execCommand("copy"); } catch (err) {} document.body.removeChild(tempInput); }
    btnSalin.innerHTML = '<i class="fas fa-check mr-1.5"></i> Tersalin'; btnSalin.classList.replace('text-brand-info', 'text-brand-success'); btnSalin.classList.replace('bg-brand-info/10', 'bg-brand-success/10'); btnSalin.classList.replace('border-brand-info/30', 'border-brand-success/30');
    setTimeout(() => { btnSalin.innerHTML = teksAsli; btnSalin.classList.replace('text-brand-success', 'text-brand-info'); btnSalin.classList.replace('bg-brand-success/10', 'bg-brand-info/10'); btnSalin.classList.replace('border-brand-success/30', 'border-brand-info/30'); }, 2000);
}

function renderFaqs(data = faqs) {
    const container = document.getElementById('faq-container'); if(!container) return;
    if (data.length === 0) { container.innerHTML = `<div class="text-center text-xs text-gray-400 py-6 border border-white/5 bg-brand-card rounded-2xl"><i class="fas fa-search-minus mb-2 text-lg"></i><br>Pertanyaan tidak ditemukan.</div>`; return; }
    container.innerHTML = data.map(f => `<details class="bg-brand-card rounded-2xl border border-white/5 group"><summary class="flex justify-between items-center font-bold text-xs cursor-pointer text-white p-4">${f.t} <i class="fas fa-chevron-down text-brand-accent transition-transform group-open:rotate-180"></i></summary><div class="px-4 pb-4 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3 mt-1">${f.j}</div></details>`).join('');
}

const inputFaq = document.getElementById('faqSearch');
if(inputFaq){
    inputFaq.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        renderFaqs(faqs.filter(f => f.t.toLowerCase().includes(val) || f.j.toLowerCase().includes(val)));
    });
}

function openModalEvent() {
    history.pushState({ popup: 'modal' }, null, '#event'); 
    const modal = document.getElementById('modal-event'); modal.classList.remove('hidden'); modal.classList.add('flex'); document.body.style.overflow = 'hidden'; 
    setTimeout(() => { const carousel = document.getElementById('image-carousel'); if(carousel) { carousel.scrollLeft = 0; updateCarouselDots(); } }, 50);
}

function closeModalEvent() { 
    if (window.location.hash === '#event') { history.back(); } 
    else { const modal = document.getElementById('modal-event'); modal.classList.add('hidden'); modal.classList.remove('flex'); document.body.style.overflow = 'auto'; }
}

function updateCarouselDots() {
    const carousel = document.getElementById('image-carousel'); const dots = document.querySelectorAll('.dot-indicator');
    if (!carousel || dots.length === 0) return; const maxScroll = carousel.scrollWidth - carousel.clientWidth; if (maxScroll <= 0) return;
    let activeIndex = Math.round((carousel.scrollLeft / maxScroll) * (dots.length - 1)); activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));
    dots.forEach((dot, index) => { if (index === activeIndex) { dot.className = "dot-indicator h-1.5 rounded-full transition-all duration-300 w-4 bg-brand-accent"; } else { dot.className = "dot-indicator h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/40"; } });
}

// ==========================================
// 14. ROUTING & INISIALISASI (SUPER OPTIMASI V6)
// ==========================================
window.addEventListener('popstate', () => {
    let isPopupClosed = false;
    const lightbox = document.getElementById('lightbox-modal');
    if(!lightbox.classList.contains('hidden')) { closeLightbox(); return; }

    const modalMsgOption = document.getElementById('modal-msg-option');
    if (!modalMsgOption.classList.contains('hidden')) { modalMsgOption.classList.add('hidden'); modalMsgOption.classList.remove('flex'); return; }

    const commentDrawer = document.getElementById('comment-drawer');
    if (commentDrawer.classList.contains('open')) { commentDrawer.classList.remove('open'); cancelReply(); return; }

    const floatingPlayer = document.getElementById('floating-video-player');
    if (!floatingPlayer.classList.contains('hidden')) { closeFloatingVideo(); return; }

    const modalEvent = document.getElementById('modal-event');
    if (!modalEvent.classList.contains('hidden')) { modalEvent.classList.add('hidden'); modalEvent.classList.remove('flex'); document.body.style.overflow = 'auto'; isPopupClosed = true; }

    const modalEditProfile = document.getElementById('modal-edit-profile');
    if (!modalEditProfile.classList.contains('hidden')) { closeEditProfileModal(); isPopupClosed = true; }
    
    const modalUserList = document.getElementById('modal-user-list');
    if (!modalUserList.classList.contains('hidden')) { closeUserList(); isPopupClosed = true; }

    const widget = document.getElementById('floating-widget');
    if (!widget.classList.contains('opacity-0')) {
        if (document.getElementById('chat-room-view').classList.contains('flex')) { closeChatRoom(true, true); isPopupClosed = true; } 
        else { widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95'); isPopupClosed = true; }
    }

    const authModal = document.getElementById('modal-auth');
    if (!authModal.classList.contains('hidden')) { authModal.classList.add('hidden'); authModal.classList.remove('flex'); isPopupClosed = true; }

    if (isPopupClosed) return;
    const newHash = window.location.hash.substring(1) || 'home';
    if (newHash === 'profile' && viewedUserId !== currentUser?.id) { viewedUserId = currentUser?.id; checkSession(); }
    switchTab(newHash.split('?')[0], null, false);
});

window.addEventListener('beforeunload', function (e) {
    if (typeof isUploading !== 'undefined' && isUploading) {
        e.preventDefault(); e.returnValue = 'Upload sedang berlangsung. Yakin ingin meninggalkan halaman?';
    }
});

// -- INISIALISASI UTAMA & SUNTIKAN V6 --
window.addEventListener('load', () => {
    
    // 1. SETUP VIDEO OBSERVER (RequestIdleCallback untuk anti-lag)
    window.setupVideoObserver = function() {
        if (typeof obs !== 'undefined' && obs) obs.disconnect();

        if (!document.getElementById('gpu-hack')) {
            const style = document.createElement('style'); style.id = 'gpu-hack';
            style.innerHTML = `.snap-start { transform: translateZ(0); will-change: transform, opacity; content-visibility: auto; } video { will-change: contents; }`;
            document.head.appendChild(style);
        }

        window.videoClearTimers = window.videoClearTimers || new Map();
        window.videoPlayTimers = window.videoPlayTimers || new Map(); 

        obs = new IntersectionObserver(es => {
            const isFloatingOpen = !document.getElementById('floating-video-player').classList.contains('hidden');
            es.forEach(e => { 
                const video = e.target;
                if (e.isIntersecting && !isFloatingOpen) {
                    if (window.videoClearTimers.has(video)) { clearTimeout(window.videoClearTimers.get(video)); window.videoClearTimers.delete(video); }

                    const playTimerId = setTimeout(() => {
                        if (video.dataset.savedSrc) { video.src = video.dataset.savedSrc; video.dataset.savedSrc = ''; video.load(); }
                        video.muted = (typeof isGlobalMuted !== 'undefined') ? isGlobalMuted : true;
                        
                        requestAnimationFrame(() => {
                            const playPromise = video.play();
                            if (playPromise !== undefined) { playPromise.catch(err => {}); }
                            video.classList.remove('opacity-0');
                        });

                        const card = video.closest('.snap-start');
                        if (card && card.nextElementSibling) {
                            const nextVid = card.nextElementSibling.querySelector('video');
                            if (nextVid && nextVid.dataset.savedSrc && !nextVid.src) { nextVid.src = nextVid.dataset.savedSrc; nextVid.dataset.savedSrc = ''; nextVid.setAttribute('preload', 'auto'); }
                        }
                    }, 100); 
                    window.videoPlayTimers.set(video, playTimerId);
                    
                } else { 
                    if (window.videoPlayTimers.has(video)) { clearTimeout(window.videoPlayTimers.get(video)); window.videoPlayTimers.delete(video); }
                    video.pause(); 
                    
                    const timerId = setTimeout(() => {
                        const hapusMemori = () => {
                            let currentUrl = video.currentSrc || video.src || (video.querySelector('source') ? video.querySelector('source').src : '');
                            if (currentUrl && currentUrl.length > 5) {
                                video.dataset.savedSrc = currentUrl; video.removeAttribute('src'); 
                                if (video.querySelector('source')) video.querySelector('source').removeAttribute('src');
                                video.removeAttribute('preload'); video.load(); 
                            }
                            window.videoClearTimers.delete(video);
                        };
                        if ('requestIdleCallback' in window) { requestIdleCallback(hapusMemori, { timeout: 1000 }); } else { hapusMemori(); }
                    }, 1000); 
                    window.videoClearTimers.set(video, timerId);
                }
            });
        }, { threshold: 0.5 }); 

        const videos = document.querySelectorAll('.video-player, .float-video-player');
        videos.forEach(v => obs.observe(v));
    };

    // 2. CHAT CACHING LOCALSTORAGE (OVERRIDE DARI V6)
    window.openChatRoom = async function(targetId, name, avatar, isGroup = false) {
        if (typeof currentUser === 'undefined' || !currentUser) return;
        
        if (isGroup) { activeGroupId = targetId; activeChatUserId = null; } 
        else { activeChatUserId = targetId; activeGroupId = null; }
        
        document.getElementById('chat-list-view').classList.add('hidden'); document.getElementById('chat-list-view').classList.remove('flex');
        document.getElementById('chat-room-view').classList.remove('hidden'); document.getElementById('chat-room-view').classList.add('flex');
        
        document.getElementById('active-chat-name').innerText = name;
        document.getElementById('active-chat-avatar').src = avatar;

        const container = document.getElementById('chat-messages-container');
        document.getElementById('btn-send-room').onclick = () => sendRoomMessage(targetId, isGroup);

        const cacheKey = isGroup ? `chat_cache_group_${targetId}` : `chat_cache_user_${targetId}`;
        const localChats = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        
        if (localChats.length > 0) {
            container.innerHTML = '';
            localChats.forEach(msg => appendMessageBubble(msg));
            scrollToBottomChat();
        } else {
            container.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';
        }

        if (!isGroup) await supabaseClient.from('messages').update({ is_read: true }).eq('sender_id', targetId).eq('receiver_id', currentUser.id).eq('is_read', false);

        let query = supabaseClient.from('messages').select('*');
        if (isGroup) query = query.eq('group_id', targetId);
        else query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetId},group_id.is.null),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.id},group_id.is.null)`);
        
        const { data: rawMessages } = await query.order('created_at', { ascending: false }).limit(50);
        const messages = rawMessages ? rawMessages.reverse() : [];

        if(messages && messages.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(messages));
            container.innerHTML = '';
            messages.forEach(msg => appendMessageBubble(msg));
        } else if (localChats.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full opacity-50"><p class="text-xs text-gray-300">Kirim pesan pertama</p></div>`;
        }
        scrollToBottomChat();

        if (typeof messageSubscription !== 'undefined' && messageSubscription) supabaseClient.removeChannel(messageSubscription);
        messageSubscription = supabaseClient.channel(isGroup ? `group_${targetId}` : `room_${targetId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                const newMsg = payload.new;
                const isTarget = isGroup ? newMsg.group_id === activeGroupId : (newMsg.sender_id === activeChatUserId && newMsg.receiver_id === currentUser.id);
                if (isTarget) { 
                    appendMessageBubble(newMsg); 
                    scrollToBottomChat(); 
                    if(!isGroup) supabaseClient.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(); 
                    
                    let currentCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                    currentCache.push(newMsg);
                    if(currentCache.length > 50) currentCache.shift();
                    localStorage.setItem(cacheKey, JSON.stringify(currentCache));
                }
            }).subscribe();
    };

    setTimeout(() => { if (typeof setupVideoObserver === 'function') setupVideoObserver(); }, 800);
});

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    const savedTab = localStorage.getItem('lastTab') || 'home';
    switchTab(savedTab, null, false); 
    
    if(typeof renderFaqs === 'function') renderFaqs();
    if(typeof renderServices === 'function') renderServices();
    if(typeof muatDataRipper === 'function') muatDataRipper();
    
    const inputChatImg = document.getElementById('chat-image-input');
    if(inputChatImg) inputChatImg.addEventListener('change', uploadChatImage);

    const inputChatRoom = document.getElementById('chat-room-input');
    if(inputChatRoom) {
        inputChatRoom.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const btnSend = document.getElementById('btn-send-room');
                if(btnSend) btnSend.click();
            }
        });
    }

    const fullHash = window.location.hash;
    if (fullHash.includes('?vid=')) {
        const vidId = fullHash.split('?vid=')[1];
        if (vidId) {
            setTimeout(async () => {
                if (allVideosData.length === 0) await loadVideos();
                const vidData = allVideosData.find(v => String(v.id) === String(vidId) || String(v.video_id) === String(vidId));
                if (vidData) {
                    const userVideos = allVideosData.filter(v => v.user_id === vidData.user_id).reverse();
                    const index = userVideos.findIndex(v => String(v.id || v.video_id) === String(vidId));
                    openProfileFeed(vidData.user_id, index >= 0 ? index : 0);
                }
            }, 2000);
        }
    }

    let deferredPrompt;
    const installContainer = document.getElementById('install-container');
    const btnInstallManual = document.getElementById('btn-install-manual');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
        if(installContainer) installContainer.classList.remove('hidden');
    });

    if(btnInstallManual) {
        btnInstallManual.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null; installContainer.classList.add('hidden');
            }
        });
    }

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=3').catch(err => console.log("SW Reg failed", err));

    const serverUrls = [ "https://divckiqkodtqudcoxkjz.supabase.co", "https://ui-avatars.com", "https://cdnjs.cloudflare.com" ];
    serverUrls.forEach(url => {
        const link = document.createElement('link'); link.rel = 'preconnect'; link.href = url; link.crossOrigin = 'anonymous'; document.head.appendChild(link);
    });
});
