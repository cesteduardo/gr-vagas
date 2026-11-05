'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { EstadoForm } from '@/components/formulario-base';
import { abrirSessao, criarConta, definirSenha, dentroDoLimite, destinoSeguro, entrarComSenha, pedirLink, usarLink } from '@/lib/auth/contas';
import { ipDe } from '@/lib/ip';
import { exigirAdmin, exigirCandidato, exigirContratante, exigirUsuario, gravarCookieSessao, sairDaSessao, usuarioAtual } from '@/lib/auth/sessao';
import { avisarNovaCandidatura, candidatarLogado, enviarMensagem, mudarEtapa } from '@/lib/candidaturas';
import { cidadePorSlug, SIMULADOR, URL_SITE, urlSiteSegura } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { empresas, usuarios, vagas, type ConfigArte } from '@/lib/db/schema';
import { enviarEmail } from '@/lib/email';
import { validarEmail, validarSenha } from '@/lib/forms/validators';
import { errosEmpresa, errosPessoa, pessoaNormalizada, validarVaga, type CamposVaga } from '@/lib/forms/vaga';
import { revisarTexto } from '@/lib/moderacao';
import { validarPerfilEmpresa } from '@/lib/empresa';
import { cvValido } from '@/lib/curriculo';
import { aplicarCurriculo } from '@/lib/perfil-do-curriculo';
import { alternarSalva, apagarAlerta, criarAlerta, excluirConta, guardarCurriculo, salvarPerfil } from '@/lib/perfis';
import { assinar, cancelar } from '@/lib/planos';
import { alternarDestaque, denunciar, editarVaga, mudarEstadoVaga, publicarVaga, resolverDenuncia, salvarArte, vagaAceitaCandidatura } from '@/lib/vagas';
import { eq } from 'drizzle-orm';

const texto = (f: FormData, n: string) => String(f.get(n) ?? '');

// Limites por IP e por conta, contados no banco (valem com mais de uma instância).
const ipAtual = async () => ipDe(await headers());
const HORA = 60 * 60 * 1000;
const limiteIp = async (acao: string, maximo: number, janelaMs = HORA) => dentroDoLimite(await banco(), `${acao}:ip:${await ipAtual()}`, maximo, janelaMs);
const limiteConta = async (acao: string, usuarioId: string, maximo: number, janelaMs = HORA) => dentroDoLimite(await banco(), `${acao}:u:${usuarioId}`, maximo, janelaMs);
const MUITOS = 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.';



const camposVaga = (f: FormData): CamposVaga => ({ titulo: texto(f, 'titulo'), area: texto(f, 'area'), contrato: texto(f, 'contrato'), modalidade: texto(f, 'modalidade'), cidade: texto(f, 'cidade'), salarioTipo: texto(f, 'salarioTipo'), salario: texto(f, 'salario'), descricao: texto(f, 'descricao'), requisitos: texto(f, 'requisitos'), beneficios: texto(f, 'beneficios'), tags: f.getAll('tags').map(String) });

// Envia o link de acesso. Em demonstração ele também volta para a tela, sem e-mail de verdade.
async function mandarLink(email: string, destino: string, assunto: string, confirmaSenha = false): Promise<{ limite: boolean; link?: string; falhou?: boolean }> {
  if (!urlSiteSegura()) {
    console.error('Link de acesso bloqueado: NEXT_PUBLIC_SITE_URL precisa começar com https:// em produção.');
    return { limite: false, falhou: true };
  }
  const r = await pedirLink(await banco(), email, destino, confirmaSenha);
  if (!r.ok) return { limite: true };
  if (!r.token) return { limite: false };
  const link = `${URL_SITE}/acesso/${r.token}`;
  const enviado = await enviarEmail(email.trim().toLowerCase(), assunto, `Use este link para entrar. Ele vale por 1 hora e funciona uma vez:\n\n${link}\n\nSe não foi você que pediu, ignore este e-mail.`);
  return { limite: false, link: SIMULADOR ? `/acesso/${r.token}` : undefined, falhou: !enviado };
}

export async function acaoSair() {
  await sairDaSessao();
  redirect('/');
}

export async function acaoEntrar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const email = texto(f, 'email');
  const erro = validarEmail(email);
  if (erro) return { erros: { email: erro } };
  if (!(await limiteIp('link', 20, 15 * 60 * 1000))) return { erro: MUITOS };
  const r = await mandarLink(email, destinoSeguro(texto(f, 'destino'), '/entrar'), 'Seu link de acesso ao GR Vagas');
  if (r.limite) return { erro: 'Muitos pedidos para este e-mail. Aguarde 15 minutos e tente de novo.' };
  if (r.falhou) return { erro: 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' };
  return { ok: true, aviso: 'Se houver uma conta com este e-mail, o link já está a caminho.', link: r.link };
}

export async function acaoEntrarSenha(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const email = texto(f, 'email');
  const senha = texto(f, 'senha');
  const erros: Record<string, string> = {};
  const erroEmail = validarEmail(email);
  if (erroEmail) erros.email = erroEmail;
  if (!senha) erros.senha = 'Informe a senha.';
  if (Object.keys(erros).length) return { erros };
  if (!(await limiteIp('entrar', 40, 15 * 60 * 1000))) return { erro: MUITOS };
  const r = await entrarComSenha(await banco(), email, senha);
  if (!r.ok) return { erro: r.erro };
  await gravarCookieSessao(r.sessao);
  redirect(destinoSeguro(texto(f, 'destino'), r.tipo === 'contratante' ? '/painel' : '/candidato'));
}

export async function acaoCriarConta(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const tipo = texto(f, 'tipo') === 'contratante' ? 'contratante' : 'candidato';
  const pessoa = { nome: texto(f, 'nome'), email: texto(f, 'email'), telefone: texto(f, 'telefone') };
  const senha = texto(f, 'senha');
  const empresa = texto(f, 'empresa').trim();
  const erros: Record<string, string> = { ...errosPessoa(pessoa) };
  const erroSenha = validarSenha(senha);
  if (erroSenha) erros.senha = erroSenha;
  const erroEmpresa = tipo === 'contratante' ? errosEmpresa(empresa) : null;
  if (erroEmpresa) erros.empresa = erroEmpresa;
  if (Object.keys(erros).length) return { erros };
  if (!(await limiteIp('conta', 20))) return { erro: MUITOS };
  const n = pessoaNormalizada(pessoa);
  const db = await banco();
  const r = await criarConta(db, { tipo, ...n, senha, empresa });
  if (!r.ok || !r.usuarioId) return { erros: { email: 'Este e-mail já tem conta. Use a tela de entrar.' } };
  await gravarCookieSessao(await abrirSessao(db, r.usuarioId));
  const inicio = tipo === 'contratante' ? '/painel' : '/candidato';
  await mandarLink(n.email, inicio, 'Confirme seu e-mail no GR Vagas', true);
  redirect(destinoSeguro(texto(f, 'destino'), inicio));
}

export async function acaoDefinirSenha(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const senha = texto(f, 'senha');
  const erro = validarSenha(senha);
  if (erro) return { erros: { senha: erro } };
  await definirSenha(await banco(), u.id, senha, (await cookies()).get('sessao')?.value);
  return { ok: true, aviso: 'Senha salva. Agora você também pode entrar com ela.' };
}

export async function acaoReenviar(): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const r = await mandarLink(u.email, u.tipo === 'contratante' ? '/painel' : '/candidato', 'Confirme seu e-mail no GR Vagas', true);
  if (r.limite) return { erro: 'Muitos pedidos. Aguarde 15 minutos e tente de novo.' };
  if (r.falhou) return { erro: 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' };
  return { ok: true, aviso: `Enviamos o link para ${u.email}.`, link: r.link };
}

export async function acaoUsarLink(f: FormData) {
  const r = await usarLink(await banco(), texto(f, 'token'));
  if (!r) redirect('/entrar');
  await gravarCookieSessao(r.sessao);
  redirect(r.destino === '/' || r.destino === '/entrar' ? (r.tipo === 'contratante' ? '/painel' : '/candidato') : r.destino);
}

export async function acaoPublicar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await usuarioAtual();
  if (!u?.empresaId) return { erro: 'Para publicar, entre com a conta da empresa.' };
  const { dados, erros } = validarVaga(camposVaga(f));
  if (!dados) return { erros };
  if (!(await limiteConta('publicar', u.id, 30))) return { erro: MUITOS };
  const r = await publicarVaga(await banco(), u.id, u.empresaId, dados);
  if (!r.ok) return { erro: r.erro };
  redirect(`/painel/vagas/${r.vagaId}?aba=arte&nova=1`);
}

export async function acaoEditarVaga(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirContratante();
  const { dados, erros } = validarVaga(camposVaga(f));
  if (!dados) return { erros };
  const vagaId = texto(f, 'vagaId');
  if (!(await editarVaga(await banco(), u.empresaId, vagaId, dados))) return { erro: 'Vaga não encontrada.' };
  revalidatePath(`/painel/vagas/${vagaId}`);
  return { ok: true, aviso: 'Vaga atualizada.' };
}

// Ninguém se candidata sem conta. Quem não tem cria ali mesmo, com senha, e já se candidata.
export async function acaoCandidatar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const pessoa = { nome: texto(f, 'nome'), email: texto(f, 'email'), telefone: texto(f, 'telefone') };
  const senha = texto(f, 'senha');
  const erros: Record<string, string> = { ...errosPessoa(pessoa) };
  const erroSenha = validarSenha(senha);
  if (erroSenha) erros.senha = erroSenha;
  if (Object.keys(erros).length) return { erros };
  const vagaId = texto(f, 'vagaId');
  if (!/^[0-9a-f-]{36}$/i.test(vagaId)) return { erro: 'Escolha uma vaga.' };
  if (!(await limiteIp('conta', 20))) return { erro: MUITOS };
  const db = await banco();
  const [v] = await db.select({ slug: vagas.slug, estado: vagas.estado, expiraEm: vagas.expiraEm }).from(vagas).where(eq(vagas.id, vagaId));
  if (!v || !vagaAceitaCandidatura(v)) return { erro: 'Esta vaga não recebe mais candidaturas.' };
  const n = pessoaNormalizada(pessoa);
  const conta = await criarConta(db, { tipo: 'candidato', ...n, senha });
  if (!conta.ok || !conta.usuarioId) return { erro: 'Este e-mail já tem conta. Entre com ela para se candidatar.', aviso: undefined };
  const u = conta.usuarioId;
  await gravarCookieSessao(await abrirSessao(db, u));
  const titulo = texto(f, 'titulo').trim();
  if (titulo) await salvarPerfil(db, u, { titulo: titulo.slice(0, 80), cidadeSlug: texto(f, 'cidadeSlug'), resumo: texto(f, 'resumo').trim().slice(0, 2000), aceiteTalentos: false });
  // O currículo da candidatura já monta o perfil: habilidades, experiências e formação entram sozinhas.
  const arquivo = f.get('curriculo');
  if (arquivo instanceof File && arquivo.size > 0) {
    const b = Buffer.from(await arquivo.arrayBuffer());
    if (!(await guardarCurriculo(db, u, arquivo.name, b))) await aplicarCurriculo(db, u, b);
  }
  const r = await candidatarLogado(db, { id: u, tipo: 'candidato' }, vagaId);
  if (!r.ok) return { erro: r.erro };
  await avisarNovaCandidatura(db, r.candidaturaId);
  await mandarLink(n.email, `/conversas/${r.candidaturaId}`, 'Confirme seu e-mail no GR Vagas', true);
  redirect(`/conversas/${r.candidaturaId}?nova=1`);
}

export async function acaoCandidatarLogado(f: FormData) {
  const u = await exigirUsuario();
  if (!(await limiteConta('candidatura', u.id, 40))) redirect('/vagas?limite=1');
  const db = await banco();
  const vagaId = texto(f, 'vagaId');
  const r = await candidatarLogado(db, u, vagaId);
  if (!r.ok) redirect('/vagas');
  await avisarNovaCandidatura(db, r.candidaturaId);
  redirect(`/conversas/${r.candidaturaId}?nova=1`);
}

export async function acaoSalvarVaga(f: FormData) {
  const u = await exigirCandidato();
  await alternarSalva(await banco(), u.id, texto(f, 'vagaId'));
  revalidatePath(`/vagas/${texto(f, 'slug')}`);
}

export async function acaoDenunciar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const motivo = texto(f, 'motivo');
  if (motivo.trim().length < 5) return { erros: { motivo: 'Conte em poucas palavras o que há de errado.' } };
  const ok = await denunciar(await banco(), texto(f, 'vagaId'), motivo, await ipAtual());
  return ok ? { ok: true } : { erro: 'Muitas denúncias em pouco tempo. Tente de novo mais tarde.' };
}

export async function acaoMudarEtapa(f: FormData) {
  const u = await exigirContratante();
  const id = texto(f, 'candidaturaId');
  await mudarEtapa(await banco(), id, u.id, texto(f, 'etapa'));
  revalidatePath(`/conversas/${id}`);
  revalidatePath('/painel', 'layout');
}

export async function acaoEnviarMensagem(candidaturaId: string, conteudo: string): Promise<{ ok: boolean; erro?: string }> {
  const u = await exigirUsuario();
  if (!(await limiteConta('mensagem', u.id, 60, 10 * 60 * 1000))) return { ok: false, erro: MUITOS };
  return enviarMensagem(await banco(), { candidaturaId, autorId: u.id, texto: conteudo });
}

export async function acaoEstadoVaga(f: FormData) {
  const u = await exigirContratante();
  const vagaId = texto(f, 'vagaId');
  const estado = texto(f, 'estado');
  if (estado !== 'aberta' && estado !== 'pausada' && estado !== 'encerrada') return;
  const r = await mudarEstadoVaga(await banco(), u.id, u.empresaId, vagaId, estado);
  revalidatePath('/painel', 'layout');
  if (!r.ok) redirect(`/painel/vagas/${vagaId}?aba=candidatos&erro=${encodeURIComponent(r.erro ?? 'Não foi possível mudar a vaga.')}`);
}

export async function acaoDestaque(f: FormData) {
  const u = await exigirContratante();
  const vagaId = texto(f, 'vagaId');
  const r = await alternarDestaque(await banco(), u.id, u.empresaId, vagaId);
  revalidatePath('/painel', 'layout');
  if (!r.ok) redirect(`/painel/vagas/${vagaId}?aba=candidatos&erro=${encodeURIComponent(r.erro ?? 'Não foi possível destacar a vaga.')}`);
}

export async function acaoSalvarArte(vagaId: string, pedido: Partial<ConfigArte>) {
  const u = await exigirContratante();
  return salvarArte(await banco(), u.empresaId, vagaId, pedido);
}

export async function acaoEmpresa(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirContratante();
  const nome = texto(f, 'empresa');
  const descricao = texto(f, 'descricao').trim();
  const erroNome = errosEmpresa(nome);
  const erroDesc = descricao.length < 10 ? 'Escreva pelo menos 10 caracteres sobre a empresa.' : descricao.length > 2000 ? 'Use no máximo 2.000 caracteres.' : revisarTexto(descricao)?.mensagem;
  if (erroNome || erroDesc) return { erros: { ...(erroNome ? { empresa: erroNome } : {}), ...(erroDesc ? { descricao: erroDesc } : {}) } };
  await (await banco()).update(empresas).set({ nome: nome.trim(), descricao }).where(eq(empresas.id, u.empresaId));
  revalidatePath('/painel', 'layout');
  return { ok: true, aviso: 'Dados da empresa salvos.' };
}

export async function acaoSalvarEmpresa(d: { nome: string; descricao: string; perfil: unknown }): Promise<{ ok?: boolean; erros?: Record<string, string> }> {
  const u = await exigirContratante();
  const nome = String(d.nome ?? '').trim();
  const descricao = String(d.descricao ?? '').trim();
  const { perfil, erros } = validarPerfilEmpresa(d.perfil);
  const erroNome = errosEmpresa(nome);
  if (erroNome) erros.empresa = erroNome;
  if (descricao.length < 10) erros.descricao = 'Escreva pelo menos 10 caracteres sobre a empresa.';
  else if (descricao.length > 2000) erros.descricao = 'Use no máximo 2.000 caracteres.';
  else if (revisarTexto(descricao)) erros.descricao = revisarTexto(descricao)!.mensagem;
  if (Object.keys(erros).length) return { erros };
  await (await banco()).update(empresas).set({ nome, descricao, perfil }).where(eq(empresas.id, u.empresaId));
  revalidatePath('/painel', 'layout');
  return { ok: true };
}

export async function acaoAssinar(f: FormData) {
  const u = await exigirUsuario();
  const volta = u.tipo === 'contratante' ? '/painel/plano' : '/candidato/plano';
  const r = await assinar(await banco(), u.id, texto(f, 'plano'));
  if (!r.ok) redirect(`${volta}?erro=${encodeURIComponent(r.erro)}`);
  if (r.url) redirect(r.url);
  redirect(`${volta}?ok=1`);
}

export async function acaoCancelarPlano() {
  const u = await exigirUsuario();
  await cancelar(await banco(), u.id);
  revalidatePath(u.tipo === 'contratante' ? '/painel/plano' : '/candidato/plano');
}

export async function acaoPerfil(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirCandidato();
  const titulo = texto(f, 'titulo').trim();
  const cidadeSlug = texto(f, 'cidade');
  const resumo = texto(f, 'resumo').trim();
  const erros: Record<string, string> = {};
  if (titulo.length < 3 || titulo.length > 80) erros.titulo = 'Escreva o que você faz, em até 80 caracteres.';
  if (!cidadePorSlug(cidadeSlug)) erros.cidade = 'Escolha a cidade.';
  if (resumo.length < 20 || resumo.length > 2000) erros.resumo = 'Escreva entre 20 e 2.000 caracteres.';
  if (Object.keys(erros).length) return { erros };
  await salvarPerfil(await banco(), u.id, { titulo, cidadeSlug, resumo, aceiteTalentos: f.get('talentos') === 'on' });
  return { ok: true, aviso: 'Perfil salvo.' };
}

export async function acaoSalvarCurriculo(d: { titulo: string; cidadeSlug: string; resumo: string; talentos: boolean; visivel?: boolean; cv: unknown }): Promise<{ ok?: boolean; erro?: string; erros?: Record<string, string> }> {
  const u = await exigirCandidato();
  const titulo = String(d.titulo ?? '').trim();
  const resumo = String(d.resumo ?? '').trim();
  const erros: Record<string, string> = {};
  if (titulo.length < 3 || titulo.length > 80) erros.titulo = 'Escreva o que você faz, em até 80 caracteres.';
  if (!cidadePorSlug(String(d.cidadeSlug ?? ''))) erros.cidade = 'Escolha a cidade.';
  if (resumo.length > 2000) erros.resumo = 'Use no máximo 2.000 caracteres.';
  if (Object.keys(erros).length) return { erros };
  await salvarPerfil(await banco(), u.id, { titulo, cidadeSlug: String(d.cidadeSlug), resumo, aceiteTalentos: Boolean(d.talentos), cv: cvValido(d.cv), visivelEmpresas: d.visivel === undefined ? undefined : Boolean(d.visivel) });
  return { ok: true };
}

export async function acaoCriarAlerta(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirCandidato();
  const erro = await criarAlerta(await banco(), u.id, texto(f, 'termo'), texto(f, 'cidade'));
  if (erro) return { erros: { termo: erro } };
  revalidatePath('/candidato/alertas');
  return { ok: true, aviso: 'Alerta criado.' };
}

export async function acaoApagarAlerta(f: FormData) {
  const u = await exigirCandidato();
  await apagarAlerta(await banco(), u.id, texto(f, 'id'));
  revalidatePath('/candidato/alertas');
}

export async function acaoExcluirConta(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  if (texto(f, 'confirmar').trim().toLowerCase() !== 'excluir') return { erros: { confirmar: 'Digite excluir para confirmar.' } };
  await excluirConta(await banco(), u.id);
  (await cookies()).delete('sessao');
  redirect('/');
}

export async function acaoResolverDenuncia(f: FormData) {
  await exigirAdmin();
  await resolverDenuncia(await banco(), texto(f, 'id'), texto(f, 'encerrar') === '1');
  revalidatePath('/admin');
}

