let kategoriPPOBAktif = 'Pulsa'; 
let brandPPOBAktif = 'Semua';
let ppobOffset = 0;
const PPOB_LIMIT = 20;
let currentPpobData = [];
const kategoriPPOBList = [
    { id: 'Pulsa', icon: 'fa-mobile-alt' },
    { id: 'Data', icon: 'fa-wifi' },
    { id: 'E-Money', icon: 'fa-wallet' },
    { id: 'Games', icon: 'fa-gamepad' },
    { id: 'PLN', icon: 'fa-bolt' },
    { id: 'Voucher', icon: 'fa-ticket-alt' },
    { id: 'Masa Aktif', icon: 'fa-calendar-check' },
    { id: 'Pertagas', icon: 'fa-fire-alt' },
    { id: 'Token', icon: 'fa-key' },
    { id: 'PDAM', icon: 'fa-tint' },
    { id: 'BPJS', icon: 'fa-heartbeat' },
    { id: 'Telkom', icon: 'fa-phone-alt' },
    { id: 'Multifinance', icon: 'fa-file-invoice-dollar' },
    { id: 'Pajak', icon: 'fa-landmark' },
    { id: 'TV', icon: 'fa-tv' }
];

let globalDataLabaPPOB = []; 
let offsetLabaPPOB = 0; 
const LIMIT_PPOB = 50;

document.addEventListener('DOMContentLoaded', () => {
    renderKategoriPPOB();
    const btnLayanan = document.querySelector(`div[onclick*="executeAssistive('layanan')"]`);
    if (btnLayanan) {
        btnLayanan.addEventListener('click', () => {
            if (currentPpobData.length === 0) {
                pilihKategoriPPOB(kategoriPPOBAktif);
            }
        });
    }
    
    setTimeout(() => {
        const searchLabaPPOB = document.getElementById('cari-laba-ppob');
        if (searchLabaPPOB) {
            searchLabaPPOB.addEventListener('input', debounce((e) => {
                const keyword = e.target.value.toLowerCase();
                if (!keyword.trim()) {
                    renderLabaPPOBList(globalDataLabaPPOB);
                    return;
                }
                const filteredData = globalDataLabaPPOB.filter(tx => {
                    const matchSKU = (tx.sku_code || '').toLowerCase().includes(keyword);
                    const matchNo = (tx.customer_no || '').toLowerCase().includes(keyword);
                    const matchUser = (tx.profiles?.nickname || '').toLowerCase().includes(keyword);
                    return matchSKU || matchNo || matchUser;
                });
                renderLabaPPOBList(filteredData);
            }, 300));
        }
    }, 1000);
});

function getKategoriIcon(id) {
    const kat = kategoriPPOBList.find(k => k.id === id);
    return kat ? kat.icon : 'fa-box';
}

function renderKategoriPPOB() {
    const container = document.getElementById('ppob-category-container');
    if (!container) return;
    container.innerHTML = kategoriPPOBList.map(kat => {
        return `
        <div onclick="pilihKategoriPPOB('${kat.id}')" class="flex flex-col items-center gap-2 cursor-pointer text-center group active:scale-95 transition-all">
            <div class="w-[3.25rem] h-[3.25rem] sm:w-14 sm:h-14 rounded-[1.2rem] flex items-center justify-center transition-all bg-white/5 border border-white/10 shadow-md group-hover:bg-brand-info/20 group-hover:border-brand-info/50 text-brand-info/90 group-hover:text-brand-info">
                <i class="fas ${kat.icon} text-xl drop-shadow-sm group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="text-[9px] sm:text-[10px] font-extrabold tracking-wide break-words w-full uppercase leading-snug px-0.5 text-gray-400 group-hover:text-white transition-colors">
                ${kat.id}
            </span>
        </div>`;
    }).join('');
}

function pilihKategoriPPOB(kategori) {
    kategoriPPOBAktif = kategori;
    brandPPOBAktif = 'Semua'; 
    const mainView = document.getElementById('ppob-main-view');
    const catalogView = document.getElementById('ppob-catalog-view');
    if (mainView && catalogView) {
        mainView.classList.add('hidden');
        catalogView.classList.remove('hidden');
        catalogView.classList.add('flex');
    }
    const titleEl = document.getElementById('katalog-title');
    const iconEl = document.getElementById('katalog-icon');
    if (titleEl) titleEl.innerText = kategori;
    if (iconEl) iconEl.className = `fas ${getKategoriIcon(kategori)} text-lg`;
    history.pushState({ popup: 'katalog_ppob' }, null, '#katalogppob');
    const inputTarget = document.getElementById('ppob-target-number');
    if (inputTarget) inputTarget.value = '';
    ppobOffset = 0;
    currentPpobData = [];
    const loadMoreBtn = document.getElementById('ppob-load-more-container');
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    const productGrid = document.getElementById('ppob-product-grid');
    if (productGrid) {
        productGrid.className = 'flex flex-col gap-2.5 relative z-10';
        productGrid.innerHTML = `
            <div class="text-center py-12 text-yellow-400">
                <i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>
                <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menyiapkan Data...</span>
            </div>`;
    }
    loadBrandPPOB().then(() => loadProdukPPOB(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tutupKatalogPPOB(dariTombolBack = false) {
    if (!dariTombolBack && window.location.hash === '#katalogppob') {
        history.back();
        return;
    }
    const mainView = document.getElementById('ppob-main-view');
    const catalogView = document.getElementById('ppob-catalog-view');
    if (catalogView && mainView) {
        catalogView.classList.add('hidden');
        catalogView.classList.remove('flex');
        mainView.classList.remove('hidden');
    }
}

async function loadBrandPPOB() {
    let brandContainer = document.getElementById('ppob-brand-container');
    if (!brandContainer) {
        const grid = document.getElementById('ppob-product-grid');
        brandContainer = document.createElement('div');
        brandContainer.id = 'ppob-brand-container';
        brandContainer.className = 'flex overflow-x-auto hide-scroll gap-2 pb-4 px-1 items-center border-b border-white/5 mb-4 mt-2';
        grid.parentNode.insertBefore(brandContainer, grid);
    }
    brandContainer.innerHTML = '<div class="text-[10px] text-gray-500 animate-pulse">Memuat provider...</div>';
    try {
        const { data, error } = await supabaseClient
            .from('digiflazz_products')
            .select('brand')
            .eq('is_active', true)
            .ilike('category', `%${kategoriPPOBAktif}%`);
        if (error) throw error;
        const uniqueBrands = [...new Set(data.map(item => item.brand))].sort();
        const allBrands = ['Semua', ...uniqueBrands];
        brandContainer.innerHTML = allBrands.map(brand => {
            const isActive = brand === brandPPOBAktif;
            const activeClass = isActive 
                ? "bg-brand-info text-brand-dark border-transparent shadow-[0_0_10px_rgba(70,179,255,0.4)]" 
                : "bg-black/40 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white";
            return `
            <button onclick="pilihBrandPPOB('${escapeHTML(brand).replace(/&#39;/g, "\\'")}')" class="px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 ${activeClass}">
                ${brand}
            </button>`;
        }).join('');
    } catch (err) {
        brandContainer.innerHTML = '<div class="text-[10px] text-red-500">Gagal memuat provider</div>';
    }
}

function pilihBrandPPOB(brand) {
    brandPPOBAktif = brand;
    const brandContainer = document.getElementById('ppob-brand-container');
    if (brandContainer) {
        const buttons = brandContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerText.trim() === brand) {
                btn.className = "px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 bg-brand-info text-brand-dark border-transparent shadow-[0_0_10px_rgba(70,179,255,0.4)]";
            } else {
                btn.className = "px-4 py-1.5 rounded-full border font-bold text-[10px] whitespace-nowrap transition-all active:scale-95 shrink-0 bg-black/40 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white";
            }
        });
    }

    ppobOffset = 0;
    currentPpobData = [];
    document.getElementById('ppob-load-more-container').classList.add('hidden');
    document.getElementById('ppob-product-grid').innerHTML = `
        <div class="text-center py-10 text-brand-info">
            <i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>
            <span class="text-xs font-bold uppercase tracking-widest">Menyaring Produk...</span>
        </div>`;
    loadProdukPPOB(false);
}

async function loadProdukPPOB(isLoadMore = false) {
    const grid = document.getElementById('ppob-product-grid');
    const btnLoadMore = document.getElementById('btn-load-more-ppob');
    if (isLoadMore) {
        btnLoadMore.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat...';
        btnLoadMore.disabled = true;
    }
    try {
        const from = ppobOffset;
        const to = ppobOffset + PPOB_LIMIT - 1;
        let query = supabaseClient
            .from('digiflazz_products')
            .select('*')
            .ilike('category', `%${kategoriPPOBAktif}%`);
        if (brandPPOBAktif !== 'Semua') {
            query = query.ilike('brand', `%${brandPPOBAktif}%`);
        }
        const { data, error } = await query.order('seller_price', { ascending: true }).range(from, to);
        if (error) throw error;
        if (!isLoadMore) {
            currentPpobData = data;
        } else {
            currentPpobData = [...currentPpobData, ...data];
        }
        const wadahLoadMore = document.getElementById('ppob-load-more-container');
        if (data.length === PPOB_LIMIT) {
            ppobOffset += PPOB_LIMIT; 
            wadahLoadMore.classList.remove('hidden');
        } else {
            wadahLoadMore.classList.add('hidden'); 
        }
        renderGridPPOB();
    } catch (err) {
        console.error("PPOB Fetch Error:", err);
        if (!isLoadMore) {
            grid.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data layanan. Cek koneksi Anda.</div>';
        } else {
            showToast("Gagal memuat produk selanjutnya.", "error");
        }
    } finally {
        if (isLoadMore) {
            btnLoadMore.innerHTML = 'Tampilkan Lebih Banyak <i class="fas fa-chevron-down ml-1"></i>';
            btnLoadMore.disabled = false;
        }
    }
}

function renderGridPPOB() {
    const grid = document.getElementById('ppob-product-grid');
    grid.className = 'grid grid-cols-2 gap-3 relative z-10';
    if (currentPpobData.length === 0) {
        grid.className = 'flex flex-col gap-2.5 relative z-10';
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-center bg-black/20 rounded-2xl border border-white/5">
                <i class="fas fa-box-open text-4xl text-gray-600 mb-3"></i>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Produk Kosong</h4>
                <p class="text-[10px] text-gray-500">Layanan untuk kategori ini sedang tidak tersedia.</p>
            </div>`;
        return;
    }
    grid.innerHTML = currentPpobData.map((item, index) => {
        const isActive = item.is_active !== false; 
        const delayAnimasi = Math.min(index * 0.02, 0.2);
        const hargaCustomer = item.seller_price;
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaCustomer).replace('Rp', 'Rp ');
        let hargaCoret = hargaCustomer;
        if (hargaCustomer <= 10000) {
            hargaCoret = Math.ceil((hargaCustomer + 1500) / 500) * 500; 
        } else if (hargaCustomer <= 50000) {
            hargaCoret = Math.ceil((hargaCustomer + 2500) / 500) * 500;
        } else if (hargaCustomer <= 100000) {
            hargaCoret = Math.ceil((hargaCustomer + 3500) / 1000) * 1000;
        } else {
            hargaCoret = Math.ceil((hargaCustomer + 5000) / 1000) * 1000;
        }
        const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaCoret).replace('Rp', 'Rp ');
        const namaAman = escapeHTML(item.product_name).replace(/&#39;/g, "\\'");
        const tampilanCard = isActive 
            ? "bg-[#1C233A] hover:bg-[#232A45] hover:border-brand-info/40 cursor-pointer active:scale-95" 
            : "bg-black/40 opacity-60 grayscale cursor-not-allowed border-red-500/20";
        const aksiKlik = isActive 
            ? `onclick="pemicuBeliPPOB('${item.sku_code}', '${namaAman}', ${hargaCustomer})"` 
            : `onclick="showToast('Mohon maaf, produk ini sedang gangguan dari pusat.', 'error')"`;
        const badgeGangguan = !isActive 
            ? `<div class="absolute -top-[1px] -left-[1px] bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-br-xl rounded-tl-[1rem] shadow-md z-10 tracking-wider">GANGGUAN</div>` 
            : '';
        return `
        <div ${aksiKlik} style="animation-delay: ${delayAnimasi}s; opacity: 0;" class="border border-white/5 p-3.5 sm:p-4 rounded-[1.2rem] flex flex-col justify-between transition-all smooth-reveal shadow-sm relative h-full min-h-[95px] overflow-hidden ${tampilanCard}">
            ${badgeGangguan}
            <div class="mb-3 relative z-0 ${!isActive ? 'mt-3' : ''}">
                <h4 class="text-[12px] sm:text-[13px] font-extrabold text-white leading-snug line-clamp-3">${namaAman}</h4>
            </div>
            <div class="mt-auto relative z-0 flex flex-col">
                <span class="text-gray-500 line-through text-[9px] sm:text-[10px] font-medium opacity-70 mb-0.5">${formatHargaCoret}</span>
                <span class="text-[13px] sm:text-[14px] font-black ${isActive ? 'text-[#EE4D2D]' : 'text-gray-400'} tracking-tight block">${formatHarga}</span>
            </div>
        </div>`;
    }).join('');
}

function pemicuBeliPPOB(skuCode, namaProduk, harga) {
    const targetEl = document.getElementById('ppob-target-number');
    const targetNo = targetEl.value.trim();
    if (!targetNo) {
        targetEl.focus();
        return showToast("Mohon isi Nomor Tujuan atau ID Game terlebih dahulu!", "error");
    }
    const cleanTargetNo = targetNo.replace(/[^a-zA-Z0-9-]/g, '');
    prosesBeliPPOB(skuCode, cleanTargetNo, harga, namaProduk);
}

async function prosesBeliPPOB(skuCode, targetNo, harga, namaProduk) {
    if (!currentUser) return showToast("Silakan login dulu untuk membeli!", "error");
    const { data: profile } = await supabaseClient.rpc('get_my_profile_v1');
    const saldoSaatIni = profile?.balance || 0;
    if (saldoSaatIni < harga) {
        return customAlert(`Saldo Anda tidak cukup!\n\nSaldo: Rp ${saldoSaatIni.toLocaleString('id-ID')}\nHarga: Rp ${harga.toLocaleString('id-ID')}\n\nSilakan deposit/Top Up saldo Anda terlebih dahulu.`);
    }
    const konfirmasi = await customConfirm(`Beli ${namaProduk} untuk nomor:\n${targetNo}\n\nTotal: Rp ${harga.toLocaleString('id-ID')} (Potong Saldo)?`);
    if (!konfirmasi) return;
    history.pushState({ popup: 'pembayaran' }, null, '#pembayaran');
    switchTab('pembayaran');
    const wadahPembayaran = document.getElementById('qris-container');
    if (wadahPembayaran) {
        wadahPembayaran.innerHTML = `
        <div class="text-center flex flex-col items-center w-full mt-6">
            <div class="relative flex flex-col items-center mb-6">
                <div class="absolute inset-0 bg-brand-info opacity-30 animate-pulse rounded-full" style="filter: blur(30px);"></div>
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-28 h-28 relative z-10 splash-logo-anim drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]" alt="Loading">
            </div>
            <p class="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase mt-4 animate-pulse">Menghubungkan ke Server...</p>
        </div>`;
    }
    try {
        const response = await fetch('/api/digiflazz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'buy', user_id: currentUser.id, sku_code: skuCode, customer_no: targetNo })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.detail || "Transaksi dibatalkan sistem.");
        }
        showToast("Pesanan berhasil diteruskan ke server!", "success");
        if (typeof updateUiSaldoSeller === 'function') updateUiSaldoSeller();
        if (typeof fetchSaldoDanMutasi === 'function') fetchSaldoDanMutasi();
        if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
        if (wadahPembayaran) {
            const digiStatus = result.data ? result.data.status : 'Diproses';
            const refId = result.data ? result.data.ref_id : 'Sistem';
            const sn = result.data && result.data.sn ? result.data.sn : 'Sedang dicek oleh server...';
            let displayStatus = digiStatus;
            if (digiStatus === 'Pending') displayStatus = 'Diproses';
            const isSukses = (digiStatus === 'Sukses' || digiStatus === 'Pending');
            const warnaTema = isSukses ? 'brand-success' : 'red-500';
            const iconTema = isSukses ? 'fa-check' : 'fa-times';
            wadahPembayaran.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4 text-center modal-anim w-full relative z-10">
                    <div class="relative w-28 h-28 mb-6 mt-4">
                        <div id="glow-icon-ppob" class="absolute inset-0 bg-${warnaTema} rounded-full animate-ping opacity-20"></div>
                        <div id="bg-icon-ppob" class="w-full h-full bg-${warnaTema}/20 rounded-full flex items-center justify-center border border-${warnaTema}/50 backdrop-blur-md">
                            <i id="ikon-tengah-ppob" class="fas ${iconTema} text-5xl text-${warnaTema}" style="filter: drop-shadow(0 0 15px rgba(37,211,102,0.8));"></i>
                        </div>
                    </div>
                    <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Status: <span id="status-teks-ppob">${displayStatus}</span></h2>
                    <p class="text-gray-400 text-[11px] mb-6 leading-relaxed px-4">Pembayaran <b>${namaProduk}</b> senilai <b class="text-white">Rp ${harga.toLocaleString('id-ID')}</b> telah diproses sistem.</p>
                    <div class="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-left mb-6 relative shadow-inner">
                        <span id="badge-struk-ppob" class="absolute -top-2.5 left-4 bg-${warnaTema} text-brand-dark text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">STRUK PPOB</span>
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 mt-2 border-b border-white/5 pb-2">
                            <span>Nomor Tujuan</span>
                            <span class="font-mono text-white font-bold">${targetNo}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 border-b border-white/5 pb-2">
                            <span>Ref ID</span>
                            <span class="font-mono text-white font-bold">${refId}</span>
                        </div>
                        <div class="flex justify-between items-start text-[10px] text-gray-400 mt-2">
                            <span>SN / Catatan</span>
                            <span id="sn-teks-ppob" class="font-mono text-brand-info font-bold text-right ml-4 leading-relaxed">${sn}</span>
                        </div>
                    </div>
                    <button type="button" onclick="tutupLayarSuksesPPOB(this)" class="w-full bg-white/5 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/10 hover:bg-white/10 active:scale-95 transition-all">Tutup Halaman</button>
                </div>
            `;
            if (refId !== 'Sistem') {
                const updateUIFinalStatus = (newData) => {
                    const isNowSukses = newData.status === 'Sukses';
                    if (isNowSukses && typeof autoSetorKeNikky === 'function') {
                        autoSetorKeNikky(20, `[Auto] Laba PPOB 20% - SN: ${newData.sn || 'Tanpa SN'}`);
                    }
                    const elStatus = document.getElementById('status-teks-ppob');
                    if (elStatus) elStatus.innerText = newData.status;
                    const elSN = document.getElementById('sn-teks-ppob');
                    if (elSN) elSN.innerText = newData.sn || 'Tanpa SN';
                    if (!isNowSukses) {
                        const glow = document.getElementById('glow-icon-ppob');
                        if (glow) glow.className = 'absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20';
                        const bg = document.getElementById('bg-icon-ppob');
                        if (bg) bg.className = 'w-full h-full bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 backdrop-blur-md';
                        const icon = document.getElementById('ikon-tengah-ppob');
                        if (icon) {
                            icon.className = 'fas fa-times text-5xl text-red-500';
                            icon.style.filter = 'drop-shadow(0 0 15px rgba(239,68,68,0.8))';
                        }
                        const badge = document.getElementById('badge-struk-ppob');
                        if (badge) badge.className = 'absolute -top-2.5 left-4 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider';
                    }
                };
                if (window.ppobPolling) clearInterval(window.ppobPolling);
                if (window.channelPPOBGlobal) supabaseClient.removeChannel(window.channelPPOBGlobal);
                window.channelPPOBGlobal = supabaseClient.channel(`tunggu-ppob-${refId}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'riwayat_ppob', filter: `ref_id=eq.${refId}` }, (payload) => {
                        if (payload.new.status === 'Sukses' || payload.new.status === 'Gagal') {
                            updateUIFinalStatus(payload.new);
                            supabaseClient.removeChannel(window.channelPPOBGlobal);
                            if (window.ppobPolling) clearInterval(window.ppobPolling);
                        }
                    }).subscribe();
                window.ppobPolling = setInterval(async () => {
                    try {
                        const { data } = await supabaseClient.from('riwayat_ppob').select('status, sn').eq('ref_id', refId).single();
                        if (data && (data.status === 'Sukses' || data.status === 'Gagal')) {
                            updateUIFinalStatus(data);
                            clearInterval(window.ppobPolling);
                            supabaseClient.removeChannel(window.channelPPOBGlobal);
                        }
                    } catch (e) {}
                }, 2000);
                setTimeout(() => { if (window.ppobPolling) clearInterval(window.ppobPolling); }, 120000);
            }
        }
    } catch (err) {
        showToast(err.message, "error");
        setTimeout(() => history.back(), 1500); 
    }
}

async function eksekusiSinkronisasiPPOB() {
    if (!userProfile || userProfile.is_super_admin !== true) {
        return showToast("Akses Ditolak! Hanya Super Admin yang bisa melakukan ini.", "error");
    }
    const konfirmasi = await customConfirm("Yakin ingin melakukan sinkronisasi data produk Digiflazz sekarang?\n\nSistem akan menarik data terbaru dari pusat. Proses ini mungkin memakan waktu beberapa detik.");
    if (!konfirmasi) return;
    const btn = document.getElementById('btn-sync-digiflazz');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-base"></i> Sedang Menyinkronkan...';
    btn.disabled = true;
    showToast("Memulai sinkronisasi data PPOB...", "info");
    try {
        const response = await fetch('/api/digiflazz?action=sync', {
            method: 'GET'
        });
        const result = await response.json();
        if (response.ok) {
            showToast("Sinkronisasi PPOB berhasil diselesaikan!", "success");
            if (typeof loadProdukPPOB === 'function') {
                ppobOffset = 0;
                currentPpobData = [];
                loadProdukPPOB(false);
            }
        } else {
            throw new Error(result.error || result.message || "Gagal sinkronisasi dari server.");
        }
    } catch (error) {
        console.error("Error Sinkronisasi:", error);
        showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadRiwayatLabaPPOB(isRefresh = false, isLoadMore = false) {
    const listContainer = document.getElementById('admin-laba-list');
    if (!listContainer) return;
    if (isRefresh) {
        showToast("Merekap riwayat PPOB...", "info");
        offsetLabaPPOB = 0;
        globalDataLabaPPOB = [];
    } else if (!isLoadMore) {
        offsetLabaPPOB = 0;
        globalDataLabaPPOB = [];
        listContainer.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-brand-info text-2xl mb-2"></i><br><span class="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Merekap Transaksi PPOB...</span></div>';
    }
    const btnLoadMore = document.getElementById('btn-load-more-ppob-admin');
    if (btnLoadMore) {
        btnLoadMore.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat...';
        btnLoadMore.disabled = true;
    }
    try {
        const { data, error } = await supabaseClient
            .from('riwayat_ppob')
            .select('*, profiles!riwayat_ppob_user_id_fkey(nickname)')
            .order('created_at', { ascending: false })
            .range(offsetLabaPPOB, offsetLabaPPOB + LIMIT_PPOB - 1);
        if (error) throw error;
        if (data && data.length > 0) {
            globalDataLabaPPOB = [...globalDataLabaPPOB, ...data];
            offsetLabaPPOB += LIMIT_PPOB;
            let hasMore = data.length === LIMIT_PPOB;
            renderLabaPPOBList(globalDataLabaPPOB, hasMore);
        } else {
            if (!isLoadMore) {
                globalDataLabaPPOB = [];
                renderLabaPPOBList([]); 
            } else {
                if (btnLoadMore) btnLoadMore.remove(); 
            }
        }
    } catch (e) {
        if (!isLoadMore) {
            listContainer.innerHTML = '<div class="text-center py-6 text-xs text-red-500">Gagal memuat riwayat PPOB.</div>';
        } else if (btnLoadMore) {
            btnLoadMore.innerHTML = 'Gagal, Coba Lagi';
            btnLoadMore.disabled = false;
        }
    }
}

function renderLabaPPOBList(dataArray, hasMore = false) {
    const listContainer = document.getElementById('admin-laba-list');
    let totalHariIni = 0;
    let totalBulanIni = 0;
    let totalKeseluruhan = 0;
    const today = new Date();
    const todayString = today.toLocaleDateString('id-ID');
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const groupedData = {};
    if (dataArray && dataArray.length > 0) {
        dataArray.forEach(tx => {
            const isSukses = String(tx.status).toUpperCase() === 'SUKSES';
            const laba = isSukses ? 100 : 0;
            const txDate = new Date(tx.created_at);
            const dateString = txDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const simpleDateString = txDate.toLocaleDateString('id-ID');
            totalKeseluruhan += laba;
            if (simpleDateString === todayString) {
                totalHariIni += laba;
            }
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                totalBulanIni += laba;
            }
            if (!groupedData[dateString]) {
                groupedData[dateString] = {
                    dateLabel: dateString,
                    totalLabaHariIni: 0,
                    transactions: []
                };
            }
            groupedData[dateString].totalLabaHariIni += laba;
            groupedData[dateString].transactions.push(tx);
        });
    }
    const labaOwner = totalKeseluruhan * 0.8;
    const labaNikky = totalKeseluruhan * 0.2;
    const summaryHtml = `
    <div class="bg-gradient-to-br from-[#161B2E] to-[#0A0E17] rounded-2xl p-4 border border-brand-info/30 mb-5 shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-10"><i class="fas fa-chart-pie text-6xl text-brand-info"></i></div>
        <h3 class="text-[11px] font-black text-white uppercase tracking-widest mb-3 border-b border-white/10 pb-2 relative z-10 flex items-center gap-2">
            <i class="fas fa-hand-holding-usd text-brand-info"></i> Pembagian Laba PPOB
        </h3>
        <div class="grid grid-cols-2 gap-3 mb-3 relative z-10">
            <div class="bg-black/40 p-2.5 rounded-xl border border-brand-info/20 shadow-inner">
                <p class="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Laba Hari Ini</p>
                <h4 class="text-xs font-black text-brand-success">+ Rp ${totalHariIni.toLocaleString('id-ID')}</h4>
            </div>
            <div class="bg-black/40 p-2.5 rounded-xl border border-brand-info/20 shadow-inner">
                <p class="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Laba Bulan Ini</p>
                <h4 class="text-xs font-black text-brand-success">+ Rp ${totalBulanIni.toLocaleString('id-ID')}</h4>
            </div>
        </div>
        <div class="bg-white/5 rounded-xl p-3 border border-white/10 relative z-10 flex justify-between items-center">
            <div class="flex-1 border-r border-white/10">
                <p class="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Owner (80%)</p>
                <h4 class="text-xs font-black text-brand-success">Rp ${labaOwner.toLocaleString('id-ID')}</h4>
            </div>
            <div class="flex-1 text-right">
                <p class="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Nikky (20%)</p>
                <h4 class="text-xs font-black text-brand-info">Rp ${labaNikky.toLocaleString('id-ID')}</h4>
            </div>
        </div>
        <div class="mt-3 text-center text-[10px] text-gray-400">
            Total Laba Semua Waktu: <b class="text-white">Rp ${totalKeseluruhan.toLocaleString('id-ID')}</b>
        </div>
    </div>
    `;
    let htmlOutput = '';
    if (!dataArray || dataArray.length === 0) {
        htmlOutput = `
        <div class="flex flex-col items-center justify-center py-12 text-center bg-black/20 rounded-2xl border border-white/5">
            <i class="fas fa-search-minus text-4xl text-gray-600 mb-3"></i>
            <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Riwayat Tidak Ditemukan</h4>
            <p class="text-[10px] text-gray-500">Belum ada transaksi PPOB yang selesai.</p>
        </div>`;
    } else {
        for (const dateKey in groupedData) {
            const grup = groupedData[dateKey];
            htmlOutput += `
            <div class="mb-5 bg-black/20 rounded-[1.2rem] p-3 border border-white/5 shadow-md">
                <div class="flex justify-between items-center mb-3 pb-3 border-b border-white/10 px-1">
                    <h3 class="text-[11px] font-extrabold text-white flex items-center gap-2">
                        <i class="far fa-calendar-alt text-brand-info text-sm"></i> ${grup.dateLabel}
                    </h3>
                    <div class="text-right">
                        <span class="text-[8px] text-gray-400 uppercase tracking-widest block mb-0.5">Laba Bersih</span>
                        <span class="text-xs font-black text-brand-success">+ Rp ${grup.totalLabaHariIni.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2.5">
                    ${grup.transactions.map(tx => {
                        const status = String(tx.status).toUpperCase();
                        let statusBadge = '';
                        if (status === 'SUKSES') statusBadge = '<span class="bg-brand-success/20 text-brand-success px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-brand-success/30">SUKSES</span>';
                        else if (status === 'PENDING') statusBadge = '<span class="bg-brand-info/20 text-brand-info px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-brand-info/30">PROSES</span>';
                        else statusBadge = '<span class="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-red-500/30">GAGAL</span>';
                        const hargaJual = Number(tx.price || 0); 
                        const laba = status === 'SUKSES' ? 100 : 0; 
                        const hargaModal = hargaJual > 0 ? (hargaJual - 100) : 0;
                        const jam = new Date(tx.created_at).toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'}) + ' WIB';
                        const pembeli = tx.profiles?.nickname || 'Player';
                        return `
                        <div class="bg-[#161B2E] border border-white/5 p-3 rounded-[1.2rem] flex flex-col gap-2 relative shadow-md hover:bg-[#1C233A] transition-colors">
                            <div class="flex justify-between items-start border-b border-white/5 pb-2">
                                <div class="flex-1 pr-2">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-[9px] bg-black/40 text-brand-info px-2 py-0.5 rounded-md border border-brand-info/30 font-mono">${tx.sku_code || 'PPOB'}</span>
                                        ${statusBadge}
                                    </div>
                                    <h4 class="text-[11px] font-bold text-white leading-snug">${tx.customer_no}</h4>
                                    <p class="text-[9px] text-gray-500 mt-0.5">Pembeli: @${pembeli}</p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-[9px] text-gray-500 mb-0.5">${jam}</p>
                                    <h4 class="text-[11px] font-black ${status === 'SUKSES' ? 'text-brand-success drop-shadow-[0_0_5px_rgba(37,211,102,0.4)]' : 'text-gray-500'}">+Rp ${laba.toLocaleString('id-ID')}</h4>
                                </div>
                            </div>
                            <div class="flex justify-between items-center bg-white/5 rounded-lg p-2.5">
                                <div class="flex flex-col">
                                    <span class="text-[8px] text-gray-400 uppercase tracking-wider">Modal</span>
                                    <span class="text-[10px] font-mono text-gray-400">Rp ${hargaModal.toLocaleString('id-ID')}</span>
                                </div>
                                <i class="fas fa-arrow-right text-gray-600 text-xs"></i>
                                <div class="flex flex-col text-right">
                                    <span class="text-[8px] text-gray-400 uppercase tracking-wider">Dibayar User</span>
                                    <span class="text-[10px] font-mono font-bold text-white">Rp ${hargaJual.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>`
                    }).join('')}
                </div>
            </div>`;
        }
    }
    listContainer.innerHTML = summaryHtml + htmlOutput;
    if (hasMore) {
        listContainer.innerHTML += `
        <div class="text-center mt-2 mb-6">
            <button id="btn-load-more-ppob-admin" onclick="loadRiwayatLabaPPOB(false, true)" class="bg-brand-info/10 text-brand-info border border-brand-info/30 px-6 py-3 rounded-full text-[11px] font-bold active:scale-95 transition-all hover:bg-brand-info hover:text-brand-dark w-full shadow-sm">
                Lihat Riwayat Sebelumnya <i class="fas fa-chevron-down ml-1"></i>
            </button>
        </div>
        `;
    }
}

window.tutupLayarSuksesPPOB = (btnElement) => {
    btnElement.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Menutup...';
    btnElement.disabled = true;
    if (window.ppobPolling) { clearInterval(window.ppobPolling); window.ppobPolling = null; }
    if (window.channelPPOBGlobal) { supabaseClient.removeChannel(window.channelPPOBGlobal); window.channelPPOBGlobal = null; }
    if (typeof updateSaldoGlobal === 'function') updateSaldoGlobal();
    if (typeof fetchProfile === 'function') fetchProfile();
    const layarPembayaran = document.getElementById('pembayaran');
    if (layarPembayaran) {
        layarPembayaran.style.transition = 'opacity 0.2s ease';
        layarPembayaran.style.opacity = '0';
        setTimeout(() => {
            layarPembayaran.classList.remove('active');
            layarPembayaran.style.opacity = '1';
            switchTab('layanan');
            history.replaceState(null, null, '#layanan');
        }, 200);
    } else {
        switchTab('layanan');
        history.replaceState(null, null, '#layanan');
    }
};
