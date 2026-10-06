const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const brl = v =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const load = () => {
  try {
    return JSON.parse(localStorage.getItem('spendy'));
  } catch {
    return null;
  }
};

let S = load() || {
  receitas: [],
  gastos: [],
  objetivos: [],
  contas: [],
  tema: 'escuro'
};

const save = () =>
  localStorage.setItem('spendy', JSON.stringify(S));

const uid = () =>
  Date.now() + Math.random();

const CORES = [
  '#22d3ff',
  '#34d399',
  '#f87171',
  '#fbbf24',
  '#c084fc',
  '#fb923c',
  '#60a5fa',
  '#f472b6',
  '#a3e635'
];

let mes = new Date();
mes.setDate(1);


// ==================================================
// Tela inicial
// ==================================================

$('#start').onclick = () => {
  $('#splash').hidden = true;
  $('#app').hidden = false;
  render();
};


// ==================================================
// Navegação
// ==================================================

$$('nav [data-v]').forEach(b =>
  b.onclick = () => {
    $$('nav [data-v]').forEach(x =>
      x.classList.toggle('on', x === b)
    );

    $$('.view').forEach(v =>
      v.classList.toggle('on', v.id === b.dataset.v)
    );

    render();
  }
);


// ==================================================
// Modais
// ==================================================

const abre = id =>
  $(id).hidden = false;

const fecha = () =>
  $$('.modal').forEach(m => m.hidden = true);

$$('[data-close]').forEach(b =>
  b.onclick = fecha
);

$$('.modal').forEach(m =>
  m.onclick = e => {
    if (e.target === m) {
      fecha();
    }
  }
);

$('#btnTema').onclick = () =>
  abre('#modalTema');

$('#novaConta').onclick = () =>
  abre('#modalConta');

$$('.tema').forEach(b =>
  b.onclick = () => {
    S.tema = b.dataset.t;
    save();
    aplicaTema();
  }
);

function aplicaTema() {
  document.documentElement.dataset.theme = S.tema;

  $$('.tema').forEach(b =>
    b.classList.toggle('on', b.dataset.t === S.tema)
  );

  render();
}


// ==================================================
// Totais
// ==================================================

const soma = a =>
  a.reduce((t, x) => t + x.valor, 0);

const tot = () => {
  const r = soma(S.receitas);
  const g = soma(S.gastos);

  return {
    r,
    g,
    saldo: r - g,
    pct: r ? Math.round(g / r * 100) : 0
  };
};

const lista = (arr, fn, vazio) =>
  arr.length
    ? arr.map(fn).join('')
    : `<p class="vazio">${vazio}</p>`;

const del = (k, id) => {
  S[k] = S[k].filter(x => x.id !== id);
  save();
  render();
};

window.del = del;


// ==================================================
// Formulários
// ==================================================

function form(sel, k, fn) {
  $(sel).onsubmit = e => {
    e.preventDefault();

    const d = Object.fromEntries(
      new FormData(e.target)
    );

    S[k].push(fn(d));

    save();
    e.target.reset();
    fecha();
    render();
  };
}

form(
  '#fReceita',
  'receitas',
  d => ({
    id: uid(),
    desc: d.desc,
    valor: +d.valor
  })
);

form(
  '#fGasto',
  'gastos',
  d => ({
    id: uid(),
    desc: d.desc,
    valor: +d.valor,
    cat: d.cat,
    tipo: d.tipo
  })
);

form(
  '#fObj',
  'objetivos',
  d => ({
    id: uid(),
    nome: d.nome,
    total: +d.total,
    guardado: +d.guardado || 0
  })
);

form(
  '#fConta',
  'contas',
  d => ({
    id: uid(),
    desc: d.desc,
    valor: +d.valor,
    dia: Math.min(31, +d.dia),
    rec: d.rec
  })
);


// ==================================================
// Telas
// ==================================================

function painel() {
  const t = tot();

  $('#alerta').innerHTML =
    t.pct >= 100
      ? '🔴 Gastos acima da receita'
      : t.pct >= 80
        ? '🟡 Atenção: gastos altos'
        : '🟢 Nenhum alerta';

  $('#kpis').innerHTML = [
    [
      'Receita mensal',
      brl(t.r),
      'var(--ac2)'
    ],
    [
      'Total de gastos',
      brl(t.g),
      'var(--bad)'
    ],
    [
      'Saldo livre',
      brl(t.saldo),
      t.saldo < 0
        ? 'var(--bad)'
        : 'var(--ok)'
    ],
    [
      'Comprometimento',
      t.pct + '%',
      'var(--warn)'
    ]
  ]
    .map(k =>
      `<div class="kpi">
        <small>${k[0]}</small>
        <b style="color:${k[2]}">${k[1]}</b>
      </div>`
    )
    .join('');

  const por = {};

  S.gastos.forEach(g =>
    por[g.cat] = (por[g.cat] || 0) + g.valor
  );

  const ent = Object.entries(por);
  const c = $('#donut').getContext('2d');

  c.clearRect(0, 0, 260, 260);

  let a = -Math.PI / 2;
  const T = t.g || 1;

  if (!ent.length) {
    c.strokeStyle =
      getComputedStyle(document.body)
        .getPropertyValue('--bd');

    c.lineWidth = 34;
    c.beginPath();
    c.arc(130, 130, 95, 0, 7);
    c.stroke();
  }

  ent.forEach(([n, v], i) => {
    const b = v / T * Math.PI * 2;

    c.strokeStyle = CORES[i % 9];
    c.lineWidth = 34;
    c.beginPath();
    c.arc(
      130,
      130,
      95,
      a,
      a + b - .02
    );
    c.stroke();

    a += b;
  });

  $('#legenda').innerHTML = ent
    .map(
      ([n], i) =>
        `<span>
          <i style="background:${CORES[i % 9]}"></i>
          ${n}
        </span>`
    )
    .join('');

  const hoje = new Date().getDate();

  const pr = S.contas
    .map(x => ({
      ...x,
      f: (x.dia - hoje + 31) % 31
    }))
    .filter(x => x.f <= 7)
    .sort((a, b) => a.f - b.f);

  $('#proximas').innerHTML = lista(
    pr,
    x =>
      `<div class="item">
        <span>
          ${x.desc}
          <small>
            ${x.f ? 'em ' + x.f + ' dias' : 'hoje'}
            · dia ${x.dia}
          </small>
        </span>

        <span class="neg">
          ${brl(x.valor)}
        </span>
      </div>`,
    'Nenhuma conta nos próximos 7 dias.'
  );
}

function tela() {
  $('#listaReceitas').innerHTML = lista(
    S.receitas,
    r =>
      `<div class="item">
        <span>${r.desc}</span>

        <span class="pos">
          ${brl(r.valor)}
        </span>

        <button
          class="x"
          onclick="del('receitas',${r.id})"
        >
          ✕
        </button>
      </div>`,
    'Adicione sua primeira receita acima.'
  );

  $('#listaGastos').innerHTML = lista(
    S.gastos,
    g =>
      `<div class="item">
        <span>
          ${g.desc}
          <small>${g.cat}</small>
        </span>

        <span class="tg">
          ${g.tipo}
        </span>

        <span class="neg">
          ${brl(g.valor)}
        </span>

        <button
          class="x"
          onclick="del('gastos',${g.id})"
        >
          ✕
        </button>
      </div>`,
    'Adicione seu primeiro gasto acima.'
  );

  $('#listaObj').innerHTML = lista(
    S.objetivos,
    o => {
      const p = Math.min(
        100,
        o.guardado / o.total * 100 || 0
      );

      return `<div
        class="item"
        style="display:block"
      >
        <b>${o.nome}</b>

        <button
          class="x"
          style="float:right"
          onclick="del('objetivos',${o.id})"
        >
          ✕
        </button>

        <div class="barra">
          <i style="width:${p}%"></i>
        </div>

        <small>
          ${brl(o.guardado)}
          de
          ${brl(o.total)}
          ·
          ${p.toFixed(0)}%
          ${
            t().saldo > 0 &&
            o.guardado < o.total
              ? ' · ~' +
                Math.ceil(
                  (o.total - o.guardado) /
                  t().saldo
                ) +
                ' meses com seu saldo livre'
              : ''
          }
        </small>
      </div>`;
    },
    'Crie um objetivo para começar.'
  );

  $('#listaContas').innerHTML = lista(
    S.contas,
    x =>
      `<div class="item">
        <span>
          ${x.desc}
          <small>
            dia ${x.dia} · ${x.rec}
          </small>
        </span>

        <span class="neg">
          ${brl(x.valor)}
        </span>

        <button
          class="x"
          onclick="del('contas',${x.id})"
        >
          ✕
        </button>
      </div>`,
    'Nenhuma conta cadastrada.'
  );
}

const t = tot;


// ==================================================
// Simulação
// ==================================================

function sim() {
  const meta = +$('#simMeta').value;
  const tem = +$('#simTem').value || 0;
  const p = +$('#simPrazo').value;

  const meses = Math.round(
    $('#simUn').value === 'a'
      ? p * 12
      : p
  );

  if (!meta || !meses) {
    $('#simRes').innerHTML =
      'Preencha a meta e o prazo para ver o resultado.';

    return;
  }

  const falta = meta - tem;

  if (falta <= 0) {
    $('#simRes').innerHTML =
      '<b style="font-size:22px;color:var(--ok)">Meta já alcançada 🎉</b>' +
      '<p class="vazio">Você já tem ' +
      brl(tem) +
      ', mais que os ' +
      brl(meta) +
      ' da meta.</p>';

    return;
  }

  const mes = falta / meses;
  const pct = Math.min(100, tem / meta * 100);
  const s = t().saldo;

  let viavel = '';

  if (s > 0) {
    viavel =
      mes <= s
        ? '<p class="pos">Cabe no seu saldo livre atual (' +
          brl(s) +
          ').</p>'
        : '<p class="neg">Passa do seu saldo livre atual (' +
          brl(s) +
          '). Considere um prazo maior.</p>';
  }

  $('#simRes').innerHTML =
    `<small class="vazio">
      Você precisa guardar por mês
    </small>

    <b
      style="display:block;font-size:30px;color:var(--ac2)"
    >
      ${brl(mes)}
    </b>

    <div class="barra">
      <i style="width:${pct}%"></i>
    </div>

    <p class="vazio">
      Faltam ${brl(falta)}
      em ${meses}
      ${meses === 1 ? 'mês' : 'meses'}
      · já tem ${pct.toFixed(0)}% da meta.<br>

      Por semana:
      ${brl(falta / (meses * 4.345))}

      · Por dia:
      ${brl(falta / (meses * 30.4))}
    </p>

    ${viavel}`;
}

[
  '#simMeta',
  '#simTem',
  '#simPrazo',
  '#simUn'
].forEach(i =>
  $(i).oninput = sim
);


// ==================================================
// Calendário
// ==================================================

function calendario() {
  $('#mesTit').textContent =
    mes.toLocaleDateString(
      'pt-BR',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  const ini = mes.getDay();
  const dias = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0
  ).getDate();

  const h = new Date();

  let html =
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
      .map(d => `<b>${d}</b>`)
      .join('') +
    '<span></span>'.repeat(ini);

  for (let d = 1; d <= dias; d++) {
    const e =
      h.getDate() == d &&
      h.getMonth() == mes.getMonth() &&
      h.getFullYear() == mes.getFullYear();

    html +=
      `<div class="${e ? 'hoje' : ''}">
        ${d}
        ${
          S.contas
            .filter(c => c.dia == d)
            .map(c => `<em>${c.desc}</em>`)
            .join('')
        }
      </div>`;
  }

  $('#cal').innerHTML = html;
}

$('#prev').onclick = () => {
  mes.setMonth(mes.getMonth() - 1);
  calendario();
};

$('#next').onclick = () => {
  mes.setMonth(mes.getMonth() + 1);
  calendario();
};


// ==================================================
// Renderização
// ==================================================

function render() {
  const x = tot();

  $('#saldoSide').textContent = brl(x.saldo);

  painel();
  tela();
  calendario();
}

aplicaTema();