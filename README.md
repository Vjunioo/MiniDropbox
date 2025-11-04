# 📦 MiniDropbox - Projeto de Sistemas Distribuídos

Este projeto é uma implementação do "MiniDropbox", desenvolvido para a disciplina de Sistemas Distribuídos (AV2). Trata-se de um sistema de armazenamento de arquivos distribuído, escalável e tolerante a falhas, construído com uma arquitetura de microsserviços.

A aplicação permite que os usuários façam upload, listem, visualizem (imagens e vídeos) e baixem arquivos através de uma interface web simples. O foco principal é demonstrar os conceitos de escalabilidade e resiliência através de um dashboard de cluster em tempo real.

---

## ✨ Funcionalidades Principais

* **Upload de Arquivos:** Envie arquivos via formulário ou "arrastar e soltar" (drag-and-drop).
* **Listagem de Mídia:** Visualize todos os arquivos enviados (com ícones para imagens, vídeos e outros).
* **Visualizador Embutido:** Abra imagens e assista a vídeos em uma *lightbox* sem sair da página.
* **Download Direto:** Baixe os arquivos originais.
* **Dashboard de Cluster:** Um painel em tempo real que "bombardeia" o backend com requisições, mostrando o balanceamento de carga e a latência de cada servidor de API.
* **Demonstração de Tolerância a Falhas:** O dashboard reage ao vivo quando um dos servidores da API é "morto", provando a resiliência do sistema.

---

## 🛠️ Arquitetura e Tecnologias

O sistema é orquestrado com Docker Compose e é composto pelos seguintes serviços:

1.  **Gateway/Load Balancer (Nginx):**
    * É o **ponto de entrada único** para todo o tráfego.
    * Serve o frontend estático (HTML/CSS/JS).
    * Atua como **Load Balancer**, distribuindo a carga entre as instâncias da API.
    * Atua como **Reverse Proxy**, roteando requisições `/api/` para o backend e `/storage/` para o MinIO.

2.  **Backend (API Python):**
    * Uma API **stateless** (sem estado) construída em **FastAPI**.
    * Pode ser escalada horizontalmente (ex: `docker-compose up --scale api=3`).
    * Gerencia a lógica de negócio, interage com o banco de dados e gera links seguros.

3.  **Banco de Dados (PostgreSQL):**
    * Armazena apenas os **metadados** dos arquivos (nome, ID, caminho do objeto).
    * Não armazena os arquivos em si, garantindo performance.

4.  **Storage de Objetos (MinIO):**
    * Um servidor de storage compatível com S3.
    * Armazena os **dados brutos** dos arquivos (as imagens, vídeos, etc.).
    * É acessado internamente pela API (para uploads) e externamente via Nginx (para downloads/visualização).

---

## 🚀 Como Executar (Para Avaliação)

Este projeto foi empacotado para ser executado em qualquer máquina que possua **apenas o Docker Desktop**. O código-fonte não é necessário para a execução.

### Pré-requisitos
* [**Docker Desktop**](https://www.docker.com/products/docker-desktop/) instalado e em execução.

### Instruções

1.  Baixe o arquivo `docker-compose.yml` deste projeto.
2.  Coloque o arquivo em uma pasta vazia.
3.  Abra um terminal (PowerShell, CMD ou outro) nessa pasta.
4.  Execute o seguinte comando para baixar as imagens prontas e iniciar o sistema:

    ```bash
    # Este comando baixa tudo e inicia o sistema
    docker-compose pull
    docker-compose up
    ```
5.  Acesse [**http://localhost**](http://localhost) no seu navegador para usar a aplicação.

---

## 📊 Demonstração dos Conceitos da Disciplina

A interface do "Dashboard do Cluster" foi criada para provar visualmente os seguintes critérios:

### 1. Escalabilidade (Critério 3)

1.  Inicie o sistema com 3 ou mais instâncias da API:
    ```bash
    # (Primeiro, rode o pull)
    docker-compose pull
    # (Inicie com 3 instâncias de API)
    docker-compose up --scale api=3
    ```
2.  Acesse o site e vá até o "Dashboard do Cluster".
3.  Clique em "▶ Iniciar Teste".
4.  **Resultado:** Você verá a tabela ser preenchida, com a coluna "Nº de Requisições" subindo de forma equilibrada entre os 3 servidores (ex: `api-1`, `api-2`, `api-3`), provando o **balanceamento de carga**.

### 2. Tolerância a Falhas (Critério 2)

1.  Siga os passos de **Escalabilidade** acima e mantenha o "Dashboard do Cluster" rodando.
2.  Abra um **segundo terminal**.
3.  Liste os containers em execução: `docker ps`.
4.  Simule uma falha "matando" um dos containers da API:
    ```bash
    # Substitua 'minidropbox-api-2' pelo nome de um dos seus containers
    docker kill minidropbox-api-2
    ```
5.  **Resultado:** Volte ao navegador. Você verá a linha do container "morto" (`api-2`) parar de receber requisições, enquanto os outros (`api-1`, `api-3`) continuam funcionando e recebendo a carga. O usuário final não percebe a falha.

### 3. Transparência (Critério 4)

O usuário acessa um único link: `http://localhost`. Ele não sabe que, por trás, o Nginx está gerenciando 3 rotas diferentes, falando com 3+ instâncias de API, um banco de dados e um storage. A complexidade está 100% transparente.

---

## 🧑‍💻 Autor
* [Vitor Júnio]