// ==========================================
// FUNGSI AUTENTIKASI & SESI (AUTH)
// ==========================================

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
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.opacity = '1';

        if (window.location.hash === '#auth') {
            history.replaceState(null, null, '#home');
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
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;
    const nick = document.getElementById('auth-nick').value;
    const btn = document.getElementById('auth-btn');
    
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
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

    if(typeof renderProfileVideos === 'function') renderProfileVideos();

    if(currentUser) {
        if(typeof fetchFollowStats === 'function') fetchFollowStats(currentUser.id);
        if (document.getElementById('toko') && document.getElementById('toko').classList.contains('active')) {
            if(typeof loadTokoSaya === 'function') loadTokoSaya();
        }
    }
}

function updateUIForLoggedOut() {
    document.getElementById('header-user').innerHTML = `<button onclick="openAuthModal()" class="text-[10px] font-bold bg-white/10 px-4 py-2 rounded-full border border-white/10 uppercase active:scale-95 transition-transform">Login / Daftar</button>`;
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
        if(typeof fetchProfile === 'function') await fetchProfile();
        
        const tracker = document.getElementById('order-tracker-section');
        if (tracker) { tracker.classList.remove('hidden'); tracker.style.display = 'block'; }
        const pesananOut = document.getElementById('pesanan-logged-out');
        if (pesananOut) pesananOut.classList.add('hidden');
        
        if(typeof loadOrderTracker === 'function') loadOrderTracker(user.id);
        if(typeof fetchBlockedUsers === 'function') await fetchBlockedUsers();
        if(typeof checkGlobalUnreadMessages === 'function') checkGlobalUnreadMessages();
        
        document.querySelectorAll('#profile-logged-in').forEach(el => el.classList.remove('hidden'));
        document.getElementById('profile-logged-out').classList.add('hidden');
        if(typeof prosesAutoDeliveryTertunda === 'function') prosesAutoDeliveryTertunda(); 

        if (allVideosData.length === 0) {
            fetch('/api/get-videos')
                .then(res => res.json())
                .then(dataDariSheet => {
                    allVideosData = dataDariSheet.map((v, index) => {
                        v.original_index = index; 
                        v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
                        return v;
                    }).filter(v => !blockedUsersList.includes(v.user_id));
                })
                .catch(e => console.log("Silent fetch videos failed", e));
        }

        updateUIForLoggedIn();
        if(typeof initPresence === 'function') initPresence();
        if(typeof updateMyLastSeen === 'function') updateMyLastSeen();
        if(typeof initGlobalMessageListener === 'function') initGlobalMessageListener();
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
