// ==========================================
// FUNGSI ALAT BANTU (UTILITIES)
// ==========================================

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

function customConfirm(title) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('confirm-title');
        const btnOk = document.getElementById('confirm-ok');
        const btnCancel = document.getElementById('confirm-cancel');

        titleEl.innerText = title;
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const cleanup = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
}

function customAlert(title) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        const titleEl = document.getElementById('alert-title');
        const btnOk = document.getElementById('alert-ok');

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formattedText = title.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" class="text-brand-info underline font-bold">${url}</a>`;
        });
        formattedText = formattedText.replace(/\n/g, "<br>");

        titleEl.innerHTML = formattedText;
        history.pushState({ popup: 'alert' }, null, '#alert');

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        window.currentAlertResolve = resolve;

        btnOk.onclick = () => {
            if (window.location.hash === '#alert') {
                history.back(); 
            } else {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            btnOk.onclick = null;
            if (typeof window.currentAlertResolve === 'function') {
                window.currentAlertResolve();
                window.currentAlertResolve = null;
            }
        };
    });
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

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function formatCaption(text) {
    if(!text) return '';
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline hover:text-white transition-colors font-bold">${url}</a>`;
    });

    formatted = formatted.replace(/#(\w+)/g, '<span onclick="event.stopPropagation(); cariBerdasarkanTagar(\'$1\')" class="font-bold text-brand-info hover:underline cursor-pointer">#$1</span>');
    formatted = formatted.replace(/@(\w+)/g, '<span onclick="event.stopPropagation(); viewUserProfileByNickname(\'$1\')" class="font-bold text-brand-accent hover:underline cursor-pointer">@$1</span>');
    formatted = formatted.replace(/\n/g, "<br>");
    
    return formatted;
}
