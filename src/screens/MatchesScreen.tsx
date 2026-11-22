import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

function corBadgeTipo(tipo?: string) {
  if (tipo === 'troca') return { bg: colors.accent, texto: colors.black, label: 'TROCA' };
  if (tipo === 'ambos') return { bg: colors.black, texto: colors.white, label: 'TROCA/VENDA' };
  return { bg: colors.venda, texto: colors.white, label: 'VENDA' };
}

export default function MatchesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<'curtidas' | 'salvos'>('curtidas');
  const [curtidas, setCurtidas] = useState<any[]>([]);
  const [salvos, setSalvos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [fotosAbertas, setFotosAbertas] = useState<string[] | null>(null);
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [larguraSwitch, setLarguraSwitch] = useState(0);

  const abaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(abaAnim, {
      toValue: aba === 'salvos' ? 1 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [aba]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setCarregando(true);
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) {
      setCarregando(false);
      return;
    }

    const { data: dataCurtidas } = await supabase
      .from('interesses')
      .select('id, criado_em, pecas(id, titulo, fotos, preco, tipo)')
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false });
    setCurtidas(dataCurtidas ?? []);

    try {
      const { data: dataSalvos, error } = await supabase
        .from('salvos')
        .select('id, criado_em, pecas(id, titulo, fotos, preco, tipo)')
        .eq('usuario_id', usuarioId)
        .order('criado_em', { ascending: false });
      setSalvos(error ? [] : dataSalvos ?? []);
    } catch {
      setSalvos([]);
    }

    setCarregando(false);
  }

  const larguraAba = Math.max((larguraSwitch - 8) / 2, 0);
  const indicadorX = abaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, larguraAba],
  });

  const listaAtual = aba === 'curtidas' ? curtidas : salvos;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.tituloTop}>
        Seus <Text style={{ color: colors.accent }}>Matches</Text>
      </Text>
      <Text style={styles.subtitulo}>
        {aba === 'curtidas'
          ? `${curtidas.length} ${curtidas.length === 1 ? 'combinação' : 'combinações'}`
          : `${salvos.length} ${salvos.length === 1 ? 'peça salva' : 'peças salvas'}`}
      </Text>

      <View
        style={styles.switchContainer}
        onLayout={(e) => setLarguraSwitch(e.nativeEvent.layout.width)}
      >
        {larguraAba > 0 && (
          <Animated.View
            style={[
              styles.switchIndicador,
              { width: larguraAba, transform: [{ translateX: indicadorX }] },
            ]}
          />
        )}
        <TouchableOpacity
          style={styles.switchAba}
          activeOpacity={0.8}
          onPress={() => setAba('curtidas')}
        >
          <Text style={[styles.switchTexto, aba === 'curtidas' && styles.switchTextoAtivo]}>
            Curtidas ❤️
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchAba}
          activeOpacity={0.8}
          onPress={() => setAba('salvos')}
        >
          <Text style={[styles.switchTexto, aba === 'salvos' && styles.switchTextoAtivo]}>
            Salvos ★
          </Text>
        </TouchableOpacity>
      </View>

      {!carregando && listaAtual.length === 0 ? (
        <View style={styles.vazioCentro}>
          <Text style={[styles.coracaoGrande, aba === 'salvos' && { color: colors.star }]}>
            {aba === 'curtidas' ? '♥' : '★'}
          </Text>
          <Text style={styles.vazioTitulo}>
            {aba === 'curtidas' ? 'Nenhum match ainda' : 'Nenhuma peça salva ainda'}
          </Text>
          <Text style={styles.vazioTexto}>
            {aba === 'curtidas'
              ? 'Continue curtindo as peças no Explorar pra encontrar seus matches!'
              : 'Toque na estrela ★ nas peças que você amar para salvar e chamar o vendedor!'}
          </Text>
          <TouchableOpacity
            style={styles.botaoExplorar}
            onPress={() => navigation.navigate('Explorar')}
          >
            <Text style={styles.botaoExplorarTexto}>Explorar peças</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listaAtual}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          renderItem={({ item }) => {
            const badge = corBadgeTipo(item.pecas?.tipo);
            const precoTexto =
              item.pecas?.tipo === 'troca'
                ? 'Troca'
                : `R$ ${item.pecas?.preco?.toFixed(0) ?? '0'}`;

            return (
              <TouchableOpacity
                style={styles.linha}
                onPress={() => {
                  setFotosAbertas(item.pecas?.fotos ?? []);
                  setIndiceFoto(0);
                }}
              >
                <Image source={{ uri: item.pecas?.fotos?.[0] }} style={styles.linhaFoto} />
                <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
                  <Text style={styles.linhaTitulo} numberOfLines={1}>
                    {item.pecas?.titulo}
                  </Text>
                  <View style={styles.linhaMetaRow}>
                    <View style={[styles.miniBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.miniBadgeTexto, { color: badge.texto }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <Text style={styles.linhaSub}>{precoTexto}</Text>
                  </View>
                </View>

                {aba === 'curtidas' ? (
                  <TouchableOpacity
                    style={styles.acaoPill}
                    onPress={() => navigation.navigate('Chat', { interesseId: item.id })}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color={colors.accent} />
                    <Text style={styles.acaoPillTexto}>Chat</Text>
                  </TouchableOpacity>
                ) : (
                  item.pecas?.id && (
                    <TouchableOpacity
                      style={styles.acaoPill}
                      onPress={() => navigation.navigate('PecaDetalhe', { id: item.pecas.id })}
                    >
                      <Ionicons name="eye-outline" size={14} color={colors.accent} />
                      <Text style={styles.acaoPillTexto}>Ver</Text>
                    </TouchableOpacity>
                  )
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

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
              const novoIndice = Math.round(
                e.nativeEvent.contentOffset.x / Dimensions.get('window').width
              );
              setIndiceFoto(novoIndice);
            }}
          >
            {fotosAbertas?.map((uri, i) => (
              <View key={i} style={styles.modalPagina}>
                <Image source={{ uri }} style={styles.modalImagem} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {fotosAbertas && fotosAbertas.length > 1 && (
            <View style={styles.modalDotsRow}>
              {fotosAbertas.map((_, i) => (
                <View key={i} style={[styles.modalDot, i === indiceFoto && styles.modalDotAtivo]} />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tituloTop: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.black, paddingHorizontal: spacing.lg },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: 4 },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  switchIndicador: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: colors.black,
    borderRadius: radius.pill,
  },
  switchAba: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  switchTexto: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary },
  switchTextoAtivo: { color: colors.white },
  vazioCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  coracaoGrande: { fontSize: 48, color: colors.accent, marginBottom: spacing.md },
  vazioTitulo: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black, marginBottom: spacing.sm },
  vazioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  botaoExplorar: { backgroundColor: colors.black, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  botaoExplorarTexto: { fontFamily: fonts.bodyBold, color: colors.white },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  linhaFoto: { width: 58, height: 58, borderRadius: radius.sm },
  linhaTitulo: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  linhaMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  miniBadgeTexto: { fontFamily: fonts.bodyBold, fontSize: 9 },
  linhaSub: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  acaoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.black,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  acaoPillTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
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
