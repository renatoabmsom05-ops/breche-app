import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Share,
  Animated,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import * as Location from 'expo-location';
import * as ExpoLinking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { enviarNotificacao } from '../lib/notificacoes';
import { colors, fonts, spacing, radius } from '../theme';

type Peca = {
  id: string;
  titulo: string;
  categoria: string;
  tamanho: string;
  marca: string | null;
  estado_peca: string | null;
  tipo: 'venda' | 'troca' | 'ambos';
  preco: number;
  fotos: string[];
  dono_id: string;
  dono_nome: string | null;
  distancia_km: number;
};

function iniciais(nome: string | null) {
  if (!nome) return '??';
  const partes = nome.trim().split(' ');
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}

export default function SwipeFeedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const swiperRef = useRef<any>(null);
  const [fotosAbertas, setFotosAbertas] = useState<string[] | null>(null);
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [semMaisCards, setSemMaisCards] = useState(false);
  const [versaoFeed, setVersaoFeed] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [erroFeed, setErroFeed] = useState<string | null>(null);
  const [cardAtual, setCardAtual] = useState(0);
  const [alturaDeck, setAlturaDeck] = useState(0);

  // Efeito de "coração explodindo" ao curtir
  const coracaoEscala = useRef(new Animated.Value(0.3)).current;
  const coracaoOpacidade = useRef(new Animated.Value(0)).current;

  function dispararCoracao() {
    coracaoEscala.setValue(0.3);
    coracaoOpacidade.setValue(1);
    Animated.parallel([
      Animated.timing(coracaoEscala, { toValue: 1.8, duration: 650, useNativeDriver: true }),
      Animated.timing(coracaoOpacidade, {
        toValue: 0,
        duration: 650,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function aoPuxarAtualizar() {
    setAtualizando(true);
    await buscarPecas();
    setAtualizando(false);
  }

  useEffect(() => {
    carregarFeed();
  }, []);

  async function buscarPecas() {
    setErroFeed(null);
    setCardAtual(0);
    const { status } = await Location.requestForegroundPermissionsAsync();
    let lat = -18.9186;
    let lng = -48.2772;
    if (status === 'granted') {
      const local = await Location.getCurrentPositionAsync({});
      lat = local.coords.latitude;
      lng = local.coords.longitude;
    }
    const { data, error } = await supabase.rpc('pecas_proximas', { lat, lng, raio_km: 30 });
    if (error) {
      setErroFeed('Não foi possível carregar as peças. Tente novamente.');
    } else {
      setPecas((data as Peca[]) ?? []);
    }
    setSemMaisCards(false);
    setVersaoFeed((v) => v + 1);
  }

  async function carregarFeed() {
    setCarregando(true);
    await buscarPecas();
    setCarregando(false);
  }

  async function compartilharPeca(peca: Peca) {
    const link = ExpoLinking.createURL(`peca/${peca.id}`);
    const precoTexto = peca.tipo === 'troca' ? 'troca' : `R$ ${peca.preco?.toFixed(0)}`;
    try {
      await Share.share({
        message: `Olha essa peça no Breché: "${peca.titulo}" (${precoTexto})\n${link}`,
      });
    } catch (erro) {
      // usuário cancelou o compartilhamento, sem problema
    }
  }

  async function curtir(peca: Peca) {
    dispararCoracao();
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) return;
    await supabase.from('interesses').insert({ usuario_id: usuarioId, peca_id: peca.id });
    if (peca.dono_id && peca.dono_id !== usuarioId) {
      enviarNotificacao(
        peca.dono_id,
        'Alguém curtiu sua peça! ❤️',
        `Sua peça "${peca.titulo}" recebeu um novo interesse.`
      );
    }
  }

  async function salvar(peca: Peca) {
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) return;
    await supabase.from('salvos').upsert({ usuario_id: usuarioId, peca_id: peca.id });
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  if (erroFeed) {
    return (
      <View style={styles.centro}>
        <Text style={styles.vazioTexto}>{erroFeed}</Text>
        <TouchableOpacity onPress={carregarFeed} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyMedium }}>
            Tentar novamente
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.logo}>
          Breché<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <TouchableOpacity style={styles.localBadge} onPress={aoPuxarAtualizar} disabled={atualizando}>
          {atualizando ? (
            <ActivityIndicator size="small" color={colors.textSecondary} style={{ paddingVertical: 2 }} />
          ) : (
            <Text style={styles.localBadgeTexto}>📍 Perto de você</Text>
          )}
        </TouchableOpacity>
      </View>

      {pecas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.vazioTexto}>Nenhuma peça por perto ainda.</Text>
          <TouchableOpacity onPress={aoPuxarAtualizar} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyMedium }}>
              Recarregar
            </Text>
          </TouchableOpacity>
        </View>
      ) : semMaisCards ? (
        <View style={styles.centro}>
          <Text style={styles.vazioTexto}>👕 Você já viu tudo por perto!</Text>
          <TouchableOpacity onPress={aoPuxarAtualizar} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyMedium, textAlign: 'center' }}>
              Toque em "📍 Perto de você", no topo, pra procurar de novo
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.swiperArea}
          onLayout={(e) => {
            const h = Math.floor(e.nativeEvent.layout.height);
            if (h > 0 && Math.abs(h - alturaDeck) > 2) {
              setAlturaDeck(h);
            }
          }}
        >
          {alturaDeck > 0 && (
            <Swiper
              key={versaoFeed}
              ref={swiperRef}
              cards={pecas}
              renderCard={(peca: Peca) => {
                if (!peca) return null;
                return (
                  <View style={styles.card}>
                    <View style={styles.imagemBox}>
                      <Image source={{ uri: peca.fotos?.[0] }} style={styles.imagem} />

                      {peca.fotos?.length > 1 && (
                        <View style={styles.dotsRow}>
                          {peca.fotos.map((_, i) => (
                            <View key={i} style={[styles.dot, i === 0 && styles.dotAtivo]} />
                          ))}
                        </View>
                      )}

                      {peca.fotos?.length > 1 && (
                        <TouchableOpacity
                          style={styles.verFotosBtn}
                          onPress={() => {
                            setFotosAbertas(peca.fotos);
                            setIndiceFoto(0);
                          }}
                        >
                          <Text style={styles.verFotosTexto}>Ver fotos</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.compartilharBtn}
                        onPress={() => compartilharPeca(peca)}
                      >
                        <Text style={styles.compartilharTexto}>📤</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.infoBox}>
                      <View style={styles.tituloRow}>
                        <Text style={styles.titulo} numberOfLines={1}>
                          {peca.titulo}
                        </Text>
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
                            style={[
                              styles.badgeTexto,
                              { color: peca.tipo === 'troca' ? colors.black : colors.white },
                            ]}
                          >
                            {peca.tipo === 'troca'
                              ? 'TROCA'
                              : peca.tipo === 'ambos'
                              ? 'TROCA/VENDA'
                              : 'VENDA'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.metadados}>
                        {[peca.marca || 'Sem marca', `Tam ${peca.tamanho}`, peca.estado_peca]
                          .filter(Boolean)
                          .join('  •  ')}
                      </Text>

                      {peca.tipo !== 'troca' && (
                        <Text style={styles.preco}>R$ {peca.preco?.toFixed(0)}</Text>
                      )}

                      <View style={styles.vendedorRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTexto}>{iniciais(peca.dono_nome)}</Text>
                        </View>
                        <Text style={styles.vendedorNome} numberOfLines={1}>
                          {peca.dono_nome ?? 'Vendedor'}
                        </Text>
                        <Text style={styles.distancia}>· {peca.distancia_km?.toFixed(1)} km</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              onSwipedRight={(index) => curtir(pecas[index])}
              onSwiped={(index) => setCardAtual(index + 1)}
              backgroundColor="transparent"
              stackSize={2}
              stackSeparation={8}
              cardStyle={{ height: Math.max(alturaDeck - 12, 280) }}
              cardVerticalMargin={0}
              cardIndex={0}
              onSwipedAll={() => setSemMaisCards(true)}
              overlayLabels={{
                left: {
                  title: 'PULAR',
                  style: {
                    label: {
                      backgroundColor: colors.black,
                      color: colors.white,
                      fontFamily: fonts.headingBold,
                      fontSize: 22,
                      borderRadius: radius.sm,
                      padding: 8,
                      overflow: 'hidden',
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      marginTop: 24,
                      marginLeft: -24,
                    },
                  },
                },
                right: {
                  title: 'GOSTEI',
                  style: {
                    label: {
                      backgroundColor: colors.accent,
                      color: colors.black,
                      fontFamily: fonts.headingBold,
                      fontSize: 22,
                      borderRadius: radius.sm,
                      padding: 8,
                      overflow: 'hidden',
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      marginTop: 24,
                      marginLeft: 24,
                    },
                  },
                },
              }}
            />
          )}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.coracaoExplosao,
              { opacity: coracaoOpacidade, transform: [{ scale: coracaoEscala }] },
            ]}
          >
            <Text style={styles.coracaoExplosaoTexto}>❤️</Text>
          </Animated.View>
        </View>
      )}

      {pecas.length > 0 && !semMaisCards && (
        <View style={styles.acoesRow}>
          <TouchableOpacity
            style={[styles.acaoBtn, styles.acaoBtnBorda]}
            onPress={() => swiperRef.current?.swipeLeft()}
          >
            <Text style={styles.acaoIconeX}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acaoBtn, { backgroundColor: colors.accent }]}
            onPress={() => swiperRef.current?.swipeRight()}
          >
            <Text style={styles.acaoIconeCoracao}>♥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acaoBtn, styles.acaoBtnBorda]}
            onPress={() => pecas[cardAtual] && salvar(pecas[cardAtual])}
          >
            <Text style={styles.acaoIconeEstrela}>★</Text>
          </TouchableOpacity>
        </View>
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

          <View style={styles.modalDotsRow}>
            {fotosAbertas?.map((_, i) => (
              <View key={i} style={[styles.modalDot, i === indiceFoto && styles.modalDotAtivo]} />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vazioTexto: { fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  logo: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.black },
  localBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  localBadgeTexto: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  swiperArea: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  imagemBox: { flex: 1, position: 'relative' },
  imagem: { width: '100%', height: '100%' },
  dotsRow: { position: 'absolute', top: spacing.md, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotAtivo: { backgroundColor: colors.white, width: 8, height: 8, borderRadius: 4 },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compartilharTexto: { fontSize: 14 },
  infoBox: { paddingHorizontal: spacing.md, paddingVertical: 14 },
  tituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.black, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, marginLeft: spacing.sm },
  badgeTexto: { fontFamily: fonts.bodyBold, fontSize: 11 },
  metadados: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  preco: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black, marginTop: 6 },
  vendedorRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarTexto: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.black },
  vendedorNome: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, flexShrink: 1 },
  distancia: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  coracaoExplosao: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coracaoExplosaoTexto: { fontSize: 110 },
  acoesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.lg,
    zIndex: 10,
    elevation: 10,
  },
  acaoBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    elevation: 10,
  },
  acaoBtnBorda: { borderWidth: 1, borderColor: colors.border },
  acaoIconeX: { fontSize: 22, color: colors.textSecondary },
  acaoIconeCoracao: { fontSize: 24, color: colors.white },
  acaoIconeEstrela: { fontSize: 22, color: colors.star },
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
