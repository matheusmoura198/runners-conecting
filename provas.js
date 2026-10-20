// ---------- Provas e corridas ----------
// Todo mundo que está logado vê as provas. Só líderes (e o admin) cadastram.
// Cada líder edita e apaga apenas as provas que ele mesmo cadastrou (o admin mexe em todas).

const PASTA_FOTOS = "fotos"
const TAMANHO_MAXIMO_DA_IMAGEM = 1500000

let todasAsProvas = []
let abaAtual = "proximas"
let provaEmEdicao = null
let imagemEscolhida = null
let enderecoDaPrevia = null
let removerImagemAtual = false


// ---------- Elementos da página ----------
const pagina = document.getElementById("pagina")
const botaoSair = document.getElementById("botao-sair")
const linkCadastro = document.getElementById("link-cadastro")

const abaProximas = document.getElementById("aba-proximas")
const abaPassadas = document.getElementById("aba-passadas")
const filtroCidade = document.getElementById("filtro-cidade")
const msgLista = document.getElementById("msg-lista")
const listaProvas = document.getElementById("lista-provas")
const semProvas = document.getElementById("sem-provas")

const secaoCadastro = document.getElementById("cadastro")
const areaProva = document.getElementById("area-prova")
const resumoProva = document.getElementById("resumo-prova")
const formProva = document.getElementById("form-prova")
const campoNome = document.getElementById("prova-nome")
const campoData = document.getElementById("prova-data")
const campoHorario = document.getElementById("prova-horario")
const campoCidade = document.getElementById("prova-cidade")
const campoLocal = document.getElementById("prova-local")
const campoValor = document.getElementById("prova-valor")
const campoGratuita = document.getElementById("prova-gratuita")
const campoDistancias = document.getElementById("prova-distancias")
const campoLink = document.getElementById("prova-link")
const campoObservacoes = document.getElementById("prova-observacoes")
const campoImagem = document.getElementById("prova-imagem")
const previaProva = document.getElementById("previa-prova")
const previaProvaImagem = document.getElementById("previa-prova-imagem")
const botaoRemoverImagem = document.getElementById("botao-remover-imagem")
const msgProva = document.getElementById("msg-prova")
const botaoSalvarProva = document.getElementById("botao-salvar-prova")
const botaoCancelarEdicao = document.getElementById("botao-cancelar-edicao")


// ---------- Quem pode o quê ----------
function podeCadastrar() {
  return perfil.papel === "lider" || perfil.papel === "admin"
}

function podeMexer(prova) {
  return perfil.papel === "admin" || (perfil.papel === "lider" && prova.criado_por === perfil.id)
}


// ---------- Começo ----------
async function iniciar() {
  perfil = await obterPerfilLogado()

  if (!perfil) {
    guardarDestino(window.location.href)
    window.location.href = "index.html"
    return
  }

  pagina.hidden = false

  if (podeCadastrar()) {
    secaoCadastro.hidden = false
    linkCadastro.hidden = false
  }

  await carregarProvas()
}

async function carregarProvas() {
  const resposta = await cliente
    .from("provas")
    .select("*")
    .order("data", { ascending: true })
    .order("horario", { ascending: true })
    .limit(300)

  if (resposta.error) {
    console.error("Erro ao carregar as provas:", resposta.error)
    msgLista.textContent = "Não foi possível carregar as provas. Tente de novo mais tarde."
    return
  }

  msgLista.textContent = ""
  todasAsProvas = resposta.data
  montarFiltroDeCidades()
  mostrarProvas()
}


// ---------- Datas, valores e textos ----------
// Hoje no formato do banco (AAAA-MM-DD), pelo relógio do aparelho
function hojeTexto() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, "0")
  const dia = String(agora.getDate()).padStart(2, "0")
  return agora.getFullYear() + "-" + mes + "-" + dia
}

// "2026-11-14" vira "Sábado, 14/11/2026". Monta a data pelas partes para o fuso não mudar o dia.
function dataLegivel(texto) {
  const partes = texto.split("-").map(Number)
  const data = new Date(partes[0], partes[1] - 1, partes[2])
  const resultado = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
  return resultado.charAt(0).toUpperCase() + resultado.slice(1)
}

function formatarPreco(valor) {
  return "R$ " + Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// "80,00" vira 80. Vazio vira null. Valor inválido vira NaN.
function lerPreco(texto) {
  let t = texto.trim().replace(/^R\$\s*/i, "")
  if (t === "") {
    return null
  }
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".")
  }
  const numero = Number(t)
  return isFinite(numero) && numero >= 0 ? numero : NaN
}

function textoDoValor(prova) {
  if (prova.valor === null || prova.valor === undefined) {
    return "A confirmar"
  }
  return Number(prova.valor) === 0 ? "Gratuita" : formatarPreco(prova.valor)
}

function enderecoDaImagem(caminho) {
  return cliente.storage.from(PASTA_FOTOS).getPublicUrl(caminho).data.publicUrl
}


// ---------- Lista ----------
function montarFiltroDeCidades() {
  const escolhida = filtroCidade.value
  const cidades = []
  todasAsProvas.forEach(function (prova) {
    if (!cidades.includes(prova.cidade)) {
      cidades.push(prova.cidade)
    }
  })
  cidades.sort(function (a, b) {
    return a.localeCompare(b, "pt-BR")
  })

  filtroCidade.innerHTML = ""
  const todas = criarElemento("option", "", "Todas as cidades")
  todas.value = ""
  filtroCidade.appendChild(todas)
  cidades.forEach(function (cidade) {
    const opcao = criarElemento("option", "", cidade)
    opcao.value = cidade
    filtroCidade.appendChild(opcao)
  })
  filtroCidade.value = cidades.includes(escolhida) ? escolhida : ""
}

function mostrarProvas() {
  const hoje = hojeTexto()
  const proximas = abaAtual === "proximas"

  let lista = todasAsProvas.filter(function (prova) {
    return proximas ? prova.data >= hoje : prova.data < hoje
  })
  if (filtroCidade.value !== "") {
    lista = lista.filter(function (prova) {
      return prova.cidade === filtroCidade.value
    })
  }
  // Próximas: a mais perto primeiro. Passadas: a mais recente primeiro.
  if (!proximas) {
    lista = lista.slice().reverse()
  }

  listaProvas.innerHTML = ""
  lista.forEach(function (prova) {
    listaProvas.appendChild(criarCartaoDaProva(prova))
  })

  semProvas.hidden = lista.length > 0
  if (lista.length === 0) {
    semProvas.textContent = proximas
      ? "Nenhuma prova divulgada para os próximos dias."
      : "Nenhuma prova passada para mostrar."
  }
}

function criarCartaoDaProva(prova) {
  const cartao = criarElemento("article", "prova")

  if (prova.imagem_caminho) {
    const endereco = enderecoDaImagem(prova.imagem_caminho)
    const link = criarElemento("a", "prova-imagem-link")
    link.href = endereco
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    const imagem = criarElemento("img", "prova-imagem")
    imagem.src = endereco
    imagem.alt = "Arte de divulgação: " + prova.nome
    imagem.loading = "lazy"
    link.appendChild(imagem)
    cartao.appendChild(link)
  }

  const corpo = criarElemento("div", "prova-corpo")
  corpo.appendChild(criarElemento("h3", "prova-nome", prova.nome))

  let quando = dataLegivel(prova.data)
  if (prova.horario) {
    quando += ", " + formatarHorario(prova.horario)
  }
  corpo.appendChild(criarElemento("p", "prova-quando", quando))

  const dados = criarElemento("dl", "prova-dados")
  function linha(rotulo, valor) {
    dados.appendChild(criarElemento("dt", "", rotulo))
    dados.appendChild(criarElemento("dd", "", valor))
  }
  linha("Cidade", prova.cidade)
  if (prova.local) {
    linha("Largada", prova.local)
  }
  linha("Inscrição", textoDoValor(prova))
  if (prova.distancias) {
    linha("Distâncias", prova.distancias)
  }
  corpo.appendChild(dados)

  if (prova.observacoes) {
    corpo.appendChild(criarElemento("p", "prova-obs", prova.observacoes))
  }
  if (prova.equipe) {
    corpo.appendChild(criarElemento("p", "prova-divulgada", "Divulgada por " + prova.equipe))
  }

  const acoes = criarElemento("div", "prova-acoes")

  if (prova.link && linkValido(prova.link)) {
    const inscricao = criarElemento("a", "botao", "Ir para a inscrição")
    inscricao.href = prova.link
    inscricao.target = "_blank"
    inscricao.rel = "noopener noreferrer"
    acoes.appendChild(inscricao)
  }

  const mensagem = [
    prova.nome,
    quando + " - " + prova.cidade,
    "Inscrição: " + textoDoValor(prova),
    prova.link ? prova.link : "",
    "Veja no Runners Conecting."
  ].filter(function (parte) {
    return parte !== ""
  }).join("\n")
  const compartilhar = criarElemento("a", "botao botao-contorno", "Compartilhar no WhatsApp")
  compartilhar.href = "https://wa.me/?text=" + encodeURIComponent(mensagem)
  compartilhar.target = "_blank"
  compartilhar.rel = "noopener noreferrer"
  acoes.appendChild(compartilhar)

  if (podeMexer(prova)) {
    const editar = criarElemento("button", "botao-texto", "Editar")
    editar.type = "button"
    editar.addEventListener("click", function () {
      comecarEdicao(prova)
    })
    acoes.appendChild(editar)

    const apagar = criarElemento("button", "botao-texto botao-texto-perigo", "Apagar")
    apagar.type = "button"
    apagar.addEventListener("click", function () {
      apagarProva(prova)
    })
    acoes.appendChild(apagar)
  }

  corpo.appendChild(acoes)
  cartao.appendChild(corpo)
  return cartao
}

function abrirAba(nome) {
  abaAtual = nome
  abaProximas.setAttribute("aria-selected", String(nome === "proximas"))
  abaPassadas.setAttribute("aria-selected", String(nome === "passadas"))
  mostrarProvas()
}

abaProximas.addEventListener("click", function () {
  abrirAba("proximas")
})
abaPassadas.addEventListener("click", function () {
  abrirAba("passadas")
})
filtroCidade.addEventListener("change", mostrarProvas)


// ---------- Imagem de divulgação ----------
function carregarImagem(arquivo) {
  return new Promise(function (resolve, reject) {
    const endereco = URL.createObjectURL(arquivo)
    const imagem = new Image()

    imagem.addEventListener("load", function () {
      URL.revokeObjectURL(endereco)
      resolve(imagem)
    })
    imagem.addEventListener("error", function () {
      URL.revokeObjectURL(endereco)
      reject(new Error("imagem inválida"))
    })
    imagem.src = endereco
  })
}

// Reduz a arte no próprio navegador antes de enviar (o espaço grátis do Supabase é limitado).
// Devolve um Blob JPEG, ou null se não conseguir.
async function comprimirImagem(arquivo) {
  let imagem
  try {
    imagem = await carregarImagem(arquivo)
  } catch (erro) {
    return null
  }

  // Artes de divulgação têm texto pequeno: mantém mais tamanho que as fotos comuns
  const tentativas = [
    { lado: 1600, qualidade: 0.85 },
    { lado: 1280, qualidade: 0.75 },
    { lado: 1024, qualidade: 0.65 }
  ]

  for (const tentativa of tentativas) {
    const escala = Math.min(1, tentativa.lado / Math.max(imagem.width, imagem.height))
    const tela = document.createElement("canvas")
    tela.width = Math.round(imagem.width * escala)
    tela.height = Math.round(imagem.height * escala)
    tela.getContext("2d").drawImage(imagem, 0, 0, tela.width, tela.height)

    const resultado = await new Promise(function (resolve) {
      tela.toBlob(resolve, "image/jpeg", tentativa.qualidade)
    })

    if (resultado && resultado.size <= TAMANHO_MAXIMO_DA_IMAGEM) {
      return resultado
    }
  }
  return null
}

function nomeUnico() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2)
}

function limparImagemEscolhida() {
  imagemEscolhida = null
  campoImagem.value = ""
  if (enderecoDaPrevia) {
    URL.revokeObjectURL(enderecoDaPrevia)
    enderecoDaPrevia = null
  }
  previaProvaImagem.removeAttribute("src")
  previaProva.hidden = true
}

campoImagem.addEventListener("change", async function () {
  const arquivo = campoImagem.files[0]
  msgProva.textContent = ""
  if (!arquivo) {
    return
  }

  const reduzida = await comprimirImagem(arquivo)
  if (!reduzida) {
    limparImagemEscolhida()
    msgProva.textContent = "Não foi possível usar essa imagem. Tente outra (de preferência JPG ou PNG)."
    return
  }

  limparImagemEscolhida()
  imagemEscolhida = reduzida
  removerImagemAtual = false
  enderecoDaPrevia = URL.createObjectURL(reduzida)
  previaProvaImagem.src = enderecoDaPrevia
  previaProva.hidden = false
})

botaoRemoverImagem.addEventListener("click", function () {
  limparImagemEscolhida()
  // Se a prova já tinha uma arte, ela será retirada ao salvar
  removerImagemAtual = provaEmEdicao !== null && !!provaEmEdicao.imagem_caminho
})

campoGratuita.addEventListener("change", function () {
  campoValor.disabled = campoGratuita.checked
  if (campoGratuita.checked) {
    campoValor.value = ""
  }
})


// ---------- Cadastrar e editar ----------
function limparFormulario() {
  formProva.reset()
  campoValor.disabled = false
  limparImagemEscolhida()
  removerImagemAtual = false
  provaEmEdicao = null
  msgProva.textContent = ""
  resumoProva.textContent = "Nova prova"
  botaoSalvarProva.textContent = "Publicar prova"
  botaoCancelarEdicao.hidden = true
}

function comecarEdicao(prova) {
  limparFormulario()
  provaEmEdicao = prova

  campoNome.value = prova.nome
  campoData.value = prova.data
  campoHorario.value = prova.horario ? formatarHorario(prova.horario) : ""
  campoCidade.value = prova.cidade
  campoLocal.value = prova.local || ""
  campoDistancias.value = prova.distancias || ""
  campoLink.value = prova.link || ""
  campoObservacoes.value = prova.observacoes || ""

  if (prova.valor !== null && prova.valor !== undefined) {
    if (Number(prova.valor) === 0) {
      campoGratuita.checked = true
      campoValor.disabled = true
    } else {
      campoValor.value = String(prova.valor).replace(".", ",")
    }
  }

  if (prova.imagem_caminho) {
    enderecoDaPrevia = null
    previaProvaImagem.src = enderecoDaImagem(prova.imagem_caminho)
    previaProva.hidden = false
  }

  resumoProva.textContent = "Editando: " + prova.nome
  botaoSalvarProva.textContent = "Salvar alterações"
  botaoCancelarEdicao.hidden = false
  areaProva.open = true
  secaoCadastro.scrollIntoView({ behavior: "smooth" })
}

botaoCancelarEdicao.addEventListener("click", function () {
  limparFormulario()
  areaProva.open = false
})

async function removerArquivo(caminho) {
  if (!caminho) {
    return
  }
  // Melhor esforço: se não der para apagar o arquivo antigo, a prova continua certa
  const resposta = await cliente.storage.from(PASTA_FOTOS).remove([caminho])
  if (resposta.error) {
    console.error("Não foi possível apagar a arte antiga:", resposta.error)
  }
}

formProva.addEventListener("submit", async function (evento) {
  evento.preventDefault()

  const nome = campoNome.value.trim()
  const cidade = campoCidade.value.trim()
  const link = campoLink.value.trim()

  if (nome.length < 3) {
    msgProva.textContent = "Digite o nome da prova (pelo menos 3 letras)."
    return
  }
  if (campoData.value === "") {
    msgProva.textContent = "Escolha a data da prova."
    return
  }
  if (provaEmEdicao === null && campoData.value < hojeTexto()) {
    msgProva.textContent = "Essa data já passou. Escolha uma data de hoje em diante."
    return
  }
  if (cidade.length < 2) {
    msgProva.textContent = "Digite a cidade da prova."
    return
  }
  if (link !== "" && !link.startsWith("https://")) {
    msgProva.textContent = "O link de inscrição precisa começar com https://"
    return
  }

  let valor = campoGratuita.checked ? 0 : lerPreco(campoValor.value)
  if (Number.isNaN(valor)) {
    msgProva.textContent = "Digite o valor só com números, por exemplo 80,00."
    return
  }

  msgProva.textContent = ""
  ocupado(botaoSalvarProva, true, provaEmEdicao ? "Salvar alterações" : "Publicar prova")
  const textoBotao = provaEmEdicao ? "Salvar alterações" : "Publicar prova"

  // 1. Envia a arte nova (se houver). Fica na pasta com o id de quem enviou.
  let caminhoNovo = null
  if (imagemEscolhida) {
    caminhoNovo = perfil.id + "/prova-" + nomeUnico() + ".jpg"
    const envio = await cliente.storage
      .from(PASTA_FOTOS)
      .upload(caminhoNovo, imagemEscolhida, { contentType: "image/jpeg" })

    if (envio.error) {
      console.error("Erro ao enviar a arte:", envio.error)
      ocupado(botaoSalvarProva, false, textoBotao)
      msgProva.textContent = "Não foi possível enviar a imagem. Tente de novo."
      return
    }
  }

  const dados = {
    nome: nome,
    data: campoData.value,
    horario: campoHorario.value === "" ? null : campoHorario.value,
    cidade: cidade,
    local: campoLocal.value.trim() === "" ? null : campoLocal.value.trim(),
    valor: valor,
    distancias: campoDistancias.value.trim() === "" ? null : campoDistancias.value.trim(),
    link: link === "" ? null : link,
    observacoes: campoObservacoes.value.trim() === "" ? null : campoObservacoes.value.trim()
  }

  // 2. Salva a prova. O ".select()" devolve as linhas salvas: se vier vazio, o banco não permitiu.
  let resposta
  if (provaEmEdicao) {
    if (caminhoNovo) {
      dados.imagem_caminho = caminhoNovo
    } else if (removerImagemAtual) {
      dados.imagem_caminho = null
    }
    resposta = await cliente.from("provas").update(dados).eq("id", provaEmEdicao.id).select()
  } else {
    dados.imagem_caminho = caminhoNovo
    resposta = await cliente.from("provas").insert(dados).select()
  }

  ocupado(botaoSalvarProva, false, textoBotao)

  if (resposta.error || !resposta.data || resposta.data.length === 0) {
    console.error("Erro ao salvar a prova:", resposta.error)
    // Não deixa uma arte solta no armazenamento se a prova não foi salva
    await removerArquivo(caminhoNovo)
    msgProva.textContent = "Não foi possível salvar a prova. Tente de novo."
    return
  }

  // 3. Apaga a arte antiga, se ela foi trocada ou retirada
  if (provaEmEdicao && provaEmEdicao.imagem_caminho && (caminhoNovo || removerImagemAtual)) {
    await removerArquivo(provaEmEdicao.imagem_caminho)
  }

  limparFormulario()
  areaProva.open = false
  await carregarProvas()
})


// ---------- Apagar ----------
async function apagarProva(prova) {
  if (!window.confirm("Apagar a prova \"" + prova.nome + "\"? Isso não pode ser desfeito.")) {
    return
  }

  msgLista.textContent = ""
  const resposta = await cliente.from("provas").delete().eq("id", prova.id).select()

  if (resposta.error || !resposta.data || resposta.data.length === 0) {
    console.error("Erro ao apagar a prova:", resposta.error)
    msgLista.textContent = "Não foi possível apagar a prova. Tente de novo."
    return
  }

  await removerArquivo(prova.imagem_caminho)
  if (provaEmEdicao && provaEmEdicao.id === prova.id) {
    limparFormulario()
  }
  await carregarProvas()
}


// ---------- Sair ----------
botaoSair.addEventListener("click", async function () {
  await cliente.auth.signOut()
  window.location.href = "index.html"
})


iniciar()
