import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import { supabase } from './supabase';

// Carrega expo-notifications apenas fora do Expo Go para evitar o erro fatal
// introduzido a partir do Expo SDK 53 no Android ao usar push no Expo Go.
function obterNotifications(): typeof NotificationsType | null {
  if (isRunningInExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof NotificationsType;
  } catch {
    return null;
  }
}

/**
 * Configura a exibição de notificações recebidas com o app aberto.
 */
export function configurarHandlerNotificacoes(): void {
  const Notifications = obterNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Solicita permissão, gera o Expo Push Token do aparelho e salva em `usuarios.push_token`.
 */
export async function registrarPushToken(): Promise<void> {
  const Notifications = obterNotifications();
  if (!Notifications) {
    console.log('Notificações push desativadas no Expo Go. Use um development build ou APK.');
    return;
  }

  if (!Device.isDevice) {
    console.log('Notificações push só funcionam em dispositivo físico.');
    return;
  }

  try {
    const { status: statusAtual } = await Notifications.getPermissionsAsync();
    let status = statusAtual;
    if (status !== 'granted') {
      const resposta = await Notifications.requestPermissionsAsync();
      status = resposta.status;
    }
    if (status !== 'granted') {
      console.log('Permissão de notificação negada.');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mensagens e avisos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C6F135',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('EAS projectId não encontrado para registrar push token.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId && token) {
      await supabase.from('usuarios').update({ push_token: token }).eq('id', userId);
    }
  } catch (erro) {
    console.warn('Erro ao registrar push token:', erro);
  }
}

/**
 * Escuta toques do usuário em notificações enquanto o app está rodando ou em segundo plano.
 */
export function escutarToqueNotificacao(
  aoAbrirConversa: (interesseId: string) => void
): () => void {
  const Notifications = obterNotifications();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const interesseId = response.notification.request.content.data?.interesseId;
    if (typeof interesseId === 'string' && interesseId) {
      aoAbrirConversa(interesseId);
    }
  });

  return () => subscription.remove();
}

/**
 * Lê o `interesseId` da notificação que abriu o app a partir do estado fechado.
 */
export function obterInteresseInicialDaNotificacao(): string | null {
  const Notifications = obterNotifications();
  if (!Notifications) return null;

  try {
    const response = Notifications.getLastNotificationResponse();
    const interesseId = response?.notification.request.content.data?.interesseId;
    if (typeof interesseId === 'string' && interesseId) {
      Notifications.clearLastNotificationResponse();
      return interesseId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Envia uma notificação push para outro usuário via serviço Expo Push.
 */
export async function enviarNotificacao(
  destinatarioId: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: destinatario } = await supabase
      .from('usuarios')
      .select('push_token')
      .eq('id', destinatarioId)
      .single();

    const token = destinatario?.push_token;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: titulo,
        body: corpo,
        channelId: 'default',
        ...(dados ? { data: dados } : {}),
      }),
    });
  } catch (erro) {
    console.warn('Erro ao enviar notificação:', erro);
  }
}
