import * as ImageManipulator from 'expo-image-manipulator';

// Redimensiona e comprime uma foto antes de enviar pro Supabase Storage.
// Isso reduz muito o tamanho do arquivo (de ~1-2 MB pra ~150-300 KB),
// economizando espaço de armazenamento e, principalmente, tráfego de banda
// toda vez que a foto é exibida no app.
export async function redimensionarImagem(
  uri: string,
  larguraMaxima: number = 1080,
  qualidade: number = 0.7
): Promise<string> {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: larguraMaxima } }],
    { compress: qualidade, format: ImageManipulator.SaveFormat.JPEG }
  );
  return resultado.uri;
}
