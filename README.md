# 🧪 Labware — Sistema Inteligente de Gestão de Chamados

Plataforma completa para abertura, triagem e acompanhamento de chamados de suporte técnico, integrada com inteligência artificial para triagem automática de problemas e transcrição de relatos por voz em tempo real.

---

## 📌 Funcionalidades Principais

* 🎙️ **Abertura de Chamados por Voz (STT):** Gravação de áudio via navegador (`MediaRecorder`) ou upload de arquivo pré-gravado (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`). O áudio é transcrito via IA (*Faster-Whisper*) e injetado em um campo de texto **totalmente editável** antes do envio.
* 📝 **Entrada Direta por Texto:** Formulário tradicional para digitação manual da descrição do problema.
* 📎 **Anexo Obrigatório de Arquivos:** Envio obrigatório de evidências (imagens, PDFs ou documentos) via requisições `FormData` multipart.
* 🤖 **Triagem Inteligente por IA:** Classificação automática de prioridade, tempo de resposta (SLA) e categoria do chamado durante a abertura.
* 👥 **Visão Dinâmica por Perfil de Usuário (RBAC):**
  * **Suporte / Admin:** Acesso a todos os chamados, relatórios gerenciais, métricas operacionais e ao gráfico de volume diário (*Criados vs Resolvidos*).
  * **Cliente:** Interface simplificada focada no autoatendimento (*Abertura rápida*, *Meus Chamados* e *Histórico*), omitindo gráficos gerenciais internos.
* 🔔 **Central de Notificações:** Dropdown popover no ícone de sino com indicador visual de mensagens não lidas, suporte a clique externo (*click-outside*) e redirecionamento direto para a tela padronizada.
* 👤 **Gestão de Perfil:** Atualização de dados cadastrais, cargo e vínculo com a empresa selecionada.

---

## 🏗️ Arquitetura do Sistema

O projeto é estruturado em três módulos desacoplados:

```text
 [ Frontend (React + Vite) ]
          │
          ├── REST (JWT / Multipart) ──► [ Backend (Spring Boot API) ]
          │                                        │
          └── STT Proxy ───────────────────────────┴──► [ Microserviço STT (Python + FastAPI) ]
                                                                │
                                                                └── Faster-Whisper (PyAV / PCM Audio)
```

### Módulos do Projeto

| Módulo | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, Axios | SPA responsiva com navegação e visualizações dinâmicas por perfil. |
| **Backend API** | Java 17+, Spring Boot, Spring Security | Gestão de chamados, segurança JWT, regras de negócio e triagem. |
| **Microserviço STT** | Python 3.10+, FastAPI, Faster-Whisper | Serviço de transcrição de áudio por IA com manipulação temporária em disco. |

---

## 🛠️ Tecnologias Utilizadas

### Frontend
* **Core:** React 18, Vite, React Router DOM.
* **Estilização:** CSS Scoped com variáveis globais e Lucide React Icons.
* **Comunicação:** Axios com interceptors centralizados para injeção de Token JWT.

### Backend Java (`labware-api`)
* **Core:** Java 17+, Spring Boot, Spring Data JPA.
* **Segurança:** Spring Security com autenticação Stateless via JWT.
* **Consumo Multipart:** Recebimento conjunto de JSON DTOs e anexos via `@RequestPart`.

### Microserviço STT (`stt-service`)
* **Core:** Python 3.10+, FastAPI, Uvicorn.
* **Processamento de Áudio:** Faster-Whisper, PyAV (suporte a `av 19.0.2+`), NumPy.
* **Manipulação Temporária:** Conversão para PCM WAV 16-bit e limpeza automática via `tempfile`.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* **Node.js** `v18+` e `npm`
* **JDK** `17+` e `Maven`
* **Python** `3.10+` e `FFmpeg` instalado no sistema

---

### 1. Microserviço de Transcrição (Python STT)

```bash
# Navegar até a pasta do microsserviço
cd labware-api/stt-service

# Criar e ativar o ambiente virtual (opcional)
python -m venv venv

# No Windows:
venv\Scripts\activate

# No Linux/macOS:
source venv/bin/activate

# Instalar as dependências
pip install -r requirements.txt

# Iniciar o serviço via script automatizado ou uvicorn
.\iniciar.cmd
```

> 💡 **Nota:** O microsserviço Python rodará por padrão na porta `8000`.

---

### 2. Backend API (Spring Boot)

```bash
# Navegar até o diretório da API Java
cd labware-api

# Compilar e executar a aplicação
mvn spring-boot:run
```

> 💡 **Nota:** A API Spring Boot estará disponível em `http://localhost:8080`.

---

### 3. Frontend Web (React)

```bash
# Navegar até o diretório do frontend
cd labware-web

# Instalar as dependências do projeto
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

> 💡 **Nota:** O frontend estará acessível em `http://localhost:5173`.

---

## 🧪 Validação e Qualidade

Para verificar a integridade e padrões do código antes de realizar commits ou builds:

```bash
# Executar a verificação de código (ESLint)
npm run lint

# Validar a compilação de produção
npm run build
```

---

## 🗺️ Estrutura das Rotas do Sistema

```text
/
├── /dashboard              # Métricas e resumos (Condicional por Perfil)
├── /chamados               # Listagem de chamados (Meus Chamados / Todos Chamados)
├── /chamados/novo          # Abertura de novos chamados (Texto/Voz + Anexos)
├── /chamados/:id           # Detalhes, chat e linha do tempo do chamado
├── /notificacoes           # Central completa de notificações
├── /relatorios             # Relatórios operacionais (Apenas Suporte/Admin)
└── /perfil                 # Configurações de conta e seleção de empresa
```
