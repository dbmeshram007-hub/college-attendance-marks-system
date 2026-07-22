import React, { useState, useEffect } from 'react';
import MarksEntry from './MarksEntry'; // Make sure MarksEntry.jsx is in the same folder!

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance'); // Defaulting to Attendance for your demo
  const [data, setData] = useState({ students: [], faculty: [], subjects: [], allocations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const endpoints = ['students', 'faculty', 'subjects', 'allocations'];
      try {
        const results = await Promise.all(endpoints.map(ep => fetch(`${API_BASE_URL}/${ep}`).then(res => res.json())));
        setData({ students: results[0], faculty: results[1], subjects: results[2], allocations: results[3] });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const renderTable = (headers, rows, keys) => (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {headers.map(h => <th key={h} style={{ padding: '12px 16px', color: '#475569' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
             <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {keys.map(k => <td key={k} style={{ padding: '12px 16px' }}>{row[k]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#1e293b' }}>College Management Dashboard</h1>
      
      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['attendance', 'marks', 'students', 'faculty', 'subjects', 'allocations'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            style={{ 
              padding: '10px 20px', 
              textTransform: 'capitalize', 
              fontWeight: 'bold',
              background: activeTab === tab ? '#2563eb' : '#f1f5f9', 
              color: activeTab === tab ? 'white' : '#475569', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? <p>Loading Database...</p> : (
        <>
          {activeTab === 'students' && renderTable(['ID', 'Name', 'Program', 'Semester', 'Batch', 'Specialization'], data.students, ['student_id', 'full_name', 'program', 'semester', 'batch_group', 'specialization'])}
          {activeTab === 'faculty' && renderTable(['ID', 'Name', 'Email'], data.faculty, ['faculty_id', 'name', 'email'])}
          {activeTab === 'subjects' && renderTable(['Code', 'Name', 'Program', 'Semester'], data.subjects, ['subject_code', 'subject_name', 'program', 'semester'])}
          {activeTab === 'allocations' && renderTable(['Faculty ID', 'Subject Code', 'Batch'], data.allocations, ['faculty_id', 'subject_id', 'batch_group'])}
          
          {/* TEACHER MODULES: Now deeply connected to the database subjects! */}
          {activeTab === 'attendance' && <AttendanceEntry subjects={data.subjects} />}
          {activeTab === 'marks' && <MarksEntry subjects={data.subjects} />}
        </>
      )}
    </div>
  );
}

// ATTENDANCE COMPONENT
function AttendanceEntry({ subjects = [] }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [loading, setLoading] = useState(false);

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

  const handleSave = () => {
    alert("Attendance Data ready to save to database!\n" + JSON.stringify(attendance, null, 2));
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{marginTop: 0, color: '#0f172a'}}>Daily Attendance Entry</h2>
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

        <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="All">All Batches</option>
          <option value="A">Batch A</option>
          <option value="B">Batch B</option>
          <option value="C">Batch C</option>
        </select>
        <button onClick={fetchStudents} disabled={loading} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
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
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>{s.full_name} <br/><span style={{fontSize: '0.8em', color: '#64748b'}}>{s.student_id}</span></td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>{s.program}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setAttendance({...attendance, [s.student_id]: attendance[s.student_id] === 'Present' ? 'Absent' : 'Present' })}
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
             <button onClick={handleSave} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                Save Attendance
             </button>
          </div>
        </>
      ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>No students currently loaded. Enter a subject code and batch to begin.</p>}
    </div>
  );
}