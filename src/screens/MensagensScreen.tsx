import React, { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

    const ids = Array.from(mapa.keys());
    const ultimasMensagens = new Map<string, { texto: string; criado_em: string }>();

    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from('mensagens')
        .select('interesse_id, texto, criado_em')
        .in('interesse_id', ids)
        .order('criado_em', { ascending: false });

      for (const m of msgs ?? []) {
        if (!ultimasMensagens.has(m.interesse_id)) {
          ultimasMensagens.set(m.interesse_id, { texto: m.texto, criado_em: m.criado_em });
        }
      }
    }

    const combinados = Array.from(mapa.values())
      .map((item) => {
        const ultima = ultimasMensagens.get(item.id);
        return {
          ...item,
          ultimaMensagem: ultima?.texto ?? null,
          ultimaAtividade: ultima?.criado_em ?? item.criado_em,
        };
      })
      .sort(
        (a, b) => new Date(b.ultimaAtividade).getTime() - new Date(a.ultimaAtividade).getTime()
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
      <Text style={styles.subtitulo}>
        {itens.length} {itens.length === 1 ? 'conversa' : 'conversas'}
      </Text>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const precoOuTroca =
            item.pecas?.tipo === 'troca'
              ? 'Troca'
              : `R$ ${item.pecas?.preco?.toFixed(0) ?? '0'}`;
          const souDono = item.pecas?.dono_id === meuId;

          return (
            <TouchableOpacity
              style={styles.linha}
              onPress={() => navigation.navigate('Chat', { interesseId: item.id })}
            >
              <Image source={{ uri: item.pecas?.fotos?.[0] }} style={styles.linhaFoto} />
              <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
                <View style={styles.linhaTopRow}>
                  <Text style={styles.linhaTitulo} numberOfLines={1}>
                    {item.pecas?.titulo}
                  </Text>
                  {souDono && (
                    <View style={styles.suaPecaPill}>
                      <Text style={styles.suaPecaTexto}>SUA PEÇA</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.linhaPreview} numberOfLines={1}>
                  {item.ultimaMensagem ?? 'Toque para iniciar a conversa 💬'}
                </Text>
                <Text style={styles.linhaSub}>{precoOuTroca}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
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
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  linhaFoto: { width: 58, height: 58, borderRadius: radius.sm },
  linhaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linhaTitulo: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  suaPecaPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  suaPecaTexto: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.black },
  linhaPreview: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  linhaSub: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.placeholder, marginTop: 2 },
});
