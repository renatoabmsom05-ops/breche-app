import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { redimensionarImagem } from '../lib/imagens';
import { colors, fonts, spacing, radius } from '../theme';

// Extrai o caminho do arquivo a partir da URL pública, pra conseguir apagar do Storage.
// Ex: ".../object/public/fotos-pecas/abc123/foto.jpg?t=123" -> "abc123/foto.jpg"
function caminhoDoArquivo(url: string): string | null {
  const marcador = '/fotos-pecas/';
  const indice = url.indexOf(marcador);
  if (indice === -1) return null;
  return url.slice(indice + marcador.length).split('?')[0];
}

function iniciais(nome: string | null) {
  if (!nome) return '??';
  const partes = nome.trim().split(' ');
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}

export default function PerfilScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<any>(null);
  const [curtidas, setCurtidas] = useState(0);
  const [mediaAvaliacao, setMediaAvaliacao] = useState<number | null>(null);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0);
  const [minhasPecas, setMinhasPecas] = useState<any[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<any>(null);
  const [processando, setProcessando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser();
    const usuarioId = userData.user?.id;
    if (!usuarioId) return;

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioId)
      .single();
    setPerfil({ ...usuario, email: userData.user?.email });

    const { count } = await supabase
      .from('interesses')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId);
    setCurtidas(count ?? 0);

    const { data: pecas } = await supabase
      .from('pecas')
      .select('*')
      .eq('dono_id', usuarioId)
      .order('criado_em', { ascending: false });
    setMinhasPecas(pecas ?? []);

    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select('nota')
      .eq('avaliado_id', usuarioId);
    if (avaliacoes && avaliacoes.length > 0) {
      const soma = avaliacoes.reduce((acc, a) => acc + a.nota, 0);
      setMediaAvaliacao(soma / avaliacoes.length);
      setTotalAvaliacoes(avaliacoes.length);
    } else {
      setMediaAvaliacao(null);
      setTotalAvaliacoes(0);
    }
  }

  async function marcarVendido(peca: any, vendido: boolean) {
    setProcessando(true);
    const { error } = await supabase
      .from('pecas')
      .update({ status: vendido ? 'vendido' : 'disponivel' })
      .eq('id', peca.id);
    setProcessando(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setPecaSelecionada(null);
    carregar();
  }

  function confirmarApagar(peca: any) {
    Alert.alert(
      'Apagar peça',
      'Isso remove a peça, as fotos e a conversa relacionada a ela para sempre. Não dá pra desfazer. Quer continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => apagarPeca(peca) },
      ]
    );
  }

  async function apagarPeca(peca: any) {
    setProcessando(true);
    try {
      const caminhos = (peca.fotos ?? [])
        .map((url: string) => caminhoDoArquivo(url))
        .filter(Boolean) as string[];

      if (caminhos.length > 0) {
        await supabase.storage.from('fotos-pecas').remove(caminhos);
      }

      const { error } = await supabase.from('pecas').delete().eq('id', peca.id);
      if (error) throw error;

      setPecaSelecionada(null);
      carregar();
    } catch (erro: any) {
      Alert.alert('Erro ao apagar', erro.message ?? String(erro));
    } finally {
      setProcessando(false);
    }
  }

  async function trocarFotoPerfil() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Precisamos de acesso às fotos para continuar.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;

    setEnviandoFoto(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const nomeArquivo = `avatares/${userId}.jpg`;

      const uriRedimensionada = await redimensionarImagem(resultado.assets[0].uri, 500);
      const base64 = await FileSystem.readAsStringAsync(uriRedimensionada, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const { error: erroUpload } = await supabase.storage
        .from('fotos-pecas')
        .upload(nomeArquivo, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (erroUpload) throw erroUpload;

      const { data: urlPublica } = supabase.storage.from('fotos-pecas').getPublicUrl(nomeArquivo);
      const urlComCache = `${urlPublica.publicUrl}?t=${Date.now()}`;

      const { error: erroUpdate } = await supabase
        .from('usuarios')
        .update({ foto_url: urlComCache })
        .eq('id', userId);
      if (erroUpdate) throw erroUpdate;

      setPerfil((atual: any) => ({ ...atual, foto_url: urlComCache }));
    } catch (erro: any) {
      Alert.alert('Erro ao enviar foto', erro.message ?? String(erro));
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.topoRow}>
        <Text style={styles.titulo}>Perfil</Text>
      </View>

      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={trocarFotoPerfil} style={styles.avatar}>
          {enviandoFoto ? (
            <ActivityIndicator color={colors.black} />
          ) : perfil?.foto_url ? (
            <Image source={{ uri: perfil.foto_url }} style={styles.avatarImagem} />
          ) : (
            <Text style={styles.avatarTexto}>{iniciais(perfil?.nome)}</Text>
          )}
          <View style={styles.avatarEditarBadge}>
            <Text style={styles.avatarEditarTexto}>✎</Text>
          </View>
        </TouchableOpacity>
        <View style={{ marginLeft: spacing.md }}>
          <Text style={styles.nome}>{perfil?.nome ?? '...'}</Text>
          <Text style={styles.email}>{perfil?.email}</Text>
          <Text style={styles.avaliacaoTexto}>
            {mediaAvaliacao
              ? `⭐ ${mediaAvaliacao.toFixed(1)} (${totalAvaliacoes} avaliaç${totalAvaliacoes === 1 ? 'ão' : 'ões'})`
              : 'Sem avaliações ainda'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.mensagensBtn}
        onPress={() => navigation.navigate('Mensagens')}
      >
        <Text style={styles.mensagensIcone}>💬</Text>
        <Text style={styles.mensagensTexto}>Mensagens</Text>
        <Text style={styles.mensagensSeta}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mensagensBtn}
        onPress={() => navigation.navigate('Ajustes')}
      >
        <Text style={styles.mensagensIcone}>⚙️</Text>
        <Text style={styles.mensagensTexto}>Ajustes</Text>
        <Text style={styles.mensagensSeta}>›</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Matches')}
        >
          <Text style={styles.statIcone}>♥</Text>
          <Text style={styles.statNumero}>{curtidas}</Text>
          <Text style={styles.statLabel}>Curtidas</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <Text style={styles.statIcone}>👕</Text>
          <Text style={styles.statNumero}>{minhasPecas.length}</Text>
          <Text style={styles.statLabel}>Peças</Text>
        </View>
      </View>

      <View style={styles.minhasPecasHeader}>
        <Text style={styles.minhasPecasTitulo}>Minhas peças</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Publicar')}>
          <Text style={styles.adicionarLink}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {minhasPecas.length === 0 ? (
        <TouchableOpacity
          style={styles.pecaVazia}
          onPress={() => navigation.navigate('Publicar')}
        >
          <Text style={{ fontSize: 22, color: colors.textSecondary }}>+</Text>
          <Text style={styles.pecaVaziaTexto}>Adicionar primeira peça</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={minhasPecas}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pecaThumbBox}
              onPress={() => setPecaSelecionada(item)}
            >
              <Image source={{ uri: item.fotos?.[0] }} style={styles.pecaThumb} />
              {item.status === 'vendido' && (
                <View style={styles.pecaVendidoBadge}>
                  <Text style={styles.pecaVendidoTexto}>VENDIDO</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!pecaSelecionada} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <Text style={styles.modalTitulo} numberOfLines={1}>
              {pecaSelecionada?.titulo}
            </Text>

            {processando ? (
              <ActivityIndicator color={colors.black} style={{ marginVertical: spacing.lg }} />
            ) : (
              <>
                {pecaSelecionada?.status === 'vendido' ? (
                  <TouchableOpacity
                    style={styles.modalOpcao}
                    onPress={() => marcarVendido(pecaSelecionada, false)}
                  >
                    <Text style={styles.modalOpcaoTexto}>↩️ Marcar como disponível de novo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalOpcao}
                    onPress={() => marcarVendido(pecaSelecionada, true)}
                  >
                    <Text style={styles.modalOpcaoTexto}>✅ Marcar como vendido/trocado</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.modalOpcao}
                  onPress={() => confirmarApagar(pecaSelecionada)}
                >
                  <Text style={[styles.modalOpcaoTexto, { color: '#D64545' }]}>
                    🗑️ Apagar peça e fotos
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalOpcao, { borderBottomWidth: 0 }]}
              onPress={() => setPecaSelecionada(null)}
            >
              <Text style={[styles.modalOpcaoTexto, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg },
  titulo: { fontFamily: fonts.headingBlack, fontSize: 26, color: colors.black },
  ajustesIcone: { fontSize: 22 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImagem: { width: '100%', height: '100%' },
  avatarTexto: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.black },
  avatarEditarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarEditarTexto: { color: colors.white, fontSize: 11 },
  nome: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.black },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  avaliacaoTexto: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginTop: 4 },
  mensagensBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  mensagensIcone: { fontSize: 18, marginRight: spacing.sm },
  mensagensTexto: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  mensagensSeta: { fontSize: 20, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, alignItems: 'center', paddingVertical: spacing.md },
  statIcone: { fontSize: 18, marginBottom: 4 },
  statNumero: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  minhasPecasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  minhasPecasTitulo: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.black },
  adicionarLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.black, textDecorationLine: 'underline' },
  pecaVazia: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  pecaVaziaTexto: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, marginTop: 6 },
  pecaThumbBox: { width: '31%', aspectRatio: 1, margin: '1.16%' },
  pecaThumb: { width: '100%', height: '100%', borderRadius: radius.sm },
  pecaVendidoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  pecaVendidoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 9 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCartao: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitulo: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.black, marginBottom: spacing.md },
  modalOpcao: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOpcaoTexto: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
});
