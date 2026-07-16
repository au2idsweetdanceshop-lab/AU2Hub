

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
        infoText.innerHTML = `*Pendapatan Anda akan dipotong sesuai <span onclick="customAlert(TEKS_TABEL_FEE)" class="underline cursor-pointer font-bold hover:text-brand-info text-white">Tabel Fee</span>. Pembeli melihat harga normal.`;
    } else {
        btnPembeli.className = activeClass;
        btnSeller.className = inactiveClass;
        infoText.innerHTML = `*Anda menerima pendapatan UTUH. Harga ke pembeli otomatis dinaikkan menyesuaikan <span onclick="customAlert(TEKS_TABEL_FEE)" class="underline cursor-pointer font-bold hover:text-brand-info text-white">Tabel Fee</span>.`;
    }
}

function hitungPendapatanBersih(hargaGateway, ditanggungPembeli, namaProduk = "") {
    let hargaAktual = hargaGateway;

    if (namaProduk.includes('[+Rekber]')) {
        if (hargaAktual >= 2035000) hargaAktual -= 35000;
        else if (hargaAktual >= 1525000) hargaAktual -= 25000;
        else if (hargaAktual >= 520000) hargaAktual -= 20000;
        else if (hargaAktual >= 110000) hargaAktual -= 10000;
        else hargaAktual -= 5000;
    }

    const hargaBase = Math.round((hargaAktual - 500) / 1.007); 
    
    if (ditanggungPembeli) {
        if (hargaBase <= 10500) return hargaBase - 500;
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

function hitungPotonganSeller(harga) {
    if (harga <= 10000) return 500
    if (harga <= 25000) return 1000;
    if (harga <= 50000) return 2000;
    if (harga <= 99999) return 3000;
    if (harga <= 499999) return 10000;
    if (harga <= 1499999) return 20000
    if (harga <= 1999999) return 25000;
    return 35000;
}

function hitungFeeRekber(harga) {
    if (harga <= 99999) return 5000;
    if (harga <= 499999) return 10000;
    if (harga <= 1499999) return 20000;
    if (harga <= 1999999) return 25000;
    return 35000;
}

window.addEventListener('beforeunload', function (e) {
if (isUploading) {
e.preventDefault();
e.returnValue = 'Upload sedang berlangsung. Yakin ingin meninggalkan halaman?';
}
});

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

let typingTimer;
let currentRoomMembers = [];
let globalFaqData = [];
let isInfoLoaded = false;

        async function loadInfoLayanan(forceRefresh = false) {
            if (isInfoLoaded && !forceRefresh) return;
            const eventContainer = document.getElementById('dynamic-event-container');
            const faqContainer = document.getElementById('faq-container');
            if (forceRefresh) {
                eventContainer.innerHTML = '<div class="animate-pulse bg-brand-card h-40 rounded-3xl border border-white/5 flex items-center justify-center"><img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-10 h-10 mx-auto splash-logo-anim drop-shadow-[0_0_15px_rgba(255,0,122,0.5)]"></div>';
                faqContainer.innerHTML = '<div class="text-center py-6"><i class="fas fa-spinner fa-spin text-brand-info text-2xl"></i></div>';
            }
            try {
                const configRes = await fetch('/api/content?action=config');
                const config = await configRes.json();
                if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan");
                const res = await fetch(`${config.gasUrl}?action=get_info`);
                const data = await res.json();
                if (data.status === 'success') {
                    if (data.info && data.info.length > 0) {
                        let carouselHTML = `
                        <div class="relative w-full overflow-hidden rounded-[2rem] pb-8 pt-1">
                            <div id="info-image-carousel" onscroll="updateInfoCarouselDots()" class="flex overflow-x-auto hide-scroll snap-x snap-mandatory gap-4 relative px-1 items-stretch">
                        `;
                        carouselHTML += data.info.map((evt, idx) => {
                            let rawGambar = evt.link_gambar || evt.gambar || "";
                            let arrGambar = [];
                            if (typeof rawGambar === 'string' && rawGambar.trim() !== "") {
                                arrGambar = rawGambar.split(/[\n,]+/).map(url => url.trim()).filter(url => url !== "");
                            } else if (Array.isArray(rawGambar)) {
                                arrGambar = rawGambar.filter(url => url && url.trim() !== "");
                            }

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

                    if (data.faq && data.faq.length > 0) {
                        globalFaqData = data.faq.map(f => ({ t: f.pertanyaan, j: f.jawaban }));
                        renderFaqs(globalFaqData);
                    } else {
                        faqContainer.innerHTML = '<div class="text-center py-6 text-xs text-gray-500 bg-brand-card rounded-2xl border border-white/5">FAQ kosong.</div>';
                    }

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
                            let tagPembuka = 'a';
                            if (tipeAksi === 'alert' || tipeAksi === 'popup') {
                                let safeTarget = escapeHTML(targetAksi).replace(/&#39;/g, "\\'").replace(/\n/g, "\\n");
                                atributKlik = `href="javascript:void(0)" onclick="customAlert('${safeTarget}')"`;
                            } else if (tipeAksi === 'tab') {
                                atributKlik = `href="javascript:void(0)" onclick="switchTab('${targetAksi}')"`;
                            } else if (tipeAksi === 'link') {
                                let amanUrl = targetAksi;
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
            const scrollLeft = carousel.scrollLeft;
            const cardWidth = carousel.firstElementChild ? carousel.firstElementChild.clientWidth : carousel.clientWidth;
            let activeIndex = Math.round(scrollLeft / (cardWidth + 16));
            activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));
            dots.forEach((dot, index) => { 
                if (index === activeIndex) { dot.className = "info-dot-indicator h-1.5 rounded-full transition-all duration-300 w-4 bg-brand-accent"; } 
                else { dot.className = "info-dot-indicator h-1.5 rounded-full transition-all duration-300 w-1.5 bg-white/40"; } 
            });
        }
        
        function updateInnerDots(container) {
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
    let myGroupIds = [];
    supabaseClient.from('group_members').select('group_id').eq('user_id', currentUser.id)
        .then(({data}) => {
            if (data) myGroupIds = data.map(g => g.group_id);
        });

    globalMessageSubscription = supabaseClient
        .channel('global_messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, payload => {
            const msg = payload.new;
            const isForMe = msg.receiver_id === currentUser.id;
            const isForMyGroup = msg.group_id && (myGroupIds.includes(msg.group_id) || globalGroupList.some(g => g.id === msg.group_id));
            if ((isForMe || isForMyGroup) && msg.sender_id !== currentUser.id && !blockedUsersList.includes(msg.sender_id)) {
                const isRoomOpen = document.getElementById('chat-room-view').classList.contains('flex');
                const isChattingWithSender = !msg.group_id && activeChatUserId === msg.sender_id;
                const isChattingInGroup = msg.group_id && activeGroupId === msg.group_id;
                if (isRoomOpen && (isChattingWithSender || isChattingInGroup)) {
                    checkGlobalUnreadMessages();
                    return; 
                }

                let isMentioned = false;
                const myNickname = userProfile?.nickname;
                if (isForMyGroup && myNickname && msg.message) {
                    const regexMention = new RegExp(`@${myNickname}(?![a-zA-Z0-9_])`, 'i');
                    if (regexMention.test(msg.message)) {
                        isMentioned = true;
                    }
                }
                if (isMentioned) {
                    showToast("🔔 Ada yang menyebut Anda di Grup!", "success");
                } else if (isForMyGroup) {
                    showToast("Ada pesan baru di Grup Anda!", "info");
                } else {
                    showToast("Ada pesan pribadi baru masuk!", "info");
                }

if (msg.message && (msg.message.includes('Transfer Saldo Berhasil!') || msg.message.includes('SUKSES!') || msg.message.includes('GAGAL diproses'))) {
    setTimeout(() => {
        if (typeof fetchSaldoDanMutasi === 'function') fetchSaldoDanMutasi();
        if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
        if (typeof updateUiSaldoSeller === 'function') updateUiSaldoSeller();
        if (typeof fetchProfile === 'function') fetchProfile();
        if (typeof loadOrderTracker === 'function') loadOrderTracker(currentUser.id);
        const riwayatModal = document.getElementById('modal-riwayat-pesanan');
        if (riwayatModal && !riwayatModal.classList.contains('hidden') && typeof cekStatusPesanan === 'function') {
            cekStatusPesanan('proses');
        }
    }, 1000);
}

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
            const res = await fetch('/api/content?action=videos');
            let dataDariSheet = await res.json();
            dataDariSheet = dataDariSheet.map((v, index) => {
                v.original_index = index;
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

window.addEventListener('popstate', () => {
    let isPopupClosed = false;
    if (typeof intervalJemputBola !== 'undefined' && intervalJemputBola) {
        clearInterval(intervalJemputBola);
        intervalJemputBola = null;
    }
    if (typeof window.wdPolling !== 'undefined' && window.wdPolling) {
        clearInterval(window.wdPolling);
        window.wdPolling = null;
    }
    if (typeof window.ppobPolling !== 'undefined' && window.ppobPolling) {
        clearInterval(window.ppobPolling);
        window.ppobPolling = null;
    }

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
    const menuMelayang = document.getElementById('assistive-menu');
    if (menuMelayang && !menuMelayang.classList.contains('hidden')) {
        closeAssistiveMenu(true);
        return;
    }
    const modalTarikOto = document.getElementById('modal-tarik-otomatis');
    if (modalTarikOto && !modalTarikOto.classList.contains('hidden')) {
        tutupModalTarikOtomatis(true);
        return;
    }
    const katalogPPOB = document.getElementById('ppob-catalog-view');
    if (katalogPPOB && !katalogPPOB.classList.contains('hidden')) {
        tutupKatalogPPOB(true);
        return;
    }
    const sectionPembayaran = document.getElementById('pembayaran');
    if (sectionPembayaran && sectionPembayaran.classList.contains('active')) {
        if (typeof intervalJemputBola !== 'undefined' && intervalJemputBola) {
            clearInterval(intervalJemputBola);
            intervalJemputBola = null;
        }
        if (typeof activeChannelPembayaran !== 'undefined' && activeChannelPembayaran) {
            supabaseClient.removeChannel(activeChannelPembayaran);
            activeChannelPembayaran = null;
        }
        setTimeout(() => {
            if (typeof loadPasarPlayer === 'function') loadPasarPlayer(true);
            if (document.getElementById('toko') && document.getElementById('toko').classList.contains('active')) {
                if (typeof loadProdukSaya === 'function') loadProdukSaya();
            }
            if (typeof updateUiSaldoSeller === 'function') updateUiSaldoSeller();
            if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
            if (typeof currentUser !== 'undefined' && currentUser && typeof loadOrderTracker === 'function') loadOrderTracker(currentUser.id);
        }, 400);
    }
    const modalKreator = document.getElementById('modal-kreator-option');
    if (modalKreator && !modalKreator.classList.contains('hidden')) {
        tutupMenuKreator(true);
        return;
    }
    const modalNetflix = document.getElementById('modal-netflix');
    if (modalNetflix && !modalNetflix.classList.contains('hidden')) {
        modalNetflix.classList.add('hidden');
        modalNetflix.classList.remove('flex');
        return;
    }
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
    const modalDompet = document.getElementById('modal-saldo-dompet');
    if (modalDompet && !modalDompet.classList.contains('hidden')) {
        tutupModalSaldoDompet(true);
        return;
    }
    const modalCreateGroup = document.getElementById('modal-create-group');
    if (modalCreateGroup && !modalCreateGroup.classList.contains('hidden')) {
        closeCreateGroupModal(true);
        return;
    }
    const modalForward = document.getElementById('modal-forward-msg');
    if (modalForward && !modalForward.classList.contains('hidden')) {
        closeForwardModal(true);
        return;
    }
    const modalLangganan = document.getElementById('modal-langganan-seller');
    if (modalLangganan && !modalLangganan.classList.contains('hidden')) {
        tutupModalLangganan(true);
        return;
    }
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
    const modalInvoice = document.getElementById('modal-detail-pesanan');
    if (modalInvoice && !modalInvoice.classList.contains('hidden')) {
        closeDetailPesanan(true);
        return;
    }
    const modalRiwayat = document.getElementById('modal-riwayat-pesanan');
    if (modalRiwayat && !modalRiwayat.classList.contains('hidden')) {
        closeRiwayatPesanan(true); 
        return;
    }
    const modalPratinjau = document.getElementById('modal-pratinjau');
    if (modalPratinjau && !modalPratinjau.classList.contains('hidden')) {
        tutupPratinjauVideo(true);
        return;
    }
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
    if(lightbox && !lightbox.classList.contains('hidden')) {
        closeLightbox(true);
        return;
    }
    const statsModal = document.getElementById('modal-story-stats');
    if (statsModal && !statsModal.classList.contains('translate-y-full')) {
        closeStoryStatsModal(true);
        return;
    }
    const storyModal = document.getElementById('story-viewer-modal');
    if (storyModal && !storyModal.classList.contains('hidden')) {
        closeStoryViewer(true);
        return;
    }
    const modalMsgOption = document.getElementById('modal-msg-option');
    if (modalMsgOption && !modalMsgOption.classList.contains('hidden')) {
        closeMsgOptions(true);
        return;
    }
    const modalUserList = document.getElementById('modal-user-list');
    if (modalUserList && !modalUserList.classList.contains('hidden')) {
        closeUserList(true);
        return;
    }
    const commentDrawer = document.getElementById('comment-drawer');
    if (commentDrawer && commentDrawer.classList.contains('open')) {
        commentDrawer.classList.remove('open');
        cancelReply();
        if (commentSubscription) {
            supabaseClient.removeChannel(commentSubscription);
            commentSubscription = null;
        }
        return;
    }
    const modalEvent = document.getElementById('modal-event');
    if (modalEvent && !modalEvent.classList.contains('hidden')) {
        modalEvent.classList.add('hidden'); modalEvent.classList.remove('flex');
        document.body.style.overflow = 'auto'; isPopupClosed = true;
    }
    const modalEditProfile = document.getElementById('modal-edit-profile');
    if (modalEditProfile && !modalEditProfile.classList.contains('hidden')) {
        closeEditProfileModal();
        isPopupClosed = true;
    }
    const widget = document.getElementById('floating-widget');
    if (widget && !widget.classList.contains('opacity-0')) {
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
        isPopupClosed = true;
    }
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
        isPopupClosed = true;
    }
    const floatingPlayer = document.getElementById('floating-video-player');
    if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
        closeFloatingVideo(true);
        isPopupClosed = true;
    }
    if (isPopupClosed) return;
    const newHash = window.location.hash.substring(1) || 'home';
    if (newHash === 'profile' && viewedUserId !== currentUser?.id) {
        viewedUserId = currentUser?.id;
        checkSession();
    }
    const cleanHash = newHash.split('?')[0];
    const validTabs = ['home', 'sosial', 'pasar', 'toko', 'layanan', 'pesanan', 'profile', 'pembayaran', 'superadmin', 'tokopublik'];
    if (newHash.startsWith('tokopublik?seller=') || newHash.startsWith('pasar?seller=')) {
        const sellerName = decodeURIComponent(newHash.split('=')[1]);
        if (newHash.startsWith('pasar?seller=')) {
            history.replaceState(null, null, '#tokopublik?seller=' + encodeURIComponent(sellerName));
        }
        switchTab('tokopublik', null, false);
        loadTokoPublikLuar(sellerName);
        return;
    }
    if (!validTabs.includes(cleanHash)) {
        history.replaceState(null, null, '#' + tabSebelumnya);
        switchTab(tabSebelumnya, null, false);
    } else {
        switchTab(cleanHash, null, false);
    }
});

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
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
        history.replaceState(null, null, '#' + tabSebelumnya);
    }
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
        v.pause();
    });
    history.pushState({ popup: 'upload' }, null, '#upload');
    const m = document.getElementById('modal-upload');
    if (m.closeTimer) clearTimeout(m.closeTimer);
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function insertUploadShortcut(char) {
    const textarea = document.getElementById('input-video-caption');
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const text = textarea.value;
    textarea.value = text.substring(0, pos) + char + text.substring(pos);
    textarea.focus();
    textarea.setSelectionRange(pos + 1, pos + 1);
}

function handleVideoSelect(input) {
    const file = input.files[0];
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('video-preview-container');
    const previewVideo = document.getElementById('video-preview-element');
    const spinner = document.getElementById('mini-upload-spinner');
    if (file) {
    if (file.size > 15 * 1024 * 1024) {
        showToast("Ukuran video terlalu besar! Maksimal 15MB.", "error");
        input.value = '';
        return;
    }
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        if (placeholder) placeholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (spinner) spinner.classList.remove('hidden');
        previewVideo.oncanplay = () => {
            if (spinner) spinner.classList.add('hidden');
        };
        previewVideo.muted = true;
        previewVideo.play().catch(() => {});
        showToast("Video berhasil dimuat!", "success");
    }
}

function closeUploadModal() {
    if (window.location.hash === '#upload') history.back();
    const m = document.getElementById('modal-upload');
    m.classList.add('hidden'); 
    m.classList.remove('flex');
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('video-preview-container');
    const previewVideo = document.getElementById('video-preview-element');
    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewVideo) { 
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
cancelReply();
const widget = document.getElementById('floating-widget');
if (widget && !widget.classList.contains('opacity-0')) {
widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
}
openUserProfile(userId);
}

async function kirimPesanPribadi(userId) {
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

function salinIdTransaksi() {
    const idText = document.getElementById('detail-ref-id').innerText;
    const btnSalin = document.getElementById('btn-copy-ref');
    const icon = btnSalin.querySelector('i');
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

    icon.className = 'fas fa-check text-xs';
    btnSalin.classList.replace('text-brand-info', 'text-brand-success'); 
    btnSalin.classList.replace('bg-brand-info/10', 'bg-brand-success/10'); 
    btnSalin.classList.replace('border-brand-info/20', 'border-brand-success/20');
    showToast("ID Transaksi berhasil disalin!", "success");
    setTimeout(() => { 
        icon.className = 'fas fa-copy text-xs';
        btnSalin.classList.replace('text-brand-success', 'text-brand-info'); 
        btnSalin.classList.replace('bg-brand-success/10', 'bg-brand-info/10'); 
        btnSalin.classList.replace('border-brand-success/20', 'border-brand-info/20'); 
    }, 2000);
}

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
tombol.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Membuka Data...'; tombol.classList.add('opacity-70', 'scale-95');
setTimeout(() => {
const wadahTombol = document.getElementById('wadah-tombol-semua'); if (wadahTombol) wadahTombol.remove();
const sisaData = dataRipperGlobal.slice(5);
let htmlSisa = sisaData.map((r, index) => `<div class="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors smooth-reveal" style="animation-delay: ${index < 5 ? (index * 0.05) : 0}s; opacity: 0;"><div class="flex justify-between items-start mb-1"><div class="font-bold text-xs text-white">${r["Nama / Keterangan"] || r.nama || r.Nama || "Tanpa Nama"}</div><div class="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap ml-2"><i class="fas fa-ban mr-1"></i> RIPPER</div></div><div class="text-[10px] text-brand-info font-mono mb-1">ID: ${r["ID"] || r.id || "-"}</div><div class="text-[10px] text-gray-400"><i class="fas fa-credit-card mr-1"></i> ${r["Rekening / Kontak (WA/Dana)"] || r.rekening || r.Rekening || "-"}</div></div>`).join('');
document.getElementById('ripper-container').insertAdjacentHTML('beforeend', htmlSisa);
}, 150);
}

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

let storyStartY = 0;
let storyCurrentY = 0;
const storyModal = document.getElementById('story-viewer-modal');

storyModal.addEventListener('touchstart', (e) => {
if (e.touches.length > 1) return;
storyStartY = e.touches[0].clientY;
}, { passive: true });
storyModal.addEventListener('touchmove', (e) => {
if (storyStartY === 0) return;
storyCurrentY = e.touches[0].clientY;
const diffY = storyCurrentY - storyStartY;
if (diffY > 0) {
storyModal.style.transition = 'none';
storyModal.style.transform = `translateY(${diffY}px)`;
const opacity = Math.max(0.3, 0.95 - (diffY / window.innerHeight));
storyModal.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
}
}, { passive: true });
storyModal.addEventListener('touchend', (e) => {
if (storyStartY === 0 || storyCurrentY === 0) return;
const diffY = storyCurrentY - storyStartY;
if (diffY > 120) {
closeStoryViewer();
} else {
storyModal.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease';
storyModal.style.transform = 'translateY(0)';
storyModal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
}
storyStartY = 0;
storyCurrentY = 0;
});

function handleEnter(e) {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
const input = document.getElementById('chat-room-input');
if (input.value.trim() !== '') {
sendMessageRoom();
}
}
}

function handleTyping(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    sendTypingStatus();
    if (activeGroupId && currentRoomMembers.length > 0) {
        const cursorPosition = el.selectionStart;
        const textBeforeCursor = el.value.substring(0, cursorPosition);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');
        if (lastAtPos !== -1) {
            const isAtStartOrSpace = lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === ' ' || textBeforeCursor[lastAtPos - 1] === '\n';
            if (isAtStartOrSpace) {
                const searchText = textBeforeCursor.substring(lastAtPos + 1).toLowerCase();
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
        const newCursorPos = lastAtPos + nickname.length + 2;
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
    }
    tutupMentionPopup();
    handleTyping(el);
}

let lastTypingTime = 0;

function sendTypingStatus() {
const input = document.getElementById('chat-room-input');
const btnSend = document.getElementById('btn-send-room');
if (!input.disabled) {
if (input.value.trim() !== '') {
btnSend.innerHTML = '<i class="fas fa-paper-plane"></i>';
btnSend.onclick = sendMessageRoom;
} else {
btnSend.innerHTML = '<i class="fas fa-microphone"></i>';
btnSend.onclick = startRecordingVoice;
}
}
if(!messageSubscription || (!activeChatUserId && !activeGroupId)) return;
const now = Date.now();
if (now - lastTypingTime > 2000) {
messageSubscription.send({
type: 'broadcast',
event: 'typing',
payload: { userId: currentUser.id }
});
lastTypingTime = now;
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

const searchUsersForChat = debounce(async (query) => {
    if (!query.trim()) return loadChatList();
    const container = document.getElementById('chat-personal-container');
    container.innerHTML = '<div class="flex justify-center mt-6"><i class="fas fa-spinner fa-spin text-brand-accent text-xl"></i></div>';
    const { data } = await supabaseClient.from('profiles').select('id, nickname, avatar_url, bio, exp, is_seller, seller_expired_at, last_seen').ilike('nickname', `%${query}%`).limit(15);
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
}, 500);

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

function openChatRoom(id, name, avatar, isGroup = false) {
history.pushState({ popup: 'chatroom' }, null, '#chatroom');
document.getElementById('chat-list-view').classList.add('hidden');
document.getElementById('chat-list-view').classList.remove('flex');
document.getElementById('chat-room-view').classList.remove('hidden');
document.getElementById('chat-room-view').classList.add('flex');
document.getElementById('active-chat-name').innerHTML = `<div class="flex items-center gap-1">${name} <span id="header-badge-container"></span></div>`;
if (!isGroup) {
    supabaseClient.from('profiles').select('exp').eq('id', id).single().then(({data}) => {
        const targetLevel = hitungStatusLevel(data?.exp || 0).level;
        const vidCountHeader = allVideosData.filter(v => String(v.user_id) === String(id)).length;
        const badgeHTML = getBadgeByLevelAndVideos(targetLevel, vidCountHeader);
        const badgeContainer = document.getElementById('header-badge-container');
        if (badgeContainer) badgeContainer.innerHTML = badgeHTML;
    });
}
document.getElementById('active-chat-avatar').src = avatar;
if (isGroup) {
    activeGroupId = id;
    activeChatUserId = null;
    document.getElementById('active-chat-status').innerText = 'Grup Obrolan';
    document.getElementById('active-chat-online-dot').classList.add('hidden');
    supabaseClient.from('group_members').select('profiles(nickname, avatar_url)').eq('group_id', id)
    .then(({data}) => {
        if(data) currentRoomMembers = data.map(d => d.profiles).filter(Boolean);
    });
} else {
    activeChatUserId = id;
    activeGroupId = null;
    currentRoomMembers = [];
}
document.getElementById('chat-messages-container').innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';
loadRoomMessages();
setupChatRoomListener();
document.getElementById('chat-room-input').value = '';
sendTypingStatus();
updatePresenceUI();
}

function closeChatRoom(kembaliKeList = true) {
if (messageSubscription) {
supabaseClient.removeChannel(messageSubscription);
messageSubscription = null;
}

activeGroupId = null;
activeChatUserId = null;
const container = document.getElementById('chat-messages-container');
if (container) container.innerHTML = '';
if (kembaliKeList) {
const roomView = document.getElementById('chat-room-view');
roomView.classList.add('hidden');
roomView.classList.remove('flex');
const listView = document.getElementById('chat-list-view');
listView.classList.remove('hidden');
listView.classList.add('flex');
loadChatList();
}
}

function openChatHeaderInfo() {
    if (activeGroupId) {
        loadGroupInfo(activeGroupId);
    } else if (activeChatUserId) {
        const widget = document.getElementById('floating-widget');
        if (widget) widget.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8', 'scale-95');
        viewUserProfile(activeChatUserId);
    }
}

function scrollToBottomChat() {
const container = document.getElementById('chat-messages-container');
if (container) {
setTimeout(() => {
container.scrollTo({
top: container.scrollHeight,
behavior: 'smooth'
});
}, 50);
}
}

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

function renderRow(item, isGroup) {
    let lastMessageText = "Belum ada pesan";
    if (item.latestMsg && item.latestMsg.message) {
        lastMessageText = item.latestMsg.message;
        if (lastMessageText.startsWith('[FORWARDED]')) {
            lastMessageText = "⏩ " + lastMessageText.replace(/^\[FORWARDED\]\n?/, '');
        }
        const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const matchReply = lastMessageText.match(replyRegex);
        if (matchReply) {
            lastMessageText = matchReply[4];
        }
        const storyReplyRegex = /^\[STORY_REPLY:(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const matchStory = lastMessageText.match(storyReplyRegex);
        if (matchStory) {
            lastMessageText = "Membalas status: " + matchStory[3];
        }
        if (lastMessageText.startsWith('[IMG]')) lastMessageText = "📷 Foto";
        else if (lastMessageText.startsWith('[VIDEO]')) lastMessageText = "🎥 Video";
        else if (lastMessageText.startsWith('[AUDIO]')) lastMessageText = "🎙️ Pesan Suara";
        else if (lastMessageText.startsWith('[SISTEM]')) lastMessageText = "🔔 Pemberitahuan Sistem";
        else if (lastMessageText.startsWith('[AUTODATA]')) {
            let prodName = lastMessageText.replace('[AUTODATA]', '').split('|||')[0] || '';
            lastMessageText = "📦 Data Pesanan: " + prodName;
        }
    }

    let unreadBadge = item.unread > 0 
        ? `<span class="bg-brand-accent text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full ml-2 shrink-0 shadow-md">${item.unread > 99 ? '99+' : item.unread}</span>` 
        : '';
    let avatarUrl = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1133&color=fff`;
    let ringClass = item.hasStory && !isGroup ? 'story-ring' : '';
    let imgBorder = item.hasStory && !isGroup ? 'border-2 border-brand-card' : 'border border-white/10';
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
            globalGroupList.push({ type: 'group', id: g.id, name: g.name || "Grup Obrolan", avatar: g.avatar_url, latestMsg: msg, unread: 0 });
        });
    }
}

globalPersonalList.sort((a, b) => new Date(b.latestMsg?.created_at || 0) - new Date(a.latestMsg?.created_at || 0));
globalGroupList.sort((a, b) => new Date(b.latestMsg?.created_at || 0) - new Date(a.latestMsg?.created_at || 0));
cPersonal.innerHTML = globalPersonalList.length ? globalPersonalList.map(i => renderRow(i, false)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada obrolan.</p>';
cGroup.innerHTML = globalGroupList.length ? globalGroupList.map(i => renderRow(i, true)).join('') : '<p class="text-center text-xs text-gray-500 mt-10">Belum ada grup.</p>';
checkGlobalUnreadMessages();
} catch (e) {
console.error("Crash loadChatList:", e);
cPersonal.innerHTML = '<div class="p-6 text-center text-xs text-red-500">Gagal memuat pesan.</div>';
}
}

let currentActiveStories = [];
let currentStoryTimer;

async function loadStories() {
const container = document.getElementById('status-list-container');
if (!currentUser) return;
const myAvatar = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.nickname || 'Me'}`;
document.getElementById('my-story-avatar').src = myAvatar;
try {
const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data: stories } = await supabaseClient
.from('stories')
.select('*, profiles(nickname, avatar_url)')
.gte('created_at', past24h)
.order('created_at', { ascending: false });
const myStoryRing = document.getElementById('my-story-ring');
const myStatusText = document.getElementById('my-status-text');
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
if (groupedStories[currentUser.id]) {
const myLatestTime = timeAgo(groupedStories[currentUser.id].stories[0].created_at);
if (myStoryRing) {
myStoryRing.classList.add('story-ring');
myStoryRing.classList.remove('border', 'border-white/10');
}
if (myStatusText) {
myStatusText.innerText = myLatestTime;
myStatusText.className = "text-[10px] text-brand-info font-bold";
}
window.viewMyStory = () => viewStory(
currentUser.id,
userProfile?.nickname || 'Me',
myAvatar
);
}
let html = '';
for (const uid in groupedStories) {
if (uid === currentUser.id) continue;
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
const progressContainer = document.getElementById('story-progress-container');
progressContainer.innerHTML = stories.map((_, i) => `
<div class="h-1 bg-white/30 rounded-full overflow-hidden flex-1">
<div id="story-progress-${i}" class="h-full bg-white w-0"></div>
</div>
`).join('');
history.pushState({ popup: 'story' }, null, '#story');
const modal = document.getElementById('story-viewer-modal');
modal.classList.remove('hidden');
modal.classList.add('flex');
modal.style.transform = 'translateY(0)';
modal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
setTimeout(() => modal.classList.remove('opacity-0'), 10);
playStory(0);
}

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
imgEl.classList.add('hidden');
vidEl.classList.add('hidden');
vidEl.pause();
vidEl.src = '';
vidEl.onended = null;
vidEl.onloadedmetadata = null;
if (story.media_type === 'video') {
vidEl.src = story.media_url;
vidEl.classList.remove('hidden');
vidEl.muted = false;
vidEl.play().catch(() => {});
if (volBtn) {
volBtn.classList.remove('hidden');
volBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
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
btnDelete.classList.remove('hidden');
} else {
btnDelete.classList.add('hidden');
}
}

for (let i = 0; i < currentActiveStories.length; i++) {
const bar = document.getElementById(`story-progress-${i}`);
if (!bar) continue;
bar.style.transition = 'none';
if (i < index) {
bar.style.width = '100%';
} else if (i > index) {
bar.style.width = '0%';
} else {
bar.style.width = '0%';
}
}
clearTimeout(currentStoryTimer);
if (story.media_type === 'video') {
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
vidEl.onended = () => {
nextStory();
};
} else {
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

const replyContainer = document.getElementById('story-reply-container');
const replyInput = document.getElementById('story-reply-input');
const statsContainer = document.getElementById('story-owner-stats');
if (typeof fetchStoryStats === 'function') fetchStoryStats(story.id);
if (currentUser && story.user_id === currentUser.id) {
    if (replyContainer) replyContainer.classList.add('hidden');
    if (statsContainer) {
        statsContainer.classList.remove('hidden');
        statsContainer.classList.add('flex');
    }
} else {
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
if (typeof recordStoryView === 'function') recordStoryView(story.id);
}
}

function toggleStoryVolume() {
const vidEl = document.getElementById('viewer-story-vid');
const volBtn = document.getElementById('btn-story-volume');
if (vidEl && volBtn) {
vidEl.muted = !vidEl.muted;
isGlobalMuted = vidEl.muted;
volBtn.innerHTML = vidEl.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
showToast(vidEl.muted ? "Suara Status Dimatikan" : "Suara Status Dinyalakan", vidEl.muted ? "info" : "success");
}
}

function closeStoryViewer(dariTombolBack = false) {
    clearTimeout(currentStoryTimer);
    const vidEl = document.getElementById('viewer-story-vid');
    if (vidEl) {
        vidEl.pause();
        vidEl.src = '';
    }
    const modal = document.getElementById('story-viewer-modal');
    modal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    modal.classList.add('opacity-0');
    modal.style.transform = 'translateY(50px)'; 
    const statsModal = document.getElementById('modal-story-stats');
    if (statsModal && !statsModal.classList.contains('translate-y-full')) {
        statsModal.classList.add('translate-y-full');
    }
    if (!dariTombolBack && window.location.hash === '#story') {
        history.back();
    }
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        modal.style.transform = 'translateY(0)';
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
            const { error } = await supabaseClient.from('stories').delete().eq('id', story.id);
            if (error) throw error;
            if (story.media_url) {
                await fetch('/api/storage?action=delete&type=file', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrl: story.media_url })
                }).catch(e => console.log("Ignore S3 error:", e));
            }
            showToast("Status berhasil dihapus sepenuhnya", "success");
            closeStoryViewer();
            loadStories();
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

async function prosesUploadVideo() {
    if (!currentUser) return openAuthModal();
    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    const file = fileInput.files[0];
    const allowCommentsToggle = document.getElementById('upload-allow-comments');
    const allowComments = allowCommentsToggle ? allowCommentsToggle.checked : true;
    const teksCaption = captionInput.value || ""; 
    if (!file) return showToast("Pilih video dulu!", "error");
    const btn = document.querySelector('button[onclick="prosesUploadVideo()"]');
    btn.disabled = true; 
    isUploading = true;
    closeUploadModal();
    switchTab('profile');
    viewedUserId = currentUser.id;
    checkSession();
    showToast("Mengunggah video di latar belakang...", "info");
    try {
        const configRes = await fetch('/api/content?action=config');
        const config = await configRes.json();
        if (!config.gasUrl) throw new Error("Link GAS tidak ditemukan di config");
        const namaFolder = `${currentUser.id}/feed_video`;
        const namaFileUnik = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const pathLengkap = `${namaFolder}/${namaFileUnik}`;
        const { data: { session } } = await supabaseClient.auth.getSession();
const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
});
        const dataUrl = await resUrl.json();
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
            caption: teksCaption,
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
        showToast("Video berhasil diposting!", "success");
        tambahExp(50);
        allVideosData = [];
        if (document.getElementById('profile').classList.contains('active')) {
            renderProfileVideos(currentUser.id);
        }
    } catch (err) {
        showToast("Upload gagal: " + err.message, "error");
    } finally {
        btn.disabled = false;
        isUploading = false;
    }
}

let mediaPreviewFile = null;
let mediaPreviewContext = '';

async function handleChatMediaSelect(event) {
    const file = event.target.files[0];
    if (!file || (!activeChatUserId && !activeGroupId)) return;
    if (activeGroupId) {
        const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', activeGroupId).eq('user_id', currentUser.id).single();
        if (!checkMember) {
            await customAlert("Anda tidak dapat mengirim foto karena telah dikeluarkan dari grup ini.");
            event.target.value = ''; closeChatRoom(); return;
        }
    }
    bukaPreviewMedia(file, 'chat');
    event.target.value = '';
}

function handleUploadStory(event) {
    const file = event.target.files[0];
    if (!file) return;
    bukaPreviewMedia(file, 'story');
    event.target.value = '';
}

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
    if (file.type.startsWith('video/')) {
        imgEl.classList.add('hidden');
        vidEl.src = url;
        vidEl.classList.remove('hidden');
        vidEl.muted = false; 
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
    const floatingWidget = document.getElementById('floating-widget');
    if (floatingWidget) floatingWidget.style.opacity = '0'; 
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'translate-y-full');
    }, 10);
}

function tutupPreviewMedia(dariTombolBack = false) {
    const modal = document.getElementById('modal-preview-media');
    modal.classList.add('opacity-0', 'translate-y-full');
    if(window.location.hash.startsWith('#inbox') || window.location.hash.startsWith('#chatroom')) {
        const floatingWidget = document.getElementById('floating-widget');
        if (floatingWidget) floatingWidget.style.opacity = ''; 
    }
    if (!dariTombolBack && window.location.hash === '#mediapreview') history.back();
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const vidEl = document.getElementById('preview-media-vid');
        const imgEl = document.getElementById('preview-media-img');
        if (vidEl.src.startsWith('blob:')) URL.revokeObjectURL(vidEl.src);
        if (imgEl.src.startsWith('blob:')) URL.revokeObjectURL(imgEl.src);
        vidEl.pause();
        vidEl.src = '';
        imgEl.src = '';
        mediaPreviewFile = null;
    }, 300);
}

async function prosesKirimMedia() {
    if (!mediaPreviewFile) return;
    const file = mediaPreviewFile;
    const context = mediaPreviewContext;
    const caption = document.getElementById('preview-media-caption').value.trim();
    const btnSend = document.getElementById('btn-send-media');
    const isGroup = !!activeGroupId;
    const targetId = isGroup ? activeGroupId : activeChatUserId;
    const currentReplyId = replyingToMsgId;
    const currentReplyName = replyingToMsgName;
    const currentReplyText = replyingToMsgText;
    btnSend.disabled = true;
    cancelChatReply();
    tutupPreviewMedia();
    showToast("Mengirim media...", "info");
    try {
        const namaFolder = context === 'chat' ? `${currentUser.id}/chat_media` : `${currentUser.id}/story_media`;
        const pathLengkap = `${namaFolder}/media_${Date.now()}`;
        const { data: { session } } = await supabaseClient.auth.getSession();
const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
});
        const dataUrl = await resUrl.json();
        await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
        const fileUrl = dataUrl.finalVideoUrl;
        if (context === 'chat') {
            let msgText = file.type.startsWith('video/') ? `[VIDEO]${fileUrl}` : `[IMG]${fileUrl}`;
            if (caption) msgText += `||CAP||${caption}`;
            if (currentReplyId) {
                const safeName = currentReplyName.replace(/\|\|/g, "").replace(/\]/g, "");
                const safeText = currentReplyText.replace(/\|\|/g, "").replace(/\]/g, "");
                msgText = `[REPLY:${currentReplyId}||${safeName}||${safeText}]\n${msgText}`;
            }
            const insertData = { sender_id: currentUser.id, message: msgText };
            if (isGroup) insertData.group_id = targetId; else insertData.receiver_id = targetId;
            await supabaseClient.from('messages').insert(insertData);
        } else if (context === 'story') {
            const { error } = await supabaseClient.from('stories').insert({
                user_id: currentUser.id,
                media_url: fileUrl,
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                caption: caption
            });
            if (error) throw error;
            showToast("Status berhasil diperbarui!", "success");
            tambahExp(20); 
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

function pauseStoryForReply() {
    const navOverlay = document.getElementById('story-nav-overlay');
    if (navOverlay) navOverlay.style.pointerEvents = 'none';
    const activeBar = document.getElementById(`story-progress-${currentActiveStories.currentIndex}`);
    if (activeBar) {
        const computedWidth = window.getComputedStyle(activeBar).width;
        activeBar.style.transition = 'none';
        activeBar.style.width = computedWidth;
    }
    const vidEl = document.getElementById('viewer-story-vid');
    if (vidEl && !vidEl.classList.contains('hidden')) {
        vidEl.pause();
    } else {
        clearTimeout(currentStoryTimer);
    }
}

function resumeStoryAfterReply() {
    const navOverlay = document.getElementById('story-nav-overlay');
    if (navOverlay) navOverlay.style.pointerEvents = 'auto';
    const activeBar = document.getElementById(`story-progress-${currentActiveStories.currentIndex}`);
    const vidEl = document.getElementById('viewer-story-vid');
    if (vidEl && !vidEl.classList.contains('hidden')) {
        vidEl.play();
        if (activeBar) {
            const sisaWaktu = vidEl.duration - vidEl.currentTime;
            activeBar.style.transition = `width ${sisaWaktu}s linear`;
            activeBar.style.width = '100%';
        }
    } else {
        if (activeBar) {
            activeBar.style.transition = `width 3s linear`;
            activeBar.style.width = '100%';
        }
        currentStoryTimer = setTimeout(() => { nextStory(); }, 3000);
    }
}

function handleStoryReplyEnter(e) {
if (e.key === 'Enter') {
e.preventDefault();
sendStoryReply();
}
}

async function sendStoryReply() {
if (!currentUser) return showToast("Silakan login untuk membalas!", "error");
const input = document.getElementById('story-reply-input');
const message = input.value.trim();
if (!message) return;
const story = currentActiveStories[currentActiveStories.currentIndex];
const targetId = story.user_id;
if (targetId === currentUser.id) return;
input.value = '';
showToast("Mengirim balasan...", "info");
try {
const storyTipe = story.media_type === 'video' ? 'Video' : 'Foto';
let storyCaption = story.caption || "Pembaruan Status";
if (storyCaption.length > 30) storyCaption = storyCaption.substring(0, 30) + '...';
const finalMessage = `[STORY_REPLY:${storyTipe}||${storyCaption}]\n${message}`;
const { error } = await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
receiver_id: targetId,
message: finalMessage
});
if (error) throw error;
showToast("Balasan terkirim!", "success");
input.blur();
resumeStoryAfterReply();
} catch (e) {
showToast("Gagal mengirim balasan.", "error");
}
}

async function likeStoryAktif(btn) {
if (!currentUser) return showToast("Silakan login untuk menyukai!", "error");
const icon = btn.querySelector('i');
const story = currentActiveStories[currentActiveStories.currentIndex];
btn.style.pointerEvents = 'none';
try {
if (icon.classList.contains('far')) {
icon.classList.replace('far', 'fas');
icon.classList.add('text-brand-accent', 'animate-ping');
setTimeout(() => icon.classList.remove('animate-ping'), 500);
const { error } = await supabaseClient.from('story_likes').insert({
story_id: story.id,
user_id: currentUser.id
});
if (error) {
if (error.code !== '23505') throw error;
}
localStorage.setItem('story_liked_' + story.id, 'true');
const nama = document.getElementById('viewer-story-name').innerText;
showToast(`Anda menyukai status ${nama}`, "success");
} else {
icon.classList.replace('fas', 'far');
icon.classList.remove('text-brand-accent');
const { error } = await supabaseClient.from('story_likes')
.delete()
.eq('story_id', story.id)
.eq('user_id', currentUser.id);
if (error) throw error;
localStorage.removeItem('story_liked_' + story.id);
}
} catch (e) {
console.error("Gagal memproses like:", e);
showToast("Terjadi kesalahan saat menyukai.", "error");
if (icon.classList.contains('fas')) {
icon.classList.replace('fas', 'far');
icon.classList.remove('text-brand-accent');
} else {
icon.classList.replace('far', 'fas');
icon.classList.add('text-brand-accent');
}
} finally {
btn.style.pointerEvents = 'auto';
}
}

function openCreateGroupModal() {
    history.pushState({ popup: 'create_group' }, null, '#creategroup');
    document.getElementById('modal-create-group').classList.remove('hidden');
    document.getElementById('modal-create-group').classList.add('flex');
}

function closeCreateGroupModal(dariTombolBack = false) {
    document.getElementById('modal-create-group').classList.add('hidden');
    document.getElementById('modal-create-group').classList.remove('flex');
    if (!dariTombolBack && window.location.hash === '#creategroup') {
        history.back();
    }
}

function previewGroupAvatar(input, imgId) {
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { document.getElementById(imgId).src = e.target.result; }
reader.readAsDataURL(input.files[0]);
}
}

async function prosesCreateGroup() {
if (!currentUser) return showToast("Silakan login dulu!", "error");
const nameInput = document.getElementById('create-group-name').value.trim();
const descInput = document.getElementById('create-group-desc').value.trim();
const fileInput = document.getElementById('create-group-avatar');
const btn = document.getElementById('btn-submit-group');
if (!nameInput) return showToast("Nama grup wajib diisi!", "error");
btn.disabled = true;
const originalText = btn.innerHTML;
btn.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Membuat...';
try {
let finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput)}&background=1A1133&color=fff`;
if (fileInput.files && fileInput.files[0]) {
const file = fileInput.files[0];
showToast("Mengunggah foto grup...", "info");
const { data: { session } } = await supabaseClient.auth.getSession();
const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent('group_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
});
const dataUrl = await resUrl.json();
await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: file,
headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' }
});
finalAvatarUrl = dataUrl.finalVideoUrl;
}
const { data: groupData, error: groupErr } = await supabaseClient
.from('groups')
.insert({ name: nameInput, description: descInput, avatar_url: finalAvatarUrl, created_by: currentUser.id })
.select().single();
if (groupErr) throw groupErr;
const { error: memberErr } = await supabaseClient
.from('group_members')
.insert({ group_id: groupData.id, user_id: currentUser.id, role: 'admin' });
if (memberErr) throw memberErr;
showToast("Grup berhasil dibuat!", "success");
closeCreateGroupModal();
document.getElementById('create-group-name').value = '';
document.getElementById('create-group-desc').value = '';
fileInput.value = '';
document.getElementById('create-group-preview').src = 'https://ui-avatars.com/api/?name=Grup&background=1A1133&color=fff';
loadChatList();
} catch (err) {
showToast("Gagal buat grup: " + err.message, "error");
} finally {
btn.disabled = false;
btn.innerHTML = originalText;
}
}

function closeGroupInfoModal(dariTombolBack = false) {
    document.getElementById('modal-group-info').classList.add('hidden');
    document.getElementById('modal-group-info').classList.remove('flex');
    if (!dariTombolBack && window.location.hash === '#groupinfo') {
        history.back();
    }
}

async function loadGroupInfo(groupId) {
    history.pushState({ popup: 'group_info' }, null, '#groupinfo');
    document.getElementById('modal-group-info').classList.remove('hidden');
    document.getElementById('modal-group-info').classList.add('flex');
    const { data: group } = await supabaseClient.from('groups').select('*').eq('id', groupId).single();
    if(!group) return;
document.getElementById('info-group-avatar').src = group.avatar_url;
document.getElementById('info-group-name').innerText = group.name;
document.getElementById('info-group-desc').innerText = group.description || "Tidak ada deskripsi";
const { data: members } = await supabaseClient.from('group_members').select('role, user_id').eq('group_id', groupId);
const myData = members.find(m => m.user_id === currentUser.id);
activeGroupRole = myData ? myData.role : 'member';
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

let adminButtons = '';
if (activeGroupRole === 'admin' && p.id !== currentUser.id) {
adminButtons = `
<div class="flex gap-2 ml-2">
<button onclick="toggleAdminStatus('${p.id}', '${m.role}', '${escapeHTML(p.nickname).replace(/&#39;/g, "\\'")}')"
class="w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isAdmin ? 'bg-orange-500/20 text-orange-500' : 'bg-brand-info/20 text-brand-info'}"
title="${isAdmin ? 'Turunkan dari Admin' : 'Jadikan Admin'}">
<i class="fas ${isAdmin ? 'fa-user-minus' : 'fa-user-shield'} text-xs"></i>
</button>
<button onclick="kickMember('${p.id}', '${escapeHTML(p.nickname).replace(/&#39;/g, "\\'")}')"
class="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
title="Keluarkan Anggota">
<i class="fas fa-user-times text-xs"></i>
</button>
</div>`;
}
html += `
<div class="flex items-center justify-between p-2 bg-black/30 rounded-xl border border-white/5 mb-2">
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

async function saveGroupInfo() {
    const name = document.getElementById('input-edit-group-name').value.trim();
    const desc = document.getElementById('input-edit-group-desc').value.trim();
    if(!name) return showToast("Nama grup tidak boleh kosong!", "error");
    const btn = document.getElementById('btn-save-group-info');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    try {
        const { error } = await supabaseClient.from('groups').update({ name: name, description: desc }).eq('id', activeGroupId);
        if(error) throw error;
        showToast("Info grup diperbarui!", "success");
        toggleEditGroupInfo();
        loadGroupInfo(activeGroupId);
    } catch (err) {
        showToast("Gagal update: " + err.message, "error");
    } finally {
        btn.innerHTML = 'Simpan Perubahan';
        btn.disabled = false;
    }
}

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
await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
group_id: activeGroupId,
message: `[SISTEM] ${nick} telah ditambahkan ke dalam grup oleh Admin.`
});
showToast(nick + " berhasil ditambahkan!", "success");
document.getElementById('invite-user-nickname').value = '';
loadGroupInfo(activeGroupId);
} catch (err) {
showToast(err.message, "error");
} finally {
btn.innerHTML = 'Undang';
}
}

async function keluarDariGrup() {
const yakin = confirm("Yakin ingin keluar dari grup ini?");
if(!yakin) return;
await supabaseClient.from('group_members').delete().eq('group_id', activeGroupId).eq('user_id', currentUser.id);
showToast("Berhasil keluar dari grup", "success");
closeGroupInfoModal();
closeChatRoom();
}

async function toggleAdminStatus(userId, currentRole, nickname) {
if (activeGroupRole !== 'admin') return showToast("Hanya admin yang diizinkan melakukan ini!", "error");
const nextRole = (currentRole === 'admin') ? 'member' : 'admin';
const confirmMsg = (currentRole === 'admin')
? `Yakin ingin mencopot jabatan Admin dari ${nickname}?`
: `Jadikan ${nickname} sebagai Admin grup?`;
if (!await customConfirm(confirmMsg)) return;
try {
showToast("Memproses status...", "info");
const { error } = await supabaseClient
.from('group_members')
.update({ role: nextRole })
.eq('group_id', activeGroupId)
.eq('user_id', userId);
if (error) throw error;
showToast(`Status ${nickname} berhasil diperbarui!`, "success");
setTimeout(() => {
loadGroupInfo(activeGroupId);
}, 300);
} catch (err) {
showToast("Gagal memperbarui status: " + err.message, "error");
}
}

async function kickMember(userId, nickname) {
if (activeGroupRole !== 'admin') return showToast("Hanya admin yang diizinkan mengeluarkan anggota!", "error");
if (!await customConfirm(`Yakin ingin mengeluarkan ${nickname} dari grup ini?`)) return;
try {
showToast("Sedang mengeluarkan...", "info");
const { error } = await supabaseClient
.from('group_members')
.delete()
.eq('group_id', activeGroupId)
.eq('user_id', userId);
if (error) throw error;
await supabaseClient.from('messages').insert({
sender_id: currentUser.id,
group_id: activeGroupId,
message: `[SISTEM] ${nickname} telah dikeluarkan dari grup oleh Admin.`
});
showToast(nickname + " telah dikeluarkan", "success");
setTimeout(() => {
loadGroupInfo(activeGroupId);
}, 300);
} catch (err) {
showToast("Gagal mengeluarkan: " + err.message, "error");
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

function showMsgOptions(msgId, senderId) {
    selectedMessageId = msgId;
    const modal = document.getElementById('modal-msg-option');
    const btnDelAll = document.getElementById('btn-del-msg-all');
    history.pushState({ popup: 'msg_option' }, null, '#opsipesan');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (senderId !== currentUser.id) {
        btnDelAll.style.display = 'none';
    } else {
        btnDelAll.style.display = 'block';
    }
}

function closeMsgOptions(dariTombolBack = false) {
    const modal = document.getElementById('modal-msg-option');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (!dariTombolBack && window.location.hash === '#opsipesan') {
        history.back();
    }
}

function deleteMsgForMe() {
if (!selectedMessageId) return;
let deletedForMe = JSON.parse(localStorage.getItem('deleted_msgs') || '[]');
if (!deletedForMe.includes(selectedMessageId)) {
deletedForMe.push(selectedMessageId);
localStorage.setItem('deleted_msgs', JSON.stringify(deletedForMe));
}
closeMsgOptions();
loadRoomMessages();
showToast("Pesan dihapus untuk Anda", "success");
}

async function deleteMsgForAll() {
if (!selectedMessageId) return;
try {
const { error } = await supabaseClient.from('messages').update({ message: '[DELETED]' }).eq('id', selectedMessageId);
if (error) throw error;
closeMsgOptions();
loadRoomMessages();
showToast("Pesan berhasil ditarik", "success");
} catch (err) {
showToast("Gagal menarik pesan", "error");
}
}

let mediaRecorder;
let audioChunks = [];

async function startRecordingVoice() {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
mediaRecorder = new MediaRecorder(stream);
audioChunks = [];
mediaRecorder.ondataavailable = e => {
if (e.data.size > 0) audioChunks.push(e.data);
};
mediaRecorder.onstop = async () => {
mediaRecorder.stream.getTracks().forEach(track => track.stop());
const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
await uploadAndSendVoice(audioBlob);
};
mediaRecorder.start();
const input = document.getElementById('chat-room-input');
input.placeholder = "Merekam suara... (Klik stop)";
input.disabled = true;
const btnSend = document.getElementById('btn-send-room');
btnSend.innerHTML = '<i class="fas fa-stop text-white"></i>';
btnSend.classList.add('bg-red-500', 'animate-pulse');
btnSend.classList.remove('bg-brand-accent');
btnSend.onclick = stopRecordingVoice;
} catch (err) {
showToast("Error Mic: " + err.name + " - " + err.message, "error");
console.error("Detail Error Mic:", err);
}
}

function stopRecordingVoice() {
if (mediaRecorder && mediaRecorder.state !== 'inactive') {
mediaRecorder.stop();
}
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
if (isGroup) {
const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', targetId).eq('user_id', currentUser.id).single();
if (!checkMember) {
await customAlert("Anda tidak dapat mengirim Voice Note karena telah dikeluarkan dari grup ini.");
closeChatRoom(); return;
}
}
const currentReplyId = replyingToMsgId;
const currentReplyName = replyingToMsgName;
const currentReplyText = replyingToMsgText;
cancelChatReply();
const tempId = 'temp-vn-' + Date.now();
const tempMsg = { id: tempId, sender_id: currentUser.id, message: "🎙️ Mengirim pesan suara...", created_at: new Date().toISOString() };
appendMessageBubble(tempMsg);
scrollToBottomChat();
try {
const reader = new FileReader();
reader.readAsDataURL(blob);
reader.onloadend = async () => {
try {
const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent('voice_'+Date.now()+'.webm')}&filetype=${encodeURIComponent('audio/webm')}`);
const dataUrl = await resUrl.json();
await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: blob,
headers: { 'Content-Type': 'audio/webm', 'x-amz-acl': 'public-read' }
});
let msgText = `[AUDIO]${dataUrl.finalVideoUrl}`;
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

let replyingToMsgId = null;
let replyingToMsgText = "";
let replyingToMsgName = "";
document.getElementById('btn-reply-msg').addEventListener('click', () => {
if (!selectedMessageId) return;
let name = document.getElementById('active-chat-name').innerText;
const msgBubble = document.getElementById(`msg-chat-${selectedMessageId}`);
let text = "Membalas pesan...";
if (msgBubble) {
const groupSenderEl = msgBubble.querySelector('.text-\\[\\#00F0FF\\]');
if (groupSenderEl) {
name = groupSenderEl.innerText;
}
const textDiv = msgBubble.querySelector('.text-\\[12px\\]');
if (textDiv) {
if (textDiv.innerHTML.includes('<audio')) {
text = "🎙️ Pesan Suara";
} else if (textDiv.innerHTML.includes('<img')) {
text = "📷 Foto/Gambar";
} else {
let cleanText = textDiv.innerText;
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

function jumpToMessage(msgId) {
const targetEl = document.getElementById(`msg-chat-${msgId}`);
if (targetEl) {
targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
const innerBubble = targetEl.querySelector('.rounded-2xl');
if (innerBubble) {
innerBubble.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
innerBubble.classList.add(
'ring-[3px]', 'ring-brand-accent',
'scale-[1.04]',
'shadow-[0_0_30px_rgba(255,0,122,0.6),_0_0_45px_rgba(138,43,226,0.4)]'
);
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

function setupChatRoomListener() {
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
    }
    const targetId = activeGroupId ? activeGroupId : activeChatUserId;
    if (!targetId) return;
    const roomName = activeGroupId
        ? `room_group_${targetId}`
        : `room_personal_${[currentUser.id, targetId].sort().join('_')}`;
    messageSubscription = supabaseClient.channel(roomName)
        .on('broadcast', { event: 'typing' }, payload => {
            if (payload.payload.userId !== currentUser.id) {
                showTypingIndicator();
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
            const msg = payload.new;
            const isGroup = !!activeGroupId;
            const validRoom = isGroup
                ? msg.group_id === activeGroupId
                : ((msg.sender_id === activeChatUserId && msg.receiver_id === currentUser.id) ||
                (msg.sender_id === currentUser.id && msg.receiver_id === activeChatUserId));
            if (validRoom) {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.classList.add('hidden');
                if (msg.sender_id !== currentUser.id) {
const myNickname = userProfile?.nickname;
if (isGroup && myNickname && msg.message) {
    const regexMention = new RegExp(`@${myNickname}(?![a-zA-Z0-9_])`, 'i');
    if (regexMention.test(msg.message)) {
        showToast("🔔 Ada yang men-tag Anda!", "success");
    }
}
                    if (isGroup) {
                        const { data: p } = await supabaseClient.from('profiles').select('nickname, avatar_url').eq('id', msg.sender_id).single();
                        msg.profiles = p;
                    }
                    appendMessageBubble(msg);
                    scrollToBottomChat();
                    if (!isGroup) {
                        supabaseClient.from('messages').update({ is_read: true }).eq('id', msg.id).then();
                    }
                } else {
                    const tempBubble = document.querySelector('[id^="msg-chat-temp-"]');
                    if (tempBubble) {
                        tempBubble.remove();
                    }
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

clearTimeout(typingTimer);
typingTimer = setTimeout(() => {
indicator.classList.add('hidden');
}, 2000);
}
}

function switchChatTab(tab) {
document.getElementById('chat-personal-container').classList.add('hidden');
document.getElementById('chat-group-container').classList.add('hidden');
document.getElementById('chat-status-container').classList.add('hidden');
document.getElementById('tab-personal').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';
document.getElementById('tab-group').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';
document.getElementById('tab-status').className = 'flex-1 py-3 text-[11px] font-bold text-gray-500 border-b-2 border-transparent transition-colors';
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
loadStories();
}
}

function appendMessageBubble(msg) {
    const container = document.getElementById('chat-messages-container');
    const isMe = msg.sender_id === currentUser.id;
    const date = new Date(msg.created_at);
    const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    let bubbleColor = isMe ? 'bg-gradient-to-br from-brand-accent to-[#d61a7f] text-white rounded-br-none shadow-[0_4px_12px_rgba(255,0,122,0.25)]' : 'bg-white/10 text-white border border-white/10 rounded-bl-none backdrop-blur-sm shadow-sm';
    let align = isMe ? 'justify-end' : 'justify-start';
    let rawMessage = msg.message || '';
    let replyHtml = '';
    let forwardedHtml = '';
    if (rawMessage.startsWith('[FORWARDED]')) {
        rawMessage = rawMessage.replace(/^\[FORWARDED\]\n?/, '');
        forwardedHtml = `<div class="text-[9px] text-white/70 italic mb-1 font-medium flex items-center gap-1.5"><i class="fas fa-share text-[8px]"></i> Diteruskan</div>`;
    }
    const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
    const match = rawMessage.match(replyRegex);
    if (match) {
        const replyId = escapeHTML(match[1]);
        const replyName = escapeHTML(match[2]);
        const replyText = escapeHTML(match[3]);
        rawMessage = match[4];
        replyHtml = `
        <div onclick="jumpToMessage('${replyId}')" class="bg-black/30 border-l-[3px] border-brand-info p-2 mb-1.5 rounded-md cursor-pointer hover:bg-black/50 transition-colors active:scale-95">
        <div class="text-[10px] font-bold text-brand-info mb-0.5">${replyName}</div>
        <div class="text-[10px] text-gray-300 truncate max-w-[200px] line-clamp-1">${replyText}</div>
        </div>`;
    }
    const storyReplyRegex = /^\[STORY_REPLY:(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
    const matchStory = rawMessage.match(storyReplyRegex);
    if (matchStory) {
        const mediaType = escapeHTML(matchStory[1]);
        const storyText = escapeHTML(matchStory[2]);
        rawMessage = matchStory[3];
        replyHtml = `
        <div class="bg-black/30 border-l-[3px] border-brand-accent p-2 mb-1.5 rounded-md cursor-default">
            <div class="text-[10px] font-bold text-brand-accent mb-0.5"><i class="fas fa-history mr-1"></i> Membalas Status ${mediaType}</div>
            <div class="text-[10px] text-gray-300 truncate max-w-[200px] line-clamp-1 italic">"${storyText}"</div>
        </div>`;
    }

    let contentHtml = '';
    if (rawMessage.startsWith('[IMG]')) {
        let urlPart = rawMessage.replace('[IMG]', '');
        let cap = '';
        if (urlPart.includes('||CAP||')) {
            const parts = urlPart.split('||CAP||');
            urlPart = parts[0]; cap = parts[1];
        }
        let amanUrl = escapeHTML(urlPart.trim());
        contentHtml = `<img src="${amanUrl}" class="max-w-[200px] rounded-lg cursor-pointer mt-1 shadow-sm" onclick="openLightbox('${amanUrl}')">`;
        if (cap) contentHtml += `<div class="mt-1.5 text-white/95 text-[11.5px]">${formatCaption(cap)}</div>`;
    } else if (rawMessage.startsWith('[VIDEO]')) {
        let urlPart = rawMessage.replace('[VIDEO]', '');
        let cap = '';
        if (urlPart.includes('||CAP||')) {
            const parts = urlPart.split('||CAP||');
            urlPart = parts[0]; cap = parts[1];
        }
        let amanUrl = escapeHTML(urlPart.trim());
        contentHtml = `<video src="${amanUrl}" class="max-w-[200px] rounded-lg mt-1 shadow-sm" controls playsinline></video>`;
        if (cap) contentHtml += `<div class="mt-1.5 text-white/95 text-[11.5px]">${formatCaption(cap)}</div>`;
    } else if (rawMessage.startsWith('[AUDIO]')) {
        let urlPart = rawMessage.replace('[AUDIO]', '');
        let amanUrl = escapeHTML(urlPart.trim());
        contentHtml = `<audio controls class="w-[200px] mt-1 h-8"><source src="${amanUrl}" type="audio/webm"></audio>`;
    } else if (rawMessage.startsWith('[SISTEM]')) {
        let isiSistem = rawMessage.replace(/^\[SISTEM\]\s*/i, '');
        let teksRapi = escapeHTML(isiSistem).replace(/\*(.*?)\*/g, '<b class="text-white">$1</b>');
        let htmlIsiSistem = teksRapi.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline font-bold hover:text-white transition-colors">$1</a>'
        );
        const safeCopySysText = encodeURIComponent(isiSistem).replace(/'/g, "%27");
        contentHtml = `
        <div class="bg-black/40 border border-brand-info/30 rounded-xl p-3 mt-1 mb-1 min-w-[200px] max-w-[240px] text-left shadow-inner flex flex-col gap-1.5 relative cursor-default" onclick="event.stopPropagation()">
            <div class="flex items-center gap-2 border-b border-white/10 pb-2">
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-6 h-6 object-contain splash-logo-anim drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="text-[8px] text-brand-info font-bold uppercase tracking-wider">AU2HUB SYSTEM</div>
                    <div class="text-[11px] font-bold text-white truncate w-full leading-tight">Pemberitahuan</div>
                </div>
            </div>
            <pre class="text-[10px] text-gray-200 font-sans whitespace-pre-wrap break-all max-h-40 overflow-y-auto hide-scroll leading-relaxed mt-1">${htmlIsiSistem}</pre>
            <button type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${safeCopySysText}')); this.innerHTML='<i class=\\'fas fa-check\\'></i> Tersalin!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy mr-1\\'></i> Salin Pesan', 2000);" class="mt-1 w-full bg-brand-info/10 text-brand-info hover:bg-brand-info hover:text-brand-dark border border-brand-info/30 py-2 rounded-lg text-[10px] font-bold active:scale-95 transition-all shadow-sm">
                <i class="fas fa-copy mr-1"></i> Salin Pesan
            </button>
        </div>`;
    } else {
        contentHtml = formatCaption(rawMessage);
    }
    contentHtml = forwardedHtml + replyHtml + contentHtml;
    let senderNameHtml = '';
    if (!isMe && activeGroupId) {
        const vidCountBubble = allVideosData.filter(v => String(v.user_id) === String(msg.sender_id)).length;
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

async function sendMessageRoom() {
if (!activeChatUserId && !activeGroupId) return;
const input = document.getElementById('chat-room-input');
const message = input.value.trim();
if (!message) return;
const isGroup = !!activeGroupId;
const targetId = isGroup ? activeGroupId : activeChatUserId;
if (isGroup) {
const { data: checkMember } = await supabaseClient.from('group_members').select('user_id').eq('group_id', targetId).eq('user_id', currentUser.id).single();
if (!checkMember) {
await customAlert("Anda tidak dapat mengirim pesan karena telah dikeluarkan dari grup ini.");
input.value = '';
closeChatRoom();
return;
}
}
const currentReplyId = replyingToMsgId;
const currentReplyName = replyingToMsgName;
const currentReplyText = replyingToMsgText;
cancelChatReply();
input.value = '';
input.style.height = 'auto';
sendTypingStatus();
let finalMessage = message;
if (currentReplyId) {
const safeName = currentReplyName.replace(/\|\|/g, "").replace(/\]/g, "");
const safeText = currentReplyText.replace(/\|\|/g, "").replace(/\]/g, "");
finalMessage = `[REPLY:${currentReplyId}||${safeName}||${safeText}]\n${message}`;
}
const tempId = 'temp-' + Date.now();
const tempMsg = { id: tempId, sender_id: currentUser.id, message: finalMessage, created_at: new Date().toISOString() };
appendMessageBubble(tempMsg);
scrollToBottomChat();
try {
const insertData = { sender_id: currentUser.id, message: finalMessage };
if (isGroup) insertData.group_id = targetId;
else insertData.receiver_id = targetId;
const { error } = await supabaseClient.from('messages').insert(insertData);
if (error) throw error;
tambahExp(2);
} catch (err) {
showToast("Gagal mengirim pesan", "error");
const bubble = document.getElementById(`msg-chat-${tempId}`);
if(bubble) bubble.remove();
}
}

async function recordStoryView(storyId) {
if (!currentUser) return;
try {
await supabaseClient.from('story_views').insert({
story_id: storyId,
user_id: currentUser.id
});
} catch (err) {
}
}

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

function openStoryStatsModal() {
    history.pushState({ popup: 'story_stats' }, null, '#storystats');
    const modal = document.getElementById('modal-story-stats');
    modal.classList.remove('translate-y-full');
    if (typeof pauseStoryForReply === 'function') pauseStoryForReply(); 
    loadStoryStatsData(); 
}

function closeStoryStatsModal(dariTombolBack = false) {
    const modal = document.getElementById('modal-story-stats');
    modal.classList.add('translate-y-full');
    if (typeof resumeStoryAfterReply === 'function') resumeStoryAfterReply(); 
    if (!dariTombolBack && window.location.hash === '#storystats') {
        history.back();
    }
}

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

async function loadStoryStatsData() {
const story = currentActiveStories[currentActiveStories.currentIndex];
if(!story) return;
const listViews = document.getElementById('story-views-list');
const listLikes = document.getElementById('story-likes-list');
listViews.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-info text-2xl"></i></div>';
listLikes.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';
try {
const { data: viewsData } = await supabaseClient.from('story_views').select('user_id, created_at').eq('story_id', story.id).order('created_at', { ascending: false });
const { data: likesData } = await supabaseClient.from('story_likes').select('user_id, created_at').eq('story_id', story.id).order('created_at', { ascending: false });
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

async function muatDataRipper() {
const linkAPI = "/api/content?action=ripper";
const container = document.getElementById('ripper-container');
const dataTersimpan = localStorage.getItem('ripperCache');
if (dataTersimpan) { dataRipperGlobal = JSON.parse(dataTersimpan); renderRippers(dataRipperGlobal, false); }
else { container.innerHTML = '<div class="text-center py-10 text-xs text-brand-info animate-pulse"><i class="fas fa-sync fa-spin mb-2 text-2xl"></i><br>Menyiapkan Database Pertama Kali...</div>'; }
try { const respon = await fetch(linkAPI); const dataBaru = await respon.json(); localStorage.setItem('ripperCache', JSON.stringify(dataBaru)); dataRipperGlobal = dataBaru; renderRippers(dataRipperGlobal, false); }
catch (error) { if (!dataTersimpan) { container.innerHTML = '<div class="text-center py-10 text-xs text-red-500"><i class="fas fa-exclamation-triangle mb-2 text-2xl"></i><br>Gagal terhubung ke database.</div>'; } }
}

function getKategoriLogoURL(name) {
name = name.toLowerCase().trim().replace(/\s+/g, '-');
const folderStorageLu = "https://nos.wjv-1.neo.id/au2hub/icons/";
return `${folderStorageLu}${name}.png`;
}

function getIconColorClass(name, isActive) {
if (isActive) return '!text-white';
name = name.toLowerCase();
if (name === 'semua') return 'text-brand-info';
if (name.includes('joki')) return 'text-yellow-400';
if (name.includes('netflix') || name.includes('flix')) return 'text-red-500';
if (name.includes('game') || name.includes('dance') || name.includes('bingo')) return 'text-brand-purple';
return 'text-brand-accent';
}

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
renderKategoriTabs(xoftwareProdukGlobal);
let dataFiltered = xoftwareProdukGlobal;
if (kat !== 'Semua') {
dataFiltered = xoftwareProdukGlobal.filter(p => getCategoryName(p) === kat);
}
renderProdukXoftware(dataFiltered);
}

let currentProductPrice = 0;
let currentProductQty = 1;
let currentSelectedVariation = "";
function pilihVariasi(namaVariasi, hargaVariasi) {
    currentSelectedVariation = namaVariasi;
    currentProductPrice = parseFloat(hargaVariasi) || 0;
    if (window.renderVariasiButtons) window.renderVariasiButtons(namaVariasi);
    updateHargaLayar();
}

function ubahJumlahPesan(delta) {
let newQty = currentProductQty + delta;
if (newQty < 1) newQty = 1;
currentProductQty = newQty;
const elQty = document.getElementById('detail-qty');
if (elQty) elQty.value = currentProductQty;
updateHargaLayar();
}

function inputJumlahPesan(val) {
    let parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1) {
        currentProductQty = 1;
    } else {
        currentProductQty = parsed;
    }
    updateHargaLayar();
}

function inputJumlahPasar(val) {
    let parsed = parseInt(val);
    const inputEl = document.getElementById('pasar-detail-qty');
    if (isNaN(parsed) || parsed < 1) {
        currentPasarQty = 1;
    } else {
        currentPasarQty = parsed;
    }
    updateHargaPasarLayar();
}

function validasiJumlah(el) {
let parsed = parseInt(el.value);
if (isNaN(parsed) || parsed < 1) {
parsed = 1;
el.value = 1;
}
currentProductQty = parsed;
updateHargaLayar();
}

function updateHargaLayar() {
let totalPrice = currentProductPrice * currentProductQty;
let baseHargaCoret = Math.ceil((currentProductPrice * 1.3) / 1000) * 1000;
if (currentProductPrice > 100000) baseHargaCoret = Math.ceil((currentProductPrice * 1.2) / 5000) * 5000;
if (currentProductPrice <= 5000) baseHargaCoret = currentProductPrice + 2500;
let totalHargaCoret = baseHargaCoret * currentProductQty;
const badgeDiscount = document.getElementById('detail-discount-badge');
if (currentUser && badgeDiscount) {
const videoSaya = allVideosData.filter(v => v.user_id === currentUser.id).length;
if (videoSaya >= 100) {
totalPrice = Math.floor(totalPrice * 0.9);
badgeDiscount.innerHTML = `<i class="fas fa-percentage mr-1"></i> DISKON LEGEND 10% AKTIF`;
badgeDiscount.classList.remove('hidden');
} else if (videoSaya >= 50) {
totalPrice = Math.floor(totalPrice * 0.95);
badgeDiscount.innerHTML = `<i class="fas fa-percentage mr-1"></i> DISKON MASTER 5% AKTIF`;
badgeDiscount.classList.remove('hidden');
} else {
badgeDiscount.classList.add('hidden');
}
}
document.getElementById('detail-product-price').innerHTML = `<span class="text-gray-500 line-through text-sm font-medium mr-2">Rp ${totalHargaCoret.toLocaleString('id-ID')}</span>Rp ${totalPrice.toLocaleString('id-ID')}`;
}

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
    if (likeCount > 300) {
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log(`[System] ${likeCount} Cache memori dibersihkan.`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
  autoCleanLocalStorage();
      const path = window.location.pathname;
  if (path.startsWith('/toko/')) {
      const sellerName = path.replace('/toko/', '').replace('/', '');
      window.history.replaceState(null, null, `/#tokopublik?seller=${sellerName}`);
  }
  setTimeout(() => {
        if(document.getElementById('btn-bayar-langganan')) {
            pilihPaketSeller('tahunan');
        }
    }, 1000);
  let tabAwal = window.location.hash.substring(1);
  if (!tabAwal) {
    tabAwal = localStorage.getItem('lastTab') || 'home';
    history.replaceState(null, null, '#' + tabAwal); 
  }
  let tabMurni = tabAwal.split('?')[0];
  if (tabMurni === 'detailpasar') tabMurni = 'pasar';
  if (tabMurni === 'detail') tabMurni = 'layanan';
  if (tabMurni === 'invoice') tabMurni = 'pesanan';
  if (tabMurni === 'pembayaran') tabMurni = 'pesanan';
  if (tabMurni === 'upload') tabMurni = 'home';
  switchTab(tabMurni, null, false);
  checkSession();
supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
          handleLogout(); 
          showToast("Sesi kamu telah berakhir. Silakan login kembali.", "error");
      } 
      else if (event === 'SIGNED_OUT') {
          currentUser = null;
          userProfile = null;
          checkSession(); 
      }
  });
  muatDataRipper();
  loadInfoLayanan();
  loadDataRekber();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('SW Berhasil Terdaftar!');
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                if (typeof showToast === 'function') {
                    showToast("Aplikasi diperbarui! Memuat ulang sistem...", "success");
                }
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

  function isPWAInstalled() {
      return window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone || 
             document.referrer.includes('android-app://');
  }

  if (btnInstallContainer) {
      if (isPWAInstalled()) {
          btnInstallContainer.classList.add('hidden');
      } else {
          btnInstallContainer.classList.remove('hidden');
      }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallContainer) btnInstallContainer.classList.remove('hidden');
  });

  if (btnInstallManual) {
    btnInstallManual.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Hasil install:', outcome);
        deferredPrompt = null;
      } else {
        alert("Untuk menginstal di iPhone/iPad:\n\n1. Ketuk ikon 'Bagikan' (Share) di menu bawah.\n2. Pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('Aplikasi sukses terinstal!');
    if (btnInstallContainer) btnInstallContainer.classList.add('hidden');
  });
});

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

function openLeaderboardModal() {
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
    }
    const modal = document.getElementById('modal-leaderboard');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const chatBtn = document.querySelector('button[onclick="toggleWidget()"]');
    if (chatBtn) chatBtn.classList.add('hidden');
    history.pushState({ popup: 'leaderboard' }, null, '#leaderboard');
    switchLeaderboardTab('creator');
}

function closeLeaderboardModal() {
    if (window.location.hash === '#leaderboard') {
        history.back(); 
    } else {
        const modal = document.getElementById('modal-leaderboard');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const chatBtn = document.querySelector('button[onclick="toggleWidget()"]');
        if (chatBtn) chatBtn.classList.remove('hidden');
    }
}

async function switchLeaderboardTab(tab) {
    const btnCreator = document.getElementById('tab-lb-creator');
    const btnLevel = document.getElementById('tab-lb-level');
    const btnSultan = document.getElementById('tab-lb-sultan');
    const containerCreator = document.getElementById('leaderboard-container-creator');
    const containerLevel = document.getElementById('leaderboard-container-level');
    const containerSultan = document.getElementById('leaderboard-container-sultan');
    const normalClass = 'flex-1 py-2.5 text-[10px] font-bold text-gray-500 hover:text-white rounded-xl transition-all bg-transparent shadow-none border border-transparent hover:border-white/10';
    btnCreator.className = normalClass;
    btnLevel.className = normalClass;
    btnSultan.className = normalClass;
    containerCreator.classList.replace('block', 'hidden');
    containerLevel.classList.replace('block', 'hidden');
    containerSultan.classList.replace('block', 'hidden');
    if (tab === 'creator') {
        btnCreator.className = 'flex-1 py-2.5 text-[10px] font-bold text-white bg-brand-accent rounded-xl shadow-[0_0_15px_rgba(255,0,122,0.4)] transition-all';
        containerCreator.classList.replace('hidden', 'block');
        containerCreator.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-accent text-2xl"></i></div>';
        if (allVideosData.length === 0) {
            try {
                const res = await fetch('/api/content?action=videos');
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
        btnLevel.className = 'flex-1 py-2.5 text-[10px] font-bold text-white bg-brand-purple rounded-xl shadow-[0_0_15px_rgba(162,119,255,0.4)] transition-all';
        containerLevel.classList.replace('hidden', 'block');
        containerLevel.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-brand-purple text-2xl"></i></div>';
        try {
            const { data: topPlayers, error } = await supabaseClient
                .from('profiles')
                .select('id, nickname, avatar_url, bio, exp, is_seller, seller_expired_at, last_seen')
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
            const reqAdmin = supabaseClient.from('orders').select('user_id, price').eq('status', 'selesai');
            const reqPlayer = supabaseClient.from('orders_player').select('user_id, price').eq('status', 'selesai');
            const [resAdmin, resPlayer] = await Promise.all([reqAdmin, reqPlayer]);
            const allOrders = [...(resAdmin.data || []), ...(resPlayer.data || [])];
            if (allOrders.length === 0) {
                containerSultan.innerHTML = '<p class="text-center text-xs text-gray-500 py-10">Belum ada data sultan yang memborong.</p>';
                return;
            }
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

async function handleGroupAvatarUpload(event) {
const file = event.target.files[0];
if (!file || !activeGroupId) return;
showToast("Mengupdate foto profil grup...", "info");
try {
const pathLengkap = `groups/${activeGroupId}/avatar_${Date.now()}`;
const { data: { session } } = await supabaseClient.auth.getSession();
const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
});
const dataUrl = await resUrl.json();
await fetch(dataUrl.uploadUrl, {
method: 'PUT',
body: file,
headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' }
});
const { error } = await supabaseClient
.from('groups')
.update({ avatar_url: dataUrl.finalVideoUrl })
.eq('id', activeGroupId);
if (error) throw error;
document.getElementById('info-group-avatar').src = dataUrl.finalVideoUrl;
showToast("Foto profil grup berhasil diperbarui!", "success");
loadChatList();
} catch(err) {
showToast("Gagal memperbarui foto grup.", "error");
}
}

        function getBadgeByVideoCount(count) {
    return getBadgeByLevelAndVideos(0, count);
}

function toggleInfoDesc(idx) {
    const desc = document.getElementById(`info-desc-${idx}`);
    const btn = document.getElementById(`info-btn-${idx}`);
    if (desc) {
        if (desc.classList.contains('line-clamp-3')) {
            desc.classList.remove('line-clamp-3');
            if (btn) btn.innerHTML = 'Tutup Selengkapnya ▲';
        } else {
            desc.classList.add('line-clamp-3');
            if (btn) btn.innerHTML = 'Lihat Selengkapnya ▼';
        }
    }
}

let lbTouchStartX = 0;
let lbTouchStartY = 0;
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
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
        const tabs = ['creator', 'level', 'sultan'];
        let currentTab = '';
        if (!document.getElementById('leaderboard-container-creator').classList.contains('hidden')) currentTab = 'creator';
        else if (!document.getElementById('leaderboard-container-level').classList.contains('hidden')) currentTab = 'level';
        else currentTab = 'sultan';
        let currentIndex = tabs.indexOf(currentTab);
        if (diffX > 0) { 
            if (currentIndex < 2) switchLeaderboardTab(tabs[currentIndex + 1]);
        } else { 
            if (currentIndex > 0) switchLeaderboardTab(tabs[currentIndex - 1]); 
        }
    }
}, {passive: true});

function openAssistiveMenu() {
    history.pushState({ popup: 'assistive' }, null, '#menu');
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

function closeAssistiveMenu(dariTombolBack = false) {
    const menu = document.getElementById('assistive-menu');
    const box = menu.querySelector('div');
    menu.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-90');
    if (!dariTombolBack && window.location.hash === '#menu') {
        history.back();
    }

    setTimeout(() => {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }, 300);
}

function executeAssistive(target) {
    closeAssistiveMenu();
    if (target === 'leaderboard') {
        openLeaderboardModal();
    } else {
        switchTab(target);
    }
}

async function copyLinkLaciAktif(btn) {
    const currentUrl = window.location.href; 
    const judulProduk = document.getElementById('detail-product-title').innerText || "Layanan AU2Hub";
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AU2Hub',
                text: `Cek ${judulProduk} di AU2Hub sekarang!`,
                url: currentUrl
            });
        } catch (err) {
            console.log("Membagikan dibatalkan.", err);
        }
    } 
    else {
        navigator.clipboard.writeText(currentUrl).then(() => {
            showToast("Link laci berhasil disalin!", "success");
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

document.getElementById('btn-forward-msg').addEventListener('click', () => {
    if (!selectedMessageId) return;
    closeMsgOptions(); 
    history.pushState({ popup: 'forward_msg' }, null, '#forward');
    document.getElementById('modal-forward-msg').classList.remove('hidden');
    document.getElementById('modal-forward-msg').classList.add('flex');
    loadForwardContacts(); 
});

function loadForwardContacts(searchQuery = '') {
    const container = document.getElementById('forward-list-container');
    let allContacts = [...globalGroupList, ...globalPersonalList];
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allContacts = allContacts.filter(c => c.name.toLowerCase().includes(query));
    }
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

async function executeForward(targetId, isGroup, targetName) {
    const confirmSend = await customConfirm(`Teruskan pesan ini ke ${targetName}?`);
    if (!confirmSend) return;
    closeForwardModal(); 
    showToast(`Meneruskan pesan ke ${targetName}...`, "info");
    try {
        const { data: originalMsg, error: fetchErr } = await supabaseClient
            .from('messages')
            .select('message')
            .eq('id', selectedMessageId)
            .single();
        if (fetchErr || !originalMsg) throw new Error("Gagal membaca pesan asli dari server.");
        let rawMessage = originalMsg.message;
        const replyRegex = /^\[REPLY:(.*?)\|\|(.*?)\|\|(.*?)\]\n([\s\S]*)$/;
        const match = rawMessage.match(replyRegex);
        if (match) {
            rawMessage = match[4]; 
        }
        rawMessage = rawMessage.replace(/^\[FORWARDED\]\n?/, '').trim();
        const finalMessage = `[FORWARDED]\n${rawMessage}`;
        const insertData = { 
            sender_id: currentUser.id, 
            message: finalMessage 
        };
        if (isGroup) {
            insertData.group_id = targetId;
        } else {
            insertData.receiver_id = targetId;
        }
        const { error } = await supabaseClient.from('messages').insert(insertData);
        if (error) throw error;
        showToast("Pesan berhasil diteruskan!", "success");
        loadChatList(); 
    } catch (err) {
        showToast(err.message, "error");
    }
}

function closeForwardModal(dariTombolBack = false) {
    const modal = document.getElementById('modal-forward-msg');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('forward-search-input').value = ''; 
    messageToForward = ""; 
    if (!dariTombolBack && window.location.hash === '#forward') {
        history.back();
    }
}

document.getElementById('forward-search-input').addEventListener('input', debounce((e) => {
    loadForwardContacts(e.target.value);
}, 300));

let chatSwipeStartX = 0;
let chatSwipeStartY = 0;

document.addEventListener('DOMContentLoaded', () => {
    const chatListView = document.getElementById('chat-list-view');
    if (chatListView) {
        chatListView.addEventListener('touchstart', e => {
            chatSwipeStartX = e.changedTouches[0].screenX;
            chatSwipeStartY = e.changedTouches[0].screenY;
        }, {passive: true});
        chatListView.addEventListener('touchend', e => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;
            let diffX = chatSwipeStartX - touchEndX;
            let diffY = chatSwipeStartY - touchEndY;
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
                const tabs = ['personal', 'group', 'status'];
                let currentTab = '';
                if (!document.getElementById('chat-personal-container').classList.contains('hidden')) {
                    currentTab = 'personal';
                } else if (!document.getElementById('chat-group-container').classList.contains('hidden')) {
                    currentTab = 'group';
                } else {
                    currentTab = 'status';
                }
                let currentIndex = tabs.indexOf(currentTab);
                if (diffX > 0) { 
                    if (currentIndex < 2) switchChatTab(tabs[currentIndex + 1]);
                } else { 
                    if (currentIndex > 0) switchChatTab(tabs[currentIndex - 1]); 
                }
            }
        }, {passive: true});
    }
});

let isWithdrawing = false;

document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

function bukaModalNetflix() {
    if (!currentUser) return showToast("Silakan login dulu untuk klaim Netflix!", "error");
    history.pushState({ popup: 'netflix' }, null, '#netflix');
    const modal = document.getElementById('modal-netflix');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('input-token-netflix').value = '';
    document.getElementById('hasil-kode-netflix').classList.add('hidden');
    document.getElementById('angka-kode-netflix').innerText = '----';
}

function tutupModalNetflix(dariTombolBack = false) {
    const modal = document.getElementById('modal-netflix');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (!dariTombolBack && window.location.hash === '#netflix') {
        history.back();
    }
}

async function klaimKodeNetflix() {
    const inputToken = document.getElementById('input-token-netflix').value.trim();
    if (!inputToken) {
        return showToast("Token tidak boleh kosong!", "error");
    }
    const btn = document.getElementById('btn-klaim-netflix');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Mengambil...';
    btn.disabled = true;
    try {
        const response = await fetch('/api/content?action=netflix', {
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
        document.getElementById('angka-kode-netflix').innerText = data.code;
        document.getElementById('hasil-kode-netflix').classList.remove('hidden');
        showToast("Kode berhasil didapatkan!", "success");
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function cekStatusManualXoftware(orderId, tableName, btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Mengecek...';
    btnElement.disabled = true;
    try {
        const res = await fetch(`/api/payment?action=check_status&order_id=${orderId}&table=${tableName}&_t=${Date.now()}`);
        const data = await res.json();
        const apiStatus = String(data.status || data.data?.status || data.payment_status || '').toUpperCase();
        if (apiStatus === 'SUCCESS' || apiStatus === 'SUCCEEDED' || apiStatus === 'PAID' || apiStatus === 'SELESAI' || apiStatus === 'PROSES') {
            showToast("Pembayaran berhasil dikonfirmasi!", "success");
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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const searchKas = document.getElementById('cari-buku-kas');
        if (searchKas) {
            searchKas.addEventListener('input', debounce((e) => {
                const keyword = e.target.value.toLowerCase();
                if (!keyword.trim()) {
                    renderBukuKasList(globalDataBukuKas);
                    return;
                }
                const filteredData = globalDataBukuKas.filter(tx => {
                    const matchNama = tx.product_name.toLowerCase().includes(keyword);
                    const matchPenjual = tx.namaPenjual.toLowerCase().includes(keyword);
                    const matchID = tx.id.toLowerCase().includes(keyword);
                    const matchNominal = tx.totalJatahNikky.toString().includes(keyword);
                    const stringTanggal = tx.waktuAkurat.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
                    const matchTanggal = stringTanggal.includes(keyword);
                    return matchNama || matchPenjual || matchID || matchNominal || matchTanggal;
                });
                renderBukuKasList(filteredData);
            }, 300));
        }
        const searchLabaPPOB = document.getElementById('cari-laba-ppob');
    }, 1000);
});
