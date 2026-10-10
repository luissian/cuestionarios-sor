'use strict';
const $ = id => document.getElementById(id);
const screens = ['modes','play','results'];
let bank=[], questions=[], responses=[], index=0, chosen=null, mode='study', checked=false, lastWrong=[];
const modeButtons = document.querySelectorAll('[data-mode]');
const show = name => screens.forEach(id => $(id).classList.toggle('hidden',id!==name));
const shuffle = array => {let a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const isText = v => typeof v==='string' && v.trim()!=='';

// Los botones de modo quedan desactivados hasta que las preguntas se cargan.
modeButtons.forEach(b=>b.disabled=true);

function start(newMode, subset=null) {
  const source = subset || bank;
  if(!source.length) return; // evita el fallo si aún no hay preguntas
  mode=newMode; questions=shuffle(source); responses=[]; index=0; show('play'); render();
}
function setProgress(percent){
  $('bar').style.width=`${percent}%`;$('progress').setAttribute('aria-valuenow',percent);
}
function render(){
  const q=questions[index];chosen=null;checked=false;
  $('mode-label').textContent=mode==='study'?'◎ MODO ESTUDIO':'◈ MODO EXAMEN';
  const hint=$('mode-hint');
  if(hint){
    hint.textContent=mode==='study'
      ? '◎ Estás aprendiendo: al comprobar cada respuesta verás una explicación y qué capítulo repasar.'
      : '◈ Estás en una autoevaluación: no conocerás las soluciones hasta terminar el cuestionario.';
    hint.className='mode-hint '+(mode==='study'?'hint-study':'hint-exam');
  }
  $('counter').textContent=`${index+1} / ${questions.length}`;
  setProgress(Math.round(100*index/questions.length));
  $('topic').textContent=`CAPÍTULO ${q.chapter} · ${q.topic}`;
  $('question').textContent=q.question;
  $('feedback').className='feedback hidden';$('feedback').replaceChildren();
  $('options').replaceChildren();
  // El orden de las opciones cambia, pero cada opción conserva su índice original.
  shuffle(q.options.map((value,original)=>({value,original}))).forEach((item,position)=>{
    const b=document.createElement('button');b.type='button';b.className='answer';
    const letter=document.createElement('span');letter.className='letter';letter.textContent='ABCD'[position];
    const txt=document.createElement('span');txt.textContent=item.value;b.append(letter,txt);
    b.dataset.original=String(item.original);
    b.addEventListener('click',()=>select(item.original,b));
    $('options').append(b);
  });
  $('next').disabled=true;
  $('next').textContent=mode==='study'?'Comprobar y aprender':index===questions.length-1?'Finalizar examen':'Guardar y continuar →';
}
function select(original,button){
  if(checked)return;
  chosen=original;
  $('options').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));
  $('next').disabled=false;
}
function advance(){
  const q=questions[index];
  if(chosen===null)return;
  if(mode==='study'&&!checked){
    checked=true;responses.push({q,selected:chosen});
    const good=chosen===q.correct;
    $('options').querySelectorAll('button').forEach(b=>{
      const i=Number(b.dataset.original);b.disabled=true;
      b.classList.remove('selected');
      if(i===q.correct)b.classList.add('correct');
      else if(i===chosen)b.classList.add('wrong');
    });
    $('feedback').className='feedback'+(good?'':' bad');
    const strong=document.createElement('strong');strong.textContent=good?'✓ ¡Correcto!':'Todavía puedes afianzar este concepto.';
    const detail=document.createElement('div');detail.textContent=(good?'':'Respuesta correcta: '+q.options[q.correct]+'. ')+q.explanation;
    const ref=document.createElement('small');ref.textContent='📖 Para repasar: '+q.review;
    $('feedback').append(strong,detail,ref);
    $('next').textContent=index===questions.length-1?'Ver resultados →':'Siguiente pregunta →';
    return;
  }
  if(mode==='exam')responses.push({q,selected:chosen});
  if(index===questions.length-1)finish();
  else {index++;render();}
}
function finish(){
  setProgress(100);
  show('results');
  const right=responses.filter(r=>r.selected===r.q.correct).length;
  const wrong=responses.filter(r=>r.selected!==r.q.correct);
  $('result-title').textContent=wrong.length?'Ya sabes qué puedes repasar.':'¡Buen trabajo!';
  $('score').textContent=`${(10*right/responses.length).toFixed(2).replace('.',',')} / 10`;
  $('summary').textContent=`${right} aciertos de ${responses.length} preguntas. ${wrong.length?'Revisa los conceptos que necesitas reforzar.':'Has acertado todas las preguntas de este intento.'}`;
  $('chapters').replaceChildren();
  const groups=new Map();
  for(const r of responses){
    const key=Number(r.q.chapter), current=groups.get(key)||{title:r.q.chapterTitle,total:0,good:0};
    current.total++;if(r.selected===r.q.correct)current.good++;groups.set(key,current);
  }
  [...groups.entries()].sort((a,b)=>a[0]-b[0]).forEach(([chapter,g])=>{
    const row=document.createElement('div');row.className='chapter-row';
    const name=document.createElement('strong');name.textContent=`Capítulo ${chapter} · ${g.title}`;
    const fails=g.total-g.good;
    const tip=document.createElement('span');tip.textContent=`${g.good}/${g.total} · ${fails===0?'Buen resultado':fails>=2?'Repaso prioritario':'Conviene repasar'}`;
    row.append(name,tip);$('chapters').append(row);
  });
  $('review').replaceChildren();
  responses.forEach((r,n)=>{
    const ok=r.selected===r.q.correct;
    const row=document.createElement('div');row.className='review-row';
    const state=document.createElement('div');state.className='review-state'+(ok?'':' bad');
    state.textContent=ok?'✓ CORRECTA':'✕ PARA REPASAR';
    const title=document.createElement('strong');title.textContent=`${n+1}. ${r.q.question}`;
    const your=document.createElement('p');your.textContent='Tu respuesta: '+r.q.options[r.selected];
    const correct=document.createElement('p');correct.textContent='Respuesta correcta: '+r.q.options[r.q.correct];
    const explain=document.createElement('p');explain.textContent=r.q.explanation;
    const ref=document.createElement('small');ref.textContent='📖 '+r.q.review;
    row.append(state,title,your,correct,explain,ref);$('review').append(row);
  });
  // Se guarda la lista de fallos al terminar para que "Repasar mis errores" sea fiable.
  lastWrong=wrong.map(r=>r.q);
  $('retry').disabled=wrong.length===0;
  $('retry').textContent=wrong.length?`Repasar mis errores (${wrong.length})`:'Sin errores que repasar';
}

// Comprueba que cada pregunta tenga todos los campos que usa la interfaz.
function validQuestion(q){
  return q && typeof q==='object'
    && isText(q.question) && isText(q.topic) && isText(q.chapterTitle)
    && isText(q.explanation) && isText(q.review)
    && Number.isFinite(Number(q.chapter))
    && Array.isArray(q.options) && q.options.length===4 && q.options.every(isText)
    && Number.isInteger(q.correct) && q.correct>=0 && q.correct<=3;
}

modeButtons.forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));
$('next').addEventListener('click',advance);
$('exit').addEventListener('click',()=>{
  if(!responses.length || confirm('¿Salir del cuestionario? Se perderán las respuestas de este intento.'))show('modes');
});
$('again').addEventListener('click',()=>show('modes'));
$('retry').addEventListener('click',()=>{if(lastWrong.length)start('study',lastWrong);});

fetch('questions/ut1.json')
 .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
 .then(data=>{
   if(!Array.isArray(data)||!data.length)throw new Error('El archivo no contiene preguntas');
   const bad=data.findIndex(q=>!validQuestion(q));
   if(bad!==-1)throw new Error(`Formato incorrecto en la pregunta ${bad+1}`);
   bank=data;
   modeButtons.forEach(b=>b.disabled=false);
 })
 .catch(err=>{
   $('modes').classList.add('hidden');$('error').classList.remove('hidden');
   $('error').textContent='No se pudieron cargar las preguntas. Abre la web publicada en Cloudflare o utiliza un servidor local para probarla. Detalle: '+err.message;
 });
