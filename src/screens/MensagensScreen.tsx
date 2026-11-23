import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

function formatarHorarioResumo(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const agora = new Date();
  const mesmoDia =
    d.getFullYear() === agora.getFullYear() &&
    d.getMonth() === agora.getMonth() &&
    d.getDate() === agora.getDate();

  if (mesmoDia) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  const foiOntem =
    d.getFullYear() === ontem.getFullYear() &&
    d.getMonth() === ontem.getMonth() &&
    d.getDate() === ontem.getDate();

  if (foiOntem) return 'Ontem';

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

export default function MensagensScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [meuId, setMeuId] = useState<string | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar(mostrarLoading = true) {
    if (mostrarLoading) setCarregando(true);
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id ?? null;
    setMeuId(usuarioId);
    if (!usuarioId) {
      if (mostrarLoading) setCarregando(false);
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
    if (mostrarLoading) setCarregando(false);
  }

  async function aoAtualizar() {
    setAtualizando(true);
    await carregar(false);
    setAtualizando(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topoContador}>
        <Text style={styles.subtitulo}>
          {itens.length} {itens.length === 1 ? 'conversa' : 'conversas'}
        </Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            tintColor={colors.black}
            colors={[colors.black]}
          />
        }
        contentContainerStyle={[
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xs,
            paddingBottom: insets.bottom + spacing.lg,
          },
          itens.length === 0 && { flexGrow: 1 },
        ]}
        ListEmptyComponent={
          carregando ? (
            <View style={styles.vazioCentro}>
              <ActivityIndicator size="large" color={colors.black} />
            </View>
          ) : (
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
          )
        }
        renderItem={({ item }) => {
          const precoOuTroca =
            item.pecas?.tipo === 'troca'
              ? 'Troca'
              : `R$ ${item.pecas?.preco?.toFixed(0) ?? '0'}`;
          const souDono = item.pecas?.dono_id === meuId;
          const horario = formatarHorarioResumo(item.ultimaAtividade);

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
                  {!!horario && <Text style={styles.linhaHorario}>{horario}</Text>}
                </View>
                <Text style={styles.linhaPreview} numberOfLines={1}>
                  {item.ultimaMensagem ?? 'Toque para iniciar a conversa 💬'}
                </Text>
                <View style={styles.linhaMetaRow}>
                  <Text style={styles.linhaSub}>{precoOuTroca}</Text>
                  {souDono && (
                    <View style={styles.suaPecaPill}>
                      <Text style={styles.suaPecaTexto}>SUA PEÇA</Text>
                    </View>
                  )}
                </View>
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
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xs },
  topoContador: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  subtitulo: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
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
  linhaTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linhaTitulo: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  linhaHorario: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.placeholder },
  linhaPreview: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  linhaMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  suaPecaPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  suaPecaTexto: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.black },
  linhaSub: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.placeholder },
});
