import React, { useState, useEffect } from 'react';

export default function AttendanceEntry({ subject_id, batch_group }) {
  const [attendance, setAttendance] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch students for this batch when component mounts
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/students?batch=${batch_group}`)
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        // Initialize all as Present
        const initial = {};
        data.forEach(s => initial[s.student_id] = 'Present');
        setAttendance(initial);
      });
  }, [batch_group]);

  const toggleStatus = (id) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const saveAttendance = async () => {
    setLoading(true);
    const payload = {
      subject_id: subject_id,
      date: new Date().toISOString().split('T')[0],
      records: Object.entries(attendance).map(([student_id, status]) => ({
        student_id,
        status
      }))
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(response.ok) alert("Attendance Saved!");
    } catch (e) {
      alert("Error saving attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
      <h3>Attendance: {subject_id}</h3>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <thead><tr><th>Student</th><th>Status</th></tr></thead>
        <tbody>
          {students.map(s => (
            <tr key={s.student_id}>
              <td>{s.full_name}</td>
              <td>
                <button 
                  onClick={() => toggleStatus(s.student_id)}
                  style={{ 
                    background: attendance[s.student_id] === 'Present' ? '#4caf50' : '#f44336',
                    color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px'
                  }}
                >
                  {attendance[s.student_id]}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button 
        onClick={saveAttendance}
        disabled={loading}
        style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px' }}
      >
        {loading ? "Saving..." : "Submit Attendance"}
      </button>
    </div>
  );
}