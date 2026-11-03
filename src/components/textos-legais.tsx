export function TextoTermos() {
  return (
    <div className="texto-legal">
      <p>Rascunho sujeito à revisão jurídica antes do lançamento.</p>
      <p>O GR Vagas é operado por {'{{PREENCHER_RAZAO_SOCIAL}}'}, CNPJ {'{{PREENCHER_CNPJ}}'}, com sede em {'{{PREENCHER_ENDERECO}}'}. Contato: {'{{PREENCHER_EMAIL_CONTATO}}'}.</p>
      <h3>O serviço</h3>
      <p>O GR Vagas aproxima empresas e pessoas que procuram emprego. Não somos empregador, agência nem parte da contratação, e não garantimos emprego ou candidatos.</p>
      <h3>Contas</h3>
      <p>Para publicar vagas ou se candidatar é preciso ter uma conta. As informações precisam ser verdadeiras e a senha é pessoal.</p>
      <h3>Para quem publica vagas</h3>
      <p>A vaga precisa ser real e estar aberta. É proibido cobrar do candidato qualquer taxa, kit ou curso para concorrer, e é proibido exigir aparência, sexo, idade, estado civil, filhos, cor ou qualquer outra característica sem relação com o trabalho. Vagas que descumprirem estas regras podem ser encerradas e a conta, suspensa.</p>
      <h3>Para quem procura emprego</h3>
      <p>Pesquisar vagas, se candidatar e conversar com a empresa são gratuitos. Se alguém pedir dinheiro em nome de uma vaga, use o botão de denúncia.</p>
      <h3>Planos pagos</h3>
      <p>Os planos são mensais, sem fidelidade. Ao cancelar, o plano segue valendo até o fim do período pago. Ao terminar, a conta volta ao plano grátis: as vagas abertas seguem no ar até o prazo, e novas publicações respeitam o limite do plano grátis.</p>
      <h3>Arte das vagas</h3>
      <p>Quem publica é responsável pelo logo, pelas fotos e pelos textos que usa na arte e deve ter o direito de usá-los.</p>
    </div>
  );
}

export function TextoPrivacidade() {
  return (
    <div className="texto-legal">
      <p>Rascunho sujeito à revisão jurídica antes do lançamento.</p>
      <p>Controlador: {'{{PREENCHER_RAZAO_SOCIAL}}'}, CNPJ {'{{PREENCHER_CNPJ}}'}. Encarregado de dados: {'{{PREENCHER_ENCARREGADO}}'}, {'{{PREENCHER_EMAIL_PRIVACIDADE}}'}.</p>
      <h3>Dados que tratamos</h3>
      <p>Nome, e-mail e WhatsApp de contratantes e candidatos. Do candidato, também perfil, currículo, candidaturas, mensagens e alertas. Da empresa, nome, logo, dados de cadastro e vagas.</p>
      <h3>Quem vê o quê</h3>
      <p>Telefone, e-mail, perfil e currículo só vão para a empresa à qual você se candidatou. O banco de talentos mostra seu perfil a assinantes apenas se você aceitar, e você pode retirar o aceite no perfil a qualquer momento.</p>
      <h3>Leitura do currículo</h3>
      <p>Quando você envia o currículo, o arquivo pode ser lido por um provedor de inteligência artificial ({'{{PREENCHER_PROVEDOR_IA}}'}) só para preencher seus dados e sugerir vagas. Você confere e corrige tudo antes de salvar.</p>
      <h3>Seus direitos</h3>
      <p>Na sua conta, você baixa seus dados e exclui a conta. A exclusão apaga perfil, currículo, candidaturas e mensagens.</p>
      <h3>Cookies</h3>
      <p>Usamos um cookie necessário para manter você conectado. Não usamos cookies de publicidade nem ferramentas de rastreamento.</p>
    </div>
  );
}
