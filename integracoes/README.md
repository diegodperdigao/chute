# Integração: formulário → planilha + CRM

Cada inscrição feita na landing page vai para um **Google Apps Script** ligado a uma planilha do Google. O script:

1. valida os dados e descarta robôs (campo escondido `empresa`);
2. grava uma linha na aba **Inscrições**;
3. envia o lead para o CRM 3COS (`POST` JSON com `x-api-key`);
4. anota na própria linha se o envio ao CRM deu certo (`crm_status` = `enviado`, `rejeitado`, `erro` ou `pendente`) e o id do lead no CRM.

Se o CRM estiver fora do ar, a inscrição continua salva na planilha. A função `reenviarPendentes()` tenta enviar de novo.

## Instalação (uns 10 minutos)

### 1. Planilha e script
1. Crie uma planilha no Google Sheets (ex.: "Chute Parceiros · Inscrições").
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Code.gs` e cole o arquivo [`apps-script/Code.gs`](apps-script/Code.gs). Salve.

### 2. Dados do CRM (3COS)
No Apps Script, abra **Configurações do projeto** (ícone de engrenagem) → **Propriedades do script** → **Adicionar propriedade**:

| Propriedade | Valor |
|---|---|
| `CRM_URL` | `https://3cos.vercel.app/api/leads` |
| `CRM_API_KEY` | a chave da API (cabeçalho `x-api-key`). Fica só aqui, nunca no site nem no repositório. |
| `CRM_TESTE` | `true` enquanto estiverem testando; `false` quando a página for ao ar. Sem a propriedade, vale `true`. |

Corpo enviado ao CRM (`POST`, `application/json`):

```json
{
  "nome": "Diego",
  "email": "diego@exemplo.com",
  "telefone": "+5511912345678",
  "perfil": "influencer | tipster | streamer | agencia",
  "origem": "LP Chute Parceiros",
  "url_origem": "https://...",
  "utm": { "source": "", "medium": "", "campaign": "", "term": "", "content": "" },
  "consentimento_lgpd": true,
  "notes": "Perfil/canal: @perfil | ref: ... | ID na planilha: ...",
  "test": true
}
```

- `perfil` vem da escolha "Você é" do formulário. O @ ou link do canal vai em `notes`.
- Resposta `201`: a linha fica `enviado` e o id do lead no CRM vai para a coluna `crm_id`.
- Resposta `400`: a linha fica `rejeitado`, com a mensagem do CRM em `crm_resposta`. Não é reenviada; corrija e rode `reenviarPendentes` depois de mudar o status para `erro`.
- Resposta `401` ou falha de rede: a linha fica `erro` e é reenviada automaticamente.

Sem `CRM_URL` ou `CRM_API_KEY`, o script só grava na planilha, com `crm_status` = `pendente`.

### 3. Testar
No editor, selecione a função `testar` e clique em **Executar**. Na primeira vez o Google pede autorização (planilha + acesso externo). Deve aparecer uma linha "Teste Chute" na aba **Inscrições** com `crm_status` = `enviado` e um `crm_id`. O `testar` sempre envia `test: true` ao CRM. Apague a linha depois.

### 4. Publicar
1. **Implantar → Nova implantação** → tipo **App da Web**.
2. **Executar como:** Eu. **Quem pode acessar:** Qualquer pessoa.
3. Copie a URL que termina em `/exec`.
4. Em `assets/js/main.js`, cole a URL em `FORM_ENDPOINT`.

> Ao mudar o `Code.gs` depois, use **Implantar → Gerenciar implantações → Editar → Nova versão**. Assim a URL continua a mesma.

### 5. Reenvio automático (recomendado)
Execute uma vez a função `instalarGatilho`. Ela agenda `reenviarPendentes()` a cada 15 minutos para os leads que falharam no CRM.

## Colunas da planilha

`recebido_em, id, nome, email, whatsapp, tipo, perfil, aceite_termos, origem, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref, crm_status, crm_id, crm_resposta, crm_teste`

## Segurança

- A chave da API do CRM fica só nas propriedades do script, nunca no site nem no repositório.
- Textos que começam com `=`, `+`, `-` ou `@` são gravados como texto, para ninguém injetar fórmulas na planilha.
- Os dados são validados de novo no script, com limite de tamanho por campo.
