// ==========================================
// FUNGSI PROFIL & KASTA LEVEL
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

async function tambahExp(jumlah) {
    if (!currentUser || !userProfile) return;
    
    const expLama = userProfile.exp || 0;
    const levelLama = hitungStatusLevel(expLama).level;
    const expBaru = expLama + jumlah;
    const levelBaru = hitungStatusLevel(expBaru).level;
    
    userProfile.exp = expBaru;

    try {
        await supabaseClient.from('profiles').update({ exp: expBaru }).eq('id', currentUser.id);
        
        if (levelBaru > levelLama) {
            showToast(`🎉 SELAMAT! Anda naik ke Level ${levelBaru}!`, "success");
        }

        if (document.getElementById('profile').classList.contains('active') && viewedUserId === currentUser.id) {
            const statusLevel = hitungStatusLevel(expBaru);
            document.getElementById('profile-level-badge').innerText = `Lv. ${statusLevel.level}`;
            document.getElementById('text-exp-current').innerText = `EXP: ${statusLevel.exp}`;
            document.getElementById('text-exp-target').innerText = `Next: ${statusLevel.targetNextLevel}`;
            document.getElementById('bar-exp-progress').style.width = `${statusLevel.persentase}%`;
        }
    } catch (e) {
        console.error("Gagal auto-update EXP:", e);
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
    }
}

function getBadgeByLevelAndVideos(level, count) {
    if (level >= 10 || count >= 100) return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
    if (level >= 5 || count >= 50) return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
    if (level >= 3 || count >= 25) return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
    if (level >= 2 || count >= 10) return `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
    return '';
}

function getBadgeByVideoCount(count) {
    return getBadgeByLevelAndVideos(0, count);
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const icon = document.querySelector('label[for="avatar-input"] i'); icon.className = 'fas fa-spinner fa-spin';
    try {
        const compressedBlob = await compressImage(file);
        const base64data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            reader.onloadend = () => resolve(reader.result);
        });

        const response = await fetch('/api/upload-foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64data, userId: currentUser.id })
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const currentNick = userProfile?.nickname || "Player";
        const { error: dbErr } = await supabaseClient.from('profiles').upsert({ id: currentUser.id, nickname: currentNick, avatar_url: data.url });
        if (dbErr) throw new Error(dbErr.message);

        const elImg = document.getElementById('profile-img'); if(elImg) elImg.src = data.url;

        await fetchProfile();
        updateUIForLoggedIn();
        showToast("Foto profil berhasil diperbarui!", "success");

    } catch (e) {
        showToast("Gagal upload: " + e.message, "error");
    } finally {
        icon.className = 'fas fa-camera text-xs';
    }
}

async function viewUserProfileByNickname(nickname) {
    showToast("Mencari pengguna...", "info");
    try {
        const { data, error } = await supabaseClient.from('profiles').select('id').ilike('nickname', nickname).single();
        if (data && data.id) {
            viewUserProfile(data.id);
        } else {
            showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
        }
    } catch (err) {
        showToast(`Pengguna @${nickname} tidak ditemukan.`, "error");
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

async function openUserProfile(userId) {
    try {
        let wasPopupOpen = false;

        if (document.body.classList.contains('video-focused')) {
            if(typeof toggleGlobalAudio === 'function') toggleGlobalAudio(true);
            wasPopupOpen = true;
        }

        const floatingPlayer = document.getElementById('floating-video-player');
        if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
            if(typeof closeFloatingVideo === 'function') closeFloatingVideo(true);
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

        if(typeof renderProfileVideos === 'function') await renderProfileVideos(userId);

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
        
        if (!isOwn && currentUser) {
            const btnFollow = document.getElementById('btn-follow');
            if (btnFollow) {
                const { data: isFollowing } = await supabaseClient.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', userId).single();
                if (isFollowing) {
                    btnFollow.innerText = 'MENGIKUTI';
                    btnFollow.className = 'flex-1 bg-white/10 py-2.5 rounded-xl text-[11px] font-extrabold text-white uppercase tracking-wide transition-transform';
                } else {
                    btnFollow.innerText = 'IKUTI';
                    btnFollow.className = 'flex-1 bg-brand-accent py-2.5 rounded-xl text-[11px] font-extrabold text-white uppercase tracking-wide hover:scale-95 transition-transform shadow-[0_0_15px_rgba(255,0,122,0.3)]';
                }
            }
        }

        if (isOwn && typeof loadOrderTracker === 'function') {
            try { await loadOrderTracker(userId); } catch (e) { console.warn(e); }
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
            setTimeout(() => { document.getElementById('bar-exp-progress').style.width = `${myStatusLevel.persentase}%`; }, 100);
            elExpContainer.classList.remove('hidden');
        }

        const actionOwn = document.getElementById('profile-actions-own'); 
        if(actionOwn) { actionOwn.classList.remove('hidden'); actionOwn.style.display = ''; }
        const actionOther = document.getElementById('profile-actions-other'); 
        if(actionOther) { actionOther.classList.add('hidden'); actionOther.style.display = ''; }

        const btnBack = document.getElementById('btn-back-profile'); if(btnBack) btnBack.classList.add('hidden');
        const btnEditAva = document.getElementById('btn-edit-avatar'); if(btnEditAva) btnEditAva.classList.remove('hidden');

        const elVidTitle = document.getElementById('profile-video-title');
        if(elVidTitle) elVidTitle.innerHTML = `<i class="fas fa-grip-vertical mr-2 text-brand-info"></i> Video Saya`;

        if(typeof renderProfileVideos === 'function') renderProfileVideos(currentUser.id);
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

        if(!newNick) return showToast("Nickname tidak boleh kosong!", "error");

        if (newPass) {
            const { error: errPass } = await supabaseClient.auth.updateUser({ password: newPass });
            if (errPass) return showToast("Gagal ganti password: " + errPass.message, "error");
        }

        const currentAvatar = userProfile?.avatar_url || "";
        const { error } = await supabaseClient.from('profiles').upsert({ id: currentUser.id, nickname: newNick, bio: newBio, avatar_url: currentAvatar });

        if (error) {
            if (error.code === '23505') throw new Error("Nickname tersebut sudah dipakai player lain. Silakan cari yang lain!");
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
    const konfirmasi = await customPrompt("PERINGATAN! Semua data (Video, Follower, Saldo) akan hangus.\n\nKetik 'HAPUS AKUN' huruf besar semua untuk melanjutkan:");
    if (konfirmasi === 'HAPUS AKUN') {
        showToast("Sedang menghancurkan akun...", "info");
        try {
            const { error } = await supabaseClient.rpc('hapus_akun_saya');
            if (error) throw error;
            showToast("Akun berhasil dihapus secara permanen.", "success");
            closeEditProfileModal();
            await handleLogout();
        } catch (err) {
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
        await supabaseClient.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
        btns.forEach(btn => {
            btn.innerText = 'IKUTI';
            btn.classList.replace('bg-white/10', 'bg-brand-accent');
        });
        showToast("Batal mengikuti", "info");
    } else {
        await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
        btns.forEach(btn => {
            btn.innerText = 'MENGIKUTI';
            btn.classList.replace('bg-brand-accent', 'bg-white/10');
        });
        showToast("Berhasil mengikuti!", "success");
    }

    fetchFollowStats(targetUserId);
}

async function feedToggleFollow(targetUserId, btnElement) {
    if (!currentUser) return openAuthModal();
    if (currentUser.id === targetUserId) return showToast("Ini video milikmu sendiri!", "info");

    const icon = btnElement.querySelector('i');
    icon.className = 'fas fa-spinner fa-spin text-[10px]';

    try {
        await toggleFollow(targetUserId);
        btnElement.classList.add('scale-0', 'opacity-0');
        setTimeout(() => { btnElement.style.display = 'none'; }, 300);
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
                removeBtn = `
                <button onclick="event.stopPropagation(); removeFollower('${p.id}', '${p.nickname.replace(/'/g, "\\'")}')" 
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

async function removeFollower(followerId, nickname) {
    if (!currentUser) return;
    const konfirmasi = await customConfirm(`Yakin ingin menghapus ${nickname} dari daftar pengikut Anda?`);
    if (!konfirmasi) return;

    try {
        showToast(`Menghapus ${nickname}...`, "info");
        const { error } = await supabaseClient.from('follows').delete().eq('follower_id', followerId).eq('following_id', currentUser.id);
        if (error) throw error;
        showToast(`${nickname} berhasil dihapus dari pengikut.`, "success");
        fetchFollowStats(currentUser.id);
        showUserList('pengikut'); 
    } catch (err) {
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
                if(document.getElementById('sosial').classList.contains('active') && typeof loadVideos === 'function') loadVideos();
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
