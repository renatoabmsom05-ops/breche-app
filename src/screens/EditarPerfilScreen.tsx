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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function EditarPerfilScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bio, setBio] = useState('');
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

    const instagramLimpo = instagram.trim().replace(/^@/, '');

    const { error } = await supabase
      .from('usuarios')
      .update({ nome, instagram: instagramLimpo, bio })
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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        placeholder="Seu nome"
        placeholderTextColor={colors.placeholder}
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Instagram</Text>
      <View style={styles.inputComPrefixo}>
        <Text style={styles.prefixo}>@</Text>
        <TextInput
          style={styles.inputSemBorda}
          placeholder="seu.usuario"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          value={instagram}
          onChangeText={setInstagram}
        />
      </View>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.inputBio]}
        placeholder="Conte um pouco sobre você e o que gosta de trocar..."
        placeholderTextColor={colors.placeholder}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        maxLength={200}
      />
      <Text style={styles.contador}>{bio.length}/200</Text>

      {salvando ? (
        <ActivityIndicator color={colors.black} style={{ marginTop: spacing.lg }} />
      ) : (
        <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
          <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputBio: { height: 100, textAlignVertical: 'top' },
  contador: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  inputComPrefixo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
  },
  prefixo: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  inputSemBorda: { flex: 1, padding: spacing.md, fontFamily: fonts.body },
  botaoSalvar: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  botaoSalvarTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
});
