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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  observacao?: string | null;
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
  const [indiceAtual, setIndiceAtual] = useState(0);
  const desfazendoRef = useRef(false);
  const [atualizando, setAtualizando] = useState(false);
  const [erroFeed, setErroFeed] = useState<string | null>(null);
  const [alturaDeck, setAlturaDeck] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'troca' | 'venda'>('todos');
  const [filtroTamanho, setFiltroTamanho] = useState<string | null>(null);
  const [iconeExplosao, setIconeExplosao] = useState<'❤️' | '⭐'>('❤️');
  const [avisoEstrela, setAvisoEstrela] = useState<{ texto: string; interesseId: string } | null>(
    null
  );
  const timerAvisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Efeito de explosão (coração ou estrela) ao interagir
  const coracaoEscala = useRef(new Animated.Value(0.3)).current;
  const coracaoOpacidade = useRef(new Animated.Value(0)).current;

  function dispararExplosao(icone: '❤️' | '⭐') {
    setIconeExplosao(icone);
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
    return () => {
      if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current);
    };
  }, []);

  async function buscarPecas() {
    setErroFeed(null);
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
    setIndiceAtual(0);
    desfazendoRef.current = false;
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
    if (!peca) return;
    dispararExplosao('❤️');
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) return;

    const { data: existente } = await supabase
      .from('interesses')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('peca_id', peca.id)
      .maybeSingle();

    let interesseId = existente?.id;
    if (!interesseId) {
      const { data: novo } = await supabase
        .from('interesses')
        .insert({ usuario_id: usuarioId, peca_id: peca.id })
        .select('id')
        .single();
      interesseId = novo?.id;
    }

    if (!existente && peca.dono_id && peca.dono_id !== usuarioId) {
      const tituloLimpo = peca.titulo.trim();
      enviarNotificacao(
        peca.dono_id,
        'Alguém curtiu sua peça! ❤️',
        `Sua peça "${tituloLimpo}" recebeu um novo interesse.`,
        interesseId ? { interesseId } : undefined
      );
    }
  }

  async function amarPeca(peca: Peca) {
    if (!peca) return;
    dispararExplosao('⭐');

    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) return;

    // Salva nos favoritos como melhor esforço (sem travar se a tabela salvos não existir)
    try {
      await supabase.from('salvos').upsert({ usuario_id: usuarioId, peca_id: peca.id });
    } catch {
      // ignora erro opcional de salvos
    }

    if (!peca.dono_id || peca.dono_id === usuarioId) return;

    const { data: meuPerfil } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', usuarioId)
      .single();
    const remetente = meuPerfil?.nome?.trim();

    // Garante que exista um interesse/conversa entre o usuário e essa peça
    const { data: interesseExistente } = await supabase
      .from('interesses')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('peca_id', peca.id)
      .maybeSingle();

    let interesseId = interesseExistente?.id;
    if (!interesseId) {
      const { data: novoInteresse, error: erroInteresse } = await supabase
        .from('interesses')
        .insert({ usuario_id: usuarioId, peca_id: peca.id })
        .select('id')
        .single();

      if (erroInteresse || !novoInteresse?.id) {
        Alert.alert('Erro', 'Não foi possível iniciar a conversa com o vendedor.');
        return;
      }
      interesseId = novoInteresse.id;
    }

    const tituloLimpo = peca.titulo.trim();
    const textoAutomatico = `Oi! ⭐ Amei sua peça "${tituloLimpo}"! Ainda está disponível?`;

    const { error: erroMsg } = await supabase.from('mensagens').insert({
      interesse_id: interesseId,
      remetente_id: usuarioId,
      texto: textoAutomatico,
    });

    if (erroMsg) {
      Alert.alert('Erro ao enviar mensagem', erroMsg.message);
      return;
    }

    enviarNotificacao(
      peca.dono_id,
      `⭐ Alguém amou "${tituloLimpo}"!`,
      remetente ? `${remetente}: ${textoAutomatico}` : textoAutomatico,
      { interesseId }
    );

    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current);
    setAvisoEstrela({
      texto: `⭐ Mensagem enviada para ${peca.dono_nome ?? 'o vendedor'}!`,
      interesseId,
    });
    timerAvisoRef.current = setTimeout(() => setAvisoEstrela(null), 4500);
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

  const pecasFiltradas = pecas.filter((p) => {
    if (filtroTipo === 'troca' && p.tipo !== 'troca' && p.tipo !== 'ambos') return false;
    if (filtroTipo === 'venda' && p.tipo !== 'venda' && p.tipo !== 'ambos') return false;
    if (filtroTamanho && p.tamanho?.trim().toUpperCase() !== filtroTamanho) return false;
    return true;
  });

  function limparFiltros() {
    setFiltroTipo('todos');
    setFiltroTamanho(null);
    setSemMaisCards(false);
    setIndiceAtual(0);
    desfazendoRef.current = false;
  }

  function desfazerCard() {
    if (indiceAtual <= 0 || desfazendoRef.current) return;
    desfazendoRef.current = true;
    swiperRef.current?.swipeBack();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.logo}>
          Breché<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <View style={styles.topAcoes}>
          <TouchableOpacity style={styles.localBadge} onPress={aoPuxarAtualizar} disabled={atualizando}>
            {atualizando ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={{ paddingVertical: 2 }} />
            ) : (
              <Text style={styles.localBadgeTexto}>📍 Perto de você</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatAtalhoBtn}
            onPress={() => navigation.navigate('Mensagens')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtrosWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosScroll}
        >
          <TouchableOpacity
            style={[styles.filtroChip, filtroTipo === 'todos' && !filtroTamanho && styles.filtroChipAtivo]}
            onPress={limparFiltros}
          >
            <Text style={[styles.filtroTexto, filtroTipo === 'todos' && !filtroTamanho && styles.filtroTextoAtivo]}>
              Tudo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroChip, filtroTipo === 'troca' && styles.filtroChipAtivo]}
            onPress={() => {
              setFiltroTipo((t) => (t === 'troca' ? 'todos' : 'troca'));
              setSemMaisCards(false);
              setIndiceAtual(0);
              desfazendoRef.current = false;
            }}
          >
            <Text style={[styles.filtroTexto, filtroTipo === 'troca' && styles.filtroTextoAtivo]}>
              Troca
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroChip, filtroTipo === 'venda' && styles.filtroChipAtivo]}
            onPress={() => {
              setFiltroTipo((t) => (t === 'venda' ? 'todos' : 'venda'));
              setSemMaisCards(false);
              setIndiceAtual(0);
              desfazendoRef.current = false;
            }}
          >
            <Text style={[styles.filtroTexto, filtroTipo === 'venda' && styles.filtroTextoAtivo]}>
              Venda
            </Text>
          </TouchableOpacity>

          {['P', 'M', 'G', 'GG'].map((tam) => {
            const ativo = filtroTamanho === tam;
            return (
              <TouchableOpacity
                key={tam}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                onPress={() => {
                  setFiltroTamanho((atual) => (atual === tam ? null : tam));
                  setSemMaisCards(false);
                  setIndiceAtual(0);
                  desfazendoRef.current = false;
                }}
              >
                <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>
                  Tam {tam}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
      ) : pecasFiltradas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.vazioTexto}>Nenhuma peça encontrada com esse filtro.</Text>
          <TouchableOpacity onPress={limparFiltros} style={styles.limparFiltroBtn}>
            <Text style={styles.limparFiltroTexto}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : semMaisCards ? (
        <View style={styles.centro}>
          <Text style={styles.vazioTexto}>👕 Você já viu tudo por perto!</Text>
          <TouchableOpacity
            onPress={aoPuxarAtualizar}
            disabled={atualizando}
            style={styles.limparFiltroBtn}
          >
            {atualizando ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.limparFiltroTexto}>Procurar novamente</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.swiperArea}
          onLayout={(e) => {
            const h = Math.floor(e.nativeEvent.layout.height);
            if (h > 0 && Math.abs(h - alturaDeck) > 4) {
              setAlturaDeck(h);
            }
          }}
        >
          {alturaDeck > 0 && (
            <Swiper
              key={`${versaoFeed}-${alturaDeck}-${filtroTipo}-${filtroTamanho ?? 'all'}`}
              ref={swiperRef}
              cards={pecasFiltradas}
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

                      {!!peca.observacao && (
                        <Text style={styles.observacao} numberOfLines={2}>
                          {peca.observacao}
                        </Text>
                      )}

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
              onSwiped={(idx) => {
                if (desfazendoRef.current) {
                  desfazendoRef.current = false;
                  setIndiceAtual(Math.max(0, idx - 1));
                  return;
                }
                setIndiceAtual(idx + 1);
              }}
              onSwipedRight={(index) => curtir(pecasFiltradas[index])}
              onSwipedTop={(index) => amarPeca(pecasFiltradas[index])}
              disableBottomSwipe
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
                top: {
                  title: 'AMEI! ★',
                  style: {
                    label: {
                      backgroundColor: colors.star,
                      color: colors.black,
                      fontFamily: fonts.headingBold,
                      fontSize: 22,
                      borderRadius: radius.sm,
                      padding: 8,
                      overflow: 'hidden',
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      marginBottom: 24,
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
            <Text style={styles.coracaoExplosaoTexto}>{iconeExplosao}</Text>
          </Animated.View>
        </View>
      )}

      {avisoEstrela && (
        <View style={styles.avisoEstrelaBanner}>
          <Text style={styles.avisoEstrelaTexto} numberOfLines={1}>
            {avisoEstrela.texto}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const { interesseId } = avisoEstrela;
              setAvisoEstrela(null);
              navigation.navigate('Chat', { interesseId });
            }}
          >
            <Text style={styles.avisoEstrelaLink}>Abrir chat ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {pecasFiltradas.length > 0 && !semMaisCards && (
        <View style={styles.acoesRow}>
          <TouchableOpacity
            style={[
              styles.acaoBtnPequeno,
              styles.acaoBtnBorda,
              indiceAtual === 0 && { opacity: 0.45 },
            ]}
            disabled={indiceAtual === 0}
            onPress={desfazerCard}
          >
            <Ionicons
              name="arrow-undo"
              size={18}
              color={indiceAtual > 0 ? colors.black : colors.placeholder}
            />
          </TouchableOpacity>
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
            onPress={() => swiperRef.current?.swipeTop()}
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
  topAcoes: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatAtalhoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtrosWrap: { paddingBottom: spacing.sm },
  filtrosScroll: { paddingHorizontal: spacing.lg, gap: 8 },
  filtroChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  filtroChipAtivo: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  filtroTexto: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  filtroTextoAtivo: { fontFamily: fonts.bodyBold, color: colors.accent },
  limparFiltroBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  limparFiltroTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },
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
  observacao: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 4 },
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
  avisoEstrelaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    borderRadius: radius.pill,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  avisoEstrelaTexto: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  avisoEstrelaLink: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  acoesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  acaoBtnPequeno: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
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
