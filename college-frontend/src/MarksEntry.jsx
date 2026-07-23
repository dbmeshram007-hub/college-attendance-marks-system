import React, { useState } from 'react';

const API_BASE_URL = 'https://college-backend-007.onrender.com/api';

export default function MarksEntry({ subjects = [] }) {
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('All');
  const [examName, setExamName] = useState('Sessional 1 (Theory)');
  const [maxMarks, setMaxMarks] = useState(15.0);
  
  const [examData, setExamData] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(false);

  const loadExamAndStudents = async () => {
    if (!subject.trim()) {
      alert("Please enter a Subject Code first (e.g., BP501T)");
      return;
    }
    setLoading(true);
    try {
      const examRes = await fetch(`${API_BASE_URL}/marks/exams/${subject.trim()}?exam_name=${encodeURIComponent(examName)}&max_marks=${maxMarks}`);
      
      if (!examRes.ok) {
        let errorMsg = "Error loading exam data.";
        try {
          const errJson = await examRes.json();
          errorMsg = errJson.detail || errorMsg;
        } catch (e) {}
        alert(errorMsg);
        setLoading(false);
        return;
      }
      
      const examJson = await examRes.json();
      setExamData(examJson);

      const studentUrl = `${API_BASE_URL}/students?batch=${batch}&subject_id=${subject.trim()}`;
      const studentRes = await fetch(studentUrl);
      const studentList = await studentRes.json();
      
      const validStudents = Array.isArray(studentList) ? studentList : [];
      setStudents(validStudents);

      const marksRes = await fetch(`${API_BASE_URL}/marks/records/${examJson.id}`);
      const existingMarks = await marksRes.json();

      const initial = {};
      validStudents.forEach(s => {
        const found = Array.isArray(existingMarks) ? existingMarks.find(m => m.student_id === s.student_id) : null;
        initial[s.student_id] = {
          marks: found && found.marks_obtained !== null ? found.marks_obtained : '',
          isAbsent: found ? found.is_absent : false
        };
      });
      setMarksData(initial);

    } catch (e) {
      console.error(e);
      alert("Error loading exam and student data.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    if (value !== '' && isNaN(Number(value))) return;
    if (Number(value) > maxMarks) {
      alert(`Marks cannot exceed the maximum of ${maxMarks}`);
      return;
    }
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: value }
    }));
  };

  const handleAbsentToggle = (studentId) => {
    setMarksData(prev => {
      const isCurrentlyAbsent = prev[studentId].isAbsent;
      return {
        ...prev,
        [studentId]: {
          marks: !isCurrentlyAbsent ? '' : prev[studentId].marks,
          isAbsent: !isCurrentlyAbsent
        }
      };
    });
  };

  const submitMarks = async (actionType) => {
    if (!examData) return;
    setLoading(true);
    
    const payload = {
      exam_id: examData.id,
      action_type: actionType,
      marks: Object.entries(marksData).map(([student_id, data]) => ({
        student_id,
        marks_obtained: data.marks === '' ? null : Number(data.marks),
        is_absent: data.isAbsent,
        remarks: null
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/marks/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        setExamData(prev => ({ ...prev, status: result.status }));
      } else {
        alert(result.detail || "Failed to submit marks.");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = examData?.status === 'Published';

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1rem' }}>Enter & Manage Exam Marks</h2>
      
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
        <select
          value={examName}
          onChange={e => {
            const val = e.target.value;
            setExamName(val);
            if (val.includes('Practical')) setMaxMarks(15.0);
            else if (val.includes('Sessional')) setMaxMarks(15.0);
            else setMaxMarks(75.0);
          }}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        >
          <option value="Sessional 1">Sessional 1 (Max 20)</option>
          <option value="Sessional 2">Sessional 2 (Max 20)</option>
          <option value="Practical">Practical (Max 20)</option>
          
        </select>
        <input 
          type="number"
          placeholder="Max Marks" 
          value={maxMarks} 
          onChange={e => setMaxMarks(Number(e.target.value))} 
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '90px' }} 
        />
        <button 
          onClick={loadExamAndStudents} 
          disabled={loading} 
          style={{ padding: '10px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Loading...' : 'Load Exam Grid'}
        </button>
      </div>

      {examData && (
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>{examData.subject_id} - {examData.exam_name}</h3>
          <div style={{ display: 'flex', gap: '20px', color: '#475569', fontSize: '14px' }}>
            <span><strong>Max Marks:</strong> {examData.max_marks}</span>
            <span style={{ 
              color: isLocked ? '#b91c1c' : '#0369a1', 
              fontWeight: 'bold',
              padding: '2px 8px',
              backgroundColor: isLocked ? '#fee2e2' : '#e0f2fe',
              borderRadius: '4px'
            }}>
              Status: {examData.status}
            </span>
          </div>
        </div>
      )}

      {students.length > 0 ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Enrollment No.</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Student Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Marks Obtained</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#475569' }}>Mark Absent</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const sData = marksData[s.student_id] || { marks: '', isAbsent: false };
                return (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '14px' }}>{s.student_id}</td>
                    <td style={{ padding: '12px 8px', fontWeight: '500', color: '#1e293b' }}>{s.full_name}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <input
                        type="number"
                        value={sData.marks}
                        onChange={(e) => handleMarkChange(s.student_id, e.target.value)}
                        disabled={isLocked || sData.isAbsent}
                        placeholder={sData.isAbsent ? "ABSENT" : `out of ${maxMarks}`}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          width: '140px',
                          backgroundColor: (isLocked || sData.isAbsent) ? '#f1f5f9' : 'white',
                          fontWeight: 'bold',
                          color: sData.isAbsent ? '#ef4444' : '#0f172a'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sData.isAbsent}
                          onChange={() => handleAbsentToggle(s.student_id)}
                          disabled={isLocked}
                          style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                        />
                        <span style={{ color: sData.isAbsent ? '#ef4444' : '#64748b', fontWeight: sData.isAbsent ? 'bold' : 'normal' }}>
                          Absent
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            {!isLocked && (
              <>
                <button
                  onClick={() => submitMarks('draft')}
                  disabled={loading}
                  style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => submitMarks('publish')}
                  disabled={loading}
                  style={{ padding: '10px 20px', backgroundColor: '#dc2626', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Publish Final Results
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <p style={{ color: '#64748b', fontStyle: 'italic' }}>
          No exam grid loaded. Enter a Subject Code and Exam Name, then click "Load Exam Grid".
        </p>
      )}
    </div>
  );
}