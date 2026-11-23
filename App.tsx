import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as ExpoLinking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts as usePlayfair,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  configurarHandlerNotificacoes,
  registrarPushToken,
  escutarToqueNotificacao,
  obterInteresseInicialDaNotificacao,
} from './src/lib/notificacoes';
import { supabase } from './src/lib/supabase';

import LoginScreen from './src/screens/LoginScreen';
import RecuperarSenhaScreen from './src/screens/RecuperarSenhaScreen';
import TutorialScreen from './src/screens/TutorialScreen';
import SwipeFeedScreen from './src/screens/SwipeFeedScreen';
import CadastroPecaScreen from './src/screens/CadastroPecaScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import MensagensScreen from './src/screens/MensagensScreen';
import AjustesScreen from './src/screens/AjustesScreen';
import TermosDeUsoScreen from './src/screens/TermosDeUsoScreen';
import EditarPerfilScreen from './src/screens/EditarPerfilScreen';
import SobreScreen from './src/screens/SobreScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import ChatScreen from './src/screens/ChatScreen';
import PecaDetalheScreen from './src/screens/PecaDetalheScreen';
import { colors, fonts } from './src/theme';

SplashScreen.preventAutoHideAsync();

configurarHandlerNotificacoes();

const navigationRef = createNavigationContainerRef<any>();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Configuração de "deep link": faz o link que o botão de compartilhar gera
// (algo como brecho://peca/abc123, ou exp://.../--/peca/abc123 no Expo Go)
// abrir direto a tela PecaDetalhe com esse id.
const linking = {
  prefixes: [ExpoLinking.createURL('/'), 'brecho://'],
  config: {
    screens: {
      PecaDetalhe: 'peca/:id',
    },
  },
};

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarIcon: ({ focused, color }) => {
          const icones: Record<string, { ativo: any; inativo: any }> = {
            Explorar: { ativo: 'shirt', inativo: 'shirt-outline' },
            Publicar: { ativo: 'add-circle', inativo: 'add-circle-outline' },
            Matches: { ativo: 'heart', inativo: 'heart-outline' },
            Perfil: { ativo: 'person', inativo: 'person-outline' },
          };
          const par = icones[route.name] ?? { ativo: 'ellipse', inativo: 'ellipse-outline' };
          return (
            <View
              style={{
                width: 44,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.accent : 'transparent',
              }}
            >
              <Ionicons
                name={focused ? par.ativo : par.inativo}
                size={20}
                color={focused ? colors.black : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Explorar" component={SwipeFeedScreen} />
      <Tab.Screen name="Publicar" component={CadastroPecaScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [playfairCarregada] = usePlayfair({ PlayfairDisplay_700Bold, PlayfairDisplay_900Black });
  const [interCarregada] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [rotaInicial, setRotaInicial] = useState<'Login' | 'Main' | 'Tutorial' | null>(null);

  const fontesProntas = playfairCarregada && interCarregada;
  const appPronto = fontesProntas && rotaInicial !== null;

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (userId) {
          registrarPushToken();
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('viu_tutorial')
            .eq('id', userId)
            .maybeSingle();
          if (ativo) {
            setRotaInicial(usuario?.viu_tutorial ? 'Main' : 'Tutorial');
          }
        } else if (ativo) {
          setRotaInicial('Login');
        }
      } catch {
        if (ativo) {
          setRotaInicial('Login');
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const aoLayout = useCallback(async () => {
    if (appPronto) {
      await SplashScreen.hideAsync();
    }
  }, [appPronto]);

  useEffect(() => {
    aoLayout();
  }, [aoLayout]);

  const abrirChatDaNotificacao = useCallback(async (interesseId: string) => {
    const { data } = await supabase.auth.getSession();
    if (data.session && navigationRef.isReady()) {
      navigationRef.navigate('Chat', { interesseId });
    }
  }, []);

  useEffect(() => escutarToqueNotificacao(abrirChatDaNotificacao), [abrirChatDaNotificacao]);

  if (!appPronto || !rotaInicial) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          const interesseId = obterInteresseInicialDaNotificacao();
          if (interesseId) abrirChatDaNotificacao(interesseId);
        }}
      >
        <Stack.Navigator
          initialRouteName={rotaInicial}
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.black,
            headerTitleStyle: { fontFamily: fonts.headingBold, fontSize: 19, color: colors.black },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RecuperarSenha" component={RecuperarSenhaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Mensagens" component={MensagensScreen} options={{ title: 'Mensagens' }} />
          <Stack.Screen name="Ajustes" component={AjustesScreen} options={{ title: 'Ajustes' }} />
          <Stack.Screen name="Termos" component={TermosDeUsoScreen} options={{ title: 'Termos de Uso' }} />
          <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} options={{ title: 'Editar perfil' }} />
          <Stack.Screen name="Sobre" component={SobreScreen} options={{ title: 'Sobre o Breché' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Conversa' }} />
          <Stack.Screen name="PecaDetalhe" component={PecaDetalheScreen} options={{ title: 'Peça' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
