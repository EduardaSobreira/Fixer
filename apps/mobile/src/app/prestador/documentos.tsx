// Envio de RG, CNH e CCMEI para aprovação.
import type { TipoDocumento } from '@fixer/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Aviso, Botao, Cartao, Etiqueta, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { escolherFotos } from '@/lib/pedidos';
import { mensagemDeErro, supabase } from '@/lib/supabase';

interface Documento { id: string; tipo: TipoDocumento; status: 'enviado' | 'aprovado' | 'recusado'; motivo_recusa: string | null }

const NOME_DOC: Record<TipoDocumento, string> = { rg: 'RG (frente e verso)', cnh: 'CNH', ccmei: 'CCMEI' };

export default function Documentos() {
  const { sessao, prestador } = useAuth();
  const [tipo, setTipo] = useState<TipoDocumento>('rg');
  const [docs, setDocs] = useState<Documento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('documentos').select('id, tipo, status, motivo_recusa').order('criado_em', { ascending: false });
    setDocs((data as Documento[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function enviar() {
    if (!sessao) return;
    setErro(null);
    const uris = await escolherFotos(true);
    if (!uris.length) return;
    setEnviando(true);
    try {
      for (const uri of uris) {
        const caminho = `${sessao.user.id}/${tipo}-${Date.now()}.jpg`;
        const arquivo = await fetch(uri).then((r) => r.arrayBuffer());
        const up = await supabase.storage.from('documentos').upload(caminho, arquivo, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const ins = await supabase.from('documentos').insert({ prestador_id: sessao.user.id, tipo, arquivo: caminho });
        if (ins.error) throw ins.error;
      }
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const tipos: TipoDocumento[] = prestador?.modalidade === 'mei' ? ['rg', 'cnh', 'ccmei'] : ['rg', 'cnh'];

  return (
    <Tela>
      <Titulo subtitulo="Envie RG ou CNH. Se você tem MEI, envie também o CCMEI.">Seus documentos</Titulo>
      <Opcoes<TipoDocumento> valor={tipo} aoMudar={setTipo} opcoes={tipos.map((t) => ({ valor: t, titulo: NOME_DOC[t] }))} />
      <Botao titulo="Fotografar documento" onPress={enviar} carregando={enviando} />
      <Aviso>Seus documentos ficam guardados em uma pasta privada. Só a equipe Fixer vê, para aprovar seu cadastro.</Aviso>
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
      {docs.map((d) => (
        <Cartao key={d.id}>
          <Texto negrito>{NOME_DOC[d.tipo]}</Texto>
          <Etiqueta texto={d.status === 'enviado' ? 'Em análise' : d.status === 'aprovado' ? 'Aprovado' : 'Recusado'}
            tom={d.status === 'aprovado' ? 'sucesso' : d.status === 'recusado' ? 'erro' : 'alerta'} />
          {d.motivo_recusa ? <Texto secundario>{d.motivo_recusa}</Texto> : null}
        </Cartao>
      ))}
    </Tela>
  );
}
