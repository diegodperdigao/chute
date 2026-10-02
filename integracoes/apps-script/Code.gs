/**
 * Chute Parceiros · recebe as inscrições da landing page, grava na planilha e envia ao CRM.
 *
 * Como instalar: veja integracoes/README.md.
 *
 * Propriedades do script (Configurações do projeto → Propriedades do script):
 *   CRM_URL    endpoint do CRM que recebe o lead (POST JSON). Vazio = só grava na planilha.
 *   CRM_TOKEN  token de acesso ao CRM, enviado como "Authorization: Bearer <token>".
 */

const ABA = 'Inscrições';

const COLUNAS = [
  'recebido_em', 'id', 'nome', 'email', 'whatsapp', 'perfil', 'aceite_termos',
  'origem', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref',
  'crm_status', 'crm_resposta',
];

const LIMITES = { nome: 120, email: 160, whatsapp: 11, perfil: 200, origem: 500, utm: 200 };

/* ---------- entrada ---------- */

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return responder({ ok: false, erro: 'JSON inválido' });
  }

  // honeypot: robôs preenchem o campo escondido; respondemos ok sem gravar nada
  if (dados.empresa) return responder({ ok: true });

  const lead = normalizar(dados);
  const erro = validar(lead);
  if (erro) return responder({ ok: false, erro: erro });

  const linha = gravar(lead);
  const crm = enviarAoCrm(lead);
  atualizarStatus(linha, crm);

  // a inscrição já está salva na planilha, então o envio conta como sucesso
  // mesmo se o CRM falhar; reenviarPendentes() tenta de novo depois
  return responder({ ok: true, id: lead.id });
}

function doGet() {
  return responder({ ok: true, servico: 'Chute Parceiros' });
}

/* ---------- dados ---------- */

function normalizar(d) {
  const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  return {
    recebido_em: new Date(),
    id: Utilities.getUuid(),
    nome: txt(d.nome, LIMITES.nome),
    email: txt(d.email, LIMITES.email).toLowerCase(),
    whatsapp: txt(d.whatsapp, 20).replace(/\D/g, '').slice(0, LIMITES.whatsapp),
    perfil: txt(d.perfil, LIMITES.perfil),
    aceite_termos: d.aceite_termos === true,
    origem: txt(d.origem, LIMITES.origem),
    utm_source: txt(d.utm_source, LIMITES.utm),
    utm_medium: txt(d.utm_medium, LIMITES.utm),
    utm_campaign: txt(d.utm_campaign, LIMITES.utm),
    utm_content: txt(d.utm_content, LIMITES.utm),
    utm_term: txt(d.utm_term, LIMITES.utm),
    ref: txt(d.ref, LIMITES.utm),
  };
}

function validar(l) {
  if (l.nome.length < 2) return 'Nome inválido';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(l.email)) return 'E-mail inválido';
  if (!/^\d{10,11}$/.test(l.whatsapp)) return 'WhatsApp inválido';
  if (l.perfil.length < 2) return 'Perfil inválido';
  if (!l.aceite_termos) return 'Termos não aceitos';
  return '';
}

/* ---------- planilha ---------- */

function aba() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let sh = planilha.getSheetByName(ABA);
  if (!sh) sh = planilha.insertSheet(ABA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  }
  return sh;
}

// Impede que um texto vire fórmula na planilha (ex.: "=HYPERLINK(...)" ou "@perfil")
function seguro(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function gravar(lead) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = aba();
    const valores = COLUNAS.map(c => {
      if (c === 'crm_status') return 'pendente';
      if (c === 'crm_resposta') return '';
      if (c === 'whatsapp') return "'" + lead.whatsapp; // mantém zeros e evita notação numérica
      return seguro(lead[c]);
    });
    sh.appendRow(valores);
    return sh.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

function atualizarStatus(linha, crm) {
  const sh = aba();
  const col = COLUNAS.indexOf('crm_status') + 1;
  sh.getRange(linha, col, 1, 2).setValues([[crm.status, seguro(crm.resposta)]]);
}

/* ---------- CRM ---------- */

/**
 * Formato enviado ao CRM. Ajuste os nomes dos campos para o que a API de vocês espera.
 */
function montarPayloadCrm(lead) {
  return {
    id_externo: lead.id,
    nome: lead.nome,
    email: lead.email,
    telefone: '+55' + lead.whatsapp,
    perfil: lead.perfil,
    origem: 'LP Chute Parceiros',
    url_origem: lead.origem,
    utm: {
      source: lead.utm_source,
      medium: lead.utm_medium,
      campaign: lead.utm_campaign,
      content: lead.utm_content,
      term: lead.utm_term,
      ref: lead.ref,
    },
    consentimento_lgpd: lead.aceite_termos,
    criado_em: new Date(lead.recebido_em).toISOString(),
  };
}

function enviarAoCrm(lead) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('CRM_URL');
  const token = props.getProperty('CRM_TOKEN');
  if (!url) return { status: 'pendente', resposta: 'CRM_URL não configurada' };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      payload: JSON.stringify(montarPayloadCrm(lead)),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const corpo = res.getContentText().slice(0, 500);
    return code >= 200 && code < 300
      ? { status: 'enviado', resposta: 'HTTP ' + code }
      : { status: 'erro', resposta: 'HTTP ' + code + ' ' + corpo };
  } catch (err) {
    return { status: 'erro', resposta: String(err).slice(0, 500) };
  }
}

/* ---------- manutenção ---------- */

/** Reenvia ao CRM as linhas com status "pendente" ou "erro". */
function reenviarPendentes() {
  const sh = aba();
  const total = sh.getLastRow() - 1;
  if (total < 1) return;
  const linhas = sh.getRange(2, 1, total, COLUNAS.length).getValues();
  const idx = nome => COLUNAS.indexOf(nome);

  linhas.forEach((v, i) => {
    const status = v[idx('crm_status')];
    if (status === 'enviado') return;
    const lead = {};
    COLUNAS.forEach((c, j) => { lead[c] = typeof v[j] === 'string' ? v[j].replace(/^'/, '') : v[j]; });
    lead.whatsapp = String(lead.whatsapp).replace(/\D/g, '');
    lead.aceite_termos = lead.aceite_termos === true || lead.aceite_termos === 'TRUE';
    atualizarStatus(i + 2, enviarAoCrm(lead));
  });
}

/** Rode uma vez para reenviar pendentes automaticamente a cada 15 minutos. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'reenviarPendentes')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('reenviarPendentes').timeBased().everyMinutes(15).create();
}

/** Teste rápido pelo editor: grava um lead de exemplo e tenta enviar ao CRM. */
function testar() {
  const res = doPost({ postData: { contents: JSON.stringify({
    nome: 'Teste Chute', email: 'teste@exemplo.com', whatsapp: '11912345678',
    perfil: '@teste', aceite_termos: true, origem: 'teste manual',
  }) } });
  Logger.log(res.getContent());
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
