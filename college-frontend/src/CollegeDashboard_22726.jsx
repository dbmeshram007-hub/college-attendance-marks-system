import React, { useState, useEffect } from 'react';
import MarksEntry from './MarksEntry';
import Reports from './Reports';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function CollegeDashboard() {
  const [activeTab, setActiveTab] = useState('students');
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>College Management Dashboard</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Manage your institution's data from one central hub.</p>
      </div>
      
      {error && (
        <div style={{ color: '#dc2626', padding: '1rem', background: '#fef2f2', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>
          {error}
        </div>
      )}

      {/* TABS NAVIGATION INCLUDING REPORTS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {['students', 'faculty', 'subjects', 'allocations', 'attendance', 'marks', 'reports'].map(tab => (
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p>Loading your data...</p>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {activeTab === 'students' && renderTable(['ID', 'Name', 'Program', 'Semester', 'Batch'], data.students, ['student_id', 'full_name', 'program', 'semester', 'batch_group'])}
          {activeTab === 'faculty' && renderTable(['ID', 'Name', 'Email'], data.faculty, ['faculty_id', 'name', 'email'])}
          {activeTab === 'subjects' && renderTable(['Code', 'Name', 'Program', 'Semester'], data.subjects, ['subject_code', 'subject_name', 'program', 'semester'])}
          {activeTab === 'allocations' && renderTable(['Faculty ID', 'Subject Code', 'Batch'], data.allocations, ['faculty_id', 'subject_id', 'batch_group'])}
          
          {/* TEACHER MODULES CONNECTED TO DATABASE SUBJECTS */}
          {activeTab === 'attendance' && <AttendanceEntry subjects={data.subjects} />}
          {activeTab === 'marks' && <MarksEntry subjects={data.subjects} />}
          {activeTab === 'reports' && <Reports subjects={data.subjects} />}
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

function AttendanceEntry({ subjects = [] }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    if (!subject) {
      alert("Please select a subject from the dropdown.");
      return;
    }
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/students?batch=${batch}&subject_id=${subject}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        alert("Error loading students. Check backend connection.");
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      const studentList = Array.isArray(data) ? data : [];
      setStudents(studentList);
      
      const initial = {};
      studentList.forEach(s => initial[s.student_id] = 'Present');
      setAttendance(initial);
    } catch (e) { 
      console.error(e); 
      alert("Error fetching students for this subject.");
    } finally { 
      setLoading(false); 
    }
  };

  const toggleStatus = (id) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const saveAttendance = async () => {
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
      
      if(response.ok) {
        alert("Attendance Saved Successfully!");
      } else {
        const errData = await response.json();
        alert(`Failed: ${errData.detail || 'Could not save attendance.'}`);
      }
    } catch (e) {
      alert("Error submitting attendance data. Is the backend server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1rem' }}>Mark Attendance</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px', backgroundColor: 'white' }}
        >
          <option value="">-- Select Subject from Database --</option>
          {subjects.map(s => (
             <option key={s.subject_code} value={s.subject_code}>
               {s.subject_code} - {s.subject_name}
             </option>
          ))}
        </select>
        <select 
          value={batch} 
          onChange={e => setBatch(e.target.value)} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        >
          <option value="All">All Batches</option>
          <option value="A">Batch A</option>
          <option value="B">Batch B</option>
          <option value="C">Batch C</option>
        </select>
        <button 
          onClick={fetchStudents} 
          disabled={loading} 
          style={{ padding: '10px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Searching...' : 'Load Students'}
        </button>
      </div>
      
      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Program / Batch</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#475569' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500', color: '#1e293b' }}>
                    {s.full_name} <br/>
                    <span style={{ fontSize: '0.8em', color: '#64748b' }}>{s.student_id}</span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>
                    {s.program} (Batch {s.batch_group})
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleStatus(s.student_id)}
                      style={{ 
                        background: attendance[s.student_id] === 'Present' ? '#22c55e' : '#ef4444', 
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100px' 
                      }}
                    >
                      {attendance[s.student_id]}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right' }}>
             <button 
               onClick={saveAttendance} 
               disabled={loading} 
               style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
             >
                {loading ? "Saving..." : "Submit Attendance"}
             </button>
          </div>
        </>
      ) : (
        <p style={{ color: '#64748b', fontStyle: 'italic' }}>
          No students currently loaded. Select a subject and click "Load Students".
        </p>
      )}
    </div>
  );
}