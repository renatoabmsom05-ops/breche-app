<div align="center">
  <img src="./assets/images/icon.png" width="96" alt="Breché." />
  <h1>Breché.</h1>
  <p><strong>Moda circular perto de você — troque, venda e garimpe roupas num raio de até 30 km.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Expo-SDK%2057-141414?style=for-the-badge&logo=expo&logoColor=C6F135" alt="Expo SDK 57" />
    <img src="https://img.shields.io/badge/React%20Native-0.86.3-141414?style=for-the-badge&logo=react&logoColor=C6F135" alt="React Native 0.86.3" />
    <img src="https://img.shields.io/badge/TypeScript-6.0-141414?style=for-the-badge&logo=typescript&logoColor=C6F135" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-Auth%20%7C%20Realtime%20%7C%20Storage-141414?style=for-the-badge&logo=supabase&logoColor=C6F135" alt="Supabase" />
    <img src="https://img.shields.io/badge/EAS%20Build-Android-141414?style=for-the-badge&logo=android&logoColor=C6F135" alt="EAS Build Android" />
  </p>

  <p>
    <a href="./Breche-Documentacao-do-App.pdf"><strong>📄 Documentação Completa do App (PDF Editorial)</strong></a>
    &nbsp;·&nbsp;
    <a href="#-testar-no-android-apk"><strong>📲 Baixar APK (Releases)</strong></a>
    &nbsp;·&nbsp;
    <a href="#-como-rodar-localmente"><strong>⚙️ Rodar Localmente</strong></a>
  </p>
</div>

---

## ✨ Sobre o Projeto

> *"Toda roupa guarda uma história — e às vezes, a próxima página dela é no armário de outra pessoa."*

O **Breché.** é um aplicativo mobile de **moda circular hiperlocal** desenvolvido com **React Native, Expo SDK 57 e Supabase**. Ele conecta pessoas da mesma região interessadas em **trocar**, **vender** ou **garimpar** roupas e calçados parados no guarda-roupa, com uma experiência rápida por gestos de swipe e conversa direta em tempo real.

Idealizado por **Létz Pinheiro** (figurinista) e desenvolvido por **Renato César** (Sistemas para Internet), o projeto foi pensado ponta a ponta: da identidade visual editorial (`Playfair Display` + `Inter`, paleta `#141414` / `#C6F135` / `#F2EFEA`) até infraestrutura em nuvem, notificações push e pipeline de build Android.

📄 **Quer ver a apresentação visual completa do produto, identidade e decisões técnicas?**  
Acesse o documento editorial dentro do repositório: **[`Breche-Documentacao-do-App.pdf`](./Breche-Documentacao-do-App.pdf)**.

---

## 📱 Funcionalidades

- **Feed em Swipe Geolocalizado (`30 km`)**: Descoberta de peças próximas via GPS (`expo-location`) e função RPC `pecas_proximas` no PostgreSQL, com gestos de **GOSTEI** (animação de coração) / **PULAR**, botão de **Salvar (★)**, galeria em tela cheia e tratamento de erros.
- **Publicação Rápida de Peças**: Upload de até 3 fotos por peça nos modos **`TROCA`**, **`VENDA`** ou **`TROCA/VENDA`**, com marca, tamanho, categoria, estado de conservação e coordenadas GPS.
- **Matches & Chat em Tempo Real**: Lista unificada de conversas tanto para **compradores** quanto para **vendedores** (`MensagensScreen`), com troca de mensagens instantânea via Supabase Realtime (`postgres_changes`).
- **Notificações Push (Android / FCM v1)**: Alerta contextual quando alguém inicia conversa sobre uma peça e **navegação direta ao chat (`interesseId`)** ao tocar na notificação (com o app aberto, em segundo plano ou fechado).
- **Deep Linking de Peças**: Links compartilháveis (`brecho://peca/:id`) que abrem diretamente os detalhes da peça no aplicativo (`PecaDetalheScreen`).
- **Avaliações & Gestão do Acervo**: Avaliação de vendedores (1 a 5 estrelas com comentário), edição de perfil (`@instagram`, bio e avatar), marcação de peças como vendidas/trocadas, remoção completa (incluindo fotos no Storage) e recuperação de senha por código OTP de 6 dígitos.

---

## 🏗️ Destaques de Engenharia & Arquitetura

- **Segurança & Isolamento de Dados (RLS)**: Políticas de Row Level Security no PostgreSQL garantindo acesso autenticado por `auth.uid()` nas tabelas `usuarios`, `pecas`, `interesses`, `mensagens`, `avaliacoes` e `salvos`, além de credenciais isoladas via variáveis de ambiente (`EXPO_PUBLIC_*`).
- **Compatibilidade Expo Go + Builds Nativos (`SDK 53+`)**: Carregamento condicional de `expo-notifications` usando `isRunningInExpoGo()` em [`src/lib/notificacoes.ts`](./src/lib/notificacoes.ts), evitando falhas fatais no Expo Go Android sem abrir mão de push real nos builds `development` e `preview`.
- **Otimização de Banda & Storage**: Redimensionamento e compressão client-side para JPEG (`1080px` para peças, `500px` para avatares) em [`src/lib/imagens.ts`](./src/lib/imagens.ts) antes do upload ao bucket `fotos-pecas`.
- **TypeScript Strict**: Tipagem estrita (`strict: true`) validada com `npx tsc --noEmit`.

### Estrutura do Projeto

```text
brecho-app/
├── App.tsx                         # Navegação (Stack + Bottom Tabs), deep linking e handler de push
├── app.json                        # Configuração Expo, permissões, scheme e plugins
├── eas.json                        # Perfis EAS Build (development e preview APK)
├── Breche-Documentacao-do-App.pdf  # Documentação editorial completa (6 páginas)
├── assets/                         # Ícones, splash screen e identidade visual
└── src/
    ├── theme.ts                    # Tokens de cor, tipografia, espaçamento e raios
    ├── lib/
    │   ├── supabase.ts             # Cliente Supabase com sessão persistente
    │   ├── notificacoes.ts         # Push tokens, canal Android, listeners e envio via Expo Push API
    │   └── imagens.ts              # Compressão e redimensionamento de fotos
    └── screens/                    # 14 telas (SwipeFeed, CadastroPeca, Matches, Mensagens, Chat, Perfil, etc.)
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Mobile & UI** | Expo `~57.0.28`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3` |
| **Navegação & Gestos** | React Navigation v7 (Native Stack + Bottom Tabs), `react-native-deck-swiper` |
| **Backend & Tempo Real** | Supabase (`@supabase/supabase-js` — Auth, PostgreSQL + RPC, Realtime, Storage, RLS) |
| **Recursos Nativos** | `expo-location`, `expo-image-picker`, `expo-image-manipulator`, `expo-linking`, `expo-notifications`, `expo-device`, `expo-constants` |
| **Fontes & Design** | `@expo-google-fonts/playfair-display`, `@expo-google-fonts/inter`, `@expo/vector-icons` |
| **Build & Entrega** | EAS Build (`development` e `preview` Android APK) + Firebase Cloud Messaging (FCM v1) |

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
- Node.js 20+
- Conta e projeto no [Supabase](https://supabase.com)
- App **Expo Go** no celular (para testar fluxos gerais) ou build Android via EAS (para testar push notifications)

### Passo a passo

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone https://github.com/renatoabmsom05-ops/breche-app.git
   cd breche-app
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Preencha o `.env` com a URL e a *Anon Key* pública do seu projeto Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica-aqui
   ```

3. **Configure o banco no Supabase:**
   - Crie as tabelas `usuarios`, `pecas`, `interesses`, `mensagens`, `avaliacoes` e `salvos`, a função RPC `pecas_proximas(lat, lng, raio_km)` e o bucket público `fotos-pecas`.
   - Habilite o **Realtime** na tabela `mensagens` e configure as políticas de **RLS**.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npx expo start
   ```

5. **Para testar Notificações Push no Android (build nativo):**
   - Adicione seu próprio `google-services.json` (Firebase Android com package `com.breche.app`) na raiz local (ignorado pelo Git) ou configure `GOOGLE_SERVICES_JSON` como *Secret File* no painel do EAS.
   - Suba a chave privada FCM v1 via `npx eas-cli@latest credentials` e gere o build com `npx eas-cli@latest build --profile preview --platform android`.

---

## 📲 Testar no Android (APK)

Você pode instalar o aplicativo diretamente em um dispositivo Android baixando o arquivo `.apk` publicado na aba **[Releases](../../releases)** deste repositório *(tag `v1.0.0`)*.

---

## 👥 Autores & Licença

- **Desenvolvimento e Arquitetura:** Renato César
- **Idealização e Curadoria de Moda Circular:** Létz Pinheiro

**Todos os direitos reservados** — código disponibilizado publicamente apenas para fins de portfólio e avaliação técnica. Veja o arquivo [`LICENSE`](./LICENSE) para mais detalhes.
