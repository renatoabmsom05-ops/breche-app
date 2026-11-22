import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const LARGURA_TELA = Dimensions.get('window').width;

const SLIDES = [
  {
    emoji: '👋',
    titulo: 'Bem-vindo ao Breché!',
    texto: 'Um jeito rápido e divertido de trocar e vender roupas com gente perto de você.',
    fundo: colors.background,
  },
  {
    emoji: '❤️ ✕',
    titulo: 'Arraste pro lado',
    texto:
      'Arraste a foto pra direita (ou toque no ❤️) quando quiser aquela peça — pra comprar ou trocar. Arraste pra esquerda (ou toque no ✕) se não for pra você.',
    fundo: '#EAF6CE', // leve tom esverdeado (combina com o accent)
  },
  {
    emoji: '👕',
    titulo: 'Publicar',
    texto: 'Toque aqui pra cadastrar uma peça sua — escolha fotos, tamanho, preço (ou marque como troca).',
    fundo: '#EDEAF6', // leve tom lilás
  },
  {
    emoji: '💚',
    titulo: 'Matches',
    texto: 'Aqui ficam guardadas as peças que você curtiu — toque numa pra rever as fotos.',
    fundo: '#F6EAEA', // leve tom rosado
  },
  {
    emoji: '👤',
    titulo: 'Perfil',
    texto: 'Veja suas peças publicadas, suas mensagens com outros usuários, e os ajustes do app.',
    fundo: '#EAF0F6', // leve tom azulado
  },
];

export default function TutorialScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  async function finalizar() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      await supabase.from('usuarios').update({ viu_tutorial: true }).eq('id', userId);
    }
    navigation.replace('Main');
  }

  function proximo() {
    if (indice === SLIDES.length - 1) {
      finalizar();
      return;
    }
    scrollRef.current?.scrollTo({ x: LARGURA_TELA * (indice + 1), animated: true });
    setIndice(indice + 1);
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: SLIDES[indice].fundo, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <TouchableOpacity style={styles.pular} onPress={finalizar}>
        <Text style={styles.pularTexto}>Pular</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { backgroundColor: slide.fundo }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.titulo}>{slide.titulo}</Text>
            <Text style={styles.texto}>{slide.texto}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.progressoRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={styles.progressoTrilho}>
            <View style={[styles.progressoPreenchido, i <= indice && { width: '100%' }]} />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.botao} onPress={proximo}>
        <Text style={styles.botaoTexto}>
          {indice === SLIDES.length - 1 ? 'Começar' : 'Próximo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pular: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  pularTexto: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: 14 },
  slide: {
    width: LARGURA_TELA,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  titulo: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.black, textAlign: 'center', marginBottom: spacing.sm },
  texto: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  progressoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    gap: 6,
  },
  progressoTrilho: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressoPreenchido: {
    width: 0,
    height: '100%',
    backgroundColor: colors.black,
    borderRadius: 2,
  },
  botao: {
    backgroundColor: colors.black,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  botaoTexto: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 16 },
});
