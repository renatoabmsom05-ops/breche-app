import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function EditarPerfilScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bio, setBio] = useState('');
  const [campoFocado, setCampoFocado] = useState<'nome' | 'insta' | 'bio' | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from('usuarios')
      .select('nome, instagram, bio')
      .eq('id', userId)
      .single();

    if (data) {
      setNome(data.nome ?? '');
      setInstagram(data.instagram ?? '');
      setBio(data.bio ?? '');
    }
    setCarregando(false);
  }

  async function salvar() {
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSalvando(false);
      return;
    }

    const nomeLimpo = nome.trim();
    const instagramLimpo = instagram.trim().replace(/^@/, '');
    const bioLimpa = bio.trim();

    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nomeLimpo, instagram: instagramLimpo, bio: bioLimpa })
      .eq('id', userId);

    setSalvando(false);
    if (error) {
      Alert.alert('Erro ao salvar', error.message);
      return;
    }
    navigation.goBack();
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.black} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome</Text>
        <View style={[styles.inputBox, campoFocado === 'nome' && styles.inputBoxFocado]}>
          <Ionicons
            name="person-outline"
            size={18}
            color={campoFocado === 'nome' ? colors.black : colors.placeholder}
          />
          <TextInput
            style={styles.inputCampo}
            placeholder="Seu nome"
            placeholderTextColor={colors.placeholder}
            value={nome}
            onChangeText={setNome}
            onFocus={() => setCampoFocado('nome')}
            onBlur={() => setCampoFocado((atual) => (atual === 'nome' ? null : atual))}
          />
        </View>

        <Text style={styles.label}>Instagram</Text>
        <View style={[styles.inputBox, campoFocado === 'insta' && styles.inputBoxFocado]}>
          <Ionicons
            name="logo-instagram"
            size={18}
            color={campoFocado === 'insta' ? colors.black : colors.placeholder}
          />
          <Text style={styles.prefixo}>@</Text>
          <TextInput
            style={styles.inputCampo}
            placeholder="seu.usuario"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            value={instagram}
            onChangeText={setInstagram}
            onFocus={() => setCampoFocado('insta')}
            onBlur={() => setCampoFocado((atual) => (atual === 'insta' ? null : atual))}
          />
        </View>

        <Text style={styles.label}>Bio</Text>
        <View
          style={[
            styles.inputBox,
            styles.inputBioBox,
            campoFocado === 'bio' && styles.inputBoxFocado,
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={campoFocado === 'bio' ? colors.black : colors.placeholder}
            style={{ marginTop: 14 }}
          />
          <TextInput
            style={[styles.inputCampo, styles.inputBioCampo]}
            placeholder="Conte um pouco sobre você e o que gosta de trocar..."
            placeholderTextColor={colors.placeholder}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={200}
            onFocus={() => setCampoFocado('bio')}
            onBlur={() => setCampoFocado((atual) => (atual === 'bio' ? null : atual))}
          />
        </View>
        <Text style={styles.contador}>{bio.length}/200</Text>

        {salvando ? (
          <ActivityIndicator color={colors.black} style={{ marginTop: spacing.lg }} />
        ) : (
          <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
            <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  inputBoxFocado: { borderColor: colors.black },
  inputCampo: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  prefixo: { fontFamily: fonts.bodySemiBold, color: colors.textSecondary },
  inputBioBox: { alignItems: 'flex-start' },
  inputBioCampo: { height: 100, textAlignVertical: 'top', paddingTop: 13 },
  contador: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  botaoSalvar: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  botaoSalvarTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
});
