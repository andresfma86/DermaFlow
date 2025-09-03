// DermaFlow Gemini-like MVP — client-only demo with preloaded patient flows
const demoKey = 'dermaflow_gemini_v1';

const seed = {
  doctors: [{id:'doc_1', name:'Dra. Helena Costa'}],
  patients: [{id:'pat_1', name:'Ana Paula'}],
  prescriptions: [{
    id:'presc_1',
    patient_id:'pat_1',
    doctor_id:'doc_1',
    title:'Fórmula Facial Anti-Acne',
    items:[
      {name:'Fórmula Facial Anti-Acne', type:'Manipulado', note:'Aplicar uma fina camada no rosto à noite, antes de dormir.'},
      {name:'Minoxidil 5% + Ativos', type:'Manipulado', note:'Aplicar 20 gotas no couro cabeludo, 2 vezes ao dia.'}
    ],
    status:'waiting'
  }],
  quotes: [
    {id:'q1', prescription_id:'presc_1', pharmacy:'Farmácia A', price:112.5, eta:'2 dias úteis', accepted:false},
    {id:'q2', prescription_id:'presc_1', pharmacy:'Farmácia B', price:105.0, eta:'3 dias úteis', accepted:false}
  ],
  schedules: [
    // empty initially
  ],
  exams: [
    {id:'e1', prescription_id:'presc_1', name:'Hemograma Completo', prep:'Jejum absoluto de 8 horas. A ingestão de água é permitida.', suggested_at:'2025-09-15T08:00:00-03:00', lab:'Laboratório Vida'}
  ]
};

function load(){
  const raw = localStorage.getItem(demoKey);
  if(!raw){ localStorage.setItem(demoKey, JSON.stringify(seed)); return JSON.parse(JSON.stringify(seed)); }
  try{ return JSON.parse(raw); } catch(e){ localStorage.setItem(demoKey, JSON.stringify(seed)); return JSON.parse(JSON.stringify(seed)); }
}
function save(db){ localStorage.setItem(demoKey, JSON.stringify(db)); }
let db = load();

// UI refs
const roleSel = document.getElementById('roleSelect');
const userSel = document.getElementById('userSelect');
const resetBtn = document.getElementById('resetBtn');
const patientMain = document.getElementById('patientMain');
const doctorMain = document.getElementById('doctorMain');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

resetBtn.addEventListener('click', ()=>{ if(confirm('Resetar demo para estado inicial?')){ localStorage.removeItem(demoKey); db = load(); render(); } });

roleSel.addEventListener('change', render);
userSel.addEventListener('change', render);
modalClose.addEventListener('click', ()=> modal.close());

function initUserSelect(){
  userSel.innerHTML='';
  if(roleSel.value === 'patient'){
    db.patients.forEach(p=> userSel.appendChild(opt(p.id,p.name)));
  } else {
    db.doctors.forEach(d=> userSel.appendChild(opt(d.id,d.name)));
  }
}

function opt(val, text){ const o = document.createElement('option'); o.value=val; o.textContent=text; return o; }

function render(){
  initUserSelect();
  if(roleSel.value === 'patient') showPatient();
  else showDoctor();
}

function showPatient(){
  patientMain.style.display='block';
  doctorMain.style.display='none';
  const patientId = userSel.value || db.patients[0].id;
  const patient = db.patients.find(p=>p.id===patientId);
  document.getElementById('greeting').textContent = `Olá, ${patient.name}!`;

  // render prescription card
  const presc = db.prescriptions.find(x=>x.patient_id===patientId);
  const rxList = document.querySelector('.rx-list'); rxList.innerHTML='';
  presc.items.forEach(it=>{
    const div = document.createElement('div'); div.className='rx-item';
    div.innerHTML = `<h4>${it.name}</h4><div class="type">${it.type}</div><p>${it.note}</p>`;
    rxList.appendChild(div);
  });

  // quotes
  const quotesEl = document.getElementById('quotes'); quotesEl.innerHTML='';
  const quotes = db.quotes.filter(q=>q.prescription_id===presc.id);
  quotes.forEach(q=>{
    const el = document.createElement('div'); el.className='quote';
    el.innerHTML = `<div>
        <div style="font-weight:700">${q.pharmacy}</div>
        <div class="meta">R$ ${q.price.toFixed(2)}</div>
        <div class="meta">${q.eta}</div>
      </div>
      <div><button class="btn-choose" data-q="${q.id}">${q.accepted ? 'Selecionado' : 'Escolher'}</button></div>`;
    quotesEl.appendChild(el);
  });
  // attach choose handlers
  document.querySelectorAll('.btn-choose').forEach(b=> b.addEventListener('click', ()=>{
    const qid = b.dataset.q;
    acceptQuote(qid);
    render();
  }));

  // exam card
  const exam = db.exams.find(e=>e.prescription_id===presc.id);
  const examCard = document.getElementById('examCard');
  examCard.innerHTML = `
    <div class="suggest"><strong>Horário Sugerido:</strong><div style="font-size:18px;margin-top:6px">${formatDate(exam.suggested_at)}</div><div class="muted" style="margin-top:6px">Local: ${exam.lab}</div></div>
    <div class="prep"><strong>⚠️ Instruções de Preparo:</strong><div style="margin-top:8px">${exam.prep}</div></div>
    <button class="confirm-btn" id="confirmExamBtn">Confirmar Agendamento</button>
  `;
  document.getElementById('confirmExamBtn').addEventListener('click', ()=>{
    scheduleExam(exam.id);
    render();
    alert('Agendamento confirmado! Você receberá lembretes automaticamente (simulado).');
  });
}

function acceptQuote(qid){
  db.quotes.forEach(q=>{ if(q.id===qid) q.accepted = true; else if(q.prescription_id === db.quotes.find(x=>x.id===qid).prescription_id) q.accepted = false; });
  save(db);
}

function scheduleExam(examId){
  const ex = db.exams.find(e=>e.id===examId);
  db.schedules.push({id:'s_'+Date.now(), exam_id:examId, scheduled_at:ex.suggested_at, lab:ex.lab, status:'confirmed'});
  // change prescription status
  const presc = db.prescriptions.find(p=>p.id===ex.prescription_id);
  presc.status = 'scheduled';
  save(db);
}

// Doctor view
function showDoctor(){
  patientMain.style.display='none';
  doctorMain.style.display='block';
  const patientsList = document.getElementById('patientsList'); patientsList.innerHTML='';
  db.patients.forEach(p=>{
    const prescs = db.prescriptions.filter(x=>x.patient_id===p.id);
    const div = document.createElement('div'); div.className='item';
    div.innerHTML = `<div><strong>${p.name}</strong><div class="muted">Prescrições: ${prescs.length}</div></div><div class="row"><button onclick="viewPatient('${p.id}')">Ver</button></div>`;
    patientsList.appendChild(div);
  });
}

function viewPatient(pid){
  const prescs = db.prescriptions.filter(x=>x.patient_id===pid);
  let html = `<h3>${db.patients.find(p=>p.id===pid).name}</h3>`;
  prescs.forEach(pr=> html += `<div class="card" style="margin-top:10px"><strong>${pr.title}</strong><div class="muted">Status: ${pr.status}</div></div>`);
  openModal(html);
}

// modal helpers
function openModal(html){
  modalBody.innerHTML = html;
  modal.showModal();
}

function formatDate(d){
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'}) + ', às ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

// init
(function(){
  // default role patient
  roleSel.value = 'patient';
  initUserSelect();
  render();
})();