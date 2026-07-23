import React, { useState, useEffect } from 'react';
import Reports from './Reports';
import MarksEntry from './MarksEntry';

const API_BASE_URL = 'https://college-backend-007.onrender.com/api';

export default function CollegeDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentUser, setCurrentUser] = useState(null); // Null = Not logged in
  const [loginMode, setLoginMode] = useState('faculty'); // 'faculty' or 'admin'
  const [loginInput, setLoginInput] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [data, setData] = useState({
    students: [],
    faculty: [],
    subjects: [],
    allocations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();

    // Restore saved login session from localStorage if present
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
        setActiveTab('attendance');
      } else {
        setLoginError('Invalid Admin credentials! (Use Username: admin / Password: admin123)');
      }
    } else {
      // Faculty Login
      const foundFaculty = data.faculty.find(
        f => f.faculty_id.toLowerCase() === loginInput.id.trim().toLowerCase() ||
             f.email.toLowerCase() === loginInput.id.trim().toLowerCase()
      );

      if (!foundFaculty) {
        setLoginError('Faculty ID or Email not found in the database.');
        return;
      }

      // Default PIN check (1234 or matching faculty ID)
      if (loginInput.password === '1234' || loginInput.password === foundFaculty.faculty_id) {
        const userObj = { role: 'faculty', name: foundFaculty.name, id: foundFaculty.faculty_id };
        setCurrentUser(userObj);
        localStorage.setItem('college_app_user', JSON.stringify(userObj));
        setActiveTab('attendance');
      } else {
        setLoginError('Incorrect password. Default PIN is 1234');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('college_app_user');
    setLoginInput({ id: '', password: '' });
  };

  const activeFacultyId = currentUser?.role === 'faculty' ? currentUser.id : '';

  const filteredSubjects = data.subjects.filter(s => {
    if (!activeFacultyId) return true; // Admin sees all
    return data.allocations.some(a => a.faculty_id === activeFacultyId && a.subject_id === s.subject_code);
  });

  const renderTable = (headers, rows, keys) => (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
          <tr>
            {headers.map(h => <th key={h} style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {keys.map(k => <td key={k} style={{ padding: '12px 16px', color: '#1e293b' }}>{row[k]}</td>)}
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

          {/* Login Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <button
              onClick={() => { setLoginMode('faculty'); setLoginError(''); }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: loginMode === 'faculty' ? 'white' : 'transparent',
                color: loginMode === 'faculty' ? '#2563eb' : '#64748b',
                boxShadow: loginMode === 'faculty' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Faculty Portal
            </button>
            <button
              onClick={() => { setLoginMode('admin'); setLoginError(''); }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: loginMode === 'admin' ? 'white' : 'transparent',
                color: loginMode === 'admin' ? '#2563eb' : '#64748b',
                boxShadow: loginMode === 'admin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
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
                <select
                  value={loginInput.id}
                  onChange={e => setLoginInput({ ...loginInput, id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                >
                  <option value="">-- Select Your Name / ID --</option>
                  {data.faculty.map(f => (
                    <option key={f.faculty_id} value={f.faculty_id}>
                      {f.name} ({f.faculty_id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter admin username"
                  value={loginInput.id}
                  onChange={e => setLoginInput({ ...loginInput, id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                Password / Security PIN
              </label>
              <input
                type="password"
                placeholder={loginMode === 'faculty' ? 'Default PIN is 1234' : 'Enter admin password'}
                value={loginInput.password}
                onChange={e => setLoginInput({ ...loginInput, password: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {loginMode === 'faculty' && (
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Default password for faculty is <strong>1234</strong>
                </span>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'background 0.2s'
              }}
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Faculty only sees practical entry tabs; Admin sees all database tables too
  const availableTabs = currentUser.role === 'faculty'
    ? ['attendance', 'marks', 'reports']
    : ['attendance', 'marks', 'reports', 'students', 'faculty', 'subjects', 'allocations'];

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', fontFamily: "'Inter', sans-serif", padding: '0 1rem' }}>
      {/* HEADER WITH LOGGED IN FACULTY INFO */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 0.25rem 0' }}>College Management Dashboard</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Manage attendance, marks, and official reports from anywhere.</p>
        </div>
        
        {/* LOGGED IN USER CARD */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{currentUser.name}</div>
            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', textTransform: 'capitalize' }}>
              {currentUser.role === 'faculty' ? `Faculty ID: ${currentUser.id}` : 'System Administrator'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
      
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
              padding: '10px 20px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === tab ? '#2563eb' : '#f1f5f9',
              color: activeTab === tab ? 'white' : '#475569',
              borderRadius: '8px',
              fontWeight: '600',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p>Loading your cloud database...</p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'students' && renderTable(['ID', 'Name', 'Program', 'Semester', 'Batch'], data.students, ['student_id', 'full_name', 'program', 'semester', 'batch_group'])}
          {activeTab === 'faculty' && renderTable(['ID', 'Name', 'Email'], data.faculty, ['faculty_id', 'name', 'email'])}
          {activeTab === 'subjects' && renderTable(['Code', 'Name', 'Program', 'Semester'], data.subjects, ['subject_code', 'subject_name', 'program', 'semester'])}
          {activeTab === 'allocations' && renderTable(['Faculty ID', 'Subject Code', 'Batch'], data.allocations, ['faculty_id', 'subject_id', 'batch_group'])}
          
          {/* TEACHER MODULES - ISOLATED STRICTLY TO LOGGED IN FACULTY */}
          {activeTab === 'attendance' && (
            <AttendanceEntry 
              subjects={filteredSubjects} 
              activeFaculty={activeFacultyId} 
              allocations={data.allocations} 
            />
          )}
          {activeTab === 'marks' && (
            <MarksEntry 
              subjects={filteredSubjects} 
              activeFaculty={activeFacultyId} 
              allocations={data.allocations} 
            />
          )}
          {activeTab === 'reports' && <Reports subjects={currentUser.role === 'faculty' ? filteredSubjects : data.subjects} />}
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

function AttendanceEntry({ subjects = [], activeFaculty, allocations = [] }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [loading, setLoading] = useState(false);

  // SMART BATCH LOGIC
  let allowedBatches = ['All', 'A', 'B', 'C', 'D'];
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
    if (subject && !allowedBatches.includes(batch) && allowedBatches.length > 0) {
      setBatch(allowedBatches[0]);
    }
  }, [subjects, subject, activeFaculty, batch, allowedBatches]);

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
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        
        <select 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px', backgroundColor: 'white' }}
        >
          <option value="">-- Select Your Allocated Subject --</option>
          {subjects.map(s => (
             <option key={s.subject_code} value={s.subject_code}>
               {s.subject_code} - {s.subject_name}
             </option>
          ))}
        </select>

        <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {allowedBatches.map(b => (
             <option key={b} value={b}>{b.toLowerCase() === 'all' ? 'All Batches' : `Batch ${b}`}</option>
          ))}
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
             <button onClick={handleSave} disabled={loading} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                {loading ? 'Saving...' : 'Save Attendance'}
             </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>No students currently loaded. Select an allocated subject and batch, then click "Load Students".</p>}
    </div>
  );
}