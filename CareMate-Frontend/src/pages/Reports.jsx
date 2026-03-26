import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../api/client';
import './ReportViewer.css';

/* JSON Parser utilities */
function sanitizeJsonNewlines(str) {
    let result = '', inString = false, escaped = false;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (escaped) { result += c; escaped = false; continue; }
        if (c === '\\') { result += c; escaped = true; continue; }
        if (c === '"') { inString = !inString; result += c; continue; }
        if (inString && (c === '\n' || c === '\r')) { if (c === '\n') result += '\\n'; continue; }
        result += c;
    }
    return result;
}

function parseReport(raw) {
    if (!raw) return null;
    let content = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    try { return JSON.parse(content); } catch { /* continue */ }
    try { return JSON.parse(sanitizeJsonNewlines(content)); } catch { /* continue */ }
    try {
        const titleMatch = content.match(/"report_title"\s*:\s*"([^"]+)"/);
        const summaryMatch = content.match(/"report_summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        const sections = [];
        const re = /"section_title"\s*:\s*"([^"]+)"[\s\S]*?"section_text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let m;
        while ((m = re.exec(content)) !== null) {
            sections.push({ section_title: m[1], section_text: m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'), section_order: sections.length + 1 });
        }
        if (sections.length > 0) return { report_title: titleMatch ? titleMatch[1] : 'Consultation Report', report_summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '', sections };
    } catch { /* continue */ }
    return { report_title: 'Report', report_summary: '', sections: [{ section_title: 'Details', section_text: content, section_order: 1 }] };
}

function getSectionIcon(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('chief complaint')) return '🩺';
    if (t.includes('history') || t.includes('present illness')) return '📋';
    if (t.includes('review') || t.includes('systems')) return '🔍';
    if (t.includes('past medical') || t.includes('pmh')) return '📁';
    if (t.includes('medication') || t.includes('allerg')) return '💊';
    if (t.includes('clinical') || t.includes('impression') || t.includes('assessment')) return '🏥';
    if (t.includes('recommendation') || t.includes('plan')) return '📝';
    if (t.includes('social') || t.includes('family')) return '👨‍👩‍👧‍👦';
    return '📄';
}

function renderSectionContent(text) {
    if (!text) return null;
    let clean = text.replace(/\\n/g, '\n').replace(/\\t/g, '  ').replace(/\\"/g, '"');
    return clean.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isBullet = /^[-•]\s+/.test(trimmed);
        const bulletContent = isBullet ? trimmed.replace(/^[-•]\s+/, '') : trimmed;
        const colonMatch = bulletContent.match(/^([A-Za-z][A-Za-z\s/()]{0,35}?):\s*(.+)/);
        if (colonMatch) return (
            <div key={i} className={isBullet ? 'report-bullet-line' : 'report-text-line'}>
                {isBullet && <span className="report-bullet-dot">•</span>}
                <span><span className="report-label">{colonMatch[1].trim()}:</span> <span className="report-value">{colonMatch[2].trim()}</span></span>
            </div>
        );
        if (isBullet) return <div key={i} className="report-bullet-line"><span className="report-bullet-dot">•</span><span className="report-plain-text">{bulletContent}</span></div>;
        return <div key={i} className="report-text-line"><span className="report-plain-text">{trimmed}</span></div>;
    }).filter(Boolean);
}

/* Export Utilities */
function getReportText(parsed) {
    if (!parsed) return '';
    const sections = (parsed.sections || []).sort((a, b) => (a.section_order || 0) - (b.section_order || 0));
    let text = `${parsed.report_title || 'Consultation Report'}\n${'='.repeat(60)}\n\n`;
    if (parsed.report_summary) text += `SUMMARY\n${'-'.repeat(40)}\n${parsed.report_summary}\n\n`;
    sections.forEach(s => {
        text += `${s.section_title?.toUpperCase() || 'SECTION'}\n${'-'.repeat(40)}\n`;
        const clean = (s.section_text || '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
        text += `${clean}\n\n`;
    });
    if (parsed.next_follow_up) text += `FOLLOW-UP\n${'-'.repeat(40)}\n${parsed.next_follow_up}\n`;
    return text;
}

function exportAsText(parsed, filename) {
    const blob = new Blob([getReportText(parsed)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportAsCSV(parsed, filename) {
    if (!parsed) return;
    const sections = (parsed.sections || []).sort((a, b) => (a.section_order || 0) - (b.section_order || 0));
    const rows = [['Section', 'Label', 'Value']];
    const addSection = (title, text) => {
        if (!text) return;
        (text.replace(/\\n/g, '\n').replace(/\\"/g, '"')).split('\n').forEach(line => {
            const t = line.trim().replace(/^[-•]\s+/, '');
            if (!t) return;
            const m = t.match(/^([A-Za-z][A-Za-z\s/()]{0,35}?):\s*(.+)/);
            if (m) rows.push([title, m[1].trim(), m[2].trim()]);
            else rows.push([title, '', t]);
        });
    };
    if (parsed.report_summary) addSection('Summary', parsed.report_summary);
    sections.forEach(s => addSection(s.section_title || 'Section', s.section_text));
    if (parsed.next_follow_up) rows.push(['Follow-up', '', parsed.next_follow_up]);
    const csv = rows.map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportAsPDF(parsed, patientInfo) {
    if (!parsed) return;
    const sections = (parsed.sections || []).sort((a, b) => (a.section_order || 0) - (b.section_order || 0));
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${parsed.report_title||'Report'}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1e293b;font-size:13px;line-height:1.6}.header{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:28px 32px;border-radius:12px;margin-bottom:24px}.header h1{margin:0 0 6px;font-size:20px}.header p{margin:0;opacity:.85;font-size:12px}.section{margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}.section-title{background:#f8fafc;padding:10px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#4f46e5;border-bottom:1px solid #e2e8f0}.section-body{padding:14px 16px}.row{display:flex;gap:8px;padding:3px 0}.label{font-weight:700;color:#1e293b;min-width:140px}.value{color:#475569}.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(99,102,241,.05);font-weight:900;pointer-events:none}</style>
</head><body>
<div class="watermark">CONFIDENTIAL</div>
<div class="header"><h1>${parsed.report_title||'Consultation Report'}</h1>${patientInfo?`<p>${patientInfo}</p>`:''}</div>
${parsed.report_summary?`<div class="section"><div class="section-title">Summary</div><div class="section-body">${parsed.report_summary}</div></div>`:''}
${sections.map(s=>{
    const lines=(s.section_text||'').replace(/\\n/g,'\n').replace(/\\"/g,'"').split('\n').filter(l=>l.trim()).map(line=>{
        const t=line.trim().replace(/^[-•]\s+/,'');
        const m=t.match(/^([A-Za-z][A-Za-z\s/()]{0,35}?):\s*(.+)/);
        return m?`<div class="row"><span class="label">${m[1].trim()}:</span><span class="value">${m[2].trim()}</span></div>`:`<div class="row"><span class="value">${t}</span></div>`;
    }).join('');
    return `<div class="section"><div class="section-title">${s.section_title||'Section'}</div><div class="section-body">${lines}</div></div>`;
}).join('')}
${parsed.next_follow_up?`<div class="section"><div class="section-title">Follow-up</div><div class="section-body">${parsed.next_follow_up}</div></div>`:''}
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(htmlContent); win.document.close(); setTimeout(()=>win.print(),600); }
}

function ExportMenu({ parsed, patientName, createdAt, onClose }) {
    const fn = `report_${(patientName||'patient').replace(/\s+/g,'_')}_${(createdAt||'').slice(0,10)}`;
    return (
        <div style={{position:'absolute',top:48,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.18)',zIndex:200,minWidth:220,overflow:'hidden'}}>
            {[
                {label:'📄 Export as PDF', action:()=>{exportAsPDF(parsed,patientName?`Patient: ${patientName}${createdAt?' • '+new Date(createdAt).toLocaleDateString('en-IN'):''}`:undefined);onClose();}},
                {label:'📊 Export as CSV', action:()=>{exportAsCSV(parsed,fn+'.csv');onClose();}},
                {label:'📝 Export as Text / Word', action:()=>{exportAsText(parsed,fn+'.txt');onClose();}},
            ].map(({label,action})=>(
                <button key={label} onClick={action}
                    style={{display:'block',width:'100%',padding:'12px 16px',textAlign:'left',background:'#fff',border:'none',cursor:'pointer',fontSize:'0.85rem',color:'#1e293b',fontWeight:500,transition:'background 0.15s',lineHeight:1.4}}
                    onMouseOver={e=>{e.currentTarget.style.background='#eff6ff';}}
                    onMouseOut={e=>{e.currentTarget.style.background='#fff';}}>
                    {label}
                </button>
            ))}
        </div>
    );
}

/* Full-Screen Report Viewer Modal */
function ReportViewerModal({ parsed, onClose, patientName, createdAt }) {
    const [showExport, setShowExport] = useState(false);
    const exportRef = useRef(null);

    const handleKeyDown = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
    }, [handleKeyDown]);

    useEffect(() => {
        if (!showExport) return;
        const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showExport]);

    if (!parsed) return null;
    const sections = (parsed.sections || []).sort((a, b) => (a.section_order || 0) - (b.section_order || 0));
    const summaryInSections = sections.some(s => s.section_title?.toLowerCase().includes('summary'));

    return (
        <div className="report-overlay" onClick={onClose}>
            <div className="report-watermark">CONFIDENTIAL</div>
            <div className="report-viewer" onClick={(e) => e.stopPropagation()}>
                <div className="report-viewer-header">
                    <div style={{flex:1,minWidth:0}}>
                        <h2>{parsed.report_title || 'Consultation Report'}</h2>
                        {patientName && <div style={{fontSize:'0.82rem',opacity:0.85,marginTop:4}}>Patient: {patientName}{createdAt ? ` • ${new Date(createdAt).toLocaleDateString('en-IN',{dateStyle:'medium'})}` : ''}</div>}
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0,position:'relative'}} ref={exportRef}>
                        <button
                            className="report-export-btn"
                            onClick={()=>setShowExport(v=>!v)}>
                            ⬇ Export
                        </button>
                        {showExport && <ExportMenu parsed={parsed} patientName={patientName} createdAt={createdAt} onClose={()=>setShowExport(false)} />}
                        <button className="report-viewer-close" onClick={onClose} title="Close (Esc)">✕</button>
                    </div>
                </div>
                <div className="report-viewer-body">
                    {parsed.report_summary && !summaryInSections && (
                        <div className="report-section">
                            <h3 className="report-section-title"><span className="report-section-icon">📝</span>Summary</h3>
                            <div className="report-section-content"><div className="report-text-line"><span className="report-plain-text">{parsed.report_summary}</span></div></div>
                        </div>
                    )}
                    {sections.map((section, i) => (
                        <div key={i} className="report-section">
                            <h3 className="report-section-title"><span className="report-section-icon">{getSectionIcon(section.section_title)}</span>{section.section_title}</h3>
                            <div className="report-section-content">{renderSectionContent(section.section_text)}</div>
                        </div>
                    ))}
                    {parsed.next_follow_up && (
                        <div className="report-section">
                            <h3 className="report-section-title"><span className="report-section-icon">📅</span>Follow-up</h3>
                            <div className="report-section-content"><div className="report-text-line"><span className="report-plain-text">{parsed.next_follow_up}</span></div></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* Doctor Reports Page — Searchable Grid */
function DoctorReportsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientReports, setPatientReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedReportMeta, setSelectedReportMeta] = useState({});
    const [sortCol, setSortCol] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const searchTimer = useRef(null);

    const doSearch = useCallback(async (q) => {
        setLoadingPatients(true);
        try { const res = await reportAPI.searchPatients(q); setPatients(res.data || []); }
        catch { setPatients([]); }
        setLoadingPatients(false);
    }, []);

    useEffect(() => { doSearch(''); }, [doSearch]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => doSearch(val), 350);
    };

    const handleSelectPatient = async (patient) => {
        setSelectedPatient(patient);
        setPatientReports([]);
        setLoadingReports(true);
        try { const res = await reportAPI.patientReportsForDoctor(patient.patient_id); setPatientReports(res.data || []); }
        catch { setPatientReports([]); }
        setLoadingReports(false);
    };

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const sorted = [...patients].sort((a, b) => {
        const av = (a[sortCol] || '').toString().toLowerCase();
        const bv = (b[sortCol] || '').toString().toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const SortIcon = ({ col }) => sortCol !== col
        ? <span style={{opacity:0.3,marginLeft:4}}>⇅</span>
        : <span style={{marginLeft:4,color:'#6366f1'}}>{sortDir==='asc'?'↑':'↓'}</span>;

    const formatDT = dt => dt ? new Date(dt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) : '—';

    return (
        <div>
            <div className="page-header">
                <h1>Patient Reports</h1>
                <p>Search patients and review their AI pre-consultation summaries</p>
            </div>

            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:'1.1rem',opacity:0.5}}>🔍</span>
                    <input type="text" placeholder="Search by patient name, ID, or phone number…" value={searchQuery} onChange={handleSearchChange}
                        style={{width:'100%',padding:'11px 14px 11px 40px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'0.92rem',outline:'none',transition:'border-color 0.2s',background:'#f8fafc'}}
                        onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                </div>
                <div style={{marginTop:8,fontSize:'0.78rem',color:'#94a3b8'}}>{loadingPatients ? 'Searching…' : `${patients.length} patient${patients.length!==1?'s':''} found`}</div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:selectedPatient?'1fr 1fr':'1fr',gap:20}}>
                {/* Patient Grid */}
                <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                    <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700}}>Patients with Reports</h3>
                        {selectedPatient && <button onClick={()=>setSelectedPatient(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:'0.8rem'}}>✕ Close panel</button>}
                    </div>
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                            <thead>
                                <tr style={{background:'#f8fafc'}}>
                                    {[['name','Patient Name'],['phone','Phone'],['report_count','Reports']].map(([col,label])=>(
                                        <th key={col} onClick={()=>handleSort(col)} style={{padding:'10px 16px',textAlign:'left',fontWeight:700,fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'#64748b',cursor:'pointer',userSelect:'none',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>
                                            {label}<SortIcon col={col}/>
                                        </th>
                                    ))}
                                    <th style={{padding:'10px 16px',fontWeight:700,fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPatients ? (
                                    <tr><td colSpan={4} style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Searching…</td></tr>
                                ) : sorted.length === 0 ? (
                                    <tr><td colSpan={4} style={{padding:32,textAlign:'center',color:'#94a3b8'}}>No patients found</td></tr>
                                ) : sorted.map(p => (
                                    <tr key={p.patient_id} style={{borderBottom:'1px solid #f1f5f9',background:selectedPatient?.patient_id===p.patient_id?'#f0f0ff':'transparent',transition:'background 0.15s',cursor:'pointer'}}
                                        onClick={()=>handleSelectPatient(p)}
                                        onMouseOver={e=>{if(selectedPatient?.patient_id!==p.patient_id)e.currentTarget.style.background='#f8fafc';}}
                                        onMouseOut={e=>{if(selectedPatient?.patient_id!==p.patient_id)e.currentTarget.style.background='transparent';}}>
                                        <td style={{padding:'10px 16px',fontWeight:600}}>{p.name}</td>
                                        <td style={{padding:'10px 16px',color:'#64748b'}}>{p.phone||'—'}</td>
                                        <td style={{padding:'10px 16px'}}><span style={{background:'#e0e7ff',color:'#4f46e5',padding:'2px 10px',borderRadius:20,fontSize:'0.78rem',fontWeight:700}}>{p.report_count}</span></td>
                                        <td style={{padding:'10px 16px'}}><button onClick={e=>{e.stopPropagation();handleSelectPatient(p);}} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'5px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>View</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Patient Reports Panel */}
                {selectedPatient && (
                    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'linear-gradient(135deg,#f0f0ff,#faf5ff)'}}>
                            <div style={{fontSize:'0.78rem',color:'#6366f1',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>Reports for</div>
                            <h3 style={{margin:0,fontSize:'1rem'}}>{selectedPatient.name}</h3>
                            <div style={{fontSize:'0.75rem',color:'#94a3b8',marginTop:2}}>📞 {selectedPatient.phone||'N/A'}</div>
                        </div>
                        {loadingReports ? (
                            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Loading reports…</div>
                        ) : patientReports.length === 0 ? (
                            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>No reports found for this patient</div>
                        ) : (
                            <div>
                                {/* Latest Report */}
                                <div style={{padding:'16px 20px',borderBottom:'2px solid #e0e7ff',background:'#fafbff'}}>
                                    <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'#6366f1',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                                        <span style={{background:'#6366f1',color:'#fff',padding:'2px 8px',borderRadius:20,fontSize:'0.65rem'}}>LATEST</span>Latest Report
                                    </div>
                                    {(() => {
                                        const r = patientReports[0];
                                        const parsed = parseReport(r.report_md);
                                        return (
                                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                                                <div style={{flex:1,minWidth:0}}>
                                                    <div style={{fontWeight:600,fontSize:'0.9rem'}}>{parsed?.report_title||'Consultation Report'}</div>
                                                    <div style={{fontSize:'0.75rem',color:'#94a3b8',marginTop:2}}>{formatDT(r.created_at)}</div>
                                                    {parsed?.report_summary && <div style={{fontSize:'0.8rem',color:'#64748b',marginTop:6,lineHeight:1.5}}>{parsed.report_summary.slice(0,140)}{parsed.report_summary.length>140?'…':''}</div>}
                                                </div>
                                                <button onClick={()=>{setSelectedReport(parsed);setSelectedReportMeta({patientName:selectedPatient.name,createdAt:r.created_at});}}
                                                    style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:9,cursor:'pointer',fontSize:'0.82rem',fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>
                                                    📄 View Report
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {/* Previous Reports */}
                                {patientReports.length > 1 && (
                                    <div style={{padding:'12px 20px 20px'}}>
                                        <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'#94a3b8',marginBottom:10}}>Previous Reports ({patientReports.length-1})</div>
                                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                            {patientReports.slice(1).map((r,i)=>{
                                                const parsed = parseReport(r.report_md);
                                                return (
                                                    <div key={r.report_id||i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',gap:12}}>
                                                        <div>
                                                            <div style={{fontWeight:600,fontSize:'0.85rem'}}>{parsed?.report_title||`Report #${i+2}`}</div>
                                                            <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:1}}>{formatDT(r.created_at)}</div>
                                                        </div>
                                                        <button onClick={()=>{setSelectedReport(parsed);setSelectedReportMeta({patientName:selectedPatient.name,createdAt:r.created_at});}}
                                                            style={{background:'#f1f5f9',color:'#4f46e5',border:'1px solid #e0e7ff',padding:'5px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600,flexShrink:0}}>
                                                            View
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedReport && <ReportViewerModal parsed={selectedReport} patientName={selectedReportMeta.patientName} createdAt={selectedReportMeta.createdAt} onClose={()=>setSelectedReport(null)} />}
        </div>
    );
}

/* Patient Reports Page */
function PatientReportsPage() {
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(()=>{
        (async()=>{
            try { const res = await reportAPI.patientReport(); setReports(res.data); } catch { /* empty */ }
            setLoading(false);
        })();
    },[]);

    if (loading) return <div className="loading-page"><div className="spinner"/></div>;
    const isEmpty = !reports || (Array.isArray(reports) && reports.length===0) || (typeof reports==='object' && !Array.isArray(reports) && Object.keys(reports).length===0);
    const formatDT = dt => dt ? new Date(dt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) : '';

    // Build unified report list from any format
    let reportList = [];
    if (Array.isArray(reports)) {
        reportList = reports.map((r,i)=>({key:i, raw:typeof r==='object'?r.report_md:r, createdAt:typeof r==='object'?r.created_at:null, doctorId:null}));
    } else if (reports && typeof reports==='object') {
        reportList = Object.entries(reports).map(([k,v])=>({key:k, raw:typeof v==='object'?v.report_md:v, createdAt:typeof v==='object'?v.created_at:null, doctorId:k}));
    }
    // Ensure each report has a valid parsed object, even if raw is plain text
    reportList = reportList.map(r => {
        const parsed = parseReport(r.raw);
        return {...r, parsed};
    });

    return (
        <div>
            <div className="page-header">
                <h1>My Reports</h1>
                <p>Your AI pre-consultation summaries</p>
            </div>
            {isEmpty ? (
                <div className="card empty-state">
                    <h3>No reports yet</h3>
                    <p>Complete an AI consultation to generate your first report</p>
                </div>
            ) : (
                <div className="reports-grid">
                    {reportList.map(({key,parsed,createdAt,doctorId})=>{
                        const summaryInSections = (parsed?.sections||[]).some(s=>s.section_title?.toLowerCase().includes('summary'));
                        const previewSections = (parsed?.sections||[]).slice(0,3);
                        const hasSummary = parsed?.report_summary && !summaryInSections;
                        return (
                            <div key={key} className="report-card" onClick={()=>setSelectedReport({parsed,createdAt})}>
                                <div className="report-card-header">
                                    <h3>{parsed?.report_title||'AI Pre-Consultation Report'}</h3>
                                    <div className="report-meta">
                                        {createdAt && <span>📅 {formatDT(createdAt)}</span>}
                                        {doctorId && <span>🤖 AI Summary</span>}
                                    </div>
                                </div>
                                <div className="report-card-body">
                                    {hasSummary ? (
                                        <div style={{fontSize:'0.85rem',color:'#475569',lineHeight:1.7,padding:'4px 0'}}>
                                            <span style={{fontWeight:700,color:'#4f46e5',marginRight:6}}>📋 Summary:</span>
                                            {parsed.report_summary.slice(0,180)}{parsed.report_summary.length>180?'…':''}
                                        </div>
                                    ) : previewSections.length > 0 ? previewSections.map((s,j)=>(
                                        <div key={j} className="report-preview-item">
                                            <span className="preview-label">{s.section_title}:</span>
                                            <span className="preview-value">{(s.section_text||'').replace(/\\n/g,' ').slice(0,90)}{(s.section_text||'').length>90?'…':''}</span>
                                        </div>
                                    )) : (
                                        <div style={{fontSize:'0.82rem',color:'#94a3b8',fontStyle:'italic',padding:'8px 0'}}>Click to view report details</div>
                                    )}
                                </div>
                                <div className="report-card-footer">📄 View Full Report →</div>
                            </div>
                        );
                    })}
                </div>
            )}
            {selectedReport && <ReportViewerModal parsed={selectedReport.parsed} createdAt={selectedReport.createdAt} onClose={()=>setSelectedReport(null)} />}
        </div>
    );
}

export default function Reports() {
    const { user } = useAuth();
    return user?.role === 'doctor' ? <DoctorReportsPage /> : <PatientReportsPage />;
}
