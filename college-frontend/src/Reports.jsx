import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Reports({ subjects = [] }) {
  const [activeReport, setActiveReport] = useState('attendance');

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1rem' }}>Export PDF Reports</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveReport('attendance')} 
          style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: activeReport === 'attendance' ? '#e0e7ff' : 'transparent', color: activeReport === 'attendance' ? '#2563eb' : '#64748b', borderRadius: '6px' }}
        >
          Subject Attendance %
        </button>
        <button 
          onClick={() => setActiveReport('marks')} 
          style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: activeReport === 'marks' ? '#e0e7ff' : 'transparent', color: activeReport === 'marks' ? '#2563eb' : '#64748b', borderRadius: '6px' }}
        >
          Compiled Semester Marks (Ranking)
        </button>
      </div>

      {activeReport === 'attendance' ? <AttendanceReport subjects={subjects} /> : <MarksReport />}
    </div>
  );
}

function AttendanceReport({ subjects }) {
  const [subject, setSubject] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!subject) return alert("Select a subject first.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/attendance/${subject}`);
      if (!res.ok) throw new Error("Report failed");
      setData(await res.json());
    } catch (e) { alert("Error generating report."); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Attendance Report: ${data.subject}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Total Classes Conducted: ${data.total_classes}`, 14, 22);

    const tableColumn = ["Enrollment No", "Student Name", "Classes Attended", "Percentage (%)"];
    const tableRows = data.students.map(s => [s.student_id, s.name, s.attended, `${s.percentage}%`]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`${data.subject}_Attendance.pdf`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '300px' }}>
          <option value="">-- Select Subject --</option>
          {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
        </select>
        <button onClick={generateReport} disabled={loading} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Generating...' : 'View Report'}
        </button>
      </div>

      {data && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>Total Classes: {data.total_classes}</p>
            <button onClick={downloadPDF} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Export to PDF</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>Enrollment</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Attended</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map(s => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', color: '#64748b' }}>{s.student_id}</td>
                  <td style={{ padding: '10px', fontWeight: '500' }}>{s.name}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{s.attended}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: s.percentage < 75 ? '#ef4444' : '#16a34a' }}>{s.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MarksReport() {
  const [program, setProgram] = useState('B. Pharm');
  const [semester, setSemester] = useState(5);
  const [examName, setExamName] = useState('Sessional 1 (Theory)');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/marks/compiled?program=${encodeURIComponent(program)}&semester=${semester}&exam_name=${encodeURIComponent(examName)}`);
      if (!res.ok) throw new Error("Report failed");
      setData(await res.json());
    } catch (e) { alert("Error generating report."); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF('landscape'); // Landscape for wide tables
    doc.setFontSize(16);
    doc.text(`${data.program} - Semester ${data.semester} | ${data.examName} Compilation`, 14, 15);
    
    const tableColumn = ["Rank", "Enrollment No", "Student Name", ...data.subjects.map(s => s.code), "Total Marks"];
    const tableRows = data.students.map((s, idx) => [
      idx + 1, // Rank (Since it's sorted descending by total)
      s.student_id, 
      s.name, 
      ...data.subjects.map(sub => s.marks[sub.code]), 
      s.total
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 22,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`${data.program}_Sem${data.semester}_${data.examName}.pdf`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={program} onChange={e => setProgram(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="B. Pharm">B. Pharm</option>
          <option value="M. Pharm">M. Pharm</option>
        </select>
        <select value={semester} onChange={e => setSemester(Number(e.target.value))} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select value={examName} onChange={e => setExamName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="Sessional 1 (Theory)">Sessional 1 (Theory)</option>
          <option value="Sessional 2 (Theory)">Sessional 2 (Theory)</option>
          <option value="Sessional 1 (Practical)">Sessional 1 (Practical)</option>
          <option value="End Semester">End Semester</option>
        </select>
        <button onClick={generateReport} disabled={loading} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Compiling...' : 'Generate Compilation'}
        </button>
      </div>

      {data && data.subjects.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={downloadPDF} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Export to PDF</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Enrollment</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                  {data.subjects.map(s => <th key={s.code} style={{ padding: '8px', textAlign: 'center', color: '#2563eb' }} title={s.name}>{s.code}</th>)}
                  <th style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, idx) => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? '#ea580c' : '#64748b' }}>#{idx + 1}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{s.student_id}</td>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{s.name}</td>
                    {data.subjects.map(sub => (
                      <td key={sub.code} style={{ padding: '8px', textAlign: 'center', color: s.marks[sub.code] === 'ABS' ? '#ef4444' : 'inherit' }}>
                        {s.marks[sub.code]}
                      </td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}