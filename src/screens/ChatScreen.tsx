import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { enviarNotificacao } from '../lib/notificacoes';
import { colors, fonts, spacing, radius } from '../theme';

// navigation.navigate('Chat', { interesseId: '...' })
export default function ChatScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { interesseId } = route.params;
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [meuId, setMeuId] = useState<string | null>(null);
  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [outroParticipanteId, setOutroParticipanteId] = useState<string | null>(null);
  const [tituloPeca, setTituloPeca] = useState('');

  const [souComprador, setSouComprador] = useState(false);
  const [jaAvaliei, setJaAvaliei] = useState(false);
  const [modalAvaliarVisivel, setModalAvaliarVisivel] = useState(false);
  const [notaEscolhida, setNotaEscolhida] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meuIdAtual = data.user?.id ?? null;
      setMeuId(meuIdAtual);

      if (meuIdAtual) {
        const { data: meuPerfil } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('id', meuIdAtual)
          .single();
        setMeuNome(meuPerfil?.nome ?? null);
      }

      const { data: interesse } = await supabase
        .from('interesses')
        .select('usuario_id, pecas(dono_id, titulo)')
        .eq('id', interesseId)
        .single();

      if (interesse) {
        const donoId = (interesse.pecas as any)?.dono_id;
        setTituloPeca((interesse.pecas as any)?.titulo ?? '');
        setOutroParticipanteId(
          meuIdAtual === interesse.usuario_id ? donoId : interesse.usuario_id
        );
        setSouComprador(meuIdAtual === interesse.usuario_id);

        const { data: avaliacaoExistente } = await supabase
          .from('avaliacoes')
          .select('id')
          .eq('interesse_id', interesseId)
          .maybeSingle();
        setJaAvaliei(!!avaliacaoExistente);
      }
    })();

    carregarMensagens();

    const canal = supabase
      .channel(`mensagens-${interesseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `interesse_id=eq.${interesseId}`,
        },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [interesseId]);

  async function carregarMensagens() {
    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .eq('interesse_id', interesseId)
      .order('criado_em', { ascending: true });
    setMensagens(data ?? []);
  }

  async function enviar() {
    const textoLimpo = texto.trim();
    if (!textoLimpo || !meuId) return;

    const ehPrimeiraMensagem = mensagens.length === 0;
    setTexto('');

    const { error } = await supabase.from('mensagens').insert({
      interesse_id: interesseId,
      remetente_id: meuId,
      texto: textoLimpo,
    });

    if (error) {
      Alert.alert('Erro ao enviar mensagem', error.message);
      setTexto(textoLimpo);
      return;
    }

    if (outroParticipanteId) {
      const nomePeca = tituloPeca || 'sua peça';
      const remetente = meuNome?.trim();
      const tituloNotificacao = ehPrimeiraMensagem
        ? souComprador
          ? `Alguém perguntou sobre "${nomePeca}" 💬`
          : `Nova conversa sobre "${nomePeca}" 💬`
        : tituloPeca || 'Nova mensagem 💬';
      const corpoNotificacao = ehPrimeiraMensagem
        ? remetente
          ? `${remetente}: ${textoLimpo}`
          : `Tem alguém perguntando da peça: "${textoLimpo}"`
        : remetente
        ? `${remetente}: ${textoLimpo}`
        : textoLimpo;

      enviarNotificacao(outroParticipanteId, tituloNotificacao, corpoNotificacao, { interesseId });
    }
  }

  async function enviarAvaliacao() {
    if (notaEscolhida === 0) {
      Alert.alert('Escolha de 1 a 5 estrelas antes de enviar.');
      return;
    }
    setEnviandoAvaliacao(true);
    const { error } = await supabase.from('avaliacoes').insert({
      interesse_id: interesseId,
      avaliador_id: meuId,
      avaliado_id: outroParticipanteId,
      nota: notaEscolhida,
      comentario: comentarioAvaliacao || null,
    });
    setEnviandoAvaliacao(false);

    if (error) {
      Alert.alert('Erro ao avaliar', error.message);
      return;
    }
    setJaAvaliei(true);
    setModalAvaliarVisivel(false);
    Alert.alert('Obrigado!', 'Sua avaliação foi enviada.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {souComprador && !jaAvaliei && (
        <TouchableOpacity
          style={styles.avaliarBanner}
          onPress={() => setModalAvaliarVisivel(true)}
        >
          <Text style={styles.avaliarBannerTexto}>⭐ Avaliar vendedor desta negociação</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={mensagens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bolha,
              item.remetente_id === meuId ? styles.bolhaMinha : styles.bolhaOutro,
            ]}
          >
            <Text
              style={[
                styles.bolhaTexto,
                { color: item.remetente_id === meuId ? colors.white : colors.textPrimary },
              ]}
            >
              {item.texto}
            </Text>
          </View>
        )}
      />
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          style={styles.input}
          placeholder="Digite uma mensagem"
          placeholderTextColor={colors.placeholder}
          value={texto}
          onChangeText={setTexto}
        />
        <TouchableOpacity style={styles.botaoEnviar} onPress={enviar}>
          <Text style={styles.botaoEnviarTexto}>Enviar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalAvaliarVisivel} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <Text style={styles.modalTitulo}>Como foi a negociação?</Text>
            <Text style={styles.modalSubtitulo}>{tituloPeca}</Text>

            <View style={styles.estrelasRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setNotaEscolhida(n)}>
                  <Text style={[styles.estrela, n <= notaEscolhida && styles.estrelaAtiva]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.comentarioInput}
              placeholder="Comentário (opcional)"
              placeholderTextColor={colors.placeholder}
              value={comentarioAvaliacao}
              onChangeText={setComentarioAvaliacao}
              multiline
              numberOfLines={3}
            />

            {enviandoAvaliacao ? (
              <ActivityIndicator color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <TouchableOpacity style={styles.botaoEnviarAvaliacao} onPress={enviarAvaliacao}>
                <Text style={styles.botaoEnviarAvaliacaoTexto}>Enviar avaliação</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ marginTop: spacing.md, alignItems: 'center' }}
              onPress={() => setModalAvaliarVisivel(false)}
            >
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Agora não</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  avaliarBanner: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  avaliarBannerTexto: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.black },
  bolha: { padding: spacing.sm, borderRadius: radius.md, marginVertical: 4, maxWidth: '75%' },
  bolhaMinha: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  bolhaOutro: { backgroundColor: colors.card, alignSelf: 'flex-start' },
  bolhaTexto: { fontFamily: fonts.body, fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    fontFamily: fonts.body,
  },
  botaoEnviar: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  botaoEnviarTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13 },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCartao: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  modalTitulo: { fontFamily: fonts.headingBold, fontSize: 19, color: colors.black, textAlign: 'center' },
  modalSubtitulo: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  estrelasRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.sm },
  estrela: { fontSize: 36, color: colors.border, marginHorizontal: 4 },
  estrelaAtiva: { color: colors.star },
  comentarioInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    height: 80,
    textAlignVertical: 'top',
  },
  botaoEnviarAvaliacao: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  botaoEnviarAvaliacaoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 15 },
});
