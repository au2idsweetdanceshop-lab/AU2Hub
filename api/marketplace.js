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
    if(typeof renderKategoriTabs === 'function') renderKategoriTabs(xoftwareProdukGlobal);
    let dataFiltered = typeof xoftwareProdukGlobal !== 'undefined' ? xoftwareProdukGlobal : [];
    if (kat !== 'Semua') {
        dataFiltered = dataFiltered.filter(p => getCategoryName(p) === kat);
    }
    if(typeof renderProdukXoftware === 'function') renderProdukXoftware(dataFiltered);
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
        if(typeof currentPasarQty !== 'undefined') currentPasarQty = 1;
    } else {
        if(typeof currentPasarQty !== 'undefined') currentPasarQty = parsed;
    }
    if(typeof updateHargaPasarLayar === 'function') updateHargaPasarLayar();
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
    if (currentUser && badgeDiscount && typeof allVideosData !== 'undefined') {
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
    const priceDisplay = document.getElementById('detail-product-price');
    if(priceDisplay) {
        priceDisplay.innerHTML = `<span class="text-gray-500 line-through text-sm font-medium mr-2">Rp ${totalHargaCoret.toLocaleString('id-ID')}</span>Rp ${totalPrice.toLocaleString('id-ID')}`;
    }
}

function salinNominal() {
    const elAsli = document.getElementById('nominal-asli');
    if(!elAsli) return;
    const nominalMurni = elAsli.value;
    const btnSalin = document.getElementById('btn-salin');
    const teksAsli = btnSalin.innerHTML;
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(nominalMurni); }
    else { let tempInput = document.createElement("textarea"); tempInput.value = nominalMurni; tempInput.style.position = "fixed"; tempInput.style.left = "-9999px"; document.body.appendChild(tempInput); tempInput.select(); try { document.execCommand("copy"); } catch (err) {} document.body.removeChild(tempInput); }
    btnSalin.innerHTML = '<i class="fas fa-check mr-1.5"></i> Tersalin';
    btnSalin.classList.replace('text-brand-info', 'text-brand-success'); btnSalin.classList.replace('bg-brand-info/10', 'bg-brand-success/10'); btnSalin.classList.replace('border-brand-info/30', 'border-brand-success/30');
    setTimeout(() => { btnSalin.innerHTML = teksAsli; btnSalin.classList.replace('text-brand-success', 'text-brand-info'); btnSalin.classList.replace('bg-brand-success/10', 'bg-brand-info/10'); btnSalin.classList.replace('border-brand-success/30', 'border-brand-info/30'); }, 2000);
}

function salinIdTransaksi() {
    const refEl = document.getElementById('detail-ref-id');
    if(!refEl) return;
    const idText = refEl.innerText;
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

async function copyLinkLaciAktif(btn) {
    const currentUrl = window.location.href; 
    const elTitle = document.getElementById('detail-product-title');
    const judulProduk = elTitle ? elTitle.innerText : "Layanan AU2Hub";
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
