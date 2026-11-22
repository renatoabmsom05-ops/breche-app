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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function RecuperarSenhaScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    if (!email) {
      Alert.alert('Digite seu e-mail primeiro.');
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setCarregando(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setEtapa('codigo');
  }

  async function confirmarNovaSenha() {
    if (!codigo || !novaSenha) {
      Alert.alert('Preencha o código e a nova senha.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);

    const { error: erroVerificar } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
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
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={styles.titulo}>
          {etapa === 'email' ? 'Esqueceu a senha?' : 'Digite o código'}
        </Text>
        <Text style={styles.subtitulo}>
          {etapa === 'email'
            ? 'Informe o e-mail da sua conta. Vamos mandar um código de 6 dígitos pra ele.'
            : `Enviamos um código de 6 dígitos para ${email}. Confira também a caixa de spam.`}
        </Text>

        {etapa === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {carregando ? (
              <ActivityIndicator color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <TouchableOpacity style={styles.botao} onPress={enviarCodigo}>
                <Text style={styles.botaoTexto}>Enviar código</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Código de 6 dígitos"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
              value={codigo}
              onChangeText={setCodigo}
            />
            <TextInput
              style={styles.input}
              placeholder="Nova senha"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              value={novaSenha}
              onChangeText={setNovaSenha}
            />
            {carregando ? (
              <ActivityIndicator color={colors.black} style={{ marginTop: spacing.md }} />
            ) : (
              <TouchableOpacity style={styles.botao} onPress={confirmarNovaSenha}>
                <Text style={styles.botaoTexto}>Trocar senha</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={enviarCodigo} style={{ marginTop: spacing.md }}>
              <Text style={styles.link}>Reenviar código</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }}>
          <Text style={styles.link}>Voltar pro login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  titulo: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.black, marginBottom: spacing.sm },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
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
  link: { textAlign: 'center', color: colors.textSecondary, fontFamily: fonts.body },
});
