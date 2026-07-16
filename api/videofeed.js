let obs = null, activeVideoId = null, lastTap = 0, isGlobalMuted = false;
let replyingToId = null, replyingToName = null;
let currentVideoIndex = 0;
const BATCH_SIZE = 5;
let lastVidObserverGlobal = null;
let lastProfileVidObserverGlobal = null;

let currentProfileVideos = [];
let profileFeedIndex = 0;
let floatObs = null;
let videoClickTimer = null; 
let floatClickTimer = null; 

let commentSubscription = null;
window.cacheVideoStats = window.cacheVideoStats || {};

let feedOffset = 0;
const FEED_LIMIT = 20;
let isFeedEndReached = false;
let isFetchingFeed = false;

function bukaPratinjauVideo(e) {
    e.preventDefault();
    e.stopPropagation();
    const videoKecil = document.getElementById('video-preview-element');
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');
    if (!videoKecil.src) return;
    history.pushState({ popup: 'pratinjau' }, null, '#pratinjau');
    videoFull.src = videoKecil.src;
    modalPratinjau.classList.remove('hidden');
    modalPratinjau.classList.add('flex');
    videoFull.muted = false;
    videoFull.play();
}

function tutupPratinjauVideo(dariTombolBack = false) {
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');
    if (!dariTombolBack && window.location.hash === '#pratinjau') {
        history.back();
    }
    videoFull.pause();
    videoFull.src = '';
    modalPratinjau.classList.add('hidden');
    modalPratinjau.classList.remove('flex');
}

function toggleGlobalAudio() {
    isGlobalMuted = !isGlobalMuted;
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.muted = isGlobalMuted);
    showToast(isGlobalMuted ? "Suara Dimatikan" : "Suara Dinyalakan", isGlobalMuted ? "info" : "success");
}

function cariBerdasarkanTagar(tagar) {
    const storyModal = document.getElementById('story-viewer-modal');
    if (storyModal && !storyModal.classList.contains('hidden')) {
        closeStoryViewer();
    }
    if (document.body.classList.contains('video-focused')) {
        toggleFloatingMode(true);
    }
    const floatingPlayer = document.getElementById('floating-video-player');
    if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) {
        closeFloatingVideo(true); 
    }
    const videoDitemukan = allVideosData.filter(v => 
        v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase())
    );
    if (videoDitemukan.length === 0) {
        showToast(`Belum ada video dengan tagar #${tagar}`, "error");
        return;
    }

    const modal = document.getElementById('modal-hashtag-grid');
    const grid = document.getElementById('hashtag-video-grid');
    const title = document.getElementById('hashtag-grid-title');
    const count = document.getElementById('hashtag-grid-count');
    title.innerText = '#' + tagar;
    count.innerText = videoDitemukan.length + ' Video Terkait';
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

    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.pause());
    modal.classList.remove('hidden');
    modal.classList.add('flex');
 
    setTimeout(() => {
        modal.classList.remove('translate-x-full');
    }, 50);
    history.pushState({ popup: 'hashtag_grid' }, null, '#tagar');
}

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
    const videoDitemukan = allVideosData.filter(v => 
        v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase())
    );
    if(videoDitemukan.length === 0) return;
    currentProfileVideos = [...videoDitemukan].reverse();
    let targetIndex = parseInt(startIndex) || 0;
    const container = document.getElementById('floating-feed-container');
    container.innerHTML = '';
    container.scrollTop = 0;
    isGlobalMuted = false;
    document.getElementById('floating-video-player').classList.remove('hidden');
    document.getElementById('floating-video-player').classList.add('flex');
    document.getElementById('floating-video-player').style.opacity = '1';
    if(floatObs) floatObs.disconnect();
    setupFloatVideoObserver();
    profileFeedIndex = 0;
    let amountToLoad = targetIndex + 3;
    renderProfileVideoBatch(amountToLoad);

    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 10);

    history.pushState({ popup: 'floating_video_hashtag' }, null, '#play_tagar');
}

function setupFloatVideoObserver() {
    floatObs = new IntersectionObserver(es => {
        es.forEach(e => {
            const video = e.target;
            if (e.isIntersecting) {
                if (!video.src && video.dataset.src) {
                    video.src = video.dataset.src;
                    video.load();
                }
                video.muted = isGlobalMuted;
                const playP = video.play();
                if (playP !== undefined) {
                    playP.catch(err => {
                        if (err.name === 'NotAllowedError') {
                            video.muted = true;
                            isGlobalMuted = true;
                            video.play().catch(e => {});
                        }
                    });
                }
                let currentContainer = video.closest('.snap-start');
                for(let j = 0; j < 2; j++) {
                    currentContainer = currentContainer?.nextElementSibling;
                    if(currentContainer) {
                        const nextVid = currentContainer.querySelector('video');
                        if(nextVid && nextVid.getAttribute('preload') !== 'metadata') nextVid.setAttribute('preload', 'metadata');
                    }
                }
            } else {
                video.pause(); 
                if (video.src) {
                    video.dataset.src = video.src;
                    video.removeAttribute('src');
                    video.load();
                }
            }
        });
    }, { threshold: 0.6 });
}

function openProfileFeed(userId, startIndex) {
    currentProfileVideos = allVideosData
        .filter(v => v.user_id === userId)
        .sort((a, b) => (b.original_index || 0) - (a.original_index || 0));
    if(currentProfileVideos.length === 0) return;
    let targetIndex = parseInt(startIndex) || 0;
    const container = document.getElementById('floating-feed-container');
    container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    container.innerHTML = '';
    container.scrollTop = 0;

    document.querySelectorAll('.video-player').forEach(v => v.pause());
    isGlobalMuted = false;
    document.getElementById('floating-video-player').classList.remove('hidden');
    document.getElementById('floating-video-player').classList.add('flex');
    document.getElementById('floating-video-player').style.opacity = '1'; 
    if(floatObs) floatObs.disconnect();
    setupFloatVideoObserver();
    profileFeedIndex = 0;
    let amountToLoad = targetIndex + 3; 
    renderProfileVideoBatch(amountToLoad);
    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 10); 
    history.pushState({ popup: 'floating_video' }, null, '#profil_video');
}

function closeFloatingVideo(skipHistory = false) {
    const p = document.getElementById('floating-video-player');
    p.style.transition = 'opacity 0.3s ease';
    p.style.opacity = '0';
    document.querySelectorAll('.float-video-player').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    if (!skipHistory && (window.location.hash === '#profil_video' || window.location.hash === '#play_tagar')) {
        history.back();
    }
    setTimeout(() => {
        p.classList.add('hidden'); 
        p.classList.remove('flex');
        p.style.opacity = '1'; 
        document.getElementById('floating-feed-container').innerHTML = '';
        if(floatObs) floatObs.disconnect();
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
    <div class="absolute inset-0 flex items-center justify-center z-0"><img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-10 h-10 opacity-40 splash-logo-anim drop-shadow-[0_0_15px_rgba(255,0,122,0.3)]"></div>
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
        if (lastProfileVidObserverGlobal) lastProfileVidObserverGlobal.disconnect();
        lastProfileVidObserverGlobal = new IntersectionObserver(entries => {
            if(entries[0].isIntersecting) {
                lastProfileVidObserverGlobal.disconnect();
                renderProfileVideoBatch(3);
            }
        }, { threshold: 0.1 });
        lastProfileVidObserverGlobal.observe(v.closest('.snap-start'));
    }
    });
}

function toggleProfileVideoAudio(video) {
    video.muted = !video.muted;
    isGlobalMuted = video.muted;
    const isFloatingOpen = !document.getElementById('floating-video-player').classList.contains('hidden');
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => {
        if (isFloatingOpen && v.classList.contains('video-player')) {
            v.muted = true;
            v.pause();
        } else {
            v.muted = isGlobalMuted;
        }
    });
    const container = video.closest('.relative');
    const indicator = container.querySelector('.volume-indicator');
    if(indicator) {
        indicator.innerHTML = video.muted
        ? '<i class="fas fa-volume-mute text-2xl text-gray-300"></i>'
        : '<i class="fas fa-volume-up text-2xl text-brand-info"></i>';
        indicator.classList.remove('opacity-0', 'scale-150');
        indicator.classList.add('opacity-100', 'scale-100');
        setTimeout(() => {
            indicator.classList.remove('opacity-100', 'scale-100');
            indicator.classList.add('opacity-0', 'scale-150');
        }, 800);
    }
}

function handleVideoClick(event, videoElement, vidId) {
    const tutorial = document.getElementById('tutorial-tap');
    if (tutorial) {
        tutorial.style.opacity = '0';
        setTimeout(() => tutorial.remove(), 500);
        localStorage.setItem('tutorialPaham', 'true'); 
    }
    if (videoClickTimer) {
        clearTimeout(videoClickTimer);
        videoClickTimer = null;
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        const isLiked = likeBtn.querySelector('i').classList.contains('text-brand-accent');
        if (!isLiked) {
            likeVideo(vidId, likeBtn);
        }
        createHeartAt(event);
    } else {
        videoClickTimer = setTimeout(() => {
            videoClickTimer = null;
            toggleFloatingMode(); 
        }, 300);
    }
}

function handleFloatVideoClick(event, videoElement, vidId) {
    if (floatClickTimer) {
        clearTimeout(floatClickTimer);
        floatClickTimer = null;
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        likeVideo(vidId, likeBtn); 
        createHeartAt(event);      
    } else {
        floatClickTimer = setTimeout(() => {
            floatClickTimer = null;
        }, 300);
    }
}

async function deleteVideo(vidId) {
    const hapus = await customPrompt("Ketik 'HAPUS' jika ingin menghapus video ini secara PERMANEN:");
    if(hapus === 'HAPUS') {
        try {
            const videoTarget = allVideosData.find(v => v.id === vidId);
            const configRes = await fetch('/api/content?action=config');
            const config = await configRes.json();
            if (config.gasUrl) {
                await fetch(config.gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'DELETE', id: vidId })
                });
            }
            if (videoTarget && videoTarget.video_url) {
                await fetch('/api/storage?action=delete&type=file', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrl: videoTarget.video_url })
                }).catch(e => console.log("Ignore S3 error:", e));
            }
            allVideosData = allVideosData.filter(v => v.id !== vidId);
            newUploads = newUploads.filter(v => v.id !== vidId);
            closeFloatingVideo();
            renderProfileVideos();
            showToast("Video berhasil dihapus permanen!", "success");
        } catch (err) {
            showToast("Gagal menghapus ke server: " + err.message, "error");
        }
    }
}

async function downloadVideoSaya(urlVideo, vidId) {
    showToast("Memproses unduhan...", "info");
    try {
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
        a.download = `AU2Hub_Video_${vidId}.mp4`; 
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 1000);
        showToast("Video sedang diunduh ke Galeri!", "success");

    } catch (error) {
        console.log("Download background gagal, pindah ke mode tab baru:", error);
        showToast("Membuka pemutar video...", "info");
        setTimeout(() => {
            showToast("💡 Tips: Klik titik tiga (⋮) di pojok kanan bawah lalu pilih 'Download'", "success");
        }, 1500);
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

async function shareVideo(vidId, btn) {
    const finalId = vidId && vidId !== 'undefined' ? vidId : '';

    if (!finalId) {
        showToast("Gagal menyalin link: ID Video tidak ditemukan", "error");
        return;
    }
    const link = window.location.origin + window.location.pathname + '#sosial?vid=' + finalId;
    const videoData = allVideosData.find(v => v.id === finalId);
    let namaKreator = "Player";
    let teksCaption = "video keren ini";

    if (videoData) {
        namaKreator = videoData.nickname || "Player";
        if (videoData.caption) {
            let cap = videoData.caption.replace(/[\n\r]+/g, ' ').trim();
            teksCaption = `"${cap.substring(0, 30)}${cap.length > 30 ? '...' : ''}"`;
        }
    }
    const teksShare = `Tonton ${teksCaption} dari @${namaKreator} di AU2Hub! 🎵✨`;
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
    else {
        navigator.clipboard.writeText(`${teksShare}\n\n${link}`).then(() => {
            showToast("Link video disalin ke clipboard!", "success");
            const icon = btn.querySelector('i');
            const classAsli = icon.className; 
            icon.className = 'fas fa-check text-brand-success text-[35px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all';
            setTimeout(() => {
                icon.className = classAsli;
            }, 2000);
        }).catch(() => {
            showToast("Gagal menyalin link", "error");
        });
    }
}

function setupCommentRealtime(videoId) {
    if (commentSubscription) supabaseClient.removeChannel(commentSubscription);
    
    commentSubscription = supabaseClient.channel(`room_comments_${videoId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` }, payload => {
        const triggerUserId = payload.new ? payload.new.user_id : payload.old?.user_id;

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
    
    const video = allVideosData.find(v => v.id === id);
    const isCommentsAllowed = video ? (video.allow_comments !== false && video.allow_comments !== 'false') : true;
    const inputWrapper = document.getElementById('comment-input-wrapper');
    const disabledMsg = document.getElementById('comment-disabled-msg');
    if (isCommentsAllowed) {
        if (inputWrapper) inputWrapper.classList.remove('hidden');
        if (disabledMsg) disabledMsg.classList.add('hidden');
    } else {
        if (inputWrapper) inputWrapper.classList.add('hidden');
        if (disabledMsg) disabledMsg.classList.remove('hidden');
    }
    document.getElementById('comment-drawer').classList.add('open');
    loadComments(id);
    setupCommentRealtime(id);
}

function closeComments() {
    if (window.location.hash === '#comments') {
        history.back();
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
        list.innerHTML = '<div class="flex justify-center mt-10"><img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-10 h-10 mx-auto splash-logo-anim drop-shadow-[0_0_15px_rgba(255,0,122,0.5)]"></div>';
    }
    cancelReply();
    try {
        const { data: supabaseData, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('video_id', videoId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        const data = supabaseData || [];
        document.getElementById('drawer-comment-count').innerText = data.length || 0;
        if (data && data.length > 0) {
            data.forEach(c => {
                c.user_id = String(c.user_id || c.User_ID || c.userId || c.userid).trim();
            });
            const userIds = [...new Set(data.map(c => c.user_id))].filter(id => id && id !== 'undefined' && id !== 'null');
            const nicknames = [...new Set(data.map(c => c.nickname))].filter(n => n && n !== 'undefined' && n !== 'null');
            let profilesData = [];
            if (nicknames.length > 0) {
                const { data: pData } = await supabaseClient.from('profiles').select('id, nickname, exp').in('nickname', nicknames);
                if (pData) profilesData = pData;
            } else if (userIds.length > 0) {
                const { data: pData } = await supabaseClient.from('profiles').select('id, nickname, exp').in('id', userIds);
                if (pData) profilesData = pData;
            }
            data.forEach(c => {
                if (currentUser && (c.user_id === String(currentUser.id).trim() || c.nickname === userProfile?.nickname)) {
                    c.exp = (typeof userProfile !== 'undefined' && userProfile.exp) ? userProfile.exp : 0;
                    c.user_id = currentUser.id;
                } 
                else {
                    const p = profilesData.find(x => String(x.id).trim() === c.user_id || x.nickname === c.nickname);
                    c.exp = p ? p.exp : 0;
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
        const { error: deleteError } = await supabaseClient
            .from('comments')
            .delete()
            .eq('id', cid);
        if (deleteError) throw deleteError;
        if (commentBox) {
            commentBox.style.transition = 'all 0.3s ease';
            commentBox.style.opacity = '0';
            setTimeout(() => {
                commentBox.remove();
                const countEl = document.getElementById('drawer-comment-count');
                if(countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
                if (window.cacheVideoStats && window.cacheVideoStats[activeVideoId]) {
                    window.cacheVideoStats[activeVideoId].comments = Math.max(0, window.cacheVideoStats[activeVideoId].comments - 1);
                }
                const containerCount = document.querySelector(`.comment-count-container[data-vid="${activeVideoId}"]`);
                if(containerCount) updateCommentCountUI(activeVideoId, containerCount);
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
            user_id: currentUser.id
        };
        if (replyingToId) payload.parent_id = replyingToId;
        const { error: insertError } = await supabaseClient
            .from('comments')
            .insert(payload);
        if (insertError) throw insertError; 
        msgInput.value = '';
        cancelReply(); 
        await tambahExp(10); 
        await loadComments(activeVideoId, true);
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
    if (!currentUser) {
        showToast("Silakan login untuk menyukai komentar!", "error");
        return openAuthModal();
    }

    if (btn.isProcessing) return;
    btn.isProcessing = true;
    const icon = btn.querySelector('i');
    const isLiked = icon.classList.contains('text-brand-accent');
    if (btn.animTimer) clearTimeout(btn.animTimer);
    icon.classList.add('animate-ping');
    btn.animTimer = setTimeout(() => icon.classList.remove('animate-ping'), 500);
    try {
        if (isLiked) {
            icon.classList.replace('text-brand-accent', 'text-gray-500');
            
            const { error } = await supabaseClient
                .from('comment_likes')
                .delete()
                .eq('comment_id', cid)
                .eq('user_id', currentUser.id);

            if(error) throw error;
            localStorage.removeItem('comment_liked_'+cid);
            
        } else {
            icon.classList.replace('text-gray-500', 'text-brand-accent');
            const { error } = await supabaseClient
                .from('comment_likes')
                .insert({
                    comment_id: cid,
                    user_id: currentUser.id
                });
            if(error && error.code !== '23505') throw error;
            localStorage.setItem('comment_liked_'+cid, 'true');
        }
        fetchCommentLikes(cid);
    } catch(e) {
        console.error("Comment Like Error:", e);
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

async function updateLikeCountUI(videoId, containerDiv) {
    if (!containerDiv) return;
    if (!window.cacheVideoStats[videoId]) window.cacheVideoStats[videoId] = {};
    try {
        let countLike = window.cacheVideoStats[videoId].likes;
        if (countLike === undefined) {
            const { count, error } = await supabaseClient
                .from('video_likes')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);
            if (!error) {
                countLike = count || 0;
                window.cacheVideoStats[videoId].likes = countLike;
            }
        }
        const countSpan = containerDiv.querySelector('.like-count-display');
        if (countSpan && countLike !== undefined) countSpan.innerText = countLike;
        const icon = containerDiv.querySelector('i');
        if (currentUser) {
            const { data: isLikedDB } = await supabaseClient
                .from('video_likes')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id)
                .limit(1)
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
        if (countComment === undefined) {
            const { count, error } = await supabaseClient
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);
            if (!error) {
                countComment = count || 0;
                window.cacheVideoStats[videoId].comments = countComment;
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
    if (!currentUser) {
        showToast("Silakan login untuk menyukai video!", "error");
        return openAuthModal();
    }
    if (btn.disabled) return;
    btn.disabled = true;
    const icon = btn.querySelector('i');
    const isLiked = icon.classList.contains('text-brand-accent'); 
    icon.classList.add('animate-ping');
    setTimeout(() => icon.classList.remove('animate-ping'), 500);
    try {
        if (isLiked) {
            icon.classList.replace('text-brand-accent', 'text-white');
            const { error } = await supabaseClient
                .from('video_likes')
                .delete()
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id);
            if (error) throw error;
            localStorage.removeItem(`liked_${videoId}`);
            if (window.cacheVideoStats && window.cacheVideoStats[videoId] && window.cacheVideoStats[videoId].likes > 0) {
                window.cacheVideoStats[videoId].likes--;
            }
        } else {
            icon.classList.replace('text-white', 'text-brand-accent');
            const { error } = await supabaseClient
                .from('video_likes')
                .insert({
                    video_id: videoId,
                    user_id: currentUser.id
                });
            if (error && error.code !== '23505') throw error;
            localStorage.setItem(`liked_${videoId}`, 'true');
            if (window.cacheVideoStats && window.cacheVideoStats[videoId] !== undefined) {
                window.cacheVideoStats[videoId].likes++;
            }
        }
        updateLikeCountUI(videoId, btn.closest('.like-container') || document.getElementById('float-like-container'));
    } catch (e) {
        console.error("Video Like Error:", e);
        if (isLiked) {
            icon.classList.replace('text-white', 'text-brand-accent');
        } else {
            icon.classList.replace('text-brand-accent', 'text-white');
        }
        showToast(isLiked ? "Gagal membatalkan like." : "Gagal menyukai video.", "error");
    } finally {
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

async function loadVideos(isLoadMore = false) {
    const container = document.getElementById('feed-container'); 
    const fakeLoader = document.getElementById('fake-loader'); 
    const fakeProgress = document.getElementById('fake-progress');
    const isFirstTime = !localStorage.getItem('hasVisitedSosial');
    if (!isLoadMore) {
        if (obs) obs.disconnect();
        feedOffset = 0;
        isFeedEndReached = false;
        allVideosData = [];
        currentVideoIndex = 0;
        if(container) container.innerHTML = '';
        if (allVideosData.length === 0 && container) container.innerHTML = `<div class="w-full h-full relative bg-[#1A1133] animate-pulse flex flex-col justify-end p-6 flex-shrink-0 snap-start skeleton-loader"><div class="absolute inset-0 flex items-center justify-center"><i class="fas fa-circle-notch fa-spin text-brand-accent text-4xl opacity-40"></i></div></div>`;
    }
    if (isFeedEndReached || isFetchingFeed) return;
    isFetchingFeed = true;
    try {
        const res = await fetch(`/api/content?action=videos&limit=${FEED_LIMIT}&offset=${feedOffset}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Format data Vercel tidak valid. Cek link Google Sheets.");
        }
        let dataDariSheet = await res.json();
        if (dataDariSheet.error) throw new Error(dataDariSheet.error);
        if (!Array.isArray(dataDariSheet)) dataDariSheet = [];
        if (dataDariSheet.length < FEED_LIMIT) isFeedEndReached = true; 
        dataDariSheet = dataDariSheet.map((v, index) => {
            v.original_index = feedOffset + index; 
            v.id = v.id || v.video_id || v.ID || 'vid_' + Math.random().toString(36).substr(2, 9);
            v.user_id = v.user_id || v.User_ID || v.userId || v.userid;
            return v;
        });
        if (!isLoadMore) {
            let nextIdx = dataDariSheet.length;
            newUploads.forEach(newVid => {
                newVid.id = newVid.id || newVid.video_id; 
                if (!dataDariSheet.find(v => v.id === newVid.id)) {
                    newVid.original_index = nextIdx++; 
                    dataDariSheet.unshift(newVid); 
                }
            });
        }
        dataDariSheet = dataDariSheet.filter(v => !blockedUsersList.includes(v.user_id));
        for (let i = dataDariSheet.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dataDariSheet[i], dataDariSheet[j]] = [dataDariSheet[j], dataDariSheet[i]];
        }
        allVideosData = [...allVideosData, ...dataDariSheet];
        feedOffset += FEED_LIMIT; 
        if (!allVideosData.length) { 
            if(container) container.innerHTML = '<p class="text-center py-20 text-gray-500">Belum ada video.</p>'; 
            if (fakeLoader) {
                fakeLoader.classList.add('opacity-0');
                setTimeout(() => { fakeLoader.classList.add('hidden'); fakeLoader.classList.remove('flex'); }, 500);
            }
            return; 
        }
        if (!isLoadMore && container) {
            container.innerHTML = ''; 
        }
        if (isFirstTime && !isLoadMore) {
            if(fakeLoader) {
                fakeLoader.classList.remove('hidden'); fakeLoader.classList.add('flex'); 
                if(fakeProgress) fakeProgress.style.transition = 'width 15s cubic-bezier(0.1, 0.7, 1.0, 0.1)';
                setTimeout(() => { if(fakeProgress) fakeProgress.style.width = '80%'; }, 100);
            }
            setupVideoObserver(); renderVideoBatch();
            const videosInDOM = document.querySelectorAll('.video-player'); 
            const targetCount = Math.min(10, videosInDOM.length);
            let readyCount = 0; let isResolved = false;
            const finishLoading = () => {
                if (isResolved) return; isResolved = true; 
                if(fakeProgress) {
                    fakeProgress.style.transition = 'width 0.4s ease-out'; 
                    fakeProgress.style.width = '100%';
                }
                setTimeout(() => { 
                    if(fakeLoader) fakeLoader.classList.add('opacity-0'); 
                    setTimeout(() => { 
                        if(fakeLoader) { fakeLoader.classList.add('hidden'); fakeLoader.classList.remove('flex'); }
                    }, 1000); 
                    localStorage.setItem('hasVisitedSosial', 'true'); 
                }, 500);
            };
            const safetyTimeout = setTimeout(() => { finishLoading(); }, 15000);
            if (targetCount === 0) { clearTimeout(safetyTimeout); finishLoading(); }
            else {
                videosInDOM.forEach((vid, index) => {
                    if (index < targetCount) {
                        vid.setAttribute('preload', 'auto'); vid.load();
                        const onVideoReady = () => {
                            if (isResolved) return; readyCount++; 
                            const progressPercent = 80 + ((readyCount / targetCount) * 20); 
                            if(fakeProgress) fakeProgress.style.width = `${progressPercent}%`;
                            if (readyCount >= targetCount) { clearTimeout(safetyTimeout); finishLoading(); }
                        };
                        if (vid.readyState >= 3) onVideoReady(); else { 
                            vid.addEventListener('canplay', onVideoReady, { once: true }); 
                            vid.addEventListener('loadeddata', onVideoReady, { once: true }); 
                            vid.addEventListener('error', onVideoReady, { once: true });
                        }
                    }
                });
            }
        } else { 
            setupVideoObserver(); 
            renderVideoBatch(); 
        }
    } catch (e) { 
        console.error("Error Load Video:", e);
        if (!isLoadMore && container) {
            container.innerHTML = `<p class="text-center py-20 text-red-500 font-bold"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>Gagal memuat video.<br><span class="text-xs text-gray-500 font-normal">${e.message}</span></p>`; 
        }
        if (fakeLoader) {
            fakeLoader.style.opacity = '0';
            setTimeout(() => {
                fakeLoader.classList.add('hidden');
                fakeLoader.classList.remove('flex');
            }, 300);
        }
    } finally {
        isFetchingFeed = false;
    }
}

function renderVideoBatch() {
    const container = document.getElementById('feed-container');
    if (currentVideoIndex >= allVideosData.length) {
        if (!isFeedEndReached) {
            loadVideos(true);
            return;
        } else {
            currentVideoIndex = 0;
        }
    }

    const nextBatch = allVideosData.slice(currentVideoIndex, currentVideoIndex + BATCH_SIZE);
    if (nextBatch.length === 0) return;
    const htmlString = nextBatch.map((vid, index) => {
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
        <div class="absolute inset-0 flex items-center justify-center z-0"><img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-10 h-10 opacity-40 splash-logo-anim drop-shadow-[0_0_15px_rgba(255,0,122,0.3)]"></div>
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

    if (container.children.length > 15) { 
        const tinggiVideo = container.firstElementChild.clientHeight;
        for (let i = 0; i < 5; i++) {
            const elToRemove = container.firstElementChild;
            if (elToRemove) {
                const vidToKill = elToRemove.querySelector('video');
                if (vidToKill) {
                    if (obs) obs.unobserve(vidToKill);
                    vidToKill.pause();
                    vidToKill.removeAttribute('src');
                    vidToKill.load(); 
                }
                elToRemove.remove();
            }
        }
        container.scrollBy({ top: -(tinggiVideo * 5), behavior: 'instant' });
    }
    if (container.children.length > 15) { 
        const tinggiVideo = container.firstElementChild.clientHeight;
        for (let i = 0; i < 5; i++) {
            const elToRemove = container.firstElementChild;
            if (elToRemove) {
                const vidToKill = elToRemove.querySelector('video');
                if (vidToKill) {
                    if (lastVidObserverGlobal) lastVidObserverGlobal.unobserve(vidToKill);
                    vidToKill.pause();
                    vidToKill.removeAttribute('src');
                    vidToKill.load(); 
                }
                elToRemove.remove();
            }
        }
        container.scrollBy({ top: -(tinggiVideo * 5), behavior: 'instant' });
    }
    container.insertAdjacentHTML('beforeend', htmlString);
    currentVideoIndex += nextBatch.length;
    const videoActions = container.querySelectorAll('.snap-start:not(.data-loaded)');
videoActions.forEach((card) => {
    if (card.classList.contains('skeleton-loader')) return;
    card.classList.add('data-loaded');
    const likeContainer = card.querySelector('.like-container');
    if (likeContainer) {
        const vidId = likeContainer.dataset.vid;
        updateLikeCountUI(vidId, likeContainer);
        const commentContainer = card.querySelector('.comment-count-container');
        if (commentContainer) {
            updateCommentCountUI(vidId, commentContainer);
        }
    }
});
    const unobservedVideos = container.querySelectorAll('.video-player:not(.observed)');
    unobservedVideos.forEach((v, i) => {
        v.classList.add('observed'); if (obs) obs.observe(v);
        if (i === unobservedVideos.length - 1) {
        if (lastVidObserverGlobal) lastVidObserverGlobal.disconnect();
        lastVidObserverGlobal = new IntersectionObserver(entries => {
            if(entries[0].isIntersecting) {
                lastVidObserverGlobal.disconnect();
                renderVideoBatch();
            }
        }, { threshold: 0.1 });
        lastVidObserverGlobal.observe(v.closest('.snap-start'));
    }
    });
}

function setupVideoObserver() {
    if (typeof obs !== 'undefined' && obs) obs.disconnect();
    if (!document.getElementById('gpu-hack')) {
        const style = document.createElement('style');
        style.id = 'gpu-hack';
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
                if (!video.src && video.dataset.src) {
                    video.src = video.dataset.src;
                    video.load();
                }
                video.muted = (typeof isGlobalMuted !== 'undefined') ? isGlobalMuted : true;
                const wrap = video.closest('.video-inner-wrap');
                if (wrap) {
                    if (!isGlobalMuted) wrap.classList.add('floating-focus');
                    else wrap.classList.remove('floating-focus');
                }
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        if (!e.isIntersecting) video.pause();
                    }).catch(err => {
                        if (err.name === 'NotAllowedError') {
                            video.muted = true;
                            isGlobalMuted = true; 
                            video.play().catch(e => {}); 
                        }
                    });
                }
                video.classList.remove('opacity-0');
            } else {
                video.pause();
                video.currentTime = 0;
                if (video.src) {
                    video.dataset.src = video.src; // Simpan URL
                    video.removeAttribute('src');  // Cabut dari memori browser
                    video.load();
                }
            }
        });
    }, { 
        threshold: 0.6,
        rootMargin: "0px" 
    });
    const videos = document.querySelectorAll('.video-player, .float-video-player');
    videos.forEach(v => obs.observe(v));
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
            video.progressFill.style.width = `${percent.toFixed(1)}%`;
        });
    }
}

function bukaMenuKreator(urlVideo, vidId) {
    document.getElementById('temp-kreator-vid').value = vidId;
    document.getElementById('temp-kreator-url').value = urlVideo;
    const modal = document.getElementById('modal-kreator-option');
    const box = document.getElementById('kreator-drawer-box');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        box.classList.remove('translate-y-full');
    }, 10);
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
    downloadVideoSaya(urlVideo, vidId);
}

function eksekusiHapusKreator() {
    const vidId = document.getElementById('temp-kreator-vid').value;
    tutupMenuKreator();
    deleteVideo(vidId);
}

function bukaVideoShare(vidId) {
    const targetVideo = allVideosData.find(v => v.id === vidId);
    if (!targetVideo) {
        showToast("Video yang dibagikan tidak ditemukan atau sudah dihapus.", "error");
        return;
    }
    currentProfileVideos = allVideosData.filter(v => v.user_id === targetVideo.user_id).reverse();
    let targetIndex = currentProfileVideos.findIndex(v => v.id === vidId);
    if (targetIndex === -1) targetIndex = 0;
    const container = document.getElementById('floating-feed-container');
    container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    container.innerHTML = '';
    container.scrollTop = 0;
    document.querySelectorAll('.video-player').forEach(v => {
        v.pause();
        v.muted = true;
        let currentUrl = v.currentSrc || v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
        if (currentUrl && currentUrl.length > 5) {
            v.dataset.savedSrc = currentUrl;
        }
        v.removeAttribute('src'); 
        if (v.querySelector('source')) v.querySelector('source').removeAttribute('src');
        v.load();
    });
    isGlobalMuted = false;
    const floatingPlayer = document.getElementById('floating-video-player');
    floatingPlayer.classList.remove('hidden');
    floatingPlayer.classList.add('flex');
    floatingPlayer.style.opacity = '1';
    if (floatObs) floatObs.disconnect();
    setupFloatVideoObserver();
    profileFeedIndex = 0;
    renderProfileVideoBatch(targetIndex + 3);
    setTimeout(() => {
        const targetCard = container.children[targetIndex];
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 100);
    history.pushState({ popup: 'floating_video' }, null, '#profil_video');
}
