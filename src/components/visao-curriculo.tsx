import { cidadePorSlug } from '@/lib/config';
import { periodo, type Cv } from '@/lib/curriculo';
import { formatarTelefone } from '@/lib/forms/validators';

const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

// O currículo no formato de sempre: dados pessoais, idiomas, formação e experiência.
export function VisaoCurriculo({ nome, email, telefone, titulo, cidadeSlug, resumo, cv, foto }: { nome: string; email: string; telefone: string; titulo: string; cidadeSlug: string; resumo: string; cv: Cv; foto?: string | null }) {
  const cidade = cidadePorSlug(cidadeSlug);
  let n = 0;
  const secao = (t: string) => `${(n += 1)}. ${t}`;
  const dados = [
    ['Estado civil', cv.estadoCivil],
    ['Nascimento', dataBr(cv.nascimento)],
    ['Endereço', [cv.endereco, cidade ? `${cidade.nome} - ${cidade.uf}` : ''].filter(Boolean).join(', ')],
    ['Telefone', formatarTelefone(telefone)],
    ['E-mail', email],
    ['Portfólio', cv.portfolio],
  ].filter(([, v]) => v);
  return (
    <article className="cv">
      <header className={foto ? 'cv-topo' : undefined}>
        {foto ? <img className="cv-foto" src={foto} alt={`Foto de ${nome}`} width={96} height={96} /> : null}
        <div>
          <h2>{nome}</h2>
          {titulo ? <p className="cv-cargo">{titulo}</p> : null}
          {cv.objetivo ? <p className="cv-contato">{cv.objetivo}</p> : null}
        </div>
      </header>
      <section>
        <h3>{secao('Dados pessoais')}</h3>
        <dl className="cv-dados">{dados.map(([r, v]) => <div key={r}><dt>{r}</dt><dd>{v}</dd></div>)}</dl>
      </section>
      {resumo ? <section><h3>{secao('Resumo profissional')}</h3><p>{resumo}</p></section> : null}
      {cv.idiomas?.length ? <section><h3>{secao('Idiomas')}</h3><ul className="cv-lista">{cv.idiomas.map((i) => <li key={i.lingua}>{i.lingua} {i.nivel.toLowerCase()}</li>)}</ul></section> : null}
      {cv.formacao?.length ? (
        <section>
          <h3>{secao('Formação acadêmica')}</h3>
          {cv.formacao.map((f, i) => (
            <div key={i} className="cv-item">
              <p><strong>{[periodo(f.inicio, f.fim), f.curso, f.instituicao].filter(Boolean).join(' - ')}</strong></p>
              {f.descricao ? <p>{f.descricao}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {cv.experiencias?.length ? (
        <section>
          <h3>{secao('Experiência profissional')}</h3>
          {cv.experiencias.map((e, i) => (
            <div key={i} className="cv-item">
              <p><strong>{[periodo(e.inicio, e.fim, e.atual), `${e.cargo}${e.empresa ? ` em ${e.empresa}` : ''}`].filter(Boolean).join(' - ')}</strong></p>
              {e.descricao ? <p>{e.descricao}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {cv.habilidades?.length ? <section><h3>{secao('Habilidades')}</h3><ul className="cv-etiquetas">{cv.habilidades.map((h) => <li key={h}>{h}</li>)}</ul></section> : null}
    </article>
  );
}
