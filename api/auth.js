let isAuthLogin = true;

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
            history.replaceState(null, null, '#' + tabSebelumnya);
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
    const email = document.getElementById('auth-email').value, 
          password = document.getElementById('auth-pass').value, 
          nick = document.getElementById('auth-nick').value, 
          btn = document.getElementById('auth-btn');
          
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
    viewedUserId = null; 
    blockedUsersList = [];
    allVideosData = []; 
    globalPersonalList = [];
    globalGroupList = [];
    localStorage.removeItem('optimistic_vip');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('liked_') || key.startsWith('comment_') || key.startsWith('story_') || key === 'optimistic_vip') {
            localStorage.removeItem(key);
        }
    }); 
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
        messageSubscription = null;
    }
    if (presenceChannel) {
        supabaseClient.removeChannel(presenceChannel);
        presenceChannel = null;
    }
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
    updateUIForLoggedOut();
    checkSession();    
    showToast("Anda telah keluar.", "info");
}
