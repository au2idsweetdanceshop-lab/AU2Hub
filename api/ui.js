let logoInterval;

function removeSplashScreen() {
    const splashScreen = document.getElementById('custom-splash');
    if (splashScreen) {
        splashScreen.style.opacity = '0';
        splashScreen.style.transform = 'scale(1.1)';
        setTimeout(() => {
            splashScreen.remove();
            clearInterval(logoInterval);
        }, 500);
    }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(removeSplashScreen, 1500); });
setTimeout(removeSplashScreen, 3500);
const logoElement = document.getElementById('splash-logo');
const promoImages = [
    "https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-22_23-46-22-498.png",
];

let currentIndex = 0;

function rotateLogo() {
    if (!logoElement) return;

    currentIndex = (currentIndex + 1) % promoImages.length;
    logoElement.style.opacity = '0';
    
    setTimeout(() => {
        if (logoElement) {
            logoElement.src = promoImages[currentIndex];
            logoElement.style.opacity = '1';
        }
    }, 500);
}

logoInterval = setInterval(rotateLogo, 1500);

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
        delete modal.promptResult;
        btnOk.onclick = () => {
            modal.promptResult = inputEl.value;
            if (window.location.hash === '#prompt') history.back();
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

function customAlert(title, isHTML = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        const titleEl = document.getElementById('alert-title');
        const btnOk = document.getElementById('alert-ok');
        if (isHTML) {
            titleEl.innerHTML = title;
        } else {
            let safeTitle = escapeHTML(title);
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            let formattedText = safeTitle.replace(urlRegex, (url) => `<a href="${url}" target="_blank" class="text-brand-info underline font-bold">${url}</a>`);
            titleEl.innerHTML = formattedText.replace(/\n/g, "<br>");
        }
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

function bukaPilihanPrivasi() {
    const modal = document.getElementById('modal-privasi-video');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('translate-y-full'), 10);
}

function tutupPilihanPrivasi() {
    const modal = document.getElementById('modal-privasi-video');
    modal.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function setPrivasiVideo(jenis, ikon) {
    privasiVideoAktif = jenis;
    document.getElementById('label-privasi-teks').innerHTML = `${jenis} <i class="fas fa-chevron-right text-[10px]"></i>`;
    document.getElementById('ikon-privasi-utama').className = `fas ${ikon} text-xs`;
    tutupPilihanPrivasi();
}

function toggleFloatingMode(skipHistory = false) {
    const isCurrentlyFocused = document.body.classList.contains('video-focused');
    const allWraps = document.querySelectorAll('.video-inner-wrap');
    const navBottom = document.querySelector('nav');
    const headerTop = document.querySelector('header');

    if(isCurrentlyFocused) {
        allWraps.forEach(wrap => wrap.classList.remove('floating-focus'));
        document.body.classList.remove('video-focused');
        if(navBottom) navBottom.style.filter = 'none';
        if(headerTop) headerTop.style.filter = 'none';
        const floatingPlayer = document.getElementById('floating-video-player');
        if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
            closeFloatingVideo(true); 
        }
        if (!skipHistory && window.location.hash === '#focused') {
            history.back();
        }
    } else {
        document.body.classList.add('video-focused');
        history.pushState({ popup: 'focused' }, null, '#focused');
        document.querySelectorAll('.video-player').forEach(v => {
            if (!v.paused) {
                const wrap = v.closest('.video-inner-wrap');
                if (wrap) wrap.classList.add('floating-focus');
            }
        });
        if(navBottom) navBottom.style.filter = 'blur(8px) opacity(0.5)';
        if(headerTop) headerTop.style.filter = 'blur(8px) opacity(0.5)';
    }
}

function switchTab(tabId, event = null, isPush = true) {
    if (event) event.preventDefault();
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
    }
    if (tabId !== 'sosial') {
        document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
            v.pause();
        });
    }
    if (tabId === 'profile' && event !== null && currentUser) {
        viewedUserId = currentUser.id;
        history.replaceState({ popup: 'my_profile' }, null, '#profile');
        openUserProfile(currentUser.id);
        return;
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
    if (tabId !== 'pembayaran' && tabId !== 'upload') {
        localStorage.setItem('lastTab', tabId);
    }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        const icon = n.querySelector('i');
        if (icon) icon.style.animation = 'none';
    });
    targetSection.classList.add('active');
    const targetNav = document.querySelector(`.nav-item[onclick*="switchTab('${tabId}')"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
    if (tabId === 'toko') {
        if (typeof loadTokoSaya === 'function') loadTokoSaya();
    }
    if (tabId === 'sosial') {
        const feedContainer = document.getElementById('feed-container');
        if (feedContainer && feedContainer.children.length === 0) {
            if (typeof loadVideos === 'function') loadVideos();
        }
    }
    if (tabId === 'layanan') {
        if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
    }
    if (tabId === 'superadmin') {
        if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        if (typeof loadRiwayatKeuanganGlobal === 'function') loadRiwayatKeuanganGlobal();
        if (typeof loadRiwayatLabaPPOB === 'function') loadRiwayatLabaPPOB();
    }
}
