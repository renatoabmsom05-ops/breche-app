import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

export default function SobreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.logo}>
        Breché<Text style={{ color: colors.accent }}>.</Text>
      </Text>
      <Text style={styles.badge}>MODA CIRCULAR</Text>

      <Text style={styles.paragrafo}>
        Toda roupa guarda uma história — e às vezes, a próxima página dela é no armário de outra
        pessoa. Foi pensando nisso que o Breché nasceu.
      </Text>

      <Text style={styles.paragrafo}>
        Tudo começou com a <Text style={styles.destaque}>Letz Pinheiro</Text>, figurinista e minha
        namorada, que vivia cercada de peças lindas, novas e seminovas, sem uso — roupas que
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

      <Text style={styles.paragrafo}>
        Aqui, cada "match" é uma roupa que ganha uma segunda chance, um guarda-roupa que respira,
        e um pouquinho menos de moda descartada no mundo. Seja bem-vindo à moda circular.
      </Text>

      <Text style={styles.assinatura}>Renato César & Letz Pinheiro</Text>
      <Text style={styles.versao}>Breché · versão 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  logo: { fontFamily: fonts.headingBlack, fontSize: 34, color: colors.black },
  badge: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  paragrafo: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  destaque: { fontFamily: fonts.bodyBold, color: colors.black },
  assinatura: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.black,
    marginTop: spacing.lg,
  },
  versao: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.placeholder,
    marginTop: spacing.sm,
  },
});
