function calcularMedia(notas) {
  return notas.reduce((soma, nota) => soma + Number(nota), 0) / notas.length;
}

const calcularMediaArrow = (notas) => notas.reduce((soma, nota) => soma + Number(nota), 0) / notas.length;

function atualizarTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = valor;
  }
}

function atualizarBoletim(event) {
  if (event) {
    event.preventDefault();
  }

  const nome = document.getElementById('nome').value.trim();
  const curso = document.getElementById('curso').value.trim();
  const idade = Number(document.getElementById('idade').value);
  const cidade = document.getElementById('cidade').value.trim();
  const notas = [
    Number(document.getElementById('nota1').value),
    Number(document.getElementById('nota2').value),
    Number(document.getElementById('nota3').value),
  ];

  const media = calcularMedia(notas);
  const mediaArrow = calcularMediaArrow(notas);
  const aprovado = media >= 7;

  const aluna = {
    nome,
    curso,
    notas,
  };

  atualizarTexto('preview-nome', aluna.nome);
  atualizarTexto('preview-curso', aluna.curso);
  atualizarTexto('preview-idade', `${idade} anos`);
  atualizarTexto('preview-cidade', cidade);
  atualizarTexto('preview-nota1', notas[0].toFixed(1).replace('.0', ''));
  atualizarTexto('preview-nota2', notas[1].toFixed(1).replace('.0', ''));
  atualizarTexto('preview-nota3', notas[2].toFixed(1).replace('.0', ''));
  atualizarTexto('media-final', media.toFixed(1));
  atualizarTexto('status-text', aprovado ? 'Aprovada! 🎉' : 'Recuperação 😬');
  atualizarTexto('status-detail', `Média calculada: ${media.toFixed(1)} | Arrow: ${mediaArrow.toFixed(1)}`);
  atualizarTexto('resultado-texto', `Aluna ${aluna.nome}, do curso ${aluna.curso}, teve média ${media.toFixed(1)}.`);
  atualizarTexto('resultado-badge', aprovado ? 'Aprovada' : 'Recuperação');

  const statusCard = document.getElementById('status-card');
  const resultadoBadge = document.getElementById('resultado-badge');

  if (statusCard) {
    statusCard.classList.toggle('status-aprovada', aprovado);
    statusCard.classList.toggle('status-recuperacao', !aprovado);
  }

  if (resultadoBadge) {
    resultadoBadge.classList.toggle('aprovada', aprovado);
    resultadoBadge.classList.toggle('recuperacao', !aprovado);
  }

  console.log(`Nome: ${aluna.nome} | Curso: ${aluna.curso}`);
  console.log(`Idade: ${idade} | Cidade: ${cidade}`);
  console.log(`Notas: ${notas.join(', ')}`);
  console.log(`Média: ${media}`);
  console.log(aprovado ? 'Aprovada! 🎉' : 'Recuperação 😬');
}

const form = document.getElementById('boletim-form');

if (form) {
  form.addEventListener('submit', atualizarBoletim);
}

atualizarBoletim();
