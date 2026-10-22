(() => {
  const $ = id => document.getElementById(id);
  const status = message => { $('api-status').textContent = message; };
  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(value);
  async function api(path, body) {
    const response = await fetch(`./api/${path}`, body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {});
    const result = await response.json();
    if (!response.ok) throw new Error(result.issues?.[0]?.message || result.error || 'Request failed');
    return result;
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function node(tag, text) { const element = document.createElement(tag); element.textContent = text; return element; }
  function render(result) {
    const target = $('api-result'); target.replaceChildren(); target.hidden = false;
    target.append(node('h3', result.decisionReadiness.label), node('p', result.decisionReadiness.reason));
    const grid = node('div', ''); grid.className = 'result-grid';
    for (const [label, value] of [['Matching leads', result.baseline.leads], ['Historical revenue', money(result.baseline.revenue)], ['Historical gross profit', money(result.baseline.grossProfit)]]) {
      const card=node('article',label);card.append(node('strong', String(value)));grid.append(card);
    }
    target.append(grid);
    if (result.decisionReadiness.status !== 'abstain') {
      const range=result.distribution.simulated.grossProfit;
      target.append(node('h3','Scenario estimate'), node('p',`Revenue: ${money(result.simulated.revenue)} · Gross profit: ${money(result.simulated.grossProfit)} · Profit change: ${money(result.deltas.grossProfit)}`), node('p',`Gross profit P10 / P50 / P90: ${money(range.p10)} / ${money(range.p50)} / ${money(range.p90)}`), node('p',`Heuristic confidence: ${result.confidence.score}/100 (${result.confidence.label}). This score is not a calibrated probability.`));
    }
    target.append(node('h3','Evidence and assumptions'));
    const list=node('ul','');for(const text of [...result.evidence,...result.assumptions])list.append(node('li',text));target.append(list);
    const exportButton=node('button','Export complete result JSON');exportButton.className='btn btn--ghost';exportButton.onclick=()=>download(`fate-${result.id}.json`,JSON.stringify(result,null,2),'application/json');target.append(exportButton);
    const details=node('details','');details.append(node('summary','Inspect full engine output (including diagnostic estimates for abstained runs)'),node('pre',JSON.stringify(result,null,2)));target.append(details);
  }
  $('run-form').addEventListener('submit', async event => {
    event.preventDefault();$('run-submit').disabled=true;status('Running simulation…');
    try {
      const body={offer:$('api-offer').value,scenario:$('api-scenario').value,filter:{objection:$('api-objection').value,region:$('api-region').value,segment:$('api-segment').value,months:Number($('api-months').value)},save:$('api-save').checked};
      if($('data-source').value==='demo')body.demo=true;
      else {const file=$('csv-file').files[0];if(!file)throw new Error('Choose a CSV file first.');if(file.size>2000000)throw new Error('CSV must be smaller than 2 MB.');body.leads=(await api('import',{csv:await file.text()})).leads;}
      const result=await api('simulate',body);render(result);status(body.save?'Complete. Result saved locally.':'Complete. Result was not saved.');
    }catch(error){status(`${error.message}. Start the included server with npm start if it is unavailable.`);}
    finally{$('run-submit').disabled=false;}
  });
  $('download-template').onclick=async()=>{try{download('fate-leads.csv',(await api('template')).csv,'text/csv');}catch(error){status(error.message);}};
  $('load-history').onclick=async()=>{try{const results=await api('simulations');$('api-history').replaceChildren(node('h3','Saved runs'));for(const result of results){const button=node('button',`${result.scenario} · ${result.createdAt.slice(0,10)}`);button.className='btn btn--ghost';button.onclick=()=>render(result);$('api-history').append(button);}if(!results.length)status('No saved runs yet.');}catch(error){status(error.message);}};
})();
