import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, reportAPI, prescriptionAPI, documentAPI, drugAPI } from '../api/client';
import { reviewAPI } from '../api/client';
import './ReportViewer.css';
import './Appointments.css';

/* ─── helpers ─── */
function sanitizeJson(str){let r='',inStr=false,esc=false;for(let i=0;i<str.length;i++){const c=str[i];if(esc){r+=c;esc=false;continue;}if(c==='\\'){r+=c;esc=true;continue;}if(c==='"'){inStr=!inStr;r+=c;continue;}if(inStr&&(c==='\n'||c==='\r')){if(c==='\n')r+='\\n';continue;}r+=c;}return r;}
function parseReport(raw){
  if(!raw)return null;
  // If already an object, use as-is
  if(typeof raw==='object'&&raw!==null)return raw;
  let c=String(raw).trim();
  // Strip markdown code fences
  c=c.replace(/^```(?:json)?\s*\n?/i,'').replace(/\n?```\s*$/i,'').trim();
  // Try direct parse
  try{return JSON.parse(c);}catch{}
  // Sanitize and try again
  try{return JSON.parse(sanitizeJson(c));}catch{}
  // Last resort: look for JSON object anywhere in the string
  const m=c.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch{}}
  // Fallback: treat whole string as summary
  return{report_title:'AI Pre-Consultation Report',report_summary:c,sections:[]};
}
const fmtDT=(d)=>d?new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const fmtTime=(d)=>d?new Date(d).toLocaleTimeString('en-IN',{timeStyle:'short'}):'—';
const fmtDate=(d)=>d?new Date(d).toLocaleDateString('en-IN',{dateStyle:'medium'}):'—';
const slotDur=(a)=>{if(!a?.start_ts||!a?.end_ts)return null;return Math.round((new Date(a.end_ts)-new Date(a.start_ts))/60000);};
const fmtBytes=(b)=>{if(!b)return'';const n=parseInt(b);if(n>1048576)return`${(n/1048576).toFixed(1)} MB`;if(n>1024)return`${(n/1024).toFixed(0)} KB`;return`${n} B`;};
const BACKEND='http://localhost:8000';

/* ─── Status badge ─── */
const STATUS_STYLE={booked:{bg:'#dbeafe',c:'#1d4ed8'},in_progress:{bg:'#fef9c3',c:'#a16207'},completed:{bg:'#dcfce7',c:'#16a34a'},cancelled:{bg:'#fee2e2',c:'#dc2626'},no_show:{bg:'#f3f4f6',c:'#6b7280'}};
function StatusBadge({status}){const s=STATUS_STYLE[status]||STATUS_STYLE.booked;return<span style={{background:s.bg,color:s.c,padding:'3px 10px',borderRadius:20,fontSize:'0.73rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>{status?.replace('_',' ')}</span>;}

/* ─── Report content renderer ─── */
function getSectionIcon(t){t=(t||'').toLowerCase();if(t.includes('chief'))return'🩺';if(t.includes('history')||t.includes('illness'))return'📋';if(t.includes('review')||t.includes('system'))return'🔍';if(t.includes('past')||t.includes('pmh'))return'📁';if(t.includes('medic')||t.includes('allerg'))return'💊';if(t.includes('clinical')||t.includes('impression')||t.includes('assess'))return'🏥';if(t.includes('recommend')||t.includes('plan'))return'📝';return'📄';}
function renderSectionContent(text){
  if(!text)return null;
  const clean=text.replace(/\\n/g,'\n').replace(/\\"/g,'"');
  return clean.split('\n').map((line,i)=>{
    const t=line.trim();if(!t)return null;
    const isBullet=/^[-•]\s+/.test(t);const bc=isBullet?t.replace(/^[-•]\s+/,''):t;
    const cm=bc.match(/^([A-Za-z][A-Za-z\s/()]{0,35}?):\s*(.+)/);
    if(cm)return<div key={i}className={isBullet?'report-bullet-line':'report-text-line'}>{isBullet&&<span className="report-bullet-dot">•</span>}<span><span className="report-label">{cm[1]}:</span><span className="report-value"> {cm[2]}</span></span></div>;
    if(isBullet)return<div key={i}className="report-bullet-line"><span className="report-bullet-dot">•</span><span className="report-plain-text">{bc}</span></div>;
    return<div key={i}className="report-text-line"><span className="report-plain-text">{t}</span></div>;
  }).filter(Boolean);
}

/* ─── Common Indian medicines fallback list ─── */
const COMMON_MEDS=[
  'Paracetamol','Ibuprofen','Aspirin','Amoxicillin','Azithromycin','Ciprofloxacin','Metronidazole',
  'Omeprazole','Pantoprazole','Ranitidine','Metformin','Glibenclamide','Insulin Glargine',
  'Amlodipine','Atenolol','Losartan','Enalapril','Telmisartan','Metoprolol','Ramipril',
  'Atorvastatin','Rosuvastatin','Clopidogrel','Aspirin 75mg','Warfarin','Ecosprin',
  'Cetirizine','Loratadine','Fexofenadine','Montelukast','Salbutamol','Levosalbutamol',
  'Budesonide','Fluticasone','Tiotropium','Theophylline','Doxophylline',
  'Cefixime','Ceftriaxone','Doxycycline','Cotrimoxazole','Nitrofurantoin','Levofloxacin',
  'Pantoprazole','Domperidone','Ondansetron','Metoclopramide','Lactulose','Bisacodyl',
  'Calcium Carbonate','Vitamin D3','Vitamin B12','Folic Acid','Iron Sucrose','Ferrous Sulfate',
  'Prednisolone','Methylprednisolone','Dexamethasone','Hydrocortisone',
  'Diclofenac','Aceclofenac','Naproxen','Tramadol','Codeine','Gabapentin','Pregabalin',
  'Amitriptyline','Sertraline','Escitalopram','Alprazolam','Clonazepam','Zolpidem',
  'Levothyroxine','Carbimazole','Metformin 500mg','Metformin 1000mg','Sitagliptin','Empagliflozin',
  'Hydroxychloroquine','Colchicine','Allopurinol','Febuxostat',
  'Chlorpheniramine','Promethazine','Diphenhydramine',
  'Mupirocin','Clotrimazole','Terbinafine','Fluconazole','Ketoconazole',
  'Neomycin','Gentamicin Eye Drops','Ciprofloxacin Eye Drops','Timolol Eye Drops',
  'ORS Sachet','Zinc Sulfate','Albendazole','Ivermectin','Mebendazole',
];

/* ─── Drug Search: Backend DB → RxNorm fallback ─── */
function MedicineSearch({onAdd}){
  const[q,setQ]=useState('');
  const[results,setResults]=useState([]);
  const[loading,setLoading]=useState(false);
  const[open,setOpen]=useState(false);
  const[showManual,setShowManual]=useState(false);
  const[manualDrug,setManualDrug]=useState({name:'',generic_name:'',brand_name:'',category:'',common_dosages:''});
  const[addingManual,setAddingManual]=useState(false);
  const timer=useRef(null);const wrap=useRef(null);

  const localMatches=q.length>=1
    ?COMMON_MEDS.filter(m=>m.toLowerCase().includes(q.toLowerCase())).slice(0,8)
    :[];

  const searchDrugs=async(val)=>{
    if(!val||val.length<2){setResults([]);setOpen(false);return;}
    setLoading(true);
    try{
      // 1. Search backend drug DB first
      const r=await drugAPI.search(val);
      const dbDrugs=(r.data||[]).map(d=>({name:d.name,source:'db',dosage:d.common_dosages||''}));
      if(dbDrugs.length>0){setResults(dbDrugs);setOpen(true);setLoading(false);return;}
    }catch{}
    // 2. Try RxNorm
    try{
      const ctrl=new AbortController();
      const tid=setTimeout(()=>ctrl.abort(),3000);
      const r=await fetch(`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(val)}&maxEntries=15`,{signal:ctrl.signal});
      clearTimeout(tid);
      const d=await r.json();
      const candidates=d?.approximateGroup?.candidate||[];
      const seen=new Set();
      const names=candidates.map(c=>c.name).filter(n=>{if(seen.has(n.toLowerCase()))return false;seen.add(n.toLowerCase());return true;}).slice(0,12);
      if(names.length>0){setResults(names.map(n=>({name:n,source:'rxnorm'})));setOpen(true);setLoading(false);return;}
    }catch{}
    // 3. Local fallback
    setResults(localMatches.map(n=>({name:n,source:'local'})));
    setOpen(localMatches.length>0);
    setLoading(false);
  };

  useEffect(()=>{
    if(!q||q.length<1){setResults([]);setOpen(false);return;}
    if(localMatches.length>0){setResults(localMatches.map(n=>({name:n,source:'local'})));setOpen(true);}
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>searchDrugs(q),350);
  },[q]);

  useEffect(()=>{const h=(e)=>{if(wrap.current&&!wrap.current.contains(e.target)){setOpen(false);setShowManual(false);}};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);

  const pick=(drug)=>{
    onAdd({name:drug.name,rxcui:'',dosage:drug.dosage||'',morning:0,afternoon:0,evening:0,morning_instr:'Before food',afternoon_instr:'After food',evening_instr:'After food',duration:'',instructions:''});
    // Increment usage count in background
    drugAPI.incrementUsage(drug.name).catch(()=>{});
    setQ('');setResults([]);setOpen(false);
  };

  const addManualDrug=async()=>{
    if(!manualDrug.name.trim())return;
    setAddingManual(true);
    try{
      await drugAPI.add({...manualDrug,name:manualDrug.name.trim()});
      pick({name:manualDrug.name.trim(),dosage:manualDrug.common_dosages});
      setManualDrug({name:'',generic_name:'',brand_name:'',category:'',common_dosages:''});
      setShowManual(false);
    }catch(e){alert('Error adding drug: '+(e.response?.data?.detail||e.message));}
    setAddingManual(false);
  };

  const sourceLabel=(src)=>src==='db'?{label:'DB',color:'#10b981'}:src==='rxnorm'?{label:'RxNorm',color:'#3b82f6'}:{label:'Local',color:'#94a3b8'};

  return(
    <div ref={wrap} style={{position:'relative'}}>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{position:'relative',flex:1}}>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Type medicine name to search…"
            className="form-input" style={{paddingRight:36}}
            onFocus={()=>{if(q.length>=1&&results.length>0)setOpen(true);}}/>
          {loading&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:'0.75rem',color:'#94a3b8'}}>⏳</span>}
        </div>
        <button type="button" onClick={()=>setShowManual(v=>!v)}
          title="Add drug manually"
          style={{background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',border:'none',padding:'8px 12px',borderRadius:8,cursor:'pointer',fontSize:'0.82rem',fontWeight:600,whiteSpace:'nowrap'}}>
          + Add Drug
        </button>
      </div>
      {open&&results.length>0&&(
        <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,zIndex:9999,boxShadow:'0 10px 28px rgba(0,0,0,.15)',maxHeight:260,overflowY:'auto'}}>
          <div style={{padding:'4px 12px',fontSize:'0.7rem',color:'#94a3b8',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}}>
            <span>Search results</span>
            <span>Click to add</span>
          </div>
          {results.map((drug,i)=>{
            const sl=sourceLabel(drug.source);
            return(
              <div key={i} onClick={()=>pick(drug)}
                style={{padding:'9px 14px',cursor:'pointer',fontSize:'0.88rem',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8,color:'#1e293b',background:'#fff',justifyContent:'space-between'}}
                onMouseOver={e=>{e.currentTarget.style.background='#eff6ff';}}
                onMouseOut={e=>{e.currentTarget.style.background='#fff';}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span>💊</span><span>{drug.name}</span>
                  {drug.dosage&&<span style={{fontSize:'0.72rem',color:'#94a3b8'}}>({drug.dosage})</span>}
                </div>
                <span style={{fontSize:'0.65rem',background:sl.color+'18',color:sl.color,padding:'1px 6px',borderRadius:10,fontWeight:700}}>{sl.label}</span>
              </div>
            );
          })}
          <div onClick={()=>{setShowManual(true);setOpen(false);}}
            style={{padding:'9px 14px',cursor:'pointer',fontSize:'0.82rem',borderTop:'1px solid #f1f5f9',color:'#4f46e5',fontWeight:600,display:'flex',alignItems:'center',gap:6,background:'#f8faff'}}
            onMouseOver={e=>{e.currentTarget.style.background='#ede9fe';}}
            onMouseOut={e=>{e.currentTarget.style.background='#f8faff';}}>
            <span>➕</span><span>Not found? Add "{q}" manually</span>
          </div>
        </div>
      )}
      {showManual&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid #c4b5fd',borderRadius:12,zIndex:9999,boxShadow:'0 12px 32px rgba(0,0,0,.18)',padding:'16px'}}>
          <div style={{fontWeight:700,color:'#4f46e5',marginBottom:12,fontSize:'0.88rem'}}>➕ Add New Drug to Database</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <div>
              <label style={{fontSize:'0.75rem',fontWeight:700,color:'#64748b',display:'block',marginBottom:3}}>Drug Name *</label>
              <input className="form-input" value={manualDrug.name} onChange={e=>setManualDrug(p=>({...p,name:e.target.value}))} placeholder="e.g. Paracetamol 650mg" style={{fontSize:'0.85rem'}}/>
            </div>
            <div>
              <label style={{fontSize:'0.75rem',fontWeight:700,color:'#64748b',display:'block',marginBottom:3}}>Generic Name</label>
              <input className="form-input" value={manualDrug.generic_name} onChange={e=>setManualDrug(p=>({...p,generic_name:e.target.value}))} placeholder="e.g. Acetaminophen" style={{fontSize:'0.85rem'}}/>
            </div>
            <div>
              <label style={{fontSize:'0.75rem',fontWeight:700,color:'#64748b',display:'block',marginBottom:3}}>Brand Name</label>
              <input className="form-input" value={manualDrug.brand_name} onChange={e=>setManualDrug(p=>({...p,brand_name:e.target.value}))} placeholder="e.g. Crocin" style={{fontSize:'0.85rem'}}/>
            </div>
            <div>
              <label style={{fontSize:'0.75rem',fontWeight:700,color:'#64748b',display:'block',marginBottom:3}}>Common Dosages</label>
              <input className="form-input" value={manualDrug.common_dosages} onChange={e=>setManualDrug(p=>({...p,common_dosages:e.target.value}))} placeholder="e.g. 500mg, 650mg" style={{fontSize:'0.85rem'}}/>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={addManualDrug} disabled={addingManual||!manualDrug.name.trim()}
              style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:'0.82rem'}}>
              {addingManual?'Adding…':'✓ Add & Use'}
            </button>
            <button type="button" onClick={()=>setShowManual(false)}
              style={{background:'#f1f5f9',color:'#64748b',border:'none',padding:'8px 12px',borderRadius:8,cursor:'pointer',fontSize:'0.82rem'}}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Bulk Drug Import (for doctor drug management) ─── */
export function DrugBulkImport({onClose}){
  const[file,setFile]=useState(null);const[importing,setImporting]=useState(false);const[result,setResult]=useState(null);
  const upload=async()=>{
    if(!file)return;setImporting(true);setResult(null);
    const fd=new FormData();fd.append('file',file);
    try{const r=await drugAPI.bulkImport(fd);setResult(r.data);}
    catch(e){setResult({error:e.response?.data?.detail||'Import failed'});}
    setImporting(false);
  };
  return(
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px',marginTop:8}}>
      <div style={{fontWeight:700,color:'#1e293b',marginBottom:8,fontSize:'0.9rem'}}>📦 Bulk Drug Import</div>
      <div style={{fontSize:'0.8rem',color:'#64748b',marginBottom:10}}>
        Upload CSV or Excel (.xlsx) with columns: name, generic_name, brand_name, category, drug_class, common_dosages, route.
        <a href={drugAPI.downloadTemplate()} download style={{color:'#4f46e5',marginLeft:6,fontWeight:600}}>⬇ Download Template</a>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files[0])} style={{fontSize:'0.82rem'}}/>
        <button type="button" onClick={upload} disabled={!file||importing}
          style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:'0.82rem',whiteSpace:'nowrap'}}>
          {importing?'Importing…':'Upload'}
        </button>
        {onClose&&<button type="button" onClick={onClose} style={{background:'#f1f5f9',color:'#64748b',border:'none',padding:'8px 12px',borderRadius:8,cursor:'pointer',fontSize:'0.82rem'}}>✕</button>}
      </div>
      {result&&(
        <div style={{marginTop:8,padding:'8px 12px',background:result.error?'#fee2e2':'#dcfce7',borderRadius:8,fontSize:'0.82rem',color:result.error?'#dc2626':'#16a34a',fontWeight:600}}>
          {result.error||result.message}
          {result.errors?.length>0&&<div style={{fontWeight:400,marginTop:4}}>{result.errors.join(', ')}</div>}
        </div>
      )}
    </div>
  );
}

/* ─── Lab test searchable dropdown with pre-populated common tests ─── */
const COMMON_LABS=[
  'Complete Blood Count (CBC)','Liver Function Test (LFT)','Kidney Function Test (KFT)',
  'Lipid Profile','Blood Glucose - Fasting','Blood Glucose - Post Prandial','HbA1c',
  'Thyroid Profile (TSH, T3, T4)','Urine Routine & Microscopy','Urine Culture & Sensitivity',
  'Blood Culture & Sensitivity','Serum Electrolytes (Na, K, Cl)','Serum Calcium','Serum Uric Acid',
  'C-Reactive Protein (CRP)','Erythrocyte Sedimentation Rate (ESR)','Prothrombin Time (PT/INR)',
  'D-Dimer','Troponin I / T','BNP / NT-proBNP','Serum Ferritin','Serum Iron & TIBC',
  'Vitamin B12','Vitamin D (25-OH)','Folate','Peripheral Blood Smear','Reticulocyte Count',
  'X-Ray Chest PA View','X-Ray Spine (Cervical/Lumbar)','X-Ray Knee','X-Ray Abdomen',
  'Ultrasound Abdomen & Pelvis','Ultrasound Thyroid','Ultrasound Pelvis','2D Echo (Echocardiogram)',
  'ECG (12-lead)','Stress Test (TMT)','CT Scan Head (Plain)','CT Scan Chest','CT Scan Abdomen',
  'MRI Brain','MRI Spine','MRI Knee','DEXA Scan (Bone Density)','Mammography',
  'Pap Smear','Sputum Culture & Sensitivity','Stool Routine & Microscopy','Stool Culture',
  'COVID-19 RT-PCR','Dengue NS1 Antigen','Malaria Antigen (Rapid)','Widal Test',
  'Hepatitis B Surface Antigen (HBsAg)','Anti-HCV','HIV 1 & 2 Antibody','VDRL','RA Factor',
  'ANA (Anti-Nuclear Antibody)','Anti-dsDNA','Serum Creatinine','BUN (Blood Urea Nitrogen)',
  'PSA (Prostate Specific Antigen)','CA-125','CA 19-9','CEA','AFP',
  'Fasting Insulin','HOMA-IR','Serum Cortisol','ACTH','FSH / LH','Testosterone','Prolactin','Estradiol',
];

function LabTestSearch({onAdd}){
  const[q,setQ]=useState('');const[open,setOpen]=useState(false);const wrap=useRef(null);
  const filtered=q.length>0?COMMON_LABS.filter(l=>l.toLowerCase().includes(q.toLowerCase())).slice(0,12):COMMON_LABS.slice(0,12);
  useEffect(()=>{const h=(e)=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const pick=(name)=>{onAdd({test_name:name,instructions:''});setQ('');setOpen(false);};
  const addCustom=()=>{if(!q.trim())return;onAdd({test_name:q.trim(),instructions:''});setQ('');setOpen(false);};
  return(
    <div ref={wrap} style={{position:'relative',flex:1}}>
      <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}
        placeholder="Search or type test name…" className="form-input"/>
      {open&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,zIndex:9999,boxShadow:'0 8px 24px rgba(0,0,0,.12)',maxHeight:220,overflowY:'auto'}}>
          {q.trim()&&!COMMON_LABS.find(l=>l.toLowerCase()===q.toLowerCase())&&(
            <div onClick={addCustom} style={{padding:'9px 14px',cursor:'pointer',fontSize:'0.85rem',borderBottom:'1px solid #f1f5f9',color:'#2563eb',fontWeight:600}}
              onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
              ➕ Add "{q.trim()}" as custom test
            </div>
          )}
          {filtered.map((name,i)=>(
            <div key={i} onClick={()=>pick(name)} style={{padding:'8px 14px',cursor:'pointer',fontSize:'0.84rem',borderBottom:'1px solid #f1f5f9'}}
              onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
              🔬 {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dosage time dropdowns ─── */
const INSTR_OPTIONS=['Before food','After food','With food','Before sleep','On empty stomach','With water','With milk'];
function DoseSelector({label,value,instr,onChange,onInstrChange}){
  return(
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'8px 10px'}}>
      <label style={{fontSize:'0.68rem',color:'#64748b',fontWeight:700,textTransform:'uppercase',display:'block',marginBottom:5}}>{label}</label>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button type="button" onClick={()=>onChange(Math.max(0,value-0.5))} style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
          <span style={{minWidth:28,textAlign:'center',fontWeight:700,fontSize:'0.9rem'}}>{value}</span>
          <button type="button" onClick={()=>onChange(value+0.5)} style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
        </div>
        <select value={instr} onChange={e=>onInstrChange(e.target.value)}
          style={{flex:1,fontSize:'0.76rem',border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 6px',background:'#fff'}}>
          {INSTR_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ─── Medicine Row ─── */
function MedicineRow({med,idx,onChange,onRemove}){
  const schedule=`${med.morning}-${med.afternoon}-${med.evening}`;
  const instrParts=[med.morning>0&&`Morning ${med.morning} tab ${med.morning_instr||''}`,med.afternoon>0&&`Afternoon ${med.afternoon} tab ${med.afternoon_instr||''}`,med.evening>0&&`Evening ${med.evening} tab ${med.evening_instr||''}`].filter(Boolean);
  return(
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <span style={{fontWeight:700,color:'#1e293b',fontSize:'0.92rem'}}>💊 {med.name}</span>
          <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:2}}>Schedule: <b>{schedule}</b> | {instrParts.join(' · ')||'No instructions'}</div>
        </div>
        <button onClick={()=>onRemove(idx)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'1rem',padding:4}}>✕</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
        <DoseSelector label="Morning" value={med.morning||0} instr={med.morning_instr||'Before food'} onChange={v=>onChange(idx,'morning',v)} onInstrChange={v=>onChange(idx,'morning_instr',v)}/>
        <DoseSelector label="Afternoon" value={med.afternoon||0} instr={med.afternoon_instr||'After food'} onChange={v=>onChange(idx,'afternoon',v)} onInstrChange={v=>onChange(idx,'afternoon_instr',v)}/>
        <DoseSelector label="Evening" value={med.evening||0} instr={med.evening_instr||'After food'} onChange={v=>onChange(idx,'evening',v)} onInstrChange={v=>onChange(idx,'evening_instr',v)}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        {[{k:'dosage',l:'Dosage / Strength',p:'e.g. 500mg, 10mg'},{k:'duration',l:'Duration',p:'e.g. 7 days, 2 weeks'},{k:'instructions',l:'Special Instructions',p:'e.g. Avoid alcohol'}].map(({k,l,p})=>(
          <div key={k}>
            <label style={{fontSize:'0.68rem',color:'#64748b',fontWeight:700,textTransform:'uppercase',display:'block',marginBottom:3}}>{l}</label>
            <input className="form-input" value={med[k]||''} placeholder={p} onChange={e=>onChange(idx,k,e.target.value)} style={{fontSize:'0.82rem'}}/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Build schedule string for API ─── */
function buildSchedule(med){
  const parts=[];
  if(med.morning>0)parts.push(`Morning: ${med.morning} tab ${med.morning_instr||'Before food'}`);
  if(med.afternoon>0)parts.push(`Afternoon: ${med.afternoon} tab ${med.afternoon_instr||'After food'}`);
  if(med.evening>0)parts.push(`Evening: ${med.evening} tab ${med.evening_instr||'After food'}`);
  return parts.join(' | ')||'As directed';
}
function parseSavedSchedule(schedStr,med){
  // Try to parse back saved schedule string into morning/afternoon/evening
  const result={morning:0,afternoon:0,evening:0,morning_instr:'Before food',afternoon_instr:'After food',evening_instr:'After food'};
  if(!schedStr)return result;
  const mM=schedStr.match(/Morning:\s*([\d.]+)/);const mA=schedStr.match(/Afternoon:\s*([\d.]+)/);const mE=schedStr.match(/Evening:\s*([\d.]+)/);
  const iM=schedStr.match(/Morning:.*?tab\s+([^|]+)/);const iA=schedStr.match(/Afternoon:.*?tab\s+([^|]+)/);const iE=schedStr.match(/Evening:.*?tab\s+([^|]+)/);
  if(mM)result.morning=parseFloat(mM[1]);if(mA)result.afternoon=parseFloat(mA[1]);if(mE)result.evening=parseFloat(mE[1]);
  if(iM)result.morning_instr=iM[1].trim();if(iA)result.afternoon_instr=iA[1].trim();if(iE)result.evening_instr=iE[1].trim();
  return result;
}

/* ─── PDF Export ─── */
function exportPDF(rx,aiReport,patientName,doctorName){
  const meds=(rx.medicines||[]).map(m=>`<tr><td>${m.name}</td><td>${m.dosage||'—'}</td><td>${m.schedule||'—'}</td><td>${m.duration||'—'}</td><td>${m.instructions||'—'}</td></tr>`).join('');
  const labs=(rx.lab_tests||[]).map(t=>`<li><strong>${t.test_name}</strong>${t.instructions?' — '+t.instructions:''}</li>`).join('');
  const sections=aiReport?(aiReport.sections||[]).sort((a,b)=>(a.section_order||0)-(b.section_order||0)).map(s=>`<div class="section"><div class="sec-title">${s.section_title||''}</div><div class="sec-body">${(s.section_text||'').replace(/\\n/g,'\n').replace(/\n/g,'<br/>')}</div></div>`).join(''):'' ;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:13px}
.header{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;padding:28px 36px}
.header h1{margin:0;font-size:22px}.header p{margin:4px 0 0;opacity:.85;font-size:12px}
.body{padding:28px 36px}.row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px}
.card-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#2563eb;margin-bottom:8px;border-bottom:1px solid #dbeafe;padding-bottom:6px}
.section{margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.sec-title{background:#f8fafc;padding:8px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#2563eb}
.sec-body{padding:10px 14px;line-height:1.7;color:#334155}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b}
td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
.referral{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:20px}
</style></head><body>
<div class="header"><h1>🏥 Medical Prescription — CareMate</h1><p>Generated ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</p></div>
<div class="body">
<div class="row2">
<div class="card"><div class="card-title">Patient</div><strong>${patientName||'—'}</strong></div>
<div class="card"><div class="card-title">Consulting Doctor</div><strong>Dr. ${doctorName||'—'}</strong></div>
</div>
${rx.diagnosis?`<div class="card"><div class="card-title">Diagnosis</div>${rx.diagnosis}</div>`:''}
${rx.doctor_notes?`<div class="card"><div class="card-title">Clinical Observations</div><div style="white-space:pre-wrap">${rx.doctor_notes}</div></div>`:''}
${(rx.medicines||[]).length>0?`<div class="card"><div class="card-title">Prescription</div><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Schedule</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${meds}</tbody></table></div>`:''}
${labs?`<div class="card"><div class="card-title">Investigations</div><ul style="margin:4px 0;padding-left:20px;line-height:2">${labs}</ul></div>`:''}
${rx.referral_to_specialist?`<div class="referral"><strong>⚕️ Referral to ${rx.referral_to_specialist}</strong>${rx.referral_doctor_name?' — Dr. '+rx.referral_doctor_name:''}${rx.referral_notes?'<br><em>'+rx.referral_notes+'</em>':''}</div>`:''}
${sections?`<div style="margin-top:24px"><div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:12px;text-transform:uppercase">AI Pre-Consultation Summary</div>${sections}</div>`:''}
</div></body></html>`;
  const win=window.open('','_blank');if(win){win.document.write(html);win.document.close();setTimeout(()=>win.print(),600);}
}

/* ─── Patient Docs panel ─── */
function PatientDocsPanel({patientId}){
  const[docs,setDocs]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!patientId)return;documentAPI.patientDocsForDoctor(patientId).then(r=>setDocs(r.data||[])).catch(()=>{}).finally(()=>setLoading(false));},[patientId]);
  const icon=(m)=>(!m?'📄':m.includes('pdf')?'📕':m.includes('image')?'🖼️':m.includes('word')?'📘':'📄');
  if(loading)return<div style={{color:'#94a3b8',padding:20,textAlign:'center'}}>Loading patient documents…</div>;
  if(docs.length===0)return(
    <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8',background:'#f8fafc',borderRadius:12,border:'2px dashed #e2e8f0'}}>
      <div style={{fontSize:'2.5rem',marginBottom:8}}>📂</div>
      <div style={{fontWeight:600}}>No documents uploaded by patient yet</div>
      <div style={{fontSize:'0.82rem',marginTop:4}}>Lab reports and test results will appear here once the patient uploads them</div>
    </div>
  );
  return(
    <div style={{display:'grid',gap:10}}>
      {docs.map(doc=>(
        <div key={doc.id} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:'1.8rem'}}>{icon(doc.mime_type)}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,color:'#1e293b',fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.title}</div>
            <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:2}}>{doc.category?.replace(/_/g,' ')} · {doc.file_name}{doc.file_size_bytes?' · '+fmtBytes(doc.file_size_bytes):''}</div>
          </div>
          {/* Use /view/ endpoint which doesn't require auth for inline viewing */}
          <a href={`${BACKEND}/documents/view/${doc.id}`} target="_blank" rel="noreferrer"
            style={{background:'#dbeafe',color:'#1d4ed8',padding:'6px 14px',borderRadius:7,fontSize:'0.78rem',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>
            👁 View
          </a>
        </div>
      ))}
    </div>
  );
}


/* ─── Review Tab Content (doctor reads) ─── */
function ReviewTabContent({bookingId}){
  const[review,setReview]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{
    reviewAPI.getByBooking(bookingId).then(r=>setReview(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  },[bookingId]);
  if(loading)return<div style={{color:'#94a3b8',textAlign:'center',padding:32}}>Loading…</div>;
  if(!review)return(
    <div style={{textAlign:'center',padding:'48px 20px',color:'#94a3b8'}}>
      <div style={{fontSize:'2.5rem',marginBottom:10}}>⭐</div>
      <div style={{fontWeight:600}}>No review yet</div>
      <div style={{fontSize:'0.84rem',marginTop:4}}>The patient hasn't submitted a review for this consultation.</div>
    </div>
  );
  return(
    <div style={{maxWidth:520}}>
      <div style={{background:'linear-gradient(135deg,#fef3c7,#fff7ed)',borderRadius:14,padding:'20px 24px',border:'1px solid #fde68a'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div>
            <div style={{fontWeight:700,color:'#1e293b',fontSize:'0.95rem'}}>Review by {review.patient_name||'Patient'}</div>
            <div style={{fontSize:'0.75rem',color:'#94a3b8',marginTop:2}}>{review.created_at?new Date(review.created_at).toLocaleDateString('en-IN',{dateStyle:'medium'}):''}</div>
          </div>
          <div style={{display:'flex',gap:2}}>
            {[1,2,3,4,5].map(s=><span key={s} style={{fontSize:'1.3rem',color:review.rating>=s?'#f59e0b':'#d1d5db'}}>★</span>)}
          </div>
        </div>
        {review.comment&&<div style={{fontSize:'0.9rem',color:'#374151',lineHeight:1.7,fontStyle:'italic'}}>"{review.comment}"</div>}
      </div>
    </div>
  );
}

/* ─── Consultation Modal ─── */
function ConsultationModal({appointment,onClose,onSaved,readOnly}){
  const[aiReport,setAiReport]=useState(null);const[loading,setLoading]=useState(true);const[activeTab,setActiveTab]=useState('ai');
  const[diagnosis,setDiagnosis]=useState('');const[doctorNotes,setDoctorNotes]=useState('');const[medicines,setMedicines]=useState([]);
  const[labTests,setLabTests]=useState([]);const[referralSpecialist,setReferralSpecialist]=useState('');const[referralDoctor,setReferralDoctor]=useState('');const[referralNotes,setReferralNotes]=useState('');
  const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);const[existingRx,setExistingRx]=useState(null);const[showExport,setShowExport]=useState(false);const[doctorName,setDoctorName]=useState('Doctor');const[showBulkImport,setShowBulkImport]=useState(false);
  // readOnly=false means doctor explicitly clicked Edit — allow editing even if completed
  const isReadOnly = readOnly === true ? true : readOnly === false ? false : (appointment.status==='completed');
  // isEditingCompleted = doctor clicked Edit on a completed appointment — no timer needed
  const isEditingCompleted = readOnly === false && appointment.status === 'completed';
  // consultStartRef holds the original start time — NEVER reset it on Edit
  const consultStartRef=useRef(appointment.consultation_start_ts?new Date(appointment.consultation_start_ts):new Date());
  const[elapsed,setElapsed]=useState(0);
  // Timer only runs for genuinely active (in_progress) consultations — not for Edit mode
  useEffect(()=>{
    if(isReadOnly||isEditingCompleted)return;
    if(appointment.status==='completed')return;
    const t=setInterval(()=>setElapsed(Math.floor((Date.now()-consultStartRef.current)/1000)),1000);
    return()=>clearInterval(t);
  },[isReadOnly,isEditingCompleted]);
  const fmtE=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  useEffect(()=>{loadData();document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  const loadData=async()=>{
    setLoading(true);
    try{
      const[rr,rxr]=await Promise.allSettled([reportAPI.patientReportsForDoctor(appointment.patient_id),prescriptionAPI.getByBooking(appointment.id)]);
      if(rr.status==='fulfilled'){const rep=rr.value.data;const latest=Array.isArray(rep)?rep[0]:rep;if(latest?.report_md)setAiReport(parseReport(latest.report_md));}
      if(rxr.status==='fulfilled'&&rxr.value.data){
        const rx=rxr.value.data;setExistingRx(rx);setDiagnosis(rx.diagnosis||'');setDoctorNotes(rx.doctor_notes||'');
        // Parse medicines — restore morning/afternoon/evening from saved schedule string
        const parsedMeds=(rx.medicines||[]).map(m=>{const doseInfo=parseSavedSchedule(m.schedule,m);return{...m,...doseInfo};});
        setMedicines(parsedMeds);
        setLabTests(rx.lab_tests||[]);setReferralSpecialist(rx.referral_to_specialist||'');setReferralDoctor(rx.referral_doctor_name||'');setReferralNotes(rx.referral_notes||'');
        if(rx.doctor_name)setDoctorName(rx.doctor_name);
      }
    }catch{}
    setLoading(false);
  };

  const addMed=(m)=>setMedicines(p=>[...p,m]);
  const updMed=(i,k,v)=>setMedicines(p=>p.map((m,x)=>x===i?{...m,[k]:v}:m));
  const remMed=(i)=>setMedicines(p=>p.filter((_,x)=>x!==i));
  const updLab=(i,k,v)=>setLabTests(p=>p.map((t,x)=>x===i?{...t,[k]:v}:t));
  const remLab=(i)=>setLabTests(p=>p.filter((_,x)=>x!==i));
  const[pendingTest,setPendingTest]=useState({test_name:'',instructions:''});

  const currentRx={diagnosis,doctor_notes:doctorNotes,medicines:medicines.map(m=>({...m,schedule:buildSchedule(m)})),lab_tests:labTests,referral_to_specialist:referralSpecialist,referral_doctor_name:referralDoctor,referral_notes:referralNotes};

  const doSave=async(markComplete)=>{
    setSaving(true);
    try{
      const medsForApi=medicines.map(m=>({name:m.name,rxcui:m.rxcui||'',dosage:m.dosage||'',schedule:buildSchedule(m),duration:m.duration||'',instructions:m.instructions||''}));
      await prescriptionAPI.upsert({booking_id:appointment.id,diagnosis,doctor_notes:doctorNotes,medicines:medsForApi,lab_tests:labTests,referral_to_specialist:referralSpecialist||null,referral_doctor_name:referralDoctor||null,referral_notes:referralNotes||null});
      if(markComplete){
        if(isEditingCompleted){
          // Edit mode on completed: just keep status=completed, do NOT update timing (preserve original duration)
          await bookingAPI.updateStatus(appointment.id,{status:'completed'}).catch(()=>{});
        } else {
          // First time completing: record actual end time
          const endTime=new Date();
          await bookingAPI.updateStatus(appointment.id,{status:'completed',consultation_start_ts:consultStartRef.current.toISOString(),consultation_end_ts:endTime.toISOString()}).catch(()=>{});
        }
        if(onSaved)onSaved();onClose();
      } else {
        if(!isEditingCompleted){
          // Only update to in_progress if not editing a completed consultation
          await bookingAPI.updateStatus(appointment.id,{status:'in_progress',consultation_start_ts:consultStartRef.current.toISOString()}).catch(()=>{});
        }
        setSaved(true);setTimeout(()=>setSaved(false),2500);if(onSaved)onSaved();
      }
    }catch(e){alert('Error saving: '+(e.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const TABS=[
    {id:'ai',label:'🤖 AI Summary'},
    {id:'notes',label:'📝 Notes & Diagnosis'},
    {id:'rx',label:'💊 Prescription'},
    {id:'labs',label:'🔬 Lab Tests'},
    {id:'referral',label:'↗️ Referral'},
    {id:'docs',label:'📂 Patient Docs'},
    ...(appointment.status==='completed'?[{id:'reviews',label:'⭐ Review'}]:[]),
  ];

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(10,20,40,.82)',backdropFilter:'blur(4px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:'4px'}}>
      <div style={{width:'100vw',maxWidth:1340,maxHeight:'99vh',height:'99vh',background:'#fff',borderRadius:16,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.5)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#1d4ed8,#2563eb,#0ea5e9)',color:'#fff',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{fontSize:'0.67rem',opacity:.8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:3}}>{isReadOnly?'📄 Consultation Record':'🩺 Active Consultation'}</div>
            <h2 style={{margin:'0 0 2px',fontSize:'1.2rem'}}>{appointment.patient_name||'Patient'}</h2>
            <div style={{fontSize:'0.78rem',opacity:.85}}>{fmtDT(appointment.start_ts)} · Slot: {slotDur(appointment)||'?'} min</div>
            {isReadOnly&&appointment.consultation_duration_minutes&&<div style={{fontSize:'0.75rem',opacity:.8,marginTop:2}}>⏱ Consultation: {appointment.consultation_duration_minutes} min</div>}
          </div>
          <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
            {!isReadOnly&&<div style={{background:'rgba(0,0,0,.25)',padding:'5px 12px',borderRadius:20,fontSize:'0.82rem',fontWeight:700,fontFamily:'monospace',display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:7,height:7,background:'#4ade80',borderRadius:'50%',display:'inline-block',boxShadow:'0 0 6px #4ade80'}}/>
              {fmtE(elapsed)}
            </div>}
            {saved&&<span style={{background:'rgba(16,185,129,.2)',color:'#6ee7b7',padding:'5px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:700}}>✓ Saved</span>}
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowExport(v=>!v)} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>⬇ Export PDF</button>
              {showExport&&(
                <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:10,boxShadow:'0 12px 32px rgba(0,0,0,.2)',zIndex:9999,minWidth:200,overflow:'hidden'}}>
                  {[
                    {icon:'🖨️',label:'Print / Save as PDF',fn:()=>{exportPDF(currentRx,aiReport,appointment.patient_name,doctorName);setShowExport(false);}},
                  ].map(({icon,label,fn})=>(
                    <button key={label} onClick={fn}
                      style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 16px',textAlign:'left',background:'#ffffff',border:'none',borderBottom:'1px solid #f1f5f9',cursor:'pointer',fontSize:'0.85rem',color:'#1e293b',fontWeight:500}}
                      onMouseOver={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#1d4ed8';}}
                      onMouseOut={e=>{e.currentTarget.style.background='#ffffff';e.currentTarget.style.color='#1e293b';}}>
                      <span style={{fontSize:'1rem'}}>{icon}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:'1rem'}}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'2px solid #f1f5f9',background:'#fafbff',padding:'0 16px',flexShrink:0,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:'11px 14px',background:'none',border:'none',borderBottom:activeTab===t.id?'2px solid #2563eb':'2px solid transparent',marginBottom:-2,cursor:'pointer',fontSize:'0.82rem',fontWeight:activeTab===t.id?700:500,color:activeTab===t.id?'#2563eb':'#64748b',whiteSpace:'nowrap'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 28px'}}>
          {loading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:180,color:'#94a3b8'}}><div className="spinner" style={{marginRight:10}}/>Loading patient data…</div>:(
            <>
              {/* AI Summary — show only report_summary + Medications & Allergies */}
              {activeTab==='ai'&&(
                <div>
                  {aiReport?(<>
                    {/* Report title banner */}
                    <div style={{background:'linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#0ea5e9 100%)',borderRadius:14,padding:'18px 22px',marginBottom:20,display:'flex',gap:14,alignItems:'flex-start'}}>
                      <span style={{fontSize:'1.8rem',flexShrink:0}}>🤖</span>
                      <div>
                        <div style={{fontWeight:800,color:'#fff',fontSize:'1.05rem',letterSpacing:'-0.01em'}}>{aiReport.report_title||'AI Pre-Consultation Report'}</div>
                        <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.75)',marginTop:2,fontWeight:500,textTransform:'uppercase',letterSpacing:'.05em'}}>Pre-Consultation AI Summary</div>
                      </div>
                    </div>

                    {/* Summary card */}
                    {aiReport.report_summary&&(
                      <div className="report-section" style={{marginBottom:16}}>
                        <h3 className="report-section-title">
                          <span className="report-section-icon">📋</span>Patient Summary
                        </h3>
                        <div className="report-section-content">
                          <div className="report-text-line">
                            <span className="report-plain-text" style={{lineHeight:1.8,fontSize:'0.92rem'}}>{aiReport.report_summary}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Medications & Allergies section only */}
                    {(()=>{
                      const medSection=(aiReport.sections||[]).find(s=>s.section_title?.toLowerCase().includes('medic')||s.section_title?.toLowerCase().includes('allerg'));
                      if(!medSection)return null;
                      return(
                        <div className="report-section">
                          <h3 className="report-section-title">
                            <span className="report-section-icon">💊</span>{medSection.section_title}
                          </h3>
                          <div className="report-section-content">{renderSectionContent(medSection.section_text)}</div>
                        </div>
                      );
                    })()}
                  </>):(
                    <div style={{textAlign:'center',padding:'48px 20px',color:'#94a3b8'}}>
                      <div style={{fontSize:'3rem',marginBottom:10}}>🤖</div>
                      <div style={{fontWeight:600}}>No AI Report Available</div>
                      <div style={{fontSize:'0.84rem'}}>Patient hasn't completed an AI consultation yet.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {activeTab==='notes'&&(
                <div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:6,fontSize:'0.9rem'}}>🏥 Diagnosis</label>
                    <input className="form-input" value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} placeholder="Enter primary diagnosis…" disabled={isReadOnly}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:6,fontSize:'0.9rem'}}>📝 Clinical Observations & Notes</label>
                    <textarea value={doctorNotes} onChange={e=>setDoctorNotes(e.target.value)} disabled={isReadOnly}
                      placeholder="Enter clinical observations, examination findings, notes that may differ from AI assessment…" rows={9}
                      style={{width:'100%',padding:'10px 14px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'0.9rem',resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box',background:isReadOnly?'#f8fafc':'#fff'}}
                      onFocus={e=>{if(!isReadOnly)e.target.style.borderColor='#2563eb';}} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  </div>
                </div>
              )}

              {/* Prescription */}
              {activeTab==='rx'&&(
                <div>
                  {!isReadOnly&&<div style={{marginBottom:16}}>
                    <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:8,fontSize:'0.9rem'}}>🔍 Search & Add Medicine</label>
                    <MedicineSearch onAdd={addMed}/>
                    {showBulkImport&&<DrugBulkImport onClose={()=>setShowBulkImport(false)}/>}
                    {!showBulkImport&&<button type="button" onClick={()=>setShowBulkImport(true)} style={{marginTop:8,fontSize:'0.75rem',color:'#6366f1',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',padding:0}}>📦 Bulk import drugs from Excel/CSV</button>}
                  </div>}
                  {medicines.length===0?<div style={{textAlign:'center',padding:'32px 20px',color:'#94a3b8',background:'#f8fafc',borderRadius:12,border:'2px dashed #e2e8f0'}}>💊 No medicines added yet{!isReadOnly&&'. Search above to add.'}.</div>
                    :medicines.map((m,i)=><MedicineRow key={i} med={m} idx={i} onChange={isReadOnly?(()=>{}):(updMed)} onRemove={isReadOnly?(()=>{}):(remMed)}/>)}
                </div>
              )}

              {/* Lab Tests */}
              {activeTab==='labs'&&(
                <div>
                  {!isReadOnly&&<div style={{marginBottom:16}}>
                    <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:8,fontSize:'0.9rem'}}>🔬 Search & Add Lab Test</label>
                    <div style={{display:'flex',gap:8,marginBottom:8}}>
                      <LabTestSearch onAdd={(t)=>setLabTests(p=>[...p,t])}/>
                    </div>
                  </div>}
                  {labTests.length===0?<div style={{textAlign:'center',padding:'32px 20px',color:'#94a3b8',background:'#f8fafc',borderRadius:12,border:'2px dashed #e2e8f0'}}>No tests requested.</div>
                    :labTests.map((t,i)=>(
                      <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,marginBottom:10,alignItems:'end',background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
                        <div><label style={{fontSize:'0.71rem',color:'#64748b',fontWeight:600,textTransform:'uppercase',display:'block',marginBottom:3}}>Test Name</label>
                          <input className="form-input" value={t.test_name} onChange={e=>updLab(i,'test_name',e.target.value)} disabled={isReadOnly}/></div>
                        <div><label style={{fontSize:'0.71rem',color:'#64748b',fontWeight:600,textTransform:'uppercase',display:'block',marginBottom:3}}>Instructions</label>
                          <input className="form-input" value={t.instructions||''} onChange={e=>updLab(i,'instructions',e.target.value)} placeholder="e.g. Fasting required" disabled={isReadOnly}/></div>
                        {!isReadOnly&&<button onClick={()=>remLab(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'1.1rem',padding:'8px'}}>✕</button>}
                      </div>
                    ))}
                  {labTests.length>0&&<div style={{marginTop:12,padding:'10px 14px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,fontSize:'0.82rem',color:'#92400e'}}>💡 Patient can upload test results via the <strong>My Documents</strong> section. You can view them in the <strong>Patient Docs</strong> tab.</div>}
                </div>
              )}

              {/* Referral */}
              {activeTab==='referral'&&(
                <div>
                  <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'12px 16px',marginBottom:18,fontSize:'0.83rem',color:'#92400e'}}>ℹ️ Refer the patient to a specialist or another doctor for further evaluation.</div>
                  {[{label:'Specialist Type',value:referralSpecialist,set:setReferralSpecialist,ph:'e.g. Cardiologist, Oncologist, Neurologist'},{label:'Referred Doctor Name (optional)',value:referralDoctor,set:setReferralDoctor,ph:'e.g. Dr. Sharma'}].map(({label,value,set,ph})=>(
                    <div key={label} style={{marginBottom:14}}>
                      <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:5,fontSize:'0.88rem'}}>{label}</label>
                      <input className="form-input" value={value} onChange={e=>set(e.target.value)} placeholder={ph} disabled={isReadOnly}/>
                    </div>
                  ))}
                  <div><label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:5,fontSize:'0.88rem'}}>Referral Notes</label>
                    <textarea value={referralNotes} onChange={e=>setReferralNotes(e.target.value)} disabled={isReadOnly} rows={5}
                      placeholder="Reason for referral, relevant history, specific evaluation needed…"
                      style={{width:'100%',padding:'10px 14px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'0.9rem',resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:isReadOnly?'#f8fafc':'#fff'}}
                      onFocus={e=>{if(!isReadOnly)e.target.style.borderColor='#2563eb';}} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  </div>
                </div>
              )}

              {/* Reviews (doctor reads patient review of this consultation) */}
              {activeTab==='reviews'&&(
                <div>
                  <ReviewTabContent bookingId={appointment.id}/>
                </div>
              )}

              {/* Patient Docs */}
              {activeTab==='docs'&&(
                <div>
                  <div style={{marginBottom:14,fontSize:'0.88rem',color:'#64748b'}}>Documents and lab results uploaded by the patient are shown below.</div>
                  <PatientDocsPanel patientId={appointment.patient_id}/>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'12px 24px',borderTop:'1px solid #f1f5f9',background:'#fafbff',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>
            {isReadOnly?'📄 Read-only — click Edit to modify':existingRx?'✅ Prescription on file — saving will update':'⚡ New consultation'}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} className="btn btn-secondary" style={{fontSize:'0.82rem'}}>Close</button>
            {!isReadOnly&&<>
              <button onClick={()=>doSave(false)} disabled={saving} className="btn btn-primary" style={{fontSize:'0.82rem'}}>{saving?'Saving…':'💾 Save'}</button>
              <button onClick={()=>!saving&&window.confirm('Mark this consultation as completed? This will lock it.')&&doSave(true)} disabled={saving}
                style={{background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:'0.82rem',opacity:saving?.6:1}}>
                ✅ Complete
              </button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── Star Rating ─── */
function StarRating({value,onChange,readOnly=false}){
  const[hover,setHover]=useState(0);
  return(
    <div style={{display:'flex',gap:4}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} onClick={()=>!readOnly&&onChange(s)}
          onMouseOver={()=>!readOnly&&setHover(s)} onMouseOut={()=>!readOnly&&setHover(0)}
          style={{fontSize:'1.5rem',cursor:readOnly?'default':'pointer',color:(hover||value)>=s?'#f59e0b':'#d1d5db',transition:'color .1s'}}>
          ★
        </span>
      ))}
    </div>
  );
}

/* ─── Review Modal ─── */
function ReviewModal({appointment,onClose,onSaved}){
  const[rating,setRating]=useState(0);
  const[comment,setComment]=useState('');
  const[saving,setSaving]=useState(false);
  const[existing,setExisting]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    reviewAPI.getByBooking(appointment.id).then(r=>{
      if(r.data){setExisting(r.data);setRating(r.data.rating);setComment(r.data.comment||'');}
    }).catch(()=>{}).finally(()=>setLoading(false));
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow='';};
  },[]);

  const doSubmit=async()=>{
    if(!rating){alert('Please select a rating');return;}
    setSaving(true);
    try{
      await reviewAPI.create({booking_id:appointment.id,rating,comment});
      if(onSaved)onSaved();
      onClose();
    }catch(e){alert('Error: '+(e.response?.data?.detail||e.message));}
    setSaving(false);
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(10,20,40,.76)',backdropFilter:'blur(4px)',zIndex:9100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{width:'100%',maxWidth:480,background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
        <div style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:'1.05rem'}}>⭐ Rate Your Consultation</div>
            <div style={{fontSize:'0.78rem',opacity:.8,marginTop:2}}>with {appointment.patient_name||appointment.doctor_name||'Doctor'}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:'1rem'}}>✕</button>
        </div>
        <div style={{padding:'24px'}}>
          {loading?<div style={{textAlign:'center',color:'#94a3b8'}}>Loading…</div>:(
            <>
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:10,fontSize:'0.9rem'}}>Your Rating</label>
                <StarRating value={rating} onChange={setRating}/>
                <div style={{marginTop:6,fontSize:'0.78rem',color:'#94a3b8'}}>{['','Poor','Fair','Good','Very Good','Excellent'][rating]||'Tap a star'}</div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontWeight:700,color:'#1e293b',marginBottom:6,fontSize:'0.9rem'}}>Comments (optional)</label>
                <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={4}
                  placeholder="Share your experience — the doctor will see this…"
                  style={{width:'100%',padding:'10px 14px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'0.88rem',resize:'none',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
              </div>
              {existing&&<div style={{marginBottom:12,padding:'8px 12px',background:'#fef3c7',borderRadius:8,fontSize:'0.8rem',color:'#92400e'}}>You already reviewed this — submitting will update your review.</div>}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={onClose} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:'0.85rem',fontWeight:600,color:'#64748b'}}>Cancel</button>
                <button onClick={doSubmit} disabled={saving||!rating}
                  style={{padding:'8px 20px',borderRadius:8,border:'none',background:rating?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#e2e8f0',color:rating?'#fff':'#94a3b8',cursor:rating&&!saving?'pointer':'not-allowed',fontWeight:700,fontSize:'0.85rem'}}>
                  {saving?'Submitting…':existing?'Update Review':'Submit Review'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Patient appointment row — friendly report viewer ─── */
function PatientReportViewer({reports,onClose}){
  // reports: array of {report_id, doctor_id, created_at, report_md}
  // For backward-compat also accept a single report object
  const arr=Array.isArray(reports)?reports:(reports?[reports]:[]);
  const[idx,setIdx]=React.useState(0);
  const report=arr[idx]||null;
  if(!report)return null;
  const parsed=parseReport(report.report_md);
  const sections=(parsed?.sections||[]).sort((a,b)=>(a.section_order||0)-(b.section_order||0));
  const summaryInSections=sections.some(s=>s.section_title?.toLowerCase().includes('summary'));
  const total=arr.length;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(10,20,40,.76)',backdropFilter:'blur(6px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
      <div style={{width:'98vw',maxWidth:860,maxHeight:'96vh',background:'#fff',borderRadius:20,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.4)'}}>
        <div style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <h2 style={{margin:0,fontSize:'1.1rem'}}>{parsed?.report_title||'AI Consultation Report'}</h2>
            <div style={{fontSize:'0.78rem',opacity:.8,marginTop:3}}>
              {fmtDate(report.created_at)}
              {total>1&&<span style={{marginLeft:10,background:'rgba(255,255,255,.2)',padding:'2px 8px',borderRadius:10}}>Report {idx+1} of {total}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',width:34,height:34,borderRadius:8,cursor:'pointer',fontSize:'1rem'}}>✕</button>
        </div>
        {total>1&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 24px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',flexShrink:0}}>
            <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}
              style={{background:idx===0?'#e2e8f0':'#4f46e5',color:idx===0?'#94a3b8':'#fff',border:'none',padding:'5px 14px',borderRadius:6,cursor:idx===0?'default':'pointer',fontWeight:600,fontSize:'0.8rem'}}>
              ← Newer
            </button>
            <div style={{display:'flex',gap:6}}>
              {arr.map((_,i)=>(
                <button key={i} onClick={()=>setIdx(i)}
                  style={{width:28,height:28,borderRadius:'50%',border:'none',
                    background:i===idx?'#4f46e5':'#e2e8f0',
                    color:i===idx?'#fff':'#64748b',
                    cursor:'pointer',fontSize:'0.72rem',fontWeight:700}}>
                  {i+1}
                </button>
              ))}
            </div>
            <button onClick={()=>setIdx(i=>Math.min(total-1,i+1))} disabled={idx===total-1}
              style={{background:idx===total-1?'#e2e8f0':'#4f46e5',color:idx===total-1?'#94a3b8':'#fff',border:'none',padding:'5px 14px',borderRadius:6,cursor:idx===total-1?'default':'pointer',fontWeight:600,fontSize:'0.8rem'}}>
              Older →
            </button>
          </div>
        )}
        <div style={{flex:1,overflowY:'auto',padding:'20px 28px'}}>
          {parsed?.report_summary&&!summaryInSections&&(
            <div className="report-section">
              <h3 className="report-section-title"><span className="report-section-icon">📝</span>Summary</h3>
              <div className="report-section-content"><div className="report-text-line"><span className="report-plain-text">{parsed.report_summary}</span></div></div>
            </div>
          )}
          {sections.map((s,i)=>(
            <div key={i} className="report-section">
              <h3 className="report-section-title"><span className="report-section-icon">{getSectionIcon(s.section_title)}</span>{s.section_title}</h3>
              <div className="report-section-content">{renderSectionContent(s.section_text)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Appointments(){
  const{user}=useAuth();const isDoctor=user?.role==='doctor';
  const navigate=useNavigate();
  const[appointments,setAppointments]=useState([]);const[loading,setLoading]=useState(true);
  const[consultationAppt,setConsultationAppt]=useState(null);const[consultReadOnly,setConsultReadOnly]=useState(false);
  const[viewingReport,setViewingReport]=useState(null);
  const[reviewAppt,setReviewAppt]=useState(null);
  // Doctor: track which patients have AI reports: {patient_id: bool}
  const[patientHasAiReport,setPatientHasAiReport]=useState({});

  useEffect(()=>{loadAppointments();},[]);
  const loadAppointments=async()=>{
    setLoading(true);
    try{
      const res=isDoctor?await bookingAPI.doctorAppointments():await bookingAPI.patientAppointments();
      const appts=Array.isArray(res.data)?res.data:[res.data].filter(Boolean);
      setAppointments(appts);
      // For doctor: check AI report availability per unique patient
      if(isDoctor){
        const uniquePatients=[...new Set(appts.filter(a=>a.status==='booked'||a.status==='in_progress').map(a=>a.patient_id))];
        const checks={};
        await Promise.all(uniquePatients.map(async pid=>{
          try{
            const r=await reportAPI.patientReportsForDoctor(pid);
            checks[pid]=(Array.isArray(r.data)?r.data.length>0:Object.keys(r.data||{}).length>0);
          }catch{checks[pid]=false;}
        }));
        setPatientHasAiReport(checks);
      }
    }catch{}
    setLoading(false);
  };

  const openConsult=(a,readOnly=false)=>{setConsultationAppt(a);setConsultReadOnly(readOnly);};

  // Patient: load AI reports — API now returns array of {report_id, doctor_id, created_at, report_md}
  // reportsKeyedByDoctor[doctor_id] = [ ...reports sorted newest-first ]
  const[patientReports,setPatientReports]=useState([]);
  const[reportsKeyedByDoctor,setReportsKeyedByDoctor]=useState({});
  const loadPatientReports=useCallback(()=>{
    if(isDoctor)return;
    reportAPI.patientReport().then(r=>{
      const data=r.data;
      // Empty or null data = no reports yet (normal for new patients)
      if(!data||(Array.isArray(data)&&data.length===0)){setPatientReports([]);setReportsKeyedByDoctor({});return;}
      let arr=[];
      if(Array.isArray(data)){
        arr=data;
      } else if(typeof data==='object'){
        // Legacy fallback: {doctor_id: report_md} dict
        arr=Object.entries(data).map(([docId,md])=>({
          report_md: md,
          doctor_id: String(docId),
          created_at: new Date().toISOString()
        }));
      }
      setPatientReports(arr);
      // Build lookup keyed by booking_id (preferred) and doctor_id (fallback for old reports without booking_id)
      const byDoc={};
      arr.forEach(rep=>{
        // Primary key: booking_id — one report per booking
        if(rep.booking_id){
          const bk=String(rep.booking_id);
          if(!byDoc[bk]) byDoc[bk]=[];
          byDoc[bk].push(rep);
        }
        // Also index by doctor_id for legacy reports that have no booking_id
        if(rep.doctor_id&&!rep.booking_id){
          const dk=String(rep.doctor_id);
          if(!byDoc[dk]) byDoc[dk]=[];
          byDoc[dk].push(rep);
        }
      });
      setReportsKeyedByDoctor(byDoc);
    }).catch(()=>{
      // 403 = not a patient / no profile yet — safe to ignore
      setPatientReports([]);
      setReportsKeyedByDoctor({});
    });
  },[isDoctor]);

  useEffect(()=>{ loadPatientReports(); },[loadPatientReports]);

  if(loading)return<div className="loading-page"><div className="spinner"/></div>;

  return(
    <div>
      <div className="page-header">
        <h1>{isDoctor?'Patient Appointments':'My Appointments'}</h1>
        <p>{isDoctor?'Manage appointments and start consultations':'Track your upcoming and past visits'}</p>
      </div>

      {appointments.length===0?(
        <div className="card" style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
          <div style={{fontSize:'3rem',marginBottom:12}}>📅</div>
          <h3 style={{margin:'0 0 6px'}}>No appointments yet</h3>
          <p style={{margin:0}}>{isDoctor?'Patients will appear here once they book':'Find a doctor to book your first appointment'}</p>
        </div>
      ):(
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Slot</th>
                  {isDoctor&&<th>Patient</th>}
                  {isDoctor&&<th>Consult Duration</th>}
                  <th>Status</th>
                  <th style={{minWidth:200}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a=>{
                  const slot=slotDur(a);const dur=a.consultation_duration_minutes;
                  return(
                    <tr key={a.id}>
                      <td style={{fontWeight:500}}>{fmtDT(a.start_ts)}</td>
                      <td>{slot?<span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 10px',borderRadius:20,fontSize:'0.76rem',fontWeight:700}}>{slot} min</span>:'—'}</td>
                      {isDoctor&&<td style={{fontWeight:600,color:'#1e293b'}}>{a.patient_name||`Patient ${a.patient_id?.slice(0,8)||''}…`}</td>}
                      {isDoctor&&<td>{dur?<span style={{background:'#ede9fe',color:'#6d28d9',padding:'2px 10px',borderRadius:20,fontSize:'0.76rem',fontWeight:700}}>⏱ {dur} min</span>:<span style={{color:'#cbd5e1',fontSize:'0.78rem'}}>Not started</span>}</td>}
                      <td><StatusBadge status={a.status}/></td>
                      <td>
                        {isDoctor?(
                          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                            {(a.status==='booked'||a.status==='in_progress')&&(()=>{
                              const hasReport=a.status==='in_progress'||patientHasAiReport[a.patient_id]===true;
                              const pendingCheck=a.status==='booked'&&patientHasAiReport[a.patient_id]===undefined;
                              return(
                                <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
                                  <button
                                    onClick={()=>hasReport&&openConsult(a,false)}
                                    disabled={!hasReport||pendingCheck}
                                    title={!hasReport&&!pendingCheck?'Patient must complete AI pre-consultation first':undefined}
                                    style={{
                                      background:hasReport?'linear-gradient(135deg,#1d4ed8,#2563eb)':'#e2e8f0',
                                      color:hasReport?'#fff':'#94a3b8',border:'none',padding:'6px 12px',borderRadius:7,
                                      cursor:hasReport?'pointer':'not-allowed',fontSize:'0.78rem',fontWeight:700,
                                    }}>
                                    {pendingCheck?'⏳ Checking…':a.status==='in_progress'?'▶ Continue':'🩺 Start'}
                                  </button>
                                  {!hasReport&&!pendingCheck&&(
                                    <span style={{fontSize:'0.65rem',color:'#f59e0b',fontWeight:600}}>⚠ Awaiting AI chat</span>
                                  )}
                                </div>
                              );
                            })()}
                            {a.status==='completed'&&<>
                              <button onClick={()=>openConsult(a,true)} style={{background:'#f1f5f9',color:'#334155',border:'1px solid #e2e8f0',padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                                👁 View
                              </button>
                              <button onClick={()=>openConsult(a,false)} style={{background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',border:'none',padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:700}}>
                                ✏️ Edit
                              </button>
                            </>}
                          </div>
                        ):(
                          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                            {(()=>{
                              const docKey  = String(a.doctor_id||'');
                              const bkKey = String(a.id||'');
                              const reportKey = (bkKey && reportsKeyedByDoctor[bkKey]) ? bkKey : docKey;
                              const hasReport = Array.isArray(reportsKeyedByDoctor[reportKey]) && reportsKeyedByDoctor[reportKey].length>0;
                              // Normalize status — handle both "booked" and "BOOKED"
                              const apptStatus = (a.status||'').toLowerCase();
                              return(<>
                                {apptStatus==='booked'&&(
                                  <button onClick={()=>navigate('/chat',{state:{doctor_id:a.doctor_id,booking_id:a.id}})}
                                    style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',border:'none',
                                      padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:'0.82rem',fontWeight:700,
                                      display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
                                    🤖 Start AI Pre Consultation
                                  </button>
                                )}
                                {apptStatus!=='booked'&&hasReport&&(
                                  <button onClick={()=>setViewingReport(reportsKeyedByDoctor[reportKey])}
                                    style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',
                                      padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                                    📋 AI Report
                                  </button>
                                )}
                                {(apptStatus==='completed'||apptStatus==='in_progress')&&(
                                  <a href="/my-prescriptions" style={{background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',
                                    padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600,
                                    textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4}}>
                                    💊 Prescriptions
                                  </a>
                                )}
                                {apptStatus==='completed'&&(
                                  <button onClick={()=>setReviewAppt(a)}
                                    style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',border:'none',
                                      padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                                    ⭐ Review
                                  </button>
                                )}
                              </>);
                            })()}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {consultationAppt&&<ConsultationModal appointment={consultationAppt} onClose={()=>setConsultationAppt(null)} onSaved={loadAppointments} readOnly={consultReadOnly}/>}
      {viewingReport&&<PatientReportViewer reports={viewingReport} onClose={()=>setViewingReport(null)}/>}
      {reviewAppt&&<ReviewModal appointment={reviewAppt} onClose={()=>setReviewAppt(null)} onSaved={loadAppointments}/>}
    </div>
  );
}