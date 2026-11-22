import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

type SlideInfo = {
  kicker: string;
  titulo: string;
  texto: string;
  escuro?: boolean;
};

const SLIDES: SlideInfo[] = [
  {
    kicker: 'MODA CIRCULAR PERTO DE VOCÊ',
    titulo: 'Bem-vindo ao Breché.',
    texto: 'Um jeito leve, rápido e divertido de trocar, vender e garimpar looks na sua cidade.',
    escuro: true,
  },
  {
    kicker: 'DESCOBERTA POR GESTOS',
    titulo: 'Arraste e dê match',
    texto:
      'Pra direita (❤️) você curte. Pra esquerda (✕) você pula. Pra cima ou na ★ você já manda um "amei!" pro dono.',
  },
  {
    kicker: 'SEU ARMÁRIO EM MOVIMENTO',
    titulo: 'Publique em segundos',
    texto:
      'Escolha até 3 fotos, marque como Venda, Troca ou Troca/Venda e adicione observações da peça.',
  },
  {
    kicker: 'TEMPO REAL + ALERTAS',
    titulo: 'Chat direto e avisos',
    texto:
      'Receba notificações no celular quando alguém se interessar ou mandar mensagem — toque e já abra a conversa.',
  },
  {
    kicker: 'COMUNIDADE DE CONFIANÇA',
    titulo: 'Tudo pronto pra garimpar!',
    texto:
      'Acompanhe suas peças no Perfil, avalie negociações com estrelas e entre no grupo VIP da comunidade.',
  },
];

// Cena 1: Ícone B. com anéis e pílulas flutuantes
function CenaBoasVindas() {
  const escala = useRef(new Animated.Value(0.85)).current;
  const flutuaA = useRef(new Animated.Value(0)).current;
  const flutuaB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(escala, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();

    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(flutuaA, {
          toValue: -7,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flutuaA, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(flutuaB, {
          toValue: 7,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flutuaB, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, []);

  return (
    <View style={cenaStyles.area}>
      <View style={cenaStyles.anelExterno} />
      <View style={cenaStyles.anelInterno} />

      <Animated.View style={[cenaStyles.iconeHeroWrap, { transform: [{ scale: escala }] }]}>
        <Image source={require('../../assets/images/icon.png')} style={cenaStyles.iconeHero} />
      </Animated.View>

      <Animated.View
        style={[
          cenaStyles.tagFlutuante,
          { top: 24, left: 26, backgroundColor: colors.accent, transform: [{ translateY: flutuaA }] },
        ]}
      >
        <Text style={[cenaStyles.tagTexto, { color: colors.black }]}>TROCA</Text>
      </Animated.View>

      <Animated.View
        style={[
          cenaStyles.tagFlutuante,
          { top: 38, right: 24, backgroundColor: colors.venda, transform: [{ translateY: flutuaB }] },
        ]}
      >
        <Text style={[cenaStyles.tagTexto, { color: colors.white }]}>VENDA</Text>
      </Animated.View>

      <Animated.View
        style={[
          cenaStyles.tagFlutuante,
          {
            bottom: 24,
            right: 38,
            backgroundColor: '#232323',
            borderWidth: 1,
            borderColor: 'rgba(198,241,53,0.45)',
            transform: [{ translateY: flutuaA }],
          },
        ]}
      >
        <Text style={[cenaStyles.tagTexto, { color: colors.accent }]}>📍 30 km</Text>
      </Animated.View>
    </View>
  );
}

// Cena 2: Mini card demonstrando direita (GOSTEI), esquerda (PULAR) e cima (AMEI! ★)
function CenaSwipe() {
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const opGostei = useRef(new Animated.Value(0)).current;
  const opPular = useRef(new Animated.Value(0)).current;
  const opAmei = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(350),
        // Direita -> GOSTEI
        Animated.parallel([
          Animated.timing(posX, { toValue: 44, duration: 550, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 1, duration: 550, useNativeDriver: true }),
          Animated.timing(opGostei, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(posX, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(opGostei, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.delay(250),
        // Esquerda -> PULAR
        Animated.parallel([
          Animated.timing(posX, { toValue: -44, duration: 550, useNativeDriver: true }),
          Animated.timing(rot, { toValue: -1, duration: 550, useNativeDriver: true }),
          Animated.timing(opPular, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(posX, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(opPular, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.delay(250),
        // Cima -> AMEI! ★
        Animated.parallel([
          Animated.timing(posY, { toValue: -26, duration: 550, useNativeDriver: true }),
          Animated.timing(opAmei, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
        Animated.delay(550),
        Animated.parallel([
          Animated.timing(posY, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(opAmei, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  const rotateStr = rot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-7deg', '0deg', '7deg'],
  });

  return (
    <View style={cenaStyles.area}>
      <Animated.View
        style={[
          cenaStyles.miniCard,
          { transform: [{ translateX: posX }, { translateY: posY }, { rotate: rotateStr }] },
        ]}
      >
        <View style={cenaStyles.miniCardFoto}>
          <Ionicons name="shirt-outline" size={44} color={colors.accent} />

          <Animated.View style={[cenaStyles.seloSwipe, cenaStyles.seloGostei, { opacity: opGostei }]}>
            <Text style={cenaStyles.seloTextoEscuro}>GOSTEI</Text>
          </Animated.View>

          <Animated.View style={[cenaStyles.seloSwipe, cenaStyles.seloPular, { opacity: opPular }]}>
            <Text style={cenaStyles.seloTextoClaro}>PULAR</Text>
          </Animated.View>

          <Animated.View style={[cenaStyles.seloSwipe, cenaStyles.seloAmei, { opacity: opAmei }]}>
            <Text style={cenaStyles.seloTextoEscuro}>AMEI! ★</Text>
          </Animated.View>
        </View>

        <View style={cenaStyles.miniCardInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={cenaStyles.miniCardTitulo}>Jaqueta Vintage</Text>
            <View style={cenaStyles.miniBadge}>
              <Text style={cenaStyles.miniBadgeTexto}>TROCA/VENDA</Text>
            </View>
          </View>
          <Text style={cenaStyles.miniCardPreco}>R$ 85</Text>
        </View>
      </Animated.View>

      <View style={cenaStyles.miniAcoesRow}>
        <View style={cenaStyles.miniAcaoBtn}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </View>
        <View style={[cenaStyles.miniAcaoBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
          <Ionicons name="heart" size={16} color={colors.white} />
        </View>
        <View style={cenaStyles.miniAcaoBtn}>
          <Ionicons name="star" size={15} color={colors.star} />
        </View>
      </View>
    </View>
  );
}

// Cena 3: 3 slots de fotos + pílulas de oferta pulsando
function CenaPublicar() {
  const pulso1 = useRef(new Animated.Value(1)).current;
  const pulso2 = useRef(new Animated.Value(1)).current;
  const pulso3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulsar = (v: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1.08, duration: 280, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]);

    const loop = Animated.loop(
      Animated.sequence([pulsar(pulso1, 0), pulsar(pulso2, 120), pulsar(pulso3, 120), Animated.delay(650)])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={cenaStyles.area}>
      <View style={cenaStyles.pubCard}>
        <View style={cenaStyles.pubFotosRow}>
          {[
            { pulso: pulso1, label: 'Principal' },
            { pulso: pulso2, label: 'Foto 2' },
            { pulso: pulso3, label: 'Foto 3' },
          ].map((slot, idx) => (
            <Animated.View
              key={idx}
              style={[cenaStyles.pubFotoSlot, { transform: [{ scale: slot.pulso }] }]}
            >
              <Ionicons
                name={idx === 0 ? 'camera' : 'add'}
                size={20}
                color={idx === 0 ? colors.black : colors.textSecondary}
              />
              <Text style={cenaStyles.pubFotoLabel}>{slot.label}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={cenaStyles.pubTiposRow}>
          <Animated.View
            style={[cenaStyles.pubTipoPill, { backgroundColor: colors.venda, transform: [{ scale: pulso1 }] }]}
          >
            <Text style={[cenaStyles.pubTipoTexto, { color: colors.white }]}>Venda</Text>
          </Animated.View>
          <Animated.View
            style={[cenaStyles.pubTipoPill, { backgroundColor: colors.accent, transform: [{ scale: pulso2 }] }]}
          >
            <Text style={[cenaStyles.pubTipoTexto, { color: colors.black }]}>Troca</Text>
          </Animated.View>
          <Animated.View
            style={[cenaStyles.pubTipoPill, { backgroundColor: colors.black, transform: [{ scale: pulso3 }] }]}
          >
            <Text style={[cenaStyles.pubTipoTexto, { color: colors.white }]}>Troca/Venda</Text>
          </Animated.View>
        </View>

        <View style={cenaStyles.pubObsChip}>
          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
          <Text style={cenaStyles.pubObsTexto}>Observações: tecido leve, usado 1 vez...</Text>
        </View>
      </View>
    </View>
  );
}

// Cena 4: Bolhas de conversa + sininho balançando
function CenaChat() {
  const bolha1 = useRef(new Animated.Value(0)).current;
  const bolha2 = useRef(new Animated.Value(0)).current;
  const sinoRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bolha1, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(250),
        // Sino balança alegre
        Animated.sequence([
          Animated.timing(sinoRot, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(sinoRot, { toValue: -1, duration: 90, useNativeDriver: true }),
          Animated.timing(sinoRot, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(sinoRot, { toValue: 0, duration: 90, useNativeDriver: true }),
        ]),
        Animated.delay(200),
        Animated.timing(bolha2, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.parallel([
          Animated.timing(bolha1, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(bolha2, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.delay(200),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  const sinoRotate = sinoRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  return (
    <View style={cenaStyles.area}>
      <View style={cenaStyles.notifToast}>
        <View style={cenaStyles.notifBadgeB}>
          <Text style={cenaStyles.notifBadgeBTexto}>B.</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cenaStyles.notifTitulo}>Alguém amou sua peça!</Text>
          <Text style={cenaStyles.notifCorpo}>Toque para abrir a conversa</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: sinoRotate }] }}>
          <Ionicons name="notifications" size={18} color={colors.accent} />
        </Animated.View>
      </View>

      <View style={cenaStyles.chatBox}>
        <Animated.View
          style={[
            cenaStyles.chatBolhaMinha,
            {
              opacity: bolha1,
              transform: [
                {
                  translateY: bolha1.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                },
              ],
            },
          ]}
        >
          <Text style={cenaStyles.chatTextoEscuro}>Oi! ⭐ Amei sua peça! Ainda tem?</Text>
        </Animated.View>

        <Animated.View
          style={[
            cenaStyles.chatBolhaOutro,
            {
              opacity: bolha2,
              transform: [
                {
                  translateY: bolha2.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                },
              ],
            },
          ]}
        >
          <Text style={cenaStyles.chatTextoEscuro}>Oi! Sim, vamos combinar a entrega 💚</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// Cena 5: Mini perfil + 5 estrelas acendendo em sequência
function CenaPerfil() {
  const estrelas = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const acender = estrelas.map((v, i) =>
      Animated.sequence([
        Animated.delay(i * 130),
        Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ])
    );

    const loop = Animated.loop(
      Animated.sequence([
        Animated.stagger(90, acender),
        Animated.delay(1300),
        Animated.parallel(
          estrelas.map((v) => Animated.timing(v, { toValue: 0.35, duration: 250, useNativeDriver: true }))
        ),
        Animated.delay(200),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={cenaStyles.area}>
      <View style={cenaStyles.perfilCard}>
        <View style={cenaStyles.perfilTop}>
          <View style={cenaStyles.perfilAvatar}>
            <Text style={cenaStyles.perfilAvatarTexto}>LP</Text>
          </View>
          <View>
            <Text style={cenaStyles.perfilNome}>Seu guarda-roupa</Text>
            <View style={cenaStyles.perfilEstrelasRow}>
              {estrelas.map((anim, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    cenaStyles.perfilEstrela,
                    {
                      opacity: anim,
                      transform: [{ scale: anim }],
                    },
                  ]}
                >
                  ★
                </Animated.Text>
              ))}
            </View>
          </View>
        </View>

        <View style={cenaStyles.perfilGrade}>
          <View style={cenaStyles.perfilMiniPeca}>
            <Ionicons name="shirt-outline" size={20} color={colors.black} />
          </View>
          <View style={[cenaStyles.perfilMiniPeca, { backgroundColor: '#141414' }]}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
          </View>
          <View style={cenaStyles.perfilMiniPeca}>
            <Ionicons name="heart" size={18} color={colors.venda} />
            <View style={cenaStyles.perfilVendidoTag}>
              <Text style={cenaStyles.perfilVendidoTexto}>VENDIDO</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TutorialScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const largura = Math.max(width, 1);

  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulsoCta = useRef(new Animated.Value(1)).current;

  const ultimoSlide = indice === SLIDES.length - 1;
  const slideEscuro = !!SLIDES[indice].escuro;

  useEffect(() => {
    if (!ultimoSlide) {
      pulsoCta.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsoCta, {
          toValue: 1.03,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulsoCta, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ultimoSlide]);

  async function finalizar() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      await supabase.from('usuarios').update({ viu_tutorial: true }).eq('id', userId);
    }
    navigation.replace('Main');
  }

  function irPara(novoIndice: number) {
    scrollRef.current?.scrollTo({ x: largura * novoIndice, animated: true });
    setIndice(novoIndice);
  }

  function proximo() {
    if (ultimoSlide) {
      finalizar();
      return;
    }
    irPara(indice + 1);
  }

  const corFundo = scrollX.interpolate({
    inputRange: [0, largura, largura * 2, largura * 3, largura * 4],
    outputRange: ['#141414', '#F2EFEA', '#EFF4DF', '#EDF1FA', '#F2EFEA'],
    extrapolate: 'clamp',
  });

  function renderCena(i: number) {
    if (i === 0) return <CenaBoasVindas />;
    if (i === 1) return <CenaSwipe />;
    if (i === 2) return <CenaPublicar />;
    if (i === 3) return <CenaChat />;
    return <CenaPerfil />;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: corFundo,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <StatusBar style={slideEscuro ? 'light' : 'dark'} />

      <View style={styles.topHeader}>
        <Text style={[styles.logoTopo, { color: slideEscuro ? colors.white : colors.black }]}>
          Breché<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.pularBtn,
            slideEscuro && { backgroundColor: 'rgba(255,255,255,0.1)' },
          ]}
          onPress={finalizar}
        >
          <Text
            style={[
              styles.pularTexto,
              { color: slideEscuro ? 'rgba(255,255,255,0.78)' : colors.textSecondary },
            ]}
          >
            Pular
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          const novo = Math.round(e.nativeEvent.contentOffset.x / largura);
          if (novo >= 0 && novo < SLIDES.length) setIndice(novo);
        }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: largura }]}>
            {renderCena(i)}

            <View style={styles.kickerPill}>
              <Text style={styles.kickerTexto}>{slide.kicker}</Text>
            </View>

            <Text
              style={[
                styles.titulo,
                { color: slide.escuro ? colors.white : colors.black },
              ]}
            >
              {slide.titulo}
            </Text>

            <Text
              style={[
                styles.texto,
                { color: slide.escuro ? 'rgba(255,255,255,0.76)' : colors.textSecondary },
              ]}
            >
              {slide.texto}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.progressoRow}>
        {SLIDES.map((_, i) => {
          const preenchimento = scrollX.interpolate({
            inputRange: [(i - 1) * largura, i * largura, (i + 1) * largura],
            outputRange: ['0%', '100%', '100%'],
            extrapolate: 'clamp',
          });

          return (
            <View
              key={i}
              style={[
                styles.progressoTrilho,
                {
                  backgroundColor: slideEscuro
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(20,20,20,0.12)',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressoPreenchido,
                  {
                    width: i <= indice ? preenchimento : '0%',
                    backgroundColor: slideEscuro ? colors.accent : colors.black,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.controlesRow}>
        {indice > 0 && (
          <TouchableOpacity
            style={[styles.voltarBtn, slideEscuro && styles.voltarBtnEscuro]}
            onPress={() => irPara(indice - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={colors.black} />
          </TouchableOpacity>
        )}

        <Animated.View style={{ flex: 1, transform: [{ scale: pulsoCta }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.botao,
              (slideEscuro || ultimoSlide) && { backgroundColor: colors.accent },
            ]}
            onPress={proximo}
          >
            <Text
              style={[
                styles.botaoTexto,
                { color: slideEscuro || ultimoSlide ? colors.black : colors.white },
              ]}
            >
              {ultimoSlide ? 'Começar a explorar' : indice === 0 ? 'Vamos lá' : 'Próximo'}
            </Text>
            <Ionicons
              name={ultimoSlide ? 'sparkles' : 'arrow-forward'}
              size={18}
              color={slideEscuro || ultimoSlide ? colors.black : colors.accent}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  logoTopo: { fontFamily: fonts.headingBlack, fontSize: 22 },
  pularBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pularTexto: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  kickerPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  kickerTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.black,
    letterSpacing: 0.8,
  },
  titulo: {
    fontFamily: fonts.headingBlack,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  texto: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  progressoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    gap: 6,
  },
  progressoTrilho: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressoPreenchido: {
    height: '100%',
    borderRadius: 2,
  },
  controlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  voltarBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voltarBtnEscuro: {
    backgroundColor: colors.white,
  },
  botao: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoTexto: { fontFamily: fonts.bodyBold, fontSize: 16 },
});

const cenaStyles = StyleSheet.create({
  area: {
    width: '100%',
    height: 238,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  anelExterno: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(198,241,53,0.22)',
  },
  anelInterno: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconeHeroWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  iconeHero: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tagFlutuante: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  tagTexto: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  miniCard: {
    width: 214,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  miniCardFoto: {
    height: 106,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seloSwipe: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seloGostei: { top: 10, left: 10, backgroundColor: colors.accent },
  seloPular: { top: 10, right: 10, backgroundColor: colors.black, borderWidth: 1, borderColor: colors.white },
  seloAmei: { bottom: 10, backgroundColor: colors.star },
  seloTextoEscuro: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.black },
  seloTextoClaro: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.white },
  miniCardInfo: { padding: 10 },
  miniCardTitulo: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.black },
  miniBadge: {
    backgroundColor: colors.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  miniBadgeTexto: { fontFamily: fonts.bodyBold, fontSize: 8, color: colors.white },
  miniCardPreco: { fontFamily: fonts.headingBold, fontSize: 14, color: colors.black, marginTop: 2 },
  miniAcoesRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  miniAcaoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pubCard: {
    width: '100%',
    maxWidth: 270,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  pubFotosRow: { flexDirection: 'row', gap: 8 },
  pubFotoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pubFotoLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.textSecondary },
  pubTiposRow: { flexDirection: 'row', gap: 6 },
  pubTipoPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  pubTipoTexto: { fontFamily: fonts.bodyBold, fontSize: 10 },
  pubObsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pubObsTexto: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  notifToast: {
    width: '100%',
    maxWidth: 276,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.black,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  notifBadgeB: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeBTexto: { fontFamily: fonts.headingBlack, fontSize: 14, color: colors.white },
  notifTitulo: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  notifCorpo: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.72)' },
  chatBox: { width: '100%', maxWidth: 276, gap: 8 },
  chatBolhaMinha: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    maxWidth: '88%',
  },
  chatBolhaOutro: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    maxWidth: '88%',
  },
  chatTextoEscuro: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.black },
  perfilCard: {
    width: '100%',
    maxWidth: 266,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  perfilTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perfilAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilAvatarTexto: { fontFamily: fonts.headingBlack, fontSize: 15, color: colors.black },
  perfilNome: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.black },
  perfilEstrelasRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  perfilEstrela: { fontSize: 17, color: colors.star },
  perfilGrade: { flexDirection: 'row', gap: 8 },
  perfilMiniPeca: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  perfilVendidoTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(20,20,20,0.82)',
    borderRadius: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  perfilVendidoTexto: { fontFamily: fonts.bodyBold, fontSize: 7, color: colors.white },
});
