// ===============================
// KONFIGURASI FIREBASE REALTIME DATABASE
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyAVMio8Mshs6dV8SFQCijC7LNbf6rr3VX8",
  authDomain: "kasir-toko-6fbc5.firebaseapp.com",
  databaseURL: "https://kasir-toko-6fbc5-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "kasir-toko-6fbc5",
  storageBucket: "kasir-toko-6fbc5.firebasestorage.app",
  messagingSenderId: "253111727359",
  appId: "1:253111727359:web:479806b6545266133c08ca",
  measurementId: "G-WDDEC8HHFT"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Reference Database
const dbBarang = db.ref("barang");
const dbPreorder = db.ref("preorder");
const dbRiwayat = db.ref("riwayat");
const dbPengaturan = db.ref("pengaturan");

// Data Lokal Sementara di Memori (Cache/Sync)
let barang = [];
let keranjang = [];
let preorder = [];
let riwayat = [];

// ===============================
// SISTEM KEAMANAN & HAK AKSES (RBAC)
// ===============================
let currentRole = sessionStorage.getItem("kasirpo_role") || "";

let pinPemilikAktif = "1234";
let pinKasirAktif = "0000";

dbPengaturan.on("value", snapshot => {
    const data = snapshot.val();
    if (data) {
        if (data.pinPemilik) pinPemilikAktif = String(data.pinPemilik);
        if (data.pinKasir) pinKasirAktif = String(data.pinKasir);
    } else {
        dbPengaturan.set({
            pinPemilik: pinPemilikAktif,
            pinKasir: pinKasirAktif
        });
    }
});

function cekLogin() {
    const modal = document.getElementById("loginModal");
    const roleLabel = document.getElementById("roleAktif");
    if (!roleLabel) return;

    if (currentRole === "Pemilik" || currentRole === "Kasir") {
        if (modal) modal.style.display = "none";
        roleLabel.innerText = currentRole.toUpperCase();
        perbaruiTampilanHakAkses();
    } else {
        if (modal) modal.style.display = "flex";
        roleLabel.innerText = "BELUM LOGIN";
    }
}

function prosesLogin() {
    const inputPin = document.getElementById("inputPinLogin").value.trim();
    const errorEl = document.getElementById("loginError");

    if (inputPin === pinPemilikAktif) {
        currentRole = "Pemilik";
    } else if (inputPin === pinKasirAktif) {
        currentRole = "Kasir";
    } else {
        if (errorEl) {
            errorEl.innerText = "PIN tidak valid! Silakan coba lagi.";
            errorEl.style.display = "block";
        }
        document.getElementById("inputPinLogin").value = "";
        return;
    }

    if (errorEl) errorEl.style.display = "none";
    sessionStorage.setItem("kasirpo_role", currentRole);
    document.getElementById("inputPinLogin").value = "";
    cekLogin();
}

function perbaruiTampilanHakAkses() {
    const isPemilik = (currentRole === "Pemilik");

    const btnHapusRiwayat = document.getElementById("btnHapusRiwayat");
    if (btnHapusRiwayat) {
        btnHapusRiwayat.style.display = isPemilik ? "inline-block" : "none";
    }

    const btnUbahPin = document.getElementById("btnUbahPin");
    if (btnUbahPin) {
        btnUbahPin.style.display = isPemilik ? "inline-block" : "none";
    }

    tampilkanBarang();
    tampilkanPreOrder();
}

function ubahPinPemilik() {
    if (currentRole !== "Pemilik") return;

    const pilihan = prompt(
        "Pilih PIN yang ingin diubah:\n" +
        "Ketik 1 untuk mengubah PIN Pemilik\n" +
        "Ketik 2 untuk mengubah PIN Kasir"
    );

    if (pilihan === "1") {
        const pinBaru = prompt("Masukkan PIN Pemilik yang baru (minimal 4 digit):");
        if (pinBaru && pinBaru.trim().length >= 4 && pinBaru.trim() !== pinKasirAktif) {
            dbPengaturan.update({ pinPemilik: pinBaru.trim() });
            alert("PIN Pemilik berhasil diperbarui!");
        } else {
            alert("Gagal! PIN minimal 4 karakter dan tidak boleh sama dengan PIN Kasir.");
        }
    } else if (pilihan === "2") {
        const pinBaru = prompt("Masukkan PIN Kasir yang baru (minimal 4 digit):");
        if (pinBaru && pinBaru.trim().length >= 4 && pinBaru.trim() !== pinPemilikAktif) {
            dbPengaturan.update({ pinKasir: pinBaru.trim() });
            alert("PIN Kasir berhasil diperbarui!");
        } else {
            alert("Gagal! PIN minimal 4 karakter dan tidak boleh sama dengan PIN Pemilik.");
        }
    }
}

function gantiAkun() {
    sessionStorage.removeItem("kasirpo_role");
    currentRole = "";
    cekLogin();
}

cekLogin();

// ===============================
// SYNC REALTIME FIREBASE KE APLIKASI
// ===============================

dbBarang.on("value", snapshot => {
    const data = snapshot.val();
    barang = [];
    if (data) {
        Object.keys(data).forEach(key => {
            barang.push({ idKey: key, ...data[key] });
        });
    }
    tampilkanBarang();
    updateSelectBarang();
    updateSelectBarangPO();
});

dbPreorder.on("value", snapshot => {
    const data = snapshot.val();
    preorder = [];
    if (data) {
        Object.keys(data).forEach(key => {
            preorder.push({ idKey: key, ...data[key] });
        });
    }
    tampilkanPreOrder();
});

dbRiwayat.on("value", snapshot => {
    const data = snapshot.val();
    riwayat = [];
    if (data) {
        Object.keys(data).forEach(key => {
            riwayat.push({ idKey: key, ...data[key] });
        });
    }
    tampilkanRiwayat();
});

// ===============================
// HELPER FORMAT RUPIAH, TANGGAL & NAVIGATION
// ===============================
function formatRupiah(angka) {
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.style.display = "none";
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.style.display = "block";
}

function cekStatusExpired(tglExpired) {
    if (!tglExpired) return `<span style="color:#666;">-</span>`;

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    const expDate = new Date(tglExpired);
    expDate.setHours(0, 0, 0, 0);

    const selisihHari = Math.ceil((expDate - hariIni) / (1000 * 60 * 60 * 24));

    if (selisihHari < 0) {
        return `<b>${tglExpired}</b><br><span class="badge-exp-danger">⚠️ KADALUWARSA</span>`;
    } else if (selisihHari <= 14) {
        return `<b>${tglExpired}</b><br><span class="badge-exp-warn">⏳ Sisa ${selisihHari} hari</span>`;
    } else {
        return `<b>${tglExpired}</b><br><span class="badge-exp-ok">✔ Aman</span>`;
    }
}

// ===============================
// KELOLA BARANG BERBASIS BATCH (ADMIN / PEMILIK)
// ===============================

function tambahBarang() {
    const kode = document.getElementById("kodeBarang").value.trim().toUpperCase();
    const nama = document.getElementById("namaBarang").value.trim();
    const berat = document.getElementById("beratBarang").value.trim();
    const tglProduksi = document.getElementById("tglProduksi").value;
    const tglExpired = document.getElementById("tglExpired").value;
    const harga = Number(document.getElementById("hargaBarang").value);
    const stok = Number(document.getElementById("stokBarang").value);

    if (kode === "" || nama === "" || berat === "" || tglProduksi === "" || tglExpired === "" || isNaN(harga) || harga <= 0 || isNaN(stok) || stok < 0) {
        alert("Mohon lengkapi seluruh atribut barang (Kode Batch, Nama Produk, Berat Bersih, Tgl Produksi, Tgl Expired, Harga, dan Stok)!");
        return;
    }

    if (tglExpired < tglProduksi) {
        alert("Tanggal Expired tidak boleh lebih awal dari Tanggal Produksi!");
        return;
    }

    // Pastikan Kode Batch tidak duplikat
    const kodeDuplikat = barang.find(b => (b.kode || "").toUpperCase() === kode);
    if (kodeDuplikat) {
        alert(`Kode Batch "${kode}" sudah digunakan pada produk "${kodeDuplikat.nama}"!\nGunakan kode batch baru (misal: ${kode}-B) untuk membedakan tanggal produksi/expired.`);
        return;
    }

    dbBarang.push({
        kode: kode,
        nama: nama,
        berat: berat,
        tglProduksi: tglProduksi,
        tglExpired: tglExpired,
        harga: harga,
        stok: stok
    }).then(() => {
        document.getElementById("kodeBarang").value = "";
        document.getElementById("namaBarang").value = "";
        document.getElementById("beratBarang").value = "";
        document.getElementById("tglProduksi").value = "";
        document.getElementById("tglExpired").value = "";
        document.getElementById("hargaBarang").value = "";
        document.getElementById("stokBarang").value = "";
        alert("Batch barang berhasil ditambahkan!");
    });
}

function renderBarisBarang(item, isPemilik) {
    const tombolHapusHTML = isPemilik
        ? `<button onclick="hapusBarang('${item.idKey}')" style="background-color: #dc3545; color: white;">Hapus</button>`
        : "";

    return `
        <tr>
            <td><b>${item.kode || "-"}</b></td>
            <td>${item.nama}</td>
            <td>${item.berat || "-"}</td>
            <td>${item.tglProduksi || "-"}</td>
            <td>${cekStatusExpired(item.tglExpired)}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td><b>${item.stok}</b></td>
            <td>
                <button onclick="editBarang('${item.idKey}')">Edit</button>
                ${tombolHapusHTML}
            </td>
        </tr>
    `;
}

function tampilkanBarang() {
    const tbody = document.getElementById("tabelBarang");
    if (!tbody) return;

    const isPemilik = (currentRole === "Pemilik");
    // Urutkan berdasarkan tanggal expired terdekat (FEFO)
    const barangSorted = [...barang].sort((a, b) => new Date(a.tglExpired || "2099-12-31") - new Date(b.tglExpired || "2099-12-31"));

    let html = "";
    barangSorted.forEach(item => {
        html += renderBarisBarang(item, isPemilik);
    });
    tbody.innerHTML = html;
}

function editBarang(idKey) {
    const item = barang.find(b => b.idKey === idKey);
    if (!item) return;

    const kodeBaru = prompt("Kode Barang / Batch:", item.kode || "");
    if (kodeBaru === null) return;
    const namaBaru = prompt("Nama Produk:", item.nama);
    if (namaBaru === null) return;
    const beratBaru = prompt("Berat Bersih (Netto):", item.berat || "");
    if (beratBaru === null) return;
    const prodBaru = prompt("Tanggal Produksi (YYYY-MM-DD):", item.tglProduksi || "");
    if (prodBaru === null) return;
    const expBaru = prompt("Tanggal Expired (YYYY-MM-DD):", item.tglExpired || "");
    if (expBaru === null) return;
    const hargaBaru = prompt("Harga Satuan:", item.harga);
    if (hargaBaru === null) return;
    const stokBaru = prompt("Stok Batch:", item.stok);
    if (stokBaru === null) return;

    if (kodeBaru.trim() === "" || namaBaru.trim() === "" || Number(hargaBaru) <= 0 || Number(stokBaru) < 0) {
        alert("Data tidak valid!");
        return;
    }

    dbBarang.child(idKey).update({
        kode: kodeBaru.trim().toUpperCase(),
        nama: namaBaru.trim(),
        berat: beratBaru.trim(),
        tglProduksi: prodBaru.trim(),
        tglExpired: expBaru.trim(),
        harga: Number(hargaBaru),
        stok: Number(stokBaru)
    });
    alert("Data batch barang berhasil diperbarui!");
}

function hapusBarang(idKey) {
    if (currentRole !== "Pemilik") {
        alert("Akses Ditolak! Hanya Pemilik yang dapat menghapus master barang.");
        return;
    }
    if (!confirm("Yakin ingin menghapus batch barang ini?")) return;
    dbBarang.child(idKey).remove();
    alert("Batch barang berhasil dihapus!");
}

function cariBarang() {
    const keyword = document.getElementById("cariBarang").value.toLowerCase();
    const tbody = document.getElementById("tabelBarang");
    if (!tbody) return;

    const isPemilik = (currentRole === "Pemilik");
    const barangFiltered = barang.filter(item =>
        item.nama.toLowerCase().includes(keyword) ||
        (item.kode && item.kode.toLowerCase().includes(keyword))
    );

    let html = "";
    barangFiltered.forEach(item => {
        html += renderBarisBarang(item, isPemilik);
    });
    tbody.innerHTML = html;
}

// ===============================
// TRANSAKSI KASIR (FEFO SORTED) & SMART DISCOUNT
// ===============================

function updateSelectBarang() {
    const select = document.getElementById("pilihBarang");
    if (!select) return;

    // Urutkan pilihan di kasir berdasarkan FEFO (Expired terdekat di urutan atas)
    const barangTersedia = [...barang]
        .filter(item => item.stok > 0)
        .sort((a, b) => new Date(a.tglExpired || "2099-12-31") - new Date(b.tglExpired || "2099-12-31"));

    let html = `<option value="">-- Pilih Batch Barang (Urut Expired Terdekat) --</option>`;
    barangTersedia.forEach(item => {
        const labelKode = item.kode ? `[${item.kode}] ` : "";
        const labelBerat = item.berat ? ` (${item.berat})` : "";
        const labelExp = item.tglExpired ? ` | Exp: ${item.tglExpired}` : "";
        html += `
            <option value="${item.idKey}">
                ${labelKode}${item.nama}${labelBerat}${labelExp} - ${formatRupiah(item.harga)} (Stok: ${item.stok})
            </option>
        `;
    });
    select.innerHTML = html;
}

function tambahKeranjang() {
    const idKey = document.getElementById("pilihBarang").value;
    const jumlah = Number(document.getElementById("jumlahBarang").value);
    const item = barang.find(b => b.idKey === idKey);

    if (!item) { alert("Pilih batch barang terlebih dahulu!"); return; }
    if (jumlah <= 0) { alert("Jumlah barang harus > 0!"); return; }
    if (jumlah > item.stok) { alert("Stok batch barang tidak cukup!"); return; }

    const labelLengkap = `${item.kode ? '[' + item.kode + '] ' : ''}${item.nama}${item.berat ? ' (' + item.berat + ')' : ''}`;

    const sudahAda = keranjang.find(k => k.idKey === idKey);
    if (sudahAda) {
        if (sudahAda.jumlah + jumlah > item.stok) { alert("Jumlah melebihi stok batch!"); return; }
        sudahAda.jumlah += jumlah;
    } else {
        keranjang.push({ idKey: item.idKey, nama: labelLengkap, harga: item.harga, jumlah: jumlah });
    }

    tampilkanKeranjang();
    document.getElementById("jumlahBarang").value = 1;
}

function hitungTotalDanDiskon() {
    let subtotal = 0;
    keranjang.forEach(item => { subtotal += item.harga * item.jumlah; });

    let persentaseDiskon = 0;
    if (subtotal >= 200000) persentaseDiskon = 0.15;
    else if (subtotal >= 100000) persentaseDiskon = 0.10;

    const nominalDiskon = subtotal * persentaseDiskon;
    const totalAkhir = subtotal - nominalDiskon;

    return { subtotal, persentaseDiskon: persentaseDiskon * 100, nominalDiskon, totalAkhir };
}

function tampilkanKeranjang() {
    const tbody = document.getElementById("tabelKeranjang");
    if (!tbody) return;

    let html = "";
    keranjang.forEach((item, index) => {
        html += `
            <tr>
                <td>${item.nama}</td>
                <td>${item.jumlah}</td>
                <td>${formatRupiah(item.harga * item.jumlah)}</td>
                <td><button onclick="hapusKeranjang(${index})" style="background-color: #dc3545; color: white;">Hapus</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const kalkulasi = hitungTotalDanDiskon();
    const totalElement = document.getElementById("total");
    if (totalElement) {
        if (kalkulasi.nominalDiskon > 0) {
            totalElement.innerHTML = `
                <s>${formatRupiah(kalkulasi.subtotal)}</s> <br>
                <small style="color: green;">[Smart Discount ${kalkulasi.persentaseDiskon}%] -${formatRupiah(kalkulasi.nominalDiskon)}</small><br>
                <b>${formatRupiah(kalkulasi.totalAkhir)}</b>
            `;
        } else {
            totalElement.innerText = formatRupiah(kalkulasi.subtotal);
        }
    }
}

function hapusKeranjang(index) {
    keranjang.splice(index, 1);
    tampilkanKeranjang();
}

function bayar() {
    if (keranjang.length === 0) { alert("Keranjang masih kosong!"); return; }
    const pembayaran = Number(document.getElementById("pembayaran").value);
    const kalkulasi = hitungTotalDanDiskon();

    if (pembayaran < kalkulasi.totalAkhir) {
        alert("Uang pembayaran kurang!\nTotal: " + formatRupiah(kalkulasi.totalAkhir));
        return;
    }

    keranjang.forEach(itemKeranjang => {
        const item = barang.find(b => b.idKey === itemKeranjang.idKey);
        if (item) {
            dbBarang.child(item.idKey).update({ stok: item.stok - itemKeranjang.jumlah });
        }
    });

    dbRiwayat.push({
        tanggal: new Date().toLocaleString("id-ID"),
        barang: keranjang.map(i => i.nama).join(", "),
        jumlah: keranjang.reduce((tot, i) => tot + i.jumlah, 0),
        total: kalkulasi.totalAkhir,
        kasir: currentRole || "Kasir"
    });

    const kembalian = pembayaran - kalkulasi.totalAkhir;
    document.getElementById("kembalian").innerText = formatRupiah(kembalian);
    alert("Pembayaran Berhasil! Kembalian: " + formatRupiah(kembalian));

    keranjang = [];
    tampilkanKeranjang();
    document.getElementById("pembayaran").value = "";
}

// ===============================
// PRE-ORDER ONLINE (PELANGGAN, QRIS DP 50%, DELIVERY & SMART PO)
// ===============================

function updateSelectBarangPO() {
    const select = document.getElementById("pilihBarangPO");
    if (!select) return;

    let html = `<option value="">-- Pilih Produk Katalog / Input Manual --</option>`;
    barang.forEach(item => {
        const labelBerat = item.berat ? ` (${item.berat})` : "";
        html += `<option value="${item.idKey}">${item.nama}${labelBerat} - ${formatRupiah(item.harga)}</option>`;
    });
    select.innerHTML = html;
}

function pilihProdukPO() {
    const select = document.getElementById("pilihBarangPO");
    if (!select) return;

    const item = barang.find(b => b.idKey === select.value);
    const inputNama = document.getElementById("barangPreOrder");
    const inputHarga = document.getElementById("hargaSatuanPO");

    if (item) {
        const labelBerat = item.berat ? ` (${item.berat})` : "";
        inputNama.value = `${item.nama}${labelBerat}`;
        inputHarga.value = item.harga;
    } else {
        inputNama.value = "";
        inputHarga.value = "";
    }
    hitungRingkasanPO();
}

function toggleAlamatPO() {
    const metode = document.getElementById("metodeAmbil").value;
    const boxAlamat = document.getElementById("boxAlamatPO");
    if (boxAlamat) {
        boxAlamat.style.display = (metode === "Antar ke Alamat") ? "block" : "none";
    }
}

function hitungRingkasanPO() {
    const hargaEl = document.getElementById("hargaSatuanPO");
    const jumlahEl = document.getElementById("jumlahPreOrder");
    const dpEl = document.getElementById("nominalDP");
    if (!hargaEl || !jumlahEl) return;

    const harga = Number(hargaEl.value) || 0;
    const jumlah = Number(jumlahEl.value) || 1;
    const totalHarga = harga * jumlah;
    const minDP = Math.ceil(totalHarga * 0.5);
    const dpDibayar = Number(dpEl.value) || 0;
    const sisaBayar = Math.max(0, totalHarga - (dpDibayar > 0 ? dpDibayar : minDP));

    document.getElementById("infoTotalPO").innerText = formatRupiah(totalHarga);
    document.getElementById("infoMinDP").innerText = formatRupiah(minDP);
    document.getElementById("infoSisaPO").innerText = formatRupiah(sisaBayar);
}

function estimasiTanggalPO() {
    const jumlah = Number(document.getElementById("jumlahPreOrder").value) || 1;
    const today = new Date();
    
    const poMenunggu = preorder.filter(p => p.status === "Menunggu").length;
    const estimasiHari = (jumlah * 2) + Math.ceil(poMenunggu / 2);

    today.setDate(today.getDate() + estimasiHari);
    const tglHasil = today.getFullYear() + "-" + 
        String(today.getMonth() + 1).padStart(2, "0") + "-" + 
        String(today.getDate()).padStart(2, "0");

    document.getElementById("tanggalAmbil").value = tglHasil;
    alert(`[Smart Estimasi PO]\nEstimasi selesai: ${estimasiHari} hari dari sekarang berdasarkan antrean (${poMenunggu} PO aktif).`);
}

function tambahPreOrderPelanggan() {
    const pelanggan = document.getElementById("namaPelanggan").value.trim();
    const barangPO = document.getElementById("barangPreOrder").value.trim();
    const hargaSatuan = Number(document.getElementById("hargaSatuanPO").value);
    const jumlah = Number(document.getElementById("jumlahPreOrder").value);
    const metodeAmbil = document.getElementById("metodeAmbil").value;
    const alamatPO = document.getElementById("alamatPO").value.trim();
    const tanggal = document.getElementById("tanggalAmbil").value;
    const nominalDP = Number(document.getElementById("nominalDP").value);
    const pengirimQRIS = document.getElementById("pengirimQRIS").value.trim();

    const today = new Date();
    const hariIni = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

    if (pelanggan === "" || barangPO === "" || hargaSatuan <= 0 || jumlah <= 0 || tanggal === "") {
        alert("Mohon lengkapi seluruh data pesanan dan harga barang!");
        return;
    }

    if (metodeAmbil === "Antar ke Alamat" && alamatPO === "") {
        alert("Mohon isi alamat lengkap pengantaran!");
        return;
    }

    if (tanggal < hariIni) {
        alert("Tanggal pengambilan/pengantaran tidak boleh hari yang sudah lewat!");
        return;
    }

    const totalHarga = hargaSatuan * jumlah;
    const minDP = Math.ceil(totalHarga * 0.5);

    if (nominalDP < minDP) {
        alert(`Pembayaran DP minimal 50% (${formatRupiah(minDP)}) wajib dipenuhi sebelum mengirim pesanan!`);
        return;
    }

    if (nominalDP > totalHarga) {
        alert(`Nominal DP tidak boleh melebihi total harga pesanan (${formatRupiah(totalHarga)})!`);
        return;
    }

    if (pengirimQRIS === "") {
        alert("Mohon isi Nama Pengirim / E-Wallet QRIS untuk verifikasi kasir!");
        return;
    }

    const sisaBayar = totalHarga - nominalDP;

    // [FR-09] SMART PO STOCK CHECK (Jumlahkan seluruh batch produk yang cocok)
    const namaBersih = barangPO.split("(")[0].trim().toLowerCase();
    const totalStokProduk = barang
        .filter(b => b.nama.toLowerCase().includes(namaBersih))
        .reduce((acc, b) => acc + Number(b.stok || 0), 0);

    if (totalStokProduk === 0) {
        alert(`[Smart Alert] Stok untuk "${barangPO}" saat ini 0 / belum tersedia.\nPesanan tetap dicatat & memerlukan produksi/restok baru!`);
    } else if (totalStokProduk < jumlah) {
        const kekurangan = jumlah - totalStokProduk;
        alert(`[Smart Alert] Total stok seluruh batch tidak mencukupi!\nStok tersedia: ${totalStokProduk}\nJumlah PO: ${jumlah}\nKekurangan: ${kekurangan} item.`);
    } else {
        alert(`[Smart Alert] Stok tersedia! (${totalStokProduk} unit siap dari batch toko).`);
    }

    dbPreorder.push({
        pelanggan: pelanggan,
        barang: barangPO,
        hargaSatuan: hargaSatuan,
        jumlah: jumlah,
        totalHarga: totalHarga,
        nominalDP: nominalDP,
        sisaBayar: sisaBayar,
        pengirimQRIS: pengirimQRIS,
        dpTerverifikasi: false,
        statusPembayaran: sisaBayar === 0 ? "Lunas (Menunggu Verifikasi)" : "Menunggu Verifikasi DP",
        metodeAmbil: metodeAmbil,
        alamat: metodeAmbil === "Antar ke Alamat" ? alamatPO : "Ambil di Toko",
        tanggal: tanggal,
        status: "Menunggu",
        waktuInput: new Date().toLocaleString("id-ID"),
        lockedByOwner: false,
        lastEditedBy: "Pelanggan"
    }).then(() => {
        document.getElementById("namaPelanggan").value = "";
        document.getElementById("pilihBarangPO").value = "";
        document.getElementById("barangPreOrder").value = "";
        document.getElementById("hargaSatuanPO").value = "";
        document.getElementById("jumlahPreOrder").value = 1;
        document.getElementById("metodeAmbil").value = "Ambil di Toko";
        toggleAlamatPO();
        document.getElementById("alamatPO").value = "";
        document.getElementById("tanggalAmbil").value = "";
        document.getElementById("nominalDP").value = "";
        document.getElementById("pengirimQRIS").value = "";
        hitungRingkasanPO();
        alert("Terima kasih! Pesanan Pre-Order & Konfirmasi DP Anda berhasil dikirim ke Kasir Toko.");
    });
}

function tampilkanPreOrder() {
    const tbody = document.getElementById("tabelPreOrder");
    if (!tbody) return;

    const isPemilik = (currentRole === "Pemilik");

    let html = "";
    const preorderSorted = [...preorder].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    preorderSorted.forEach(item => {
        const isLockedByOwner = item.lockedByOwner === true;
        const disableStatusKasir = (!isPemilik && isLockedByOwner) ? "disabled" : "";

        const badgeLock = isLockedByOwner
            ? `<br><span class="badge-lock">🔒 Dikunci Pemilik</span>`
            : (item.lastEditedBy ? `<br><small style="color: #666;">Diubah: ${item.lastEditedBy}</small>` : "");

        const infoPengiriman = item.metodeAmbil === "Antar ke Alamat"
            ? `<br><span style="color:#0056b3; font-size:12px;">🚚 <b>Antar:</b> ${item.alamat}</span>`
            : `<br><span style="color:#28a745; font-size:12px;">🏪 Ambil di Toko</span>`;

        const totalHarga = item.totalHarga || 0;
        const nominalDP = item.nominalDP || 0;
        const sisaBayar = item.sisaBayar !== undefined ? item.sisaBayar : 0;

        let infoKeuanganHTML = `
            <div style="font-size: 13px; text-align: left;">
                Total: <b>${formatRupiah(totalHarga)}</b><br>
                DP QRIS: <b style="color: #28a745;">${formatRupiah(nominalDP)}</b><br>
                Sisa: <b style="color: ${sisaBayar > 0 ? '#d9534f' : '#28a745'};">${formatRupiah(sisaBayar)}</b><br>
                <small style="color: #555;">Pengirim: ${item.pengirimQRIS || "-"}</small><br>
                <span style="display:inline-block; margin-top:3px; padding:2px 6px; border-radius:4px; font-size:11px; background:${sisaBayar === 0 && item.dpTerverifikasi ? '#d4edda' : '#fff3cd'}; color:#333;">
                    ${item.statusPembayaran || "Belum Ada DP"}
                </span>
            </div>
        `;

        let tombolKeuanganHTML = "";
        if (!item.dpTerverifikasi && nominalDP > 0) {
            tombolKeuanganHTML += `<button onclick="verifikasiDP('${item.idKey}')" style="background-color: #17a2b8; font-size: 12px; padding: 6px 10px;">✔ Terima DP (${formatRupiah(nominalDP)})</button><br>`;
        } else if (item.dpTerverifikasi && sisaBayar > 0) {
            tombolKeuanganHTML += `<button onclick="lunasiSisaPO('${item.idKey}')" style="background-color: #28a745; font-size: 12px; padding: 6px 10px;">💰 Lunasi Sisa (${formatRupiah(sisaBayar)})</button><br>`;
        }

        const tombolHapusHTML = isPemilik
            ? `<button onclick="hapusPreOrder('${item.idKey}')" style="background-color: #dc3545; color: white; font-size: 12px; padding: 6px 10px;">Hapus</button>`
            : "";

        html += `
            <tr>
                <td><b>${item.pelanggan}</b>${infoPengiriman}</td>
                <td>${item.barang} (${item.jumlah}x)</td>
                <td>${infoKeuanganHTML}</td>
                <td><b>${item.tanggal}</b>${badgeLock}</td>
                <td>
                    ${tombolKeuanganHTML}
                    <select onchange="ubahStatus('${item.idKey}', this.value)" ${disableStatusKasir} style="margin-top: 4px;">
                        <option value="Menunggu" ${item.status === "Menunggu" ? "selected" : ""}>Menunggu</option>
                        <option value="Sudah Tersedia" ${item.status === "Sudah Tersedia" ? "selected" : ""}>Sudah Tersedia</option>
                        <option value="Dalam Pengantaran" ${item.status === "Dalam Pengantaran" ? "selected" : ""}>Dalam Pengantaran</option>
                        <option value="Selesai" ${item.status === "Selesai" ? "selected" : ""}>Selesai</option>
                        <option value="Dibatalkan" ${item.status === "Dibatalkan" ? "selected" : ""}>Dibatalkan</option>
                    </select>
                    ${tombolHapusHTML}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function verifikasiDP(idKey) {
    const item = preorder.find(p => p.idKey === idKey);
    if (!item) return;

    if (!confirm(`Konfirmasi bahwa DP QRIS sebesar ${formatRupiah(item.nominalDP)} dari ${item.pengirimQRIS} sudah masuk rekening toko?`)) return;

    const statusBayarBaru = (item.sisaBayar === 0) ? "LUNAS (QRIS)" : `DP Diterima (Sisa ${formatRupiah(item.sisaBayar)})`;

    dbPreorder.child(idKey).update({
        dpTerverifikasi: true,
        statusPembayaran: statusBayarBaru,
        lastEditedBy: currentRole
    });

    dbRiwayat.push({
        tanggal: new Date().toLocaleString("id-ID"),
        barang: `[DP PO] ${item.barang} (${item.pelanggan})`,
        jumlah: item.jumlah,
        total: item.nominalDP,
        kasir: currentRole || "Kasir"
    });

    alert("DP berhasil diverifikasi dan otomatis masuk ke Riwayat Transaksi!");
}

function lunasiSisaPO(idKey) {
    const item = preorder.find(p => p.idKey === idKey);
    if (!item) return;

    if (!confirm(`Proses pelunasan sisa tagihan sebesar ${formatRupiah(item.sisaBayar)} untuk pesanan ${item.pelanggan} (${item.metodeAmbil})?`)) return;

    const sisaYangDibayar = item.sisaBayar;

    dbPreorder.child(idKey).update({
        sisaBayar: 0,
        statusPembayaran: "LUNAS (100%)",
        status: "Selesai",
        lastEditedBy: currentRole,
        lockedByOwner: (currentRole === "Pemilik") ? true : item.lockedByOwner
    });

    dbRiwayat.push({
        tanggal: new Date().toLocaleString("id-ID"),
        barang: `[Pelunasan PO - ${item.metodeAmbil}] ${item.barang} (${item.pelanggan})`,
        jumlah: item.jumlah,
        total: sisaYangDibayar,
        kasir: currentRole || "Kasir"
    });

    alert("Pelunasan berhasil dicatat ke Riwayat Transaksi dan status PO diubah menjadi Selesai!");
}

function ubahStatus(idKey, statusBaru) {
    const item = preorder.find(p => p.idKey === idKey);
    if (!item) return;

    if (currentRole === "Kasir" && item.lockedByOwner === true) {
        alert("Akses Ditolak! Status pesanan ini sudah ditetapkan dan dikunci oleh Pemilik.");
        tampilkanPreOrder();
        return;
    }

    const kunciStatus = (currentRole === "Pemilik") ? true : false;

    dbPreorder.child(idKey).update({
        status: statusBaru,
        lastEditedBy: currentRole,
        lockedByOwner: kunciStatus
    });
}

function hapusPreOrder(idKey) {
    if (currentRole !== "Pemilik") {
        alert("Akses Ditolak! Hanya Pemilik yang berwenang menghapus data pesanan Pre-Order.");
        return;
    }

    if (!confirm("Yakin ingin menghapus data Pre-Order ini secara permanen?")) return;
    dbPreorder.child(idKey).remove();
}

// ===============================
// RIWAYAT TRANSAKSI
// ===============================

function tampilkanRiwayat() {
    const tbody = document.getElementById("tabelRiwayat");
    if (!tbody) return;

    let html = "";
    riwayat.forEach(item => {
        html += `
            <tr>
                <td>${item.tanggal}</td>
                <td>${item.barang || "-"}</td>
                <td>${item.jumlah || "-"}</td>
                <td>${formatRupiah(item.total)}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusRiwayat() {
    if (currentRole !== "Pemilik") {
        alert("Akses Ditolak! Hanya Pemilik yang berwenang menghapus riwayat transaksi.");
        return;
    }
    if (riwayat.length === 0) return;
    if (!confirm("Hapus seluruh data riwayat transaksi?")) return;
    dbRiwayat.remove();
}
