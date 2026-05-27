// ==========================================
// FUNGSI SOSIAL & FEED VIDEO (BAGIAN 1: CORE & OBSERVER)
// ==========================================

function setupVideoObserver() {
    if (typeof obs !== 'undefined' && obs) obs.disconnect();

    if (!document.getElementById('gpu-hack')) {
        const style = document.createElement('style');
        style.id = 'gpu-hack';
        style.innerHTML = `
        .snap-start { transform: translateZ(0); will-change: transform, opacity; content-visibility: auto; }
        video { will-change: contents; }
        `;
        document.head.appendChild(style);
    }

    window.videoClearTimers = window.videoClearTimers || new Map();
    window.videoPlayTimers = window.videoPlayTimers || new Map();

    obs = new IntersectionObserver(es => {
        const isFloatingOpen = !document.getElementById('floating-video-player').classList.contains('hidden');

        es.forEach(e => {
            const video = e.target;

            if (e.isIntersecting && !isFloatingOpen) {
                if (window.videoClearTimers.has(video)) {
                    clearTimeout(window.videoClearTimers.get(video));
                    window.videoClearTimers.delete(video);
                }

                const playTimerId = setTimeout(() => {
                    if (video.dataset.savedSrc) {
                        video.src = video.dataset.savedSrc;
                        video.dataset.savedSrc = '';
                        video.load();
                    }

                    video.muted = (typeof isGlobalMuted !== 'undefined') ? isGlobalMuted : true;

                    const wrap = video.closest('.video-inner-wrap');
                    if (wrap) {
                        if (!isGlobalMuted) wrap.classList.add('floating-focus');
                        else wrap.classList.remove('floating-focus');
                    }

                    requestAnimationFrame(() => {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(err => {});
                        }
                        video.classList.remove('opacity-0');
                    });

                    const card = video.closest('.snap-start');
                    if (card && card.nextElementSibling) {
                        const nextVid = card.nextElementSibling.querySelector('video');
                        if (nextVid && nextVid.dataset.savedSrc && !nextVid.src) {
                            nextVid.src = nextVid.dataset.savedSrc;
                            nextVid.dataset.savedSrc = '';
                            nextVid.setAttribute('preload', 'auto');
                        }
                    }
                }, 100);

                window.videoPlayTimers.set(video, playTimerId);

            } else {
                if (window.videoPlayTimers.has(video)) {
                    clearTimeout(window.videoPlayTimers.get(video));
                    window.videoPlayTimers.delete(video);
                }

                video.pause();

                const timerId = setTimeout(() => {
                    const hapusMemori = () => {
                        let currentUrl = video.currentSrc || video.src || (video.querySelector('source') ? video.querySelector('source').src : '');
                        if (currentUrl && currentUrl.length > 5) {
                            video.dataset.savedSrc = currentUrl;
                            video.removeAttribute('src');
                            if (video.querySelector('source')) video.querySelector('source').removeAttribute('src');
                            video.removeAttribute('preload');
                            video.load();
                        }
                        window.videoClearTimers.delete(video);
                    };

                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(hapusMemori, { timeout: 1000 });
                    } else {
                        hapusMemori();
                    }
                }, 1000);

                window.videoClearTimers.set(video, timerId);
            }
        });
    }, { threshold: 0.5 });

    const videos = document.querySelectorAll('.video-player, .float-video-player');
    videos.forEach(v => obs.observe(v));
}

async function loadVideos() {
    const container = document.getElementById('feed-container'); 
    const fakeLoader = document.getElementById('fake-loader'); 
    const fakeProgress = document.getElementById('fake-progress');
    const isFirstTime = !localStorage.getItem('hasVisitedSosial');
    
    if (obs) obs.disconnect();
    
    try {
        if (allVideosData.length === 0) container.innerHTML = `<div class="w-full h-full relative bg-[#1A1133] animate-pulse flex flex-col justify-end p-6 flex-shrink-0 snap-start"><div class="absolute inset-0 flex items-center justify-center"><i class="fas fa-circle-notch fa-spin text-brand-accent text-4xl opacity-40"></i></div></div>`;

        const res = await fetch('/api/get-videos');
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

        for (let i = dataDariSheet.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dataDariSheet[i], dataDariSheet[j]] = [dataDariSheet[j], dataDariSheet[i]];
        }

        allVideosData = dataDariSheet;

        const urlHash = window.location.hash;
        if (urlHash.includes('sosial?vid=')) {
            const params = new URLSearchParams(urlHash.split('?')[1]);
            const targetVidId = params.get('vid');
            if (targetVidId) {
                setTimeout(() => { bukaVideoShare(targetVidId); }, 800); 
            }
        }

        currentVideoIndex = 0;
        container.innerHTML = '';
        if(typeof renderProfileVideos === 'function') renderProfileVideos();

        if (!allVideosData.length) { container.innerHTML = '<p class="text-center py-20 text-gray-500">Belum ada video.</p>'; return; }

        if (isFirstTime) {
            fakeLoader.classList.remove('hidden'); fakeLoader.classList.add('flex'); fakeProgress.style.transition = 'width 15s cubic-bezier(0.1, 0.7, 1.0, 0.1)';
            setTimeout(() => { fakeProgress.style.width = '80%'; }, 100);
            setupVideoObserver(); renderVideoBatch();
            
            const videosInDOM = document.querySelectorAll('.video-player'); 
            const targetCount = Math.min(10, videosInDOM.length);
            let readyCount = 0; let isResolved = false;
            
            const finishLoading = () => {
                if (isResolved) return; isResolved = true; fakeProgress.style.transition = 'width 0.4s ease-out'; fakeProgress.style.width = '100%';
                setTimeout(() => { fakeLoader.classList.add('opacity-0'); setTimeout(() => { fakeLoader.classList.add('hidden'); fakeLoader.classList.remove('flex'); }, 1000); localStorage.setItem('hasVisitedSosial', 'true'); }, 500);
            };
            
            const safetyTimeout = setTimeout(() => { finishLoading(); }, 15000);
            
            if (targetCount === 0) { clearTimeout(safetyTimeout); finishLoading(); }
            else {
                videosInDOM.forEach((vid, index) => {
                    if (index < targetCount) {
                        vid.setAttribute('preload', 'auto'); vid.load();
                        const onVideoReady = () => {
                            if (isResolved) return; readyCount++; const progressPercent = 80 + ((readyCount / targetCount) * 20); fakeProgress.style.width = `${progressPercent}%`;
                            if (readyCount >= targetCount) { clearTimeout(safetyTimeout); finishLoading(); }
                        };
                        if (vid.readyState >= 3) onVideoReady(); else { vid.addEventListener('canplay', onVideoReady, { once: true }); vid.addEventListener('loadeddata', onVideoReady, { once: true }); }
                    }
                });
            }
        } else { 
            setupVideoObserver(); 
            renderVideoBatch(); 
        }
    } catch (e) { 
        container.innerHTML = '<p class="text-center py-20 text-gray-500">Gagal memuat video.</p>'; 
    }
}

function renderVideoBatch() {
    const container = document.getElementById('feed-container');

    if (currentVideoIndex >= allVideosData.length) {
        currentVideoIndex = 0;
    }

    const nextBatch = allVideosData.slice(currentVideoIndex, currentVideoIndex + BATCH_SIZE);
    if (nextBatch.length === 0) return;

    const htmlString = nextBatch.map((vid) => `
    <div class="snap-start w-full h-full flex-shrink-0 relative flex items-center justify-center bg-black">
        <div class="video-inner-wrap w-full h-full relative bg-brand-dark ${!isGlobalMuted ? 'floating-focus' : ''}">
            <div class="absolute inset-0 flex items-center justify-center z-0"><div class="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div></div>
            <video class="absolute inset-0 m-auto w-full h-full object-cover video-player transition-opacity duration-500 opacity-0 z-10"
                onloadeddata="this.classList.remove('opacity-0')" loop ${isGlobalMuted ? 'muted' : ''} playsinline preload="metadata"
                ontimeupdate="updateVideoProgress(this)"
                onclick="handleVideoClick(event, this, '${vid.id}')" onerror="handleVideoError(this)">
                <source src="${vid.video_url}" type="video/mp4">
            </video>

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

            <div class="absolute bottom-6 left-2 z-40 w-[75%] pr-2 pointer-events-auto flex flex-col justify-end pb-2">
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

            <div class="absolute bottom-6 right-4 z-40 flex flex-col items-center gap-5 pointer-events-auto pb-2">
                <div class="relative cursor-pointer hover:scale-105 transition-transform" onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')">
                    <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=User&background=1A1133&color=fff'}" loading="lazy" class="w-[46px] h-[46px] rounded-full object-cover border-[1.5px] border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <button id="feed-follow-btn-${vid.user_id}" onclick="event.stopPropagation(); feedToggleFollow('${vid.user_id}', this)" class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FF007A] text-white rounded-full w-[22px] h-[22px] flex items-center justify-center border-[1.5px] border-brand-dark drop-shadow-md active:scale-90 transition-transform z-30">
                        <i class="fas fa-plus text-[10px]"></i>
                    </button>
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
                    <i class="fas fa-music absolute -top-4 -left-2 text-[10px] text-white/70 animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    <div class="w-10 h-10 rounded-full bg-[#1A1133] border-[3.5px] border-gray-800 flex items-center justify-center animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                        <img src="${vid.avatar_url || 'https://ui-avatars.com/api/?name=Music&background=1A1133&color=fff'}" class="w-4 h-4 rounded-full object-cover">
                    </div>
                </div>
            </div>
        </div>
    </div>`).join('');

    container.insertAdjacentHTML('beforeend', htmlString);
    currentVideoIndex += BATCH_SIZE;

    const videoActions = container.querySelectorAll('.snap-start:not(.data-loaded)');
    videoActions.forEach((card) => {
        card.classList.add('data-loaded');
        const vidId = card.querySelector('.like-container').dataset.vid;
        updateLikeCountUI(vidId, card.querySelector('.like-container'));
        updateCommentCountUI(vidId, card.querySelector('.comment-count-container'));
    });

    const unobservedVideos = container.querySelectorAll('.video-player:not(.observed)');
    unobservedVideos.forEach((v, i) => {
        v.classList.add('observed'); if (obs) obs.observe(v);
        if (i === unobservedVideos.length - 1) {
            const lastVideoObserver = new IntersectionObserver(entries => {
                if(entries[0].isIntersecting) { lastVideoObserver.disconnect(); renderVideoBatch(); }
            }, { threshold: 0.1 });
            lastVideoObserver.observe(v.closest('.snap-start'));
        }
    });
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

function openProfileFeed(userId, startIndex) {
    currentProfileVideos = allVideosData
        .filter(v => v.user_id === userId)
        .sort((a, b) => (b.original_index || 0) - (a.original_index || 0));

    if(currentProfileVideos.length === 0) return;
    let targetIndex = parseInt(startIndex) || 0;
    const container = document.getElementById('floating-feed-container');
    container.innerHTML = '';
    container.scrollTop = 0;

    document.querySelectorAll('.video-player').forEach(v => v.pause());

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

    setTimeout(() => {
        p.classList.add('hidden'); 
        p.classList.remove('flex');
        p.style.opacity = '1'; 
        
        document.getElementById('floating-feed-container').innerHTML = '';
        if(floatObs) floatObs.disconnect(); 

        if (!skipHistory && window.location.hash === '#profil_video') {
            history.back();
        }
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
            <div class="absolute inset-0 flex items-center justify-center z-0"><div class="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div></div>

            <video class="absolute inset-0 m-auto w-full h-full object-cover float-video-player transition-opacity duration-500 opacity-0 z-10"
                onloadeddata="this.classList.remove('opacity-0')" loop ${isGlobalMuted ? 'muted' : ''} playsinline preload="metadata"
                ontimeupdate="updateVideoProgress(this)"
                onclick="handleFloatVideoClick(event, this, '${vid.id}')">
                <source src="${vid.video_url}" type="video/mp4">
            </video>

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

            <div class="absolute bottom-0 left-0 w-full p-6 flex justify-between items-end z-20 pointer-events-none bg-gradient-to-t from-black/80 to-transparent pb-10 sm:pb-6">
                <div class="text-white drop-shadow-lg w-[75%] pointer-events-auto">
                    <p onclick="event.stopPropagation(); viewUserProfile('${vid.user_id}')" class="font-bold text-[15px] shadow-black drop-shadow-md mb-1.5 cursor-pointer hover:text-brand-info transition-colors">@${vid.nickname || "Player"}</p>
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
            const lastVideoObserver = new IntersectionObserver(entries => {
                if(entries[0].isIntersecting) { 
                    lastVideoObserver.disconnect(); 
                    renderProfileVideoBatch(3); 
                }
            }, { threshold: 0.1 });
            lastVideoObserver.observe(v.closest('.snap-start'));
        }
    });
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
// ==========================================
// FUNGSI SOSIAL & FEED VIDEO (BAGIAN 2: INTERAKSI, LIKE, HASHTAG, PROGRESS)
// ==========================================

function toggleGlobalAudio(skipHistory = false) {
    isGlobalMuted = !isGlobalMuted;
    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.muted = isGlobalMuted);

    const allWraps = document.querySelectorAll('.video-inner-wrap');
    const navBottom = document.querySelector('nav');
    const headerTop = document.querySelector('header');

    if(isGlobalMuted) {
        showToast("Suara Dimatikan", "info");
        allWraps.forEach(wrap => wrap.classList.remove('floating-focus'));
        document.body.classList.remove('video-focused');

        if(navBottom) navBottom.style.filter = 'none';
        if(headerTop) headerTop.style.filter = 'none';

        if (!skipHistory && window.location.hash === '#focused') {
            history.back();
        }
    } else {
        showToast("Suara Dinyalakan", "success");
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

function handleFloatVideoClick(event, videoElement, vidId) {
    const now = Date.now();
    const TIMESLOT = 300; 

    if (now - lastTap < TIMESLOT) {
        const card = videoElement.closest('.snap-start');
        const likeBtn = card.querySelector('.like-container button');
        
        likeVideo(vidId, likeBtn); 
        createHeartAt(event);      
    } else {
        setTimeout(() => {
            if (Date.now() - lastTap >= TIMESLOT) { 
                toggleProfileVideoAudio(videoElement); 
            }
        }, TIMESLOT);
    }
    lastTap = now;
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
        setTimeout(() => {
            if (Date.now() - lastTap >= TIMESLOT) {
                toggleGlobalAudio();
            }
        }, TIMESLOT);
    }
    lastTap = now;
}

function handleVideoError(videoElement) { 
    const container = videoElement.closest('.snap-start'); 
    if (container) container.remove(); 
}

function createHeartAt(event) {
    const heart = document.createElement('i');
    heart.className = 'fas fa-heart heart-pop';
    const x = event.clientX || (event.touches && event.touches[0].clientX) || (window.innerWidth / 2);
    const y = event.clientY || (event.touches && event.touches[0].clientY) || (window.innerHeight / 2);
    heart.style.left = `${x}px`; heart.style.top = `${y}px`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
}

// LOGIKA PROGRESS BAR & SEEK
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

// LOGIKA LIKE VIDEO
async function updateLikeCountUI(videoId, containerDiv) {
    if (!containerDiv) return;
    try {
        const { count, error } = await supabaseClient
            .from('video_likes')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', videoId);

        const countSpan = containerDiv.querySelector('.like-count-display');
        if (countSpan && !error) countSpan.innerText = count || 0;

        const icon = containerDiv.querySelector('i');
        
        if (currentUser) {
            const { data: isLikedDB } = await supabaseClient
                .from('video_likes')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id)
                .single();

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
    }
}

async function likeVideo(videoId, btn) {
    if (!currentUser) {
        showToast("Silakan login untuk menyukai video!", "error");
        if(typeof openAuthModal === 'function') return openAuthModal();
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
            const { error } = await supabaseClient.from('video_likes').delete().eq('video_id', videoId).eq('user_id', currentUser.id);
            if (error) throw error;
            localStorage.removeItem(`liked_${videoId}`);
        } else {
            icon.classList.replace('text-white', 'text-brand-accent'); 
            const { error } = await supabaseClient.from('video_likes').insert({ video_id: videoId, user_id: currentUser.id });
            if (error && error.code !== '23505') throw error;
            localStorage.setItem(`liked_${videoId}`, 'true');
        }
        updateLikeCountUI(videoId, btn.closest('.like-container') || document.getElementById('float-like-container'));
    } catch (e) {
        if (isLiked) icon.classList.replace('text-white', 'text-brand-accent');
        else icon.classList.replace('text-brand-accent', 'text-white');
        showToast(isLiked ? "Gagal membatalkan like." : "Gagal menyukai video.", "error");
    } finally {
        btn.disabled = false;
    }
}

async function deleteVideo(vidId) {
    const hapus = await customPrompt("Ketik 'HAPUS' jika ingin menghapus video ini secara PERMANEN:");
    if(hapus === 'HAPUS') {
        try {
            const configRes = await fetch('/api/get-config');
            const config = await configRes.json();

            if (config.gasUrl) {
                await fetch(config.gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'DELETE', id: vidId })
                });
            }

            allVideosData = allVideosData.filter(v => v.id !== vidId);
            newUploads = newUploads.filter(v => v.id !== vidId); 

            closeFloatingVideo();
            if(typeof renderProfileVideos === 'function') renderProfileVideos();
            showToast("Video berhasil dihapus permanen!", "success");
        } catch (err) {
            showToast("Gagal menghapus ke server: " + err.message, "error");
        }
    }
}

function shareVideo(vidId, btn) {
    const finalId = vidId && vidId !== 'undefined' ? vidId : '';
    if (!finalId) return showToast("Gagal menyalin link: ID Video tidak ditemukan", "error");

    const link = window.location.origin + window.location.pathname + '#sosial?vid=' + finalId;
    navigator.clipboard.writeText(link).then(() => {
        showToast("Link video disalin ke clipboard!", "success");
        const icon = btn.querySelector('i');
        icon.classList.replace('fa-share', 'fa-check');
        icon.classList.add('text-brand-success');
        setTimeout(() => {
            icon.classList.replace('fa-check', 'fa-share');
            icon.classList.remove('text-brand-success');
        }, 2000);
    }).catch(() => {
        showToast("Gagal menyalin link otomatis", "error");
    });
}

// LOGIKA HASHTAG GRID
function cariBerdasarkanTagar(tagar) {
    const storyModal = document.getElementById('story-viewer-modal');
    if (storyModal && !storyModal.classList.contains('hidden') && typeof closeStoryViewer === 'function') closeStoryViewer();

    if (document.body.classList.contains('video-focused')) toggleGlobalAudio(true); 

    const floatingPlayer = document.getElementById('floating-video-player');
    if (floatingPlayer && !floatingPlayer.classList.contains('hidden')) closeFloatingVideo(true); 

    const videoDitemukan = allVideosData.filter(v => v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase()));
    if (videoDitemukan.length === 0) return showToast(`Belum ada video dengan tagar #${tagar}`, "error");

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
            <video class="w-full h-full object-cover" preload="metadata"><source src="${vid.video_url}" type="video/mp4"></video>
            <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 text-white text-[10px] font-bold z-10 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                <i class="fas fa-play text-[8px]"></i> 
            </div>
        </div>
        `;
    }).join('');

    document.querySelectorAll('.video-player, .float-video-player').forEach(v => v.pause());

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => { modal.classList.remove('translate-x-full'); }, 50);
    history.pushState({ popup: 'hashtag_grid' }, null, '#tagar');
}

function closeHashtagGrid(dariTombolBack = false) {
    const modal = document.getElementById('modal-hashtag-grid');
    modal.classList.add('translate-x-full');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    if (!dariTombolBack && window.location.hash === '#tagar') history.back();
}

function playHashtagVideo(tagar, startIndex) {
    const videoDitemukan = allVideosData.filter(v => v.caption && v.caption.toLowerCase().includes('#' + tagar.toLowerCase()));
    if(videoDitemukan.length === 0) return;

    currentProfileVideos = [...videoDitemukan].reverse();
    let targetIndex = parseInt(startIndex) || 0;

    const container = document.getElementById('floating-feed-container');
    container.innerHTML = '';
    container.scrollTop = 0;

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
        if (targetCard) targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 10);

    history.pushState({ popup: 'floating_video_hashtag' }, null, '#play_tagar');
}
// ==========================================
// FUNGSI SOSIAL & FEED VIDEO (BAGIAN 3: KOMENTAR & UPLOAD)
// ==========================================

let commentSubscription = null;

// ==========================================
// LOGIKA KOMENTAR (REAL-TIME)
// ==========================================

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
        list.innerHTML = '<div class="flex justify-center mt-10"><i class="fas fa-spinner fa-spin text-brand-accent text-3xl"></i></div>';
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
                            <div class="flex items-center gap-1">
                                <b onclick="viewUserProfile('${r.user_id}')" class="text-brand-purple text-[10px] cursor-pointer hover:underline">${r.nickname}</b>
                                ${getBadgeByLevelAndVideos(hitungStatusLevel(r.exp || 0).level, allVideosData.filter(v => String(v.user_id) === String(r.user_id)).length)}
                            </div>
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
    html += `</div></div>`; 
    return html;
}

async function deleteComment(cid) {
    const konfirmasi = await customConfirm("Yakin ingin menghapus komentar ini?");
    if (!konfirmasi) return;

    const commentBox = document.getElementById(`comment-box-${cid}`);
    if (commentBox) commentBox.style.opacity = '0.5';

    try {
        const { error: deleteError } = await supabaseClient.from('comments').delete().eq('id', cid);
        if (deleteError) throw deleteError;

        if (commentBox) {
            commentBox.style.transition = 'all 0.3s ease';
            commentBox.style.opacity = '0';
            setTimeout(() => {
                commentBox.remove();
                const countEl = document.getElementById('drawer-comment-count');
                if(countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
            }, 300);
        }
        showToast("Komentar berhasil dihapus", "success");
    } catch (e) {
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
    if (input && input.value.startsWith('@')) input.value = '';
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

        const { error: insertError } = await supabaseClient.from('comments').insert(payload);
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
        showToast("Gagal kirim: " + (e.message || "Kesalahan jaringan"), "error");
    } finally {
        btn.innerHTML = iconAsli; 
        btn.disabled = false;
    }
}

async function fetchCommentLikes(cid) {
    try {
        const { count, error } = await supabaseClient.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', cid);
        const span = document.querySelector(`.comment-like-count[data-cid="${cid}"]`);
        if(span && !error) span.innerText = count || 0;
    } catch(e) {}
}

async function likeComment(cid, btn) {
    if (!currentUser) {
        showToast("Silakan login untuk menyukai komentar!", "error");
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
            icon.classList.replace('text-brand-accent', 'text-gray-500');
            const { error } = await supabaseClient.from('comment_likes').delete().eq('comment_id', cid).eq('user_id', currentUser.id);
            if(error) throw error;
            localStorage.removeItem('comment_liked_'+cid);
        } else {
            icon.classList.replace('text-gray-500', 'text-brand-accent');
            const { error } = await supabaseClient.from('comment_likes').insert({ comment_id: cid, user_id: currentUser.id });
            if(error && error.code !== '23505') throw error;
            localStorage.setItem('comment_liked_'+cid, 'true');
        }
        fetchCommentLikes(cid);
    } catch(e) {
        if (isLiked) {
            icon.classList.replace('text-gray-500', 'text-brand-accent');
        } else {
            icon.classList.replace('text-brand-accent', 'text-gray-500');
        }
        showToast(isLiked ? "Gagal membatalkan like." : "Gagal menyukai komentar.", "error");
    } finally {
        btn.disabled = false;
    }
}

async function updateCommentCountUI(videoId, containerDiv) {
    if (!containerDiv) return;
    try {
        const { count, error } = await supabaseClient.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', videoId);
        const countSpan = containerDiv.querySelector('.comment-count-display');
        if (countSpan && !error) {
            countSpan.innerText = count || 0;
        }
    } catch(e) {}
}


// ==========================================
// LOGIKA UPLOAD VIDEO
// ==========================================

window.addEventListener('beforeunload', function (e) {
    if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Upload sedang berlangsung. Yakin ingin meninggalkan halaman?';
    }
});

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

function bukaPratinjauVideo(e) {
    e.preventDefault();   
    e.stopPropagation();  

    const videoKecil = document.getElementById('video-preview-element');
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');

    if (!videoKecil.src) return;

    videoFull.src = videoKecil.src;
    modalPratinjau.classList.remove('hidden');
    modalPratinjau.classList.add('flex');
    videoFull.muted = false;
    videoFull.play();
}

function tutupPratinjauVideo() {
    const videoFull = document.getElementById('video-pratinjau-full');
    const modalPratinjau = document.getElementById('modal-pratinjau');
    
    videoFull.pause();
    videoFull.src = '';
    modalPratinjau.classList.add('hidden');
    modalPratinjau.classList.remove('flex');
}

function setPrivasiVideo(jenis, ikon) {
    privasiVideoAktif = jenis;
    document.getElementById('label-privasi-teks').innerHTML = `${jenis} <i class="fas fa-chevron-right text-[10px]"></i>`;
    document.getElementById('ikon-privasi-utama').className = `fas ${ikon} text-xs`;
    tutupPilihanPrivasi();
}

function openUploadModal() {
    if (document.body.classList.contains('video-focused')) {
        toggleGlobalAudio();
    }
    history.pushState({ popup: 'upload' }, null, '#upload');
    const m = document.getElementById('modal-upload');
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
        if (file.size > 50 * 1024 * 1024) {
            showToast("Ukuran video terlalu besar! Maksimal 50MB.", "error");
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
    if (previewVideo) { previewVideo.pause(); previewVideo.src = ''; }
    if (fileInput) fileInput.value = '';
    if (captionInput) captionInput.value = '';
}

async function prosesUploadVideo() {
    if (!currentUser) return openAuthModal();

    const fileInput = document.getElementById('input-video-file');
    const captionInput = document.getElementById('input-video-caption');
    const file = fileInput.files[0];
    const allowCommentsToggle = document.getElementById('upload-allow-comments');
    const allowComments = allowCommentsToggle ? allowCommentsToggle.checked : true;
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

        await fetch(dataUrl.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
                'x-amz-acl': 'public-read'
            }
        });

        const spreadsheetPayload = {
            ID_Video: 'vid_' + Date.now(),
            URL_Video: dataUrl.finalVideoUrl,
            id: 'vid_' + Date.now(),
            video_url: dataUrl.finalVideoUrl,
            caption: captionInput.value || "",
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

        showToast("Berhasil diposting!", "success");
        tambahExp(50); 
        fileInput.value = ''; captionInput.value = '';
        closeUploadModal();
        allVideosData = [];

        if (tabSebelumnya && tabSebelumnya !== 'sosial' && tabSebelumnya !== 'upload') {
            switchTab(tabSebelumnya);
        } else {
            switchTab('sosial');
        }
        loadVideos();

    } catch (err) {
        showToast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Posting Video';
        isUploading = false; 
    }
}
