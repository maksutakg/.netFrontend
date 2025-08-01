import React, { useState, useEffect } from "react";
import './App.css';

const Guestbook = () => {
  // --- State'ler ---
  const [loginData, setLoginData] = useState({ Mail: "", Password: "" });
  const [registerData, setRegisterData] = useState({ Name: "", SurName: "", Mail: "", Password: "" });
  const [formData, setFormData] = useState({ text: "", UserId: null });
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [noteError, setNoteError] = useState("");
  // --- Not ve Kullanıcı Güncelleme için ek state'ler ---
  const [editNoteId, setEditNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [editNoteError, setEditNoteError] = useState("");
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [userEditData, setUserEditData] = useState({ Id: null, Name: "", SurName: "", Mail: "", Password: "" });
  const [userEditError, setUserEditError] = useState("");
  // --- Not Silme için ek state'ler ---
  const [deleteNoteError, setDeleteNoteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  // --- Not Silme Fonksiyonu ---
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    setDeleteLoading(true);
    setDeleteNoteError("");
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/Note/DeleteNote?id=${noteId}`, {
        method: "DELETE",
        headers: headers
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Not silinemedi!");
      }
      alert("Not başarıyla silindi!");
      await loadNotes();
    } catch (err) {
      setDeleteNoteError(err.message || "Not silinirken hata oluştu!");
    } finally {
      setDeleteLoading(false);
    }
  };

  // API Base URL
  const API_BASE = "https://localhost:7149";

  // --- Otomatik login ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (isTokenValid(token)) {
          setIsLoggedIn(true);
          setCurrentUser(userData);
          setFormData(prev => ({ ...prev, UserId: userData.id }));
        } else {
          handleLogout();
        }
      } catch (error) {
        handleLogout();
      }
    }
  }, []);

  // --- JWT parse ve validasyon ---
  const parseJwt = (token) => {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const decoded = parseJwt(token);
      if (!decoded || !decoded.exp) return false;
      const currentTime = Date.now() / 1000;
      const bufferTime = 300;
      return decoded.exp > currentTime + bufferTime;
    } catch (error) {
      return false;
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token bulunamadı');
    let cleanToken = token.trim();
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${cleanToken}`
    };
  };

  // --- Notları yükle ---
  const loadNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !isTokenValid(token)) {
        setNoteError("Oturum süresi dolmuş, lütfen tekrar giriş yapın!");
        handleLogout();
        return;
      }
      setNoteError("");
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/user/users`, {
        method: 'GET',
        headers: headers
      });
      if (response.status === 401) {
        setNoteError("Yetkisiz erişim! Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        handleLogout();
        return;
      }
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.title || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {}
        throw new Error(errorMessage);
      }
      const data = await response.json();
      // Notlarda backend'den Id gelmeli!
      const formattedNotes = data.flatMap(user => {
        if (!user.notes || !Array.isArray(user.notes)) return [];
        return user.notes.map((note) => ({
          id: note.id, // Backend'den gelen gerçek Id
          username: user.name,
          surName: user.surName,
          mail: user.mail,
          note: note.text,
          dateTime: note.dateTime,
          userId: note.userId
        }));
      });
      setNotes(formattedNotes);
    } catch (err) {
      setNoteError(`Notlar yüklenirken hata oluştu: ${err.message}`);
    }
  };

  const clearAllErrors = () => {
    setLoginError("");
    setRegisterError("");
    setNoteError("");
    setEditNoteError("");
    setUserEditError("");
  };

  // --- Formlar için değişiklik handler'ları ---
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginError) setLoginError("");
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
    if (registerError) setRegisterError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (noteError) setNoteError("");
  };

  // --- Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ Mail: loginData.Mail.trim(), Password: loginData.Password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || "Giriş başarısız");
      }
      const contentType = response.headers.get('content-type');
      let token;
      if (contentType && contentType.includes('application/json')) {
        const tokenData = await response.json();
        token = tokenData.token || tokenData.accessToken || tokenData;
      } else {
        const tokenResponse = await response.text();
        token = tokenResponse.trim().replace(/"/g, '');
      }
      if (!token) throw new Error("Token alınamadı");
      const decodedToken = parseJwt(token);
      if (!decodedToken) throw new Error("Token çözümlenemedi");
      const userData = {
        id: parseInt(decodedToken.sub) || 1,
        name: decodedToken.name || "Kullanıcı",
        surName: decodedToken.surName || "",
        mail: decodedToken.email || loginData.Mail,
        role: decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decodedToken.role || "User"
      };
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setIsLoggedIn(true);
      setCurrentUser(userData);
      setFormData(prev => ({ ...prev, UserId: userData.id }));
      setLoginData({ Mail: "", Password: "" });
      clearAllErrors();
    } catch (err) {
      setLoginError(err.message || "Giriş başarısız! E-posta veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  // --- Register ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRegisterError("");
    try {
      const response = await fetch(`${API_BASE}/api/user/Register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          Name: registerData.Name.trim(),
          SurName: registerData.SurName.trim(),
          Mail: registerData.Mail.trim(),
          Password: registerData.Password
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || "Kayıt başarısız");
      }
      await response.json();
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
      setRegisterData({ Name: "", SurName: "", Mail: "", Password: "" });
      setShowRegister(false);
      clearAllErrors();
    } catch (err) {
      setRegisterError(err.message || "Kayıt başarısız! Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  // --- Not ekle ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNoteError("");
    if (!formData.text.trim()) {
      setNoteError("Not içeriği boş olamaz!");
      setLoading(false);
      return;
    }
    if (!formData.UserId) {
      setNoteError("Kullanıcı bilgisi bulunamadı!");
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setNoteError("Token bulunamadı, lütfen tekrar giriş yapın!");
        setLoading(false);
        handleLogout();
        return;
      }
      const requestData = { text: formData.text.trim(), UserId: formData.UserId };
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/Note/CreateNote`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData),
      });
      const responseText = await response.text();
      if (response.status === 401) {
        setNoteError("Yetkisiz erişim! Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
        handleLogout();
        return;
      }
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json') && responseText) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.detail || errorData.title || errorData.message || errorMessage;
          } else {
            errorMessage = responseText || errorMessage;
          }
        } catch (parseError) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      alert("Not başarıyla eklendi!");
      setFormData(prev => ({ ...prev, text: "" }));
      if (showNotes) {
        await loadNotes();
      }
    } catch (err) {
      setNoteError(err.message || "Not eklenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Notları göster/gizle ---
  const handleShowNotes = async () => {
    const newShowNotes = !showNotes;
    setShowNotes(newShowNotes);
    if (newShowNotes) {
      await loadNotes();
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
    setFormData({ text: "", UserId: null });
    clearAllErrors();
  };

  // --- Not Güncelleme Fonksiyonları ---
  const handleEditNoteClick = (note) => {
    setEditNoteId(note.id);
    setEditNoteText(note.note);
    setEditNoteError("");
  };

  const handleEditNoteChange = (e) => {
    setEditNoteText(e.target.value);
    setEditNoteError("");
  };

  const handleEditNoteSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEditNoteError("");
    if (!editNoteText.trim()) {
      setEditNoteError("Not içeriği boş olamaz!");
      setLoading(false);
      return;
    }
    const noteObj = notes.find(n => n.id === editNoteId);
    if (!noteObj) {
      setEditNoteError("Not bulunamadı!");
      setLoading(false);
      return;
    }
    try {
      const headers = getAuthHeaders();
      const updateData = {
        UserId: currentUser.id,
        Id: noteObj.id, // Backend'den gelen gerçek Id
        text: editNoteText.trim()
      };
      const response = await fetch(`${API_BASE}/api/Note/UpdateNote`, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Not güncellenemedi!");
      }
      alert("Not başarıyla güncellendi!");
      setEditNoteId(null);
      setEditNoteText("");
      await loadNotes();
    } catch (err) {
      setEditNoteError(err.message || "Not güncellenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- Kullanıcı Güncelleme Fonksiyonları ---
  const handleShowUserEdit = () => {
    setUserEditData({
      Id: currentUser.id,
      Name: currentUser.name,
      SurName: currentUser.surName,
      Mail: currentUser.mail,
      Password: ""
    });
    setShowUserEdit(true);
    setUserEditError("");
  };

  const handleUserEditChange = (e) => {
    const { name, value } = e.target;
    setUserEditData(prev => ({ ...prev, [name]: value }));
    setUserEditError("");
  };

  const handleUserEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUserEditError("");
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
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Kullanıcı güncellenemedi!");
      }
      alert("Kullanıcı bilgileri güncellendi!");
      setShowUserEdit(false);
      localStorage.setItem('currentUser', JSON.stringify({
        ...currentUser,
        name: userEditData.Name,
        surName: userEditData.SurName,
        mail: userEditData.Mail
      }));
      setCurrentUser(prev => ({
        ...prev,
        name: userEditData.Name,
        surName: userEditData.SurName,
        mail: userEditData.Mail
      }));
    } catch (err) {
      setUserEditError(err.message || "Kullanıcı güncellenirken hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  // --- JSX ---
  return (
    <>
      <style>
        {`
          
        `}
      </style>
      <div className="app-container">
        {!isLoggedIn ? (
          <div className="auth-container">
            <h1>Guestbook</h1>
            {!showRegister ? (
              <>
                <h2>Giriş Yap</h2>
                <form onSubmit={handleLogin}>
                  <div>
                    <label htmlFor="loginMail">E-posta</label>
                    <input
                      type="email"
                      name="Mail"
                      id="loginMail"
                      required
                      value={loginData.Mail}
                      onChange={handleLoginChange}
                      placeholder="E-posta adresinizi girin"
                      disabled={loading}
                      className={loginError ? "error-input" : ""}
                    />
                  </div>
                  <div>
                    <label htmlFor="loginPassword">Şifre</label>
                    <input
                      type="password"
                      name="Password"
                      id="loginPassword"
                      required
                      value={loginData.Password}
                      onChange={handleLoginChange}
                      placeholder="Şifrenizi girin"
                      disabled={loading}
                      className={loginError ? "error-input" : ""}
                    />
                  </div>
                  {loginError && (
                    <div className="error-message">{loginError}</div>
                  )}
                  <button 
                    type="submit" 
                    className={`btn ${loading ? 'loading-overlay' : ''}`} 
                    disabled={loading}
                  >
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </button>
                </form>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRegister(true);
                    clearAllErrors();
                  }}
                  disabled={loading}
                >
                  Hesabın yok mu? Kayıt Ol
                </button>
              </>
            ) : (
              <>
                <h2>Kayıt Ol</h2>
                <form onSubmit={handleRegister}>
                  <div>
                    <label htmlFor="registerName">Ad</label>
                    <input
                      type="text"
                      name="Name"
                      id="registerName"
                      required
                      value={registerData.Name}
                      onChange={handleRegisterChange}
                      placeholder="Adınızı girin"
                      disabled={loading}
                      className={registerError ? "error-input" : ""}
                    />
                  </div>
                  <div>
                    <label htmlFor="registerSurName">Soyad</label>
                    <input
                      type="text"
                      name="SurName"
                      id="registerSurName"
                      required
                      value={registerData.SurName}
                      onChange={handleRegisterChange}
                      placeholder="Soyadınızı girin"
                      disabled={loading}
                      className={registerError ? "error-input" : ""}
                    />
                  </div>
                  <div>
                    <label htmlFor="registerMail">E-posta</label>
                    <input
                      type="email"
                      name="Mail"
                      id="registerMail"
                      required
                      value={registerData.Mail}
                      onChange={handleRegisterChange}
                      placeholder="E-posta adresinizi girin"
                      disabled={loading}
                      className={registerError ? "error-input" : ""}
                    />
                  </div>
                  <div>
                    <label htmlFor="registerPassword">Şifre</label>
                    <input
                      type="password"
                      name="Password"
                      id="registerPassword"
                      required
                      value={registerData.Password}
                      onChange={handleRegisterChange}
                      placeholder="Şifrenizi girin"
                      disabled={loading}
                      className={registerError ? "error-input" : ""}
                    />
                  </div>
                  {registerError && (
                    <div className="error-message">{registerError}</div>
                  )}
                  <button 
                    type="submit" 
                    className={`btn ${loading ? 'loading-overlay' : ''}`} 
                    disabled={loading}
                  >
                    {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                  </button>
                </form>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRegister(false);
                    clearAllErrors();
                  }}
                  disabled={loading}
                >
                  Zaten hesabın var mı? Giriş Yap
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="main-container">
            <div className="sidebar">
              <div className="user-info">
                <h3>Hoş Geldiniz!</h3>
                <p><strong>{currentUser?.name} {currentUser?.surName}</strong></p>
                <p>{currentUser?.mail}</p>
                <small>User ID: {currentUser?.id}</small>
                <small> Role: {currentUser?.role}</small>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleShowUserEdit}
                disabled={loading}
                style={{ marginBottom: "10px" }}
              >
                Profilimi Düzenle
              </button>
              {showUserEdit && (
                <form onSubmit={handleUserEditSubmit} style={{ marginBottom: "10px" }}>
                  <input
                    type="text"
                    name="Name"
                    value={userEditData.Name}
                    onChange={handleUserEditChange}
                    placeholder="Ad"
                    disabled={loading}
                    style={{ marginBottom: "8px" }}
                  />
                  <input
                    type="text"
                    name="SurName"
                    value={userEditData.SurName}
                    onChange={handleUserEditChange}
                    placeholder="Soyad"
                    disabled={loading}
                    style={{ marginBottom: "8px" }}
                  />
                  <input
                    type="email"
                    name="Mail"
                    value={userEditData.Mail}
                    onChange={handleUserEditChange}
                    placeholder="E-posta"
                    disabled={loading}
                    style={{ marginBottom: "8px" }}
                  />
                  <input
                    type="password"
                    name="Password"
                    value={userEditData.Password}
                    onChange={handleUserEditChange}
                    placeholder="Yeni Şifre (değiştirmek için)"
                    disabled={loading}
                    style={{ marginBottom: "8px" }}
                  />
                  {userEditError && <div className="error-message">{userEditError}</div>}
                  <button type="submit" className="btn" disabled={loading}>
                    {loading ? "Güncelleniyor..." : "Kaydet"}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => setShowUserEdit(false)} disabled={loading}>
                    İptal
                  </button>
                </form>
              )}
              <button 
                className="btn btn-danger"
                onClick={handleLogout}
              >
                Çıkış Yap
              </button>
            </div>
            <div className="content-area">
              <div className="notes-form">
                <h2>Yeni Not Ekle</h2>
                <form onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="note">Not</label>
                    <textarea
                      name="text"
                      id="note"
                      rows="4"
                      required
                      placeholder="Notunuzu buraya yazın..."
                      value={formData.text}
                      onChange={handleChange}
                      disabled={loading}
                      className={noteError ? "error-input" : ""}
                    />
                    {noteError && (
                      <div className="error-message">{noteError}</div>
                    )}
                  </div>
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className={`btn ${loading ? 'loading-overlay' : ''}`} 
                      disabled={loading}
                    >
                      {loading ? "Ekleniyor..." : "Not Ekle"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleShowNotes}
                      disabled={loading}
                    >
                      {showNotes ? "Notları Gizle" : "Notları Göster"}
                    </button>
                  </div>
                </form>
              </div>
              {showNotes && (
                <div className="notes-display">
                  <h3>Tüm Notlar ({notes.length})</h3>
                  {loading && <p>Notlar yükleniyor...</p>}
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <div className="note-author">
                            {note.username} {note.surName} ({note.mail})
                          </div>
                          {note.dateTime && (
                            <div className="note-date">
                              {new Date(note.dateTime).toLocaleDateString('tr-TR')} - {new Date(note.dateTime).toLocaleTimeString('tr-TR')}
                            </div>
                          )}
                          {note.userId === currentUser?.id && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ marginLeft: "10px", fontSize: "12px", padding: "6px 12px" }}
                                onClick={() => handleEditNoteClick(note)}
                                disabled={loading}
                              >
                                Düzenle
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ marginLeft: "10px", fontSize: "12px", padding: "6px 12px" }}
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deleteLoading}
                              >
                                Sil
                              </button>
                            </>
                          )}
                        </div>
                        <div className="note-content">{note.note}</div>
                        {editNoteId === note.id && (
                          <form onSubmit={handleEditNoteSubmit} style={{ marginTop: "10px" }}>
                            <textarea
                              value={editNoteText}
                              onChange={handleEditNoteChange}
                              rows="3"
                              style={{ width: "100%", marginBottom: "10px" }}
                              disabled={loading}
                            />
                            {editNoteError && <div className="error-message">{editNoteError}</div>}
                            <button type="submit" className="btn" disabled={loading}>
                              {loading ? "Güncelleniyor..." : "Kaydet"}
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => setEditNoteId(null)} disabled={loading}>
                              İptal
                            </button>
                          </form>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>Henüz not bulunmuyor.</p>
                  )}
                  {noteError && (
                    <div className="error-message">{noteError}</div>
                  )}
                  {deleteNoteError && (
                    <div className="error-message">{deleteNoteError}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Guestbook;