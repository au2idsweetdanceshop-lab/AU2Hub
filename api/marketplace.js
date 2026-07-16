let globalDataPasar = [];
let idPenjualAktif = null;
let kategoriPasarAktif = 'Semua';
let fileJualanArray = []; 
let currentPasarPrice = 0;
let currentPasarQty = 1;
let currentPasarVariation = "";
const HARGA_PER_HARI = 333;
const HARGA_CORET_PER_HARI = 1000;
let qtyVipHari = 1;
let qtyVipBulan = 1;
let paketSellerTerpilih = 'tahunan';
let editFileArray = [];
let existingImagesEdit = [];
let deletedImagesEdit = [];
let tokoTabAktif = 'dashboard';
let sellerChartInstance = null;
let globalDataBukuKas = []; 
let offsetBukuKas = 0; 
const LIMIT_KAS = 50;  
let adminTabAktif = 'dashboard';
let isAdminProcessing = false;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const searchInput = document.getElementById('cari-pasar');
        if (searchInput) searchInput.addEventListener('input', debounce(terapkanFilterPasar, 300));
        const jualanHarga = document.getElementById('jualan-harga');
        const editHarga = document.getElementById('edit-produk-harga');
        if(jualanHarga) jualanHarga.addEventListener('input', formatInputRupiah);
        if(editHarga) editHarga.addEventListener('input', formatInputRupiah);
        
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
    }, 1000);
});

function renderKategoriPasarTabs(data) {
    const container = document.getElementById('kategori-pasar-grid');
    if (!container) return;
    let categories = new Set();
    data.forEach(p => {
        if (p.category) categories.add(p.category);
    });
    let arrKategori = ['Semua', ...Array.from(categories).sort()];
    container.innerHTML = arrKategori.map(k => {
        const isActive = k === kategoriPasarAktif;
        let logoUrl = "https://nos.wjv-1.neo.id/au2hub/icons/" + k.toLowerCase().trim().replace(/\s+/g, '-') + ".png"; 
        return `
        <div onclick="pilihKategoriPasar('${k}')" class="flex flex-col items-center gap-2 cursor-pointer text-center group active:scale-95 transition-all">
            <div class="w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all border ${isActive ? 'bg-[#EE4D2D] border-[#EE4D2D] shadow-lg shadow-[#EE4D2D]/30' : 'bg-brand-card border-white/5 shadow-md group-hover:border-brand-success'}">
                <img src="${logoUrl}" alt="${k}" class="w-7 h-7 object-contain ${isActive ? 'brightness-100' : 'opacity-80 group-hover:opacity-100 transition-opacity'}"
                onerror="this.src='https://img.icons8.com/neon/96/folder-invoices.png'">
            </div>
            <span class="text-[9px] font-extrabold tracking-wide break-words w-full uppercase leading-snug px-0.5 ${isActive ? 'text-[#EE4D2D]' : 'text-gray-400 group-hover:text-white'}">
                ${k}
            </span>
        </div>
        `;
    }).join('');
}

function pilihKategoriPasar(kat) {
    kategoriPasarAktif = kat;
    const searchInput = document.getElementById('cari-pasar');
    if (searchInput) searchInput.value = '';
    renderKategoriPasarTabs(globalDataPasar); 
    terapkanFilterPasar();
}

function filterKategoriPasar(kat, btnEl) {
    kategoriPasarAktif = kat;
    document.querySelectorAll('.btn-kat-pasar').forEach(btn => {
        btn.className = "btn-kat-pasar whitespace-nowrap bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold hover:bg-white/10 transition-all";
    });
    btnEl.className = "btn-kat-pasar whitespace-nowrap bg-brand-success border border-transparent text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-[0_0_10px_rgba(37,211,102,0.3)] transition-all";
    terapkanFilterPasar();
}

function terapkanFilterPasar() {
    const keyword = (document.getElementById('cari-pasar')?.value || '').toLowerCase();
    const filteredData = globalDataPasar.filter(item => {
        const matchSearch = item.title.toLowerCase().includes(keyword) || 
                            item.category.toLowerCase().includes(keyword) || 
                            (item.profiles?.nickname || '').toLowerCase().includes(keyword);
        const matchKat = (kategoriPasarAktif === 'Semua') ? true : (item.category === kategoriPasarAktif || item.category.includes(kategoriPasarAktif));
        return matchSearch && matchKat;
    });
    renderGridPasar(filteredData);
}

function formatInputRupiah(e) {
    let val = e.target.value.replace(/[^,\d]/g, '').toString();
    let split = val.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    e.target.value = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
}

function renderGridPasar(dataList, targetId = 'grid-pasar-player') {
    const grid = document.getElementById(targetId);
    if (!grid) return;
    grid.innerHTML = '';

    if (dataList.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-10 text-gray-500 text-xs flex flex-col items-center"><i class="fas fa-store-slash text-4xl mb-3 opacity-30"></i><span>Tidak ada produk di kategori ini.</span></div>';
        return;
    }
    const htmlCards = dataList.map((item, index) => {
        const sellerAvatar = item.profiles?.avatar_url || 'https://placehold.co/100x100/1a1133/2BD975?text=AV';
        const sellerName = item.profiles?.nickname || 'Anonim';
        let baseHarga = item.price;
        if (item.fee_ditanggung_pembeli) {
            let potongan = 0;
            if (baseHarga <= 10000) potongan = 500;
            else if (baseHarga <= 25000) potongan = 1000;
            else if (baseHarga <= 50000) potongan = 2000;
            else if (baseHarga <= 99999) potongan = 3000;
            else if (baseHarga <= 499999) potongan = 10000;
            else if (baseHarga <= 1499999) potongan = 20000;
            else if (baseHarga <= 1999999) potongan = 25000;
            else potongan = 35000;
            baseHarga += potongan;
        }
        const hargaCustomer = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaCustomer);
        let hargaCoret = Math.ceil((hargaCustomer * 1.3) / 1000) * 1000; 
        if (hargaCustomer > 100000) hargaCoret = Math.ceil((hargaCustomer * 1.2) / 5000) * 5000;
        if (hargaCustomer <= 5000) hargaCoret = hargaCustomer + 2500;
        
        const sellerExp = item.profiles?.exp || 0;
        const level = Math.floor(Math.sqrt(sellerExp / 100)) + 1;
        const sellerVideoCount = allVideosData ? allVideosData.filter(v => String(v.user_id) === String(item.user_id)).length : 0;
        let badgeHtml = '';
        if (level >= 10 || sellerVideoCount >= 100) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
        else if (level >= 5 || sellerVideoCount >= 50) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
        else if (level >= 3 || sellerVideoCount >= 25) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
        else if (level >= 2 || sellerVideoCount >= 10) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
        
        let rawThumb = item.image_url || '';
        let fotoPertama = rawThumb.split(',')[0].trim();
        if (!fotoPertama) fotoPertama = 'https://placehold.co/400x400/1a1133/2BD975?text=PASAR';
        const isAutoItem = item.category === 'Akun' || item.category === 'Item' || item.category === 'APK Premium';
        const sisaStok = isAutoItem && item.stock_list ? item.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
        const badgeStok = isAutoItem 
            ? `<span class="absolute top-2 left-2 bg-black/80 text-[8px] font-extrabold ${sisaStok > 0 ? 'text-brand-info border-brand-info/30' : 'text-red-500 border-red-500/50'} px-2 py-0.5 rounded-md backdrop-blur-sm border shadow-md tracking-wider">STOK: ${sisaStok}</span>` 
            : `<span class="absolute top-2 left-2 bg-brand-success/90 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10 shadow-md uppercase tracking-wider">${item.category}</span>`;
       const delayAnimasi = Math.min(index * 0.02, 0.4);
        return `
        <div onclick="bukaDetailPasar('${item.id}')" style="animation-delay: ${delayAnimasi}s; opacity: 0;" class="bg-brand-card rounded-2xl border border-white/5 overflow-hidden flex flex-col hover:border-brand-success/30 transition-all smooth-reveal shadow-lg cursor-pointer group">
            <div class="relative w-full aspect-square bg-black/40 overflow-hidden">
                <img src="${fotoPertama}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-0" onerror="this.src='https://placehold.co/400x400/1a1133/2BD975?text=PASAR'">
                <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-20 h-20 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'">
                ${badgeStok}
            </div>
            <div class="p-3 flex-1 flex flex-col justify-between gap-1">
                <div>
                    <div class="font-extrabold text-xs text-white leading-snug line-clamp-2 mb-1 min-h-[2.4rem]">${item.title}</div>
                    <div class="flex items-center gap-1.5 mb-1">
                        <img src="${sellerAvatar}" class="w-3.5 h-3.5 rounded-full object-cover border border-white/10 shrink-0">
                        <span class="text-[9px] text-gray-400 truncate w-full font-medium flex items-center gap-1">${sellerName} <span class="scale-[0.8] origin-left inline-flex shrink-0">${badgeHtml}</span></span>
                    </div>
                </div>
                <div class="mt-auto">
                    <div class="text-[9px] text-[#EE4D2D] font-bold mb-0.5 flex items-center gap-1">
                        <i class="fas fa-bolt text-[8px]"></i> 
                        Instan 1 Detik
                    </div>
                    <div class="flex flex-col items-start gap-px">
                        <div class="text-gray-500 line-through text-[9px] font-medium opacity-60">Rp ${hargaCoret.toLocaleString('id-ID')}</div>
                        <div class="text-[#EE4D2D] font-extrabold text-sm tracking-tight">${formatHarga}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    grid.innerHTML = htmlCards;
}

function previewGambarJualan(input) {
    if (input.files && input.files.length > 0) {
        const newFiles = Array.from(input.files);
        let isSizeError = false;
        newFiles.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) isSizeError = true;
            else fileJualanArray.push(file); 
        });
        if (isSizeError) showToast("Beberapa foto berukuran > 5MB diabaikan.", "error");
        renderPreviewJualan();
        input.value = ''; 
    }
}

function renderPreviewJualan() {
    const previewContainer = document.getElementById('preview-container-jualan');
    previewContainer.innerHTML = '';
    if (fileJualanArray.length === 0) {
        previewContainer.classList.add('hidden');
        return;
    }
    fileJualanArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = e => {
            previewContainer.innerHTML += `
                <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-white/20 shadow-md">
                    <img src="${e.target.result}" class="w-full h-full object-cover">
                    <button onclick="hapusPreviewJualan(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
        }
        reader.readAsDataURL(file);
    });
    previewContainer.classList.remove('hidden');
}

function hapusPreviewJualan(index) {
    fileJualanArray.splice(index, 1);
    renderPreviewJualan();
}

async function prosesPostingJualan() {
    const nama = document.getElementById('jualan-nama').value.trim();
    const hargaInputClean = document.getElementById('jualan-harga').value.replace(/\./g, '');
    const harga = parseInt(hargaInputClean);
    const kategori = document.getElementById('jualan-kategori').value;
    const deskripsi = document.getElementById('jualan-deskripsi').value.trim();
    const stockList = document.getElementById('jualan-stock').value.trim();
    const snkInput = document.getElementById('jualan-snk') ? document.getElementById('jualan-snk').value.trim() : null;
    const btn = document.getElementById('btn-submit-jualan');
    if (!nama || !harga || isNaN(harga) || !deskripsi) return showToast("Mohon lengkapi formulir!", "error");
    if (harga < 1000) return showToast("Harga minimal adalah Rp 1.000", "error");
    if (fileJualanArray.length === 0) return showToast("Wajib menyertakan minimal 1 foto produk!", "error");
    if ((kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') && !stockList) {
        return showToast("Wajib mengisi List Stok untuk kategori ini!", "error");
    }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses Upload...';
    btn.disabled = true;
    try {
        let uploadedUrls = [];
        showToast(`Mengunggah ${fileJualanArray.length} foto ke satelit...`, "info");
        const uploadPromises = fileJualanArray.map(async (file, index) => {
            const pathLengkap = `${currentUser.id}/pasar/foto_${index}_${Date.now()}`;
            const { data: { session } } = await supabaseClient.auth.getSession();
            const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent(pathLengkap)}&filetype=${encodeURIComponent(file.type)}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const dataUrl = await resUrl.json();
            await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
            return dataUrl.finalVideoUrl;
        });
        uploadedUrls = await Promise.all(uploadPromises);
        const finalImageUrl = uploadedUrls.join(',');
        const isFeePembeli = document.getElementById('jualan-fee-bearer').value === 'pembeli';
        const { error } = await supabaseClient.from('player_products').insert({
            user_id: currentUser.id, 
            title: nama, 
            price: harga, 
            category: kategori, 
            description: deskripsi, 
            image_url: finalImageUrl,
            stock_list: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? stockList : null,
            snk: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? snkInput : null,
            fee_ditanggung_pembeli: isFeePembeli
        });
        if (error) throw error;
        showToast("Dagangan berhasil diposting!", "success");
        tutupModalJualBarang();
        document.getElementById('jualan-nama').value = '';
        document.getElementById('jualan-harga').value = '';
        document.getElementById('jualan-deskripsi').value = '';
        document.getElementById('input-foto-jualan').value = '';
        document.getElementById('jualan-stock').value = '';
        fileJualanArray = [];
        document.getElementById('preview-container-jualan').innerHTML = '';
        document.getElementById('preview-container-jualan').classList.add('hidden');
        loadPasarPlayer(true);
        if (currentUser) {
            loadProdukSaya();
        }
    } catch (err) {
        showToast("Gagal memposting: " + err.message, "error");
    } finally {
        btn.innerHTML = 'Posting Dagangan';
        btn.disabled = false;
    }
}

async function shareProdukPasar(btn) {
    const currentUrl = window.location.href;
    const judulProduk = document.getElementById('pasar-detail-nama').innerText || "Produk Pasar Player";
    let totalPrice = currentPasarPrice * currentPasarQty;
    let baseHargaCoret = Math.ceil((currentPasarPrice * 1.3) / 1000) * 1000;
    if (currentPasarPrice > 100000) baseHargaCoret = Math.ceil((currentPasarPrice * 1.2) / 5000) * 5000;
    if (currentPasarPrice <= 5000) baseHargaCoret = currentPasarPrice + 2500;
    let totalHargaCoret = baseHargaCoret * currentPasarQty;
    const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        .format(totalPrice).replace(/\s|\u00A0/g, '').replace('Rp', 'Rp.');
    const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        .format(totalHargaCoret).replace(/\s|\u00A0/g, '').replace('Rp', 'Rp.');
    const teksShare = `Cek ${judulProduk} seharga ~${formatHargaCoret}~ hanya menjadi *${formatHarga}* di AU2Hub sekarang! Aman via Admin.`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AU2Hub Pasar Player',
                text: teksShare,
                url: currentUrl
            });
        } catch (err) { console.log("Membagikan dibatalkan."); }
    } else {
        navigator.clipboard.writeText(`${teksShare} ${currentUrl}`).then(() => {
            showToast("Link produk berhasil disalin!", "success");
            const icon = btn.querySelector('i');
            icon.className = 'fas fa-check text-brand-success';
            setTimeout(() => { icon.className = 'fas fa-share-alt text-sm'; }, 2000);
        }).catch(() => { showToast("Gagal menyalin link", "error"); });
    }
}

function ubahJumlahPasar(delta) {
    currentPasarQty = Math.max(1, currentPasarQty + delta);
    document.getElementById('pasar-detail-qty').value = currentPasarQty;
    updateHargaPasarLayar();
}

function validasiJumlahPasar(el) {
    let parsed = parseInt(el.value);
    if (isNaN(parsed) || parsed < 1) { parsed = 1; el.value = 1; }
    currentPasarQty = parsed; updateHargaPasarLayar();
}

function pilihVariasiPasar(namaVariasi, hargaVariasi) {
    currentPasarVariation = namaVariasi;
    currentPasarPrice = parseFloat(hargaVariasi) || 0;
    if (window.renderVariasiPasarButtons) window.renderVariasiPasarButtons(namaVariasi);
    updateHargaPasarLayar();
}

function updateHargaPasarLayar() {
    let totalPrice = currentPasarPrice * currentPasarQty;
    const toggleRekber = document.getElementById('toggle-rekber');
    const infoFee = document.getElementById('info-fee-rekber');
    const angkaFee = document.getElementById('angka-fee-rekber');
    let feeRekber = 0;
    if (toggleRekber && toggleRekber.checked) {
        if (totalPrice <= 99999) feeRekber = 5000;
        else if (totalPrice <= 499999) feeRekber = 10000;
        else if (totalPrice <= 1499999) feeRekber = 20000;
        else if (totalPrice <= 1999999) feeRekber = 25000;
        else feeRekber = 35000;
        
        if (angkaFee) angkaFee.innerText = `+ Rp ${feeRekber.toLocaleString('id-ID')}`;
        if (infoFee) {
            infoFee.classList.remove('hidden');
            infoFee.classList.add('flex');
        }
        totalPrice += feeRekber; 
    } else if (infoFee) {
        infoFee.classList.add('hidden');
        infoFee.classList.remove('flex');
    }
    let baseHargaCoret = Math.ceil((currentPasarPrice * 1.3) / 1000) * 1000;
    if (currentPasarPrice > 100000) baseHargaCoret = Math.ceil((currentPasarPrice * 1.2) / 5000) * 5000;
    if (currentPasarPrice <= 5000) baseHargaCoret = currentPasarPrice + 2500;
    let totalHargaCoret = baseHargaCoret * currentPasarQty;
    const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice);
    const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalHargaCoret);
    document.getElementById('pasar-detail-harga').innerHTML = `<span class="text-gray-500 line-through text-sm font-medium mr-2">${formatHargaCoret}</span>${formatHarga}`;
}

function bukaDetailPasar(idProduk) {
    const produk = globalDataPasar.find(item => item.id === idProduk);
    if (!produk) return;
    idPenjualAktif = produk.user_id; 
    currentPasarQty = 1;
    currentPasarVariation = "";
    document.getElementById('pasar-detail-qty').value = "1";
    const toggleRekber = document.getElementById('toggle-rekber');
    if (toggleRekber) toggleRekber.checked = false;
    const isAutoItem = produk.category === 'Akun' || produk.category === 'Item' || produk.category === 'APK Premium';
    const sisaStok = isAutoItem && produk.stock_list ? produk.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
    const wadahQty = document.getElementById('pasar-qty-container');
    if (wadahQty) {
        wadahQty.classList.replace('hidden', 'flex');
    }
    let baseHarga = Number(produk.price);
    if (produk.fee_ditanggung_pembeli) {
        let potongan = 0;
        if (baseHarga <= 10000) potongan = 500;
        else if (baseHarga <= 25000) potongan = 1000;
        else if (baseHarga <= 50000) potongan = 2000;
        else if (baseHarga <= 99999) potongan = 3000;
        else if (baseHarga <= 499999) potongan = 10000;
        else if (baseHarga <= 1499999) potongan = 20000;
        else if (baseHarga <= 1999999) potongan = 25000;
        else potongan = 35000;
        baseHarga += potongan;
    }
    const hargaCustomer = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
    currentPasarPrice = hargaCustomer;
    let rawVariasi = produk.variations || produk.variasi || [];
    let arrVariasi = [];
    if (Array.isArray(rawVariasi)) {
        rawVariasi.forEach(v => {
            if (typeof v === 'object' && v !== null) {
                let hargaVarAsli = parseFloat(v.harga || v.price || 0);
                if (produk.fee_ditanggung_pembeli) {
                    let potongan = 0;
                    if (hargaVarAsli <= 10000) potongan = 500;
                    else if (hargaVarAsli <= 25000) potongan = 1000;
                    else if (hargaVarAsli <= 50000) potongan = 2000;
                    else if (hargaVarAsli <= 99999) potongan = 3000;
                    else if (hargaVarAsli <= 499999) potongan = 10000;
                    else if (hargaVarAsli <= 1499999) potongan = 20000;
                    else if (hargaVarAsli <= 1999999) potongan = 25000;
                    else potongan = 35000;
                    hargaVarAsli += potongan;
                }
                let hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.007) + 500);
                arrVariasi.push({ name: v.nama_variasi || v.name, price: hargaVarMarkup });
            }
        });
    }
    const variasiContainer = document.getElementById('pasar-variasi-container');
    const variasiList = document.getElementById('pasar-variasi-list');
    if (variasiContainer && variasiList) {
        if (arrVariasi.length > 0) {
            variasiContainer.classList.remove('hidden');
            currentPasarPrice = arrVariasi[0].price;
            currentPasarVariation = arrVariasi[0].name;
            window.renderVariasiPasarButtons = function(activeName) {
                variasiList.innerHTML = arrVariasi.map(v => {
                    let vName = escapeHTML(v.name).replace(/&#39;/g, "\\'");
                    let isActive = (vName === activeName);
                    let baseClass = "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ";
                    let activeClass = isActive ? "bg-[#EE4D2D]/20 border-[#EE4D2D] text-[#EE4D2D] shadow-[0_0_10px_rgba(238,77,45,0.3)]" : "bg-black/30 border-white/10 text-gray-400 hover:border-brand-info/50 hover:text-white";
                    return `<div onclick="pilihVariasiPasar('${vName}', ${v.price})" class="${baseClass} ${activeClass}">${vName}</div>`;
                }).join('');
            };
            window.renderVariasiPasarButtons(currentPasarVariation);
        } else {
            variasiContainer.classList.add('hidden');
        }
    }
    const carousel = document.getElementById('pasar-detail-carousel');
    let arrFoto = produk.image_url ? produk.image_url.split(',').map(img => img.trim()).filter(img => img !== "") : ['https://placehold.co/400x400/1a1133/2BD975?text=PASAR'];
    carousel.innerHTML = arrFoto.map((imgUrl, index) => `
        <div class="w-full h-full flex-shrink-0 snap-center relative cursor-pointer flex items-center justify-center" onclick="bukaGalleryPasar('${produk.id}', ${index})">
            <img src="${imgUrl}" draggable="false" class="w-full h-full object-cover pointer-events-none relative z-0" onerror="this.src='https://placehold.co/400x400/1a1133/2BD975?text=PASAR'">
            <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-36 h-36 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg" onerror="this.style.display='none'">

        </div>
    `).join('');
    const counterBadge = document.getElementById('pasar-carousel-counter');
    if (arrFoto.length > 1) {
        counterBadge.classList.remove('hidden');
        document.getElementById('pasar-total-idx').innerText = arrFoto.length;
        carousel.onscroll = () => { document.getElementById('pasar-current-idx').innerText = Math.round(carousel.scrollLeft / carousel.clientWidth) + 1; };
    } else { counterBadge.classList.add('hidden'); carousel.onscroll = null; }
    updateHargaPasarLayar(); 
    document.getElementById('pasar-detail-kategori').innerHTML = `${produk.category} ${isAutoItem ? ` &bull; Sisa: ${sisaStok}` : ''}`;
    document.getElementById('pasar-detail-nama').innerText = produk.title;
    let deskripsiBisaDiklik = (produk.description || "-").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="text-brand-info underline font-bold hover:text-white transition-colors">$1</a>');
    const pDescPasar = document.getElementById('pasar-detail-deskripsi');
    const btnDescPasar = document.getElementById('btn-toggle-desc-pasar');
    pDescPasar.innerHTML = deskripsiBisaDiklik.replace(/\n/g, '<br>');
    if(pDescPasar && btnDescPasar) { 
        pDescPasar.classList.add('line-clamp-4'); 
        btnDescPasar.innerHTML = 'Lihat Selengkapnya ▼'; 
    }
    
    const sellerExp = produk.profiles?.exp || 0;
    const sellerLevel = Math.floor(Math.sqrt(sellerExp / 100)) + 1;
    const sellerVideoCount = allVideosData ? allVideosData.filter(v => String(v.user_id) === String(produk.user_id)).length : 0;
    let badgeHtml = '';
    if (sellerLevel >= 10 || sellerVideoCount >= 100) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
    else if (sellerLevel >= 5 || sellerVideoCount >= 50) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
    else if (sellerLevel >= 3 || sellerVideoCount >= 25) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
    else if (sellerLevel >= 2 || sellerVideoCount >= 10) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
    
    document.getElementById('pasar-detail-avatar').src = produk.profiles?.avatar_url || 'https://placehold.co/100x100/1a1133/2BD975?text=AV';
    document.getElementById('pasar-detail-penjual').innerHTML = `${produk.profiles?.nickname || 'Anonim'} <span class="scale-[0.85] origin-left inline-flex ml-1">${badgeHtml}</span>`;
    const btnBeli = document.getElementById('btn-beli-pasar');
    btnBeli.onclick = () => {
        if (isAutoItem && currentPasarQty > sisaStok) {
            return showToast(`Stok tidak mencukupi! Sisa stok otomatis hanya ${sisaStok}.`, "error");
        }
        let namaProdukFinal = produk.title;
        if (currentPasarVariation !== "") namaProdukFinal += ` - ${currentPasarVariation}`;
        if (currentPasarQty > 1) namaProdukFinal += ` (x${currentPasarQty})`;
        let totalHargaCheckout = currentPasarPrice * currentPasarQty;
        const toggleRekber = document.getElementById('toggle-rekber');
        if (toggleRekber && toggleRekber.checked) {
            let feeR = 0;
            if (totalHargaCheckout <= 99999) feeR = 5000;
            else if (totalHargaCheckout <= 499999) feeR = 10000;
            else if (totalHargaCheckout <= 1499999) feeR = 20000;
            else if (totalHargaCheckout <= 1999999) feeR = 25000;
            else feeR = 35000;
            totalHargaCheckout += feeR;
            namaProdukFinal += ` [+Rekber]`;
        }
        checkoutPasar(namaProdukFinal, totalHargaCheckout, produk.id);
    };
    if (currentUser && currentUser.id === produk.user_id) {
        btnBeli.innerHTML = '<i class="fas fa-ban"></i> Ini Produk Anda'; btnBeli.disabled = true; btnBeli.className = "w-full bg-gray-600 text-white py-3.5 rounded-xl font-extrabold uppercase text-sm z-30 relative";
    } else if (isAutoItem && sisaStok === 0) {
        btnBeli.innerHTML = '<i class="fas fa-box-open"></i> Stok Habis'; btnBeli.disabled = true; btnBeli.className = "w-full bg-red-500/50 text-white py-3.5 rounded-xl font-extrabold uppercase text-sm z-30 relative cursor-not-allowed border border-red-500/30";
    } else {
        btnBeli.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang'; btnBeli.disabled = false; btnBeli.className = "w-full bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] text-white py-3.5 rounded-xl font-extrabold active:scale-95 transition-all uppercase text-sm shadow-[0_4px_15px_rgba(238,77,45,0.3)] z-30 relative";
    }
    document.getElementById('modal-detail-pasar').classList.replace('hidden', 'flex');
    history.pushState({ popup: 'detail_pasar' }, null, '#detailpasar?id=' + produk.id);
}

function tutupDetailPasar(dariTombolBackHP = false) {
    if (!dariTombolBackHP && window.location.hash.startsWith('#detailpasar')) {
        history.back();
        return;
    }
    document.getElementById('modal-detail-pasar').classList.replace('flex', 'hidden');
}

function lihatProfilPenjual() {
    if (idPenjualAktif) {
        tutupDetailPasar();
        viewUserProfile(idPenjualAktif);
    }
}

function chatPenjualPasar() {
    if (idPenjualAktif) {
        tutupDetailPasar();
        kirimPesanPribadi(idPenjualAktif);
    }
}

async function checkoutPasar(namaFinal, totalHarga, id) {
    const btnBeli = document.getElementById('btn-beli-pasar');
    btnBeli.disabled = true;
    btnBeli.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memverifikasi...';
    showToast("Memverifikasi pesanan ke server...", "info");
    try {
        const { data: produkAsli, error } = await supabaseClient.from('player_products').select('user_id').eq('id', id).single();
        if (error || !produkAsli) throw new Error("Barang tidak ditemukan di server.");
        tutupDetailPasar(true);
        checkoutXoftwarePay("[PASAR] " + namaFinal, totalHarga, "Pembelian item dari Pasar Player.", produkAsli.user_id, id);
    } catch (err) {
        showToast("Gagal memverifikasi keamanan: " + err.message, "error");
    } finally {
        btnBeli.disabled = false;
        btnBeli.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang';
    }
}

function bukaModalLangganan() {
    history.pushState({ popup: 'langganan' }, null, '#langganan');
    const modal = document.getElementById('modal-langganan-seller');
    modal.classList.replace('hidden', 'flex');
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function tutupModalLangganan(dariTombolBack = false) {
    const modal = document.getElementById('modal-langganan-seller');
    modal.style.opacity = '0';
    if (!dariTombolBack && window.location.hash === '#langganan') {
        history.back();
    }
    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
        modal.style.opacity = '1';
    }, 300);
}

function ubahQtyVIP(tipe, delta) {
    if (tipe === 'harian') {
        qtyVipHari = Math.max(1, qtyVipHari + delta);
        document.getElementById('qty-vip-hari').value = qtyVipHari;
    } else {
        qtyVipBulan = Math.max(1, qtyVipBulan + delta);
        document.getElementById('qty-vip-bulan').value = qtyVipBulan;
    }
    updateUIPaket(tipe);
}

function inputQtyVIP(tipe, val) {
    let parsed = parseInt(val);
    if (tipe === 'harian') {
        qtyVipHari = (isNaN(parsed) || parsed < 1) ? 1 : parsed; 
    } else {
        qtyVipBulan = (isNaN(parsed) || parsed < 1) ? 1 : parsed; 
    }
    updateUIPaket(tipe);
}

function validasiQtyVIP(tipe, el) {
    let parsed = parseInt(el.value);
    if (isNaN(parsed) || parsed < 1) { 
        parsed = 1; 
        el.value = 1; 
    } else {
        el.value = parsed;
    }
    if (tipe === 'harian') qtyVipHari = parsed;
    else qtyVipBulan = parsed;
    updateUIPaket(tipe);
}

function updateUIPaket(tipe) {
    if (tipe === 'harian') {
        const hargaAsli = HARGA_PER_HARI * qtyVipHari;
        const hargaCoret = HARGA_CORET_PER_HARI * qtyVipHari;
        document.getElementById('harga-harian').innerHTML = `Rp ${hargaAsli.toLocaleString('id-ID')}<span class="text-[10px] text-gray-500 font-normal"> /${qtyVipHari} hari</span>`;
        document.getElementById('coret-harian').innerText = `Rp ${hargaCoret.toLocaleString('id-ID')}`;
    } else if (tipe === 'bulanan') {
        const totalHari = qtyVipBulan * 30;
        const hargaAsli = HARGA_PER_HARI * totalHari;
        const hargaCoret = HARGA_CORET_PER_HARI * totalHari;
        document.getElementById('harga-bulanan').innerHTML = `Rp ${hargaAsli.toLocaleString('id-ID')}<span class="text-[10px] text-gray-500 font-normal"> /${totalHari} hari</span>`;
        document.getElementById('coret-bulanan').innerText = `Rp ${hargaCoret.toLocaleString('id-ID')}`;
    }
    pilihPaketSeller(tipe);
}

function pilihPaketSeller(tipe) {
    paketSellerTerpilih = tipe;
    let hargaAwal = 0;
    if (tipe === 'harian') {
        hargaAwal = HARGA_PER_HARI * qtyVipHari;
    } else if (tipe === 'bulanan') {
        hargaAwal = HARGA_PER_HARI * 30 * qtyVipBulan;
    } else {
        hargaAwal = HARGA_PER_HARI * 365;
    }
    const biayaGateway = 500 + Math.floor(hargaAwal * 0.007);
    const hargaFinal = hargaAwal + biayaGateway;
    const btnLangganan = document.getElementById('btn-bayar-langganan');
    if(btnLangganan) {
        btnLangganan.innerHTML = `
            <span>Berlangganan Rp ${hargaFinal.toLocaleString('id-ID')}</span>
            <span class="text-[9px] font-normal text-white/80 normal-case mt-0.5">(Termasuk Admin QRIS: Rp ${biayaGateway.toLocaleString('id-ID')})</span>
        `;
    }
    ['harian', 'bulanan', 'tahunan'].forEach(t => {
        const rEl = document.getElementById(`radio-${t}`);
        if(rEl) rEl.querySelector('div').classList.replace('scale-100', 'scale-0');
        const card = document.getElementById(`card-${t}`);
        if(card) {
            card.classList.add('border-white/10');
            card.classList.remove('border-brand-success', 'border-brand-info', 'border-brand-accent', 
                                  'shadow-[0_0_15px_rgba(37,211,102,0.2)]', 
                                  'shadow-[0_0_15px_rgba(70,179,255,0.2)]', 
                                  'shadow-[0_0_15px_rgba(255,0,122,0.2)]');
        }
    });
    const selectedRadio = document.getElementById(`radio-${tipe}`);
    if(selectedRadio) selectedRadio.querySelector('div').classList.replace('scale-0', 'scale-100');
    const activeCard = document.getElementById(`card-${tipe}`);
    if(activeCard) {
        activeCard.classList.remove('border-white/10');
        if (tipe === 'harian') {
            activeCard.classList.add('border-brand-success', 'shadow-[0_0_15px_rgba(37,211,102,0.2)]');
        } else if (tipe === 'bulanan') {
            activeCard.classList.add('border-brand-info', 'shadow-[0_0_15px_rgba(70,179,255,0.2)]');
        } else {
            activeCard.classList.add('border-brand-accent', 'shadow-[0_0_15px_rgba(255,0,122,0.2)]');
        }
    }
}

async function lanjutkanBayarLangganan() {
    tutupModalLangganan(true);
    let namaPaket = '';
    let hargaAwal = 0;
    if (paketSellerTerpilih === 'harian') {
        namaPaket = `[VIP] Langganan Seller ${qtyVipHari} Hari`;
        hargaAwal = HARGA_PER_HARI * qtyVipHari;
    } else if (paketSellerTerpilih === 'bulanan') {
        namaPaket = `[VIP] Langganan Seller ${qtyVipBulan} Bulan`;
        hargaAwal = HARGA_PER_HARI * 30 * qtyVipBulan;
    } else {
        namaPaket = '[VIP] Langganan Seller 1 Tahun';
        hargaAwal = HARGA_PER_HARI * 365;
    }
    const biayaGateway = 500 + Math.floor(hargaAwal * 0.007);
    const hargaFinal = hargaAwal + biayaGateway;
    checkoutXoftwarePay(namaPaket, hargaFinal, "Aktivasi VIP Seller AU2Hub", null, null);
}

function tutupModalJualBarang(dariTombolBackHP = false) {
    const modal = document.getElementById('modal-jual-barang');
    modal.style.opacity = '0'; 
    if (!dariTombolBackHP && window.location.hash === '#jualbarang') {
        history.back();
    }
    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
        modal.style.opacity = '1'; 
        document.getElementById('jualan-nama').value = '';
        document.getElementById('jualan-harga').value = '';
        document.getElementById('jualan-deskripsi').value = '';
        document.getElementById('input-foto-jualan').value = '';
        const jualanStock = document.getElementById('jualan-stock');
        if(jualanStock) jualanStock.value = '';
        fileJualanArray = [];
        const previewContainer = document.getElementById('preview-container-jualan');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.add('hidden');
        }
    }, 300); 
}

function toggleStockInput(kategori, wadahId) {
    const wadah = document.getElementById(wadahId);
    if(!wadah) return;
    if (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') {
        wadah.classList.remove('hidden');
        wadah.classList.add('block');
    } else {
        wadah.classList.add('hidden');
        wadah.classList.remove('block');
    }
}

function bukaModalJualBarang() {
    if (!currentUser) return showToast("Silakan login dulu untuk berjualan!", "error");
    let isVip = userProfile?.is_seller === true;
    let expiredAt = userProfile?.seller_expired_at ? new Date(userProfile.seller_expired_at) : new Date(0);
    const now = new Date();
    if (!isVip || expiredAt < now) {
        bukaModalLangganan();
        return;
    }
    history.pushState({ popup: 'jual_barang' }, null, '#jualbarang');
    const modal = document.getElementById('modal-jual-barang');
    modal.classList.replace('hidden', 'flex');
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => modal.style.opacity = '1', 10);
}

async function loadTokoSaya() {
    const loggedOut = document.getElementById('toko-logged-out');
    const loggedIn = document.getElementById('toko-logged-in');
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
    if (!currentUser) {
        loggedOut.querySelector('h3').innerText = "Akses Tertutup";
        loggedOut.querySelector('p').innerText = "Silakan login untuk mulai mengelola etalase toko dan melacak pesanan masuk Anda.";
        loggedOut.querySelector('button').innerText = "LOGIN SEKARANG";
        loggedOut.querySelector('button').onclick = openAuthModal;
        loggedOut.classList.remove('hidden');
        loggedOut.classList.add('flex');
        loggedIn.classList.add('hidden');
        return;
    }
    let isVip = userProfile?.is_seller === true;
    let expiredAt = userProfile?.seller_expired_at ? new Date(userProfile.seller_expired_at) : new Date(0);
    const now = new Date();
    if (!isVip || expiredAt < now) {
        loggedOut.querySelector('h3').innerText = "Akses Khusus VIP Seller";
        loggedOut.querySelector('p').innerText = "Tingkatkan akunmu menjadi VIP Seller untuk mengelola toko, menambah etalase, dan menerima pesanan.";
        loggedOut.querySelector('button').innerText = "BERLANGGANAN SEKARANG";
        loggedOut.querySelector('button').onclick = bukaModalLangganan;
        loggedOut.classList.remove('hidden');
        loggedOut.classList.add('flex');
        loggedIn.classList.add('hidden');
        return;
    }
    loggedOut.classList.add('hidden');
    loggedOut.classList.remove('flex');
    loggedIn.classList.remove('hidden');
    loggedIn.classList.add('flex');
    if (elExpired && elBadge) {
        const sisaHari = Math.ceil((expiredAt - now) / (1000 * 60 * 60 * 24));
        const formatTanggal = expiredAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        elExpired.innerHTML = `
            <span class="flex items-center gap-2 mt-0.5">
                <span><i class="fas fa-clock text-[#FF5722] mr-1"></i> Aktif s/d: <b class="text-white">${formatTanggal}</b> (${sisaHari} Hari)</span>
                <button onclick="bukaModalLangganan()" class="bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white px-2 py-0.5 rounded text-[8px] font-extrabold border border-brand-accent/30 active:scale-95 transition-all uppercase tracking-wider">
                    Perpanjang
                </button>
            </span>
        `;
        elExpired.classList.remove('hidden');
        elExpired.style.display = '';
        elBadge.classList.remove('hidden');
        elBadge.style.display = ''; 
    }
    await updateUiSaldoSeller();
    switchTokoTab(tokoTabAktif);
    updateLinkToko(); 
}

async function updateUiSaldoSeller() {
    try {
        const { data: profile } = await supabaseClient.rpc('get_my_profile_v1');
        const elSaldoAktif = document.getElementById('toko-saldo-aktif');
        if (elSaldoAktif) elSaldoAktif.innerText = 'Rp ' + (profile?.balance || 0).toLocaleString('id-ID');
        const elSaldoAngka = document.getElementById('saldo-angka');
        if (elSaldoAngka) elSaldoAngka.innerText = (profile?.balance || 0).toLocaleString('id-ID');
        const { data: stats, error } = await supabaseClient.rpc('get_seller_stats', {
            p_seller_id: currentUser.id
        });
        if (error) throw error;
        const elTertahan = document.getElementById('toko-saldo-tertahan');
        if (elTertahan) elTertahan.innerText = 'Rp ' + (stats.total_tertahan || 0).toLocaleString('id-ID');
        const elTotalGMV = document.getElementById('seller-stat-gmv');
        if (elTotalGMV) elTotalGMV.innerText = 'Rp ' + (stats.total_gmv || 0).toLocaleString('id-ID');
        const elTotalBersih = document.getElementById('seller-stat-bersih');
        if (elTotalBersih) elTotalBersih.innerText = 'Rp ' + (stats.total_bersih || 0).toLocaleString('id-ID');
        const elTotalTerjual = document.getElementById('seller-stat-terjual');
        if (elTotalTerjual) elTotalTerjual.innerText = (stats.total_terjual || 0) + ' Pesanan';
        const labels = [];
        const dataBerhasil = [0, 0, 0, 0, 0, 0, 0];
        const dataPending = [0, 0, 0, 0, 0, 0, 0];
        const dataGagal = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
        }
        const past7Days = new Date(today);
        past7Days.setDate(today.getDate() - 6);
        past7Days.setHours(0, 0, 0, 0);
        const { data: orders } = await supabaseClient
            .from('orders_player')
            .select('price, status, created_at')
            .eq('seller_id', currentUser.id)
            .gte('created_at', past7Days.toISOString());
        if (orders && orders.length > 0) {
            orders.forEach(order => {
                const orderDate = new Date(order.created_at);
                const orderDateString = orderDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                const index = labels.indexOf(orderDateString);
                if (index !== -1) {
                    const nominal = Number(order.price) || 0;
                    const status = String(order.status).toUpperCase();
                    if (status === 'SELESAI' || status === 'SUCCESS' || status === 'PROSES') {
                        dataBerhasil[index] += nominal;
                    } else if (status === 'PENDING') {
                        dataPending[index] += nominal;
                    } else if (status === 'DIBATALKAN' || status === 'FAILED' || status === 'DITOLAK') {
                        dataGagal[index] += nominal;
                    }
                }
            });
        }
        if (typeof renderGrafikSeller === 'function') {
            renderGrafikSeller(labels, dataBerhasil, dataPending, dataGagal);
        }
    } catch(e) {
        console.error("Gagal update UI Saldo Seller:", e);
    }
}

async function loadPasarPlayer(forceRefresh = false) {
    const gridPasar = document.getElementById('grid-pasar-player');
    if (!gridPasar) return;
    if (forceRefresh) {
        gridPasar.innerHTML = '<div class="col-span-2 text-center py-10 text-brand-success"><i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br><span class="text-xs font-bold uppercase tracking-widest">Memuat Ulang...</span></div>';
    }
    try {
        const { data, error } = await supabaseClient
            .from('player_products')
            .select('*, profiles!fk_player_products_user_id(nickname, avatar_url, exp, is_seller, seller_expired_at)') 
            .order('created_at', { ascending: false });
        if (error) throw error;
        const waktuSekarang = new Date();
        const produkSellerAktif = (data || []).filter(item => {
            if (!item.profiles) return false;
            const isVip = item.profiles.is_seller === true;
            const expiredAt = item.profiles.seller_expired_at ? new Date(item.profiles.seller_expired_at) : new Date(0);
            return isVip && (expiredAt > waktuSekarang);
        });
        globalDataPasar = produkSellerAktif;
        renderKategoriPasarTabs(globalDataPasar);
        const urlHash = window.location.hash.substring(1);
        if (urlHash.startsWith('detailpasar?id=')) {
            const produkId = urlHash.split('=')[1];
            if (produkId) {
                setTimeout(() => { bukaDetailPasar(produkId); }, 800); 
            }
            terapkanFilterPasar(); 
        } else if (!urlHash.startsWith('tokopublik?seller=') && !urlHash.startsWith('pasar?seller=')) {
            terapkanFilterPasar();
        }
    } catch (err) {
        console.error("ERROR DETAIL PASAR PLAYER:", err);
        gridPasar.innerHTML = '<div class="col-span-2 text-center py-10 text-red-500 text-xs">Gagal menarik data pasar. Cek koneksi.</div>';
    }
}

async function bukaModalSaldoDompet() {
    if (!currentUser) return showToast("Silakan login dulu!", "error");
    history.pushState({ popup: 'dompet' }, null, '#dompet');
    const modal = document.getElementById('modal-saldo-dompet');
    if (modal.closeTimer) clearTimeout(modal.closeTimer);
    modal.classList.replace('hidden', 'flex');
    fetchSaldoDanMutasi();
}

function tutupModalSaldoDompet(dariTombolBack = false) {
    const modal = document.getElementById('modal-saldo-dompet');
    if (!dariTombolBack && window.location.hash === '#dompet') {
        history.back();
    }
    modal.closeTimer = setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
    }, 300);
}

async function loadProdukSaya() {
    const container = document.getElementById('toko-produk-container');
    if(!container) return;
    container.innerHTML = '<div class="text-center py-10 text-xs text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mb-2 text-orange-500"></i><br>Memuat etalase...</div>';
    try {
        const { data, error } = await supabaseClient
            .from('player_products')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
            container.innerHTML = data.map(item => {
                const hargaAsli = Number(item.price);
                let pendapatanBersih = 0;
                let hargaTampilEtalase = hargaAsli;
                if (item.fee_ditanggung_pembeli) {
                    pendapatanBersih = hargaAsli;
                    let potongan = 0;
                    if (hargaAsli <= 10000) potongan = 500;
                    else if (hargaAsli <= 25000) potongan = 1000;
                    else if (hargaAsli <= 50000) potongan = 2000;
                    else if (hargaAsli <= 99999) potongan = 3000;
                    else if (hargaAsli <= 499999) potongan = 10000;
                    else if (hargaAsli <= 1499999) potongan = 20000;
                    else if (hargaAsli <= 1999999) potongan = 25000;
                    else potongan = 35000;
                    hargaTampilEtalase = hargaAsli + potongan;
                } else {
                    let potongan = 0;
                    if (hargaAsli <= 10000) potongan = 500;
                    else if (hargaAsli <= 25000) potongan = 1000;
                    else if (hargaAsli <= 50000) potongan = 2000;
                    else if (hargaAsli <= 99999) potongan = 3000;
                    else if (hargaAsli <= 499999) potongan = 10000;
                    else if (hargaAsli <= 1499999) potongan = 20000;
                    else if (hargaAsli <= 1999999) potongan = 25000;
                    else potongan = 35000;
                    pendapatanBersih = hargaAsli - potongan;
                }
                const foto = (item.image_url || '').split(',')[0];
                const isAutoItem = item.category === 'Akun' || item.category === 'Item' || item.category === 'APK Premium';
                const sisaStok = isAutoItem && item.stock_list ? item.stock_list.split(/\r?\n/).filter(s=>s.trim() !== '').length : 0;
                const stokBadge = isAutoItem ? `<span class="text-[8px] font-bold bg-black/80 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/20 absolute top-1.5 right-1.5 shadow-md">Sisa: ${sisaStok}</span>` : '';
               return `
                <div class="bg-[#161B2E] border border-transparent rounded-[1.2rem] p-4 shadow-lg mb-3 transition-all hover:border-white/5">
                    <div class="flex gap-4 items-center mb-4">
                        <div class="relative w-[70px] h-[70px] rounded-[1rem] overflow-hidden shrink-0 bg-black/40 shadow-sm border border-white/5">
                            <img src="${foto}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100/1a1133/2BD975?text=PRODUK'">
                            ${stokBadge}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-bold text-white line-clamp-1 mb-1">${item.title}</h4>
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[10px] text-gray-500 font-medium">Harga Jual: Rp ${hargaTampilEtalase.toLocaleString('id-ID')}</span>
                                <span class="text-[11px] text-[#EE4D2D] font-bold tracking-tight">Pendapatan: Rp ${pendapatanBersih.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 justify-end w-full">
                        <button onclick="bukaModalEditProduk('${item.id}')" class="flex-1 bg-[#1A2642] border border-[#2A3C65] text-[#46B3FF] py-3 rounded-xl text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                            <i class="fas fa-pen"></i> Edit Detail
                        </button>
                        <button onclick="hapusProdukSaya('${item.id}', '${escapeHTML(item.title).replace(/&#39;/g, "\\'")}')" class="w-12 h-12 flex-shrink-0 bg-[#3A1818] border border-[#5A2020] text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-95">
                            <i class="fas fa-trash-alt text-[11px]"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-6 text-center bg-black/20 rounded-2xl border border-white/5">
                <div class="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-3 border border-orange-500/20 shadow-inner">
                    <i class="fas fa-box-open text-2xl text-orange-500/50"></i>
                </div>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Belum Ada Produk</h4>
                <p class="text-[10px] text-gray-500 leading-relaxed">Etalase toko Anda masih kosong. Tambahkan produk sekarang!</p>
            </div>`;
        }
    } catch (err) {
        container.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data produk.</div>';
    }
}

async function loadPesananMasuk() {
    const container = document.getElementById('toko-pesanan-container');
    if(!container) return;
    container.innerHTML = '<div class="text-center py-10 text-xs text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mb-2 text-brand-info"></i><br>Memuat pesanan...</div>';
    try {
        const { data, error } = await supabaseClient
            .from('orders_player')
            .select('*, profiles!orders_player_user_id_fkey(nickname, avatar_url)')
            .eq('seller_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
        const badgePesanan = document.getElementById('badge-toko-pesanan');
        if (badgePesanan) {
            const pesananAktif = data.filter(o => o.status === 'PENDING' || o.status === 'SUCCESS' || o.status === 'proses').length;
            if (pesananAktif > 0) {
                badgePesanan.innerText = pesananAktif;
                badgePesanan.classList.remove('hidden');
            } else {
                badgePesanan.classList.add('hidden');
            }
        }
            container.innerHTML = data.map(order => {
                const isSelesai = order.status === 'selesai';
                const isPending = order.status === 'PENDING';
                const namaPembeli = order.profiles?.nickname || 'Anonim';
                const avaPembeli = order.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${namaPembeli}&background=1A1133&color=fff`;
                let teksStatus = order.status === 'SUCCESS' ? 'DIPROSES' : order.status.toUpperCase();
                let statusClass = 'text-brand-info border-brand-info/30 bg-brand-info/10'; // Default Diproses
                if (isSelesai) statusClass = 'text-brand-success border-brand-success/30 bg-brand-success/10';
                if (isPending) statusClass = 'text-gray-400 border-gray-500/30 bg-gray-500/10';
                return `
                <div class="bg-brand-card border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-white/10">
                    <div class="flex justify-between items-center p-3 border-b border-white/5 bg-black/20">
                        <div class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onclick="viewUserProfile('${order.user_id}')">
                            <img src="${avaPembeli}" class="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0">
                            <span class="text-[10px] font-bold text-white truncate max-w-[100px]">${namaPembeli}</span>
                            <i class="fas fa-chevron-right text-[8px] text-gray-500"></i>
                        </div>
                        <span class="text-[8px] font-black px-2 py-1 rounded border ${statusClass} uppercase tracking-widest shrink-0">
                            ${teksStatus}
                        </span>
                    </div>
                    
                    <div class="p-4 flex gap-3 items-center">
                        <div class="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
                            <i class="fas fa-box text-xl ${isSelesai ? 'text-brand-success/50' : 'text-brand-info/50'}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-xs font-bold text-white mb-1 line-clamp-2 leading-snug">${order.product_name}</h4>
                            <div class="flex justify-between items-end mt-2">
                                <span class="text-[9px] text-gray-500"><i class="far fa-clock mr-1"></i>${timeAgo(order.created_at)}</span>
                                <div class="text-[11px] text-[#EE4D2D] font-bold tracking-tight">Rp ${Number(order.price).toLocaleString('id-ID')}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-3 border-t border-white/5 bg-black/20 flex justify-end gap-2">
                        <button onclick="kirimPesanPribadi('${order.user_id}')" class="bg-brand-info/10 text-brand-info hover:bg-brand-info hover:text-brand-dark border border-brand-info/30 px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm">
                            <i class="fas fa-comment-dots"></i> Chat Pembeli
                        </button>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-6 text-center bg-black/20 rounded-2xl border border-white/5">
                <div class="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 border border-blue-500/20">
                    <i class="fas fa-clipboard-list text-2xl text-blue-500/50"></i>
                </div>
                <h4 class="text-white font-bold text-xs mb-1">Belum Ada Pesanan</h4>
                <p class="text-[10px] text-gray-500 leading-relaxed">Pesanan dari pembeli akan muncul di sini.</p>
            </div>`;
        }
    } catch (e) {
        container.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal menarik data pesanan.</div>';
    }
}

function bukaGalleryPasar(idProduk, startIndex) {
    const produk = globalDataPasar.find(item => String(item.id) === String(idProduk));
    if (!produk) return;
    let arrFoto = produk.image_url ? produk.image_url.split(',').map(img => img.trim()).filter(img => img !== "") : [];
    if (arrFoto.length === 0) arrFoto.push('https://placehold.co/400x400/1a1133/2BD975?text=PASAR');
    let galleryModal = document.getElementById('modal-gallery-pasar');
    if (!galleryModal) {
        galleryModal = document.createElement('div');
        galleryModal.id = 'modal-gallery-pasar';
        galleryModal.className = 'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/95 backdrop-blur-md opacity-0 transition-opacity duration-300';
        document.body.appendChild(galleryModal);
    }
    const modalDetail = document.getElementById('modal-detail-pasar');
    if (modalDetail && !modalDetail.classList.contains('hidden')) {
        modalDetail.classList.replace('flex', 'hidden');
    }
    history.pushState({ popup: 'gallery' }, null, '#gallery');
    galleryModal.innerHTML = `
        <button onclick="tutupGalleryPasar()" class="absolute top-6 right-6 text-white bg-white/10 backdrop-blur-md w-12 h-12 rounded-full flex items-center justify-center active:scale-90 z-[9999] shadow-lg border border-white/20"><i class="fas fa-times text-xl"></i></button>
        <div id="gallery-slider" class="w-full h-full flex overflow-x-auto hide-scroll snap-x snap-mandatory items-center relative z-[9990]">
            ${arrFoto.map(img => `
                <div class="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 relative">
                    <img src="${img}" draggable="false" class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl pointer-events-none relative z-0">
                    <img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="absolute inset-0 m-auto w-48 h-48 object-contain opacity-[0.25] pointer-events-none z-10 drop-shadow-lg" onerror="this.style.display='none'">
                </div>
            `).join('')}
        </div>
        ${arrFoto.length > 1 ? `<div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-5 py-2 rounded-full border border-white/10 shadow-lg z-[9999]"><span id="gallery-current">${startIndex + 1}</span> / ${arrFoto.length}</div>` : ''}
    `;
    galleryModal.classList.remove('hidden');
    galleryModal.classList.add('flex');
    setTimeout(() => {
        galleryModal.classList.remove('opacity-0');
        const slider = document.getElementById('gallery-slider');
        if (slider) {
            slider.scrollLeft = slider.clientWidth * startIndex;
            slider.onscroll = () => {
                let page = Math.round(slider.scrollLeft / slider.clientWidth) + 1;
                const currCounter = document.getElementById('gallery-current');
                if (currCounter) currCounter.innerText = page;
            };
        }
    }, 10);
}

function tutupGalleryPasar(dariTombolBack = false) {
    const modal = document.getElementById('modal-gallery-pasar');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const modalDetail = document.getElementById('modal-detail-pasar');
    if (modalDetail && modalDetail.classList.contains('hidden')) {
        modalDetail.classList.replace('hidden', 'flex');
    }
    if (!dariTombolBack && window.location.hash === '#gallery') history.back();
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.innerHTML = ''; }, 300);
}

async function fetchSaldoDanMutasi() {
    const listContainer = document.getElementById('dompet-history-list');
    if(!listContainer) return;
    listContainer.innerHTML = '<div class="text-center py-10 text-gray-500 text-xs"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i></div>';
    try {
        const { data: profile } = await supabaseClient.rpc('get_my_profile_v1');
        const saldoSekarang = profile?.balance || 0;
        document.getElementById('dompet-angka-saldo').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(saldoSekarang);
        const { data: txData } = await supabaseClient.from('wallet_transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (txData && txData.length > 0) {
            listContainer.innerHTML = txData.map(tx => {
                const safeDesc = (tx.description || '').replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
                return `
                <div onclick="bukaNotaMutasi('${tx.id}', ${tx.amount}, '${tx.type}', '${safeDesc}', '${tx.created_at}')" class="bg-brand-card border border-white/5 p-3 rounded-xl flex justify-between items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors active:scale-95" title="Klik untuk lihat rincian struk">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-[11px] font-bold text-white truncate">${tx.description}</h4>
                        <p class="text-[9px] text-gray-500 mt-1">${timeAgo(tx.created_at)}</p>
                    </div>
                    <span class="text-xs font-black whitespace-nowrap shrink-0 ${tx.type === 'INCOME' ? 'text-brand-success' : 'text-red-400'}">
                        ${tx.type === 'INCOME' ? '+' : '-'} Rp ${Number(tx.amount).toLocaleString('id-ID')}
                    </span>
                </div>`;
            }).join('');
        } else {
            listContainer.innerHTML = '<div class="text-center py-10 text-gray-500 text-xs">Belum ada riwayat.</div>';
        }
    } catch (err) {
        listContainer.innerHTML = '<div class="text-center py-10 text-red-500 text-xs">Gagal memuat data.</div>';
    }
}

function bukaNotaMutasi(id, amount, type, desc, dateStr) {
    const tgl = new Date(dateStr).toLocaleString('id-ID', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}) + ' WIB';
    let htmlNota = '';
    const nominal = Number(amount);
    if (type === 'EXPENSE' && (desc.toLowerCase().includes('tarik') || desc.toLowerCase().includes('cair'))) {
        let biayaAdmin = 500;
        let nominalBersih = nominal - biayaAdmin;
        if (nominalBersih < 0) nominalBersih = 0;
        htmlNota = `
        <div class="text-left w-full cursor-default">
            <div class="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-university text-brand-info"></i> Struk Penarikan</div>
            <div class="flex justify-between items-center text-xs mb-2">
                <span class="text-gray-300">Nominal Ditarik</span>
                <span class="font-mono text-white">Rp ${nominal.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-xs mb-2">
                <span class="text-gray-300">Biaya Admin (Sistem)</span>
                <span class="font-mono text-red-400">- Rp ${biayaAdmin.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-xs font-bold mt-4 pt-3 border-t border-white/10">
                <span class="text-white">Total Diterima Bersih</span>
                <span class="font-mono text-brand-success text-sm tracking-tight">Rp ${nominalBersih.toLocaleString('id-ID')}</span>
            </div>
            <div class="mt-5 p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                <div class="mb-1"><span class="text-gray-500 font-sans">Status:</span><br><b class="text-white font-sans">${desc}</b></div>
                <div class="mb-1"><span class="text-gray-500 font-sans">Waktu:</span> ${tgl}</div>
                <div><span class="text-gray-500 font-sans">Ref ID:</span> TX-${id.substring(0,8).toUpperCase()}</div>
            </div>
        </div>`;
    } 
    else if (type === 'INCOME') {
        htmlNota = `
        <div class="text-left w-full cursor-default">
            <div class="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5"><i class="fas fa-download text-brand-success"></i> Struk Pemasukan</div>
            <div class="flex justify-between items-center text-xs font-bold mb-2">
                <span class="text-white">Total Masuk</span>
                <span class="font-mono text-brand-success text-sm tracking-tight">+ Rp ${nominal.toLocaleString('id-ID')}</span>
            </div>
            <div class="mt-4 p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                <div class="mb-1"><span class="text-gray-500 font-sans">Keterangan:</span><br><b class="text-white font-sans leading-snug">${desc}</b></div>
                <div class="mb-1"><span class="text-gray-500 font-sans">Waktu:</span> ${tgl}</div>
                <div><span class="text-gray-500 font-sans">Ref ID:</span> TX-${id.substring(0,8).toUpperCase()}</div>
            </div>
        </div>`;
    } 
    else {
         htmlNota = `<div class="text-left text-xs text-gray-300 font-medium leading-relaxed">${desc}<br><br><span class="text-[10px] text-gray-500 font-mono tracking-widest">TX-${id.substring(0,8).toUpperCase()} &bull; ${tgl}</span></div>`;
    }
    customAlert(htmlNota.replace(/\n/g, ''), true);
}

let isWithdrawing = false;

async function prosesTarikSaldo() {
    if (!currentUser || !userProfile) return showToast("Sistem belum siap, mohon tunggu sebentar.", "error");
    if (isWithdrawing) {
        return showToast("Mohon tunggu, sistem sedang memproses antrean Anda...", "info");
    }
    const dompetProv = userProfile.wallet_provider;
    const dompetNum = userProfile.wallet_number;
    if (!dompetProv || !dompetNum) {
        tutupModalSaldoDompet();
        await customAlert("Mohon lengkapi **Provider E-Wallet** dan **Nomor Tujuan** di menu Edit Profil terlebih dahulu sebelum melakukan penarikan.");
        setTimeout(() => openEditProfileModal(), 500);
        return;
    }
    const saldoMurni = userProfile.balance || 0;
    if (saldoMurni < 10500) {
        return showToast("Min. saldo untuk penarikan adalah Rp 10.500", "error");
    }
    isWithdrawing = true;
    showToast("Mencari daftar nominal yang tersedia...", "info");
    try {
        const { data: products, error } = await supabaseClient
            .from('digiflazz_products')
            .select('*')
            .eq('is_active', true)
            .ilike('category', '%E-Money%')
            .ilike('brand', `%${dompetProv}%`)
            .order('price', { ascending: true });
        if (error) throw error;
        if (!products || products.length === 0) {
            throw new Error(`Mohon maaf, layanan penarikan ${dompetProv} sedang gangguan dari pusat.`);
        }
        bukaModalTarikOtomatis(saldoMurni, dompetProv, dompetNum, products);
    } catch (e) {
        showToast(e.message || "Gagal memuat produk penarikan.", "error");
    } finally {
        isWithdrawing = false;
    }
}

function bukaModalTarikOtomatis(saldo, provider, number, products) {
    history.pushState({ popup: 'tarik_otomatis' }, null, '#tarikdana');
    const modal = document.getElementById('modal-tarik-otomatis');
    document.getElementById('tarik-provider-text').innerText = provider;
    document.getElementById('tarik-number-text').innerText = number;
    const grid = document.getElementById('tarik-grid');
    const validProducts = products.filter(p => (p.price + 500) <= saldo);
    if (validProducts.length === 0) {
        grid.className = 'flex flex-col gap-2.5 pb-6 relative z-10';
        grid.innerHTML = `
        <div class="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
            <p class="text-[11px] text-white">Saldo Anda (Rp ${saldo.toLocaleString('id-ID')}) tidak cukup untuk menarik pecahan terendah dari ${provider}.</p>
        </div>`;
    } else {
        grid.className = 'grid grid-cols-2 gap-3 pb-6 relative z-10';
        grid.innerHTML = validProducts.map((p, index) => {
            const totalPotong = p.price + 500;
            const namaAman = escapeHTML(p.product_name).replace(/&#39;/g, "\\'");
            const delayAnimasi = Math.min(index * 0.02, 0.2);
            const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPotong).replace('Rp', 'Rp ');
            let hargaCoret = totalPotong;
            if (totalPotong <= 10000) {
                hargaCoret = Math.ceil((totalPotong + 1500) / 500) * 500; 
            } else if (totalPotong <= 50000) {
                hargaCoret = Math.ceil((totalPotong + 2500) / 500) * 500;
            } else if (totalPotong <= 100000) {
                hargaCoret = Math.ceil((totalPotong + 3500) / 1000) * 1000;
            } else {
                hargaCoret = Math.ceil((totalPotong + 5000) / 1000) * 1000;
            }
            const formatHargaCoret = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaCoret).replace('Rp', 'Rp ');
            const tampilanCard = "bg-[#1C233A] hover:bg-[#232A45] hover:border-brand-info/40 cursor-pointer active:scale-95 border border-white/5";
            return `
            <div onclick="konfirmasiTarikOtomatis('${p.sku_code}', '${namaAman}', ${p.price})" style="animation-delay: ${delayAnimasi}s; opacity: 0;" class="p-3.5 sm:p-4 rounded-[1.2rem] flex flex-col justify-between transition-all smooth-reveal shadow-sm relative h-full min-h-[95px] overflow-hidden ${tampilanCard}">
               <div class="mb-3 relative z-0">
                    <h4 class="text-[12px] sm:text-[13px] font-extrabold text-white leading-snug line-clamp-3">${namaAman}</h4>
                </div>
               <div class="mt-auto relative z-0 flex flex-col">
                    <span class="text-[8px] text-gray-400 mb-0.5">Total Potong Saldo:</span>
                    <span class="text-gray-500 line-through text-[9px] sm:text-[10px] font-medium opacity-70 mb-0.5">${formatHargaCoret}</span>
                    <span class="text-[13px] sm:text-[14px] font-black text-[#EE4D2D] tracking-tight block">${formatHarga}</span>
                </div>
            </div>`;
        }).join('');
    }

    tutupModalSaldoDompet();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.opacity = '0';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function tutupModalTarikOtomatis(dariTombolBack = false) {
    const modal = document.getElementById('modal-tarik-otomatis');
    modal.style.opacity = '0';
    if (!dariTombolBack && window.location.hash === '#tarikdana') {
        history.back();
    }
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function konfirmasiTarikOtomatis(skuCode, productName, basePrice) {
    const totalPotong = basePrice + 500;
    const confirm = await customConfirm(`Anda akan menarik dana ke akun:\n${userProfile.wallet_provider} (${userProfile.wallet_number})\n\nPecahan: ${productName}\nTotal Potong Saldo: Rp ${totalPotong.toLocaleString('id-ID')}\n\nDana akan masuk dalam hitungan detik. Lanjutkan?`);
    if (!confirm) return;
    tutupModalTarikOtomatis();
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
            body: JSON.stringify({
                action: 'withdraw', 
                user_id: currentUser.id,
                sku_code: skuCode,
                customer_no: userProfile.wallet_number,
                product_name: productName,
                total_potong: totalPotong 
            })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.detail || "Penarikan dibatalkan atau gagal dikonfirmasi server.");
        }
        showToast("Penarikan dana berhasil diproses!", "success");
        updateUiSaldoSeller();
        fetchSaldoDanMutasi();
        updateSaldoGlobal();
        fetchProfile();
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
                        <div id="wd-glow-icon" class="absolute inset-0 bg-${warnaTema} rounded-full animate-ping opacity-20"></div>
                        <div id="wd-bg-icon" class="w-full h-full bg-${warnaTema}/20 rounded-full flex items-center justify-center border border-${warnaTema}/50 backdrop-blur-md">
                            <i id="wd-ikon-tengah" class="fas ${iconTema} text-5xl text-${warnaTema}" style="filter: drop-shadow(0 0 15px rgba(37,211,102,0.8));"></i>
                        </div>
                    </div>
                    <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Status: <span id="wd-status-teks">${displayStatus}</span></h2>
                    <p class="text-gray-400 text-[11px] mb-6 leading-relaxed px-4">Penarikan Dana sebesar <b class="text-white">${productName}</b> diproses oleh sistem.</p>
                   <div class="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-left mb-6 relative shadow-inner">
                        <span id="wd-badge-struk" class="absolute -top-2.5 left-4 bg-${warnaTema} text-brand-dark text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">STRUK PENARIKAN</span>
                       <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 mt-2 border-b border-white/5 pb-2">
                            <span>Tujuan Transer</span>
                            <span class="font-mono text-white font-bold">${userProfile.wallet_number}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-2 border-b border-white/5 pb-2">
                            <span>Ref ID</span>
                            <span class="font-mono text-white font-bold">${refId}</span>
                        </div>
                        <div class="flex justify-between items-start text-[10px] text-gray-400 mt-2">
                            <span>SN / Bukti Transfer</span>
                            <span id="wd-sn-teks" class="font-mono text-brand-info font-bold text-right ml-4 leading-relaxed">${sn}</span>
                        </div>
                    </div>
                   <button type="button" onclick="tutupLayarSuksesWD(this)" class="w-full bg-white/5 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/10 hover:bg-white/10 active:scale-95 transition-all">Tutup Halaman</button>
                </div>
            `;
            if (refId !== 'Sistem') {
                const updateUIFinalStatusWD = (newData) => {
                    const isNowSukses = newData.status === 'Sukses';
                    const elStatus = document.getElementById('wd-status-teks');
                    if (elStatus) elStatus.innerText = newData.status;
                    const elSN = document.getElementById('wd-sn-teks');
                    if (elSN) elSN.innerText = newData.sn || 'Tanpa SN';
                    if (!isNowSukses) {
                        const glow = document.getElementById('wd-glow-icon');
                        if (glow) glow.className = 'absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20';
                        const bg = document.getElementById('wd-bg-icon');
                        if (bg) bg.className = 'w-full h-full bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 backdrop-blur-md';
                        const icon = document.getElementById('wd-ikon-tengah');
                        if (icon) {
                            icon.className = 'fas fa-times text-5xl text-red-500';
                            icon.style.filter = 'drop-shadow(0 0 15px rgba(239,68,68,0.8))';
                        }
                        const badge = document.getElementById('wd-badge-struk');
                        if (badge) badge.className = 'absolute -top-2.5 left-4 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider';
                    }
                };

                if (window.wdPolling) { clearInterval(window.wdPolling); window.wdPolling = null; }
                if (window.channelWDGlobal) { supabaseClient.removeChannel(window.channelWDGlobal); window.channelWDGlobal = null; }

                window.channelWDGlobal = supabaseClient.channel(`tunggu-wd-${refId}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'riwayat_ppob', filter: `ref_id=eq.${refId}` }, (payload) => {
                        if (payload.new.status === 'Sukses' || payload.new.status === 'Gagal') {
                            updateUIFinalStatusWD(payload.new);
                            supabaseClient.removeChannel(window.channelWDGlobal);
                            if (window.wdPolling) clearInterval(window.wdPolling);
                        }
                    }).subscribe();

                window.wdPolling = setInterval(async () => {
                    try {
                        const { data } = await supabaseClient.from('riwayat_ppob').select('status, sn').eq('ref_id', refId).single();
                        if (data && (data.status === 'Sukses' || data.status === 'Gagal')) {
                            updateUIFinalStatusWD(data);
                            clearInterval(window.wdPolling);
                            supabaseClient.removeChannel(window.channelWDGlobal);
                        }
                    } catch (e) {}
                }, 2000);
                setTimeout(() => { if (window.wdPolling) clearInterval(window.wdPolling); }, 30000);
            }
        }
    } catch (err) {
        showToast(err.message, "error");
        setTimeout(() => { history.back(); }, 2500); 
    }
}

function tutupLayarSuksesWD(btnElement) {
    btnElement.innerHTML = '<img src="https://nos.wjv-1.neo.id/au2hub/Picsart_26-05-30_04-29-46-305.webp" class="w-4 h-4 inline-block splash-logo-anim mr-2"> Menutup...';
    btnElement.disabled = true;
    if (window.wdPolling) { clearInterval(window.wdPolling); window.wdPolling = null; }
    if (window.channelWDGlobal) { supabaseClient.removeChannel(window.channelWDGlobal); window.channelWDGlobal = null; }
    history.back(); 
    setTimeout(() => { switchTab('toko'); loadTokoSaya(); }, 300);
}

async function bukaModalEditProduk(idProduk) {
    showToast("Mengambil data...", "info");
    try {
        const { data, error } = await supabaseClient.from('player_products').select('*').eq('id', idProduk).single();
        if (error || !data) throw new Error("Produk tidak ditemukan.");
        document.getElementById('edit-produk-id').value = data.id;
        document.getElementById('edit-produk-nama').value = data.title;
        document.getElementById('edit-produk-harga').value = data.price;
        document.getElementById('edit-produk-kategori').value = data.category;
        document.getElementById('edit-produk-deskripsi').value = data.description;
        const isPembeli = data.fee_ditanggung_pembeli === true;
        setFeeBearer(isPembeli ? 'pembeli' : 'seller', 'edit');
        if (document.getElementById('edit-produk-snk')) {
            document.getElementById('edit-produk-snk').value = data.snk || ''; 
        }
        if (document.getElementById('edit-produk-stock')) {
            document.getElementById('edit-produk-stock').value = data.stock_list || ''; 
        }
        ubahKategoriVisual(data.category, 'edit');
        editFileArray = [];
        existingImagesEdit = [];
        deletedImagesEdit = [];
        if (data.image_url) {
            existingImagesEdit = data.image_url.split(',').map(u => u.trim()).filter(u => u !== "");
        }
        renderPreviewEditProduk(); 
        document.getElementById('modal-edit-produk').classList.replace('hidden', 'flex');
        history.pushState({ popup: 'edit_produk' }, null, '#editproduk');
    } catch(err) { 
        showToast("Gagal memuat form edit", "error"); 
    }
}

function tutupModalEditProduk(dariTombolBackHP = false) {
    document.getElementById('modal-edit-produk').classList.replace('flex', 'hidden');
    const previewContainer = document.getElementById('preview-container-edit');
    if (previewContainer) {
        const images = previewContainer.querySelectorAll('img');
        images.forEach(img => {
            if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        });
        previewContainer.innerHTML = '';
    }
    editFileArray = [];
    existingImagesEdit = [];
    deletedImagesEdit = [];
    document.getElementById('input-foto-edit').value = '';
    if (!dariTombolBackHP && window.location.hash === '#editproduk') {
        history.back();
    }
}

function previewGambarEdit(input) {
    if (input.files && input.files.length > 0) {
        const newFiles = Array.from(input.files);
        let isSizeError = false;
        newFiles.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) isSizeError = true;
            else editFileArray.push(file); 
        });
        if (isSizeError) showToast("Beberapa foto berukuran > 5MB diabaikan.", "error");
        renderPreviewEditProduk();
        input.value = ''; 
    }
}

function renderPreviewEditProduk() {
    const previewContainer = document.getElementById('preview-container-edit');
    const oldImages = previewContainer.querySelectorAll('img');
    oldImages.forEach(img => {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    });
    previewContainer.innerHTML = '';
    if (existingImagesEdit.length === 0 && editFileArray.length === 0) {
        previewContainer.classList.add('hidden');
        return;
    }
    let htmlContent = '';
    existingImagesEdit.forEach((url, index) => {
        htmlContent += `
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-brand-info/50 shadow-md">
                <img src="${url}" class="w-full h-full object-cover">
                <button onclick="hapusFotoLamaEdit(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">LAMA</div>
            </div>
        `;
    });
    editFileArray.forEach((file, index) => {
        const tempUrl = URL.createObjectURL(file);
        htmlContent += `
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-[#EE4D2D]/50 shadow-md">
                <img src="${tempUrl}" class="w-full h-full object-cover">
                <button onclick="hapusFotoBaruEdit(${index})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform shadow-md z-10">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-[#EE4D2D]/80 text-white text-[8px] text-center py-0.5">BARU</div>
            </div>
        `;
    });
    previewContainer.innerHTML = htmlContent;
    previewContainer.classList.remove('hidden');
}

function hapusFotoLamaEdit(index) {
    const fotoDibuang = existingImagesEdit[index];
    if (fotoDibuang) {
        deletedImagesEdit.push(fotoDibuang);
    }
    existingImagesEdit.splice(index, 1);
    renderPreviewEditProduk();
}

function hapusFotoBaruEdit(index) {
    editFileArray.splice(index, 1);
    renderPreviewEditProduk();
}

async function prosesEditProduk() {
    const idProduk = document.getElementById('edit-produk-id').value;
    const nama = document.getElementById('edit-produk-nama').value.trim();
    const hargaInputClean = document.getElementById('edit-produk-harga').value.replace(/\./g, '');
    const harga = parseInt(hargaInputClean);
    const kategori = document.getElementById('edit-produk-kategori').value;
    const deskripsi = document.getElementById('edit-produk-deskripsi').value.trim();
    const stockList = document.getElementById('edit-produk-stock').value.trim();
    const snkInput = document.getElementById('edit-produk-snk') ? document.getElementById('edit-produk-snk').value.trim() : null;
    const btn = document.getElementById('btn-submit-edit-produk');
    if (!idProduk) return showToast("Gagal mengidentifikasi ID produk!", "error");
    if (!nama || !harga || isNaN(harga) || !deskripsi) return showToast("Mohon lengkapi formulir!", "error");
    if (existingImagesEdit.length === 0 && editFileArray.length === 0) return showToast("Wajib menyertakan minimal 1 foto produk!", "error");
    if ((kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') && !stockList) {
        return showToast("Wajib mengisi List Stok untuk kategori ini!", "error");
    }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    try {
        let uploadedUrls = [];
        if (editFileArray.length > 0) {
            showToast(`Mengunggah ${editFileArray.length} foto baru...`, "info");
            const uploadPromises = editFileArray.map(async (file, index) => {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const resUrl = await fetch(`/api/storage?action=upload&filename=${encodeURIComponent('pasar_edit_'+index+'_'+Date.now())}&filetype=${encodeURIComponent(file.type)}`, {
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                });
                const dataUrl = await resUrl.json();
                await fetch(dataUrl.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
                return dataUrl.finalVideoUrl;
            });
            uploadedUrls = await Promise.all(uploadPromises);
        }
        const finalImageArray = [...existingImagesEdit, ...uploadedUrls];
        const finalImageUrl = finalImageArray.join(',');
        const isFeePembeli = document.getElementById('edit-fee-bearer').value === 'pembeli';
        const { data: updatedData, error } = await supabaseClient.from('player_products')
            .update({
                title: nama, 
                price: harga, 
                category: kategori, 
                description: deskripsi, 
                image_url: finalImageUrl,
                stock_list: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? stockList : null,
                snk: (kategori === 'Akun' || kategori === 'Item' || kategori === 'APK Premium') ? snkInput : null,
                fee_ditanggung_pembeli: isFeePembeli,
                user_id: currentUser.id 
            })
            .eq('id', idProduk)
            .select();
        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
            throw new Error("Izin ditolak oleh server (RLS UPDATE belum aktif).");
        }
        showToast("Produk berhasil diperbarui!", "success");
        if (deletedImagesEdit.length > 0) {
            for (const urlFoto of deletedImagesEdit) {
                if (urlFoto.trim() !== "") {
                    await fetch('/api/storage?action=delete&type=file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: urlFoto.trim() })
                    }).catch(e => console.log("Abaikan jika file S3 sudah tidak ada:", e));
                }
            }
            deletedImagesEdit = [];
        }
        tutupModalEditProduk();
        await loadProdukSaya();
        await loadPasarPlayer(true);
    } catch (err) {
        showToast("Gagal: " + err.message, "error");
        console.error("Error Edit Produk:", err);
    } finally {
        btn.innerHTML = 'Simpan Perubahan';
        btn.disabled = false;
    }
}

async function hapusProdukSaya(productId, productName) {
    const konfirmasi = await customConfirm("Yakin hapus produk: " + productName + "?");
    if (!konfirmasi) return;
    try {
        const { data: produk } = await supabaseClient.from('player_products').select('image_url').eq('id', productId).single();
        await supabaseClient.from('player_products').delete().eq('id', productId);
        if (produk && produk.image_url) {
            const arrFoto = produk.image_url.split(',');
            for (const urlFoto of arrFoto) {
                if (urlFoto.trim() !== "") {
                    await fetch('/api/storage?action=delete&type=file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: urlFoto.trim() })
                    }).catch(e => console.log("Ignore S3 error:", e));
                }
            }
        }
        showToast("Produk dan foto berhasil dihapus!", "success");
        loadProdukSaya();
        loadPasarPlayer(true);
    } catch (e) { 
        showToast("Gagal menghapus produk.", "error"); 
    }
}

function bukaSuperAdmin() {
    if (!userProfile || userProfile.is_super_admin !== true) {
        return showToast("Akses Ditolak! Area khusus dewa.", "error");
    }
    switchTab('superadmin');
    loadAdminDashboard();
    loadRiwayatKeuanganGlobal();
}

async function loadAdminDashboard(isRefresh = false) {
    const listContainer = document.getElementById('admin-withdrawal-list');
    const iconRefresh = document.getElementById('icon-refresh-admin');
    if (isRefresh) {
        if (iconRefresh) iconRefresh.classList.add('fa-spin');
        showToast("Menyinkronkan data keuangan...", "info");
        const ids = ['dash-omzet', 'dash-vip', 'dash-fee-seller', 'dash-fee-rekber', 'dash-qris', 'dash-hak-seller', 'admin-nominal-pending'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<i class="fas fa-circle-notch fa-spin text-sm"></i>';
        });
    }
    if (!isRefresh) {
        listContainer.innerHTML = `
            <div class="text-center py-10 flex flex-col items-center justify-center bg-black/20 rounded-[1.5rem] border border-white/5">
                <div class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Menarik Data Sistem...</span>
            </div>`;
    }
    try {
        const { data, error } = await supabaseClient
            .from('withdrawals')
            .select('*, profiles(nickname)')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });
        if (error) throw error;
        const elCountPending = document.getElementById('admin-count-pending');
        if (elCountPending) elCountPending.innerText = data.length;
        const badgeAntrean = document.getElementById('badge-admin-antrean');
        if (badgeAntrean) {
            if (data.length > 0) {
                badgeAntrean.innerText = data.length;
                badgeAntrean.classList.remove('hidden');
            } else {
                badgeAntrean.classList.add('hidden');
            }
        }
        let totalNominalTransfer = 0; 
        if (data.length > 0) {
            listContainer.innerHTML = data.map(req => {
                let namaBank = "BANK";
                let noRek = req.rekening;
                if (req.rekening.includes('-')) {
                    const parts = req.rekening.split('-');
                    namaBank = parts[0].trim();
                    noRek = parts[1].trim();
                }
                let nominalBersih = Number(req.nominal) - 500;
                if (nominalBersih < 0) nominalBersih = 0;
                totalNominalTransfer += nominalBersih; 
                return `
                <div class="bg-[#161B2E] border border-white/5 p-4 rounded-[1.5rem] flex flex-col gap-3 shadow-lg relative overflow-hidden transition-all" id="wd-${req.id}">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-accent to-brand-info"></div>
                    <div class="flex justify-between items-start pl-2">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Penjual</p>
                            <h4 class="text-sm font-extrabold text-white">@${req.profiles?.nickname || 'Player'}</h4>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Potong Saldo</p>
                            <h4 class="text-sm font-black text-red-400">-Rp ${Number(req.nominal).toLocaleString('id-ID')}</h4>
                        </div>
                    </div>
                    <div class="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Penerima</span>
                            <span class="text-xs font-extrabold text-brand-info">${namaBank}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-lg font-mono font-bold text-white tracking-widest">${noRek}</span>
                            <button onclick="salinTeksAdmin('${noRek}', this, 'info')" class="w-8 h-8 rounded-lg bg-brand-info/10 text-brand-info flex items-center justify-center hover:bg-brand-info hover:text-white transition-all active:scale-95 shrink-0" title="Salin Rekening">
                                <i class="fas fa-copy text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between pl-2 pr-1 mt-1">
                        <div>
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Transfer Bersih</p>
                            <h4 class="text-base font-black text-brand-success flex items-center gap-2">
                                Rp ${nominalBersih.toLocaleString('id-ID')}
                                <button onclick="salinTeksAdmin('${nominalBersih}', this, 'success')" class="text-[9px] bg-brand-success/10 border border-brand-success/20 text-brand-success px-2 py-1 rounded-md active:scale-90 transition-all font-bold">Salin Nominal</button>
                            </h4>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button onclick="tolakPenarikan('${req.id}', '${req.user_id}', ${req.nominal})" class="flex-1 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-500 py-3 rounded-xl font-bold active:scale-95 transition-all text-xs">Tolak</button>
                        <button onclick="setujuiPenarikan('${req.id}', '${escapeHTML(req.profiles?.nickname || 'Player').replace(/&#39;/g, "\\'")}')" class="flex-1 bg-brand-success hover:bg-[#20bd5a] text-brand-dark py-3 rounded-xl font-extrabold active:scale-95 transition-all text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(37,211,102,0.3)]"><i class="fas fa-check-double mr-1"></i> Selesai Transfer</button>
                    </div>
                </div>`;
            }).join('');
        } else {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 px-6 text-center bg-white/5 rounded-[1.5rem] border border-white/5">
                    <div class="w-14 h-14 bg-brand-success/10 rounded-full flex items-center justify-center mb-3 border border-brand-success/20">
                        <i class="fas fa-check text-2xl text-brand-success/50"></i>
                    </div>
                    <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Semua Clear!</h4>
                    <p class="text-[10px] text-gray-500 leading-relaxed">Tidak ada antrean pencairan dana.</p>
                </div>`;
        }
        const elNominalPending = document.getElementById('admin-nominal-pending');
        if (elNominalPending) elNominalPending.innerText = 'Rp ' + totalNominalTransfer.toLocaleString('id-ID');
        const { count } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('is_seller', true);
        const elCountSeller = document.getElementById('admin-count-seller');
        if (elCountSeller) elCountSeller.innerText = count || 0;
        const { data: statsAdmin, error: errStats } = await supabaseClient.rpc('get_super_admin_stats');
        if (errStats) throw errStats;
        if (document.getElementById('dash-omzet')) document.getElementById('dash-omzet').innerText = 'Rp ' + (statsAdmin.total_omzet || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-vip')) document.getElementById('dash-vip').innerText = 'Rp ' + (statsAdmin.total_vip || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-fee-seller')) document.getElementById('dash-fee-seller').innerText = 'Rp ' + (statsAdmin.total_fee_seller || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-fee-rekber')) document.getElementById('dash-fee-rekber').innerText = 'Rp ' + (statsAdmin.total_fee_rekber || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-qris')) document.getElementById('dash-qris').innerText = 'Rp ' + (statsAdmin.total_qris || 0).toLocaleString('id-ID');
        if (document.getElementById('dash-hak-seller')) document.getElementById('dash-hak-seller').innerText = 'Rp ' + (statsAdmin.total_hak_seller || 0).toLocaleString('id-ID');
        if (isRefresh) {
            if (iconRefresh) iconRefresh.classList.remove('fa-spin');
            showToast("Dashboard Keuangan berhasil diperbarui!", "success");
        }
    } catch (err) {
        console.error("Error Super Admin:", err);
        listContainer.innerHTML = '<div class="text-center py-4 text-xs text-red-500">Gagal memuat data dari server.</div>';
        if (isRefresh && iconRefresh) iconRefresh.classList.remove('fa-spin');
    }
}

async function eksekusiSapuBersihTokoMati() {
    if (!userProfile || userProfile.is_super_admin !== true) return;
    const konfirmasi = await customConfirm("Yakin ingin menghapus produk dari seller kedaluwarsa beserta fotonya?");
    if (!konfirmasi) return;
    showToast("Menghapus data usang...", "info");
    try {
        const waktuSekarang = new Date().toISOString();
        const { data: expiredSellers, error: errSeller } = await supabaseClient
            .from('profiles')
            .select('id, nickname')
            .eq('is_seller', true)
            .lt('seller_expired_at', waktuSekarang);
        if (errSeller) throw errSeller;
        if (!expiredSellers || expiredSellers.length === 0) {
            return showToast("Aman! Tidak ada toko yang kedaluwarsa hari ini.", "success");
        }
        const expiredIds = expiredSellers.map(s => s.id);
        const namaSellers = expiredSellers.map(s => s.nickname).join(', ');
        console.log("Mendeteksi VIP kedaluwarsa pada seller:", namaSellers);
        const { data: expiredProducts, error: errProd } = await supabaseClient
            .from('player_products')
            .select('id, image_url')
            .in('user_id', expiredIds);
        if (errProd) throw errProd;
        let totalDihapus = 0;
        if (expiredProducts && expiredProducts.length > 0) {
            showToast(`Ditemukan ${expiredProducts.length} produk usang. Menghapus foto dari Biznet...`, "info");
            for (const produk of expiredProducts) {
                if (produk.image_url) {
                    const arrFoto = produk.image_url.split(',');
                    for (const urlFoto of arrFoto) {
                        if (urlFoto.trim() !== "") {
                            await fetch('/api/storage?action=delete&type=file', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileUrl: urlFoto.trim() })
                            }).catch(e => console.log("Abaikan jika file S3 sudah tidak ada:", e));
                        }
                    }
                }
            }
            const { error: errDel } = await supabaseClient
                .from('player_products')
                .delete()
                .in('user_id', expiredIds);
            if (errDel) throw errDel;
            totalDihapus = expiredProducts.length;
        }
        await supabaseClient
            .from('profiles')
            .update({ is_seller: false })
            .in('id', expiredIds);
        showToast(`Sapu bersih sukses! ${totalDihapus} Data produk kedaluwarsa berhasil dihapus.`, "success");
        loadAdminDashboard(true);
        loadPasarPlayer(true);
    } catch (err) {
        console.error("Error Sapu Bersih:", err);
        showToast("Gagal melakukan sapu bersih. Cek koneksi.", "error");
    }
}

async function loadRiwayatKeuanganGlobal(isRefresh = false, isLoadMore = false) {
    const listContainer = document.getElementById('admin-buku-kas-list');
    const iconRefresh = document.getElementById('icon-refresh-kas');
    if (!listContainer) return;
    if (isRefresh) {
        if (iconRefresh) iconRefresh.classList.add('fa-spin');
        offsetBukuKas = 0; 
        globalDataBukuKas = [];
    } else if (!isLoadMore) {
        offsetBukuKas = 0;
        globalDataBukuKas = [];
        listContainer.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-brand-info text-2xl mb-2"></i><br><span class="text-[10px] text-gray-500">Merekap Buku Kas...</span></div>';
    }
    const btnLoadMore = document.getElementById('btn-load-more-kas');
    if (btnLoadMore) {
        btnLoadMore.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat...';
        btnLoadMore.disabled = true;
    }
    try {
        const { data: orders, error } = await supabaseClient
            .from('orders_player')
            .select('*, profiles!orders_player_seller_id_fkey(nickname)') 
            .eq('status', 'selesai')
            .order('waktu_selesai', { ascending: false })
            .range(offsetBukuKas, offsetBukuKas + LIMIT_KAS - 1);
        if (error) throw error;
        if (orders && orders.length > 0) {
            const newData = orders.map(order => {
                const hargaAsli = Number(order.price);
                const isRekber = order.product_name.includes('[+Rekber]');
                const namaPenjual = order.profiles?.nickname || 'Anonim';
                let potongan = 0;
                if (hargaAsli <= 10000) potongan = 500;
                else if (hargaAsli <= 25000) potongan = 1000;
                else if (hargaAsli <= 50000) potongan = 2000;
                else if (hargaAsli <= 99999) potongan = 3000;
                else if (hargaAsli <= 499999) potongan = 10000;
                else if (hargaAsli <= 1499999) potongan = 20000;
                else if (hargaAsli <= 1999999) potongan = 25000;
                else potongan = 35000;
                const jatahPajakLapak = potongan;
                let jatahFeeRekber = 0;
                if (isRekber) {
                    if (hargaAsli <= 99999) jatahFeeRekber = 5000;
                    else if (hargaAsli <= 499999) jatahFeeRekber = 10000;
                    else if (hargaAsli <= 1499999) jatahFeeRekber = 20000;
                    else if (hargaAsli <= 1999999) jatahFeeRekber = 25000;
                    else jatahFeeRekber = 35000;
                }
                const totalJatahNikky = jatahPajakLapak + jatahFeeRekber;
                return {
                    id: order.id,
                    product_name: order.product_name,
                    namaPenjual: namaPenjual,
                    waktuAkurat: new Date(order.waktu_selesai || order.created_at),
                    hargaAsli: hargaAsli,
                    jatahPajakLapak: jatahPajakLapak,
                    jatahFeeRekber: jatahFeeRekber,
                    totalJatahNikky: totalJatahNikky,
                    isRekber: isRekber
                };
            });
            globalDataBukuKas = [...globalDataBukuKas, ...newData];
            offsetBukuKas += LIMIT_KAS;
            let hasMore = orders.length === LIMIT_KAS;
            renderBukuKasList(globalDataBukuKas, hasMore);
        } else {
            if (!isLoadMore) {
                globalDataBukuKas = [];
                renderBukuKasList([]); 
            } else {
                if (btnLoadMore) btnLoadMore.remove(); 
            }
        }
    } catch (e) {
        if (!isLoadMore) {
            listContainer.innerHTML = '<div class="text-center py-6 text-xs text-red-500">Gagal memuat buku kas.</div>';
        } else if (btnLoadMore) {
            btnLoadMore.innerHTML = 'Gagal, Coba Lagi';
            btnLoadMore.disabled = false;
        }
    } finally {
        if (isRefresh && iconRefresh) iconRefresh.classList.remove('fa-spin');
    }
}

function renderBukuKasList(dataArray, hasMore = false) {
    const listContainer = document.getElementById('admin-buku-kas-list');
    if (!dataArray || dataArray.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center bg-black/20 rounded-2xl border border-white/5">
                <i class="fas fa-search-minus text-4xl text-gray-600 mb-3"></i>
                <h4 class="text-white font-bold text-xs mb-1 tracking-tight">Riwayat Tidak Ditemukan</h4>
                <p class="text-[10px] text-gray-500">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>`;
        return;
    }
    let totalHariIni = 0;
    let totalBulanIni = 0;
    let totalKeseluruhan = 0;
    const today = new Date();
    const todayString = today.toLocaleDateString('id-ID');
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const groupedData = {};
    dataArray.forEach(tx => {
        const txDate = tx.waktuAkurat;
        const dateString = txDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const simpleDateString = txDate.toLocaleDateString('id-ID');
        totalKeseluruhan += tx.totalJatahNikky;
        if (simpleDateString === todayString) {
            totalHariIni += tx.totalJatahNikky;
        }
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            totalBulanIni += tx.totalJatahNikky;
        }
        if (!groupedData[dateString]) {
            groupedData[dateString] = { dateLabel: dateString, totalPendapatanHariIni: 0, transactions: [] };
        }
        groupedData[dateString].totalPendapatanHariIni += tx.totalJatahNikky;
        groupedData[dateString].transactions.push(tx);
    });
    const summaryKasHtml = `
    <div class="bg-gradient-to-br from-[#2A0815] to-[#161B2E] rounded-2xl p-4 border border-brand-accent/30 mb-6 shadow-[0_4px_15px_rgba(255,0,122,0.15)] relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-10"><i class="fas fa-book text-8xl text-brand-accent"></i></div>
        <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2 relative z-10">
            <h3 class="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <i class="fas fa-wallet text-brand-accent"></i> Rekap Kas Nikky (100%)
            </h3>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3 relative z-10">
            <div class="bg-black/40 p-3 rounded-xl border border-brand-accent/20 shadow-inner">
                <p class="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Hari Ini</p>
                <h4 class="text-sm font-black text-brand-success">+ Rp ${totalHariIni.toLocaleString('id-ID')}</h4>
            </div>
            <div class="bg-black/40 p-3 rounded-xl border border-brand-accent/20 shadow-inner">
                <p class="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Bulan Ini</p>
                <h4 class="text-sm font-black text-brand-success">+ Rp ${totalBulanIni.toLocaleString('id-ID')}</h4>
            </div>
        </div>
        <div class="text-center text-[10px] text-gray-400 bg-white/5 py-2 rounded-lg border border-white/5 relative z-10">
            Total Akumulasi Semua Waktu: <b class="text-white">Rp ${totalKeseluruhan.toLocaleString('id-ID')}</b>
        </div>
    </div>
    `;
    let htmlOutput = '';
    for (const dateKey in groupedData) {
        const grup = groupedData[dateKey];
        htmlOutput += `
        <div class="mb-5 bg-black/20 rounded-[1.2rem] p-3 border border-white/5 shadow-md">
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-white/10 px-1">
                <h3 class="text-[11px] font-extrabold text-white flex items-center gap-2">
                    <i class="far fa-calendar-alt text-brand-info text-sm"></i> ${grup.dateLabel}
                </h3>
                <div class="text-right">
                    <span class="text-[8px] text-gray-400 uppercase tracking-widest block mb-0.5">Total Pemasukan</span>
                    <span class="text-xs font-black text-brand-success">+ Rp ${grup.totalPendapatanHariIni.toLocaleString('id-ID')}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2.5">
                ${grup.transactions.map(tx => {
                    const jam = tx.waktuAkurat.getHours().toString().padStart(2, '0') + ':' + tx.waktuAkurat.getMinutes().toString().padStart(2, '0') + ' WIB';
                    return `
                    <div class="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2 relative hover:bg-black/60 transition-colors">
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div class="flex-1 pr-2">
                                <h4 class="text-[11px] font-bold text-white line-clamp-1">${tx.product_name}</h4>
                                <p class="text-[9px] text-gray-400 mt-0.5">@${tx.namaPenjual} &bull; <span class="font-mono text-brand-info/70">#${tx.id.substring(0,8).toUpperCase()}</span></p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="text-[9px] text-gray-500 mb-0.5">${jam}</p>
                                <h4 class="text-[11px] font-black text-brand-success">+ Rp ${tx.totalJatahNikky.toLocaleString('id-ID')}</h4>
                            </div>
                        </div>
                        <div class="flex justify-between items-center bg-white/5 rounded-lg p-2">
                            <div class="flex flex-col">
                                <span class="text-[8px] text-gray-400 uppercase">Pajak Lapak</span>
                                <span class="text-[10px] font-bold text-white">Rp ${tx.jatahPajakLapak.toLocaleString('id-ID')}</span>
                            </div>
                            <div class="flex flex-col text-right">
                                <span class="text-[8px] text-gray-400 uppercase">Fee Rekber</span>
                                <span class="text-[10px] font-bold ${tx.isRekber ? 'text-brand-accent' : 'text-gray-600'}">Rp ${tx.jatahFeeRekber.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>`
                }).join('')}
            </div>
        </div>`;
    }
    if (hasMore) {
        htmlOutput += `
        <div class="text-center mt-2 mb-6">
            <button id="btn-load-more-kas" onclick="loadRiwayatKeuanganGlobal(false, true)" class="bg-brand-info/10 text-brand-info border border-brand-info/30 px-6 py-3 rounded-full text-[11px] font-bold active:scale-95 transition-all hover:bg-brand-info hover:text-brand-dark w-full shadow-sm">
                Lihat Riwayat Sebelumnya <i class="fas fa-chevron-down ml-1"></i>
            </button>
        </div>
        `;
    }
    listContainer.innerHTML = summaryKasHtml + htmlOutput;
}

function switchAdminTab(tab) {
    adminTabAktif = tab;
    const contDash = document.getElementById('admin-tab-dashboard');
    const contKas = document.getElementById('admin-tab-kas');
    const contAntrean = document.getElementById('admin-tab-antrean');
    const contHarga = document.getElementById('admin-tab-harga');
    const menuDash = document.getElementById('menu-admin-dash');
    const menuKas = document.getElementById('menu-admin-kas');
    const menuAntrean = document.getElementById('menu-admin-antrean');
    const menuHarga = document.getElementById('menu-admin-harga');
    const activeClass = 'bg-brand-accent text-white shadow-sm';
    const inactiveClass = 'bg-transparent text-gray-400 hover:text-white';
    if(menuDash) menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    if(menuKas) menuKas.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    if(menuAntrean) menuAntrean.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${inactiveClass}`;
    if(menuHarga) menuHarga.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    if(contDash) contDash.classList.replace('block', 'hidden');
    if(contKas) contKas.classList.replace('block', 'hidden');
    if(contAntrean) contAntrean.classList.replace('block', 'hidden');
    if(contHarga) contHarga.classList.replace('block', 'hidden');
    if (tab === 'dashboard') {
        if(menuDash) menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        if(contDash) contDash.classList.replace('hidden', 'block');
    } else if (tab === 'kas') {
        if(menuKas) menuKas.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        if(contKas) contKas.classList.replace('hidden', 'block');
    } else if (tab === 'antrean') {
        if(menuAntrean) menuAntrean.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${activeClass}`;
        if(contAntrean) contAntrean.classList.replace('hidden', 'block');
    } else if (tab === 'harga') {
        if(menuHarga) menuHarga.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${activeClass}`;
        if(contHarga) contHarga.classList.replace('hidden', 'block');
        if (typeof loadRiwayatLabaPPOB === 'function') loadRiwayatLabaPPOB();
    }
}

function switchTokoTab(tab) {
    tokoTabAktif = tab;
    const contDash = document.getElementById('toko-tab-dashboard');
    const contPesanan = document.getElementById('toko-tab-pesanan');
    const contProduk = document.getElementById('toko-tab-produk');
    const menuDash = document.getElementById('menu-toko-dash');
    const menuPesanan = document.getElementById('menu-toko-pesanan');
    const menuProduk = document.getElementById('menu-toko-produk');
    const activeClass = 'bg-[#2A3452] text-white shadow-sm';
    const inactiveClass = 'bg-transparent text-gray-400 hover:text-white';
    if(menuDash) menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    if(menuPesanan) menuPesanan.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${inactiveClass}`;
    if(menuProduk) menuProduk.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${inactiveClass}`;
    if(contDash) contDash.classList.replace('block', 'hidden');
    if(contPesanan) contPesanan.classList.replace('block', 'hidden');
    if(contProduk) contProduk.classList.replace('block', 'hidden');
    if (tab === 'dashboard') {
        if(menuDash) menuDash.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        if(contDash) contDash.classList.replace('hidden', 'block');
    } else if (tab === 'pesanan') {
        if(menuPesanan) menuPesanan.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all relative ${activeClass}`;
        if(contPesanan) contPesanan.classList.replace('hidden', 'block');
        if (currentUser) loadPesananMasuk();
    } else if (tab === 'produk') {
        if(menuProduk) menuProduk.className = `flex-1 py-3 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${activeClass}`;
        if(contProduk) contProduk.classList.replace('hidden', 'block');
        if (currentUser) loadProdukSaya();
    }
}

function salinTeksAdmin(teks, btnElement, colorType) {
    if (navigator.clipboard && window.isSecureContext) { 
        navigator.clipboard.writeText(teks); 
    } else { 
        let tempInput = document.createElement("textarea"); 
        tempInput.value = teks; 
        document.body.appendChild(tempInput); 
        tempInput.select(); 
        document.execCommand("copy"); 
        document.body.removeChild(tempInput); 
    }
    if (navigator.vibrate) navigator.vibrate(40);
    const teksAsli = btnElement.innerHTML;
    const kelasAsli = btnElement.className;
    if (btnElement.innerText.includes("Salin Rek")) {
        btnElement.innerHTML = `Tersalin <i class="fas fa-check"></i>`;
        btnElement.classList.add('bg-brand-success/20', 'text-brand-success');
        btnElement.classList.remove('bg-brand-info/10', 'text-brand-info');
    } else {
        btnElement.innerHTML = `<i class="fas fa-check text-[11px]"></i>`;
    }
    setTimeout(() => {
        btnElement.innerHTML = teksAsli;
        btnElement.className = kelasAsli;
    }, 1500);
}

function ubahKategoriVisual(kategoriTerpilih, tipeModal) {
    const inputId = tipeModal === 'edit' ? 'edit-produk-kategori' : 'jualan-kategori';
    document.getElementById(inputId).value = kategoriTerpilih;
    const wadah = document.getElementById(`wadah-kategori-${tipeModal}`);
    const semuaTombol = wadah.querySelectorAll('button');
    semuaTombol.forEach(btn => {
        const isCocok = btn.innerText.trim().includes(kategoriTerpilih) || (kategoriTerpilih === 'APK Premium' && btn.innerText.includes('Premium'));
        if (isCocok) {
            btn.className = `flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#EE4D2D] bg-[#EE4D2D]/10 text-[#EE4D2D] text-[11px] font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(238,77,45,0.2)]`;
        } else {
            btn.className = `flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 text-[11px] font-medium`;
        }
    });
    const wadahStockId = tipeModal === 'edit' ? 'wadah-stock-edit' : 'wadah-stock-jualan';
    toggleStockInput(kategoriTerpilih, wadahStockId);
}

function updateLinkToko() {
    const linkEl = document.getElementById('public-shop-link');
    if (linkEl && currentUser && userProfile) {
        let namaToko = userProfile.nickname ? encodeURIComponent(userProfile.nickname.trim()) : currentUser.id;
        const baseUrl = window.location.origin + window.location.pathname;
        linkEl.textContent = `${baseUrl}#tokopublik?seller=${namaToko}`;
    }
}

function salinLinkToko() {
    const linkEl = document.getElementById('public-shop-link');
    if (!linkEl) return;
    const link = linkEl.textContent; 
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(() => {
            showToast("Link toko berhasil disalin!", "success");
        });
    } else {
        let tempInput = document.createElement("textarea");
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        showToast("Link toko berhasil disalin!", "success");
    }
}

function salinLinkTokoPublikLuar() {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast("Link toko berhasil disalin!", "success"));
    } else {
        let tempInput = document.createElement("textarea");
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        showToast("Link toko berhasil disalin!", "success");
    }
}

async function loadTokoPublikLuar(sellerName) {
    const tabTokoPublik = document.getElementById('tokopublik');
    tabTokoPublik.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[70vh]">
            <div class="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <span class="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Membuka Etalase @${sellerName}...</span>
        </div>`;
    try {
        const { data: profile, error: errProfile } = await supabaseClient
            .from('profiles')
            .select('id, nickname, avatar_url, exp, is_seller, seller_expired_at')
            .ilike('nickname', sellerName)
            .single();
        if (errProfile || !profile) throw new Error("Toko <b>@" + sellerName + "</b> tidak ditemukan.");
        const isVip = profile.is_seller === true;
        const expiredAt = profile.seller_expired_at ? new Date(profile.seller_expired_at) : new Date(0);
        if (!isVip || expiredAt <= new Date()) throw new Error("Toko <b>@" + sellerName + "</b> sedang tutup / masa VIP berakhir.");
        const ava = profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.nickname}&background=1A1133&color=fff`;
        const sellerExp = profile.exp || 0;
        const level = Math.floor(Math.sqrt(sellerExp / 100)) + 1;
        const sellerVideoCount = allVideosData ? allVideosData.filter(v => String(v.user_id) === String(profile.id)).length : 0;
        let badgeHtml = '';
        if (level >= 10 || sellerVideoCount >= 100) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_12px_rgba(250,204,21,1)] border border-yellow-300" title="Legend"><i class="fas fa-crown"></i></span>`;
        else if (level >= 5 || sellerVideoCount >= 50) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-accent to-[#ff758c] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(255,0,122,0.8)] border border-brand-accent" title="Master"><i class="fas fa-fire"></i></span>`;
        else if (level >= 3 || sellerVideoCount >= 25) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-purple to-[#c471ed] text-white w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(138,43,226,0.8)] border border-brand-purple" title="Elite"><i class="fas fa-star"></i></span>`;
        else if (level >= 2 || sellerVideoCount >= 10) badgeHtml = `<span class="inline-flex items-center justify-center bg-gradient-to-r from-brand-info to-[#89f7fe] text-brand-dark w-[18px] h-[18px] rounded-full text-[10px] ml-1 shadow-[0_0_10px_rgba(0,240,255,0.8)] border border-brand-info" title="Verified"><i class="fas fa-check-circle"></i></span>`;
        
        const { data: products, error: errProd } = await supabaseClient.from('player_products').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
        if (errProd) throw errProd;
        const { count: countSales } = await supabaseClient.from('orders_player').select('*', {count: 'exact', head: true}).eq('seller_id', profile.id).in('status', ['selesai']);
        let htmlToko = `
            <div class="relative w-[calc(100%+40px)] h-44 bg-gradient-to-br from-[#FF007A] via-[#8A2BE2] to-[#00F0FF] -mx-5 px-5 pt-8 shadow-xl overflow-hidden shrink-0">
                <div class="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
                <div class="absolute -left-5 -bottom-5 w-24 h-24 bg-black/20 rounded-full blur-lg"></div>
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div class="relative z-10 flex justify-between items-center w-full max-w-md mx-auto mt-2">
                    <button onclick="history.back()" class="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 active:scale-90 transition-all border border-white/20"><i class="fas fa-arrow-left"></i></button>
                    <div class="flex-1 mx-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-full h-9 flex items-center px-3 cursor-text" onclick="document.getElementById('cari-toko-publik').focus()">
                        <i class="fas fa-search text-white/80 text-[10px]"></i>
                        <span class="text-[10px] text-white/80 ml-2 font-medium">Cari di toko ini...</span>
                    </div>
                    <button onclick="salinLinkTokoPublikLuar()" class="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all border border-white/20"><i class="fas fa-share-alt text-[10px]"></i></button>
                </div>
            </div>
            <div class="relative px-5 pb-5 bg-brand-dark -mt-8 rounded-t-3xl pt-12 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10 mx-[-20px] w-[calc(100%+40px)] border-b border-white/5 shrink-0">
                <div class="absolute -top-10 left-5 w-20 h-20 rounded-full bg-brand-dark p-1 flex items-center justify-center z-20 shadow-lg">
                    <img src="${ava}" class="w-full h-full rounded-full object-cover border-2 border-brand-accent">
                    <div class="absolute bottom-1 right-1 bg-brand-success w-3.5 h-3.5 rounded-full border-2 border-brand-dark shadow-sm"></div>
                </div>
                <div class="flex justify-between items-start">
                    <div class="flex-1 pr-2">
                        <h2 class="text-[17px] font-black text-white flex items-center gap-1.5 leading-tight mb-1">
                            ${profile.nickname} <span class="scale-[0.8] origin-left">${badgeHtml}</span>
                        </h2>
                        <p class="text-[10px] text-brand-info font-bold tracking-wide flex items-center gap-1"><i class="fas fa-check-circle"></i> Official Seller</p>
                    </div>
                    <button onclick="kirimPesanPribadi('${profile.id}')" class="bg-gradient-to-r from-brand-info to-brand-accent text-white px-5 py-2 rounded-full text-[10px] font-extrabold shadow-[0_4px_10px_rgba(0,240,255,0.3)] active:scale-95 transition-transform flex items-center gap-1.5 shrink-0 mt-1">
                        <i class="fas fa-comment-dots text-xs"></i> Chat
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3 mt-5 text-center">
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-white font-black text-sm">${products ? products.length : 0}</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Produk</div>
                    </div>
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-brand-success font-black text-sm">${countSales || 0}</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Terjual</div>
                    </div>
                    <div class="bg-black/30 rounded-2xl py-2.5 border border-white/5 shadow-inner">
                        <div class="text-yellow-400 font-black text-sm flex items-center justify-center gap-1"><i class="fas fa-star text-[10px]"></i> 5.0</div>
                        <div class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Rating</div>
                    </div>
                </div>
            </div>
            <div class="pt-4 pb-2 -mx-5 px-5 sticky top-[60px] bg-brand-dark/95 backdrop-blur-xl z-20 border-b border-white/5">
                <input type="text" id="cari-toko-publik" placeholder="Cari barang di toko ini..." class="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-brand-info transition-all shadow-inner mb-3">
                <div class="flex gap-2 overflow-x-auto hide-scroll pb-1">
                    <button class="bg-brand-accent text-white px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 shadow-[0_0_10px_rgba(255,0,122,0.3)] border border-transparent">Semua Produk</button>
                    <button class="bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 hover:text-white transition-colors cursor-not-allowed">Terlaris</button>
                    <button class="bg-white/5 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-bold shrink-0 hover:text-white transition-colors cursor-not-allowed">Termurah</button>
                </div>
            </div>
            <div id="grid-tokopublik-dynamic" class="grid grid-cols-2 gap-3 pb-20 pt-4 flex-1 overflow-y-auto"></div>
        `;
        tabTokoPublik.innerHTML = htmlToko;
        if (!products || products.length === 0) {
            document.getElementById('grid-tokopublik-dynamic').innerHTML = `<div class="col-span-2 text-center py-12 flex flex-col items-center text-gray-500 bg-black/20 rounded-2xl border border-white/5"><i class="fas fa-box-open text-4xl mb-3 opacity-30"></i><span class="text-xs">Etalase toko ini masih kosong.</span></div>`;
            return;
        }
        const mappedProducts = products.map(p => {
            if (!globalDataPasar.find(x => x.id === p.id)) {
                globalDataPasar.push({...p, profiles: profile});
            }
            return {...p, profiles: profile};
        });
        renderGridPasar(mappedProducts, 'grid-tokopublik-dynamic');
        const searchInput = document.getElementById('cari-toko-publik');
        searchInput.addEventListener('input', debounce((e) => {
            const keyword = e.target.value.toLowerCase();
            const filteredProducts = mappedProducts.filter(p => p.title.toLowerCase().includes(keyword));
            renderGridPasar(filteredProducts, 'grid-tokopublik-dynamic');
        }, 300));
    } catch (err) {
        tabTokoPublik.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[70vh] text-center px-6">
            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <i class="fas fa-store-slash text-3xl text-red-500/80"></i>
            </div>
            <h3 class="text-white font-bold text-sm mb-2">Toko Tidak Ditemukan</h3>
            <p class="text-xs text-gray-400 mb-6">${err.message || 'Terjadi kesalahan sistem.'}</p>
            <button onclick="history.back()" class="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all border border-white/10">Kembali</button>
        </div>`;
    }
}

function renderGrafikSeller(labels, dataBerhasil, dataPending, dataGagal) {
    const ctx = document.getElementById('sellerChart').getContext('2d');
    if (sellerChartInstance) {
        sellerChartInstance.destroy();
    }
    let gradientBerhasil = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBerhasil.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
    gradientBerhasil.addColorStop(1, 'rgba(6, 182, 212, 0)');
    sellerChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Berhasil',
                    data: dataBerhasil,
                    borderColor: '#06B6D4',
                    backgroundColor: gradientBerhasil,
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#06B6D4',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pending',
                    data: dataPending,
                    borderColor: '#3B82F6',
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#3B82F6',
                    pointRadius: 4,
                    tension: 0.4
                },
                {
                    label: 'Gagal',
                    data: dataGagal,
                    borderColor: '#D946EF',
                    borderWidth: 2,
                    pointBackgroundColor: '#1C233A',
                    pointBorderColor: '#D946EF',
                    pointRadius: 4,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#9CA3AF', boxWidth: 12, font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 9, 32, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#6B7280', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#6B7280', font: { size: 9 } }
                }
            }
        }
    });
}

// Tambahan Event Listeners dari app.js terkait Swipe Tab Toko & Admin
let tokoTouchStartX = 0;
let tokoTouchStartY = 0;
document.addEventListener('DOMContentLoaded', () => {
    const tokoSection = document.getElementById('toko');
    if (tokoSection) {
        tokoSection.addEventListener('touchstart', e => {
            tokoTouchStartX = e.changedTouches[0].screenX;
            tokoTouchStartY = e.changedTouches[0].screenY;
        }, {passive: true});
        tokoSection.addEventListener('touchend', e => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;
            let diffX = tokoTouchStartX - touchEndX;
            let diffY = tokoTouchStartY - touchEndY;
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
                const tabs = ['dashboard', 'pesanan', 'produk'];
                let currentIndex = tabs.indexOf(tokoTabAktif);
                if (diffX > 0) {
                    if (currentIndex < tabs.length - 1) switchTokoTab(tabs[currentIndex + 1]);
                } else {
                    if (currentIndex > 0) switchTokoTab(tabs[currentIndex - 1]); 
                }
            }
        }, {passive: true});
    }

    let adminTouchStartX = 0;
    let adminTouchStartY = 0;
    const adminSection = document.getElementById('superadmin');
    if (adminSection) {
        adminSection.addEventListener('touchstart', e => {
            adminTouchStartX = e.changedTouches[0].screenX;
            adminTouchStartY = e.changedTouches[0].screenY;
        }, {passive: true});
        adminSection.addEventListener('touchend', e => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;
            let diffX = adminTouchStartX - touchEndX;
            let diffY = adminTouchStartY - touchEndY;
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) { 
                const tabs = ['dashboard', 'kas', 'harga', 'antrean']; 
                let currentIndex = tabs.indexOf(adminTabAktif);
                if (diffX > 0) {
                    if (currentIndex < tabs.length - 1) switchAdminTab(tabs[currentIndex + 1]);
                } else {
                    if (currentIndex > 0) switchAdminTab(tabs[currentIndex - 1]); 
                }
            }
        }, {passive: true});
    }
});
