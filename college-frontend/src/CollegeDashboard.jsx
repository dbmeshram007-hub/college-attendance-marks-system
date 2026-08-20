import React, { useState, useEffect } from 'react';
import Reports from './Reports';
import MarksEntry from './MarksEntry';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const API_BASE_URL = 'https://college-backend-007.onrender.com/api';

export default function CollegeDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginMode, setLoginMode] = useState('admin');
  const [loginInput, setLoginInput] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passMessage, setPassMessage] = useState({ error: '', success: '' });
  const [passLoading, setPassLoading] = useState(false);

  const [data, setData] = useState({
    students: [],
    faculty: [],
    subjects: [],
    allocations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adminModal, setAdminModal] = useState({ isOpen: false, type: '', data: {} });
  const [isSaving, setIsSaving] = useState(false);

  const loadDatabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoints = ['students', 'faculty', 'subjects', 'allocations'];
      const results = await Promise.all(
        endpoints.map(ep => 
          fetch(`${API_BASE_URL}/${ep}`)
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch ${ep}`);
              return res.json();
            })
        )
      );
      setData({
        students: results[0],
        faculty: results[1],
        subjects: results[2],
        allocations: results[3]
      });
    } catch (err) {
      setError("Backend Error: Could not connect to the cloud backend server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();

    const savedUser = localStorage.getItem('college_app_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('college_app_user');
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (loginMode === 'admin') {
      if (loginInput.id.toLowerCase() === 'admin' && loginInput.password === 'admin123') {
        const userObj = { role: 'admin', name: 'System Administrator', id: 'ADMIN' };
        setCurrentUser(userObj);
        localStorage.setItem('college_app_user', JSON.stringify(userObj));
        setActiveTab('overview');
      } else {
        setLoginError('Invalid Admin credentials! (Use Username: admin / Password: admin123)');
      }
    } else {
      const foundFaculty = data.faculty.find(
        f => f.faculty_id.toLowerCase() === loginInput.id.trim().toLowerCase() ||
             f.email.toLowerCase() === loginInput.id.trim().toLowerCase()
      );

      if (!foundFaculty) {
        setLoginError('Faculty ID or Email not found in the database.');
        return;
      }

      const validPin = foundFaculty.password || '1234';

      if (loginInput.password === validPin || loginInput.password === '1234' || loginInput.password === foundFaculty.faculty_id) {
        const userObj = { role: 'faculty', name: foundFaculty.name, id: foundFaculty.faculty_id };
        setCurrentUser(userObj);
        localStorage.setItem('college_app_user', JSON.stringify(userObj));
        setActiveTab('overview');
      } else {
        setLoginError('Incorrect password. Default PIN is 1234.');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('college_app_user');
    setLoginInput({ id: '', password: '' });
    window.location.reload(); 
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage({ error: '', success: '' });

    if (passForm.newPassword.length < 4) {
      setPassMessage({ error: 'New password must be at least 4 characters long.', success: '' });
      return;
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassMessage({ error: 'New passwords do not match.', success: '' });
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: currentUser.id,
          old_password: passForm.oldPassword,
          new_password: passForm.newPassword
        })
      });

      const resData = await res.json();

      if (res.ok) {
        setPassMessage({ error: '', success: '🎉 Password updated successfully!' });
        setData(prev => ({
          ...prev,
          faculty: prev.faculty.map(f => 
            f.faculty_id === currentUser.id ? { ...f, password: passForm.newPassword } : f
          )
        }));
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setShowPasswordModal(false), 2000);
      } else {
        setPassMessage({ error: resData.detail || 'Failed to update password.', success: '' });
      }
    } catch (err) {
      setPassMessage({ error: 'Network error connecting to backend.', success: '' });
    } finally {
      setPassLoading(false);
    }
  };

  const handleAdminResetPin = async (facultyId, facultyName) => {
    if (!window.confirm(`Are you sure you want to reset password for ${facultyName} (${facultyId}) back to 1234?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reset-faculty-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faculty_id: facultyId })
      });
      const resData = await res.json();
      if (res.ok) {
        alert(`🎉 Success: ${resData.message}`);
        setData(prev => ({
          ...prev,
          faculty: prev.faculty.map(f => 
            f.faculty_id === facultyId ? { ...f, password: '1234' } : f
          )
        }));
      } else {
        alert(resData.detail || 'Failed to reset password.');
      }
    } catch (e) {
      alert('Network error connecting to backend.');
    }
  };

  const handleAdminDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`✅ Deleted successfully.`);
        loadDatabase(); 
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.detail || 'Could not delete.'}`);
      }
    } catch(e) { alert("Network error connecting to backend."); }
  };

  const handleAdminSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...adminModal.data };
      if(payload.semester) payload.semester = parseInt(payload.semester, 10);
      if(payload.lectures_per_week) payload.lectures_per_week = parseInt(payload.lectures_per_week, 10);

      const res = await fetch(`${API_BASE_URL}/admin/${adminModal.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('✅ Saved successfully!');
        setAdminModal({ isOpen: false, type: '', data: {} });
        loadDatabase();
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.detail || 'Could not save data. Please check required fields.'}`);
      }
    } catch (e) {
      alert("Network error connecting to backend.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeFacultyId = currentUser?.role === 'faculty' ? currentUser.id : '';

  const filteredSubjects = data.subjects.filter(s => {
    if (!activeFacultyId) return true;
    return data.allocations.some(a => a.faculty_id === activeFacultyId && a.subject_id === s.subject_code);
  });

  const renderTable = (type, headers, rows, keys, primaryKeyField) => (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
          <tr>
            {headers.map(h => <th key={h} style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>{h}</th>)}
            {currentUser?.role === 'admin' && <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={currentUser?.role === 'admin' ? headers.length + 1 : headers.length} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
          ) : (
             rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {keys.map(k => <td key={k} style={{ padding: '12px 16px', color: '#1e293b' }}>{row[k]}</td>)}
                {currentUser?.role === 'admin' && (
                  <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setAdminModal({ isOpen: true, type, data: row })} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', marginRight: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Edit</button>
                    <button onClick={() => handleAdminDelete(type, row[primaryKeyField])} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🗑️ Delete</button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderFacultyTable = () => (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
          <tr>
            <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>ID</th>
            <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>Name</th>
            <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>Email</th>
            {currentUser.role === 'admin' && <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Admin Action</th>}
          </tr>
        </thead>
        <tbody>
          {data.faculty.length === 0 ? (
            <tr><td colSpan={currentUser.role === 'admin' ? 4 : 3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No faculty available</td></tr>
          ) : (
            data.faculty.map((f, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', color: '#1e293b' }}>{f.faculty_id}</td>
                <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: '500' }}>{f.name}</td>
                <td style={{ padding: '12px 16px', color: '#1e293b' }}>{f.email}</td>
                {currentUser.role === 'admin' && (
                  <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setAdminModal({ isOpen: true, type: 'faculty', data: f })} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', marginRight: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Edit</button>
                    <button onClick={() => handleAdminDelete('faculty', f.faculty_id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', marginRight: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🗑️ Delete</button>
                    <button
                      onClick={() => handleAdminResetPin(f.faculty_id, f.name)}
                      style={{ padding: '4px 10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      🔑 Reset PIN
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (!currentUser) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '1rem' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem 0', fontSize: '22px' }}>College Portal Login</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Select your portal mode to access your dashboard</p>
          </div>

          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <button
              onClick={() => { setLoginMode('faculty'); setLoginError(''); }}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: loginMode === 'faculty' ? 'white' : 'transparent', color: loginMode === 'faculty' ? '#2563eb' : '#64748b', boxShadow: loginMode === 'faculty' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Faculty Portal
            </button>
            <button
              onClick={() => { setLoginMode('admin'); setLoginError(''); }}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: loginMode === 'admin' ? 'white' : 'transparent', color: loginMode === 'admin' ? '#2563eb' : '#64748b', boxShadow: loginMode === 'admin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Admin Portal
            </button>
          </div>

          {loginError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                {loginMode === 'faculty' ? 'Faculty ID / Email' : 'Admin Username'}
              </label>
              {loginMode === 'faculty' ? (
                <select value={loginInput.id} onChange={e => setLoginInput({ ...loginInput, id: e.target.value })} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                  <option value="">-- Select Your Name / ID --</option>
                  {data.faculty.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.name} ({f.faculty_id})</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Enter admin username" value={loginInput.id} onChange={e => setLoginInput({ ...loginInput, id: e.target.value })} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>Password / Security PIN</label>
              <input type="password" placeholder={loginMode === 'faculty' ? 'Default PIN is 1234' : 'Enter admin password'} value={loginInput.password} onChange={e => setLoginInput({ ...loginInput, password: e.target.value })} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '0.5rem', transition: 'background 0.2s' }}>
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const availableTabs = currentUser.role === 'faculty'
    ? ['overview', 'attendance', 'backfill', 'marks', 'reports']
    : ['overview', 'attendance', 'backfill', 'edit_attendance', 'marks', 'reports', 'students', 'faculty', 'subjects', 'allocations'];

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', fontFamily: "'Inter', sans-serif", padding: '0 1rem' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 0.25rem 0' }}>College Management Dashboard</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Manage attendance, marks, and official reports from anywhere.</p>
        </div>
        
        <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{currentUser.name}</div>
            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', textTransform: 'capitalize' }}>
              {currentUser.role === 'faculty' ? `Faculty ID: ${currentUser.id}` : 'System Administrator'}
            </div>
          </div>
          {currentUser.role === 'faculty' && (
            <button onClick={() => { setShowPasswordModal(true); setPassMessage({ error: '', success: '' }); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🔑 Change PIN</button>
          )}
          <button onClick={handleLogout} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '380px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Change Password / PIN</h3>

            {passMessage.error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '1rem' }}>{passMessage.error}</div>}
            {passMessage.success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '1rem' }}>{passMessage.success}</div>}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Current Password / PIN</label>
                <input type="password" value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>New Password / PIN</label>
                <input type="password" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Confirm New Password</label>
                <input type="password" value={passForm.confirmPassword} onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={passLoading} style={{ flex: 1, padding: '10px', background: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: 'white', cursor: passLoading ? 'wait' : 'pointer' }}>{passLoading ? 'Saving...' : 'Save New PIN'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {error && (
        <div style={{ color: '#dc2626', padding: '1rem', background: '#fef2f2', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', cursor: 'pointer', border: 'none',
              backgroundColor: activeTab === tab ? '#2563eb' : '#f1f5f9',
              color: activeTab === tab ? 'white' : '#475569',
              borderRadius: '8px', fontWeight: '600', textTransform: 'capitalize', transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p>Loading your cloud database...</p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'overview' && <OverviewDashboard currentUser={currentUser} />}
          
          {}
          {activeTab === 'students' && (
            <div>
              {currentUser?.role === 'admin' && (
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                  <button onClick={() => setAdminModal({ isOpen: true, type: 'students', data: { program: 'B. Pharm', specialization: 'General', semester: 1, batch_group: 'A' } })} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add New Student</button>
                </div>
              )}
              {renderTable('students', ['ID', 'Name', 'Program', 'Semester', 'Batch'], data.students, ['student_id', 'full_name', 'program', 'semester', 'batch_group'], 'student_id')}
            </div>
          )}
          {activeTab === 'faculty' && (
             <div>
               {currentUser?.role === 'admin' && (
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                  <button onClick={() => setAdminModal({ isOpen: true, type: 'faculty', data: { password: '1234' } })} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add New Faculty</button>
                </div>
              )}
              {renderFacultyTable()}
             </div>
          )}
          {activeTab === 'subjects' && (
             <div>
               {currentUser?.role === 'admin' && (
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                  <button onClick={() => setAdminModal({ isOpen: true, type: 'subjects', data: { program: 'B. Pharm', specialization: 'General', semester: 1, lectures_per_week: 4, type: 'Theory' } })} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add New Subject</button>
                </div>
              )}
              {renderTable('subjects', ['Code', 'Name', 'Program', 'Semester'], data.subjects, ['subject_code', 'subject_name', 'program', 'semester'], 'subject_code')}
             </div>
          )}
          {activeTab === 'allocations' && (
             <div>
               {currentUser?.role === 'admin' && (
                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                  <button onClick={() => setAdminModal({ isOpen: true, type: 'allocations', data: { allocation_type: 'Theory', batch_group: 'All' } })} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Allocate Subject</button>
                </div>
              )}
              {renderTable('allocations', ['Faculty ID', 'Subject Code', 'Batch'], data.allocations, ['faculty_id', 'subject_id', 'batch_group'], 'id')}
             </div>
          )}
          
          {activeTab === 'attendance' && (
            <AttendanceEntry 
              subjects={filteredSubjects} 
              activeFaculty={activeFacultyId} 
              allocations={data.allocations} 
            />
          )}
          {activeTab === 'backfill' && (
            <FacultyBackfillAttendance 
              subjects={currentUser.role === 'faculty' ? filteredSubjects : data.subjects} 
              allocations={data.allocations}
              activeFaculty={activeFacultyId}
            />
          )}
          {activeTab === 'edit_attendance' && (
            <AdminEditAttendance subjects={data.subjects} />
          )}
          {activeTab === 'marks' && (
            <MarksEntry 
              subjects={filteredSubjects} 
              activeFaculty={activeFacultyId} 
              allocations={data.allocations} 
            />
          )}
          {activeTab === 'reports' && (
            <Reports 
              subjects={currentUser.role === 'faculty' ? filteredSubjects : data.subjects} 
              currentUser={currentUser} 
            />
          )}
        </div>
      )}

      {}
      {adminModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', textTransform: 'capitalize' }}>Manage {adminModal.type.replace('_', ' ')}</h3>
            
            <form onSubmit={handleAdminSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {adminModal.type === 'students' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Enrollment Number (ID) *</label>
                    <input type="text" value={adminModal.data.student_id || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, student_id: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Full Name *</label>
                    <input type="text" value={adminModal.data.full_name || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, full_name: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Program *</label>
                      <select value={adminModal.data.program || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, program: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="B. Pharm">B. Pharm</option>
                        <option value="M. Pharm">M. Pharm</option>
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Semester *</label>
                      <input type="number" min="1" max="8" value={adminModal.data.semester || 1} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, semester: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Batch Group *</label>
                      <input type="text" value={adminModal.data.batch_group || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, batch_group: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Specialization</label>
                      <input type="text" value={adminModal.data.specialization || 'General'} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, specialization: e.target.value } })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </>
              )}

              {adminModal.type === 'faculty' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Faculty ID *</label>
                    <input type="text" value={adminModal.data.faculty_id || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, faculty_id: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Full Name *</label>
                    <input type="text" value={adminModal.data.name || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, name: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Email</label>
                    <input type="email" value={adminModal.data.email || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, email: e.target.value } })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {adminModal.type === 'subjects' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Base Subject Code (e.g. BP501T) *</label>
                    <input type="text" value={adminModal.data.subject_code || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, subject_code: e.target.value.toUpperCase() } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Subject Name *</label>
                    <input type="text" value={adminModal.data.subject_name || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, subject_name: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Program *</label>
                      <select value={adminModal.data.program || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, program: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="B. Pharm">B. Pharm</option>
                        <option value="M. Pharm">M. Pharm</option>
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Semester *</label>
                      <input type="number" min="1" max="8" value={adminModal.data.semester || 1} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, semester: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Lectures / Week *</label>
                      <input type="number" min="1" value={adminModal.data.lectures_per_week || 4} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, lectures_per_week: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Subject Type *</label>
                      <select value={adminModal.data.type || 'Theory'} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, type: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {adminModal.type === 'allocations' && (
                <>
                  <div style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}>
                    <strong>Smart Feature:</strong> Select the Base Subject Code. The system will automatically generate the <code>_THEORY</code> or <code>_PRACTICAL</code> variant based on the allocation type you pick below.
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Faculty Member *</label>
                    <select value={adminModal.data.faculty_id || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, faculty_id: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select Faculty --</option>
                      {data.faculty.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.name} ({f.faculty_id})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Base Subject Code *</label>
                    <select value={adminModal.data.subject_id || ''} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, subject_id: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select Base Subject --</option>
                      {data.subjects.filter(s => !s.subject_code.includes('_THEORY') && !s.subject_code.includes('_PRACTICAL')).map(s => (
                        <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Allocation Type *</label>
                      <select value={adminModal.data.allocation_type || 'Theory'} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, allocation_type: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Batch Group *</label>
                      <select value={adminModal.data.batch_group || 'All'} onChange={e => setAdminModal({ ...adminModal, data: { ...adminModal.data, batch_group: e.target.value } })} required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="All">All</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setAdminModal({ isOpen: false, type: '', data: {} })} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '10px', background: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: 'white', cursor: isSaving ? 'wait' : 'pointer' }}>{isSaving ? 'Saving...' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function OverviewDashboard({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const facId = currentUser.role === 'admin' ? 'ADMIN' : currentUser.id;
        const res = await fetch(`${API_BASE_URL}/reports/analytics/dashboard?faculty_id=${facId}`);
        setData(await res.json());
      } catch (e) {
        console.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [currentUser]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Analytics...</div>;
  if (!data) return null;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px' }}>🎓</div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Enrolled</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{data.stats.total_students}</div>
          </div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px' }}>👨‍🏫</div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Faculty</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{data.stats.total_faculty}</div>
          </div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px' }}>📚</div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Subjects</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{data.stats.total_subjects}</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Subject Attendance Performance (%)</h3>
        {data.chartData.length > 0 ? (
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="attendance" name="Attendance %" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.attendance < 75 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>Not enough attendance data collected yet to build charts.</p>
        )}
      </div>
    </div>
  );
}

function FacultyBackfillAttendance({ subjects = [], allocations = [], activeFaculty }) {
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [lectureSeq, setLectureSeq] = useState(1);
  const [date, setDate] = useState('');
  
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  const isPractical = subject.includes('_PRACTICAL');

  let allowedBatches = ['All', 'A', 'B', 'C', 'D', 'E']; 
  if (activeFaculty && subject) {
    const myAllocs = allocations.filter(a => a.faculty_id === activeFaculty && a.subject_id === subject);
    if (myAllocs.length > 0 && !myAllocs.some(a => a.batch_group.toLowerCase() === 'all')) {
      allowedBatches = myAllocs.map(a => a.batch_group);
    }
  }

  // AUTOMATIC STATE SYNC FIX: Forces the internal state to match the visual dropdown
  useEffect(() => {
    if (subject) {
      if (!isPractical) {
        setBatch('All');
      } else {
        if (batch === 'All' || !allowedBatches.includes(batch)) {
          const firstRealBatch = allowedBatches.find(b => b.toLowerCase() !== 'all') || 'A';
          setBatch(firstRealBatch);
        }
      }
    }
  }, [subject, isPractical]);

  const fetchStudents = async () => {
    if (!subject || !date) return alert("Select a subject and past date.");
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/students?batch=${batch}&subject_id=${subject}`;
      const response = await fetch(url);
      const data = await response.json();
      
      setStudents(Array.isArray(data) ? data : []);
      const initial = {};
      (Array.isArray(data) ? data : []).forEach(s => initial[s.student_id] = 'Present');
      setAttendance(initial);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveBackfill = async () => {
    if (!subject || !date) return alert("Missing required fields.");
    setLoading(true);

    const payload = {
      subject_id: subject,
      date: date,
      lecture_sequence: lectureSeq,
      records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status })),
      is_faculty_backfill: true
    };

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (res.ok) {
        alert("🎉 Past lecture attendance successfully recorded!");
      } else {
        alert(resData.detail || "Failed to submit backfill attendance.");
      }
    } catch (e) {
      alert("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #93c5fd', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px' }}>⏳</span>
        <h2 style={{ margin: 0, color: '#1e40af' }}>Backfill Past Lecture Attendance</h2>
      </div>
      <p style={{ color: '#64748b', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>
        Use this tab to log lectures conducted prior to the app's launch. <strong>Deadline: September 1, 2026.</strong>
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>Past Lecture Date</label>
          <input 
            type="date" 
            value={date} 
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)} 
            style={{ padding: '9px', borderRadius: '6px', border: '1px solid #93c5fd', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: 'white' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>Allocated Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
            <option value="">-- Select Subject --</option>
            {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>Batch / Lecture</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isPractical ? (
              <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 'bold', color: '#2563eb' }}>
                {allowedBatches.filter(b => b.toLowerCase() !== 'all').map(b => <option key={b} value={b}>Batch {b}</option>)}
              </select>
            ) : (
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                👥 Theory (All)
              </div>
            )}
            <select value={lectureSeq} onChange={e => setLectureSeq(Number(e.target.value))} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
              <option value={1}>Lecture 1</option>
              <option value={2}>Lecture 2</option>
              <option value={3}>Lecture 3</option>
            </select>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={fetchStudents} disabled={loading || !subject || !date} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>

      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status for {date}</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>{s.full_name} <br/><span style={{ fontSize: '0.8em', color: '#64748b' }}>{s.student_id}</span></td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setAttendance({ ...attendance, [s.student_id]: attendance[s.student_id] === 'Present' ? 'Absent' : 'Present' })}
                      style={{ 
                        background: attendance[s.student_id] === 'Present' ? '#22c55e' : '#ef4444', 
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100px' 
                      }}>
                      {attendance[s.student_id]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
             <button onClick={handleSaveBackfill} disabled={loading} style={{ padding: '12px 24px', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                {loading ? 'Submitting...' : 'Save Backfill Attendance'}
             </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>Select a past date, allocated subject, and click "Load Students" to begin backfilling.</p>}
    </div>
  );
}

function AdminEditAttendance({ subjects = [] }) {
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [lectureSeq, setLectureSeq] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchStudentsAndRecords = async () => {
    if (!subject || !date) return alert("Select subject and date.");
    setLoading(true);
    try {
      const studentRes = await fetch(`${API_BASE_URL}/students?batch=${batch}&subject_id=${subject}`);
      const studentList = await studentRes.json();
      setStudents(Array.isArray(studentList) ? studentList : []);

      const recordRes = await fetch(`${API_BASE_URL}/attendance/records?subject_id=${subject}&target_date=${date}&lecture_sequence=${lectureSeq}`);
      const pastRecords = await recordRes.json();

      const mergedState = {};
      (Array.isArray(studentList) ? studentList : []).forEach(s => {
        mergedState[s.student_id] = pastRecords[s.student_id] || 'Absent';
      });
      setAttendance(mergedState);

    } catch (e) { console.error(e); alert("Error fetching data."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!subject || !date) return alert("Missing data.");
    setLoading(true);
    const payload = {
      subject_id: subject,
      date: date,
      lecture_sequence: lectureSeq, 
      records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert("🎉 Past attendance updated successfully!");
      else alert("Failed to update.");
    } catch (e) { alert("Error connecting to server."); } 
    finally { setLoading(false); }
  };

  const handleDeleteSession = async () => {
    if (!subject || !date) return alert("Missing data.");
    const confirmDelete = window.confirm(
      `⚠️ DANGER: Are you sure you want to completely DELETE Lecture ${lectureSeq} for ${subject} on ${date}?\n\nThis will remove it from all reports. This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/session?subject_id=${subject}&target_date=${date}&lecture_sequence=${lectureSeq}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (res.ok) {
        alert(`🗑️ ${resData.message}`);
        setStudents([]);
        setAttendance({});
      } else {
        alert(resData.detail || "Failed to delete.");
      }
    } catch (e) { alert("Error connecting to server."); } 
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #fca5a5', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '24px' }}>👑</span>
        <h2 style={{ margin: 0, color: '#991b1b' }}>Admin Overwrite: Edit Past Attendance</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px' }}>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5', fontWeight: 'bold', color: '#991b1b' }}
        />
        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px' }}>
          <option value="">-- Select Subject --</option>
          {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
        </select>
        <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {['All', 'A', 'B', 'C', 'D', 'E'].map(b => <option key={b} value={b}>{b === 'All' ? 'All Batches' : `Batch ${b}`}</option>)}
        </select>
        <select value={lectureSeq} onChange={e => setLectureSeq(Number(e.target.value))} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value={1}>Lecture 1</option>
          <option value={2}>Lecture 2</option>
          <option value={3}>Lecture 3</option>
        </select>
        <button onClick={fetchStudentsAndRecords} disabled={loading || !subject} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Searching...' : 'Pull Past Records'}
        </button>
      </div>
      
      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Overwrite Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>{s.full_name} <br/><span style={{ fontSize: '0.8em', color: '#64748b' }}>{s.student_id}</span></td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setAttendance({ ...attendance, [s.student_id]: attendance[s.student_id] === 'Present' ? 'Absent' : 'Present' })}
                      style={{ 
                        background: attendance[s.student_id] === 'Present' ? '#22c55e' : '#ef4444', 
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100px' 
                      }}>
                      {attendance[s.student_id]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
             <button onClick={handleDeleteSession} disabled={loading} style={{ padding: '12px 24px', background: 'white', color: '#dc2626', border: '2px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                {loading ? 'Processing...' : '🗑️ Delete Entire Lecture'}
             </button>
             <button onClick={handleSave} disabled={loading} style={{ padding: '12px 24px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                {loading ? 'Overwriting...' : 'Overwrite Attendance'}
             </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>Select a past date, subject, and batch, then click "Pull Past Records" to edit.</p>}
    </div>
  );
}

function AttendanceEntry({ subjects = [], activeFaculty, allocations = [] }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [lectureSeq, setLectureSeq] = useState(1);
  const [loading, setLoading] = useState(false);

  const isPractical = subject.includes('_PRACTICAL');

  let allowedBatches = ['All', 'A', 'B', 'C', 'D', 'E']; 
  if (activeFaculty && subject) {
    const myAllocs = allocations.filter(a => a.faculty_id === activeFaculty && a.subject_id === subject);
    if (myAllocs.length > 0 && !myAllocs.some(a => a.batch_group.toLowerCase() === 'all')) {
      allowedBatches = myAllocs.map(a => a.batch_group);
    }
  }

  useEffect(() => {
    if (subject && !subjects.find(s => s.subject_code === subject)) {
      setSubject('');
      setStudents([]);
    }
    
    if (!isPractical) {
      setBatch('All');
    } else {
      if (!allowedBatches.includes(batch) || batch.toLowerCase() === 'all') {
        const firstRealBatch = allowedBatches.find(b => b.toLowerCase() !== 'all') || 'A';
        setBatch(firstRealBatch);
      }
    }
  }, [subjects, subject, activeFaculty, batch, allowedBatches, isPractical]);

  const fetchStudents = async () => {
    if (!subject) return;
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/students?batch=${batch}&subject_id=${subject}`;
      const response = await fetch(url);
      const data = await response.json();
      
      setStudents(Array.isArray(data) ? data : []);
      const initial = {};
      (Array.isArray(data) ? data : []).forEach(s => initial[s.student_id] = 'Present');
      setAttendance(initial);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!subject) return alert("Select a subject first.");
    setLoading(true);
    
    const payload = {
      subject_id: subject,
      date: new Date().toISOString().split('T')[0],
      lecture_sequence: lectureSeq, 
      records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert("🎉 Attendance saved successfully to cloud!");
      else alert("Failed to save attendance.");
    } catch (e) {
      alert("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a' }}>Daily Attendance Entry</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '220px', backgroundColor: 'white' }}>
          <option value="">-- Select Your Allocated Subject --</option>
          {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
        </select>

        {isPractical ? (
          <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 'bold', color: '#2563eb' }}>
            {allowedBatches.filter(b => b.toLowerCase() !== 'all').map(b => <option key={b} value={b}>Batch {b}</option>)}
          </select>
        ) : (
          <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            👥 All Batches (Theory)
          </div>
        )}

        <select value={lectureSeq} onChange={e => setLectureSeq(Number(e.target.value))} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
          <option value={1}>Lecture 1</option>
          <option value={2}>Lecture 2</option>
          <option value={3}>Lecture 3</option>
        </select>
        
        <button onClick={fetchStudents} disabled={loading || !subject} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: (loading || !subject) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (!subject) ? 0.7 : 1 }}>
          {loading ? 'Searching...' : 'Load Students'}
        </button>
      </div>
      
      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Program</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>{s.full_name} <br/><span style={{ fontSize: '0.8em', color: '#64748b' }}>{s.student_id}</span></td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>{s.program}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setAttendance({ ...attendance, [s.student_id]: attendance[s.student_id] === 'Present' ? 'Absent' : 'Present' })}
                      style={{ background: attendance[s.student_id] === 'Present' ? '#22c55e' : '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100px' }}>
                      {attendance[s.student_id]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
             <button onClick={handleSave} disabled={loading} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                {loading ? 'Saving...' : 'Save Attendance'}
              </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>No students currently loaded. Select an allocated subject and click "Load Students".</p>}
    </div>
  );
}