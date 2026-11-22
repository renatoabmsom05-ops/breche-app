import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { redimensionarImagem } from '../lib/imagens';
import { colors, fonts, spacing, radius } from '../theme';

const ESTADOS = ['Novo com etiqueta', 'Ótimo estado', 'Bom estado', 'Usado'];

export default function CadastroPecaScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [marca, setMarca] = useState('');
  const [estado, setEstado] = useState('Bom estado');
  const [tipo, setTipo] = useState<'venda' | 'troca' | 'ambos'>('venda');
  const [preco, setPreco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotos, setFotos] = useState<(string | null)[]>([null, null, null]);
  const [salvando, setSalvando] = useState(false);
  const [modalSucesso, setModalSucesso] = useState(false);

  async function escolherFoto(indice: number) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Precisamos de acesso às fotos para continuar.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!resultado.canceled) {
      const novas = [...fotos];
      novas[indice] = resultado.assets[0].uri;
      setFotos(novas);
    }
  }

  function limparFormulario() {
    setTitulo('');
    setCategoria('');
    setTamanho('');
    setMarca('');
    setEstado('Bom estado');
    setTipo('venda');
    setPreco('');
    setObservacao('');
    setFotos([null, null, null]);
  }

  async function salvarPeca() {
    const fotosEscolhidas = fotos.filter(Boolean) as string[];
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo || fotosEscolhidas.length === 0 || (tipo !== 'troca' && !preco)) {
      Alert.alert('Preencha o nome, escolha ao menos 1 foto' + (tipo !== 'troca' ? ' e o preço.' : '.'));
      return;
    }
    setSalvando(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null;
      let longitude = null;
      if (status === 'granted') {
        const local = await Location.getCurrentPositionAsync({});
        latitude = local.coords.latitude;
        longitude = local.coords.longitude;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const urlsPublicas: string[] = [];
      for (let i = 0; i < fotosEscolhidas.length; i++) {
        const nomeArquivo = `${userId}/${Date.now()}_${i}.jpg`;
        const uriRedimensionada = await redimensionarImagem(fotosEscolhidas[i]);
        const base64 = await FileSystem.readAsStringAsync(uriRedimensionada, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decode(base64);
        const { error: erroUpload } = await supabase.storage
          .from('fotos-pecas')
          .upload(nomeArquivo, arrayBuffer, { contentType: 'image/jpeg' });
        if (erroUpload) throw erroUpload;
        const { data: urlPublica } = supabase.storage.from('fotos-pecas').getPublicUrl(nomeArquivo);
        urlsPublicas.push(urlPublica.publicUrl);
      }

      const observacaoLimpa = observacao.trim();
      const { error: erroInsert } = await supabase.from('pecas').insert({
        dono_id: userId,
        titulo: tituloLimpo,
        categoria: categoria.trim(),
        tamanho: tamanho.trim(),
        marca: marca.trim(),
        estado_peca: estado,
        tipo,
        preco: tipo !== 'troca' ? parseFloat(preco.replace(',', '.')) : 0,
        fotos: urlsPublicas,
        latitude,
        longitude,
        ...(observacaoLimpa ? { observacao: observacaoLimpa } : {}),
      });
      if (erroInsert) throw erroInsert;

      limparFormulario();
      setModalSucesso(true);
    } catch (erro: any) {
      Alert.alert('Erro ao salvar', erro.message ?? String(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>
        Adicionar <Text style={{ color: colors.accent }}>Peça</Text>
      </Text>
      <Text style={styles.subtitulo}>Cadastre uma roupa para trocar ou vender.</Text>

      <Text style={styles.label}>Fotos (até 3)</Text>
      <View style={styles.fotosRow}>
        {[0, 1, 2].map((i) => (
          <TouchableOpacity key={i} style={styles.fotoSlot} onPress={() => escolherFoto(i)}>
            {fotos[i] ? (
              <Image source={{ uri: fotos[i]! }} style={styles.fotoImagem} />
            ) : (
              <>
                <Text style={styles.fotoIcone}>{i === 0 ? '📷' : '+'}</Text>
                <Text style={styles.fotoLabel}>{i === 0 ? 'Principal' : `Foto ${i + 1}`}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nome da peça *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Jaqueta jeans vintage"
        placeholderTextColor={colors.placeholder}
        value={titulo}
        onChangeText={setTitulo}
      />

      <View style={styles.duasColunas}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Tamanho</Text>
          <TextInput style={styles.input} placeholder="M" value={tamanho} onChangeText={setTamanho} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.label}>Marca</Text>
          <TextInput style={styles.input} placeholder="Ex: Farm" value={marca} onChangeText={setMarca} />
        </View>
      </View>

      <Text style={styles.label}>Categoria</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: tênis, camiseta, jaqueta"
        value={categoria}
        onChangeText={setCategoria}
      />

      <Text style={styles.label}>Estado</Text>
      <View style={styles.chipsRow}>
        {ESTADOS.map((op) => (
          <TouchableOpacity
            key={op}
            style={[styles.chip, estado === op && styles.chipSelecionado]}
            onPress={() => setEstado(op)}
          >
            <Text style={[styles.chipTexto, estado === op && styles.chipTextoSelecionado]}>{op}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tipo de oferta</Text>
      <View style={styles.tipoRow}>
        <TouchableOpacity
          style={[styles.tipoBtn, tipo === 'venda' && { backgroundColor: colors.venda }]}
          onPress={() => setTipo('venda')}
        >
          <Text style={[styles.tipoTexto, tipo === 'venda' && { color: colors.white }]}>Venda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipoBtn, tipo === 'troca' && { backgroundColor: colors.accent }]}
          onPress={() => setTipo('troca')}
        >
          <Text style={[styles.tipoTexto, tipo === 'troca' && { color: colors.black }]}>Troca</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipoBtn, tipo === 'ambos' && { backgroundColor: colors.black }]}
          onPress={() => setTipo('ambos')}
        >
          <Text style={[styles.tipoTexto, tipo === 'ambos' && { color: colors.white }]}>Troca/Venda</Text>
        </TouchableOpacity>
      </View>

      {tipo !== 'troca' && (
        <>
          <Text style={styles.label}>Preço (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            keyboardType="numeric"
            value={preco}
            onChangeText={setPreco}
          />
        </>
      )}

      <Text style={styles.label}>Observações (opcional)</Text>
      <TextInput
        style={[styles.input, styles.inputObservacao]}
        placeholder="Ex: usado 1 vez, medidas, tecido ou algum detalhe da peça..."
        placeholderTextColor={colors.placeholder}
        value={observacao}
        onChangeText={setObservacao}
        multiline
        numberOfLines={4}
        maxLength={300}
      />
      <Text style={styles.contador}>{observacao.length}/300</Text>

      {salvando ? (
        <ActivityIndicator size="large" color={colors.black} style={{ marginTop: spacing.lg }} />
      ) : (
        <TouchableOpacity style={styles.botaoPublicar} onPress={salvarPeca}>
          <Text style={styles.botaoPublicarTexto}>Publicar peça</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalSucesso} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <View style={styles.modalIconeCirculo}>
              <Ionicons name="checkmark" size={32} color={colors.black} />
            </View>
            <Text style={styles.modalTitulo}>Peça no ar! ✨</Text>
            <Text style={styles.modalSubtitulo}>
              Sua peça já está visível para quem procura looks perto de você.
            </Text>

            <TouchableOpacity
              style={styles.modalBotaoPrimario}
              onPress={() => {
                setModalSucesso(false);
                navigation.navigate('Explorar');
              }}
            >
              <Text style={styles.modalBotaoPrimarioTexto}>Ver no Explorar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBotaoSecundario}
              onPress={() => setModalSucesso(false)}
            >
              <Text style={styles.modalBotaoSecundarioTexto}>Publicar outra peça</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  titulo: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.black },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
  fotosRow: { flexDirection: 'row', gap: spacing.sm },
  fotoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  fotoImagem: { width: '100%', height: '100%' },
  fotoIcone: { fontSize: 20, color: colors.textSecondary },
  fotoLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputObservacao: { height: 100, textAlignVertical: 'top' },
  contador: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  duasColunas: { flexDirection: 'row', marginTop: 0 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelecionado: { backgroundColor: colors.black, borderColor: colors.black },
  chipTexto: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  chipTextoSelecionado: { color: colors.white },
  tipoRow: { flexDirection: 'row', gap: spacing.sm },
  tipoBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipoTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  botaoPublicar: {
    backgroundColor: colors.black,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  botaoPublicarTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCartao: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalIconeCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitulo: {
    fontFamily: fonts.headingBlack,
    fontSize: 24,
    color: colors.black,
    textAlign: 'center',
  },
  modalSubtitulo: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  modalBotaoPrimario: {
    width: '100%',
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  modalBotaoPrimarioTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 15 },
  modalBotaoSecundario: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalBotaoSecundarioTexto: { color: colors.black, fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
