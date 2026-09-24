const tagRules = [
  {tag:'Split agendado',tone:'scheduled',when:'Existe Split válido ainda não concluído nem cancelado.',visual:'Azul-claro; abre detalhes somente no contexto do contrato.'},
  {tag:'Split liquidado',tone:'settled',when:'Cobrança liquidada e Split concluído com sucesso.',visual:'Azul-escuro; erro antigo de criação não substitui o sucesso.'},
  {tag:'Split indisponível',tone:'unavailable',when:'Split não criado por uma condição esperada ou regra de negócio.',visual:'Cinza; representa ocorrências do tipo 3.'},
  {tag:'Split com erro',tone:'error',when:'Falha acionável que exige correção ou repasse manual.',visual:'Laranja; erro de liquidação tipo 2 pode aparecer após liquidar.'}
];

const tests = [
  ['S01','Fluxo principal','Geração e agendamento','Gerar boleto elegível e cadastrar o Split no PJBank.',['Gerar boleto com contrato e proprietário elegíveis.','Forçar os webhooks de geração.','Confirmar cadastro no PJBank.'],['RECEBIMENTO aponta para o Split correto.','SPLIT não está concluído nem cancelado.','Somente Split agendado aparece.','Modal apresenta o destinatário correto.'],['ID_RECEBIMENTO_RECB','ID_SPLIT_SPL','status e captura'],['IMC-1005']],
  ['S02','Fluxo principal','Caminho feliz completo','Liquidar no PJBank com programado e realizado iguais.',['Liquidar pelo endpoint de teste.','Processar boleto_liquidado com Dados_split = 1.','Permitir consulta real ao PJBank.'],['Resultado coincidente.','Cobrança, Split e repasse concluídos.','Nenhum erro de divergência.','Somente Split liquidado.','Log possui programados e executados.'],['banco','tela','log'],['IMC-1754']],
  ['S03','Programado x realizado','CPF/CNPJ diferente','Alterar somente o documento executado.',['Usar programados como base do mock.','Alterar apenas cpf_cnpj.','Continuar o webhook.'],['Resultado divergente.','campos_divergentes contém cpf_cnpj.','Erro DESTINATARIO_DIVERGENTE.','Repasse manual liberado.','Tag e modal de erro.'],['programados/executados','SPLIT_ERROS','repasse'],['IMC-469','IMC-1754']],
  ['S04','Programado x realizado','Banco, agência e conta diferentes','Executar três rodadas, alterando um campo por vez.',['Rodada A: somente banco.','Rodada B: somente agência.','Rodada C: somente conta.'],['Cada rodada resulta divergente.','Somente o campo alterado é listado.','Repasse manual e Split com erro.'],['um log por rodada'],['IMC-1754']],
  ['S05','Programado x realizado','Somente valor diferente','Valor é auditado, mas não reprova o IMC-1754.',['Manter os quatro campos iguais.','Alterar somente valor.','Continuar o webhook.'],['Resultado coincidente.','Nenhum DESTINATARIO_DIVERGENTE.','Fluxo feliz continua.','Ambos os valores ficam no log.'],['resultado e valores no log'],['IMC-1754']],
  ['S06','Programado x realizado','Nenhum Split executado','A consulta válida retorna split vazio.',['Manter pelo menos um programado.','Retornar lista executada vazia.','Continuar o webhook.'],['Resultado divergente.','Motivo split_executado_ausente.','Quantidade executada zero.','Repasse manual e tag de erro.'],['quantidades','SPLIT_ERROS'],['IMC-1754']],
  ['S07','Resiliência','Falha na consulta ao PJBank','Timeout, HTTP inválido, exceção ou resposta incompreensível.',['Simular falha na consulta.','Continuar o webhook.','Conferir banco e log.'],['Resultado inconclusivo.','Liquidação não é bloqueada.','Não afirmar divergência.','Não liberar manual somente pela falha temporária.'],['erro_classe','estado final'],['IMC-1754']],
  ['S08','Resiliência','Webhook repetido','Processar duas vezes o mesmo boleto_liquidado.',['Executar o webhook.','Executar novamente com os mesmos dados.','Comparar banco e logs.'],['Sem Split, repasse ou erro funcional duplicado.','Pode haver dois logs de tentativa.','Estado e tag permanecem estáveis.'],['contagem no banco','timestamps'],['IMC-1754']],
  ['S09','Fluxo principal','Cancelamento com Dados_split = -1','Garantir que cancelamento não vira liquidação.',['Processar Dados_split = -1.','Consultar cobrança, Split e repasse.','Reabrir as telas.'],['Executa remoção/cancelamento previsto.','Não faz conferência de Dados_split = 1.','Não deixa tag indevida.','Preserva auditoria.'],['status antes/depois','tag'],['IMC-1754']],
  ['S10','Compatibilidade','Cobrança sem Split','Garantir que o fluxo comum não sofreu regressão.',['Gerar cobrança sem Split.','Liquidar normalmente.','Verificar chamadas e estado.'],['Não consulta destinatário no PJBank.','Não cria divergência.','Liquidação comum permanece intacta.'],['ausência do evento','estado'],['IMC-1754']],
  ['S11','Tags','Precedência depois da liquidação','Separar erro antigo, erro pós-liquidação e sucesso posterior.',['A: concluído + erro antigo tipo 1.','B: liquidado + erro real tipo 2.','C: falha tipo 2 e depois sucesso.'],['A: Split liquidado.','B: Split com erro.','C: sucesso final prevalece sobre erro obsoleto.'],['tipo do erro','status','três capturas'],['IMC-1582']],
  ['S12','Tags','Equivalência entre telas','A mesma cobrança não pode contar histórias diferentes.',['Abrir cobranças no contrato.','Abrir repasses.','Abrir cobranças fora do contrato.'],['Mesmo significado em todas as telas.','Modal somente onde suportado.','Nenhum link quebrado.','Nunca agendado em uma e erro em outra.'],['capturas lado a lado'],['IMC-1005','IMC-1582']]
];

const categories = [
  ['SALDO_INSUFICIENTE',3,'Split indisponível','Sem saldo para repasse'],['VALOR_DIVERGENTE',1,'Split com erro','Valor do repasse maior que saldo disponível'],['ERRO_GENERICO',1,'Split com erro','Falha no repasse com Split'],['CONTRATO_FINALIZADO',3,'Split indisponível','Repasse automático interrompido'],['CONTA_NAO_HABILITADA',3,'Split indisponível','Aprovação pendente no PJBank'],['CONTA_INVALIDA',1,'Split com erro','Conta reprovada no PJBank'],['VALOR_ALTERADO',1,'Split com erro','Diferença no valor do repasse'],['DESPESA_ALTERADA',1,'Split com erro','Alteração em itens da cobrança'],['SEM_MARGEM',1,'Split com erro','Sem margem para o Split'],['DADOS_PROPRIETARIO_ALTERADOS',1,'Split com erro','Dados do proprietário alterados'],['DADOS_REPASSE_ALTERADOS',1,'Split com erro','Dados do repasse mudaram'],['DESTINATARIO_DIVERGENTE',2,'Split com erro','A conta de destino foi rejeitada']
];

const sources = {
  'IMC-19 · Objetivo':'https://superlogica.atlassian.net/browse/IMC-19','IMC-469 · Proprietário':'https://superlogica.atlassian.net/browse/IMC-469','IMC-681 · Indisponível':'https://superlogica.atlassian.net/browse/IMC-681','IMC-683 · Modais V2':'https://superlogica.atlassian.net/browse/IMC-683','IMC-1005 · Tags e erros':'https://superlogica.atlassian.net/browse/IMC-1005','IMC-1582 · Pós-liquidação':'https://superlogica.atlassian.net/browse/IMC-1582','IMC-1754 · Conferência':'https://superlogica.atlassian.net/browse/IMC-1754','Documento técnico':'https://superlogica.atlassian.net/wiki/x/BQAO5g','Documento de produto':'https://superlogica.atlassian.net/wiki/x/A4AI5g','Figma':'https://www.figma.com/design/6404Z0wlNSriol0OnNMMSt/IMC-683---Refatora%C3%A7%C3%A3o-do-DE-PARA-de-Erros-de-Split-e-Implementa%C3%A7%C3%A3o-de-Novos-Modais--V2-?node-id=1-556','PR Apps 21996':'https://github.com/Superlogica/apps/pull/21996','PR Apps 22428':'https://github.com/Superlogica/apps/pull/22428','PR Apps 22450':'https://github.com/Superlogica/apps/pull/22450','PR Cloud 45168':'https://github.com/Superlogica/cloud/pull/45168'
};

const jira = id => `https://superlogica.atlassian.net/browse/${id}`;
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

document.querySelector('#tagGrid').innerHTML = tagRules.map(rule => `<article class="card tag-rule"><span class="pill ${rule.tone}">${rule.tag}</span><h3>Quando aparece</h3><p>${rule.when}</p><div class="visual"><b>Regra visual:</b> ${rule.visual}</div></article>`).join('');
document.querySelector('#testCount').textContent = tests.length;
const groups = [...new Set(tests.map(test => test[1]))];
document.querySelector('#group').insertAdjacentHTML('beforeend', groups.map(group => `<option>${group}</option>`).join(''));

const list = document.querySelector('#testList');
list.innerHTML = tests.map(test => {
  const [id,group,title,summary,steps,expected,evidence,refs] = test;
  const search = test.flat(Infinity).join(' ').toLocaleLowerCase('pt-BR');
  return `<details class="card test" data-id="${id}" data-group="${group}" data-search="${esc(search)}"><summary><span class="check" role="checkbox" tabindex="0"></span><span class="test-title"><b><strong>${id}</strong> · ${title}</b><small>${summary}</small></span><span class="group">${group}</span><span class="arrow">›</span></summary><div class="test-body"><div><h4>Como chegar no cenário</h4><ol>${steps.map(step=>`<li>${step}</li>`).join('')}</ol></div><div><h4>Resultado esperado</h4><ul>${expected.map(item=>`<li>${item}</li>`).join('')}</ul></div><div class="evidence"><b>Evidências:</b> ${evidence.join(' · ')}</div><div class="refs">${refs.map(ref=>`<a href="${jira(ref)}" target="_blank">${ref} ↗</a>`).join('')}</div></div></details>`;
}).join('');

document.querySelector('#categoryRows').innerHTML = categories.map(([category,type,tag,banner]) => `<tr><td><code>${category}</code></td><td><span class="type">${type}</span></td><td><span class="pill ${tag.includes('indisponível')?'unavailable':'error'}">${tag}</span></td><td>${banner}</td></tr>`).join('');
document.querySelector('#links').innerHTML = Object.entries(sources).map(([name,url])=>`<a href="${url}" target="_blank" rel="noreferrer">${name} ↗</a>`).join('');

const storageKey = 'split-playbook-checks-v1';
const saved = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
const cards = [...document.querySelectorAll('.test')];
function renderProgress(){cards.forEach(card=>card.querySelector('.check').classList.toggle('done',saved.has(card.dataset.id)));document.querySelector('#progressBar').style.width=`${saved.size/cards.length*100}%`;document.querySelector('#progressText').textContent=`${saved.size} de ${cards.length} concluídos`;localStorage.setItem(storageKey,JSON.stringify([...saved]));}
function toggle(card){saved.has(card.dataset.id)?saved.delete(card.dataset.id):saved.add(card.dataset.id);renderProgress()}
cards.forEach(card=>{const check=card.querySelector('.check');check.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggle(card)});check.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();toggle(card)}})});
function filter(){const query=document.querySelector('#search').value.toLocaleLowerCase('pt-BR');const group=document.querySelector('#group').value;cards.forEach(card=>card.classList.toggle('hidden',(query&&!card.dataset.search.includes(query))||(group&&card.dataset.group!==group)))}
document.querySelector('#search').addEventListener('input',filter);document.querySelector('#group').addEventListener('change',filter);document.querySelector('#reset').addEventListener('click',()=>{if(confirm('Limpar todas as marcações?')){saved.clear();renderProgress()}});
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{await navigator.clipboard.writeText(button.nextElementSibling.textContent);button.textContent='Copiado';setTimeout(()=>button.textContent='Copiar',1200)}));
renderProgress();
