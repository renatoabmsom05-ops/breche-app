import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { enviarNotificacao } from '../lib/notificacoes';
import { colors, fonts, spacing, radius } from '../theme';

function iniciais(nome: string | null) {
  if (!nome) return '??';
  const partes = nome.trim().split(' ');
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}

// navigation.navigate('PecaDetalhe', { id: '...' })
// Também é aberta automaticamente quando alguém toca num link compartilhado.
export default function PecaDetalheScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;

  const [carregando, setCarregando] = useState(true);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [peca, setPeca] = useState<any>(null);
  const [interesseId, setInteresseId] = useState<string | null>(null);
  const [mediaVendedor, setMediaVendedor] = useState<number | null>(null);
  const [totalAvalVendedor, setTotalAvalVendedor] = useState(0);
  const [enviandoInteresse, setEnviandoInteresse] = useState(false);
  const [fotosAbertas, setFotosAbertas] = useState<string[] | null>(null);
  const [indiceFoto, setIndiceFoto] = useState(0);

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    setCarregando(true);
    setInteresseId(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUsuarioId(uid);
    setLogado(!!uid);

    const { data } = await supabase
      .from('pecas')
      .select('*, usuarios(nome, foto_url, instagram)')
      .eq('id', id)
      .single();
    setPeca(data);

    if (data?.dono_id) {
      const { data: avaliacoes } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('avaliado_id', data.dono_id);
      if (avaliacoes && avaliacoes.length > 0) {
        const soma = avaliacoes.reduce((acc, a) => acc + a.nota, 0);
        setMediaVendedor(soma / avaliacoes.length);
        setTotalAvalVendedor(avaliacoes.length);
      } else {
        setMediaVendedor(null);
        setTotalAvalVendedor(0);
      }
    }

    if (uid && data) {
      const { data: interesse } = await supabase
        .from('interesses')
        .select('id')
        .eq('usuario_id', uid)
        .eq('peca_id', data.id)
        .maybeSingle();
      setInteresseId(interesse?.id ?? null);
    }

    setCarregando(false);
  }

  async function marcarInteresse() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? usuarioId;
    if (!uid || !peca || peca.dono_id === uid || enviandoInteresse) return;

    setEnviandoInteresse(true);
    const { data: existente } = await supabase
      .from('interesses')
      .select('id')
      .eq('usuario_id', uid)
      .eq('peca_id', peca.id)
      .maybeSingle();

    let idFinal = existente?.id ?? null;
    if (!idFinal) {
      const { data: novo, error } = await supabase
        .from('interesses')
        .insert({ usuario_id: uid, peca_id: peca.id })
        .select('id')
        .single();

      if (error || !novo?.id) {
        setEnviandoInteresse(false);
        Alert.alert('Erro', error?.message ?? 'Não foi possível registrar seu interesse.');
        return;
      }
      idFinal = novo.id;

      const tituloLimpo = peca.titulo?.trim() || 'sua peça';
      enviarNotificacao(
        peca.dono_id,
        'Alguém curtiu sua peça! ❤️',
        `Sua peça "${tituloLimpo}" recebeu um novo interesse.`,
        { interesseId: idFinal }
      );
    }

    setInteresseId(idFinal);
    setEnviandoInteresse(false);
  }

  function abrirInstagram() {
    const handle = peca?.usuarios?.instagram?.trim().replace(/^@/, '');
    if (!handle) return;
    Linking.openURL(`https://instagram.com/${handle}`).catch(() =>
      Alert.alert('Não foi possível abrir o Instagram')
    );
  }

  async function compartilhar() {
    if (!peca) return;
    const link = ExpoLinking.createURL(`peca/${peca.id}`);
    const precoTexto = peca.tipo === 'troca' ? 'troca' : `R$ ${peca.preco?.toFixed(0)}`;
    try {
      await Share.share({
        message: `Olha essa peça no Breché: "${peca.titulo}" (${precoTexto})\n${link}`,
      });
    } catch {
      // cancelado, sem problema
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  if (!logado) {
    return (
      <View style={[styles.centro, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.semLoginEmoji}>👋</Text>
        <Text style={styles.semLoginTitulo}>Entre no Breché pra ver essa peça</Text>
        <TouchableOpacity
          style={styles.botaoPreto}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={styles.botaoPretoTexto}>Fazer login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!peca) {
    return (
      <View style={styles.centro}>
        <Text style={styles.semLoginEmoji}>🔍</Text>
        <Text style={styles.semLoginTitulo}>Essa peça não existe mais.</Text>
      </View>
    );
  }

  const instagramLimpo = peca.usuarios?.instagram?.trim().replace(/^@/, '');
  const ehMinhaPeca = peca.dono_id === usuarioId;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      <View style={styles.imagemBox}>
        <Image source={{ uri: peca.fotos?.[0] }} style={styles.imagem} />
        {peca.fotos?.length > 1 && (
          <TouchableOpacity
            style={styles.verFotosBtn}
            onPress={() => {
              setFotosAbertas(peca.fotos);
              setIndiceFoto(0);
            }}
          >
            <Text style={styles.verFotosTexto}>Ver fotos ({peca.fotos.length})</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.compartilharBtn} onPress={compartilhar}>
          <Ionicons name="share-outline" size={18} color={colors.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.conteudo}>
        <View style={styles.tituloRow}>
          <Text style={styles.titulo}>{peca.titulo}</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  peca.tipo === 'troca'
                    ? colors.accent
                    : peca.tipo === 'ambos'
                    ? colors.black
                    : colors.venda,
              },
            ]}
          >
            <Text
              style={[styles.badgeTexto, { color: peca.tipo === 'troca' ? colors.black : colors.white }]}
            >
              {peca.tipo === 'troca' ? 'TROCA' : peca.tipo === 'ambos' ? 'TROCA/VENDA' : 'VENDA'}
            </Text>
          </View>
        </View>

        <Text style={styles.metadados}>
          {[peca.marca || 'Sem marca', `Tam ${peca.tamanho}`, peca.estado_peca].filter(Boolean).join('  •  ')}
        </Text>

        {peca.tipo !== 'troca' && <Text style={styles.preco}>R$ {peca.preco?.toFixed(0)}</Text>}

        {peca.status === 'vendido' && (
          <View style={styles.avisoVendido}>
            <Text style={styles.avisoVendidoTexto}>Essa peça já foi vendida/trocada</Text>
          </View>
        )}

        {!!peca.observacao && (
          <View style={styles.observacaoBox}>
            <Text style={styles.observacaoTitulo}>Observações</Text>
            <Text style={styles.observacaoTexto}>{peca.observacao}</Text>
          </View>
        )}

        <View style={styles.vendedorCard}>
          <View style={styles.avatar}>
            {peca.usuarios?.foto_url ? (
              <Image source={{ uri: peca.usuarios.foto_url }} style={styles.avatarFoto} />
            ) : (
              <Text style={styles.avatarTexto}>{iniciais(peca.usuarios?.nome)}</Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.vendedorNome}>{peca.usuarios?.nome ?? 'Vendedor'}</Text>
            <View style={styles.vendedorMetaRow}>
              {mediaVendedor !== null && (
                <Text style={styles.vendedorNota}>
                  ⭐ {mediaVendedor.toFixed(1)} ({totalAvalVendedor})
                </Text>
              )}
              {!!instagramLimpo && (
                <TouchableOpacity style={styles.instaPill} onPress={abrirInstagram}>
                  <Ionicons name="logo-instagram" size={12} color={colors.black} />
                  <Text style={styles.instaTexto}>@{instagramLimpo}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {peca.status !== 'vendido' &&
          (ehMinhaPeca ? (
            <View style={styles.minhaPecaAviso}>
              <Text style={styles.minhaPecaTexto}>✨ Esta peça faz parte do seu guarda-roupa</Text>
            </View>
          ) : interesseId ? (
            <View style={{ marginTop: spacing.xl }}>
              <TouchableOpacity
                style={styles.botaoConversa}
                onPress={() => navigation.navigate('Chat', { interesseId })}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.accent} />
                <Text style={styles.botaoPretoTexto}>Abrir conversa</Text>
              </TouchableOpacity>
              <Text style={styles.subtituloCurtiu}>✓ Você já curtiu essa peça</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.botaoPreto}
              onPress={marcarInteresse}
              disabled={enviandoInteresse}
            >
              {enviandoInteresse ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.botaoPretoTexto}>❤️ Tenho interesse</Text>
              )}
            </TouchableOpacity>
          ))}
      </View>

      <Modal visible={!!fotosAbertas} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <TouchableOpacity style={styles.modalFechar} onPress={() => setFotosAbertas(null)}>
            <Text style={styles.modalFecharTexto}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const novoIndice = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setIndiceFoto(novoIndice);
            }}
          >
            {fotosAbertas?.map((uri, i) => (
              <View key={i} style={styles.modalPagina}>
                <Image source={{ uri }} style={styles.modalImagem} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalDotsRow}>
            {fotosAbertas?.map((_, i) => (
              <View key={i} style={[styles.modalDot, i === indiceFoto && styles.modalDotAtivo]} />
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  semLoginEmoji: { fontSize: 48, marginBottom: spacing.md },
  semLoginTitulo: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.black, textAlign: 'center', marginBottom: spacing.lg },
  imagemBox: { width: '100%', height: 420, position: 'relative' },
  imagem: { width: '100%', height: '100%' },
  verFotosBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  verFotosTexto: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.black },
  compartilharBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { padding: spacing.lg },
  tituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo: { flex: 1, fontFamily: fonts.headingBold, fontSize: 22, color: colors.black, marginRight: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeTexto: { fontFamily: fonts.bodyBold, fontSize: 11 },
  metadados: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },
  preco: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.black, marginTop: spacing.sm },
  avisoVendido: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  avisoVendidoTexto: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  observacaoBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  observacaoTitulo: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  observacaoTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  vendedorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFoto: { width: '100%', height: '100%' },
  avatarTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.black },
  vendedorNome: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  vendedorMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vendedorNota: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  instaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  instaTexto: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.black },
  minhaPecaAviso: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  minhaPecaTexto: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  botaoPreto: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  botaoConversa: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPretoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
  subtituloCurtiu: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalFechar: {
    position: 'absolute',
    top: 48,
    right: spacing.lg,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFecharTexto: { color: colors.white, fontSize: 18 },
  modalPagina: { width: Dimensions.get('window').width, alignItems: 'center', justifyContent: 'center' },
  modalImagem: { width: '100%', height: '80%' },
  modalDotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  modalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  modalDotAtivo: { backgroundColor: colors.accent },
});
