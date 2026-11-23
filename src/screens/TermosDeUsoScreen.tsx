import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';

function Secao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <Text style={styles.secaoTexto}>{texto}</Text>
    </View>
  );
}

export default function TermosDeUsoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pill}>
        <Text style={styles.pillTexto}>ATUALIZADO EM 2026</Text>
      </View>

      <Secao
        titulo="1. Aceitação dos termos"
        texto="Ao criar uma conta e usar o Breché, você concorda com estes termos. Se não concordar, pedimos que não utilize o aplicativo."
      />
      <Secao
        titulo="2. O que é o Breché"
        texto="O Breché é uma plataforma que conecta pessoas interessadas em trocar ou vender roupas e calçados usados ou seminovos. Nós facilitamos o contato entre as partes, mas não somos parte da negociação em si."
      />
      <Secao
        titulo="3. Responsabilidade pelas negociações"
        texto="A negociação (combinar local de encontro, forma de pagamento, condição da peça, etc.) é de inteira responsabilidade dos usuários envolvidos. O Breché não garante a qualidade, autenticidade ou entrega das peças anunciadas, e não se responsabiliza por eventuais prejuízos decorrentes de negociações entre usuários."
      />
      <Secao
        titulo="4. Conta e cadastro"
        texto="Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta. As informações fornecidas no cadastro devem ser verdadeiras."
      />
      <Secao
        titulo="5. Conteúdo enviado por você"
        texto="Ao publicar fotos e descrições de peças, você garante que tem o direito de usá-las e que o conteúdo não é enganoso, ofensivo ou ilegal. Reservamo-nos o direito de remover conteúdo que viole estes termos."
      />
      <Secao
        titulo="6. Conduta esperada"
        texto="Pedimos respeito nas conversas e negociações. Comportamento abusivo, discriminatório, golpes ou tentativas de fraude podem levar à suspensão ou exclusão da conta, sem aviso prévio."
      />
      <Secao
        titulo="7. Propriedade intelectual"
        texto="A marca Breché, seu design e seu código pertencem aos seus desenvolvedores. Você não pode copiar, redistribuir ou usar comercialmente o aplicativo sem autorização."
      />
      <Secao
        titulo="8. Alterações nestes termos"
        texto="Podemos atualizar estes termos conforme o app evolui. Mudanças significativas serão comunicadas dentro do próprio aplicativo."
      />
      <Secao
        titulo="9. Contato"
        texto="Dúvidas sobre estes termos podem ser enviadas através do grupo de comunidade do Breché ou diretamente aos desenvolvedores."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  pillTexto: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.black, letterSpacing: 0.8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  secaoTitulo: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.black, marginBottom: 4 },
  secaoTexto: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textPrimary },
});
