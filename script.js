// ============================================
// BUKU SILIHAN DIGITAL - Firebase Version
// ============================================

// Application State
let loans = [];
let currentFilter = { search: '', date: '' };
let currentUser = null;

// ============================================
// MODERN TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    // Remove existing container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + icons[type] + '</span><span class="toast-message">' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>';
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(function() {
        if (toast.parentElement) {
            toast.classList.add('toast-exit');
            setTimeout(function() {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, 4000);
}

// ============================================
// MODERN CONFIRM DIALOG
// ============================================

function showConfirm(title, message, onConfirm, onCancel, type = 'warning') {
    // Remove existing overlay
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    const icons = {
        warning: '⚠',
        success: '✓',
        danger: '✕'
    };
    
    const titles = {
        warning: 'Konfirmasi',
        success: 'Berhasil',
        danger: 'Hapus Data'
    };
    
    overlay.innerHTML = '<div class="confirm-dialog">' +
        '<div class="confirm-icon ' + type + '">' + icons[type] + '</div>' +
        '<div class="confirm-title">' + titles[type] + '</div>' +
        '<div class="confirm-message">' + message + '</div>' +
        '<div class="confirm-buttons">' +
        '<button class="confirm-btn cancel" id="confirmCancel">Batal</button>' +
        '<button class="confirm-btn confirm ' + (type === 'danger' ? 'danger' : 'primary') + '" id="confirmOk">Ya, Lanjutkan</button>' +
        '</div></div>';
    
    document.body.appendChild(overlay);
    
    // Event handlers
    document.getElementById('confirmCancel').onclick = function() {
        overlay.remove();
        if (onCancel) onCancel();
    };
    
    document.getElementById('confirmOk').onclick = function() {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
    
    // Close on overlay click
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
            if (onCancel) onCancel();
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        showToast('Firebase belum dimuat. Silakan refresh halaman atau periksa koneksi internet.', 'error');
        return;
    }
    
    // Setup auth state listener
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            showMainApp(user);
            loadLoansFromFirestore();
        } else {
            currentUser = null;
            showLoginPage();
        }
    });
    
    // Setup login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

// Show/Hide Pages
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userEmail').textContent = user.email;
    
    setupEventListeners();
    setDefaultDates();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loanForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    window.onclick = function(event) {
        const detailModal = document.getElementById('detailModal');
        const confirmModal = document.getElementById('confirmReturnModal');
        if (event.target === detailModal) closeModal();
        if (event.target === confirmModal) closeConfirmReturnModal();
    };
}

// Set default dates
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('loanDate').value = today;
}

// ============================================
// AUTHENTICATION
// ============================================

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginButton = e.target.querySelector('.btn-login');
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    
    firebase.auth().signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
        showToast('Login berhasil! Selamat datang.', 'success');
    })
    .catch(function(error) {
        let errorMessage = 'Login gagal. Periksa email dan password.';
        
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'Format email tidak valid.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Akun ini telah dinonaktifkan.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'Akun tidak ditemukan.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Password salah.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Jaringan bermasalah. Periksa koneksi internet.';
        }
        
        errorDiv.textContent = errorMessage;
        errorDiv.classList.add('show');
    })
    .finally(function() {
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    });
}

function logout() {
    firebase.auth().signOut()
    .then(function() {
        loans = [];
        renderHistory();
        showToast('Logout berhasil!', 'success');
    })
    .catch(function(error) {
        showToast('Gagal logout: ' + error.message, 'error');
    });
}

// ============================================
// FIRESTORE DATABASE
// ============================================

function loadLoansFromFirestore() {
    db.collection('loans').orderBy('createdAt', 'desc')
    .onSnapshot(function(snapshot) {
        loans = [];
        snapshot.forEach(function(doc) {
            const data = doc.data();
            data.id = doc.id;
            loans.push(data);
        });
        renderHistory();
    }, function(error) {
        console.error('Error loading loans:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
    });
}

function saveLoanToFirestore(loan) {
    db.collection('loans').add(loan)
    .then(function(docRef) {
        loan.id = docRef.id;
        showToast('Data peminjaman berhasil disimpan!', 'success');
    })
    .catch(function(error) {
        console.error('Error saving loan:', error);
        showToast('Gagal menyimpan data: ' + error.message, 'error');
    });
}

function deleteLoanFromFirestore(id) {
    db.collection('loans').doc(id).delete()
    .then(function() {
        showToast('Data berhasil dihapus!', 'success');
    })
    .catch(function(error) {
        console.error('Error deleting loan:', error);
        showToast('Gagal menghapus data: ' + error.message, 'error');
    });
}

function updateLoanInFirestore(id, data) {
    return db.collection('loans').doc(id).update(data);
}

// ============================================
// FORM HANDLING
// ============================================

function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return 'NOTA-' + year + month + day + '-' + hours + minutes + seconds + milliseconds;
}

function addItemRow() {
    const tbody = document.getElementById('itemsBody');
    const newRow = document.createElement('tr');
    newRow.className = 'item-row';
    newRow.innerHTML = '<td><input type="text" class="item-name" placeholder="Barang" required></td>' +
        '<td><input type="number" class="item-quantity" placeholder="Jml" min="1" value="1" required></td>' +
        '<td><input type="text" class="item-note" placeholder="Ket"></td>' +
        '<td><button type="button" class="btn-remove-item" onclick="removeItemRow(this)"><i class="fas fa-trash"></i></button></td>';
    tbody.appendChild(newRow);
}

function removeItemRow(button) {
    const tbody = document.getElementById('itemsBody');
    const rows = tbody.querySelectorAll('.item-row');
    if (rows.length > 1) {
        button.closest('tr').remove();
    } else {
        showToast('Minimal harus ada satu barang!', 'warning');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const borrowerName = document.getElementById('borrowerName').value.trim();
    const loanDate = document.getElementById('loanDate').value;
    const penanggungJawab = document.getElementById('penanggungJawab').value.trim();
    
    if (!borrowerName) {
        showToast('Mohon isi nama peminjam!', 'warning');
        return;
    }
    
    if (!penanggungJawab) {
        showToast('Mohon isi nama penanggung jawab!', 'warning');
        return;
    }
    
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    
    itemRows.forEach(function(row) {
        const name = row.querySelector('.item-name').value.trim();
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        const note = row.querySelector('.item-note').value.trim();
        
        if (name) {
            items.push({ name: name, quantity: quantity, note: note });
        }
    });
    
    if (items.length === 0) {
        showToast('Mohon isi setidaknya satu barang!', 'warning');
        return;
    }
    
    const loan = {
        id: generateInvoiceNumber(),
        borrowerName: borrowerName,
        loanDate: loanDate,
        penanggungJawab: penanggungJawab,
        items: items,
        returnedItems: [],
        returnNotes: '',
        isReturned: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.email
    };
    
    saveLoanToFirestore(loan);
    
    document.getElementById('loanForm').reset();
    setDefaultDates();
    
    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '<tr class="item-row">' +
        '<td><input type="text" class="item-name" placeholder="Barang" required></td>' +
        '<td><input type="number" class="item-quantity" placeholder="Jml" min="1" value="1" required></td>' +
        '<td><input type="text" class="item-note" placeholder="Ket"></td>' +
        '<td><button type="button" class="btn-remove-item" onclick="removeItemRow(this)"><i class="fas fa-trash"></i></button></td></tr>';
}

// ============================================
// HISTORY & SEARCH
// ============================================

function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    let filteredLoans = loans.slice();
    
    if (currentFilter.search) {
        filteredLoans = filteredLoans.filter(function(loan) {
            return loan.borrowerName.toLowerCase().includes(currentFilter.search.toLowerCase());
        });
    }
    
    if (currentFilter.date) {
        filteredLoans = filteredLoans.filter(function(loan) {
            return loan.loanDate === currentFilter.date;
        });
    }
    
    if (filteredLoans.length === 0) {
        historyList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + 
            (loans.length === 0 ? 'Belum ada data peminjaman' : 'Tidak ada hasil pencarian') + '</p></div>';
        return;
    }
    
    historyList.innerHTML = filteredLoans.map(function(loan) {
        const formattedLoanDate = formatDate(loan.loanDate);
        const totalItems = loan.items.reduce(function(sum, item) { return sum + item.quantity; }, 0);
        
        let totalReturned = 0;
        let totalKurang = 0;
        if (loan.returnedItems && loan.returnedItems.length > 0) {
            loan.returnedItems.forEach(function(item) {
                totalReturned += item.returned;
                totalKurang += item.kurang;
            });
        }
        
        const statusText = loan.isReturned 
            ? '<span style="color: #27ae60; font-weight: 600;">✓ Sudah ulih-ulih</span>' 
            : '<span style="color: #f39c12; font-weight: 600;">⟳ Urung ulih-ulih</span>';
        
        return '<div class="history-item" data-id="' + loan.id + '">' +
            '<div class="history-header">' +
            '<div class="history-info">' +
            '<h3>' + escapeHtml(loan.borrowerName) + '</h3>' +
            '<p><i class="fas fa-user-shield"></i> PJ: ' + escapeHtml(loan.penanggungJawab || '-') + '</p>' +
            '<p><i class="fas fa-calendar"></i> ' + formattedLoanDate + '</p>' +
            '<p><i class="fas fa-box"></i> ' + loan.items.length + ' jenis barang (' + totalItems + ' total)</p>' +
            '<p><i class="fas fa-hashtag"></i> ' + loan.id + '</p>' +
            (loan.isReturned ? '<p><i class="fas fa-check-circle"></i> Total Dikembalikan: ' + totalReturned + ' | Kurang: ' + totalKurang + '</p>' : '') +
            '</div>' +
            '<div>' + statusText + '</div></div>' +
            '<div class="history-actions">' +
            '<button class="btn-detail" onclick="showDetail(\'' + loan.id + '\')"><i class="fas fa-eye"></i> Lihat Detail</button>' +
            '<button class="btn-pdf" onclick="downloadPDF(\'' + loan.id + '\')"><i class="fas fa-file-pdf"></i> Download PDF</button>' +
            (!loan.isReturned ? '<button class="btn-confirm" onclick="confirmReturn(\'' + loan.id + '\')"><i class="fas fa-check-circle"></i> Konfirmasi Kembali</button>' : '') +
            '<button class="btn-delete" onclick="deleteLoan(\'' + loan.id + '\')"><i class="fas fa-trash"></i> Hapus Data</button>' +
            '</div></div>';
    }).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleSearch(e) {
    currentFilter.search = e.target.value;
    renderHistory();
}

function filterByDate() {
    const filterDate = document.getElementById('filterDate').value;
    currentFilter.date = filterDate;
    renderHistory();
}

function resetFilter() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDate').value = '';
    currentFilter.search = '';
    currentFilter.date = '';
    renderHistory();
}

// ============================================
// MODAL ACTIONS
// ============================================

function showDetail(id) {
    const loan = loans.find(function(l) { return l.id === id; });
    if (!loan) {
        showToast('Data tidak ditemukan!', 'error');
        return;
    }
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    let itemsHtml = loan.items.map(function(item, index) {
        let returnedQty = '-';
        let kurangQty = '-';
        
        if (loan.returnedItems && loan.returnedItems[index]) {
            returnedQty = loan.returnedItems[index].returned;
            kurangQty = loan.returnedItems[index].kurang;
        }
        
        return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + 
            item.quantity + '</td><td>' + returnedQty + '</td><td>' + kurangQty + '</td><td>' + 
            escapeHtml(item.note || '-') + '</td></tr>';
    }).join('');
    
    const statusText = loan.isReturned 
        ? '<span style="color: #27ae60; font-weight: 600;">✓ Sudah ulih-ulih</span>' 
        : '<span style="color: #f39c12; font-weight: 600;">⟳ Kapan ulih-ulih?</span>';
    
    content.innerHTML = '<div class="detail-header"><h2>Detail Peminjaman</h2><p><strong>Nomor Nota:</strong> ' + loan.id + '</p></div>' +
        '<table class="detail-table"><tr><th>Nama Peminjam</th><td>' + escapeHtml(loan.borrowerName) + '</td></tr>' +
        '<tr><th>Penanggung Jawab</th><td>' + escapeHtml(loan.penanggungJawab || '-') + '</td></tr>' +
        '<tr><th>Tanggal Pinjam</th><td>' + formatDate(loan.loanDate) + '</td></tr>' +
        '<tr><th>Status</th><td>' + statusText + '</td></tr>' +
        (loan.returnNotes ? '<tr><th>Catatan</th><td>' + escapeHtml(loan.returnNotes) + '</td></tr>' : '') +
        '</table><h3 style="margin: 20px 0 15px 0;">Daftar Barang</h3>' +
        '<table class="detail-table"><thead><tr><th>No</th><th>Nama Barang</th><th>Jml Pinjam</th><th>Jml Kembali</th><th>Kurang</th><th>Keterangan</th></tr></thead><tbody>' + 
        itemsHtml + '</tbody></table>' +
        '<div style="margin-top: 20px; text-align: right;"><button class="btn-pdf" onclick="closeModal(); downloadPDF(\'' + loan.id + '\');"><i class="fas fa-file-pdf"></i> Download PDF</button></div>';
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function deleteLoan(id) {
    const loan = loans.find(function(l) { return l.id === id; });
    if (!loan) {
        showToast('Data tidak ditemukan!', 'error');
        return;
    }
    
    showConfirm(
        'Hapus Data?',
        'Yakin data pinjaman beliau ini akan dihapus "' + escapeHtml(loan.borrowerName) + '"? Seng ilang yo ben ilang',
        function() {
            deleteLoanFromFirestore(id);
        },
        function() {},
        'danger'
    );
}

// ============================================
// PDF GENERATION
// ============================================

function downloadPDF(id) {
    const loan = loans.find(function(l) { return l.id === id; });
    if (!loan) {
        showToast('Data tidak ditemukan!', 'error');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('helvetica');
        
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('NOTA PEMINJAMAN BARANG', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Nomor Nota: ' + loan.id, 20, 35);
        doc.text('Tanggal: ' + formatDate(new Date().toISOString()), 20, 42);
        
        doc.setFont(undefined, 'bold');
        doc.text('Nama Peminjam:', 20, 55);
        doc.setFont(undefined, 'normal');
        doc.text(loan.borrowerName, 60, 55);
        
        doc.setFont(undefined, 'bold');
        doc.text('Penanggung Jawab:', 20, 62);
        doc.setFont(undefined, 'normal');
        doc.text(loan.penanggungJawab || '-', 60, 62);
        
        doc.setFont(undefined, 'bold');
        doc.text('Tanggal Pinjam:', 20, 69);
        doc.setFont(undefined, 'normal');
        doc.text(formatDate(loan.loanDate), 60, 69);
        
        doc.setFont(undefined, 'bold');
        doc.text('Status:', 20, 76);
        doc.setFont(undefined, 'normal');
        doc.text(loan.isReturned ? 'Sudah Dikembalikan' : 'Menunggu Konfirmasi', 60, 76);
        
        let yPos = 85;
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPos - 5, 170, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        
        var headers = ['No', 'Nama Barang', 'Jml Pinjam', 'Jml Kembali', 'Kurang', 'Keterangan'];
        var colWidths = [15, 60, 25, 25, 20, 25];
        var xPos = 22;
        
        headers.forEach(function(header, i) {
            doc.text(header, xPos, yPos);
            xPos += colWidths[i];
        });
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        yPos += 10;
        
        loan.items.forEach(function(item, index) {
            xPos = 22;
            
            var returnedQty = '-';
            var kurangQty = '-';
            if (loan.returnedItems && loan.returnedItems[index]) {
                returnedQty = String(loan.returnedItems[index].returned);
                kurangQty = String(loan.returnedItems[index].kurang);
            }
            
            var rowData = [
                String(index + 1),
                item.name.substring(0, 25),
                String(item.quantity),
                returnedQty,
                kurangQty,
                (item.note || '-').substring(0, 15)
            ];
            
            rowData.forEach(function(cell, i) {
                doc.text(cell, xPos, yPos);
                xPos += colWidths[i];
            });
            
            yPos += 8;
        });
        
        yPos = Math.max(yPos + 20, 220);
        doc.line(20, yPos, 90, yPos);
        doc.line(110, yPos, 180, yPos);
        
        doc.setFontSize(9);
        doc.text('Penanggung Jawab:', 35, yPos + 8, { align: 'center' });
        doc.text('Peminjam:', 145, yPos + 8, { align: 'center' });
        
        doc.save(loan.id + '.pdf');
        showToast('PDF berhasil diunduh!', 'success');
        
    } catch (e) {
        console.error('PDF Error:', e);
        showToast('Gagal generate PDF!', 'error');
    }
}

// ============================================
// RETURN CONFIRMATION
// ============================================

function confirmReturn(id) {
    const loan = loans.find(function(l) { return l.id === id; });
    if (!loan) {
        showToast('Data tidak ditemukan!', 'error');
        return;
    }
    
    const modal = document.getElementById('confirmReturnModal');
    const content = document.getElementById('confirmReturnContent');
    
    content.innerHTML = '<div class="detail-header"><h2>Konfirmasi Pengembalian</h2>' +
        '<p><strong>Nomor Nota:</strong> ' + loan.id + '</p>' +
        '<p><strong>Peminjam:</strong> ' + escapeHtml(loan.borrowerName) + '</p></div>' +
        '<form id="confirmReturnForm"><h3 style="margin: 20px 0 15px 0;">Daftar Barang yang Dikembalikan</h3>' +
        '<table class="detail-table"><thead><tr><th>Nama Barang</th><th>Jumlah Pinjam</th><th>Jumlah Kembali</th><th>Kurang</th></tr></thead><tbody>' +
        loan.items.map(function(item, index) {
            return '<tr><td>' + escapeHtml(item.name) + '</td><td>' + item.quantity + '</td>' +
                '<td><input type="number" class="return-quantity" data-index="' + index + '" data-original="' + 
                item.quantity + '" min="0" max="' + item.quantity + '" value="' + item.quantity + '" onchange="updateReturnQuantity(this)"></td>' +
                '<td class="kurang-cell" style="font-weight: bold; color: #27ae60;">0</td></tr>';
        }).join('') +
        '</tbody></table><div style="margin-top: 20px;"><label for="returnNotes"><strong>Catatan Barang Kurang/Rusak:</strong></label>' +
        '<textarea id="returnNotes" rows="4" placeholder="Tuliskan catatan barang yang kurang atau rusak (jika ada)" style="width: 100%; padding: 10px; margin-top: 10px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 1rem;"></textarea></div>' +
        '<div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">' +
        '<button type="button" class="btn-reset" onclick="closeConfirmReturnModal()"><i class="fas fa-times"></i> Batal</button>' +
        '<button type="submit" class="btn-save"><i class="fas fa-check"></i> Konfirmasi</button></div></form>';
    
    modal.style.display = 'block';
    
    document.getElementById('confirmReturnForm').onsubmit = function(e) {
        e.preventDefault();
        saveReturnConfirmation(id);
    };
}

function updateReturnQuantity(input) {
    const original = parseInt(input.dataset.original);
    const returned = parseInt(input.value);
    const kurang = original - returned;
    const row = input.closest('tr');
    row.querySelector('.kurang-cell').textContent = kurang;
    
    if (kurang > 0) {
        row.querySelector('.kurang-cell').style.color = '#e74c3c';
    } else {
        row.querySelector('.kurang-cell').style.color = '#27ae60';
    }
}

function saveReturnConfirmation(id) {
    const loan = loans.find(function(l) { return l.id === id; });
    if (!loan) {
        showToast('Data tidak ditemukan!', 'error');
        return;
    }
    
    const returnedItems = [];
    let totalKurang = 0;
    
    document.querySelectorAll('.return-quantity').forEach(function(input) {
        const index = parseInt(input.dataset.index);
        const original = parseInt(input.dataset.original);
        const returned = parseInt(input.value);
        const kurang = original - returned;
        
        totalKurang += kurang;
        
        returnedItems[index] = {
            returned: returned,
            kurang: kurang
        };
    });
    
    const returnNotes = document.getElementById('returnNotes').value;
    
    const updateData = {
        returnedItems: returnedItems,
        returnNotes: returnNotes,
        isReturned: true,
        returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
        returnedBy: currentUser.email
    };
    
    updateLoanInFirestore(id, updateData)
    .then(function() {
        closeConfirmReturnModal();
        
        if (totalKurang > 0) {
            showToast('Konfirmasi berhasil! ' + totalKurang + ' barang belum dikembalikan.', 'warning');
        } else {
            showToast('Konfirmasi berhasil! Semua barang telah dikembalikan.', 'success');
        }
    })
    .catch(function(error) {
        showToast('Gagal update: ' + error.message, 'error');
    });
}

function closeConfirmReturnModal() {
    document.getElementById('confirmReturnModal').style.display = 'none';
}

// Make functions globally available
window.addItemRow = addItemRow;
window.removeItemRow = removeItemRow;
window.showDetail = showDetail;
window.closeModal = closeModal;
window.deleteLoan = deleteLoan;
window.downloadPDF = downloadPDF;
window.filterByDate = filterByDate;
window.resetFilter = resetFilter;
window.confirmReturn = confirmReturn;
window.closeConfirmReturnModal = closeConfirmReturnModal;
window.updateReturnQuantity = updateReturnQuantity;
window.logout = logout;

