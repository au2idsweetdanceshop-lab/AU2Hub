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

        if (allVideosData.length === 0) {
            fetch('/api/content?action=videos')
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

async function tambahExp(jumlah) {
    if (!currentUser || !userProfile) return;
    const expLama = userProfile.exp || 0;
    const expBaru = expLama + jumlah;
    userProfile.exp = expBaru;
    if (document.getElementById('profile').classList.contains('active') && viewedUserId === currentUser.id) {
        const statusLevel = hitungStatusLevel(expBaru);
        document.getElementById('profile-level-badge').innerText = `Lv. ${statusLevel.level}`;
        document.getElementById('text-exp-current').innerText = `EXP: ${statusLevel.exp}`;
        document.getElementById('text-exp-target').innerText = `Next: ${statusLevel.targetNextLevel}`;
        document.getElementById('bar-exp-progress').style.width = `${statusLevel.persentase}%`;
    }
}

async function fetchProfile() {
    const { data, error } = await supabaseClient.rpc('get_my_profile_v1');
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
        
        const expData = userProfile.exp || 0; 
        const statusLevel = hitungStatusLevel(expData);
        const elLevelBadge = document.getElementById('profile-level-badge');
        const elExpContainer = document.getElementById('profile-exp-container');
        
        if (elLevelBadge && elExpContainer) {
            elLevelBadge.innerText = `Lv. ${statusLevel.level}`;
            elLevelBadge.classList.remove('hidden');
            document.getElementById('text-exp-current').innerText = `EXP: ${statusLevel.exp}`;
            document.getElementById('text-exp-target').innerText = `Next: ${statusLevel.targetNextLevel}`;
            setTimeout(() => {
                document.getElementById('bar-exp-progress').style.width = `${statusLevel.persentase}%`;
            }, 100);
            elExpContainer.classList.remove('hidden');
        }
        const btnSuperAdmin = document.getElementById('btn-super-admin');
        if (btnSuperAdmin) {
            if (userProfile && userProfile.is_super_admin === true) {
                btnSuperAdmin.classList.remove('hidden');
            } else {
                btnSuperAdmin.classList.add('hidden');
            }
        }
    }
}

function updateUIForLoggedIn() {
    const ava = (userProfile?.avatar_url && userProfile.avatar_url !== "") ? userProfile.avatar_url : `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'User'}&background=1A1133&color=fff`;
    document.getElementById('header-user').innerHTML = `
    <div onclick="switchTab('profile')" class="flex items-center gap-2 cursor-pointer bg-white/5 pr-4 pl-1 py-1 rounded-full border border-white/10 active:scale-95 transition-transform">
    <img src="${ava}" class="w-7 h-7 rounded-full object-cover border border-brand-info">
    <span class="text-[10px] font-bold text-white">${userProfile?.nickname || 'User'}</span>
    </div>`;

    renderProfileVideos();

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
        const compressedBlob = await compressImage(file);
        const finalFile = new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" });
        const oldAvatarUrl = userProfile?.avatar_url || "";
        if (oldAvatarUrl && !oldAvatarUrl.includes('ui-avatars.com')) {
            await fetch('/api/storage?action=delete&type=file', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: oldAvatarUrl })
            }).catch(e => console.log("Abaikan jika file lama sudah tidak ada:", e));
        }

        const pathLengkap = `${currentUser.id}/avatar/ava_${Date.now()}`;
        const { data: { session } } = await supabaseClient.auth.getSession();
        const token = session?.access_token;
        const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(finalFile.type)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataUrl = await resUrl.json();
        await fetch(dataUrl.uploadUrl, {
            method: 'PUT',
            body: finalFile,
            headers: { 'Content-Type': finalFile.type, 'x-amz-acl': 'public-read' }
        });
        const currentNick = userProfile?.nickname || "Player";
        const newAvatarUrl = dataUrl.finalVideoUrl; 
        const { error: dbErr } = await supabaseClient
            .from('profiles')
            .upsert({ id: currentUser.id, nickname: currentNick, avatar_url: newAvatarUrl });
        if (dbErr) throw new Error(dbErr.message);
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
        let data, error;
        if (isOwn) {
            const res = await supabaseClient.rpc('get_my_profile_v1');
            data = res.data; error = res.error;
        } else {
            const res = await supabaseClient.from('profiles').select('id, nickname, avatar_url, bio, exp, is_seller, seller_expired_at, last_seen, is_super_admin').eq('id', userId).single();
            data = res.data; error = res.error;
        }
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
        const amanNickname = escapeHTML(data?.nickname || "Player"); 
        if(elNick2) elNick2.innerHTML = "@" + amanNickname + badgeHTML;
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
        if (!isOwn && currentUser) {
            const btnFollow = document.getElementById('btn-follow');
            if (btnFollow) {
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
        const profileContainer = document.getElementById('profile-logged-in');
        if (profileContainer) {
            profileContainer.classList.remove('hidden');
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
    if(typeof cancelReply === 'function') cancelReply();
    const widget = document.getElementById('floating-widget');
    if (widget && !widget.classList.contains('opacity-0')) {
        widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
    }
    openUserProfile(userId);
}

async function viewUserProfileByNickname(nickname) {
    showToast("Mencari pengguna...", "info");
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .ilike('nickname', nickname)
            .single();
        if (data && data.id) {
            viewUserProfile(data.id);
        } else {
            showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
        }
    } catch (err) {
        showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
    }
}

function kembaliDariProfil() {
    switchTab(tabSebelumnya, null, false);
    history.replaceState(null, null, '#' + tabSebelumnya);
    if (currentUser) {
        viewedUserId = currentUser.id;
        const userVideos = allVideosData.filter(v => v.user_id === currentUser.id);
        const myExp = userProfile?.exp || 0;
        const myStatusLevel = hitungStatusLevel(myExp);
        const myBadgeHTML = getBadgeByLevelAndVideos(myStatusLevel.level, userVideos.length);
        const pNick = document.getElementById('profile-nickname'); 
        if(pNick) pNick.innerHTML = "@" + (userProfile?.nickname || "Player") + myBadgeHTML;
        const pBio = document.getElementById('profile-bio'); if(pBio) pBio.innerText = userProfile?.bio || "Belum ada deskripsi.";
        const pImg = document.getElementById('profile-img'); if(pImg) pImg.src = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Player'}&background=1A1133&color=fff`;
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
        btns.forEach(btn => {
            btn.innerText = 'IKUTI';
            btn.classList.replace('bg-white/10', 'bg-brand-accent');
        });
        showToast("Batal mengikuti", "info");
        myFollowingList = myFollowingList.filter(id => id !== targetUserId);
        document.querySelectorAll(`#feed-follow-btn-${targetUserId}`).forEach(btn => {
            btn.style.display = 'flex';
            setTimeout(() => btn.classList.remove('scale-0', 'opacity-0'), 10);
        });
    } else {
        await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
        btns.forEach(btn => {
            btn.innerText = 'MENGIKUTI';
            btn.classList.replace('bg-brand-accent', 'bg-white/10');
        });
        showToast("Berhasil mengikuti!", "success");
        if (!myFollowingList.includes(targetUserId)) {
            myFollowingList.push(targetUserId);
        }
        document.querySelectorAll(`#feed-follow-btn-${targetUserId}`).forEach(btn => {
            btn.classList.add('scale-0', 'opacity-0');
            setTimeout(() => btn.style.display = 'none', 300);
        });
    }
    fetchFollowStats(targetUserId);
}

async function feedToggleFollow(targetUserId, btnElement) {
    if (!currentUser) return openAuthModal();
    if (currentUser.id === targetUserId) {
        showToast("Ini video milikmu sendiri!", "info");
        return;
    }
    const icon = btnElement.querySelector('i');
    icon.className = 'fas fa-spinner fa-spin text-[10px]';
    try {
        await toggleFollow(targetUserId);
    } catch(e) {
        icon.className = 'fas fa-plus text-[10px]';
    }
}

async function showUserList(type) {
    if (!currentUser && viewedUserId === null) return;
    const targetId = viewedUserId || currentUser.id;
    const isOwnProfile = currentUser && targetId === currentUser.id;
    const isFollowerList = type === 'pengikut';
    const modal = document.getElementById('modal-user-list');
    const container = document.getElementById('user-list-container');
    const title = document.getElementById('user-list-title');
    history.pushState({ popup: 'user_list' }, null, '#userlist');
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
            let removeBtn = '';
            if (isOwnProfile && isFollowerList) {
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

function closeUserList(dariTombolBack = false) {
    const modal = document.getElementById('modal-user-list');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    if (!dariTombolBack && window.location.hash === '#userlist') {
        history.back();
    }
}

async function removeFollower(followerId, nickname) {
    if (!currentUser) return;
    const konfirmasi = await customConfirm(`Yakin ingin menghapus ${nickname} dari daftar pengikut Anda?`);
    if (!konfirmasi) return;
    try {
        showToast(`Menghapus ${nickname}...`, "info");
        const { error } = await supabaseClient
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', currentUser.id);
        if (error) throw error;
        showToast(`${nickname} berhasil dihapus dari pengikut.`, "success");
        fetchFollowStats(currentUser.id);
        showUserList('pengikut'); 
    } catch (err) {
        console.error(err);
        showToast("Gagal menghapus pengikut: " + err.message, "error");
    }
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

async function toggleBlockUser(userId) {
    if(!currentUser) return openAuthModal();
    const btn = document.getElementById('btn-block-user');
    try {
        if(blockedUsersList.includes(userId)) {
            const hapus = await customConfirm("Buka blokir pengguna ini?");
            if(hapus) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                await supabaseClient.from('blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', userId);
                blockedUsersList = blockedUsersList.filter(id => id !== userId);
                showToast("Blokir dibuka", "success");
                checkBlockStatusUI();
            }
        } else {
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

function openEditProfileModal() {
    if(!currentUser) return;
    document.getElementById('edit-nick').value = userProfile?.nickname || '';
    document.getElementById('edit-bio').value = userProfile?.bio || '';
    document.getElementById('edit-wa').value = userProfile?.whatsapp || '';
    document.getElementById('edit-pass').value = '';
    document.getElementById('edit-wallet-provider').value = userProfile?.wallet_provider || '';
    document.getElementById('edit-wallet-number').value = userProfile?.wallet_number || '';
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
    btn.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Menyimpan...';
    btn.disabled = true;
    try {
        const newNick = document.getElementById('edit-nick').value.trim();
        const newBio = document.getElementById('edit-bio').value.trim();
        const newWa = document.getElementById('edit-wa').value.replace(/[^0-9]/g, ''); 
        const newPass = document.getElementById('edit-pass').value.trim();
        const newWalletProv = document.getElementById('edit-wallet-provider').value;
        const newWalletNum = document.getElementById('edit-wallet-number').value.replace(/[^0-9]/g, '');
        if(!newNick) {
            showToast("Nickname tidak boleh kosong!", "error");
            return;
        }
        if (newPass) {
            const { error: errPass } = await supabaseClient.auth.updateUser({ password: newPass });
            if (errPass) throw new Error("Gagal ganti password: " + errPass.message);
        }
        const currentAvatar = userProfile?.avatar_url || "";
        const { error } = await supabaseClient.from('profiles').upsert({
            id: currentUser.id,
            nickname: newNick,
            bio: newBio,
            whatsapp: newWa,
            wallet_provider: newWalletProv,
            wallet_number: newWalletNum,
            avatar_url: currentAvatar
        });
        if (error) {
            if (error.code === '23505') throw new Error("Nickname tersebut sudah dipakai player lain.");
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

async function hapusAkunPermanen() {
    if (!currentUser) return;

    const konfirmasi = await customPrompt("PERINGATAN! Semua data (Video, Follower, Saldo, dan Media) akan hangus.\n\nKetik 'HAPUS AKUN' huruf besar semua untuk melanjutkan:");
    if (konfirmasi === 'HAPUS AKUN') {
        showToast("Sedang menghancurkan akun dan membersihkan media...", "info");
        try {
            await fetch(`/api/storage?action=delete&type=folder&userId=${currentUser.id}`, {
                method: 'DELETE'
            });
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

function getBadgeByLevelAndVideos(level, count) {
    if (level >= 10 || count >= 100) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
    }
    if (level >= 5 || count >= 50) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
    }
    if (level >= 3 || count >= 25) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
    }
    if (level >= 2 || count >= 10) {
        return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
    }
    return '';
}

function getBadgeByVideoCount(count) {
    return getBadgeByLevelAndVideos(0, count);
}

let timerLastSeen = 0;

async function updateMyLastSeen() {
    if (!currentUser) return;
    const now = Date.now();
    if (now - timerLastSeen < 120000) return; 
    timerLastSeen = now;
    try {
        await supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    } catch (e) { console.log("Gagal update last seen"); }
}

setInterval(updateMyLastSeen, 60000);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') updateMyLastSeen();
});
