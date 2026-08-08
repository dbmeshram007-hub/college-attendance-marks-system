import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = '[https://college-backend-007.onrender.com/api](https://college-backend-007.onrender.com/api)';

export default function Reports({ subjects = [], currentUser }) {
  const [activeReport, setActiveReport] = useState('attendance');
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '1rem' }}>Export PDF Reports</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveReport('attendance')} 
          style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: activeReport === 'attendance' ? '#e0e7ff' : 'transparent', color: activeReport === 'attendance' ? '#2563eb' : '#64748b', borderRadius: '6px' }}
        >
          Subject Attendance %
        </button>
        <button 
          onClick={() => setActiveReport('subject_marks')} 
          style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: activeReport === 'subject_marks' ? '#e0e7ff' : 'transparent', color: activeReport === 'subject_marks' ? '#2563eb' : '#64748b', borderRadius: '6px' }}
        >
          Subject Marks
        </button>
        
        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveReport('marks')} 
              style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid', borderColor: activeReport === 'marks' ? '#fca5a5' : '#e2e8f0', background: activeReport === 'marks' ? '#fef2f2' : '#f8fafc', color: activeReport === 'marks' ? '#dc2626' : '#64748b', borderRadius: '6px', marginLeft: 'auto' }}
            >
              👑 Admin: Compiled Semester Marks
            </button>
            <button 
              onClick={() => setActiveReport('compiled_attendance')} 
              style={{ padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid', borderColor: activeReport === 'compiled_attendance' ? '#fca5a5' : '#e2e8f0', background: activeReport === 'compiled_attendance' ? '#fef2f2' : '#f8fafc', color: activeReport === 'compiled_attendance' ? '#dc2626' : '#64748b', borderRadius: '6px' }}
            >
              👑 Admin: Compiled Semester Attendance
            </button>
          </>
        )}
      </div>

      {activeReport === 'attendance' && <AttendanceReport subjects="{subjects}"/>}
      {activeReport === 'subject_marks' && <SubjectMarksReport subjects="{subjects}"/>}
      {activeReport === 'marks' && isAdmin && <MarksReport/>}
      {activeReport === 'compiled_attendance' && isAdmin && <CompiledAttendanceReport/>}
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
    const doc = new jsPDF('landscape'); 
    const currentDate = new Date().toLocaleDateString();
    
    doc.setFontSize(16);
    doc.text(`Master Attendance Sheet: ${data.subject}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Classes Conducted: ${data.total_classes}  |  Generated: ${currentDate}`, 14, 22);
    
    const tableColumn = ["Enrollment", "Name", ...data.sessions, "Total", "%"];
    const tableRows = data.students.map(s => [
        s.student_id, 
        s.name, 
        ...s.daily_status, 
        s.attended, 
        `${s.percentage}%`
    ]);

    autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 28, 
        styles: { fontSize: 8, cellPadding: 2, halign: 'center' }, 
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
        headStyles: { fillColor: [37, 99, 235] } 
    });
    
    doc.save(`${data.subject}_Master_Attendance.pdf`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '300px' }}>
          <option value="">-- Select Subject --</option>
          {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
        </select>
        
        <button onClick={generateReport} disabled={loading} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Generating...' : 'View Register'}
        </button>
      </div>

      {data && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>
              Total Classes Conducted: {data.total_classes}
            </p>
            <button onClick={downloadPDF} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Export to PDF</button>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', minWidth: '120px' }}>Enrollment</th>
                  <th style={{ padding: '10px', textAlign: 'left', minWidth: '200px' }}>Name</th>
                  {data.sessions.map((sess, i) => (
                      <th key={i} style={{ padding: '10px', textAlign: 'center', color: '#2563eb', fontSize: '11px', minWidth: '60px' }}>{sess}</th>
                  ))}
                  <th style={{ padding: '10px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>Total</th>
                  <th style={{ padding: '10px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map(s => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', color: '#64748b' }}>{s.student_id}</td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{s.name}</td>
                    {s.daily_status.map((status, i) => (
                        <td key={i} style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: status === 'P' ? '#16a34a' : status === 'A' ? '#ef4444' : '#94a3b8' }}>
                            {status}
                        </td>
                    ))}
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{s.attended}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', color: s.percentage < 75 ? '#ef4444' : '#16a34a' }}>{s.percentage}%</td>
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

function SubjectMarksReport({ subjects }) {
  const [subject, setSubject] = useState('');
  const [examName, setExamName] = useState('Sessional 1');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!subject) return alert("Select a subject first.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/marks/${subject}?exam_name=${encodeURIComponent(examName)}`);
      if (!res.ok) throw new Error("Report failed");
      setData(await res.json());
    } catch (e) { alert("Error generating report."); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF('p', 'pt'); 
    const currentDate = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.text(`Subject Marks Report: ${data.subject_code}`, 14, 25);
    doc.setFontSize(10);
    doc.text(`Subject: ${data.subject}  |  Exam: ${data.exam_name}  |  Max Marks: ${data.max_marks}`, 14, 40);
    doc.text(`Status: ${data.status}  |  Generated on: ${currentDate}`, 14, 55);

    const tableColumn = ["Enrollment No.", "Student Name", `Marks (out of ${data.max_marks})`];
    const tableRows = data.students.map(s => [
        s.student_id,
        s.name,
        s.mark
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } }
    });

    doc.save(`${data.subject_code}_${data.exam_name}_Marks.pdf`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '300px' }}>
          <option value="">-- Select Subject --</option>
          {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>)}
        </select>
        <select value={examName} onChange={e => setExamName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="Sessional 1">Sessional 1</option>
          <option value="Sessional 2">Sessional 2</option>
          <option value="Practical">Practical</option>
          <option value="End Semester">End Semester</option>
        </select>

        <button onClick={generateReport} disabled={loading} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Generating...' : 'View Marks'}
        </button>
      </div>

      {data && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>
              Exam Status: <span style={{ color: data.status === 'Published' ? '#16a34a' : '#ea580c' }}>{data.status}</span>
            </p>
            <button onClick={downloadPDF} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Export to PDF</button>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', width: '25%' }}>Enrollment No.</th>
                  <th style={{ padding: '10px', textAlign: 'left', width: '50%' }}>Student Name</th>
                  <th style={{ padding: '10px', textAlign: 'center', backgroundColor: '#f1f5f9', width: '25%' }}>Marks (out of {data.max_marks})</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map(s => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', color: '#64748b' }}>{s.student_id}</td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{s.name}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', color: s.mark === 'ABS' ? '#ef4444' : '#1e293b' }}>
                      {s.mark}
                    </td>
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
    const doc = new jsPDF('landscape');
    const currentDate = new Date().toLocaleDateString();
    
    doc.setFontSize(16);
    doc.text(`${data.program} - Semester ${data.semester} | ${data.examName} Compilation`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, 14, 21);
    
    const tableColumn = ["Rank", "Enrollment No", "Student Name", ...data.subjects.map(s => s.code), "Total Marks"];
    const tableRows = data.students.map((s, idx) => [
      idx + 1,
      s.student_id, 
      s.name, 
      ...data.subjects.map(sub => s.marks[sub.code]), 
      s.total
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 25, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [15, 23, 42] } });
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

function CompiledAttendanceReport() {
  const [program, setProgram] = useState('B. Pharm');
  const [semester, setSemester] = useState(5);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/attendance/compiled?program=${encodeURIComponent(program)}&semester=${semester}`);
      if (!res.ok) throw new Error("Report failed");
      setData(await res.json());
    } catch (e) { alert("Error generating report."); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF('landscape');
    const currentDate = new Date().toLocaleDateString();
    
    doc.setFontSize(16);
    doc.text(`${data.program} - Semester ${data.semester} | Cumulative Attendance`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, 14, 21);
    
    const tableColumn = ["Enrollment No", "Student Name", ...data.subjects.map(s => s.code), "Overall %"];
    const tableRows = data.students.map((s) => [
      s.student_id, 
      s.name, 
      ...data.subjects.map(sub => s.attendance[sub.code] === '-' ? '-' : `${s.attendance[sub.code]}%`), 
      `${s.overall_percentage}%`
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 25, styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [15, 23, 42] } });
    doc.save(`${data.program}_Sem${data.semester}_Cumulative_Attendance.pdf`);
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
        <button onClick={generateReport} disabled={loading} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Compiling...' : 'Generate Cumulative Report'}
        </button>
      </div>

      {data && data.subjects.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={downloadPDF} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📄 Export to PDF</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#fef2f2', borderBottom: '2px solid #fca5a5' }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#991b1b' }}>Enrollment</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#991b1b' }}>Name</th>
                  {data.subjects.map(s => <th key={s.code} style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }} title={s.name}>{s.code}</th>)}
                  <th style={{ padding: '8px', textAlign: 'center', backgroundColor: '#fca5a5', color: '#7f1d1d' }}>Overall %</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{s.student_id}</td>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{s.name}</td>
                    {data.subjects.map(sub => {
                      const perc = s.attendance[sub.code];
                      return (
                        <td key={sub.code} style={{ padding: '8px', textAlign: 'center', color: perc === '-' ? '#94a3b8' : (perc < 75 ? '#ef4444' : '#16a34a'), fontWeight: perc !== '-' ? 'bold' : 'normal' }}>
                          {perc === '-' ? '-' : `${perc}%`}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef2f2', color: s.overall_percentage < 75 ? '#dc2626' : '#16a34a' }}>
                      {s.overall_percentage}%
                    </td>
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