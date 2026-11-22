import React, { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function MensagensScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [meuId, setMeuId] = useState<string | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setCarregando(true);
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id ?? null;
    setMeuId(usuarioId);
    if (!usuarioId) {
      setCarregando(false);
      return;
    }

    const [{ data: comoComprador }, { data: comoVendedor }] = await Promise.all([
      supabase
        .from('interesses')
        .select('id, criado_em, usuario_id, pecas(id, titulo, fotos, preco, tipo, dono_id)')
        .eq('usuario_id', usuarioId)
        .order('criado_em', { ascending: false }),
      supabase
        .from('interesses')
        .select('id, criado_em, usuario_id, pecas!inner(id, titulo, fotos, preco, tipo, dono_id)')
        .eq('pecas.dono_id', usuarioId)
        .order('criado_em', { ascending: false }),
    ]);

    const mapa = new Map<string, any>();
    for (const item of [...(comoComprador ?? []), ...(comoVendedor ?? [])]) {
      mapa.set(item.id, item);
    }

    const combinados = Array.from(mapa.values()).sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );

    setItens(combinados);
    setCarregando(false);
  }

  if (!carregando && itens.length === 0) {
    return (
      <View style={[styles.vazioContainer, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.tituloTop}>
          Suas <Text style={{ color: colors.accent }}>Mensagens</Text>
        </Text>
        <Text style={styles.subtitulo}>0 conversas</Text>
        <View style={styles.vazioCentro}>
          <Text style={styles.coracaoGrande}>💬</Text>
          <Text style={styles.vazioTitulo}>Nenhuma conversa ainda</Text>
          <Text style={styles.vazioTexto}>
            Curta peças no Explorar pra começar a conversar com os vendedores!
          </Text>
          <TouchableOpacity
            style={styles.botaoExplorar}
            onPress={() => navigation.navigate('Main', { screen: 'Explorar' })}
          >
            <Text style={styles.botaoExplorarTexto}>Explorar peças</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.tituloTop}>
        Suas <Text style={{ color: colors.accent }}>Mensagens</Text>
      </Text>
      <Text style={styles.subtitulo}>{itens.length} conversas</Text>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const precoOuTroca =
            item.pecas?.tipo === 'troca' ? 'Troca' : `R$ ${item.pecas?.preco?.toFixed(0)}`;
          const souDono = item.pecas?.dono_id === meuId;

          return (
            <TouchableOpacity
              style={styles.linha}
              onPress={() => navigation.navigate('Chat', { interesseId: item.id })}
            >
              <Image source={{ uri: item.pecas?.fotos?.[0] }} style={styles.linhaFoto} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.linhaTitulo}>{item.pecas?.titulo}</Text>
                <Text style={styles.linhaSub}>
                  {souDono ? `Sua peça • ${precoOuTroca}` : precoOuTroca}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  vazioContainer: { flex: 1, backgroundColor: colors.background },
  tituloTop: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.black, paddingHorizontal: spacing.lg },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: 4 },
  vazioCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  coracaoGrande: { fontSize: 48, color: colors.accent, marginBottom: spacing.md },
  vazioTitulo: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black, marginBottom: spacing.sm },
  vazioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  botaoExplorar: { backgroundColor: colors.black, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  botaoExplorarTexto: { fontFamily: fonts.bodyBold, color: colors.white },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  linhaFoto: { width: 56, height: 56, borderRadius: radius.sm },
  linhaTitulo: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  linhaSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
