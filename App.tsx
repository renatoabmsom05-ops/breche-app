import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as ExpoLinking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icones: Record<string, any> = {
            Explorar: 'shirt',
            Publicar: 'add-circle',
            Matches: 'heart',
            Perfil: 'person',
          };
          return <Ionicons name={icones[route.name]} size={size} color={color} />;
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

  const fontesProntas = playfairCarregada && interCarregada;

  const aoLayout = useCallback(async () => {
    if (fontesProntas) {
      await SplashScreen.hideAsync();
    }
  }, [fontesProntas]);

  useEffect(() => {
    aoLayout();
  }, [aoLayout]);

  const abrirChatDaNotificacao = useCallback(async (interesseId: string) => {
    const { data } = await supabase.auth.getSession();
    if (data.session && navigationRef.isReady()) {
      navigationRef.navigate('Chat', { interesseId });
    }
  }, []);

  useEffect(() => {
    // Se o app abrir já logado (sessão salva), registra o token de push de novo.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        registrarPushToken();
      }
    });
  }, []);

  useEffect(() => escutarToqueNotificacao(abrirChatDaNotificacao), [abrirChatDaNotificacao]);

  if (!fontesProntas) {
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
        <Stack.Navigator initialRouteName="Login">
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
