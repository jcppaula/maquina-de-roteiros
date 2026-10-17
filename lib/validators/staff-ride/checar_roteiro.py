#!/usr/bin/env python3
"""
Verificador de coerência com a ficha — roteirista-historia-militar.

Lê a ficha de estrutura no topo do roteiro (<!-- FICHA ... -->) e confere se o texto faz o que ela
declara, além das regras mecânicas do canal. Não compara com outros vídeos: isso é o
auditar_variacao.py. Não avalia verdade: isso é o checar_fontes.py e a conferência a frio.

FALHA (bloqueia):
  - ficha ausente, código inválido, justificativa vazia
  - narração abaixo do piso de caracteres (padrão 19.000)
  - blocos fora de ordem, sem tipo {TIPO}, com menos de 10 s; nº de blocos ≠ ficha; sequência ≠ ficha
  - abertura (B01) fora de 110–200 palavras; [[ABRE:PC]] fora da abertura
  - janela maior que --max-gap s sem [[REHOOK]] (exceto a última, que só avisa)
  - [[PAGA-PARCIAL:PC]] ausente ou fora da faixa D declarada; [[PAGA:PC]] antes dele
  - loop sem pagamento, pagamento sem abertura, mais de 3 abertos
  - [[POV]], [[REGISTRO]] ausentes; [[NOME]] ausente sem NM0
  - pedidos: quantidade ≠ ficha; mais de uma inscrição ou pergunta; pedido no B01 ou depois de 95%;
    zona ≠ ficha
  - pergunta restrita (pede ter servido, família, livro) dentro do bloco da pergunta
  - bordões opcionais detectados ≠ declarados, ou mais de dois
  - a narração não termina exatamente em "The map is never the ground."
AVISO: menos de 8 [[MICRO]]; menos de 4 "> MAPA:"; hype; algarismos; frases curtas < 12%;
  mediana > 16 palavras; posição de RG/NM incoerente com o código declarado; acima do teto.

Uso:
  python3 checar_roteiro.py 02-roteiro.md [--limpo 02-roteiro-narracao.txt] [--min-chars 19000]
         [--max-chars 23000] [--ppm 150] [--cpm 930] [--max-gap 110]
No fim imprime a linha curta para a coluna Estrutura do registro.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ficha_lib import (CODIGOS, FAIXA_D, FINAL, TIPOS, ZONAS, bordoes_usados, ficha_para_curta,
                       ler_ficha, narracao, norm, parse_roteiro, zona_de)

HYPE_RE = re.compile(r"\b(genius|insane|insanely|shocking|mind[- ]blowing|unbelievable|jaw[- ]dropping|you won't believe)\b", re.I)
DIGIT_RE = re.compile(r"\b\d[\d,\.]*\b")
RESTRITA_RE = re.compile(r"\b(served|veterans?|your (father|grandfather|grandmother|mother|family|ancestors?)|were you there|which book|what book|read about)\b", re.I)


def fmt(sec):
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--min-chars", type=int, default=19000)
    ap.add_argument("--max-chars", type=int, default=23000)
    ap.add_argument("--ppm", type=float, default=150.0)
    ap.add_argument("--cpm", type=float, default=930.0)
    ap.add_argument("--max-gap", type=float, default=110.0)
    ap.add_argument("--limpo")
    a = ap.parse_args()

    R = parse_roteiro(a.roteiro)
    blocks, tags, total, clean = R["blocks"], R["tags"], R["words"], R["clean"]
    falhas, avisos = [], []
    sec = lambda w: w / a.ppm * 60.0
    pos = lambda w: (w / total) if total else 0

    print(f"\n=== {a.roteiro}")
    if not blocks:
        print("FALHA: nenhum bloco '## [B01] ... {TIPO}' encontrado.")
        sys.exit(1)

    # ---------- ficha ----------
    F = ler_ficha(R["raw"])
    if F is None:
        falhas.append("ficha de estrutura ausente (<!-- FICHA ... --> no topo)")
        F = {}
    obrig = ["abertura", "promessa", "dobradica", "pedidos", "inscricao", "pergunta", "outro_lado",
             "registro", "nome", "fecho", "tempo", "mapas", "analogia", "ritmo", "bordoes", "blocos",
             "sequencia"]
    for k in obrig:
        if F and k not in F:
            falhas.append(f"ficha sem o campo '{k}'")
    for k, (v, j) in F.items():
        if k in ("blocos", "sequencia"):
            continue
        if not j:
            falhas.append(f"ficha: '{k}' sem justificativa")
        if k in CODIGOS and v.split()[0] not in CODIGOS[k]:
            falhas.append(f"ficha: '{k}' com código inválido '{v}'")
    cod = lambda k: F.get(k, ("", ""))[0].split()[0] if F.get(k, ("", ""))[0] else ""

    # ---------- blocos ----------
    nums = [b[0] for b in blocks]
    if nums != list(range(1, len(nums) + 1)):
        falhas.append(f"blocos não consecutivos a partir de B01: {['B%02d' % n for n in nums]}")
    ends = [b[3] for b in blocks[1:]] + [total]
    seq_real = []
    for (n, name, tipos, start, _c), end in zip(blocks, ends):
        if sec(end - start) < 10:
            falhas.append(f"B{n:02d} com menos de 10 s estimados")
        if not tipos:
            falhas.append(f"B{n:02d} sem tipo no cabeçalho ({{ABR}}, {{CTX}}…)")
        for t in tipos:
            if t not in TIPOS:
                falhas.append(f"B{n:02d}: tipo desconhecido '{t}'")
        seq_real.append("+".join(tipos))
    if F.get("blocos"):
        try:
            if int(F["blocos"][0]) != len(blocks):
                falhas.append(f"ficha declara {F['blocos'][0]} blocos; o roteiro tem {len(blocks)}")
        except ValueError:
            falhas.append("ficha: 'blocos' não é número")
    if F.get("sequencia"):
        seq_decl = F["sequencia"][0].split()
        if seq_decl != seq_real:
            falhas.append(f"sequência declarada {seq_decl} ≠ tipos dos blocos {seq_real}")

    # ---------- tamanho ----------
    full = narracao(clean)
    chars = len(full)
    print(f"Caracteres da narração: {chars} (piso {a.min_chars}, teto flexível {a.max_chars})")
    print(f"Palavras: {total} · áudio estimado: {fmt(chars / a.cpm * 60)}")
    if chars < a.min_chars:
        falhas.append(f"narração com {chars} caracteres; faltam {a.min_chars - chars} para o piso")
    elif chars > a.max_chars:
        avisos.append(f"narração com {chars} caracteres, acima de {a.max_chars}: confira enchimento")

    # ---------- abertura ----------
    hook_end = ends[0]
    hook_words = hook_end - blocks[0][3]
    print(f"Abertura: {hook_words} palavras")
    if not 110 <= hook_words <= 200:
        falhas.append(f"abertura com {hook_words} palavras; exigido 110–200")

    # ---------- viradas ----------
    rh = sorted(w for t, _, w, _b in tags if t == "REHOOK" and w >= hook_end)
    pts = [hook_end] + rh + [total]
    for i in range(len(pts) - 1):
        s0, s1 = pts[i], pts[i + 1]
        if sec(s1 - s0) > a.max_gap:
            msg = f"{fmt(sec(s1 - s0))} sem virada entre {fmt(sec(s0))} e {fmt(sec(s1))}"
            (avisos if i == len(pts) - 2 else falhas).append(msg)
    print(f"Viradas depois da abertura: {len(rh)}")

    # ---------- loops ----------
    abre, paga, parcial = {}, {}, {}
    for t, arg, w, _b in tags:
        if not arg:
            continue
        {"ABRE": abre, "PAGA": paga, "PAGA-PARCIAL": parcial}.get(t, {}).setdefault(arg, w)
    if "PC" not in abre or abre["PC"] >= hook_end:
        falhas.append("[[ABRE:PC]] ausente da abertura (B01)")
    d = cod("dobradica")
    if "PC" in parcial:
        p = pos(parcial["PC"])
        print(f"Dobradiça (pagamento parcial) em {p:.0%}")
        if d in FAIXA_D:
            lo, hi = FAIXA_D[d]
            if not lo <= p <= hi:
                falhas.append(f"[[PAGA-PARCIAL:PC]] em {p:.0%}; a ficha declara {d} ({lo:.0%}–{hi:.0%})")
        if "PC" in paga and paga["PC"] <= parcial["PC"]:
            falhas.append("[[PAGA:PC]] vem antes do pagamento parcial")
    else:
        falhas.append("[[PAGA-PARCIAL:PC]] ausente")
    for k, w in abre.items():
        if k not in paga or paga[k] <= w:
            falhas.append(f"loop {k} aberto sem pagamento depois")
    for k in paga:
        if k not in abre:
            falhas.append(f"[[PAGA:{k}]] sem abertura")
    cur = mx = 0
    for _, dd in sorted([(w, 1) for w in abre.values()] + [(w, -1) for w in paga.values()]):
        cur += dd
        mx = max(mx, cur)
    if mx > 3:
        falhas.append(f"{mx} loops abertos ao mesmo tempo; máximo 3")

    # ---------- conteúdo obrigatório ----------
    pres = {t for t, _, _, _ in tags}
    for req in ("POV", "REGISTRO"):
        if req not in pres:
            falhas.append(f"[[{req}]] ausente")
    if "NOME" not in pres and cod("nome") != "NM0":
        falhas.append("[[NOME]] ausente (use NM0 na ficha se não há nome comprovado)")
    if R["mapas"] < 4:
        avisos.append(f"{R['mapas']} linhas '> MAPA:'; recomendado 4 ou mais")
    n_micro = sum(1 for t, *_ in tags if t == "MICRO")
    print(f"Microtensões: {n_micro} · pistas de mapa: {R['mapas']}")
    if n_micro < 8:
        avisos.append(f"{n_micro} [[MICRO]]; recomendado 8 a 14")

    # posição de RG e NM coerente com o código
    regs = [w for t, _, w, _b in tags if t == "REGISTRO"]
    rg = cod("registro")
    if regs:
        if rg == "RG1" and pos(regs[0]) < 0.70:
            avisos.append(f"RG1 declara bloco perto do fim, mas [[REGISTRO]] aparece em {pos(regs[0]):.0%}")
        if rg == "RG2" and len(regs) < 2:
            avisos.append("RG2 declara registro espalhado, mas há só um [[REGISTRO]]")
        if rg == "RG4" and pos(regs[0]) > 0.15:
            avisos.append("RG4 declara a dúvida na abertura, mas o primeiro [[REGISTRO]] vem depois de 15%")
    nomes = [w for t, _, w, _b in tags if t == "NOME"]
    nm = cod("nome")
    if nomes:
        if nm == "NM1" and pos(nomes[0]) > 0.35:
            avisos.append(f"NM1 declara o nome cedo, mas ele entra em {pos(nomes[0]):.0%}")
        if nm == "NM2" and pos(nomes[0]) < 0.50:
            avisos.append(f"NM2 declara o nome só no clímax, mas ele entra em {pos(nomes[0]):.0%}")
    if cod("outro_lado") == "PV1" and not any("POV" in s.split("+") for s in seq_real):
        avisos.append("PV1 declara um bloco inteiro do outro lado, mas nenhum bloco tem tipo POV")

    # ---------- pedidos ----------
    insc = [(w, b) for t, _, w, b in tags if t == "CTA-INSCRICAO"]
    perg = [(w, b) for t, _, w, b in tags if t == "CTA-PERGUNTA"]
    n_ped = len(insc) + len(perg)
    try:
        decl = int(cod("pedidos"))
        if decl != n_ped:
            falhas.append(f"ficha declara {decl} pedido(s); o roteiro tem {n_ped}")
    except ValueError:
        pass
    if len(insc) > 1:
        falhas.append(f"{len(insc)} pedidos de inscrição; máximo 1")
    if len(perg) > 1:
        falhas.append(f"{len(perg)} perguntas ao público no vídeo; máximo 1")
    for nome, lst, campo in (("inscrição", insc, "inscricao"), ("pergunta", perg, "pergunta")):
        for w, b in lst:
            p = pos(w)
            z = zona_de(p)
            print(f"Pedido de {nome} em {p:.0%} ({z})")
            if b == 1:
                falhas.append(f"pedido de {nome} dentro da abertura")
            if p > 0.95:
                falhas.append(f"pedido de {nome} depois de 95%")
            dz = F.get(campo, ("", ""))[0].split()
            if len(dz) > 1 and dz[1] in ZONAS and dz[1] != z:
                falhas.append(f"pedido de {nome} em {z}; a ficha declara {dz[1]}")
    # pergunta restrita: lê a linha do marcador e as duas seguintes
    linhas = [l for l in R["raw"].splitlines()]
    for i, l in enumerate(linhas):
        if "[[CTA-PERGUNTA]]" in l or "[[PONTE]]" in l:
            trecho = " ".join(linhas[i:i + 4])
            if RESTRITA_RE.search(trecho):
                falhas.append("a pergunta ao público restringe quem pode responder (serviço, família ou "
                              "livro); ela precisa ser aberta a qualquer espectador")

    # ---------- bordões e última frase ----------
    usados = bordoes_usados(full)
    bo = F.get("bordoes", ("nenhum", ""))[0]
    decl_bo = [] if bo.lower().startswith("nenh") else [x.strip() for x in bo.split(",") if x.strip()]
    if sorted(decl_bo) != usados:
        falhas.append(f"bordões declarados {decl_bo or 'nenhum'} ≠ encontrados {usados or 'nenhum'}")
    if len(usados) > 2:
        falhas.append(f"{len(usados)} bordões opcionais; máximo 2")
    if not norm(full).endswith(norm(FINAL)):
        falhas.append(f'a narração precisa terminar exatamente em "{FINAL}"')

    # ---------- estilo ----------
    hype = sorted({m.group(0).lower() for m in HYPE_RE.finditer(full)})
    if hype:
        avisos.append("adjetivos de hype: " + ", ".join(hype))
    digs = DIGIT_RE.findall(full)
    if digs:
        avisos.append(f"{len(digs)} números em algarismos (escrever por extenso): " + ", ".join(digs[:8]))
    sents = [s for s in re.split(r"(?<=[.?!])\s+", full) if s.strip()]
    if sents:
        lens = sorted(len(s.split()) for s in sents)
        med = lens[len(lens) // 2]
        curtas = sum(1 for x in lens if x <= 6) / len(lens)
        print(f"Frases: {len(sents)} · mediana {med} · curtas {curtas:.0%}")
        if curtas < 0.12:
            avisos.append(f"só {curtas:.0%} de frases curtas; os vencedores ficam perto de 20%")
        if med > 16:
            avisos.append(f"frase mediana com {med} palavras; alvo 11 a 14")

    print("\nBlocos (início estimado · tipo · caracteres):")
    for n, name, tipos, start, c in blocks:
        print(f"  {fmt(sec(start))}  B{n:02d} {name} {{{'+'.join(tipos)}}} · {c}")

    if a.limpo:
        txt = re.sub(r"\n{3,}", "\n\n", "\n".join(clean).strip() + "\n")
        open(a.limpo, "w", encoding="utf-8").write(txt)
        print(f"\nNarração limpa salva em {a.limpo}")

    if F:
        print("\nLinha para a coluna Estrutura do registro:")
        print("  " + ficha_para_curta(F))

    print("\n--- RESULTADO")
    for f in falhas:
        print("FALHA:", f)
    for v in avisos:
        print("AVISO:", v)
    if not falhas and not avisos:
        print("OK: coerente com a ficha (variação, verdade e qualidade não são avaliadas aqui).")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
