import '@fontsource/tinos/400.css';
import '@fontsource/tinos/700.css';
import { cidadePorSlug } from '@/lib/config';
import { periodo, type Cv } from '@/lib/curriculo';
import { formatarTelefone } from '@/lib/forms/validators';
import { Simbolo } from './marca';

const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

// Prévia do currículo pronto, igual ao PDF que sai de src/lib/curriculo-pdf.ts:
// Times, nome centralizado em maiúsculas, seções numeradas em negrito sublinhado,
// "ano - curso - instituição" e, no pé, a marca GR Vagas.
export function VisaoCurriculo({ nome, email, telefone, titulo, cidadeSlug, resumo, cv }: { nome: string; email: string; telefone: string; titulo: string; cidadeSlug: string; resumo: string; cv: Cv; foto?: string | null }) {
  const cidade = cidadePorSlug(cidadeSlug);
  let n = 0;
  const secao = (t: string) => <h3>{`${(n += 1)}.${t}`}</h3>;
  const pessoais = [
    ['Estado Civil', cv.estadoCivil],
    ['Nascimento', dataBr(cv.nascimento)],
    ['Endereço', cv.endereco],
  ].filter(([, v]) => v);
  const objetivo = cv.objetivo || titulo;
  return (
    <article className="cv">
      <h2>{nome.toLocaleUpperCase('pt-BR')}</h2>
      <section>
        {secao('Dados pessoais')}
        {pessoais.map(([r, v]) => <p key={r}>{r}: {v}</p>)}
        {cidade ? <p>{cidade.nome} - {cidade.uf}</p> : null}
        {telefone ? <p>Telefone: {formatarTelefone(telefone)}</p> : null}
        <p>E-mail: {email}</p>
        {cv.portfolio ? <p>Portfólio: {cv.portfolio.replace(/^https?:\/\//i, '')}</p> : null}
      </section>
      {objetivo ? <section>{secao('Objetivo')}<p>{objetivo}</p></section> : null}
      {resumo ? <section>{secao('Resumo profissional')}<p>{resumo}</p></section> : null}
      {cv.idiomas?.length ? <section>{secao('Idiomas')}{cv.idiomas.map((i, k) => <p key={k}>{i.lingua} {i.nivel.toLowerCase()}</p>)}</section> : null}
      {cv.formacao?.length ? (
        <section>
          {secao('Formação Acadêmica')}
          {cv.formacao.map((f, k) => (
            <div key={k} className="cv-item">
              <p>{[periodo(f.inicio, f.fim), f.curso, f.instituicao].filter(Boolean).join(' - ')}</p>
              {f.descricao ? <p>{f.descricao}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {cv.experiencias?.length ? (
        <section>
          {secao('Experiência Profissional')}
          {cv.experiencias.map((e, k) => (
            <div key={k} className="cv-item cv-exp">
              <p>{[periodo(e.inicio, e.fim, e.atual), `${e.cargo}${e.empresa ? ` em ${e.empresa}` : ''}`].filter(Boolean).join(' - ')}</p>
              {e.descricao ? <p>{e.descricao}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {cv.habilidades?.length ? <section>{secao('Habilidades')}<p>{cv.habilidades.join(', ')}.</p></section> : null}
      <footer className="cv-marca"><Simbolo tamanho={11} /><b>GR Vagas</b><span>|</span>grbrands.com.br/vagas</footer>
    </article>
  );
}
