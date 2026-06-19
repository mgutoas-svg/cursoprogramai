// Função tradicional
function aplicarDesconto(preco, percentual) {
  return preco - (preco * percentual) / 100;
}

// Versão arrow
const aplicarDescontoArrow = (preco, percentual) => preco - (preco * percentual) / 100;

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function atualizarTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function calcularDesconto(event) {
  if (event) {
    event.preventDefault();
  }

  const preco = Number(document.getElementById('preco').value);
  const percentual = Number(document.getElementById('percentual').value);
  const valorFinal = aplicarDesconto(preco, percentual);
  const valorFinalArrow = aplicarDescontoArrow(preco, percentual);

  atualizarTexto('valor-preco', formatarMoeda(preco));
  atualizarTexto('valor-percentual', `${percentual}%`);
  atualizarTexto('valor-desconto', formatarMoeda(preco - valorFinal));
  atualizarTexto('valor-final', formatarMoeda(valorFinal));
  atualizarTexto('resultado-texto', `Preço final com desconto: ${formatarMoeda(valorFinal)}`);
  atualizarTexto('resultado-arrow', `Arrow: ${formatarMoeda(valorFinalArrow)}`);

  console.log(`Preço original: ${formatarMoeda(preco)}`);
  console.log(`Percentual: ${percentual}%`);
  console.log(`Desconto: ${formatarMoeda(preco - valorFinal)}`);
  console.log(`Preço final: ${formatarMoeda(valorFinal)}`);
  console.log(`Preço final (arrow): ${formatarMoeda(valorFinalArrow)}`);
}

if (typeof document !== 'undefined') {
  const form = document.getElementById('desconto-form');

  if (form) {
    form.addEventListener('submit', calcularDesconto);
    calcularDesconto();
  }
}
