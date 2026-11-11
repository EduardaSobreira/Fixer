import type { Modalidade } from '@fixer/shared';
import { useState } from 'react';
import { Aviso, Botao, Campo, Opcoes, Tela, Titulo } from '@/components/ui';
import { mensagemDeErro, supabase } from '@/lib/supabase';

type TipoConta = 'cliente' | 'prestador';

export default function Cadastro() {
  const [tipo, setTipo] = useState<TipoConta>('cliente');
  const [modalidade, setModalidade] = useState<Modalidade>('cpf');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar() {
    const e: Record<string, string> = {};
    if (nome.trim().length < 3) e.nome = 'Digite seu nome completo.';
    if (telefone.replace(/\D/g, '').length < 10) e.telefone = 'Digite o celular com DDD.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Digite um e-mail válido.';
    if (senha.length < 6) e.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function cadastrar() {
    setErroGeral(null);
    if (!validar()) return;
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { nome: nome.trim(), telefone: telefone.replace(/\D/g, ''), tipo, modalidade },
      },
    });
    setEnviando(false);
    if (error) return setErroGeral(mensagemDeErro(error));
    // Se a confirmação por e-mail estiver ligada no Supabase, ainda não há sessão.
    if (!data.session) setAviso('Enviamos um link para o seu e-mail. Confirme e depois entre no app.');
  }

  return (
    <Tela>
      <Titulo subtitulo="Escolha como você vai usar o Fixer.">Criar conta</Titulo>
      <Opcoes<TipoConta>
        valor={tipo}
        aoMudar={setTipo}
        opcoes={[
          { valor: 'cliente', titulo: 'Preciso de um serviço', descricao: 'Peça frete e montagem de móveis.' },
          { valor: 'prestador', titulo: 'Quero trabalhar', descricao: 'Receba pedidos perto de você. Seu cadastro passa por aprovação.' },
        ]}
      />
      {tipo === 'prestador' ? (
        <Opcoes<Modalidade>
          rotulo="Como você trabalha?"
          valor={modalidade}
          aoMudar={setModalidade}
          opcoes={[
            { valor: 'cpf', titulo: 'Com CPF', descricao: 'Você pode adicionar MEI depois, na mesma conta.' },
            { valor: 'mei', titulo: 'Tenho MEI', descricao: 'Vamos pedir o CCMEI depois do cadastro.' },
          ]}
        />
      ) : null}
      <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} erro={erros.nome} autoComplete="name" />
      <Campo rotulo="Celular com DDD" value={telefone} onChangeText={setTelefone} erro={erros.telefone} keyboardType="phone-pad" placeholder="(51) 99999-9999" />
      <Campo rotulo="E-mail" value={email} onChangeText={setEmail} erro={erros.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Campo rotulo="Senha" value={senha} onChangeText={setSenha} erro={erros.senha} secureTextEntry autoComplete="new-password" ajuda="Pelo menos 6 caracteres." />
      {erroGeral ? <Aviso tom="erro">{erroGeral}</Aviso> : null}
      {aviso ? <Aviso>{aviso}</Aviso> : null}
      <Botao titulo="Criar conta" onPress={cadastrar} carregando={enviando} />
    </Tela>
  );
}
