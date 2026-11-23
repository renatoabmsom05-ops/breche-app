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
  Linking,
  RefreshControl,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { redimensionarImagem } from '../lib/imagens';
import { colors, fonts, spacing, radius } from '../theme';

const ESTADOS = ['Novo com etiqueta', 'Ótimo estado', 'Bom estado', 'Usado'];

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
  const [atualizando, setAtualizando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<any>(null);
  const [processando, setProcessando] = useState(false);

  const [pecaEditando, setPecaEditando] = useState<any>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editTamanho, setEditTamanho] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editEstado, setEditEstado] = useState('Bom estado');
  const [editTipo, setEditTipo] = useState<'venda' | 'troca' | 'ambos'>('venda');
  const [editPreco, setEditPreco] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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

  async function aoAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  function abrirEdicao(peca: any) {
    setPecaSelecionada(null);
    setEditTitulo(peca.titulo ?? '');
    setEditTamanho(peca.tamanho ?? '');
    setEditMarca(peca.marca ?? '');
    setEditCategoria(peca.categoria ?? '');
    setEditEstado(ESTADOS.includes(peca.estado_peca) ? peca.estado_peca : 'Bom estado');
    setEditTipo(peca.tipo ?? 'venda');
    setEditPreco(peca.preco ? String(peca.preco) : '');
    setEditObservacao(peca.observacao ?? '');
    setPecaEditando(peca);
  }

  async function salvarEdicao() {
    if (!pecaEditando) return;
    const tituloLimpo = editTitulo.trim();
    if (!tituloLimpo) {
      Alert.alert('Nome obrigatório', 'Informe o nome da peça.');
      return;
    }

    const precoNumero = editTipo !== 'troca' ? parseFloat(editPreco.replace(',', '.')) : 0;
    if (editTipo !== 'troca' && (!editPreco.trim() || Number.isNaN(precoNumero) || precoNumero < 0)) {
      Alert.alert('Preço inválido', 'Digite um valor numérico válido, como 45 ou 45,90.');
      return;
    }

    setSalvandoEdicao(true);
    const { error } = await supabase
      .from('pecas')
      .update({
        titulo: tituloLimpo,
        tamanho: editTamanho.trim(),
        marca: editMarca.trim(),
        categoria: editCategoria.trim(),
        estado_peca: editEstado,
        tipo: editTipo,
        preco: precoNumero,
        observacao: editObservacao.trim() || null,
      })
      .eq('id', pecaEditando.id);

    setSalvandoEdicao(false);
    if (error) {
      Alert.alert('Erro ao salvar', error.message);
      return;
    }

    setPecaEditando(null);
    carregar();
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

  function trocarFotoPerfil() {
    Alert.alert('Foto de perfil', 'Como você quer escolher sua foto?', [
      { text: 'Tirar foto', onPress: () => enviarFotoPerfil('camera') },
      { text: 'Escolher da galeria', onPress: () => enviarFotoPerfil('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function enviarFotoPerfil(origem: 'camera' | 'galeria') {
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        origem === 'camera'
          ? 'Precisamos de acesso à câmera para continuar.'
          : 'Precisamos de acesso às fotos para continuar.'
      );
      return;
    }

    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    };

    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

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

  function abrirInstagram() {
    const handle = perfil?.instagram?.trim().replace(/^@/, '');
    if (!handle) return;
    Linking.openURL(`https://instagram.com/${handle}`).catch(() =>
      Alert.alert('Não foi possível abrir o Instagram')
    );
  }

  const instagramLimpo = perfil?.instagram?.trim().replace(/^@/, '');

  const cabecalhoLista = (
    <>
      <View style={styles.topoRow}>
        <Text style={styles.titulo}>Perfil</Text>
      </View>

      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={trocarFotoPerfil} style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {enviandoFoto ? (
              <ActivityIndicator color={colors.black} />
            ) : perfil?.foto_url ? (
              <Image source={{ uri: perfil.foto_url }} style={styles.avatarImagem} />
            ) : (
              <Text style={styles.avatarTexto}>{iniciais(perfil?.nome)}</Text>
            )}
          </View>
          <View style={styles.avatarEditarBadge}>
            <Ionicons name="camera" size={12} color={colors.white} />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.nome}>{perfil?.nome ?? '...'}</Text>
          <Text style={styles.email}>{perfil?.email}</Text>
          <Text style={styles.avaliacaoTexto}>
            {mediaAvaliacao
              ? `⭐ ${mediaAvaliacao.toFixed(1)} (${totalAvaliacoes} avaliaç${totalAvaliacoes === 1 ? 'ão' : 'ões'})`
              : 'Sem avaliações ainda'}
          </Text>
          {!!instagramLimpo && (
            <TouchableOpacity style={styles.instaPill} onPress={abrirInstagram}>
              <Ionicons name="logo-instagram" size={13} color={colors.black} />
              <Text style={styles.instaTexto}>@{instagramLimpo}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!!perfil?.bio?.trim() && (
        <View style={styles.bioCard}>
          <Text style={styles.bioTexto}>{perfil.bio.trim()}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.mensagensBtn}
        onPress={() => navigation.navigate('Mensagens')}
      >
        <View style={styles.menuIconeCirculo}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.black} />
        </View>
        <Text style={styles.mensagensTexto}>Mensagens</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mensagensBtn, { marginTop: spacing.sm }]}
        onPress={() => navigation.navigate('Ajustes')}
      >
        <View style={styles.menuIconeCirculo}>
          <Ionicons name="settings-outline" size={18} color={colors.black} />
        </View>
        <Text style={styles.mensagensTexto}>Ajustes</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Matches')}
        >
          <View style={[styles.statIconeCirculo, { backgroundColor: colors.accent }]}>
            <Ionicons name="heart" size={18} color={colors.black} />
          </View>
          <Text style={styles.statNumero}>{curtidas}</Text>
          <Text style={styles.statLabel}>Curtidas</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <View style={styles.statIconeCirculo}>
            <Ionicons name="shirt-outline" size={18} color={colors.black} />
          </View>
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
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <FlatList
        data={minhasPecas}
        keyExtractor={(item) => item.id}
        numColumns={3}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            tintColor={colors.black}
            colors={[colors.black]}
          />
        }
        ListHeaderComponent={cabecalhoLista}
        ListEmptyComponent={
          <TouchableOpacity
            style={styles.pecaVazia}
            onPress={() => navigation.navigate('Publicar')}
          >
            <Ionicons name="add" size={24} color={colors.textSecondary} />
            <Text style={styles.pecaVaziaTexto}>Adicionar primeira peça</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
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
                <TouchableOpacity
                  style={styles.modalOpcao}
                  onPress={() => abrirEdicao(pecaSelecionada)}
                >
                  <Text style={styles.modalOpcaoTexto}>✏️ Editar peça</Text>
                </TouchableOpacity>

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

      <Modal visible={!!pecaEditando} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalFundo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalEdicaoCartao, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalEdicaoHeader}>
              <Text style={styles.modalTitulo}>Editar peça</Text>
              <TouchableOpacity
                style={styles.fecharModalBtn}
                onPress={() => setPecaEditando(null)}
              >
                <Ionicons name="close" size={18} color={colors.black} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.editLabel}>Nome da peça *</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Ex: Jaqueta jeans vintage"
                placeholderTextColor={colors.placeholder}
                value={editTitulo}
                onChangeText={setEditTitulo}
              />

              <View style={styles.editDuasColunas}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Tamanho</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="M"
                    placeholderTextColor={colors.placeholder}
                    value={editTamanho}
                    onChangeText={setEditTamanho}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.editLabel}>Marca</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="Ex: Farm"
                    placeholderTextColor={colors.placeholder}
                    value={editMarca}
                    onChangeText={setEditMarca}
                  />
                </View>
              </View>

              <Text style={styles.editLabel}>Categoria</Text>
              <TextInput
                style={styles.editInput}
                placeholder="Ex: tênis, camiseta, jaqueta"
                placeholderTextColor={colors.placeholder}
                value={editCategoria}
                onChangeText={setEditCategoria}
              />

              <Text style={styles.editLabel}>Estado</Text>
              <View style={styles.editChipsRow}>
                {ESTADOS.map((op) => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.editChip, editEstado === op && styles.editChipAtivo]}
                    onPress={() => setEditEstado(op)}
                  >
                    <Text
                      style={[
                        styles.editChipTexto,
                        editEstado === op && styles.editChipTextoAtivo,
                      ]}
                    >
                      {op}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editLabel}>Tipo de oferta</Text>
              <View style={styles.editTipoRow}>
                <TouchableOpacity
                  style={[styles.editTipoBtn, editTipo === 'venda' && { backgroundColor: colors.venda }]}
                  onPress={() => setEditTipo('venda')}
                >
                  <Text style={[styles.editTipoTexto, editTipo === 'venda' && { color: colors.white }]}>
                    Venda
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editTipoBtn, editTipo === 'troca' && { backgroundColor: colors.accent }]}
                  onPress={() => setEditTipo('troca')}
                >
                  <Text style={[styles.editTipoTexto, editTipo === 'troca' && { color: colors.black }]}>
                    Troca
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editTipoBtn, editTipo === 'ambos' && { backgroundColor: colors.black }]}
                  onPress={() => setEditTipo('ambos')}
                >
                  <Text style={[styles.editTipoTexto, editTipo === 'ambos' && { color: colors.white }]}>
                    Troca/Venda
                  </Text>
                </TouchableOpacity>
              </View>

              {editTipo !== 'troca' && (
                <>
                  <Text style={styles.editLabel}>Preço (R$)</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="0,00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={editPreco}
                    onChangeText={setEditPreco}
                  />
                </>
              )}

              <Text style={styles.editLabel}>Observações (opcional)</Text>
              <TextInput
                style={[styles.editInput, styles.editObservacaoInput]}
                placeholder="Ex: usado 1 vez, medidas, tecido ou algum detalhe da peça..."
                placeholderTextColor={colors.placeholder}
                value={editObservacao}
                onChangeText={setEditObservacao}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.editContador}>{editObservacao.length}/300</Text>

              {salvandoEdicao ? (
                <ActivityIndicator color={colors.black} style={{ marginTop: spacing.lg }} />
              ) : (
                <TouchableOpacity style={styles.editSalvarBtn} onPress={salvarEdicao}>
                  <Text style={styles.editSalvarTexto}>Salvar alterações</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontFamily: fonts.headingBlack, fontSize: 26, color: colors.black },
  cabecalho: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  avatarWrap: { width: 64, height: 64, position: 'relative' },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  nome: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.black },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  avaliacaoTexto: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginTop: 4 },
  instaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  instaTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.black },
  bioCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bioTexto: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textPrimary },
  mensagensBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  menuIconeCirculo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  mensagensTexto: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  statsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statIconeCirculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumero: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  minhasPecasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  minhasPecasTitulo: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.black },
  adicionarLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.black, textDecorationLine: 'underline' },
  pecaVazia: {
    marginTop: spacing.sm,
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
  modalTitulo: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.black, marginBottom: spacing.md },
  modalOpcao: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOpcaoTexto: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
  modalEdicaoCartao: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  modalEdicaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  fecharModalBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
  editInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editDuasColunas: { flexDirection: 'row' },
  editChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editChipAtivo: { backgroundColor: colors.black, borderColor: colors.black },
  editChipTexto: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  editChipTextoAtivo: { color: colors.white },
  editTipoRow: { flexDirection: 'row', gap: spacing.sm },
  editTipoBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTipoTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  editObservacaoInput: { height: 96, textAlignVertical: 'top' },
  editContador: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  editSalvarBtn: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  editSalvarTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
});
