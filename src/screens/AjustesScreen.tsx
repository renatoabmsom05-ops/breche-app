import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

// Troque pelo link real do seu grupo quando tiver um criado.
const LINK_COMUNIDADE_WHATSAPP = 'https://chat.whatsapp.com/CqRMHn1Dwz6H77tWynMP3x';

function LinhaAjuste({ icone, texto, onPress, destrutivo }: any) {
  return (
    <TouchableOpacity style={styles.linha} onPress={onPress}>
      <Text style={styles.linhaIcone}>{icone}</Text>
      <Text style={[styles.linhaTexto, destrutivo && { color: '#D64545' }]}>{texto}</Text>
      <Text style={styles.linhaSeta}>›</Text>
    </TouchableOpacity>
  );
}

export default function AjustesScreen({ navigation }: any) {
  async function sair() {
    Alert.alert('Sair da conta', 'Tem certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }

  function abrirComunidade() {
    Linking.openURL(LINK_COMUNIDADE_WHATSAPP).catch(() =>
      Alert.alert('Não foi possível abrir o WhatsApp', 'Confira se o link do grupo está certo.')
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.secaoTitulo}>Conta</Text>
      <View style={styles.grupo}>
        <LinhaAjuste
          icone="👤"
          texto="Editar perfil"
          onPress={() => navigation.navigate('EditarPerfil')}
        />
      </View>

      <Text style={styles.secaoTitulo}>Preferências</Text>
      <View style={styles.grupo}>
        <LinhaAjuste icone="🔔" texto="Notificações" onPress={() => {}} />
      </View>

      <Text style={styles.secaoTitulo}>Comunidade</Text>
      <View style={styles.grupo}>
        <LinhaAjuste icone="💬" texto="Comunidade no WhatsApp" onPress={abrirComunidade} />
      </View>

      <Text style={styles.secaoTitulo}>Sobre</Text>
      <View style={styles.grupo}>
        <LinhaAjuste icone="ℹ️" texto="Sobre o Breché" onPress={() => navigation.navigate('Sobre')} />
        <LinhaAjuste icone="📄" texto="Termos de uso" onPress={() => navigation.navigate('Termos')} />
      </View>

      <View style={styles.grupo}>
        <LinhaAjuste icone="🚪" texto="Sair da conta" onPress={sair} destrutivo />
      </View>

      <Text style={styles.versao}>Breché · versão 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  secaoTitulo: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  grupo: { backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linhaIcone: { fontSize: 18, marginRight: spacing.md },
  linhaTexto: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  linhaSeta: { fontSize: 18, color: colors.textSecondary },
  versao: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.placeholder,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
