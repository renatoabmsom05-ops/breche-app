import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

export default function MatchesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [fotosAbertas, setFotosAbertas] = useState<string[] | null>(null);
  const [indiceFoto, setIndiceFoto] = useState(0);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setCarregando(true);
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('interesses')
      .select('id, criado_em, pecas(id, titulo, fotos, preco, tipo)')
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false });
    setItens(data ?? []);
    setCarregando(false);
  }

  if (!carregando && itens.length === 0) {
    return (
      <View style={[styles.vazioContainer, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.tituloTop}>
          Seus <Text style={{ color: colors.accent }}>Matches</Text>
        </Text>
        <Text style={styles.subtitulo}>0 combinações</Text>
        <View style={styles.vazioCentro}>
          <Text style={styles.coracaoGrande}>♥</Text>
          <Text style={styles.vazioTitulo}>Nenhum match ainda</Text>
          <Text style={styles.vazioTexto}>
            Continue curtindo as peças pra encontrar seus matches!
          </Text>
          <TouchableOpacity
            style={styles.botaoExplorar}
            onPress={() => navigation.navigate('Explorar')}
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
        Seus <Text style={{ color: colors.accent }}>Matches</Text>
      </Text>
      <Text style={styles.subtitulo}>{itens.length} combinações</Text>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.linha}
            onPress={() => {
              setFotosAbertas(item.pecas?.fotos ?? []);
              setIndiceFoto(0);
            }}
          >
            <Image source={{ uri: item.pecas?.fotos?.[0] }} style={styles.linhaFoto} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.linhaTitulo}>{item.pecas?.titulo}</Text>
              <Text style={styles.linhaSub}>
                {item.pecas?.tipo === 'troca' ? 'Troca' : `R$ ${item.pecas?.preco?.toFixed(0)}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!fotosAbertas} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <TouchableOpacity style={styles.modalFechar} onPress={() => setFotosAbertas(null)}>
            <Text style={styles.modalFecharTexto}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const novoIndice = Math.round(
                e.nativeEvent.contentOffset.x / Dimensions.get('window').width
              );
              setIndiceFoto(novoIndice);
            }}
          >
            {fotosAbertas?.map((uri, i) => (
              <View key={i} style={styles.modalPagina}>
                <Image source={{ uri }} style={styles.modalImagem} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {fotosAbertas && fotosAbertas.length > 1 && (
            <View style={styles.modalDotsRow}>
              {fotosAbertas.map((_, i) => (
                <View key={i} style={[styles.modalDot, i === indiceFoto && styles.modalDotAtivo]} />
              ))}
            </View>
          )}
        </View>
      </Modal>
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
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalFechar: {
    position: 'absolute',
    top: 48,
    right: spacing.lg,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFecharTexto: { color: colors.white, fontSize: 18 },
  modalPagina: { width: Dimensions.get('window').width, alignItems: 'center', justifyContent: 'center' },
  modalImagem: { width: '100%', height: '80%' },
  modalDotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  modalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  modalDotAtivo: { backgroundColor: colors.accent },
});
