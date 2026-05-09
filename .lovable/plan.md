## Diagnóstico

A conexão com o Google Calendar funcionou (a tela mostra "Google Calendar conectado" com o e-mail). O erro de página no final foi o redirect após o sucesso: o callback envia o usuário para `/medico/configuracoes`, mas a rota real é `/app/medico/configuracoes` — mesmo bug do redirect_uri, só que agora nos `navigate(...)` internos.

Em `src/pages/app/medico/MedicoGoogleCallback.tsx` há 4 chamadas `navigate("/medico/configuracoes")` (linhas 19, 26, 52, 57) que precisam virar `/app/medico/configuracoes`.

## Mudança

Trocar nas 4 ocorrências:
- `navigate("/medico/configuracoes")` → `navigate("/app/medico/configuracoes")`

A linha 36 (`navigate("/auth")`) fica como está.

Nada mais precisa mudar — nem código, nem Google Cloud Console. A próxima conexão vai cair direto em Configurações sem 404.
