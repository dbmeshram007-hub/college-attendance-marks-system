import React, { useState, useEffect } from 'react';
import MarksEntry from './MarksEntry';
import Reports from './Reports';

// Using window.location.hostname ensures this works on both localhost and LAN later!
const API_BASE_URL = 'https://college-backend-007.onrender.com/api';
export default function CollegeDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [activeFaculty, setActiveFaculty] = useState(''); // NEW: Track who is "logged in"
  
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
        setError("Backend Error: Could not load data. Ensure uvicorn is running on port 8000.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // NEW LOGIC: Filter subjects based on the simulated logged-in teacher
  const filteredSubjects = activeFaculty
    ? data.subjects.filter(sub => 
        data.allocations.some(alloc => 
          alloc.faculty_id === activeFaculty && alloc.subject_id === sub.subject_code
        )
      )
    : data.subjects; // If Admin (no faculty selected), show all subjects

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

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', fontFamily: "'Inter', sans-serif", padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>College Management Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Manage your institution's data from one central hub.</p>
      </div>
      
      {/* SIMULATE TEACHER LOGIN BANNER */}
      <div style={{ marginBottom: '1.5rem', padding: '12px 20px', background: '#e0e7ff', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <strong style={{ color: '#3730a3' }}>👨‍🏫 Simulate Teacher View:</strong>
        <select 
          value={activeFaculty} 
          onChange={e => setActiveFaculty(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #a5b4fc', flex: 1, maxWidth: '300px', fontWeight: 'bold', color: '#312e81' }}
        >
          <option value="">-- Admin Mode (See All Subjects) --</option>
          {data.faculty.map(f => (
            <option key={f.faculty_id} value={f.faculty_id}>{f.name} ({f.faculty_id})</option>
          ))}
        </select>
        <span style={{ fontSize: '13px', color: '#4f46e5' }}>
          {activeFaculty ? `Showing only subjects allocated to ${data.faculty.find(f => f.faculty_id === activeFaculty)?.name}` : "Showing all data."}
        </span>
      </div>

      {error && (
        <div style={{ color: '#dc2626', padding: '1rem', background: '#fef2f2', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '5px' }}>
        {['attendance', 'marks', 'reports', 'students', 'faculty', 'subjects', 'allocations'].map(tab => (
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
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p>Loading Database...</p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'students' && renderTable(['ID', 'Name', 'Program', 'Semester', 'Batch'], data.students, ['student_id', 'full_name', 'program', 'semester', 'batch_group'])}
          {activeTab === 'faculty' && renderTable(['ID', 'Name', 'Email'], data.faculty, ['faculty_id', 'name', 'email'])}
          {activeTab === 'subjects' && renderTable(['Code', 'Name', 'Program', 'Semester'], data.subjects, ['subject_code', 'subject_name', 'program', 'semester'])}
          {activeTab === 'allocations' && renderTable(['Faculty ID', 'Subject Code', 'Batch'], data.allocations, ['faculty_id', 'subject_id', 'batch_group'])}
          
          {/* TEACHER MODULES - Now using filteredSubjects! */}
          {activeTab === 'attendance' && <AttendanceEntry subjects={filteredSubjects} />}
          {activeTab === 'marks' && <MarksEntry subjects={filteredSubjects} />}
          
          {/* REPORTS MODULE - Admins usually see everything, so we pass all subjects */}
          {activeTab === 'reports' && <Reports subjects={data.subjects} />}
        </div>
      )}
    </div>
  );
}

/** 
 * ATTENDANCE ENTRY COMPONENT 
 */
function AttendanceEntry({ subjects = [] }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [loading, setLoading] = useState(false);

  // Automatically reset selected subject if it's no longer in the dropdown (e.g. teacher changed)
  useEffect(() => {
    if (subject && !subjects.find(s => s.subject_code === subject)) {
      setSubject('');
      setStudents([]);
    }
  }, [subjects, subject]);

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
    if (students.length === 0) return;
    setLoading(true);
    const payload = {
      subject_id: subject,
      date: new Date().toISOString().split('T')[0],
      records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if(response.ok) alert("✅ Attendance saved successfully to Database!");
      else alert(result.detail || "Failed to save.");
    } catch (e) {
      alert("Error saving attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1rem' }}>Daily Attendance Entry</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        
        <select 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px', backgroundColor: 'white' }}
        >
          <option value="">-- Select Subject --</option>
          {subjects.map(s => (
             <option key={s.subject_code} value={s.subject_code}>
               {s.subject_code} - {s.subject_name}
             </option>
          ))}
        </select>

        <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="All">All Batches</option>
          <option value="A">Batch A</option>
          <option value="B">Batch B</option>
          <option value="C">Batch C</option>
          <option value="D">Batch D</option>
          <option value="E">Batch E</option>
        </select>
        
        <button onClick={fetchStudents} disabled={loading || !subject} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: (loading || !subject) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (!subject) ? 0.7 : 1 }}>
          {loading ? 'Searching...' : 'Load Students'}
        </button>
      </div>
      
      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Program & Sem</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#475569' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500', color: '#1e293b' }}>
                    {s.full_name} <br/>
                    <span style={{fontSize: '0.85em', color: '#64748b'}}>{s.student_id}</span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>{s.program} (Sem {s.semester})</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setAttendance({...attendance, [s.student_id]: attendance[s.student_id] === 'Present' ? 'Absent' : 'Present' })}
                      style={{ 
                        background: attendance[s.student_id] === 'Present' ? '#16a34a' : '#ef4444', 
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100px',
                        transition: 'background 0.2s'
                      }}>
                      {attendance[s.student_id]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '2px solid #e2e8f0', paddingTop: '15px' }}>
             <button onClick={handleSave} disabled={loading} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                {loading ? 'Saving...' : 'Submit Attendance'}
             </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No students currently loaded. Select a subject and batch, then click "Load Students".</p>}
    </div>
  );
}