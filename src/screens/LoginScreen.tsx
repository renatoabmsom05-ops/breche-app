import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { registrarPushToken } from '../lib/notificacoes';
import { colors, fonts, spacing, radius } from '../theme';

// Botão com uma leve "encolhida" ao tocar — dá sensação de resposta tátil.
function BotaoAnimado({ onPress, style, children, disabled }: any) {
  const escala = useRef(new Animated.Value(1)).current;

  function aoPressionar() {
    Animated.spring(escala, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  }
  function aoSoltar() {
    Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
      onPressIn={aoPressionar}
      onPressOut={aoSoltar}
    >
      <Animated.View style={[style, { transform: [{ scale: escala }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [campoFocado, setCampoFocado] = useState<'email' | 'senha' | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false);
  const [larguraSwitch, setLarguraSwitch] = useState(0);

  // Entrada em cascata dos blocos da tela
  const opacidadeHero = useRef(new Animated.Value(0)).current;
  const opacidadeTitulo = useRef(new Animated.Value(0)).current;
  const deslocTitulo = useRef(new Animated.Value(18)).current;
  const opacidadeForm = useRef(new Animated.Value(0)).current;
  const deslocForm = useRef(new Animated.Value(24)).current;

  // Ponto verde-lima da marca com "pop" e pulso alegre
  const pontoEscala = useRef(new Animated.Value(0)).current;

  // Etiquetas flutuantes sobre o hero
  const flutua1 = useRef(new Animated.Value(0)).current;
  const flutua2 = useRef(new Animated.Value(0)).current;
  const flutua3 = useRef(new Animated.Value(0)).current;

  // Deslizamento da pílula Entrar / Criar conta
  const abaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacidadeHero, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacidadeTitulo, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(deslocTitulo, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(pontoEscala, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(opacidadeForm, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(deslocForm, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const criarFlutuacao = (valor: Animated.Value, distancia: number, duracao: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(valor, {
            toValue: -distancia,
            duration: duracao,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(valor, {
            toValue: 0,
            duration: duracao,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const pulsoPonto = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(pontoEscala, {
          toValue: 1.25,
          duration: 550,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pontoEscala, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loops = [
      criarFlutuacao(flutua1, 6, 1700, 0),
      criarFlutuacao(flutua2, 7, 2000, 350),
      criarFlutuacao(flutua3, 5, 1850, 700),
      pulsoPonto,
    ];
    loops.forEach((l) => l.start());

    return () => {
      loops.forEach((l) => l.stop());
    };
  }, []);

  useEffect(() => {
    Animated.spring(abaAnim, {
      toValue: modoCadastro ? 1 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [modoCadastro]);

  const larguraAba = Math.max((larguraSwitch - 8) / 2, 0);
  const indicadorX = abaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, larguraAba],
  });

  async function entrar() {
    const emailLimpo = email.trim();
    if (!emailLimpo || !senha) {
      Alert.alert('Preencha e-mail e senha para entrar.');
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLimpo,
      password: senha,
    });
    if (error) {
      setCarregando(false);
      Alert.alert('Erro ao entrar', error.message);
      return;
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('viu_tutorial')
      .eq('id', data.user.id)
      .single();

    setCarregando(false);
    navigation.replace(usuario?.viu_tutorial ? 'Main' : 'Tutorial');
    registrarPushToken();
  }

  async function cadastrar() {
    const emailLimpo = email.trim();
    if (!emailLimpo || !senha) {
      Alert.alert('Preencha e-mail e senha para criar sua conta.');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signUp({ email: emailLimpo, password: senha });
    if (error) {
      setCarregando(false);
      Alert.alert('Erro ao cadastrar', error.message);
      return;
    }
    setCarregando(false);
    Alert.alert('Conta criada!', 'Agora faça login.');
    setModoCadastro(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroBox, { opacity: opacidadeHero }]}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1624192647570-1131acc12ccf?w=900&h=1000&fit=crop&auto=format&q=80',
            }}
            style={styles.hero}
          />
          <LinearGradient
            colors={['rgba(20,20,20,0.45)', 'transparent']}
            style={styles.heroTopoDegrade}
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroDegrade}
          />

          <Image
            source={require('../../assets/images/icon.png')}
            style={[styles.heroLogoIcone, { top: insets.top + spacing.sm }]}
          />

          <Animated.View
            style={[
              styles.pilulaFlutuante,
              {
                top: insets.top + 18,
                right: spacing.lg,
                backgroundColor: colors.accent,
                transform: [{ translateY: flutua1 }, { rotate: '4deg' }],
              },
            ]}
          >
            <Text style={[styles.pilulaTexto, { color: colors.black }]}>TROCA</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.pilulaFlutuante,
              {
                bottom: 58,
                left: spacing.lg,
                backgroundColor: colors.venda,
                transform: [{ translateY: flutua2 }, { rotate: '-5deg' }],
              },
            ]}
          >
            <Text style={[styles.pilulaTexto, { color: colors.white }]}>VENDA</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.pilulaFlutuante,
              {
                bottom: 44,
                right: spacing.lg + 10,
                backgroundColor: colors.black,
                transform: [{ translateY: flutua3 }, { rotate: '3deg' }],
              },
            ]}
          >
            <Text style={[styles.pilulaTexto, { color: colors.star }]}>★ AMEI</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.conteudo}>
          <Animated.View
            style={{ opacity: opacidadeTitulo, transform: [{ translateY: deslocTitulo }] }}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>MODA CIRCULAR</Text>
            </View>

            <View style={styles.logoRow}>
              <Text style={styles.logo}>Breché</Text>
              <Animated.View
                style={[styles.logoPonto, { transform: [{ scale: pontoEscala }] }]}
              />
            </View>

            <Text style={styles.subtitulo}>
              {modoCadastro
                ? 'Bora dar nova vida ao armário? Crie sua conta em segundos.'
                : 'Que bom te ver por aqui! Troque, venda e garimpe looks perto de você.'}
            </Text>
          </Animated.View>

          <Animated.View
            style={{ opacity: opacidadeForm, transform: [{ translateY: deslocForm }] }}
          >
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
                onPress={() => setModoCadastro(false)}
              >
                <Text style={[styles.switchTexto, !modoCadastro && styles.switchTextoAtivo]}>
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.switchAba}
                activeOpacity={0.8}
                onPress={() => setModoCadastro(true)}
              >
                <Text style={[styles.switchTexto, modoCadastro && styles.switchTextoAtivo]}>
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputBox, campoFocado === 'email' && styles.inputBoxFocado]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={campoFocado === 'email' ? colors.black : colors.placeholder}
              />
              <TextInput
                style={styles.inputCampo}
                placeholder="seu@email.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setCampoFocado('email')}
                onBlur={() => setCampoFocado((atual) => (atual === 'email' ? null : atual))}
              />
            </View>

            <View style={[styles.inputBox, campoFocado === 'senha' && styles.inputBoxFocado]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={campoFocado === 'senha' ? colors.black : colors.placeholder}
              />
              <TextInput
                style={styles.inputCampo}
                placeholder="Senha"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!mostrarSenha}
                value={senha}
                onChangeText={setSenha}
                onFocus={() => setCampoFocado('senha')}
                onBlur={() => setCampoFocado((atual) => (atual === 'senha' ? null : atual))}
              />
              <TouchableOpacity
                onPress={() => setMostrarSenha((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {carregando ? (
              <ActivityIndicator size="large" color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <BotaoAnimado
                style={[styles.botao, modoCadastro && styles.botaoCadastro]}
                onPress={modoCadastro ? cadastrar : entrar}
              >
                <Text style={[styles.botaoTexto, modoCadastro && { color: colors.black }]}>
                  {modoCadastro ? 'Criar minha conta' : 'Entrar no Breché'}
                </Text>
                <Ionicons
                  name={modoCadastro ? 'sparkles' : 'arrow-forward'}
                  size={18}
                  color={modoCadastro ? colors.black : colors.accent}
                />
              </BotaoAnimado>
            )}

            {!modoCadastro && (
              <TouchableOpacity
                onPress={() => navigation.navigate('RecuperarSenha')}
                style={styles.linkBtn}
              >
                <Text style={styles.link}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.rodapeTexto}>♻️ Moda circular perto de você · raio de 30 km</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroBox: { width: '100%', height: 258, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroTopoDegrade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 95,
  },
  heroDegrade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  heroLogoIcone: {
    position: 'absolute',
    left: spacing.lg,
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  pilulaFlutuante: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  pilulaTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  conteudo: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  badgeTexto: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.black, letterSpacing: 0.6 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logo: { fontFamily: fonts.headingBlack, fontSize: 42, lineHeight: 46, color: colors.black },
  logoPonto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: 3,
    marginBottom: 8,
  },
  subtitulo: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
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
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  switchTexto: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary },
  switchTextoAtivo: { color: colors.white },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  inputBoxFocado: {
    borderColor: colors.black,
  },
  inputCampo: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  botao: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  botaoCadastro: {
    backgroundColor: colors.accent,
  },
  botaoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
  linkBtn: { marginTop: spacing.md, alignItems: 'center' },
  link: { textAlign: 'center', color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  rodapeTexto: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.placeholder,
    marginTop: spacing.lg,
  },
});
