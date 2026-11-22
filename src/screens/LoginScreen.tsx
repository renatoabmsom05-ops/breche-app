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
} from 'react-native';
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
  const [carregando, setCarregando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false);

  // Entrada animada do conteúdo: fade + leve deslize de baixo pra cima.
  const opacidade = useRef(new Animated.Value(0)).current;
  const deslocamento = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(deslocamento, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  async function entrar() {
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
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
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
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
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroBox}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1624192647570-1131acc12ccf?w=900&h=1000&fit=crop&auto=format&q=80',
            }}
            style={styles.hero}
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroDegrade}
          />
        </View>

        <Animated.View
          style={[
            styles.conteudo,
            { opacity: opacidade, transform: [{ translateY: deslocamento }] },
          ]}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>MODA CIRCULAR</Text>
          </View>

          <Text style={styles.logo}>
            Breché<Text style={{ color: colors.accent }}>.</Text>
          </Text>
          <Text style={styles.subtitulo}>Troca, vende e encontra looks incríveis perto de você.</Text>

          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          {carregando ? (
            <ActivityIndicator size="large" color={colors.black} style={{ marginTop: spacing.md }} />
          ) : (
            <BotaoAnimado style={styles.botao} onPress={modoCadastro ? cadastrar : entrar}>
              <Text style={styles.botaoTexto}>{modoCadastro ? 'Criar conta' : 'Entrar'}</Text>
            </BotaoAnimado>
          )}

          <TouchableOpacity onPress={() => setModoCadastro(!modoCadastro)}>
            <Text style={styles.link}>
              {modoCadastro ? 'Já tenho conta, quero entrar' : 'Não tenho conta, quero me cadastrar'}
            </Text>
          </TouchableOpacity>

          {!modoCadastro && (
            <TouchableOpacity onPress={() => navigation.navigate('RecuperarSenha')} style={{ marginTop: spacing.sm }}>
              <Text style={styles.link}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroBox: { width: '100%', height: 280 },
  hero: { width: '100%', height: '100%' },
  heroDegrade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  conteudo: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  badgeTexto: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.black, letterSpacing: 0.5 },
  logo: { fontFamily: fonts.headingBlack, fontSize: 40, color: colors.black },
  subtitulo: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botao: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  botaoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
  link: { textAlign: 'center', marginTop: spacing.md, color: colors.textSecondary, fontFamily: fonts.body },
});
