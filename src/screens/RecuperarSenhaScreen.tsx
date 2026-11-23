import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function RecuperarSenhaScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [campoFocado, setCampoFocado] = useState<'email' | 'codigo' | 'senha' | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    const emailLimpo = email.trim();
    if (!emailLimpo) {
      Alert.alert('Digite seu e-mail primeiro.');
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo);
    setCarregando(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setEtapa('codigo');
  }

  async function confirmarNovaSenha() {
    const emailLimpo = email.trim();
    const codigoLimpo = codigo.trim();
    if (!codigoLimpo || !novaSenha) {
      Alert.alert('Preencha o código e a nova senha.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);

    const { error: erroVerificar } = await supabase.auth.verifyOtp({
      email: emailLimpo,
      token: codigoLimpo,
      type: 'recovery',
    });

    if (erroVerificar) {
      setCarregando(false);
      Alert.alert('Código inválido', erroVerificar.message);
      return;
    }

    const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
    setCarregando(false);

    if (erroSenha) {
      Alert.alert('Erro ao trocar a senha', erroSenha.message);
      return;
    }

    await supabase.auth.signOut();
    Alert.alert('Senha alterada!', 'Agora é só entrar com a senha nova.');
    navigation.replace('Login');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topoRow}>
          <TouchableOpacity style={styles.voltarBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.black} />
          </TouchableOpacity>
          <Image source={require('../../assets/images/icon.png')} style={styles.topoIcone} />
        </View>

        <View style={styles.passoPill}>
          <Text style={styles.passoTexto}>
            {etapa === 'email' ? 'PASSO 1 DE 2' : 'PASSO 2 DE 2'}
          </Text>
        </View>

        <Text style={styles.titulo}>
          {etapa === 'email' ? 'Esqueceu a senha?' : 'Digite o código'}
        </Text>
        <Text style={styles.subtitulo}>
          {etapa === 'email'
            ? 'Informe o e-mail da sua conta. Vamos mandar um código de 6 dígitos pra ele.'
            : `Enviamos um código de 6 dígitos para ${email.trim()}. Confira também a caixa de spam.`}
        </Text>

        {etapa === 'email' ? (
          <>
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

            {carregando ? (
              <ActivityIndicator color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <TouchableOpacity style={styles.botao} onPress={enviarCodigo}>
                <Text style={styles.botaoTexto}>Enviar código</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <View style={[styles.inputBox, campoFocado === 'codigo' && styles.inputBoxFocado]}>
              <Ionicons
                name="key-outline"
                size={18}
                color={campoFocado === 'codigo' ? colors.black : colors.placeholder}
              />
              <TextInput
                style={styles.inputCampo}
                placeholder="Código de 6 dígitos"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={6}
                value={codigo}
                onChangeText={setCodigo}
                onFocus={() => setCampoFocado('codigo')}
                onBlur={() => setCampoFocado((atual) => (atual === 'codigo' ? null : atual))}
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
                placeholder="Nova senha (mín. 6 caracteres)"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!mostrarSenha}
                value={novaSenha}
                onChangeText={setNovaSenha}
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
              <ActivityIndicator color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <TouchableOpacity style={styles.botao} onPress={confirmarNovaSenha}>
                <Text style={styles.botaoTexto}>Trocar senha</Text>
                <Ionicons name="checkmark" size={18} color={colors.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={enviarCodigo} style={styles.linkBtn}>
              <Text style={styles.link}>Reenviar código</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
          <Text style={styles.link}>Voltar pro login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.lg },
  topoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  voltarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topoIcone: { width: 38, height: 38, borderRadius: 10 },
  passoPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  passoTexto: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.black, letterSpacing: 0.8 },
  titulo: { fontFamily: fonts.headingBlack, fontSize: 30, color: colors.black, marginBottom: spacing.xs },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
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
  inputBoxFocado: { borderColor: colors.black },
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
  botaoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
  linkBtn: { marginTop: spacing.md, alignItems: 'center' },
  link: { textAlign: 'center', color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
