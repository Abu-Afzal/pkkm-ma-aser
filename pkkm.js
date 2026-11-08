// PKKM Digital - MA. As'adiyah Ereng-Ereng
// Tahun Ajaran: 2026/2027

const firebaseConfig = {
  apiKey: "AIzaSyDuAGy8Ku7Jh0is5WanEIf-A12AsVi2Kho",
  authDomain: "pkkm-aser-281a4.firebaseapp.com",
  projectId: "pkkm-aser-281a4",
  storageBucket: "pkkm-aser-281a4.firebasestorage.app",
  messagingSenderId: "17368843878",
  appId: "1:17368843878:web:70babcedfbb0002f170fa7",
  measurementId: "G-0T4Z0B2MXP"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let userData = null;
let pkkmData = [];
let allUsers = [];
let currentSubBuktiId = null;
const currentTahun = '2026/2027';

document.addEventListener('DOMContentLoaded', function() {
    loadPKKMData();
    auth.onAuthStateChanged(function(user) {
        if (user) {
            db.collection('users').where('email', '==', user.email).get().then(function(snapshot) {
                var dbData = {};
                var docId = null;
                if (!snapshot.empty) {
                    var doc = snapshot.docs[0];
                    dbData = doc.data();
                    docId = doc.id;
                }
                userData = { uid: user.uid, email: user.email, nama: dbData.nama || user.email.split('@')[0], role: dbData.role || 'guru', docId: docId };
                updateUIForLoggedInUser();
                renderDashboard();
                if (userData.role === 'admin' || userData.role === 'kepala') loadAdminData();
            }).catch(function(err) {
                console.error('Error:', err);
                userData = { uid: user.uid, email: user.email, nama: user.email.split('@')[0], role: 'guru' };
                updateUIForLoggedInUser();
                renderDashboard();
            });
        } else {
            userData = null;
            updateUIForGuest();
            renderDashboard();
        }
    });
});

window.switchMainTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(function(tab) { tab.style.display = 'none'; tab.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
    var selectedTab = document.getElementById('tab-' + tabName);
    var selectedBtn = document.getElementById('tabBtn' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (selectedTab) { selectedTab.style.display = 'block'; selectedTab.classList.add('active'); }
    if (selectedBtn) selectedBtn.classList.add('active');
};

function loadPKKMData() {
    db.collection('pkkm_aspek').orderBy('kode').get().then(function(aspekSnapshot) {
        db.collection('pkkm_indikator').get().then(function(indikatorSnapshot) {
            db.collection('pkkm_uploads').where('tahun_ajaran', '==', currentTahun).get().then(function(uploadsSnapshot) {
                var uploadsMap = {};
                uploadsSnapshot.forEach(function(doc) {
                    var data = doc.data();
                    var key = data.sub_bukti_id || data.indikator_id;
                    if (!uploadsMap[key]) uploadsMap[key] = [];
                    uploadsMap[key].push({ id: doc.id, ...data });
                });

                pkkmData = [];
                var totalSubBukti = 0, selesaiSubBukti = 0;

                aspekSnapshot.forEach(function(aspekDoc) {
                    var aspek = { id: aspekDoc.id, ...aspekDoc.data(), indikator: [] };
                    indikatorSnapshot.forEach(function(indDoc) {
                        var ind = indDoc.data();
                        if (ind.aspek_id === aspek.id) {
                            var buktiList = ind.bukti_list || [];
                            var indikatorWithUploads = { 
                                id: indDoc.id, ...ind, 
                                bukti_uploads: buktiList.map(function(bukti) {
                                    var uploads = uploadsMap[bukti.id] || [];
                                    return { ...bukti, uploads: uploads };
                                })
                            };
                            buktiList.forEach(function(bukti) {
                                totalSubBukti++;
                                if ((uploadsMap[bukti.id] || []).length > 0) selesaiSubBukti++;
                            });
                            aspek.indikator.push(indikatorWithUploads);
                        }
                    });
                    pkkmData.push(aspek);
                });

                var statTotalEl = document.getElementById('statTotal');
                var statSelesaiEl = document.getElementById('statSelesai');
                var statBelumEl = document.getElementById('statBelum');
                if (statTotalEl) statTotalEl.textContent = totalSubBukti;
                if (statSelesaiEl) statSelesaiEl.textContent = selesaiSubBukti;
                if (statBelumEl) statBelumEl.textContent = totalSubBukti - selesaiSubBukti;
                
                var loadingData = document.getElementById('loadingData');
                if (loadingData) loadingData.style.display = 'none';
                
                renderDashboard();
            });
        });
    }).catch(function(error) {
        console.error("Error loading data:", error);
        var loadingData = document.getElementById('loadingData');
        if (loadingData) loadingData.style.display = 'none';
    });
}

function renderDashboard() {
    var container = document.getElementById('aspekContainer');
    if (!container) return;
    if (pkkmData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;"><p>Belum ada data. Login sebagai admin dan jalankan "Setup Data Awal".</p></div>';
        return;
    }
    
    var html = '';
    pkkmData.forEach(function(aspek) {
        var aspekTotal = 0, aspekSelesai = 0;
        aspek.indikator.forEach(function(ind) {
            ind.bukti_uploads.forEach(function(b) {
                aspekTotal++;
                if (b.uploads.length > 0) aspekSelesai++;
            });
        });
        var progress = aspekTotal > 0 ? Math.round((aspekSelesai / aspekTotal) * 100) : 0;
        var progressColor = progress === 100 ? '#10b981' : '#0891b2';
        var badgeBg = progress === 100 ? '#dcfce7' : (progress > 0 ? '#fef3c7' : '#fee2e2');
        var badgeColor = progress === 100 ? '#166534' : (progress > 0 ? '#92400e' : '#991b1b');

        html += '<div class="aspek-item" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fafafa;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
        html += '<div class="aspek-title" style="font-weight: 700; color: #0e7490;"><i class="fas fa-folder-open"></i> Dimensi ' + aspek.kode + ': ' + aspek.nama + '</div>';
        html += '<span class="badge" style="background: ' + badgeBg + '; color: ' + badgeColor + '; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">' + progress + '%</span>';
        html += '</div>';
        html += '<div style="background: #e2e8f0; height: 6px; border-radius: 3px; margin-bottom: 16px; overflow: hidden;">';
        html += '<div style="background: ' + progressColor + '; height: 100%; width: ' + progress + '%;"></div>';
        html += '</div>';
        html += '<div class="indikator-list">';

        aspek.indikator.forEach(function(ind) {
            var isAssigned = userData && ind.penugasan && ind.penugasan.some(function(p) { return p.toLowerCase().includes(userData.nama.toLowerCase().split(',')[0]); });
            
            html += '<div class="indikator-item" style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e2e8f0;">';
            html += '<div style="font-weight: 700; font-size: 1rem; color: #0f172a; margin-bottom: 6px;">';
            html += '<i class="fas fa-bullseye" style="color: #0891b2;"></i> ' + ind.kode + ' - ' + ind.pertanyaan;
            html += '</div>';
            html += '<div style="font-size: 0.85rem; color: #64748b; margin-bottom: 14px; padding-left: 24px;">';
            html += '<i class="fas fa-users"></i> <strong>Penanggung Jawab:</strong> ' + (ind.penugasan ? ind.penugasan.join(', ') : '-');
            html += '</div>';
            html += '<div style="border-top: 1px dashed #e2e8f0; padding-top: 12px;">';
            html += '<div style="font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 10px;">';
            html += '<i class="fas fa-list-check"></i> Bukti yang harus diupload:';
            html += '</div>';

            ind.bukti_uploads.forEach(function(bukti, idx) {
                var hasUpload = bukti.uploads.length > 0;
                var lastUpload = hasUpload ? bukti.uploads[bukti.uploads.length - 1] : null;
                var isMyUpload = lastUpload && lastUpload.guru_uid === (userData ? userData.uid : null);
                var borderColor = hasUpload ? '#10b981' : '#cbd5e1';
                var bgColor = hasUpload ? '#f0fdf4' : '#f8fafc';
                var iconHtml = hasUpload ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-circle" style="color: #cbd5e1;"></i>';

                html += '<div style="background: ' + bgColor + '; padding: 10px 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid ' + borderColor + '; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
                html += '<div style="flex: 1; min-width: 0;">';
                html += '<div style="font-size: 0.9rem; font-weight: 600; color: #0f172a;">' + iconHtml + ' ' + (idx + 1) + '. ' + bukti.nama + '</div>';
                if (hasUpload) {
                    html += '<div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;"><i class="fas fa-file"></i> ' + lastUpload.file_name + ' - diupload oleh ' + lastUpload.guru_nama + '</div>';
                } else {
                    html += '<div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;"><i class="fas fa-clock"></i> Belum ada dokumen</div>';
                }
                html += '</div>';
                html += '<div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">';
                
                if (hasUpload) {
                    var safeUpload = JSON.stringify(lastUpload).replace(/'/g, "\\'");
                    html += '<button onclick="previewFile(\'' + safeUpload + '\')" style="background: #6366f1; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; width: 90px;"><i class="fas fa-eye"></i> Preview</button>';
                    html += '<button onclick="downloadFile(\'' + safeUpload + '\')" style="background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; width: 90px;"><i class="fas fa-download"></i> Download</button>';
                }
                
                if (userData) {
                    if (isAssigned) {
                        var safeIndId = ind.id.replace(/'/g, "\\'");
                        var safeKode = ind.kode.replace(/'/g, "\\'");
                        var safeBuktiId = bukti.id.replace(/'/g, "\\'");
                        var safeBuktiNama = bukti.nama.replace(/'/g, "\\'");
                        var safePertanyaan = ind.pertanyaan.replace(/'/g, "\\'");
                        var uploadIcon = (hasUpload && isMyUpload) ? 'sync-alt' : 'upload';
                        var uploadText = (hasUpload && isMyUpload) ? 'Ganti' : 'Upload';
                        html += '<button onclick="openUploadModal(\'' + safeIndId + '\', \'' + safeKode + '\', \'' + safeBuktiId + '\', \'' + safeBuktiNama + '\', \'' + safePertanyaan + '\')" style="background: #0891b2; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; width: 90px;"><i class="fas fa-' + uploadIcon + '"></i> ' + uploadText + '</button>';
                        if (hasUpload) {
                            html += '<button onclick="deleteUpload(\'' + lastUpload.id + '\')" style="background: #ef4444; color: white; padding: 5px 10px; border-radius: 5px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; width: 90px;"><i class="fas fa-trash"></i> Hapus</button>';
                        }
                    } else {
                        html += '<button disabled style="background: #e2e8f0; color: #94a3b8; padding: 5px 10px; border-radius: 5px; border: none; font-size: 0.8rem; width: 90px; cursor: not-allowed;"><i class="fas fa-lock"></i> Kunci</button>';
                    }
                }
                
                html += '</div></div>';
            });

            html += '</div></div>';
        });

        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

window.previewFile = function(uploadDataStr) {
    var uploadData = typeof uploadDataStr === 'string' ? JSON.parse(uploadDataStr) : uploadDataStr;
    if (!uploadData) return;
    if (uploadData.file_type === 'link' && uploadData.file_drive_link) {
        window.open(uploadData.file_drive_link, '_blank');
        return;
    }
    if (uploadData.file_base64) {
        try {
            var byteCharacters = atob(uploadData.file_base64.split(',')[1]);
            var byteNumbers = new Array(byteCharacters.length);
            for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            var blob = new Blob([byteArray], { type: 'application/pdf' });
            var blobUrl = URL.createObjectURL(blob);
            var newWindow = window.open();
            if (newWindow) {
                newWindow.document.write('<!DOCTYPE html><html><head><title>Preview</title><style>body{margin:0;padding:0;}iframe{width:100%;height:100vh;border:none;}</style></head><body><iframe src="' + blobUrl + '" type="application/pdf"></iframe></body></html>');
                newWindow.document.close();
            }
        } catch (error) {
            alert('Gagal membuka preview.');
        }
    }
};

window.downloadFile = function(uploadDataStr) {
    var uploadData = typeof uploadDataStr === 'string' ? JSON.parse(uploadDataStr) : uploadDataStr;
    if (!uploadData) return;
    if (uploadData.file_type === 'link' && uploadData.file_drive_link) {
        window.open(uploadData.file_drive_link, '_blank');
        return;
    }
    if (uploadData.file_base64) {
        var link = document.createElement('a');
        link.href = uploadData.file_base64;
        link.download = uploadData.file_name || 'dokumen.pdf';
        link.click();
    }
};

function updateUIForGuest() {
    document.getElementById('guestBadge').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('btnLogin').style.display = 'inline-block';
    document.getElementById('btnLogout').style.display = 'none';
    document.getElementById('mainNavTabs').style.display = 'none';
    document.getElementById('tabBtnAdmin').style.display = 'none';
    document.getElementById('tab-admin').style.display = 'none';
    document.getElementById('tab-dashboard').style.display = 'block';
}

function updateUIForLoggedInUser() {
    document.getElementById('guestBadge').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userName').textContent = userData.nama;
    document.getElementById('userRole').textContent = userData.role.toUpperCase();
    document.getElementById('btnLogin').style.display = 'none';
    document.getElementById('btnLogout').style.display = 'inline-block';
    document.getElementById('mainNavTabs').style.display = 'flex';
    document.getElementById('tabBtnAdmin').style.display = (userData.role === 'admin' || userData.role === 'kepala') ? 'inline-block' : 'none';
    switchMainTab('dashboard');
}

window.openLoginModal = function() { document.getElementById('loginModal').classList.add('active'); };
window.closeLoginModal = function() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('loginError').style.display = 'none';
};
window.doLogin = function() {
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password).then(function() {
        window.closeLoginModal();
    }).catch(function(error) {
        document.getElementById('loginError').textContent = 'Error: ' + error.message;
        document.getElementById('loginError').style.display = 'block';
    });
};
window.logout = function() { auth.signOut(); };
window.closeModal = function() { document.getElementById('uploadModal').classList.remove('active'); };

var uploadMode = 'file';

window.switchUploadMode = function(mode) {
    uploadMode = mode;
    var btnFile = document.getElementById('btnModeFile');
    var btnLink = document.getElementById('btnModeLink');
    var divFile = document.getElementById('uploadModeFile');
    var divLink = document.getElementById('uploadModeLink');
    
    if (mode === 'file') {
        btnFile.style.background = '#0891b2'; btnFile.style.color = 'white';
        btnLink.style.background = '#e2e8f0'; btnLink.style.color = '#475569';
        divFile.style.display = 'block';
        divLink.style.display = 'none';
    } else {
        btnLink.style.background = '#0891b2'; btnLink.style.color = 'white';
        btnFile.style.background = '#e2e8f0'; btnFile.style.color = '#475569';
        divFile.style.display = 'none';
        divLink.style.display = 'block';
    }
};

window.openUploadModal = function(indId, kode, subBuktiId, subBuktiNama, pertanyaan) {
    if (!userData) { alert('Silakan login terlebih dahulu!'); return; }
    currentSubBuktiId = subBuktiId;
    document.getElementById('modalIndikatorTitle').textContent = kode + ' - ' + pertanyaan;
    document.getElementById('modalBuktiTitle').textContent = 'Bukti: ' + subBuktiNama;
    document.getElementById('fileNameDisplay').textContent = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('driveLinkInput').value = '';
    switchUploadMode('file');
    document.getElementById('uploadModal').classList.add('active');
};

window.handleFileSelectPreview = function(event) {
    var file = event.target.files[0];
    var display = document.getElementById('fileNameDisplay');
    if (file) {
        var sizeKB = (file.size / 1024).toFixed(1);
        display.innerHTML = '<i class="fas fa-file"></i> ' + file.name + ' <span style="color: #64748b; font-size: 0.85rem;">(' + sizeKB + ' KB)</span>';
        if (file.size > 500 * 1024) {
            display.innerHTML += '<br><span style="color: #ef4444; font-size: 0.8rem;">Melebihi 500KB. Gunakan tab Link Google Drive atau kompres file.</span>';
        }
    }
};

window.submitUpload = function() {
    if (uploadMode === 'link') {
        var link = document.getElementById('driveLinkInput').value.trim();
        if (!link) { alert('Harap masukkan link Google Drive!'); return; }
        if (link.indexOf('drive.google.com') === -1) { alert('Link tidak valid!'); return; }
        
        var data = {
            indikator_id: currentSubBuktiId.split('.').slice(0, 3).join('.'),
            sub_bukti_id: currentSubBuktiId,
            guru_uid: userData.uid,
            guru_nama: userData.nama,
            file_name: 'Dokumen Google Drive',
            file_drive_link: link,
            file_type: 'link',
            tahun_ajaran: currentTahun,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        saveToFirestore(data);
    } else {
        var file = document.getElementById('fileInput').files[0];
        if (!file) { alert('Harap pilih file!'); return; }
        if (file.size > 500 * 1024) {
            alert('Ukuran file terlalu besar! Maksimal: 500 KB. Ukuran: ' + (file.size / 1024).toFixed(1) + ' KB.');
            return;
        }

        var display = document.getElementById('fileNameDisplay');
        display.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
        
        var reader = new FileReader();
        reader.onload = function() {
            var base64String = reader.result;
            var data = {
                indikator_id: currentSubBuktiId.split('.').slice(0, 3).join('.'),
                sub_bukti_id: currentSubBuktiId,
                guru_uid: userData.uid,
                guru_nama: userData.nama,
                file_name: file.name,
                file_base64: base64String,
                file_size: (file.size / 1024).toFixed(1) + ' KB',
                file_type: 'file',
                tahun_ajaran: currentTahun,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            saveToFirestore(data);
        };
        reader.onerror = function(error) {
            alert('Gagal upload: ' + error);
            display.textContent = '';
        };
        reader.readAsDataURL(file);
    }
};

function saveToFirestore(data) {
    var display = document.getElementById('fileNameDisplay');
    if (display && uploadMode === 'file') display.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    
    db.collection('pkkm_uploads')
        .where('sub_bukti_id', '==', currentSubBuktiId)
        .where('guru_uid', '==', userData.uid)
        .where('tahun_ajaran', '==', currentTahun)
        .get().then(function(existing) {
            if (!existing.empty) {
                return existing.docs[0].ref.update(data);
            } else {
                data.uploaded_at = firebase.firestore.FieldValue.serverTimestamp();
                return db.collection('pkkm_uploads').add(data);
            }
        }).then(function() {
            alert('Berhasil disimpan untuk Tahun Ajaran ' + currentTahun + '!');
            window.closeModal();
            loadPKKMData();
        }).catch(function(error) {
            alert('Gagal menyimpan: ' + error.message);
            if (display) display.textContent = '';
        });
}

window.deleteUpload = function(uploadId) {
    if (!userData) { alert('Silakan login!'); return; }
    if (!confirm('Yakin ingin menghapus bukti ini?')) return;
    db.collection('pkkm_uploads').doc(uploadId).delete().then(function() {
        alert('File berhasil dihapus!');
        loadPKKMData();
    }).catch(function(error) {
        alert('Gagal: ' + error.message);
    });
};

function checkAdminAccess() {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'kepala')) {
        alert('Akses ditolak!');
        return false;
    }
    return true;
}

function loadAdminData() {
    db.collection('users').get().then(function(usersSnapshot) {
        allUsers = [];
        usersSnapshot.forEach(function(doc) { allUsers.push({ id: doc.id, ...doc.data() }); });
        allUsers.sort(function(a, b) { return (a.nama || '').localeCompare(b.nama || ''); });
        renderAdminUsersTable();
        renderAdminAssignments();
    });
}

function renderAdminUsersTable() {
    var tbody = document.getElementById('adminUsersTable');
    if (!tbody) return;
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #64748b;">Belum ada user</td></tr>';
        return;
    }
    var html = '';
    allUsers.forEach(function(user) {
        var roleBg = user.role === 'admin' ? '#ef4444' : (user.role === 'kepala' ? '#0891b2' : '#10b981');
        html += '<tr>';
        html += '<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">' + (user.nama || '-') + '</td>';
        html += '<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">' + (user.email || '-') + '</td>';
        html += '<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">';
        if (user.password) {
            html += '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; font-family: monospace;">' + user.password + '</span>';
        } else {
            html += '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Belum diset</span>';
        }
        html += '</td>';
        html += '<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><span style="background: ' + roleBg + '; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">' + (user.role || 'guru').toUpperCase() + '</span></td>';
        html += '<td style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 4px;">';
        if (!user.password) {
            html += '<button onclick="setPassword(\'' + user.uid + '\', \'' + user.email + '\')" style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;"><i class="fas fa-key"></i></button>';
        }
        html += '<button onclick="deleteUser(\'' + user.uid + '\')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i></button>';
        html += '</td></tr>';
    });
    tbody.innerHTML = html;
}

window.setPassword = function(userId, email) {
    var newPassword = prompt('Password baru untuk ' + email + ' (Min. 6 karakter):');
    if (!newPassword || newPassword.length < 6) { alert('Minimal 6 karakter!'); return; }
    if (!confirm('Set password "' + newPassword + '" untuk ' + email + '?')) return;
    db.collection('users').doc(userId).update({ password: newPassword }).then(function() {
        alert('Password diset: ' + newPassword);
        loadAdminData();
    }).catch(function(error) { alert('Gagal: ' + error.message); });
};

window.exportUsersToExcel = function() {
    if (allUsers.length === 0) return alert('Tidak ada data!');
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table{border-collapse:collapse;width:100%}th{background:#0891b2;color:#fff;padding:12px;border:1px solid #ddd;text-align:left}td{padding:10px;border:1px solid #ddd}tr:nth-child(even){background:#f9fafb}</style></head><body><table><thead><tr><th>No</th><th>Nama</th><th>Email</th><th>Password</th><th>Role</th></tr></thead><tbody>';
    allUsers.forEach(function(u, i) {
        var roleBg = u.role === 'admin' ? '#fee2e2;color:#dc2626' : '#d1fae5;color:#059669';
        html += '<tr><td>' + (i+1) + '</td><td>' + (u.nama||'') + '</td><td>' + (u.email||'') + '</td><td>' + (u.password||'') + '</td><td style="background:' + roleBg + ';font-weight:bold;padding:4px 8px;border-radius:4px;">' + (u.role||'guru').toUpperCase() + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a'); link.href = url; link.download = 'User_PKKM_' + new Date().toISOString().split('T')[0] + '.xls';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    alert('Berhasil mengunduh ' + allUsers.length + ' user!');
};

window.deleteUser = function(userId) {
    if (!checkAdminAccess() || !confirm('Yakin hapus user ini?')) return;
    db.collection('users').doc(userId).delete().then(function() { alert('User dihapus.'); loadAdminData(); })
    .catch(function(error) { alert('Gagal: ' + error.message); });
};

function renderAdminAssignments() {
    var filter = document.getElementById('filterDimensi').value;
    var container = document.getElementById('adminAssignmentList');
    if (!container) return;
    var filtered = [];
    pkkmData.forEach(function(aspek) { if (filter === 'all' || aspek.kode === filter) filtered.push.apply(filtered, aspek.indikator); });
    if (filtered.length === 0) { container.innerHTML = '<p style="text-align:center;padding:40px;color:#64748b;">Belum ada data.</p>'; return; }
    
    var html = '';
    filtered.forEach(function(ind) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;background:white;">';
        html += '<div style="font-weight:700;color:#0e7490;margin-bottom:8px;">' + ind.kode + ' - ' + ind.pertanyaan + '</div>';
        html += '<div style="margin-bottom:12px;"><strong style="font-size:0.9rem;">Pilih Penanggung Jawab:</strong>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:8px;">';
        allUsers.filter(function(u) { return u.role !== 'admin'; }).forEach(function(user) {
            var checked = (ind.penugasan && ind.penugasan.indexOf(user.nama) !== -1) ? 'checked' : '';
            html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;background:#f8fafc;border-radius:4px;cursor:pointer;">';
            html += '<input type="checkbox" value="' + user.nama + '" ' + checked + '>';
            html += '<span style="font-size:0.9rem;">' + user.nama + '</span></label>';
        });
        html += '</div></div>';
        html += '<button onclick="saveAssignment(\'' + ind.id + '\', this)" style="background:#10b981;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85rem;"><i class="fas fa-save"></i> Simpan Penugasan</button>';
        html += '</div>';
    });
    container.innerHTML = html;
}

window.saveAssignment = function(indikatorId, btn) {
    if (!checkAdminAccess()) return;
    var checkboxes = btn.parentElement.querySelectorAll('input[type="checkbox"]:checked');
    var penugasan = [];
    checkboxes.forEach(function(cb) { penugasan.push(cb.value); });
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    db.collection('pkkm_indikator').doc(indikatorId).update({ penugasan: penugasan, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { alert('Penugasan disimpan!'); loadPKKMData(); })
    .catch(function(error) { alert('Gagal: ' + error.message); })
    .finally(function() { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan Penugasan'; });
};

window.setupDataPKKM = function() {
    if (!checkAdminAccess() || !confirm('Isi database dengan indikator + sub-bukti PKKM lengkap untuk MA. As\'adiyah Ereng-Ereng?')) return;
    
    var aspekList = [
        { kode: 'A', nama: 'Usaha Pengembangan Madrasah' },
        { kode: 'B', nama: 'Pelaksanaan Tugas Manajerial' },
        { kode: 'C', nama: 'Pengembangan Kewirausahaan' },
        { kode: 'D', nama: 'Supervisi Kepada Guru dan Tenaga Kependidikan' },
        { kode: 'E', nama: 'Hasil Kinerja Kepala Madrasah' }
    ];
    
    var promises = [];
    aspekList.forEach(function(asp) {
        promises.push(db.collection('pkkm_aspek').doc('aspek_' + asp.kode).set(asp));
    });
    
    var timA = ['Nur Asia S.Pd', 'Eka Sasmita S.Sos', 'Fahrir S.Pd', 'Haerunnisa S.Pd M.Pd', 'Khusnul Inayah S.Pd', 'Erwin S.Pd', 'Panji S.Pd', 'Nur Faida Ulfa S.Kom'];
    var timB = ['Wahyuni S.Pd', 'Nur Syamsi S.Pd', 'Andi Irnawanti Nursak S.Pd', 'Nur Hikmah S.Pd', 'Halijah S.Pd', 'Marwati S.Pd M.Pd', 'Lukman SE'];
    var timC = ['Kasmidar S.Pd', 'Lisa Aswirayanti SE', 'Nur Syamsi S.Hum', 'Fajrul Ikhsan Alimuddin S.Pd'];
    var timD = ['Nur Syamsi S.Pd.I', 'St. Muawwafah S.Pd', 'St. Syamsiah S.Ag', 'Nurul Faiqah Jamal S.Pd'];
    var timE = ['Andi Arifuddin Nowa S.Sos'];

    var indikatorList = [
        { aspek_id: 'aspek_A', kode: 'A.1.1.1', pertanyaan: 'Mampu mengembangkan struktur organisasi yang sesuai dengan kebutuhan program.', bukti_list: [
            { id: 'A.1.1.1.1', nama: 'Bagan/struktur organisasi' },
            { id: 'A.1.1.1.2', nama: 'Notulen rapat keputusan tentang penyusunan struktur organisasi' },
            { id: 'A.1.1.1.3', nama: 'Dokumen sosialisasi' },
            { id: 'A.1.1.1.4', nama: 'Daftar hadir' }
        ], penugasan: timA },
        { aspek_id: 'aspek_A', kode: 'A.1.1.2', pertanyaan: 'Mampu menempatkan personalia yang sesuai dengan kebutuhan.', bukti_list: [
            { id: 'A.1.1.2.1', nama: 'Dokumen penetapan/pengesahan susunan organisasi madrasah' },
            { id: 'A.1.1.2.2', nama: 'Rincian tugas setiap personil pada struktur organisasi madrasah' },
            { id: 'A.1.1.2.3', nama: 'Sertifikat' },
            { id: 'A.1.1.2.4', nama: 'SOP Personalia' }
        ], penugasan: timA },
        { aspek_id: 'aspek_A', kode: 'A.1.1.3', pertanyaan: 'Mampu mengembangkan pedoman dan prosedur kerja organisasi madrasah.', bukti_list: [
            { id: 'A.1.1.3.1', nama: 'Dokumen SOP madrasah' },
            { id: 'A.1.1.3.2', nama: 'Pedoman Sistem Informasi Madrasah' }
        ], penugasan: timA },
        { aspek_id: 'aspek_A', kode: 'A.1.2.1', pertanyaan: 'Mampu mengembangkan program baru untuk meningkatkan pencapaian target.', bukti_list: [
            { id: 'A.1.2.1.1', nama: 'Visi dan misi madrasah' },
            { id: 'A.1.2.1.2', nama: 'Data prestasi madrasah' },
            { id: 'A.1.2.1.3', nama: 'Data hasil UN 3 tahun terakhir' },
            { id: 'A.1.2.1.4', nama: 'Data alumni' },
            { id: 'A.1.2.1.5', nama: 'RKJM' }
        ], penugasan: timA },
        { aspek_id: 'aspek_B', kode: 'B.2.1.1', pertanyaan: 'Mampu mengembangkan RKJM, RKT/RKAM berdasarkan evaluasi 8 SNP.', bukti_list: [
            { id: 'B.2.1.1.1', nama: 'Dokumen Evaluasi diri madrasah' },
            { id: 'B.2.1.1.2', nama: 'Dokumen RKJM dan RKT berbasis SDM' }
        ], penugasan: timB },
        { aspek_id: 'aspek_C', kode: 'C.3.1.1', pertanyaan: 'Memahami dan menghayati arti perubahan (inovasi) madrasah.', bukti_list: [
            { id: 'C.3.1.1.1', nama: 'Program pengembangan kewirausahaan' },
            { id: 'C.3.1.1.2', nama: 'Profil madrasah beberapa tahun terakhir' }
        ], penugasan: timC },
        { aspek_id: 'aspek_D', kode: 'D.4.1.1', pertanyaan: 'Mengidentifikasi masalah guru dalam pembelajaran.', bukti_list: [
            { id: 'D.4.1.1.1', nama: 'Program pengawasan pembelajaran/supervisi pembelajaran' },
            { id: 'D.4.1.1.2', nama: 'Jadwal pelaksanaan supervisi' },
            { id: 'D.4.1.1.3', nama: 'SK tim supervisor' }
        ], penugasan: timD },
        { aspek_id: 'aspek_E', kode: 'E.5.1.1', pertanyaan: 'Prestasi akademik peserta didik.', bukti_list: [
            { id: 'E.5.1.1.1', nama: 'Piagam/sertifikat kejuaraan akademik (tingkat kecamatan s.d. nasional)' }
        ], penugasan: timE }
    ];
    
    indikatorList.forEach(function(ind) {
        var docId = 'butir_' + ind.aspek_id.replace('aspek_', '') + '_' + ind.kode.replace(/\./g, '_');
        promises.push(db.collection('pkkm_indikator').doc(docId).set(ind));
    });
    
    Promise.all(promises).then(function() {
        var totalSubBukti = 0;
        indikatorList.forEach(function(ind) { totalSubBukti += (ind.bukti_list ? ind.bukti_list.length : 0); });
        alert('Setup Data Berhasil!\n\nMA. As\'adiyah Ereng-Ereng\nTotal Indikator: ' + indikatorList.length + '\nTotal Sub-Bukti: ' + totalSubBukti + '\n\nPeriode PKKM: ' + currentTahun + '\n\nSilakan refresh halaman.');
        location.reload();
    }).catch(function(error) {
        alert('Gagal: ' + error.message);
    });
};