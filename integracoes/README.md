# Integração: formulário → planilha + CRM

Cada inscrição feita na landing page vai para um **Google Apps Script** ligado a uma planilha do Google. O script:

1. valida os dados e descarta robôs (campo escondido `empresa`);
2. grava uma linha na aba **Inscrições**;
3. envia o lead para o CRM (`POST` JSON com token);
4. anota na própria linha se o envio ao CRM deu certo (`crm_status` = `enviado`, `erro` ou `pendente`).

Se o CRM estiver fora do ar, a inscrição continua salva na planilha. A função `reenviarPendentes()` tenta enviar de novo.

## Instalação (uns 10 minutos)

### 1. Planilha e script
1. Crie uma planilha no Google Sheets (ex.: "Chute Parceiros · Inscrições").
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Code.gs` e cole o arquivo [`apps-script/Code.gs`](apps-script/Code.gs). Salve.

### 2. Dados do CRM
1. No Apps Script, abra **Configurações do projeto** (ícone de engrenagem) → **Propriedades do script** → **Adicionar propriedade**:
   - `CRM_URL`: o endpoint do CRM que recebe o lead (ex.: `https://crm.suaempresa.com/api/leads`).
   - `CRM_TOKEN`: o token de acesso. Ele é enviado como `Authorization: Bearer <token>` e nunca aparece no site.
2. Se a API do CRM espera outros nomes de campo, ajuste a função `montarPayloadCrm()` no `Code.gs`. Formato enviado hoje:

```json
{
  "id_externo": "uuid",
  "nome": "Diego",
  "email": "diego@exemplo.com",
  "telefone": "+5511912345678",
  "perfil": "@perfil",
  "origem": "LP Chute Parceiros",
  "url_origem": "https://...",
  "utm": { "source": "", "medium": "", "campaign": "", "content": "", "term": "", "ref": "" },
  "consentimento_lgpd": true,
  "criado_em": "2026-10-02T19:00:00.000Z"
}
```

Sem `CRM_URL`, o script só grava na planilha, com `crm_status` = `pendente`.

### 3. Testar
No editor, selecione a função `testar` e clique em **Executar**. Na primeira vez o Google pede autorização (planilha + acesso externo). Deve aparecer uma linha "Teste Chute" na aba **Inscrições** e o lead no CRM. Apague a linha depois.

### 4. Publicar
1. **Implantar → Nova implantação** → tipo **App da Web**.
2. **Executar como:** Eu. **Quem pode acessar:** Qualquer pessoa.
3. Copie a URL que termina em `/exec`.
4. Em `assets/js/main.js`, cole a URL em `FORM_ENDPOINT`.

> Ao mudar o `Code.gs` depois, use **Implantar → Gerenciar implantações → Editar → Nova versão**. Assim a URL continua a mesma.

### 5. Reenvio automático (recomendado)
Execute uma vez a função `instalarGatilho`. Ela agenda `reenviarPendentes()` a cada 15 minutos para os leads que falharam no CRM.

## Colunas da planilha

`recebido_em, id, nome, email, whatsapp, perfil, aceite_termos, origem, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref, crm_status, crm_resposta`

## Segurança

- O token do CRM fica só nas propriedades do script, nunca no site.
- Textos que começam com `=`, `+`, `-` ou `@` são gravados como texto, para ninguém injetar fórmulas na planilha.
- Os dados são validados de novo no script, com limite de tamanho por campo.
