// ==========================================
// FUNGSI ANTARMUKA (USER INTERFACE)
// ==========================================

// 1. Logika Splash Screen & Logo
function removeSplashScreen() {
    const splashScreen = document.getElementById('custom-splash');
    if (splashScreen) {
        splashScreen.style.opacity = '0';
        splashScreen.style.transform = 'scale(1.1)';
        setTimeout(() => splashScreen.remove(), 500);
    }
}
document.addEventListener('DOMContentLoaded', () => { setTimeout(removeSplashScreen, 1500); });
setTimeout(removeSplashScreen, 3500); 

const promoImages = ["https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-22_23-46-22-498.png"];
let currentLogoIndex = 0;
function rotateLogo() {
    const logoElement = document.getElementById('splash-logo');
    if(!logoElement) return;
    currentLogoIndex = (currentLogoIndex + 1) % promoImages.length;
    logoElement.style.opacity = '0';
    setTimeout(() => {
        logoElement.src = promoImages[currentLogoIndex];
        logoElement.style.opacity = '1';
    }, 500);
}
setInterval(rotateLogo, 1500);

// 2. Lightbox Modal
function openLightbox(imgUrl) {
    history.pushState({ popup: 'lightbox' }, null, '#lightbox'); 
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
    
    if (!dariTombolBack && window.location.hash === '#lightbox') {
        history.back();
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        img.src = '';
    }, 300);
}

// 3. Toggle Password
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

// 4. Sistem Tab Utama Aplikasi
function switchTab(tabId, event = null, isPush = true) {
    if (event) event.preventDefault();

    if (document.body.classList.contains('video-focused')) {
        if(typeof toggleGlobalAudio === 'function') toggleGlobalAudio(true);
    }

    if (tabId !== 'sosial') {
        document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
            v.pause();
        });
    }

    if (tabId === 'profile' && event !== null && currentUser) {
        viewedUserId = currentUser.id;
        history.replaceState({ popup: 'my_profile' }, null, '#profile');
        if(typeof openUserProfile === 'function') openUserProfile(currentUser.id);
        return; 
    }

    if (tabId !== 'profile' && tabId !== 'pembayaran' && tabId !== 'upload') {
        tabSebelumnya = tabId;
    }
    
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

    if (tabId === 'sosial' && typeof loadVideos === 'function') loadVideos();
    if (tabId === 'toko' && typeof loadTokoSaya === 'function') loadTokoSaya();

    let activeNav = document.querySelector(`.nav-item[href="#${tabId}"]`);
    if (tabId === 'pembayaran') activeNav = document.querySelector(`.nav-item[href="#layanan"]`);

    if (activeNav) {
        activeNav.classList.add('active');
        const icon = activeNav.querySelector('i');
        if (icon) { 
            void icon.offsetWidth; 
            icon.style.animation = 'popBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'; 
        }
    }

    setTimeout(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, 10);
    if (isPush && window.location.hash !== `#${tabId}`) history.pushState(null, null, `#${tabId}`);
}

// 5. Menu Melayang (Assistive Menu)
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

function executeAssistive(target) {
    closeAssistiveMenu(); 
    if (target === 'leaderboard') {
        if(typeof openLeaderboardModal === 'function') openLeaderboardModal(); 
    } else {
        switchTab(target); 
    }
}
