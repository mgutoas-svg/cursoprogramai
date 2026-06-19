const carrinho = [
  { nome: 'Teclado Mecânico', preco: 249.9 },
  { nome: 'Mouse Gamer', preco: 159.9 },
  { nome: 'Headset', preco: 189.9 },
];

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function total(carrinho) {
  return carrinho.reduce((soma, produto) => soma + produto.preco, 0);
}

function renderizarCarrinho() {
  const lista = document.getElementById('produtos-lista');
  const totalCarrinho = total(carrinho);

  if (lista) {
    lista.innerHTML = carrinho
      .map(
        (produto) => `
          <div class="product-item">
            <div>
              <strong>${produto.nome}</strong>
              <span>Produto adicionado ao carrinho</span>
            </div>
            <div class="price-tag">${formatarMoeda(produto.preco)}</div>
          </div>
        `,
      )
      .join('');
  }

  const elementos = {
    'total-carrinho': formatarMoeda(totalCarrinho),
    'total-resultado': formatarMoeda(totalCarrinho),
    'itens-total': carrinho.length,
    'qtd-produtos': `${carrinho.length} produtos no carrinho`,
  };

  Object.entries(elementos).forEach(([id, valor]) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = valor;
    }
  });

  console.log('Carrinho:', carrinho);
  console.log(`Total: ${formatarMoeda(totalCarrinho)}`);
}

function adicionarProduto(event) {
  if (event) {
    event.preventDefault();
  }

  const nomeInput = document.getElementById('produto-nome');
  const precoInput = document.getElementById('produto-preco');

  const nome = nomeInput.value.trim();
  const preco = Number(precoInput.value);

  if (!nome || Number.isNaN(preco) || preco <= 0) {
    return;
  }

  carrinho.push({ nome, preco });

  nomeInput.value = '';
  precoInput.value = '';

  renderizarCarrinho();

  nomeInput.focus();
}

if (typeof document !== 'undefined') {
  renderizarCarrinho();

  const form = document.getElementById('produto-form');

  if (form) {
    form.addEventListener('submit', adicionarProduto);
  }
} else {
  console.log('Total do carrinho:', total(carrinho));
}