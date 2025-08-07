import React, { useState, useEffect } from "react";
import "./App.css"; 

const Guestbook = () => {
  // --- Ana State'ler ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  
  // --- Form State'leri ---
  const [loginData, setLoginData] = useState({ Mail: "", Password: "" });
  const [registerData, setRegisterData] = useState({ Name: "", SurName: "", Mail: "", Password: "" });
  const [formData, setFormData] = useState({ text: "", MahalleId: null });
  
  // --- Data State'leri ---
  const [notes, setNotes] = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [mahalleFilter, setMahalleFilter] = useState("");
  
  // --- Edit State'leri ---
  const [editNoteId, setEditNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [userEditData, setUserEditData] = useState({ Id: null, Name: "", SurName: "", Mail: "", Password: "" });
  
  // --- Loading ve Error State'leri ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = "https://localhost:7149";

  // --- Yardımcı Fonksiyonlar ---
  const getMahalleName = (mahalleId) => {
    const mahalle = mahalleler.find(m => m.id === mahalleId);
    return mahalle ? mahalle.name : "Bilinmeyen Mahalle";
  };

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token bulunamadı');
    let cleanToken = token.trim().replace(/"/g, '');
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${cleanToken}`
    };
  };

  // --- Otomatik Login ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsLoggedIn(true);
        setCurrentUser(userData);
      } catch (error) {
        handleLogout();
      }
    }
  }, []);

  // --- Mahalleler Yükle ---
  useEffect(() => {
    if (isLoggedIn) {
      loadMahalleler();
    }
  }, [isLoggedIn]);

  const loadMahalleler = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/Mahalle/AllMahalles`, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setMahalleler(data);
        if (data.length > 0 && !formData.MahalleId) {
          setFormData(prev => ({ ...prev, MahalleId: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Mahalleler yüklenirken hata:", err);
    }
  };

  // --- Notları Yükle ---
  const loadNotes = async () => {
    try {
      setError("");
      const headers = getAuthHeaders();
      
      // Önce tüm kullanıcıları al
      const usersResponse = await fetch(`${API_BASE}/api/user/users`, {
        method: 'GET',
        headers: headers
      });

      if (usersResponse.status === 401) {
        setError("Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        handleLogout();
        return;
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const formattedNotes = usersData.flatMap(user => {
          if (!user.notes || !Array.isArray(user.notes)) return [];
          return user.notes.map((note) => ({
            id: note.id,
            username: user.name,
            surName: user.surName,
            mail: user.mail,
            note: note.text,
            dateTime: note.dateTime,
            userId: note.userId,
            mahalleId: note.mahalleId
          }));
        });
        setNotes(formattedNotes);
      }
    } catch (err) {
      setError(`Notlar yüklenirken hata oluştu: ${err.message}`);
    }
  };

  // --- Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Backend [FromQuery] bekliyor, bu yüzden query parameters kullanıyoruz
      const params = new URLSearchParams({
        Mail: loginData.Mail.trim(),
        Password: loginData.Password
      }).toString();

      const response = await fetch(`${API_BASE}/api/auth/Login?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const token = await response.text();
        const cleanToken = token.replace(/"/g, '');
        const decodedToken = parseJwt(cleanToken);
        
        const userData = {
          id: parseInt(decodedToken["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]),
          name: decodedToken.name || "Kullanıcı",
          surName: decodedToken.surName || "",
          mail: decodedToken.email || loginData.Mail,
          role: decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "User"
        };

        localStorage.setItem('token', cleanToken);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setIsLoggedIn(true);
        setCurrentUser(userData);
        setLoginData({ Mail: "", Password: "" });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Giriş başarısız");
      }
    } catch (err) {
      setError("Giriş başarısız! E-posta veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  // --- Register ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Backend [FromQuery] bekliyor, bu yüzden query parameters kullanıyoruz
      const params = new URLSearchParams({
        Name: registerData.Name,
        SurName: registerData.SurName,
        Mail: registerData.Mail,
        Password: registerData.Password
      }).toString();

      const response = await fetch(`${API_BASE}/api/user/Register?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        setRegisterData({ Name: "", SurName: "", Mail: "", Password: "" });
        setShowRegister(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Kayıt başarısız");
      }
    } catch (err) {
      setError("Kayıt başarısız! Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  // --- Not Ekle ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim() || !formData.MahalleId) {
      setError("Not içeriği ve mahalle seçimi zorunludur!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/Note/CreateNote`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ text: formData.text.trim(), MahalleId: formData.MahalleId }),
      });

      if (response.ok) {
        alert("Not başarıyla eklendi!");
        setFormData(prev => ({ ...prev, text: "" }));
        if (showNotes) {
          await loadNotes();
        }
      } else {
        const errorText = await response.text();
        setError(errorText || "Not eklenirken hata oluştu!");
      }
    } catch (err) {
      setError("Not eklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Not Güncelle ---
  const handleEditNoteSubmit = async (e) => {
    e.preventDefault();
    if (!editNoteText.trim()) {
      setError("Not içeriği boş olamaz!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = getAuthHeaders();
      // Backend bir body bekliyor: UpdateNoteRequest
      const response = await fetch(`${API_BASE}/api/Note/UpdateNote`, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify({
          noteId: editNoteId,
          text: editNoteText.trim()
        })
      });

      if (response.ok) {
        alert("Not başarıyla güncellendi!");
        setEditNoteId(null);
        setEditNoteText("");
        await loadNotes();
      } else {
        const errorText = await response.text();
        setError(errorText || "Not güncellenemedi!");
      }
    } catch (err) {
      setError("Not güncellenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Not Sil ---
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/Note/DeleteNote?id=${noteId}`, {
        method: "DELETE",
        headers: headers
      });

      if (response.ok) {
        alert("Not başarıyla silindi!");
        await loadNotes();
      } else {
        const errorText = await response.text();
        setError(errorText || "Not silinemedi!");
      }
    } catch (err) {
      setError("Not silinirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Kullanıcı Güncelle ---
  const handleUserEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        Id: userEditData.Id,
        Name: userEditData.Name,
        SurName: userEditData.SurName,
        Mail: userEditData.Mail,
        Password: userEditData.Password
      }).toString();

      const response = await fetch(`${API_BASE}/api/user/update?${params}`, {
        method: "PUT",
        headers: headers
      });

      if (response.ok) {
        alert("Kullanıcı bilgileri güncellendi!");
        setShowUserEdit(false);
        const updatedUser = {
          ...currentUser,
          name: userEditData.Name,
          surName: userEditData.SurName,
          mail: userEditData.Mail
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      } else {
        const errorText = await response.text();
        setError(errorText || "Kullanıcı güncellenemedi!");
      }
    } catch (err) {
      setError("Kullanıcı güncellenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setNotes([]);
    setShowNotes(false);
    setFormData({ text: "", MahalleId: null });
    setMahalleler([]);
    setError("");
  };

  // --- Notları Filtrele ---
  const filteredNotes = notes.filter(note => {
    if (!mahalleFilter) return true;
    const mahalleName = getMahalleName(note.mahalleId).toLowerCase();
    return mahalleName.includes(mahalleFilter.toLowerCase());
  });

  // --- JSX ---
  if (!isLoggedIn) {
    return (
      <div className="facebook-login-container">
        <div className="facebook-login-content">
          {/* Sol Taraf - Logo ve Açıklama */}
          <div className="facebook-left-section">
            <div className="facebook-logo">
              <h1>Beşiktaş Guestbook</h1>
            </div>
            <div className="facebook-description">
              <p>Beşiktaş'ta yaşadıklarını, hatıralarını ve önerilerini bu dijital deftere yazarak herkesle paylaşabilirsin.</p>
            </div>
          </div>

          {/* Sağ Taraf - Login Formu */}
          <div className="facebook-right-section">
            <div className="facebook-login-form">
              {!showRegister ? (
                <>
                  <form onSubmit={handleLogin} className="facebook-form">
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="E-posta veya Telefon Numarası"
                        required
                        value={loginData.Mail}
                        onChange={(e) => setLoginData(prev => ({ ...prev, Mail: e.target.value }))}
                        disabled={loading}
                        className={error ? "error" : ""}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Şifre"
                        required
                        value={loginData.Password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, Password: e.target.value }))}
                        disabled={loading}
                        className={error ? "error" : ""}
                      />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" disabled={loading} className="facebook-login-btn">
                      {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                  </form>
                 
                  <div className="facebook-divider"></div>
                  <button 
                    onClick={() => { setShowRegister(true); setError(""); }}
                    className="facebook-create-account-btn"
                  >
                    Yeni hesap oluştur
                  </button>
                </>
              ) : (
                <>
                  <form onSubmit={handleRegister} className="facebook-form">
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Ad"
                        required
                        value={registerData.Name}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, Name: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Soyad"
                        required
                        value={registerData.SurName}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, SurName: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="E-posta"
                        required
                        value={registerData.Mail}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, Mail: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Şifre"
                        required
                        value={registerData.Password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, Password: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" disabled={loading} className="facebook-login-btn">
                      {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                    </button>
                  </form>
                  <div className="facebook-divider"></div>
                  <button 
                    onClick={() => { setShowRegister(false); setError(""); }}
                    className="facebook-create-account-btn"
                  >
                    Zaten hesabın var mı? Giriş Yap
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="page-header">
        <h1>Beşiktaş Guestbook</h1>
        <p>Beşiktaş'ta yaşadıklarını, hatıralarını ve önerilerini paylaş</p>
      </div>
      <div className="main-content">
        <div className="sidebar">
        <div className="user-info">
          <h3>Hoş Geldiniz!</h3>
          <p className="user-name">{currentUser?.name} {currentUser?.surName}</p>
          <p className="user-email">{currentUser?.mail}</p>
        </div>
        
        <button onClick={() => {
          setUserEditData({
            Id: currentUser.id,
            Name: currentUser.name,
            SurName: currentUser.surName,
            Mail: currentUser.mail,
            Password: ""
          });
          setShowUserEdit(true);
        }} className="btn-edit">
          Profilimi Düzenle
        </button>

        {showUserEdit && (
          <form onSubmit={handleUserEditSubmit} className="edit-form">
            <input
              type="text"
              value={userEditData.Name}
              onChange={(e) => setUserEditData(prev => ({ ...prev, Name: e.target.value }))}
              placeholder="Ad"
              disabled={loading}
            />
            <input
              type="text"
              value={userEditData.SurName}
              onChange={(e) => setUserEditData(prev => ({ ...prev, SurName: e.target.value }))}
              placeholder="Soyad"
              disabled={loading}
            />
            <input
              type="email"
              value={userEditData.Mail}
              onChange={(e) => setUserEditData(prev => ({ ...prev, Mail: e.target.value }))}
              placeholder="E-posta"
              disabled={loading}
            />
            <input
              type="password"
              value={userEditData.Password}
              onChange={(e) => setUserEditData(prev => ({ ...prev, Password: e.target.value }))}
              placeholder="Yeni Şifre (opsiyonel)"
              disabled={loading}
            />
            <div className="edit-buttons">
              <button type="submit" disabled={loading} className="btn-save">
                {loading ? "Güncelleniyor..." : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowUserEdit(false)} className="btn-cancel">
                İptal
              </button>
            </div>
          </form>
        )}
        
        <button onClick={handleLogout} className="btn-logout">
          Çıkış Yap
        </button>
      </div>
      
      <div className="content">
        <div className="note-form-card">
          <h2>Yeni Not Ekle</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mahalle</label>
              <select
                value={formData.MahalleId || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, MahalleId: parseInt(e.target.value) }))}
                required
              >
                <option value="">Mahalle seçin...</option>
                {mahalleler.map((mahalle) => (
                  <option key={mahalle.id} value={mahalle.id}>
                    {mahalle.name} - {mahalle.ilce}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Not</label>
              <textarea
                rows="4"
                required
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                disabled={loading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-buttons">
              <button type="submit" disabled={loading} className="facebook-login-btn">
                {loading ? "Ekleniyor..." : "Not Ekle"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNotes(!showNotes);
                  if (!showNotes) loadNotes();
                }}
                className="facebook-create-account-btn"
              >
                {showNotes ? "Notları Gizle" : "Notları Göster"}
              </button>
            </div>
          </form>
        </div>
        
        {showNotes && (
          <div className="notes-card">
            <div className="notes-header">
              <h3>Tüm Notlar ({filteredNotes.length})</h3>
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Mahalle ile filtrele..."
                  value={mahalleFilter}
                  onChange={(e) => setMahalleFilter(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
            
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const noteUserId = Number(note.userId);
                const currentUserId = Number(currentUser?.id);
                console.log('currentUser.id:', currentUserId, 'note.userId:', noteUserId, 'eşit mi:', noteUserId === currentUserId);
                return (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <div className="note-info">
                        <div className="note-author">
                          {note.username} {note.surName} ({note.mail})
                        </div>
                        <div className="note-location">
                          📍 {getMahalleName(note.mahalleId)}
                        </div>
                        {note.dateTime && (
                          <div className="note-date">
                            {new Date(note.dateTime).toLocaleDateString('tr-TR')} - {new Date(note.dateTime).toLocaleTimeString('tr-TR')}
                          </div>
                        )}
                      </div>
                      {noteUserId === currentUserId && (
                        <div className="note-actions">
                          <button
                            onClick={() => {
                              setEditNoteId(note.id);
                              setEditNoteText(note.note);
                            }}
                            className="btn-edit-small"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="btn-delete-small"
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="note-content">
                      {note.note}
                    </div>
                    {editNoteId === note.id && (
                      <form onSubmit={handleEditNoteSubmit} className="edit-note-form">
                        <textarea
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          rows="3"
                          disabled={loading}
                        />
                        <div className="edit-buttons">
                          <button type="submit" disabled={loading} className="btn-save">
                            {loading ? "Güncelleniyor..." : "Kaydet"}
                          </button>
                          <button type="button" onClick={() => setEditNoteId(null)} className="btn-cancel">
                            İptal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="no-notes">Henüz not bulunmuyor.</p>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Guestbook;