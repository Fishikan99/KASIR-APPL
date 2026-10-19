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

// Data Lokal Sementara di Memori
let barang = [];
let keranjang = [];
let preorder = [];
let riwayat = [];

// ===============================
// SYNC REALTIME FIREBASE KE APLIKASI
// ===============================

// Realtime Listener Data Barang
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
});

// Realtime Listener Data Pre-Order
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

// Realtime Listener Data Riwayat
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
// HELPER FORMAT RUPIAH & PAGE NAVIGATION
// ===============================
function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString("id-ID");
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.style.display = "none";
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.style.display = "block";
}

// ===============================
// KELOLA BARANG (ADMIN)
// ===============================

function tambahBarang() {
    const nama = document.getElementById("namaBarang").value.trim();
    const harga = Number(document.getElementById("hargaBarang").value);
    const stok = Number(document.getElementById("stokBarang").value);

    if (nama === "" || isNaN(harga) || harga <= 0 || isNaN(stok) || stok < 0) {
        alert("Data barang belum lengkap atau format angka salah!");
        return;
    }

    dbBarang.push({
        nama: nama,
        harga: harga,
        stok: stok
    }).then(() => {
        document.getElementById("namaBarang").value = "";
        document.getElementById("hargaBarang").value = "";
        document.getElementById("stokBarang").value = "";
        alert("Barang berhasil ditambahkan!");
    });
}

function tampilkanBarang() {
    const tbody = document.getElementById("tabelBarang");
    if (!tbody) return;

    let html = "";
    barang.forEach(item => {
        html += `
            <tr>
                <td>${item.nama}</td>
                <td>${formatRupiah(item.harga)}</td>
                <td>${item.stok}</td>
                <td>
                    <button onclick="editBarang('${item.idKey}')">Edit</button>
                    <button onclick="hapusBarang('${item.idKey}')" style="background-color: #dc3545; color: white;">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function editBarang(idKey) {
    const item = barang.find(b => b.idKey === idKey);
    if (!item) return;

    const namaBaru = prompt("Nama barang:", item.nama);
    if (namaBaru === null) return;
    const hargaBaru = prompt("Harga barang:", item.harga);
    if (hargaBaru === null) return;
    const stokBaru = prompt("Stok barang:", item.stok);
    if (stokBaru === null) return;

    if (namaBaru.trim() === "" || Number(hargaBaru) <= 0 || Number(stokBaru) < 0) {
        alert("Data tidak valid!");
        return;
    }

    dbBarang.child(idKey).update({
        nama: namaBaru.trim(),
        harga: Number(hargaBaru),
        stok: Number(stokBaru)
    });
    alert("Barang berhasil diubah!");
}

function hapusBarang(idKey) {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    dbBarang.child(idKey).remove();
    alert("Barang berhasil dihapus!");
}

function cariBarang() {
    const keyword = document.getElementById("cariBarang").value.toLowerCase();
    const tbody = document.getElementById("tabelBarang");
    if (!tbody) return;

    let html = "";
    barang.filter(item => item.nama.toLowerCase().includes(keyword)).forEach(item => {
        html += `
            <tr>
                <td>${item.nama}</td>
                <td>${formatRupiah(item.harga)}</td>
                <td>${item.stok}</td>
                <td>
                    <button onclick="editBarang('${item.idKey}')">Edit</button>
                    <button onclick="hapusBarang('${item.idKey}')" style="background-color: #dc3545; color: white;">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ===============================
// TRANSAKSI KASIR & SMART DISCOUNT
// ===============================

function updateSelectBarang() {
    const select = document.getElementById("pilihBarang");
    if (!select) return;

    let html = `<option value="">-- Pilih Barang --</option>`;
    barang.forEach(item => {
        if (item.stok > 0) {
            html += `
                <option value="${item.idKey}">
                    ${item.nama} - ${formatRupiah(item.harga)} (Stok: ${item.stok})
                </option>
            `;
        }
    });
    select.innerHTML = html;
}

function tambahKeranjang() {
    const idKey = document.getElementById("pilihBarang").value;
    const jumlah = Number(document.getElementById("jumlahBarang").value);
    const item = barang.find(b => b.idKey === idKey);

    if (!item) { alert("Pilih barang terlebih dahulu!"); return; }
    if (jumlah <= 0) { alert("Jumlah barang harus > 0!"); return; }
    if (jumlah > item.stok) { alert("Stok barang tidak cukup!"); return; }

    const sudahAda = keranjang.find(k => k.idKey === idKey);
    if (sudahAda) {
        if (sudahAda.jumlah + jumlah > item.stok) { alert("Jumlah melebihi stok!"); return; }
        sudahAda.jumlah += jumlah;
    } else {
        keranjang.push({ idKey: item.idKey, nama: item.nama, harga: item.harga, jumlah: jumlah });
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
        total: kalkulasi.totalAkhir
    });

    const kembalian = pembayaran - kalkulasi.totalAkhir;
    document.getElementById("kembalian").innerText = formatRupiah(kembalian);
    alert("Pembayaran Berhasil! Kembalian: " + formatRupiah(kembalian));

    keranjang = [];
    tampilkanKeranjang();
    document.getElementById("pembayaran").value = "";
}

// ===============================
// PRE-ORDER ONLINE (PELANGGAN & SMART PO)
// ===============================

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
    const jumlah = Number(document.getElementById("jumlahPreOrder").value);
    const tanggal = document.getElementById("tanggalAmbil").value;

    const today = new Date();
    const hariIni = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

    if (pelanggan === "" || barangPO === "" || jumlah <= 0 || tanggal === "") {
        alert("Mohon lengkapi seluruh form Pre-Order!");
        return;
    }

    if (tanggal < hariIni) {
        alert("Tanggal pengambilan tidak boleh hari yang sudah lewat!");
        return;
    }

    dbPreorder.push({
        pelanggan: pelanggan,
        barang: barangPO,
        jumlah: jumlah,
        tanggal: tanggal,
        status: "Menunggu",
        waktuInput: new Date().toLocaleString("id-ID")
    }).then(() => {
        document.getElementById("namaPelanggan").value = "";
        document.getElementById("barangPreOrder").value = "";
        document.getElementById("jumlahPreOrder").value = 1;
        document.getElementById("tanggalAmbil").value = "";
        alert("Terima kasih! Pesanan Pre-Order Anda berhasil dikirim ke Kasir Toko.");
    });
}

function tampilkanPreOrder() {
    const tbody = document.getElementById("tabelPreOrder");
    if (!tbody) return;

    let html = "";
    const preorderSorted = [...preorder].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    preorderSorted.forEach(item => {
        html += `
            <tr>
                <td>${item.pelanggan}</td>
                <td>${item.barang}</td>
                <td>${item.jumlah}</td>
                <td><b>${item.tanggal}</b></td>
                <td>
                    <select onchange="ubahStatus('${item.idKey}', this.value)">
                        <option value="Menunggu" ${item.status === "Menunggu" ? "selected" : ""}>Menunggu</option>
                        <option value="Sudah Tersedia" ${item.status === "Sudah Tersedia" ? "selected" : ""}>Sudah Tersedia</option>
                        <option value="Selesai" ${item.status === "Selesai" ? "selected" : ""}>Selesai</option>
                    </select>
                    <button onclick="hapusPreOrder('${item.idKey}')" style="background-color: #dc3545; color: white;">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function ubahStatus(idKey, statusBaru) {
    dbPreorder.child(idKey).update({ status: statusBaru });
}

function hapusPreOrder(idKey) {
    if (!confirm("Yakin ingin menghapus data Pre-Order ini?")) return;
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
    if (riwayat.length === 0) return;
    if (!confirm("Hapus seluruh data riwayat transaksi?")) return;
    dbRiwayat.remove();
}
