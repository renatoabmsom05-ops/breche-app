import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';

export default function SobreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Image source={require('../../assets/images/icon.png')} style={styles.heroIcone} />
          <View style={styles.badgePill}>
            <Text style={styles.badgeTexto}>MODA CIRCULAR</Text>
          </View>
        </View>

        <Text style={styles.logo}>
          Breché<Text style={{ color: colors.accent }}>.</Text>
        </Text>

        <View style={styles.citacaoBox}>
          <Text style={styles.citacaoTexto}>
            “Toda roupa guarda uma história — e às vezes, a próxima página dela é no armário de
            outra pessoa.”
          </Text>
        </View>
      </View>

      <View style={styles.historiaCard}>
        <Text style={styles.secaoKicker}>NOSSA HISTÓRIA</Text>

        <Text style={styles.paragrafo}>
          Tudo começou com a <Text style={styles.destaque}>Létz Pinheiro</Text>, figurinista e
          minha namorada, que vivia cercada de peças lindas, novas e seminovas, sem uso — roupas que
          mereciam ser vestidas de novo, por alguém que fosse se apaixonar por elas como ela um dia
          se apaixonou.
        </Text>

        <Text style={styles.paragrafo}>
          Da vontade dela de trocar essas roupas por outras, surgiu uma pergunta simples: e se
          existisse um jeito fácil, rápido e até divertido de conectar quem tem roupa parada com
          quem está à procura dela?
        </Text>

        <Text style={styles.paragrafo}>
          Eu sou <Text style={styles.destaque}>Renato César</Text>, estudante de Sistemas para
          Internet, e aceitei o desafio de transformar essa ideia em algo real. O Breché é fruto
          dessa parceria: tecnologia a serviço de um gesto tão humano quanto doar, trocar e
          reaproveitar.
        </Text>

        <Text style={[styles.paragrafo, { marginBottom: 0 }]}>
          Aqui, cada “match” é uma roupa que ganha uma segunda chance, um guarda-roupa que respira,
          e um pouquinho menos de moda descartada no mundo. Seja bem-vindo à moda circular.
        </Text>
      </View>

      <View style={styles.assinaturaCard}>
        <Text style={styles.assinatura}>
          Renato César &amp; Létz Pinheiro<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={styles.versao}>Breché · Moda Circular · versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  heroCard: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroIcone: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgePill: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.black,
    letterSpacing: 1,
  },
  logo: {
    fontFamily: fonts.headingBlack,
    fontSize: 38,
    color: colors.white,
    marginBottom: spacing.md,
  },
  citacaoBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
  },
  citacaoTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
    fontStyle: 'italic',
  },
  historiaCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  secaoKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.1,
    marginBottom: spacing.md,
  },
  paragrafo: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  destaque: { fontFamily: fonts.bodyBold, color: colors.black },
  assinaturaCard: {
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  assinatura: {
    fontFamily: fonts.headingBold,
    fontSize: 17,
    color: colors.white,
  },
  versao: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
